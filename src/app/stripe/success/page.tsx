"use client";

import React, { useEffect, useState } from "react";

type Status =
  | { state: "loading" }
  | { state: "success"; courseTitle?: string; email?: string }
  | { state: "error"; message: string };

export default function StripeSuccessPage() {
  const [status, setStatus] = useState<Status>({ state: "loading" });

  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId) {
      setStatus({ state: "error", message: "Brak session_id w URL." });
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/stripe/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus({ state: "error", message: data?.error || "Nie udało się potwierdzić płatności." });
          return;
        }
        setStatus({ state: "success", courseTitle: data?.courseTitle, email: data?.email });
      } catch (e) {
        setStatus({ state: "error", message: "Błąd sieci podczas potwierdzania płatności." });
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      {status.state === "loading" ? (
        <>
          <h1 className="text-2xl font-bold">Potwierdzamy płatność…</h1>
          <p className="mt-2 text-gray-600">Jeśli wszystko jest OK, za chwilę wyślemy maila z dostępem.</p>
        </>
      ) : status.state === "success" ? (
        <>
          <h1 className="text-2xl font-bold">Płatność potwierdzona</h1>
          <p className="mt-2 text-gray-600">
            Dostęp do kursu{status.courseTitle ? <>: <strong>{status.courseTitle}</strong></> : null} został nadany.
          </p>
          <p className="mt-2 text-gray-600">
            Mail z instrukcją logowania został wysłany{status.email ? <> na <strong>{status.email}</strong></> : null}.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold">Nie udało się potwierdzić płatności</h1>
          <p className="mt-2 text-red-600">{status.message}</p>
        </>
      )}
    </div>
  );
}

