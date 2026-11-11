import type { SupabaseClient } from "@supabase/supabase-js";
import { auditPosts } from "./audit/engine.ts";
import { loadCampaign } from "./campaigns.ts";

/** Audit every post saved on a campaign, store the run and its findings, return the run id. */
export async function runAudit(db: SupabaseClient, userId: string, campaignId: string): Promise<string> {
  const loaded = await loadCampaign(db, campaignId);
  if (!loaded) throw new Error("Campaign not found");
  const { data: posts, error } = await db.from("campaign_posts").select("*").eq("campaign_id", campaignId).order("due_at", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  if (!posts || posts.length === 0) throw new Error("Add at least one post to this campaign before running an audit.");

  const result = auditPosts(loaded.brief, posts.map((p) => ({ id: p.id, channel: p.channel_name, service: p.service, text: p.text })));
  const { data: run, error: runErr } = await db.from("audit_runs").insert({
    user_id: userId, campaign_id: campaignId, is_demo: loaded.campaign.is_demo, status: "completed",
    total_posts: result.totalPosts, passed_posts: result.passedPosts, failed_posts: result.failedPosts,
    critical_count: result.counts.critical, high_count: result.counts.high, medium_count: result.counts.medium, low_count: result.counts.low,
    completed_at: new Date().toISOString(),
  }).select("id").single();
  if (runErr || !run) throw new Error(runErr?.message ?? "Could not save audit run");

  const rows = result.findings.map((f) => ({
    user_id: userId, run_id: run.id, campaign_post_id: f.postId, rule_id: f.ruleId, category: f.category, severity: f.severity,
    detected_value: f.detected, expected_value: f.expected, excerpt: f.excerpt, start_index: f.start, end_index: f.end,
    explanation: f.explanation, suggestion: f.suggestion, replacement: f.replacement, channel_name: f.channel,
  }));
  for (let i = 0; i < rows.length; i += 200) {
    const { error: fErr } = await db.from("audit_findings").insert(rows.slice(i, i + 200));
    if (fErr) {
      await db.from("audit_runs").update({ status: "failed" }).eq("id", run.id);
      throw new Error(fErr.message);
    }
  }
  return run.id;
}
