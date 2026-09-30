import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/server/api-route";
import { HttpError } from "@/lib/server/errors.cjs";
import { rateLimit } from "@/lib/server/rate-limit.cjs";
import { proofread } from "@/lib/server/ai-text";
import { TEXT_LIMIT } from "@/lib/server/text-translations";

// Spelling and grammar suggestion for a note before it is sent. `corrected` is
// null when AI is unavailable; the note is then sent as written.
async function POSTHandler(request, { user }) {
  const { text } = await request.json();
  if (typeof text !== "string" || !text.trim() || text.length > TEXT_LIMIT)
    throw new HttpError(400, "Text is required");
  await rateLimit("proofread", user.id, 120);
  const result = await proofread(text);
  return NextResponse.json(result ?? { language: null, corrected: null, changed: false });
}

export const POST = withApiAuth(POSTHandler, { access: "member", transaction: false });

export const dynamic = "force-dynamic";
