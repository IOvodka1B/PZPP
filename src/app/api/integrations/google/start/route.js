import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleOAuthConfig } from "@/lib/integrations/googleClient";
import { hashStateValue } from "@/lib/integrations/tokenCrypto";

export async function GET(request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const config = getGoogleOAuthConfig();
  if (!config.clientId || !config.redirectUri) {
    const settingsUrl = new URL("/dashboard/ustawienia?integrationError=google-config", request.url);
    return NextResponse.redirect(settingsUrl);
  }

  const state = randomBytes(24).toString("hex");
  const nonce = randomBytes(16).toString("hex");

  await prisma.oAuthState.create({
    data: {
      userId,
      provider: "GOOGLE",
      stateHash: hashStateValue(state),
      nonceHash: hashStateValue(nonce),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", config.scopes);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", nonce);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authUrl);
}

