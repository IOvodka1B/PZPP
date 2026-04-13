"use client";

import dynamic from "next/dynamic";

const GrapesEditor = dynamic(
  () => import("@/components/features/builder/GrapesEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 text-center text-gray-500 font-bold">Ładowanie edytora…</div>
    ),
  }
);

export default function PageBuilderEditorClient({ landingId }) {
  return <GrapesEditor landingId={landingId} />;
}

