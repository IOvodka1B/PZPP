"use client";

import { useState, useTransition } from "react";
import { uploadDocument } from "@/app/actions/documentActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatLeadLabel(lead) {
  const fullName = `${lead?.firstName || ""} ${lead?.lastName || ""}`.trim();
  return fullName || lead?.email || "Lead";
}

export default function DocumentUploadModal({ leads = [] }) {
  const [open, setOpen] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [requiresSignature, setRequiresSignature] = useState(true);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const formData = new FormData(formEl);
    formData.set("leadId", leadId);
    formData.set("requiresSignature", requiresSignature ? "true" : "false");

    startTransition(async () => {
      const result = await uploadDocument(formData);
      if (result?.success) {
        formEl?.reset?.();
        setLeadId("");
        setRequiresSignature(true);
        setOpen(false);
      } else if (result?.error) {
        alert(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Dodaj dokument</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wgraj dokument</DialogTitle>
          <DialogDescription>
            Dodaj dokument PDF lub HTML i przypisz go do leada.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="title">Tytuł</Label>
            <Input id="title" name="title" placeholder="Np. Umowa współpracy" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Plik</Label>
            <Input id="file" name="file" type="file" accept=".pdf,.html" required />
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3">
            <Checkbox
              id="requiresSignature"
              checked={requiresSignature}
              onCheckedChange={(v) => setRequiresSignature(Boolean(v))}
              disabled={isPending}
            />
            <div className="grid gap-1">
              <Label htmlFor="requiresSignature">Wymaga podpisu</Label>
              <p className="text-xs text-muted-foreground">
                Jeśli włączone, uczeń zobaczy pole podpisu (tylko PDF).
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Lead</Label>
            <Select value={leadId} onValueChange={setLeadId} required>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz leada" />
              </SelectTrigger>
              <SelectContent>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {formatLeadLabel(lead)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || !leadId}>
              {isPending ? "Zapisywanie..." : "Wgraj dokument"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
