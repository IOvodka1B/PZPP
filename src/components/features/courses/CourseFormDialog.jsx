"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

const courseSchema = z.object({
  title: z.string().trim().min(1, "Podaj tytuł kursu."),
  description: z.string().trim().optional(),
  price: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => {
      if (v === "" || v === undefined) return null;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    }),
  isPublished: z.boolean().default(false),
});

export default function CourseFormDialog({
  mode,
  course,
  trigger,
  isPending,
  onSubmit,
}) {
  const [open, setOpen] = useState(false);

  const defaultValues = useMemo(() => {
    if (mode === "edit" && course) {
      return {
        title: course.title ?? "",
        description: course.description ?? "",
        price: typeof course.price === "number" ? course.price : "",
        isPublished: Boolean(course.isPublished),
      };
    }
    return { title: "", description: "", price: "", isPublished: false };
  }, [course, mode]);

  const form = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, defaultValues, form]);

  const title = mode === "edit" ? "Edytuj kurs" : "Dodaj kurs";
  const description =
    mode === "edit"
      ? "Zaktualizuj dane kursu. Zmiany zapiszą się w bazie."
      : "Utwórz nowy kurs i dodaj do niego moduły oraz lekcje.";

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
                    <Input placeholder="Np. Kurs sprzedaży B2B" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opis</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Krótki opis programu kursu (opcjonalnie)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Opis pomoże uczestnikom zrozumieć, co znajduje się w kursie.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cena (PLN)</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="decimal"
                      placeholder="Np. 499"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormDescription>
                    Pozostaw puste, jeśli kurs ma być bezpłatny.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPublished"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Status publikacji</FormLabel>
                    <FormDescription>
                      Opublikowany kurs będzie widoczny dla uczestników.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Przełącz publikację kursu"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {mode === "edit" ? "Zapisz" : "Utwórz"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

