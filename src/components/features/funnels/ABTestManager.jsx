"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createABTestForStep,
  deleteABTest,
  setABTestStatus,
  updateABTest,
} from "@/app/actions/funnelActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

function parseVariantsFromTest(test) {
  return (test?.variants || []).map((variant) => ({
    id: variant.id,
    name: variant.name,
    landingPageId: variant.landingPageId,
    trafficWeight: variant.trafficWeight,
  }));
}

export default function ABTestManager({
  funnelId,
  stepId,
  tests = [],
  landingPages,
  targetType = "FUNNEL_STEP",
  courseId = "",
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [winnerMetric, setWinnerMetric] = useState("PURCHASE");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [variants, setVariants] = useState([
    { name: "A", landingPageId: "", trafficWeight: 50 },
    { name: "B", landingPageId: "", trafficWeight: 50 },
  ]);
  const [editingTestId, setEditingTestId] = useState("");
  const [localTests, setLocalTests] = useState(tests);

  useEffect(() => {
    setLocalTests(tests);
  }, [tests]);

  const totalWeight = useMemo(
    () => variants.reduce((sum, variant) => sum + Number(variant.trafficWeight || 0), 0),
    [variants]
  );

  function withAction(action, payloadBuilder) {
    setError("");
    startTransition(async () => {
      try {
        const fd = payloadBuilder();
        await action(fd);
        router.refresh();
      } catch (e) {
        setError(e?.message || "Wystapil blad.");
      }
    });
  }

  function buildBaseFormData() {
    const fd = new FormData();
    fd.set("targetType", targetType);
    fd.set("funnelId", funnelId || "");
    fd.set("funnelStepId", stepId || "");
    fd.set("courseId", courseId || "");
    fd.set("name", name);
    fd.set("status", status);
    fd.set("winnerMetric", winnerMetric);
    fd.set("startsAt", startsAt);
    fd.set("endsAt", endsAt);
    fd.set("variants", JSON.stringify(variants));
    return fd;
  }

  function resetForm() {
    setEditingTestId("");
    setName("");
    setStatus("DRAFT");
    setWinnerMetric("PURCHASE");
    setStartsAt("");
    setEndsAt("");
    setVariants([
      { name: "A", landingPageId: "", trafficWeight: 50 },
      { name: "B", landingPageId: "", trafficWeight: 50 },
    ]);
  }

  function loadTestIntoEditor(test) {
    setEditingTestId(test.id);
    setName(test.name);
    setStatus(test.status);
    setWinnerMetric(test.winnerMetric || "PURCHASE");
    setStartsAt(test.startsAt ? new Date(test.startsAt).toISOString().slice(0, 16) : "");
    setEndsAt(test.endsAt ? new Date(test.endsAt).toISOString().slice(0, 16) : "");
    setVariants(parseVariantsFromTest(test));
  }

  function saveCurrentTest() {
    if (totalWeight <= 0) {
      setError("Suma wag musi byc wieksza od 0.");
      return;
    }
    if (editingTestId) {
      withAction(updateABTest, () => {
        const fd = buildBaseFormData();
        fd.set("testId", editingTestId);
        return fd;
      });
      return;
    }
    withAction(createABTestForStep, buildBaseFormData);
    resetForm();
  }

  return (
    <Card className="mt-3">
      <CardHeader>
        <CardTitle className="text-base">Manager eksperymentow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-3 rounded-md border p-3">
          <p className="text-sm font-medium">
            {editingTestId ? "Edycja testu" : "Nowy test"}{" "}
            {targetType === "COURSE_SALES_PAGE" ? "kursowy" : "kroku"}
          </p>
          {targetType === "FUNNEL_STEP" ? (
            <p className="text-xs text-muted-foreground">
              Wejścia (views) liczą się wyłącznie przy otwarciu publicznego adresu landingu, np.{" "}
              <code className="text-xs">http://localhost:3000/twoj-slug</code> — nie przez URL lejka{" "}
              <code className="text-xs">/f/...</code>.
            </p>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nazwa testu"
              disabled={isPending}
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
              disabled={isPending}
            >
              <option value="DRAFT">Szkic</option>
              <option value="ACTIVE">Aktywny</option>
              <option value="PAUSED">Pauza</option>
              <option value="COMPLETED">Zakonczony</option>
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              type="datetime-local"
              disabled={isPending}
            />
            <Input
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              type="datetime-local"
              disabled={isPending}
            />
            <select
              value={winnerMetric}
              onChange={(event) => setWinnerMetric(event.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
              disabled={isPending}
            >
              <option value="PURCHASE">Winner po zakupach</option>
              <option value="CHECKOUT_START">Winner po checkout start</option>
            </select>
          </div>
          <div className="space-y-2">
            {variants.map((variant, index) => (
              <div key={`${variant.id || "new"}-${index}`} className="grid gap-2 md:grid-cols-12">
                <Input
                  className="md:col-span-3"
                  value={variant.name}
                  onChange={(event) =>
                    setVariants((prev) =>
                      prev.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, name: event.target.value } : item
                      )
                    )
                  }
                  placeholder={`Wariant ${index + 1}`}
                  disabled={isPending}
                />
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm md:col-span-6"
                  value={variant.landingPageId}
                  onChange={(event) =>
                    setVariants((prev) =>
                      prev.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, landingPageId: event.target.value } : item
                      )
                    )
                  }
                  disabled={isPending}
                >
                  <option value="">Wybierz landing</option>
                  {landingPages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.title} ({page.slug})
                    </option>
                  ))}
                </select>
                <Input
                  className="md:col-span-2"
                  type="number"
                  min={1}
                  max={100}
                  value={variant.trafficWeight}
                  onChange={(event) =>
                    setVariants((prev) =>
                      prev.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, trafficWeight: Number(event.target.value || 0) }
                          : item
                      )
                    )
                  }
                  disabled={isPending}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="md:col-span-1"
                  onClick={() =>
                    setVariants((prev) =>
                      prev.length > 2 ? prev.filter((_, itemIndex) => itemIndex !== index) : prev
                    )
                  }
                  disabled={isPending || variants.length <= 2}
                >
                  -
                </Button>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Suma wag: {totalWeight}% (normalizacja po zapisie)</p>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setVariants((prev) => [
                    ...prev,
                    { name: `Wariant ${prev.length + 1}`, landingPageId: "", trafficWeight: 10 },
                  ])
                }
                disabled={isPending}
              >
                Dodaj wariant
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={saveCurrentTest} disabled={isPending || !name}>
              {editingTestId ? "Zapisz zmiany" : "Utworz test"}
            </Button>
            {editingTestId ? (
              <Button type="button" variant="ghost" onClick={resetForm} disabled={isPending}>
                Anuluj
              </Button>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          {localTests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak testow.</p>
          ) : (
            localTests.map((test) => {
              const bestVariant = test.variants.find((variant) => variant.id === test.winnerVariantId);
              return (
                <div key={test.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{test.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {test.status} | winner metric: {test.winnerMetric}
                        {bestVariant ? ` | winner: ${bestVariant.name}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["ACTIVE", "PAUSED", "COMPLETED"].map((nextStatus) => (
                        <Button
                          key={nextStatus}
                          type="button"
                          size="sm"
                          variant={test.status === nextStatus ? "default" : "outline"}
                          disabled={isPending}
                          onClick={() =>
                            withAction(setABTestStatus, () => {
                              const fd = new FormData();
                              fd.set("testId", test.id);
                              fd.set("status", nextStatus);
                              return fd;
                            })
                          }
                        >
                          {nextStatus}
                        </Button>
                      ))}
                      <Button type="button" size="sm" variant="outline" onClick={() => loadTestIntoEditor(test)}>
                        Edytuj
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() =>
                          withAction(deleteABTest, () => {
                            const fd = new FormData();
                            fd.set("testId", test.id);
                            return fd;
                          })
                        }
                      >
                        Usun
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {test.variants.map((variant) => {
                      const checkoutCR = variant.views ? (variant.checkoutStarts / variant.views) * 100 : 0;
                      const purchaseCR = variant.views ? (variant.purchases / variant.views) * 100 : 0;
                      return (
                        <div key={variant.id} className="rounded border p-2 text-sm">
                          <p className="font-medium">
                            {variant.name} ({variant.trafficWeight}%)
                          </p>
                          <p className="text-xs text-muted-foreground">{variant.landingPage?.title || "Brak strony"}</p>
                          <p className="text-xs">
                            views {variant.views} | checkout {variant.checkoutStarts} ({checkoutCR.toFixed(1)}%) |
                            purchases {variant.purchases} ({purchaseCR.toFixed(1)}%)
                          </p>
                          {variant.views < 30 ? (
                            <p className="text-xs text-amber-600">Mala proba - wyniki moga byc niestabilne.</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
