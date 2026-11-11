export interface DiffPart { type: "same" | "add" | "del"; text: string }

/** Word-level diff (LCS) used by the correction screen. Whitespace is preserved as tokens. */
export function diffWords(a: string, b: string): DiffPart[] {
  const x = a.match(/\s+|[^\s]+/g) ?? [];
  const y = b.match(/\s+|[^\s]+/g) ?? [];
  const n = x.length, m = y.length;
  if (n * m > 4_000_000) return [{ type: "del", text: a }, { type: "add", text: b }];
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffPart[] = [];
  const push = (type: DiffPart["type"], text: string) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += text; else out.push({ type, text });
  };
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) { push("same", x[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) push("del", x[i++]);
    else push("add", y[j++]);
  }
  while (i < n) push("del", x[i++]);
  while (j < m) push("add", y[j++]);
  return out;
}
