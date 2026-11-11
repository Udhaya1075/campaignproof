# FILE_MANIFEST

'Complete' = fully written; none of these files has been compiled yet.

| File | Purpose | Complete |
|---|---|---|
| `.env.example` | Documented environment variables | yes |
| `.eslintrc.json` | ESLint | yes |
| `.gitignore` | Keeps secrets out of Git | yes |
| `HANDOFF.md` | Continuation guide | yes |
| `PROJECT_STATUS.md` | Progress | yes |
| `README.md` | Setup, architecture, limitations | yes |
| `docs/DEPLOYMENT.md` | Vercel + Supabase deployment | yes |
| `docs/TESTING.md` | Test commands and what was executed | yes |
| `next.config.mjs` | Next config + security headers | yes |
| `package.json` | Dependencies and npm scripts | yes |
| `playwright.config.ts` | Playwright config | yes |
| `postcss.config.js` | PostCSS | yes |
| `src/app/(app)/audits/[id]/page.tsx` | Page/layout/style | yes |
| `src/app/(app)/audits/[id]/report/page.tsx` | Page/layout/style | yes |
| `src/app/(app)/audits/page.tsx` | Page/layout/style | yes |
| `src/app/(app)/campaigns/[id]/edit/page.tsx` | Page/layout/style | yes |
| `src/app/(app)/campaigns/[id]/page.tsx` | Page/layout/style | yes |
| `src/app/(app)/campaigns/[id]/posts/page.tsx` | Page/layout/style | yes |
| `src/app/(app)/campaigns/new/page.tsx` | Page/layout/style | yes |
| `src/app/(app)/campaigns/page.tsx` | Page/layout/style | yes |
| `src/app/(app)/corrections/page.tsx` | Page/layout/style | yes |
| `src/app/(app)/dashboard/page.tsx` | Page/layout/style | yes |
| `src/app/(app)/layout.tsx` | Page/layout/style | yes |
| `src/app/(app)/posts/[id]/page.tsx` | Page/layout/style | yes |
| `src/app/(app)/settings/page.tsx` | Page/layout/style | yes |
| `src/app/(auth)/layout.tsx` | Page/layout/style | yes |
| `src/app/(auth)/login/page.tsx` | Page/layout/style | yes |
| `src/app/(auth)/register/page.tsx` | Page/layout/style | yes |
| `src/app/api/audits/[id]/report/route.ts` | API route | yes |
| `src/app/api/buffer/callback/route.ts` | API route | yes |
| `src/app/api/buffer/channels/route.ts` | API route | yes |
| `src/app/api/buffer/connect/route.ts` | API route | yes |
| `src/app/api/buffer/disconnect/route.ts` | API route | yes |
| `src/app/api/buffer/organizations/route.ts` | API route | yes |
| `src/app/api/buffer/posts/route.ts` | API route | yes |
| `src/app/api/campaign-posts/[id]/route.ts` | API route | yes |
| `src/app/api/campaigns/[id]/audit/route.ts` | API route | yes |
| `src/app/api/campaigns/[id]/posts/route.ts` | API route | yes |
| `src/app/api/campaigns/[id]/route.ts` | API route | yes |
| `src/app/api/campaigns/route.ts` | API route | yes |
| `src/app/api/corrections/[id]/apply/route.ts` | API route | yes |
| `src/app/api/corrections/[id]/route.ts` | API route | yes |
| `src/app/api/corrections/route.ts` | API route | yes |
| `src/app/api/demo/route.ts` | API route | yes |
| `src/app/globals.css` | Page/layout/style | yes |
| `src/app/layout.tsx` | Page/layout/style | yes |
| `src/app/page.tsx` | Page/layout/style | yes |
| `src/app/privacy/page.tsx` | Page/layout/style | yes |
| `src/app/terms/page.tsx` | Page/layout/style | yes |
| `src/components/actions.tsx` | UI component | yes |
| `src/components/buffer-card.tsx` | UI component | yes |
| `src/components/campaign-form.tsx` | UI component | yes |
| `src/components/confirm.tsx` | UI component | yes |
| `src/components/correction-editor.tsx` | UI component | yes |
| `src/components/findings-table.tsx` | UI component | yes |
| `src/components/logo.tsx` | UI component | yes |
| `src/components/post-picker.tsx` | UI component | yes |
| `src/components/print-button.tsx` | UI component | yes |
| `src/components/shell.tsx` | UI component | yes |
| `src/components/toast.tsx` | UI component | yes |
| `src/components/ui.tsx` | UI component | yes |
| `src/lib/api.ts` | API route wrapper | yes |
| `src/lib/audit/brief.ts` | Brief normalisation + formatting | yes |
| `src/lib/audit/engine.ts` | auditPosts, cross-channel, applyFixes | yes |
| `src/lib/audit/index.ts` | Engine exports | yes |
| `src/lib/audit/rules.ts` | Per-post rules | yes |
| `src/lib/audit/text.ts` | Extraction: money, %, dates, URLs, phrases | yes |
| `src/lib/audit/types.ts` | Engine types | yes |
| `src/lib/buffer/client.ts` | GraphQL client (timeout, 401, 429) | yes |
| `src/lib/buffer/cookie.ts` | OAuth cookie name | yes |
| `src/lib/buffer/errors.ts` | BufferError | yes |
| `src/lib/buffer/oauth.ts` | Authorize URL, token exchange/refresh | yes |
| `src/lib/buffer/queries.ts` | GraphQL documents | yes |
| `src/lib/buffer/tokens.ts` | Token store, refresh, bufferForUser | yes |
| `src/lib/campaigns.ts` | Save/load campaign + brief | yes |
| `src/lib/crypto.ts` | AES-256-GCM, PKCE, constant-time compare | yes |
| `src/lib/demo.ts` | Demo campaign seed | yes |
| `src/lib/diff.ts` | Word diff | yes |
| `src/lib/env.ts` | Zod environment validation | yes |
| `src/lib/fetcher.ts` | Browser fetch + date helpers | yes |
| `src/lib/run-audit.ts` | Run and persist an audit | yes |
| `src/lib/schemas.ts` | Zod request schemas | yes |
| `src/lib/security.ts` | Origin check, rate limit, SSRF-safe URL validation | yes |
| `src/lib/supabase/admin.ts` | Service-role client (tokens only) | yes |
| `src/lib/supabase/client.ts` | Browser Supabase client | yes |
| `src/lib/supabase/middleware.ts` | Auth redirect logic | yes |
| `src/lib/supabase/server.ts` | Server Supabase client (RLS) | yes |
| `src/middleware.ts` | Session refresh + route protection | yes |
| `supabase/migrations/0001_init.sql` | Schema, indexes, triggers, RLS | yes |
| `supabase/tests/rls_isolation.sql` | RLS isolation check (rolls back) | yes |
| `tailwind.config.ts` | Brand colours and fonts | yes |
| `tests/e2e/smoke.spec.ts` | Playwright tests | yes |
| `tests/unit/audit.test.ts` | Engine tests | yes |
| `tests/unit/lib.test.ts` | Crypto/OAuth/client/security tests | yes |
| `tests/unit/schemas.test.ts` | Schema tests | yes |
| `tsconfig.json` | TypeScript config (allows .ts import suffix) | yes |
| `vitest.config.ts` | Vitest config | yes |
