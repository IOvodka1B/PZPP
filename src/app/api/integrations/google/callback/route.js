import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashStateValue } from "@/lib/integrations/tokenCrypto";
import {
  getGoogleOAuthConfig,
  saveGoogleOAuthConnection,
} from "@/lib/integrations/googleClient";

function buildSettingsRedirect(request, query) {
  const url = new URL("/dashboard/ustawienia", request.url);
  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url;
}

async function fetchGoogleUserInfo(accessToken) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json();
}

export async function GET(request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (error) {
    return NextResponse.redirect(
      buildSettingsRedirect(request, { integrationError: "google-oauth-denied" })
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      buildSettingsRedirect(request, { integrationError: "google-oauth-missing-code" })
    );
  }

  const stateHash = hashStateValue(state);
  const oauthState = await prisma.oAuthState.findUnique({
    where: {
      provider_stateHash: {
        provider: "GOOGLE",
        stateHash,
      },
    },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      consumedAt: true,
    },
  });

  if (
    !oauthState ||
    oauthState.consumedAt ||
    new Date(oauthState.expiresAt).getTime() < Date.now()
  ) {
    return NextResponse.redirect(
      buildSettingsRedirect(request, { integrationError: "google-oauth-invalid-state" })
    );
  }

  const config = getGoogleOAuthConfig();
  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    return NextResponse.redirect(
      buildSettingsRedirect(request, { integrationError: "google-config" })
    );
  }

  try {
    const body = new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    });

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData?.access_token) {
      throw new Error("Google token response missing access token.");
    }

    const userInfo = await fetchGoogleUserInfo(tokenData.access_token);
    await saveGoogleOAuthConnection(oauthState.userId, {
      ...tokenData,
      externalAccountId: userInfo?.sub || null,
      externalEmail: userInfo?.email || null,
    });

    await prisma.oAuthState.update({
      where: { id: oauthState.id },
      data: { consumedAt: new Date() },
    });

    return NextResponse.redirect(
      buildSettingsRedirect(request, { integrationSuccess: "google-connected" })
    );
  } catch (callbackError) {
    await prisma.oAuthState.update({
      where: { id: oauthState.id },
      data: { consumedAt: new Date() },
    });
    console.error("google.callback:", callbackError);
    return NextResponse.redirect(
      buildSettingsRedirect(request, { integrationError: "google-callback-failed" })
    );
  }
}

