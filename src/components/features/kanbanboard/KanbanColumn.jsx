"use client";

import { Droppable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";

/**
 * Kolumna Kanban jako obszar drop dla danego statusu.
 * @param {{
 * status: "NEW" | "CONTACTED" | "WON",
 * title: string,
 * leads: Array<{ id: string, firstName: string, lastName?: string | null, email: string, source?: string | null }>
 * }} props
 * @returns {JSX.Element}
 */
export default function KanbanColumn({ status, title, leads }) {
  return (
    <section className="rounded-xl border bg-muted/20 p-3">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
        <span className="rounded bg-background px-2 py-1 text-xs text-muted-foreground">
          {leads.length}
        </span>
      </header>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-24 space-y-2 rounded-md p-1 transition ${
              snapshot.isDraggingOver ? "bg-primary/10" : ""
            }`}
          >
            {leads.map((lead, index) => (
              <KanbanCard key={lead.id} lead={lead} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </section>
  );
}
