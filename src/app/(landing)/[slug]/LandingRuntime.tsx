"use client";

import React, { useEffect } from "react";

type ABContext = {
  abTestId?: string;
  abVariantId?: string;
  abLandingId?: string;
};

export default function LandingRuntime(props: {
  htmlData: string;
  cssData: string;
  abContext?: ABContext;
}) {
  const { htmlData, cssData, abContext } = props;

  useEffect(() => {
    const maxAge = 60 * 60 * 24 * 365;
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
      return match ? decodeURIComponent(match[1]) : "";
    };
    const setCookie = (name: string, value: string) => {
      document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    };
    let visitorId = getCookie("ab_visitor_id") || getCookie("funnel_visitor_id");
    if (!visitorId) {
      visitorId = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      setCookie("ab_visitor_id", visitorId);
      setCookie("funnel_visitor_id", visitorId);
    }
    if (abContext?.abTestId && abContext?.abVariantId) {
      const rawAssignments = getCookie("ab_assignments");
      let assignments: Record<string, string> = {};
      try {
        assignments = rawAssignments ? JSON.parse(rawAssignments) : {};
      } catch {
        assignments = {};
      }
      assignments[abContext.abTestId] = abContext.abVariantId;
      setCookie("ab_assignments", JSON.stringify(assignments));
    }

    const onClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest?.(".pzpp-checkout-btn") as HTMLElement | null;
      if (!btn) return;

      e.preventDefault();

      const courseId = btn.getAttribute("data-course-id") || "";
      if (!courseId) {
        alert("Wybierz kurs (courseId).");
        return;
      }

      try {
        btn.setAttribute("aria-busy", "true");
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            abTestId: abContext?.abTestId || null,
            abVariantId: abContext?.abVariantId || null,
            abLandingId: abContext?.abLandingId || null,
            abVisitorId: visitorId,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.url) {
          const msg = data?.details ? `${data?.error || "Błąd"}\n\n${data.details}` : data?.error || "Nie udało się rozpocząć płatności.";
          alert(msg);
          return;
        }
        window.location.href = data.url;
      } catch (err) {
        console.error("checkout click error", err);
        alert("Błąd sieci. Spróbuj ponownie.");
      } finally {
        btn.removeAttribute("aria-busy");
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [abContext?.abLandingId, abContext?.abTestId, abContext?.abVariantId]);

  return (
    <div style={{ width: "100vw", minHeight: "100vh", margin: 0, padding: 0 }}>
      <style
         
        dangerouslySetInnerHTML={{
          __html: `
            html, body { margin: 0; padding: 0; height: 100%; width: 100%; }
            body { overflow-x: hidden; }
            ${cssData}
          `,
        }}
      />
      <main
        style={{ width: "100%", minHeight: "100vh" }}
         
        dangerouslySetInnerHTML={{ __html: htmlData }}
      />
    </div>
  );
}

