import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashStateValue } from "@/lib/integrations/tokenCrypto";
import {
  discoverJiraResource,
  getJiraOAuthConfig,
  saveJiraOAuthConnection,
} from "@/lib/integrations/jiraClient";

function toSettingsUrl(request, query) {
  const url = new URL("/dashboard/ustawienia", request.url);
  Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  return url;
}

export async function GET(request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (error) {
    return NextResponse.redirect(toSettingsUrl(request, { integrationError: "jira-oauth-denied" }));
  }
  if (!code || !state) {
    return NextResponse.redirect(
      toSettingsUrl(request, { integrationError: "jira-oauth-missing-code" })
    );
  }

  const oauthState = await prisma.oAuthState.findUnique({
    where: {
      provider_stateHash: {
        provider: "JIRA",
        stateHash: hashStateValue(state),
      },
    },
    select: { id: true, userId: true, expiresAt: true, consumedAt: true },
  });
  if (
    !oauthState ||
    oauthState.consumedAt ||
    new Date(oauthState.expiresAt).getTime() < Date.now()
  ) {
    return NextResponse.redirect(
      toSettingsUrl(request, { integrationError: "jira-oauth-invalid-state" })
    );
  }

  const config = getJiraOAuthConfig();
  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    return NextResponse.redirect(toSettingsUrl(request, { integrationError: "jira-config" }));
  }

  try {
    const response = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Jira token exchange failed: ${response.status}`);
    }
    const tokenData = await response.json();
    if (!tokenData?.access_token) {
      throw new Error("Jira token response missing access_token.");
    }

    const integration = await saveJiraOAuthConnection(oauthState.userId, tokenData);
    const resource = await discoverJiraResource(tokenData.access_token).catch(() => null);
    if (resource?.id) {
      await prisma.oAuthIntegration.update({
        where: { id: integration.id },
        data: { jiraCloudId: resource.id, jiraSiteUrl: resource.url || null },
      });
    }

    await prisma.oAuthState.update({
      where: { id: oauthState.id },
      data: { consumedAt: new Date() },
    });
    return NextResponse.redirect(
      toSettingsUrl(request, { integrationSuccess: "jira-connected" })
    );
  } catch (err) {
    await prisma.oAuthState.update({
      where: { id: oauthState.id },
      data: { consumedAt: new Date() },
    });
    console.error("jira.callback:", err);
    return NextResponse.redirect(
      toSettingsUrl(request, { integrationError: "jira-callback-failed" })
    );
  }
}

