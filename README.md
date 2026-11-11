# CampaignProof

Audit scheduled Buffer posts against an approved campaign brief, so conflicting prices, discounts, dates and links never publish.
Built for the Buffer Commit 2026 API Build Contest.

> **Status honesty:** this code was written without access to your Supabase project or Buffer credentials and has **not** been compiled or run end to end. The audit engine and library tests were executed (see `docs/TESTING.md`); everything else needs your first `npm install` / `npm run dev`. Send any error text back and it will be fixed. See `PROJECT_STATUS.md`.

## 1. Overview, problem, solution
A campaign says **₹999, 20% off, ends 20 Nov, example.com/offer, "Limited Time Offer"**. Then Instagram says 25%, Facebook says 25 Nov, LinkedIn links to the wrong page. CampaignProof stores the approved brief, pulls your scheduled posts from Buffer, runs deterministic rules, shows *what* is wrong, *where*, *what the approved value is* and *why*, and lets you correct and (after explicit confirmation) update the Buffer post. No AI service is used. It does not claim to be the first or only tool of its kind.

## 2. Features
Landing page · email/password auth · Buffer OAuth 2.0 (Authorization Code + PKCE) · campaigns and briefs (all brief fields optional) · live post fetch with channel/date/status filters · multi-select · rule-based audit (price, discount, dates, URL, required/prohibited phrases, required info, unsupported claims, cross-channel conflicts, messaging) · results with filter/sort · correction workflow (suggestions, diff, draft, approve/reject, send to Buffer after confirmation) · audit and correction history · CSV report and printable (PDF) report · separate, labelled demo mode.

## 3. Stack
Next.js 14 (App Router) · TypeScript · React 18 · Tailwind CSS · lucide-react · Supabase (Postgres, Auth, RLS) · Zod · Vitest · Playwright · Vercel.

## 4. Architecture
```
Browser ── Next.js pages/components ── /api routes ──┬─ Supabase (user session, RLS)
                                                     ├─ Supabase service role (encrypted Buffer tokens only)
                                                     └─ Buffer: auth.buffer.com (OAuth) · api.buffer.com (GraphQL)
src/lib/audit  pure rule engine (no I/O)
```
* Buffer tokens are AES-256-GCM encrypted and stored in `buffer_tokens` (RLS on, **no** policies: unreachable from the browser). Only the server uses the service-role key.
* OAuth `state` + PKCE verifier live in an encrypted, HttpOnly, 10-minute cookie bound to the user.
* Refresh tokens are single-use at Buffer; refresh is guarded by an optimistic version check so concurrent requests cannot reuse an old token.

## 5. Database
`supabase/migrations/0001_init.sql`: profiles, buffer_connections, buffer_tokens, campaigns, campaign_facts, campaign_phrases, campaign_channels, campaign_posts, audit_runs, audit_findings, corrections. Primary/foreign keys, constraints, indexes, `updated_at` triggers, RLS on every table (`user_id = auth.uid()`), and triggers that stop a user attaching rows to someone else's campaign. `supabase/tests/rls_isolation.sql` checks isolation (rolls back).

## 6. Folder structure
See `FILE_MANIFEST.md`.

## 7. Install (Windows 11 + VS Code, beginner)
1. Install **Node.js 20 LTS or 22** (nodejs.org) and **VS Code**. Restart VS Code.
2. Unzip the project, open the folder in VS Code (File → Open Folder).
3. Open the terminal (Ctrl+`) and run: `npm install`
4. Copy `.env.example` to `.env.local` (`copy .env.example .env.local`) and fill it in (steps below). `.env.local` is git-ignored; never commit it.

## 8. Supabase setup
1. supabase.com → New project (free tier). 
2. Project Settings → API: copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`, **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (secret!).
3. SQL Editor → New query → paste all of `supabase/migrations/0001_init.sql` → Run.
4. Authentication → Providers → Email. For quick local testing turn **Confirm email** off (or confirm via email).
5. Authentication → URL Configuration: Site URL `https://localhost:3000`; add redirect URL `https://localhost:3000/**` (and your Vercel URL later).
6. Optional: paste `supabase/tests/rls_isolation.sql` into the SQL editor; every line should print `PASS`.

## 9. Buffer developer app + OAuth
1. Log in to Buffer → **Settings → API** (https://publish.buffer.com/settings/api) → **App Clients → New Client**.
2. Choose a **private** client (this app has a server, so it gets a client secret). Enable permissions: `account:read`, `posts:read`, `posts:write`. (`offline_access` is requested at authorization to receive refresh tokens.)
3. **Redirect URI** (exact, no trailing slash): `https://localhost:3000/api/buffer/callback`. Buffer requires **HTTPS even on localhost**. Add your production URL later: `https://YOUR-APP.vercel.app/api/buffer/callback`.
4. Copy Client ID → `BUFFER_CLIENT_ID`, Client Secret → `BUFFER_CLIENT_SECRET`, and set `BUFFER_REDIRECT_URI` to the same redirect URI.
5. Generate the encryption key and paste it into `TOKEN_ENCRYPTION_KEY`:
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
6. Contest page: https://buffer.com/api/commit · API docs: https://developers.buffer.com/

## 10. Run locally (HTTPS)
`npm run dev:https` (Next generates a local certificate; accept/trust it). Open **https://localhost:3000**.
If certificate generation fails on Windows: `winget install FiloSottile.mkcert`, then `mkcert -install`, `mkdir certificates`, `mkcert -key-file certificates/localhost-key.pem -cert-file certificates/localhost.pem localhost`, then
`npx next dev --experimental-https --experimental-https-key ./certificates/localhost-key.pem --experimental-https-cert ./certificates/localhost.pem`.
Without Buffer credentials you can still register, create campaigns and use **Load demo campaign** with plain `npm run dev` (`http://localhost:3000`), set `NEXT_PUBLIC_APP_URL` to match.

## 11. Tests
`npm test` (Vitest) · `npm run typecheck` · `npm run test:e2e` (Playwright; run `npx playwright install` once). Details: `docs/TESTING.md`.

## 12. Deployment
`docs/DEPLOYMENT.md` (Vercel + Supabase).

## 13. Known limitations
* Buffer's API has no media upload, analytics for app clients, or comment access; none are used. Only a post's **text** is edited; images and schedule stay as they are.
* Threaded posts (X, Bluesky, Threads, Mastodon) store the root text in a thread array; editing only the root text may be rejected by Buffer. The error is shown and the post can be edited in Buffer.
* Drafts: the `draft` status filter is offered but unverified against a live account.
* Rate limiter for CampaignProof's own API is in-memory (per server instance).
* Dates written as `dd/mm/yyyy` are read day-first unless the second number is above 12. Month names are English only.
* The engine finds what the brief defines. It cannot judge tone, images, or facts it wasn't told.
* Links are never opened or followed (no SSRF surface); shortened links are reported as "cannot verify".

## 14. Future improvements
Team accounts and approval roles · scheduled re-audits · more languages · image/alt-text rules · export to Notion/Slack · richer thread support once Buffer exposes it.
