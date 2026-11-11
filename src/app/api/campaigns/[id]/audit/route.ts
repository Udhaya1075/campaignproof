import { api, fail } from "@/lib/api";
import { runAudit } from "@/lib/run-audit";

export const POST = api(async ({ user, db, params }) => {
  try {
    return { runId: await runAudit(db, user.id, params.id) };
  } catch (e) {
    return fail(400, e instanceof Error ? e.message : "Audit failed");
  }
}, { limit: 20 });
