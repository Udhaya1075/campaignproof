import { api, fail, jsonBody } from "@/lib/api";
import { correctionCreateSchema } from "@/lib/schemas";

export const POST = api(async ({ req, user, db }) => {
  const b = correctionCreateSchema.parse(await jsonBody(req));
  const { data: post } = await db.from("campaign_posts").select("id, text").eq("id", b.campaignPostId).maybeSingle();
  if (!post) return fail(404, "Post not found.");
  const { data, error } = await db.from("corrections").insert({
    user_id: user.id, campaign_post_id: post.id, run_id: b.runId ?? null, original_text: post.text, corrected_text: b.correctedText, status: "draft",
  }).select("id").single();
  if (error || !data) return fail(400, error?.message ?? "Could not save draft");
  return { id: data.id };
});
