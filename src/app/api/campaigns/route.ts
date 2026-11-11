import { api, jsonBody } from "@/lib/api";
import { saveCampaign } from "@/lib/campaigns";
import { campaignSchema } from "@/lib/schemas";

export const POST = api(async ({ req, user, db }) => {
  const input = campaignSchema.parse(await jsonBody(req));
  const id = await saveCampaign(db, user.id, input);
  return { id };
});
