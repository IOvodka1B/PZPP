import KanbanBoard from "@/components/features/kanbanboard/KanbanBoard";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { fetchJiraIssues } from "@/app/actions/externalApiActions";
import { prisma } from "@/lib/prisma";

/**
 * Strona widoku Kanban dla leadow.
 * @returns {JSX.Element}
 */
export default async function KanbanPage() {
  let jiraIssues = [];
  let jiraSelectedProjectKey = null;

  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (userId) {
      const [issues, user] = await Promise.all([
        fetchJiraIssues(userId),
        prisma.user.findUnique({
          where: { id: userId },
          select: { jiraSelectedProjectKey: true },
        }),
      ]);
      jiraIssues = issues;
      jiraSelectedProjectKey = user?.jiraSelectedProjectKey || null;
    }
  } catch (error) {
    console.error("KanbanPage.fetchJiraIssues:", error);
    jiraIssues = [];
    jiraSelectedProjectKey = null;
  }

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Tablica Kanban</h1>
        <p className="text-sm text-muted-foreground">
          Przeciągaj leady pomiedzy kolumnami Nowe, W trakcie uzgadniania i Sprzedane.
        </p>
      </header>
      <KanbanBoard jiraIssues={jiraIssues} jiraSelectedProjectKey={jiraSelectedProjectKey} />
    </section>
  );
}
