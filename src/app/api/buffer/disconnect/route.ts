import { api } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { deleteTokens } from "@/lib/buffer/tokens";

export const POST = api(async ({ user }) => {
  await deleteTokens(user.id);
  await supabaseAdmin().from("buffer_connections").delete().eq("user_id", user.id);
  return { ok: true };
});
