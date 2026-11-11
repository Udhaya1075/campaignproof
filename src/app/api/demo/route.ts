import { api } from "@/lib/api";
import { createDemoCampaign } from "@/lib/demo";

export const POST = api(async ({ user, db }) => ({ id: await createDemoCampaign(db, user.id) }), { limit: 5 });
