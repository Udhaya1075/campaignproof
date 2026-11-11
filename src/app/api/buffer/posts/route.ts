import { api, fail } from "@/lib/api";
import { bufferForUser, getConnection } from "@/lib/buffer/tokens";
import { Q_CHANNELS, Q_POSTS, type BufferChannel, type BufferPost } from "@/lib/buffer/queries";
import { postsQuerySchema } from "@/lib/schemas";

/** Live scheduled posts from the user's Buffer organization. Nothing here is fabricated or cached. */
export const GET = api(async ({ req, user }) => {
  const q = postsQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const conn = await getConnection(user.id);
  if (!conn?.organization_id) return fail(409, "Connect Buffer first.", { code: "buffer_not_connected" });

  const filter: Record<string, unknown> = { status: [q.status] };
  if (q.channelIds.length) filter.channelIds = q.channelIds;
  if (q.from || q.to) filter.dueAt = { ...(q.from ? { start: q.from } : {}), ...(q.to ? { end: q.to } : {}) };

  const [posts, channels] = await Promise.all([
    bufferForUser<{ posts: { edges: { node: BufferPost }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } }>(
      user.id, Q_POSTS, { organizationId: conn.organization_id, first: 50, after: q.after ?? null, filter },
    ),
    bufferForUser<{ channels: BufferChannel[] }>(user.id, Q_CHANNELS, { organizationId: conn.organization_id }),
  ]);
  const names = new Map(channels.channels.map((c) => [c.id, c.displayName || c.name]));
  return {
    posts: posts.posts.edges.map(({ node }) => ({ ...node, channelName: names.get(node.channelId) ?? node.channelService })),
    pageInfo: posts.posts.pageInfo,
  };
}, { limit: 30 });
