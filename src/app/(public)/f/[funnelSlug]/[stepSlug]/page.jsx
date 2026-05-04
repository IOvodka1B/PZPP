import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

/** Publiczny URL lejka: tylko domyślna strona kroku. Statystyki A/B są wyłącznie na adresach landingów (/[slug]). */
export default async function FunnelStepPublicPage({ params }) {
  const { funnelSlug, stepSlug } = await params;

  const funnel = await prisma.funnel.findUnique({
    where: { slug: funnelSlug },
    include: {
      steps: {
        where: { slug: stepSlug },
        include: {
          landingPage: true,
        },
      },
    },
  });

  if (!funnel || funnel.status !== "ACTIVE" || funnel.steps.length === 0) {
    notFound();
  }

  const step = funnel.steps[0];
  const selectedLanding = step.landingPage;

  if (!selectedLanding?.htmlData) {
    notFound();
  }

  return (
    <div>
      {selectedLanding.cssData ? (
        <style dangerouslySetInnerHTML={{ __html: selectedLanding.cssData }} />
      ) : null}
      <div dangerouslySetInnerHTML={{ __html: selectedLanding.htmlData }} />
    </div>
  );
}
