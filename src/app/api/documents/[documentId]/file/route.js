import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "node:path";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

function isAdminRole(role) {
  return role === "ADMIN";
}

function isCreatorRole(role) {
  return role === "KREATOR";
}

function contentTypeForFileName(name) {
  const lower = String(name || "").toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html; charset=utf-8";
  return "application/octet-stream";
}

function resolveStoragePath(fileUrl) {
  const raw = String(fileUrl || "");

  // New private storage format: "documents/<filename>"
  if (raw.startsWith("documents/")) {
    const safeRel = raw.replace(/^documents\//, "");
    return path.join(process.cwd(), "storage", "documents", path.basename(safeRel));
  }

  // Legacy public uploads: "/uploads/documents/<filename>"
  if (raw.startsWith("/uploads/documents/")) {
    const safeRel = raw.replace(/^\/uploads\/documents\//, "");
    return path.join(process.cwd(), "public", "uploads", "documents", path.basename(safeRel));
  }

  // If stored as plain filename
  return path.join(process.cwd(), "storage", "documents", path.basename(raw));
}

export async function GET(_req, { params }) {
  const resolvedParams = await params;
  const documentId = resolvedParams?.documentId;

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || null;
  const role = session?.user?.role || null;
  const email = session?.user?.email || null;

  if (!userId || !role) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!documentId || typeof documentId !== "string") {
    return NextResponse.json({ success: false, error: "Bad request" }, { status: 400 });
  }

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      title: true,
      fileUrl: true,
      lead: { select: { ownerId: true, email: true } },
    },
  });

  if (!doc) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  // Authorization:
  // - ADMIN: always
  // - KREATOR: only if owner of lead
  // - UCZESTNIK: only if lead.email matches session.email (case-insensitive)
  if (!isAdminRole(role)) {
    if (isCreatorRole(role)) {
      if (!doc.lead?.ownerId || doc.lead.ownerId !== userId) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    } else {
      if (!email || !doc.lead?.email) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
      if (String(doc.lead.email).toLowerCase() !== String(email).toLowerCase()) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    }
  }

  const filePath = resolveStoragePath(doc.fileUrl);

  try {
    await stat(filePath);
  } catch {
    return NextResponse.json({ success: false, error: "File not found" }, { status: 404 });
  }

  const stream = createReadStream(filePath);
  const body = Readable.toWeb(stream);

  return new Response(body, {
    headers: {
      "Content-Type": contentTypeForFileName(filePath),
      "Content-Disposition": `inline; filename="${encodeURIComponent(path.basename(filePath))}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

