"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createTeam, getUsersForTeamCreation } from "@/app/actions/teamActions";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

function initialsFromUser(user) {
  const raw = (user?.name || user?.email || "?").trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return raw.slice(0, 2).toUpperCase();
}

function displayName(user) {
  if (user?.name?.trim()) return user.name.trim();
  return user?.email || "Użytkownik";
}

const ROLE_LABELS = {
  ADMIN: "Administrator",
  KREATOR: "Kreator",
  UCZESTNIK: "Uczestnik",
};

/**
 * @param {{ open: boolean; onOpenChange: (open: boolean) => void }} props
 */
export default function NewTeamDialog({ open, onOpenChange }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [teamName, setTeamName] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["team-creation-users"],
    queryFn: () => getUsersForTeamCreation(),
    enabled: open,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!open) {
      setTeamName("");
      setSelectedIds(new Set());
    }
  }, [open]);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => displayName(a).localeCompare(displayName(b), "pl")),
    [users]
  );

  const toggleUser = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSave = () => {
    const name = teamName.trim();
    if (!name) {
      toast({ variant: "destructive", title: "Podaj nazwę zespołu." });
      return;
    }
    const memberIds = [...selectedIds];
    startTransition(async () => {
      const res = await createTeam(name, memberIds);
      if (!res?.success) {
        toast({
          variant: "destructive",
          title: "Błąd",
          description: res?.error || "Nie udało się utworzyć zespołu.",
        });
        return;
      }
      toast({ title: "Zapisano", description: "Zespół został utworzony." });
      queryClient.invalidateQueries({ queryKey: ["user-teams-inbox"] });
      queryClient.invalidateQueries({ queryKey: ["user-teams"] });
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nowy zespół</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Nazwa</Label>
            <Input
              id="team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Test"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>Uczestnicy</Label>
            <div className="rounded-md border border-border">
              <ScrollArea className="h-[min(50vh,16rem)]">
                <ul className="divide-y divide-border p-2">
                  {isLoading ? (
                    <li className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Wczytywanie listy…
                    </li>
                  ) : sortedUsers.length ? (
                    sortedUsers.map((user) => {
                      const checked = selectedIds.has(user.id);
                      return (
                        <li key={user.id} className="py-2">
                          <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1 hover:bg-muted/60">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => toggleUser(user.id, v === true)}
                              disabled={isPending}
                            />
                            <Avatar className="size-8">
                              <AvatarFallback className="text-xs">{initialsFromUser(user)}</AvatarFallback>
                            </Avatar>
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-sm font-medium leading-tight">
                                {displayName(user)}
                              </span>
                              {user.role ? (
                                <span className="text-xs text-muted-foreground">
                                  {ROLE_LABELS[user.role] || user.role}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        </li>
                      );
                    })
                  ) : (
                    <li className="px-2 py-3 text-sm text-muted-foreground">Brak użytkowników do wyboru.</li>
                  )}
                </ul>
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            className="bg-emerald-600 text-white hover:bg-emerald-600/90"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Zapisz zespół
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
