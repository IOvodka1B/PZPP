import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getLandingPageBySlug } from "@/app/actions/landingPageActions";
import LandingRuntime from "./LandingRuntime";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

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

  return <LandingRuntime htmlData={htmlData} cssData={cssData} />;
}

