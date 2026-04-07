"use server";

import { createCipheriv, randomBytes } from "node:crypto";
import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getApiKeyProviderConfig } from "@/lib/integrations/apiKeyProviders";

function encryptApiKey(plainTextKey) {
  const secret = process.env.INTEGRATION_API_KEY_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "Brak poprawnej konfiguracji INTEGRATION_API_KEY_SECRET (min. 32 znaki)."
    );
  }

  const iv = randomBytes(12);
  const key = Buffer.from(secret.slice(0, 32), "utf8");
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainTextKey, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

async function getCurrentUserIdOrThrow() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Brak autoryzacji. Zaloguj się ponownie.");
  }

  return userId;
}

export async function getIntegrationsData() {
  try {
    const userId = await getCurrentUserIdOrThrow();

    const accounts = await prisma.account.findMany({
      where: { userId },
      select: { provider: true },
    });

    const connectedProviders = [...new Set(accounts.map((item) => item.provider))];

    return { success: true, data: { connectedProviders } };
  } catch (error) {
    console.error("getIntegrationsData:", error);
    return { success: false, message: "Nie udało się pobrać danych integracji." };
  }
}

export async function disconnectOAuthIntegration(provider) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const normalizedProvider =
      typeof provider === "string" ? provider.trim().toLowerCase() : "";

    if (!normalizedProvider) {
      return { success: false, message: "Nie podano dostawcy integracji." };
    }

    await prisma.account.deleteMany({
      where: {
        userId,
        provider: normalizedProvider,
      },
    });

    revalidatePath("/dashboard/ustawienia");
    return { success: true, message: "Integracja została odłączona." };
  } catch (error) {
    console.error("disconnectOAuthIntegration:", error);
    return { success: false, message: "Nie udało się odłączyć integracji." };
  }
}

export async function saveApiKeyIntegration(data) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const providerId =
      typeof data?.providerId === "string" ? data.providerId.trim().toLowerCase() : "";
    const apiKey = typeof data?.apiKey === "string" ? data.apiKey.trim() : "";

    if (!providerId) {
      return { success: false, message: "Wybierz dostawcę integracji." };
    }

    const providerConfig = getApiKeyProviderConfig(providerId);
    if (!providerConfig) {
      return { success: false, message: "Wybrany dostawca nie jest wspierany." };
    }

    if (!apiKey) {
      return { success: false, message: "Klucz API jest wymagany." };
    }

    const encryptedKey = encryptApiKey(apiKey);

    await prisma.apiKeyIntegration.upsert({
      where: {
        userId_providerName: {
          userId,
          providerName: providerConfig.id,
        },
      },
      create: {
        userId,
        providerName: providerConfig.id,
        encryptedKey,
      },
      update: {
        encryptedKey,
      },
    });

    revalidatePath("/dashboard/ustawienia");
    return {
      success: true,
      message: `Klucz API dla ${providerConfig.label} został zapisany.`,
    };
  } catch (error) {
    console.error("saveApiKeyIntegration:", error);
    return { success: false, message: "Nie udało się zapisać klucza API." };
  }
}
