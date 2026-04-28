import StudentDocumentViewer from "@/components/student/StudentDocumentViewer";
import { getStudentDocument } from "@/app/actions/documentActions";

export const dynamic = "force-dynamic";

export default async function StudentDocumentPage({ params }) {
  const resolvedParams = await params;
  const documentId = resolvedParams?.documentId;
  const doc = await getStudentDocument(documentId);

  if (!doc) {
    return (
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Dokument</h1>
        <p className="text-sm text-muted-foreground">Nie znaleziono dokumentu lub brak dostępu.</p>
      </section>
    );
  }

  return <StudentDocumentViewer document={doc} />;
}

