"use client";

import { useState, useTransition } from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import {
  deleteFunnelStep,
  reorderFunnelSteps,
  updateFunnelStep,
} from "@/app/actions/funnelActions";
import ABTestManager from "@/components/features/funnels/ABTestManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function FunnelBuilder({ funnel, landingPages }) {
  const [steps, setSteps] = useState(funnel.steps);
  const [editingStepId, setEditingStepId] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    stepType: "LANDING",
    landingPageId: "",
    isRequired: true,
  });

  function onDragEnd(result) {
    if (!result.destination) return;
    const reordered = Array.from(steps);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const withOrder = reordered.map((step, index) => ({ ...step, order: index + 1 }));
    setSteps(withOrder);

    startTransition(async () => {
      try {
        await reorderFunnelSteps(funnel.id, withOrder.map((step) => step.id));
      } catch (e) {
        setError(e?.message || "Nie udalo sie zapisac nowej kolejnosci.");
      }
    });
  }

  function openEdit(step) {
    setEditingStepId(step.id);
    setEditForm({
      name: step.name,
      slug: step.slug,
      stepType: step.stepType,
      landingPageId: step.landingPageId || "",
      isRequired: step.isRequired,
    });
  }

  function saveStep() {
    if (!editingStepId) return;
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("stepId", editingStepId);
        fd.set("name", editForm.name);
        fd.set("slug", editForm.slug);
        fd.set("stepType", editForm.stepType);
        fd.set("landingPageId", editForm.landingPageId);
        fd.set("isRequired", String(editForm.isRequired));
        await updateFunnelStep(fd);
      } catch (e) {
        setError(e?.message || "Nie udalo sie zapisac kroku.");
      }
    });
  }

  function removeStep(stepId) {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("stepId", stepId);
        await deleteFunnelStep(fd);
        setSteps((prev) =>
          prev
            .filter((step) => step.id !== stepId)
            .map((step, index) => ({ ...step, order: index + 1 }))
        );
      } catch (e) {
        setError(e?.message || "Nie udalo sie usunac kroku.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="funnel-steps">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
              {steps.map((step, index) => {
                const publicUrl = `/f/${funnel.slug}/${step.slug}`;
                const isEditing = editingStepId === step.id;
                return (
                  <Draggable key={step.id} draggableId={step.id} index={index}>
                    {(draggableProvided) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        className="rounded-lg border p-4"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div {...draggableProvided.dragHandleProps} className="cursor-grab text-xs text-muted-foreground">
                            Przeciagnij
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEdit(step)} disabled={isPending}>
                              Edytuj
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => removeStep(step.id)} disabled={isPending}>
                              Usun
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="font-medium">
                            #{step.order} {step.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            typ: {step.stepType} | required: {step.isRequired ? "tak" : "nie"} | slug: {step.slug}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            asset: {step.landingPage?.title || "Brak"} | public: {publicUrl}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            statystyki:{" "}
                            {step.abTests
                              .flatMap((test) => test.variants)
                              .reduce(
                                (acc, variant) => ({
                                  views: acc.views + variant.views,
                                  checkoutStarts: acc.checkoutStarts + (variant.checkoutStarts || 0),
                                  purchases: acc.purchases + (variant.purchases || 0),
                                }),
                                { views: 0, checkoutStarts: 0, purchases: 0 }
                              )
                              .views}{" "}
                            wejsc |{" "}
                            {step.abTests
                              .flatMap((test) => test.variants)
                              .reduce((acc, variant) => acc + (variant.purchases || 0), 0)}{" "}
                            zakupow
                          </p>
                        </div>

                        {isEditing ? (
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            <Input
                              value={editForm.name}
                              onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                              disabled={isPending}
                            />
                            <Input
                              value={editForm.slug}
                              onChange={(event) => setEditForm((prev) => ({ ...prev, slug: event.target.value }))}
                              disabled={isPending}
                            />
                            <select
                              value={editForm.stepType}
                              onChange={(event) =>
                                setEditForm((prev) => ({ ...prev, stepType: event.target.value }))
                              }
                              className="h-10 rounded-md border bg-background px-3 text-sm"
                              disabled={isPending}
                            >
                              <option value="LANDING">Landing</option>
                              <option value="CHECKOUT">Checkout</option>
                              <option value="THANK_YOU">Thank you</option>
                              <option value="CUSTOM">Custom</option>
                            </select>
                            <select
                              value={editForm.landingPageId}
                              onChange={(event) =>
                                setEditForm((prev) => ({ ...prev, landingPageId: event.target.value }))
                              }
                              className="h-10 rounded-md border bg-background px-3 text-sm"
                              disabled={isPending}
                            >
                              <option value="">Brak strony</option>
                              {landingPages.map((page) => (
                                <option key={page.id} value={page.id}>
                                  {page.title} ({page.slug})
                                </option>
                              ))}
                            </select>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={editForm.isRequired}
                                onChange={(event) =>
                                  setEditForm((prev) => ({ ...prev, isRequired: event.target.checked }))
                                }
                              />
                              Krok wymagany
                            </label>
                            <div className="flex gap-2">
                              <Button type="button" size="sm" onClick={saveStep} disabled={isPending}>
                                Zapisz krok
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingStepId("")}
                                disabled={isPending}
                              >
                                Anuluj
                              </Button>
                            </div>
                          </div>
                        ) : null}

                        <ABTestManager
                          funnelId={funnel.id}
                          stepId={step.id}
                          tests={step.abTests}
                          landingPages={landingPages}
                        />
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
