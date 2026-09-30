import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/server/api-route";
import { HttpError } from "@/lib/server/errors.cjs";
import { rateLimit } from "@/lib/server/rate-limit.cjs";
import { LOCALES } from "@/lib/i18n";
import { ensureTranslations } from "@/lib/server/text-translations";

// Translations of notes into the reader's language, in the order asked. An entry
// is null when the AI could not translate it right now.
async function POSTHandler(request, { user }) {
  const { texts, locale } = await request.json();
  if (!LOCALES.includes(locale) || !Array.isArray(texts) || !texts.length || texts.length > 50)
    throw new HttpError(400, "Texts and a language are required");
  await rateLimit("translate", user.id, 600);
  const found = await ensureTranslations(user.organizationId, texts, locale);
  return NextResponse.json({
    translations: texts.map((text) => (typeof text === "string" && found.get(text.trim())) || null),
  });
}

export const POST = withApiAuth(POSTHandler, { access: "member", transaction: false });

export const dynamic = "force-dynamic";
