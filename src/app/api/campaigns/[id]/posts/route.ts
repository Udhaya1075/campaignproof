import { api, fail, jsonBody } from "@/lib/api";
import { importPostsSchema } from "@/lib/schemas";

/** Save a snapshot of selected live Buffer posts on a campaign (so audits are repeatable). */
export const POST = api(async ({ req, user, db, params }) => {
  const { posts } = importPostsSchema.parse(await jsonBody(req));
  const { data: campaign } = await db.from("campaigns").select("id, is_demo").eq("id", params.id).maybeSingle();
  if (!campaign) return fail(404, "Campaign not found.");
  if (campaign.is_demo) return fail(400, "Demo campaigns cannot import real Buffer posts.");

  const { data: existing } = await db.from("campaign_posts").select("id, buffer_post_id").eq("campaign_id", params.id);
  const known = new Map((existing ?? []).map((r) => [r.buffer_post_id, r.id]));
  let added = 0, updated = 0;
  for (const p of posts) {
    const row = { text: p.text, status: p.status ?? null, due_at: p.dueAt ?? null, channel_id: p.channelId ?? null, channel_name: p.channelName ?? null, service: p.service ?? null };
    const existingId = known.get(p.id);
    if (existingId) {
      await db.from("campaign_posts").update(row).eq("id", existingId);
      updated++;
    } else {
      const { error } = await db.from("campaign_posts").insert({ ...row, user_id: user.id, campaign_id: params.id, buffer_post_id: p.id, is_demo: false });
      if (error) return fail(400, error.message);
      added++;
    }
  }
  return { added, updated };
});
