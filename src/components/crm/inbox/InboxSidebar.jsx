"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import NewTeamDialog from "./NewTeamDialog";

/**
 * @param {{
 *  leads: Array<{ id: string; firstName: string; lastName?: string | null; email: string }>;
 *  activeLeadId: string | null;
 *  onSelectLead: (id: string) => void;
 *  teams?: Array<{
 *    id: string;
 *    name: string;
 *    lastPreview?: string | null;
 *    lastPreviewAt?: Date | string | null;
 *  }>;
 *  activeChannel?: string;
 *  onSelectChannel?: (value: string) => void;
 *  sidebarTab?: "private" | "teams";
 *  onSidebarTabChange?: (value: "private" | "teams") => void;
 * }} props
 */
export default function InboxSidebar({
  leads,
  activeLeadId,
  onSelectLead,
  teams = [],
  activeChannel = "PRIVATE",
  onSelectChannel,
  sidebarTab = "private",
  onSidebarTabChange,
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <aside className="flex h-full min-h-0 w-full max-w-[min(100%,20rem)] flex-col border-r border-border bg-muted/30">
      <div className="shrink-0 border-b border-border px-3 py-3">
        <h2 className="text-sm font-semibold text-foreground">Skrzynka</h2>
        <p className="text-xs text-muted-foreground">Wybierz konwersację</p>
      </div>

      <Tabs
        value={sidebarTab}
        onValueChange={(v) => onSidebarTabChange?.(v === "teams" ? "teams" : "private")}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="shrink-0 border-b border-border px-3 pb-2">
          <TabsList className="grid h-9 w-full grid-cols-2">
            <TabsTrigger value="private" className="text-xs">
              Prywatne
            </TabsTrigger>
            <TabsTrigger value="teams" className="text-xs">
              Zespoły
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="private" className="m-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
          <div className="shrink-0 px-3 pt-2 pb-1">
            <p className="text-xs font-medium text-foreground">Leady</p>
            <p className="text-xs text-muted-foreground">Wybierz rozmowę</p>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <ul className="flex flex-col gap-0.5 p-2">
              {leads.map((lead) => {
                const isActive = activeLeadId === lead.id && activeChannel === "PRIVATE";
                const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email;
                return (
                  <li key={lead.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectChannel?.("PRIVATE");
                        onSelectLead(lead.id);
                      }}
                      className={cn(
                        "flex w-full flex-col items-start rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        isActive
                          ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
                          : "text-foreground/90 hover:bg-muted"
                      )}
                    >
                      <span className="font-medium leading-tight">{name}</span>
                      <span className="mt-0.5 truncate text-xs text-muted-foreground">{lead.email}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="teams" className="m-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
          <div className="shrink-0 px-3 pt-2 pb-1">
            <p className="text-xs font-medium text-foreground">Zespoły</p>
            <p className="text-xs text-muted-foreground">Wybierz kanał</p>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <ul className="flex flex-col gap-0.5 p-2">
              <li>
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className={cn(
                    "flex w-full flex-col items-start rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    "text-foreground/90 hover:bg-muted"
                  )}
                >
                  <span className="flex w-full min-w-0 items-center gap-2 font-medium leading-tight">
                    <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate">Utwórz zespół</span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    Dodaj zespół i przypisz uczestników
                  </span>
                </button>
              </li>
              {teams.length === 0 ? (
                <li className="px-2 py-4 text-center text-xs text-muted-foreground">Brak zespołów.</li>
              ) : (
                teams.map((team) => {
                  const isActive = activeChannel === team.id;
                  return (
                    <li key={team.id}>
                      <button
                        type="button"
                        onClick={() => onSelectChannel?.(team.id)}
                        className={cn(
                          "flex w-full flex-col items-start rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                          isActive
                            ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
                            : "text-foreground/90 hover:bg-muted"
                        )}
                      >
                        <span className="font-medium leading-tight">{team.name}</span>
                        <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {team.lastPreview || "Brak wiadomości"}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <NewTeamDialog open={createOpen} onOpenChange={setCreateOpen} />
    </aside>
  );
}
