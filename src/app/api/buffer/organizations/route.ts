import { z } from "zod";
import { api, fail, jsonBody } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { bufferForUser } from "@/lib/buffer/tokens";
import { Q_ACCOUNT } from "@/lib/buffer/queries";

type Acct = { account: { organizations: { id: string; name: string }[] } };

export const GET = api(async ({ user }) => {
  const d = await bufferForUser<Acct>(user.id, Q_ACCOUNT);
  return { organizations: d.account.organizations };
});

export const POST = api(async ({ req, user }) => {
  const { organizationId } = z.object({ organizationId: z.string().min(1).max(100) }).parse(await jsonBody(req));
  const d = await bufferForUser<Acct>(user.id, Q_ACCOUNT);
  const org = d.account.organizations.find((o) => o.id === organizationId);
  if (!org) return fail(404, "That organization is not part of your Buffer account.");
  await supabaseAdmin().from("buffer_connections").update({ organization_id: org.id, organization_name: org.name }).eq("user_id", user.id);
  return { ok: true };
});
