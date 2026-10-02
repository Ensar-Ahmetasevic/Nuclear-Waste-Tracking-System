import { NextResponse } from "next/server";
import { HttpError } from "@/lib/server/errors.cjs";
import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth, reasonText } from "@/lib/server/api-route";
import { listedDocument } from "@/lib/server/profile-documents";
import { manages } from "@/lib/workspaces.cjs";

async function find(params) {
  const document = await prisma.profileDocument.findUniqueOrThrow({ where: { id: Number(params.documentId) } });
  if (document.containerProfileId !== Number(params.profileId)) throw new HttpError(404, "Document not found");
  return document;
}

// The file itself, always as a download. A removed document is kept for
// Supervision and administrators only.
async function GETHandler(req, { params, user }) {
  const document = await find(params);
  if (document.removedAt && !manages(user)) throw new HttpError(404, "Document not found");
  return new Response(document.data, {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Length": String(document.size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// Removes a document from the profile with a written reason. The record and the
// file stay; repeating the request returns the same removal.
async function DELETEHandler(req, { params, user }) {
  const { reason } = await req.json();
  if (typeof reason !== "string" || reason.trim().length < 3 || reason.trim().length > 1000)
    throw new HttpError(400, "Write the reason for removing the document (3–1000 characters)");
  const document = await find(params);
  if (document.removedAt) return NextResponse.json({ document: listedDocument(document), replayed: true });
  const removed = await prisma.profileDocument.update({
    where: { id: document.id },
    data: { removedAt: new Date(), removedById: user.id, removeReason: reason.trim() },
  });
  return NextResponse.json({ document: listedDocument(removed) });
}

export const GET = withApiAuth(GETHandler);
export const DELETE = withApiAuth(DELETEHandler, { access: "member", allowedRoles: ["ADMINISTRATOR", "SUPERVISION"], texts: reasonText });
export const dynamic = "force-dynamic";
