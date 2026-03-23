import KanbanBoard from "@/components/features/kanbanboard/KanbanBoard";

/**
 * Strona widoku Kanban dla leadow.
 * @returns {JSX.Element}
 */
export default function KanbanPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Sales Pipeline Kanban</h1>
        <p className="text-sm text-muted-foreground">
          Przeciagaj leady pomiedzy kolumnami NEW, CONTACTED i WON.
        </p>
      </header>
      <KanbanBoard />
    </section>
  );
}
