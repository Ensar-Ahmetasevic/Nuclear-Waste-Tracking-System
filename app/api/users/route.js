import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { withApiAuth } from "@/lib/server/api-route";
import { HttpError } from "@/lib/server/errors.cjs";
import {
  publicUser,
  passwordValue,
  accountData,
} from "@/lib/server/accounts.cjs";
function manager(user) {
  if (!["ADMINISTRATOR", "SUPERVISION"].includes(user.role))
    throw new HttpError(
      403,
      "User management requires Administrator or Supervision access",
    );
}
async function GETHandler(req, { user, tx }) {
  manager(user);
  const users = await tx.userProfile.findMany({
    where: {
      organizationId: user.organizationId,
      ...(user.role === "SUPERVISION" ? { role: "EMPLOYEE" } : {}),
    },
    select: publicUser,
    orderBy: { id: "asc" },
  });
  const changes = user.role === "ADMINISTRATOR" ? await tx.accountChange.findMany({ where: { organizationId: user.organizationId }, orderBy: { id: "desc" }, take: 20, select: { id: true, targetUserId: true, actorId: true, reason: true, before: true, after: true, changedFields: true, createdAt: true } }) : [];
  const creations = await tx.accountCreation.findMany({
    where: { organizationId: user.organizationId, ...(user.role === "SUPERVISION" ? { actorId: user.id } : {}) },
    orderBy: { id: "desc" }, take: 20,
    select: { id: true, targetUserId: true, actorId: true, role: true, workArea: true, createdAt: true },
  });
  return Response.json({ users, role: user.role, changes, creations });
}
async function POSTHandler(req, { user, tx }) {
  manager(user);
  const body = await req.json();
  const data = accountData(body, user);
  const { actionKey } = body;
  if (typeof actionKey !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actionKey))
    throw new HttpError(400, "Review the new account before confirming creation");
  const initialPassword = passwordValue(body.password);
  // Retries identify the reviewed account, never reset its password. Do not put
  // credentials (including a password digest) in the immutable audit receipt.
  const fingerprint = createHash("sha256").update(JSON.stringify([data, user.id])).digest("hex");
  const previous = await tx.accountCreation.findFirst({ where: { organizationId: user.organizationId, actionKey } });
  const receipt = row => ({ id: row.id, targetUserId: row.targetUserId, actorId: row.actorId, role: row.role, workArea: row.workArea, createdAt: row.createdAt });
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new HttpError(409, "This confirmation belongs to a different account. Check the original attempt.");
    return Response.json({ creation: receipt(previous), replayed: true });
  }
  // A conflicting login is a validation outcome; do not reveal another tenant's account.
  if (await tx.userProfile.findFirst({ where: { OR: [{ username: data.username }, { email: data.email }] }, select: { id: true } }))
    throw new HttpError(422, "Username or email is unavailable. Choose another and review again.");
  const password = await bcrypt.hash(initialPassword, 12);
  const organization = await tx.organization.findUniqueOrThrow({
    where: { id: user.organizationId },
  });
  const created = await tx.userProfile.create({
    data: {
      ...data,
      password,
      organizationId: user.organizationId,
      companyId: user.organizationId,
      companyName: organization.name,
      address: "",
      active: true,
    },
    select: publicUser,
  });
  const creation = await tx.accountCreation.create({ data: {
    organizationId: user.organizationId, targetUserId: created.id, actorId: user.id,
    actionKey, fingerprint, role: data.role, workArea: data.workArea,
  } });
  return Response.json({ user: created, creation: receipt(creation) }, { status: 201 });
}
async function PUTHandler(req, { user, tx }) {
  if (user.role !== "ADMINISTRATOR")
    throw new HttpError(403, "Only administrators can edit accounts");
  const body = await req.json();
  const target = await tx.userProfile.findFirst({
    where: { id: Number(body.id), organizationId: user.organizationId },
  });
  if (!target) throw new HttpError(404, "User not found");
  const data = accountData(body, user);
  if (typeof body.enabled !== "boolean")
    throw new HttpError(400, "Account status is required");
  if (target.id === user.id && (!body.enabled || data.role !== "ADMINISTRATOR"))
    throw new HttpError(
      403,
      "You cannot deactivate or demote your own administrator account",
    );
  if (
    target.active &&
    target.role === "ADMINISTRATOR" &&
    (!body.enabled || data.role !== "ADMINISTRATOR")
  ) {
    if (
      (await tx.userProfile.count({
        where: {
          organizationId: user.organizationId,
          active: true,
          role: "ADMINISTRATOR",
        },
      })) <= 1
    )
      throw new HttpError(409, "Keep at least one active administrator");
  }
  const keys = ["username", "email", "displayName", "role", "workArea", "active"];
  const after = { ...Object.fromEntries(keys.filter(key => key !== "active").map(key => [key, data[key]])), active: body.enabled };
  const { actionKey, reason, expected } = body;
  if (typeof actionKey !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actionKey) || typeof reason !== "string" || reason.trim().length < 3 || reason.trim().length > 1000 || !expected)
    throw new HttpError(400, "Review the account and provide a reason (3–1000 characters)");
  const fingerprint = createHash("sha256").update(JSON.stringify([target.id, after, keys.map(key => expected[key === "active" ? "enabled" : key]), reason.trim(), user.id])).digest("hex");
  const previous = await tx.accountChange.findFirst({ where: { organizationId: user.organizationId, actionKey } });
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new HttpError(409, "This confirmation belongs to different account changes");
    return Response.json({ change: previous, replayed: true });
  }
  if (keys.some(key => expected[key === "active" ? "enabled" : key] !== target[key])) throw new HttpError(409, "Account changed. Close and reload before reviewing again.");
  const changedFields = keys.filter(key => after[key] !== target[key]);
  if (!changedFields.length) throw new HttpError(400, "No changes to save");
  const updated = await tx.userProfile.update({
    where: { id: target.id },
    data: {
      ...data,
      active: body.enabled,
      ...(!body.enabled || target.role !== data.role || target.workArea !== data.workArea ? { sessionVersion: { increment: 1 } } : {}),
    },
    select: publicUser,
  });
  const accessSnapshot = row => ({ role: row.role, workArea: row.workArea, active: row.active });
  const change = await tx.accountChange.create({ data: { organizationId: user.organizationId, targetUserId: target.id, actorId: user.id, actionKey, fingerprint, reason: reason.trim(), before: accessSnapshot(target), after: accessSnapshot(updated), changedFields } });
  return Response.json({ user: updated, change });
}
export const GET = withApiAuth(GETHandler, { access: "member" });
export const POST = withApiAuth(POSTHandler, { access: "member" });
export const PUT = withApiAuth(PUTHandler, { access: "member" });
