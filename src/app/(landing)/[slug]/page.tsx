import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

import { getLandingPageBySlug } from "@/app/actions/landingPageActions";
import LandingRuntime from "./LandingRuntime";
import { buildClientBootstrapScript } from "@/lib/ab/cookies";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function isAbScheduleActive(test: { status: string; startsAt: Date | null; endsAt: Date | null }) {
  if (test.status !== "ACTIVE") return false;
  const now = new Date();
  if (test.startsAt && now < test.startsAt) return false;
  if (test.endsAt && now > test.endsAt) return false;
  return true;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getLandingPageBySlug(slug);
  if (!page) return {};

  return {
    title: page.title || page.slug,
    robots: { index: true, follow: true },
  };
}

export default async function LandingRootSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getLandingPageBySlug(slug);
  if (!page) notFound();

  const htmlData = page.htmlData || "";
  const cssData = page.cssData || "";

  /** Views liczone wyłącznie przy wejściu na adres landingu (/[slug]), nie przez URL lejka /f/... */
  let abScriptPayload: Record<string, string> = {};
  let abContext: { abTestId?: string; abVariantId?: string; abLandingId?: string } = {};

  const abTestDelegate = prisma.aBTest ?? prisma.abTest;
  const funnelStepTests = await abTestDelegate.findMany({
    where: {
      status: "ACTIVE",
      funnelStepId: { not: null },
      variants: { some: { landingPageId: page.id } },
    },
    include: {
      variants: {
        include: { landingPage: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const activeTest = funnelStepTests.find(isAbScheduleActive) ?? null;

  if (activeTest?.variants?.length) {
    const matchedVariant = activeTest.variants.find((variant) => variant.landingPageId === page.id);
    if (matchedVariant) {
      const abVariantDelegate = prisma.aBVariant ?? prisma.abVariant;
      await abVariantDelegate.update({
        where: { id: matchedVariant.id },
        data: { views: { increment: 1 } },
      });
      abContext = {
        abTestId: activeTest.id,
        abVariantId: matchedVariant.id,
        abLandingId: matchedVariant.landingPageId,
      };
      abScriptPayload = { [activeTest.id]: matchedVariant.id };
    }
  }

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: buildClientBootstrapScript(abScriptPayload),
        }}
      />
      <LandingRuntime htmlData={htmlData} cssData={cssData} abContext={abContext} />
    </>
  );
}
