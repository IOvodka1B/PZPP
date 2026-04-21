"use client";

import { Suspense } from "react";
import InboxContainer from "@/components/crm/inbox/InboxContainer";

/**
 * Klientowa część skrzynki (w tym przełącznik Prywatne / Zespoły w lewym panelu — InboxSidebar).
 */
export default function SkrzynkaPageBody({ leads }) {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Wczytywanie skrzynki...</div>}>
      <InboxContainer leads={leads} isStudentView={false} />
    </Suspense>
  );
}
