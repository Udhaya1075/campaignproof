import { api, fail } from "@/lib/api";

export const DELETE = api(async ({ db, params }) => {
  const { error, count } = await db.from("campaign_posts").delete({ count: "exact" }).eq("id", params.id);
  if (error) return fail(400, error.message);
  return count ? { ok: true } : fail(404, "Post not found.");
});
