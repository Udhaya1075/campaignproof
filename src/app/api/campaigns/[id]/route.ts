import { api, fail, jsonBody } from "@/lib/api";
import { saveCampaign } from "@/lib/campaigns";
import { campaignSchema } from "@/lib/schemas";

export const PUT = api(async ({ req, user, db, params }) => {
  const input = campaignSchema.parse(await jsonBody(req));
  const { data } = await db.from("campaigns").select("id").eq("id", params.id).maybeSingle();
  if (!data) return fail(404, "Campaign not found.");
  await saveCampaign(db, user.id, input, params.id);
  return { id: params.id };
});

export const DELETE = api(async ({ db, params }) => {
  const { error, count } = await db.from("campaigns").delete({ count: "exact" }).eq("id", params.id);
  if (error) return fail(400, error.message);
  if (!count) return fail(404, "Campaign not found.");
  return { ok: true };
});
