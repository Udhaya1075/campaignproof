import { api, fail, jsonBody } from "@/lib/api";
import { correctionPatchSchema } from "@/lib/schemas";

export const PATCH = api(async ({ req, db, params }) => {
  const b = correctionPatchSchema.parse(await jsonBody(req));
  const { data: cur } = await db.from("corrections").select("status").eq("id", params.id).maybeSingle();
  if (!cur) return fail(404, "Correction not found.");
  if (cur.status === "applied") return fail(409, "This correction was already sent to Buffer.");
  const patch: Record<string, unknown> = {};
  if (b.correctedText !== undefined) { patch.corrected_text = b.correctedText; patch.status = "draft"; }
  if (b.status !== undefined) patch.status = b.status;
  patch.error_message = null;
  const { error } = await db.from("corrections").update(patch).eq("id", params.id);
  return error ? fail(400, error.message) : { ok: true };
});
