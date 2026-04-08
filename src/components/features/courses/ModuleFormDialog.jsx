"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const moduleSchema = z.object({
  title: z.string().trim().min(1, "Podaj tytuł modułu."),
  order: z
    .union([z.number(), z.string()])
    .transform((v) => {
      const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
      return Number.isFinite(n) ? n : 1;
    })
    .refine((v) => v > 0, "Kolejność musi być większa od zera."),
});

export default function ModuleFormDialog({
  mode,
  module,
  trigger,
  isPending,
  onSubmit,
}) {
  const [open, setOpen] = useState(false);

  const defaultValues = useMemo(() => {
    if (mode === "edit" && module) {
      return { title: module.title ?? "", order: module.order ?? 1 };
    }
    return { title: "", order: 1 };
  }, [mode, module]);

  const form = useForm({
    resolver: zodResolver(moduleSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, defaultValues, form]);

  const title = mode === "edit" ? "Edytuj moduł" : "Dodaj moduł";
  const description =
    mode === "edit"
      ? "Zaktualizuj dane modułu. Zmiany zapiszą się w bazie."
      : "Dodaj moduł do kursu i ustaw jego kolejność.";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
              setOpen(false);
            })}
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tytuł</FormLabel>
                  <FormControl>
                    <Input placeholder="Np. Fundamenty" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kolejność</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      placeholder="Np. 1"
                      value={field.value ?? 1}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormDescription>
                    Moduły w kursie są sortowane rosnąco po kolejności.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {mode === "edit" ? "Zapisz" : "Dodaj"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

