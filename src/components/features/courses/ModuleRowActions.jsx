"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import ModuleFormDialog from "@/components/features/courses/ModuleFormDialog";

export default function ModuleRowActions({ module, disabled, onUpdate, onDelete }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled} aria-label="Akcje modułu">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <ModuleFormDialog
          mode="edit"
          module={module}
          isPending={disabled}
          onSubmit={(values) => onUpdate(module.id, values)}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Pencil className="mr-2 size-4" />
              Edytuj
            </DropdownMenuItem>
          }
        />

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          onSelect={(e) => e.preventDefault()}
          className="p-0"
        >
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button type="button" className="flex w-full items-center px-2 py-1.5 text-sm">
                <Trash2 className="mr-2 size-4" />
                Usuń
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Usunąć moduł?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ta operacja jest nieodwracalna. Usunięcie modułu spowoduje także
                  usunięcie wszystkich lekcji w tym module.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(module.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Usuń moduł
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

