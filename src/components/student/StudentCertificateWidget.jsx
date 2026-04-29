"use client";

import { Award, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getCertificateHtml } from "@/lib/templates/certificateTemplate";

export default function StudentCertificateWidget({ data }) {
  if (!data?.shouldRender) return null;

  const courseName = data.courseTitle || "Kurs";
  const certificate = data.certificate;

  if (!certificate) {
    return (
      <Card className="mt-3 border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Lock className="size-4 text-muted-foreground" />
            Certyfikat zablokowany
          </CardTitle>
          <CardDescription>
            Zdobądź 100% postępu, aby odblokować certyfikat ukończenia kursu.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Aktualny postęp: <span className="font-semibold">{data.progress ?? 0}%</span>
        </CardContent>
      </Card>
    );
  }

  const certificateHtml = getCertificateHtml({
    studentName: data.studentName || "Uczestnik kursu",
    courseName,
    issueDate: certificate.issueDate,
    certificateNumber: certificate.certificateNumber,
  });

  return (
    <Card className="mt-3 border-emerald-300/60 bg-emerald-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-emerald-800">
          <Award className="size-4" />
          Gratulacje! Twoj certyfikat jest gotowy
        </CardTitle>
        <CardDescription className="text-emerald-900/80">
          Numer certyfikatu: {certificate.certificateNumber}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-xs text-emerald-900/90">
        Data wystawienia: {new Date(certificate.issueDate).toLocaleDateString("pl-PL")}
      </CardContent>
      <CardFooter>
        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" className="w-full sm:w-auto">
              Pokaz certyfikat
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden p-0 sm:max-w-5xl">
            <DialogHeader className="border-b p-4">
              <DialogTitle>Podglad certyfikatu</DialogTitle>
              <DialogDescription>{courseName}</DialogDescription>
            </DialogHeader>
            <iframe
              title="Podglad certyfikatu"
              srcDoc={certificateHtml}
              className="h-[75vh] w-full border-0"
            />
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
