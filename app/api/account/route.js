import bcrypt from "bcryptjs";
import { withApiAuth } from "@/lib/server/api-route";
import { HttpError } from "@/lib/server/errors.cjs";
import { publicUser, passwordValue } from "@/lib/server/accounts.cjs";
import { rateLimit } from "@/lib/server/rate-limit.cjs";
async function GETHandler(req, { user, tx }) {
  return Response.json({
    user: await tx.userProfile.findUnique({
      where: { id: user.id },
      select: publicUser,
    }),
  });
}
async function PUTHandler(req, { user, tx }) {
  const { currentPassword, newPassword } = await req.json();
  await rateLimit("password-change", String(user.id), 10);
  passwordValue(newPassword);
  if (
    typeof currentPassword !== "string" ||
    Buffer.byteLength(currentPassword) > 72
  )
    throw new HttpError(400, "Current password is required");
  const current = await tx.userProfile.findUniqueOrThrow({
    where: { id: user.id },
  });
  if (!(await bcrypt.compare(currentPassword, current.password)))
    throw new HttpError(400, "Current password is incorrect");
  await tx.userProfile.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(newPassword, 12),
      sessionVersion: { increment: 1 },
    },
  });
  return Response.json({
    message: "Password changed. Sign in again with your new password.",
  });
}
export const GET = withApiAuth(GETHandler, { access: "member" });
export const PUT = withApiAuth(PUTHandler, { access: "member" });
