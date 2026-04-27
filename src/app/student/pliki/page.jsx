import { listStudentDocuments } from "@/app/actions/documentActions";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatLeadName(lead) {
  const first = lead?.firstName || "";
  const last = lead?.lastName || "";
  const full = `${first} ${last}`.trim();
  return full || lead?.email || "Lead";
}

export default async function StudentFilesPage() {
  const documents = await listStudentDocuments();

  return (
    <section className="space-y-4 pb-4">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Moje pliki</h1>
        <p className="text-sm text-muted-foreground">
          Dokumenty przekazane Ci przez kreatora.
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border bg-background">
        <div className="grid grid-cols-[1.5fr_1fr_auto] gap-3 border-b px-4 py-3 text-xs font-semibold text-muted-foreground">
          <div>Tytuł</div>
          <div>Lead</div>
          <div className="text-right">Plik</div>
        </div>

        <div className="divide-y">
          {(documents || []).map((d) => (
            <div
              key={d.id}
              className="grid grid-cols-[1.5fr_1fr_auto] items-center gap-3 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{d.title}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {d.requiresSignature ? (d.isSigned ? "Podpisany" : "Do podpisu") : "Bez podpisu"}
                </div>
              </div>
              <div className="truncate text-muted-foreground">
                {formatLeadName(d.lead)}
              </div>
              <div className="text-right">
                {d.id ? (
                  <Link
                    href={`/student/pliki/${encodeURIComponent(d.id)}`}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Otwórz
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">Brak</span>
                )}
              </div>
            </div>
          ))}

          {(!documents || documents.length === 0) && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Brak plików.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

