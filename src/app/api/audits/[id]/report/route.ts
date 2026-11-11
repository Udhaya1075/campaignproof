import { NextResponse } from "next/server";
import { api, fail } from "@/lib/api";

const cell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

export const GET = api(async ({ db, params }) => {
  const { data: run } = await db.from("audit_runs").select("*, campaigns(name)").eq("id", params.id).maybeSingle();
  if (!run) return fail(404, "Audit not found.");
  const { data: findings } = await db.from("audit_findings").select("*").eq("run_id", params.id).order("created_at");
  const header = ["Channel", "Category", "Severity", "Detected value", "Approved value", "Explanation", "Suggested correction", "Rule"];
  const lines = [header.map(cell).join(",")];
  for (const f of findings ?? []) {
    lines.push([f.channel_name, f.category, f.severity, f.detected_value, f.expected_value, f.explanation, f.suggestion, f.rule_id].map(cell).join(","));
  }
  const name = String((run as any).campaigns?.name ?? "campaign").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new NextResponse(`\uFEFF${lines.join("\r\n")}\r\n`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="audit-${name}-${params.id.slice(0, 8)}.csv"` },
  });
});
