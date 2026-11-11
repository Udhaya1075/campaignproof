import { api, fail, jsonBody } from "@/lib/api";
import { correctionApplySchema } from "@/lib/schemas";
import { bufferForUser } from "@/lib/buffer/tokens";
import { M_EDIT_POST, Q_POST } from "@/lib/buffer/queries";

const same = (a: string, b: string) => a.replace(/\r\n/g, "\n").trim() === b.replace(/\r\n/g, "\n").trim();
const LOCKED = new Set(["sent", "sending", "published", "error"]);

/**
 * Sends ONE approved correction to Buffer. Requires explicit confirmation in the body, an approved
 * correction, a real (non-demo) Buffer post, and that the post is unchanged in Buffer since import.
 */
export const POST = api(async ({ req, db, user, params }) => {
  correctionApplySchema.parse(await jsonBody(req));
  const { data: c } = await db.from("corrections").select("*").eq("id", params.id).maybeSingle();
  if (!c) return fail(404, "Correction not found.");
  if (c.status !== "approved") return fail(409, "Approve the correction before sending it to Buffer.");
  const { data: post } = await db.from("campaign_posts").select("*").eq("id", c.campaign_post_id).single();
  if (!post) return fail(404, "Post not found.");
  if (post.is_demo || !post.buffer_post_id) return fail(400, "Demo posts are never sent to Buffer.");

  const live = await bufferForUser<{ post: { id: string; text: string; status: string } | null }>(user.id, Q_POST, { id: post.buffer_post_id });
  if (!live.post) return fail(404, "This post no longer exists in Buffer.");
  if (LOCKED.has(String(live.post.status).toLowerCase())) return fail(409, `This post is already ${live.post.status} in Buffer and can't be edited.`);
  if (!same(live.post.text, c.original_text)) return fail(409, "This post was changed in Buffer after you imported it. Re-import it, then run the audit again.", { code: "stale" });

  const res = await bufferForUser<{ editPost: { __typename: string; message?: string; post?: { text: string } } }>(
    user.id, M_EDIT_POST, { input: { id: post.buffer_post_id, text: c.corrected_text } },
  );
  if (res.editPost.__typename !== "PostActionSuccess") {
    const message = res.editPost.message ?? "Buffer rejected the edit.";
    await db.from("corrections").update({ status: "failed", error_message: message }).eq("id", c.id);
    return fail(422, message, { code: "buffer_rejected" });
  }
  await db.from("corrections").update({ status: "applied", applied_at: new Date().toISOString(), error_message: null }).eq("id", c.id);
  await db.from("campaign_posts").update({ text: c.corrected_text }).eq("id", post.id);
  return { ok: true };
}, { limit: 20 });
