import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { HttpError } from "@/lib/server/errors.cjs";
import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";
import { listedDocument } from "@/lib/server/profile-documents";
import { DOCUMENT_KINDS, MAX_DOCUMENT_BYTES, documentName, documentType } from "@/lib/profile-documents.cjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Adds a document to a Container Profile. The file travels as base64 in the JSON
// request, like every other write; its type is read from its first bytes.
async function POSTHandler(req, { params, user }) {
  const { actionKey, kind, fileName, data } = await req.json();
  if (typeof actionKey !== "string" || !UUID.test(actionKey))
    throw new HttpError(400, "A valid action reference is required");
  const name = documentName(fileName);
  if (!DOCUMENT_KINDS.includes(kind) || !name)
    throw new HttpError(400, "Choose the kind of document and a file with a name of up to 150 characters");
  if (typeof data !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(data))
    throw new HttpError(400, "The file could not be read");
  const bytes = Buffer.from(data, "base64");
  if (!bytes.length || bytes.length > MAX_DOCUMENT_BYTES)
    throw new HttpError(413, "The file is larger than 5 MB");
  const mimeType = documentType(bytes);
  if (!mimeType) throw new HttpError(415, "Only PDF, PNG and JPEG files are accepted");

  const profile = await prisma.containerProfile.findUniqueOrThrow({ where: { id: Number(params.profileId) } });
  const fingerprint = createHash("sha256")
    .update(JSON.stringify([profile.id, kind, name, user.id]))
    .update(bytes)
    .digest("hex");
  const previous = await prisma.profileDocument.findFirst({ where: { actionKey } });
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new HttpError(409, "This action reference belongs to different data");
    return NextResponse.json({ document: listedDocument(previous), replayed: true });
  }
  const document = await prisma.profileDocument.create({
    data: {
      shipmentId: profile.shippingInformationId, containerProfileId: profile.id, kind, fileName: name,
      mimeType, size: bytes.length, data: bytes, actorId: user.id, actionKey, fingerprint,
    },
  });
  return NextResponse.json({ document: listedDocument(document) }, { status: 201 });
}

// base64 is a third larger than the file.
export const POST = withApiAuth(POSTHandler, { access: "member", bodyLimit: Math.ceil(MAX_DOCUMENT_BYTES * 1.4) });
export const dynamic = "force-dynamic";
