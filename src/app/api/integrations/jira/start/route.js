import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashStateValue } from "@/lib/integrations/tokenCrypto";
import { getJiraOAuthConfig } from "@/lib/integrations/jiraClient";

export async function GET(request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.redirect(new URL("/login", request.url));

  const config = getJiraOAuthConfig();
  if (!config.clientId || !config.redirectUri) {
    return NextResponse.redirect(
      new URL("/dashboard/ustawienia?integrationError=jira-config", request.url)
    );
  }

  const state = randomBytes(24).toString("hex");
  const nonce = randomBytes(16).toString("hex");
  await prisma.oAuthState.create({
    data: {
      userId,
      provider: "JIRA",
      stateHash: hashStateValue(state),
      nonceHash: hashStateValue(nonce),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const authUrl = new URL("https://auth.atlassian.com/authorize");
  authUrl.searchParams.set("audience", "api.atlassian.com");
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("scope", config.scopes);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", nonce);

  return NextResponse.redirect(authUrl);
}

