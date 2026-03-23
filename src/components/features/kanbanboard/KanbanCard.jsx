"use client";

import { Draggable } from "@hello-pangea/dnd";

/**
 * Karta pojedynczego leada na tablicy Kanban.
 * @param {{
 * lead: { id: string, firstName: string, lastName?: string | null, email: string, status: string, source?: string | null },
 * index: number
 * }} props
 * @returns {JSX.Element}
 */
export default function KanbanCard({ lead, index }) {
  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`rounded-lg border bg-card p-3 text-card-foreground shadow-xs transition ${
            snapshot.isDragging ? "ring-2 ring-primary/30" : ""
          }`}
        >
          <h3 className="font-medium">{fullName || "Bez imienia"}</h3>
          <p className="text-sm text-muted-foreground">{lead.email}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Zrodlo: {lead.source || "Nieznane"}
          </p>
        </article>
      )}
    </Draggable>
  );
}
