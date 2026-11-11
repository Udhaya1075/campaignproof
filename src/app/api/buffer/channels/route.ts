import { api, fail } from "@/lib/api";
import { bufferForUser, getConnection } from "@/lib/buffer/tokens";
import { Q_CHANNELS, type BufferChannel } from "@/lib/buffer/queries";

export const GET = api(async ({ user }) => {
  const conn = await getConnection(user.id);
  if (!conn?.organization_id) return fail(409, "Connect Buffer first.", { code: "buffer_not_connected" });
  const d = await bufferForUser<{ channels: BufferChannel[] }>(user.id, Q_CHANNELS, { organizationId: conn.organization_id });
  return { channels: d.channels };
});
