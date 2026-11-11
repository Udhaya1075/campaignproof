# Testing

## Commands
```
npm test            # Vitest: tests/unit/*.test.ts
npm run typecheck   # tsc --noEmit
npm run test:e2e    # Playwright (needs `npx playwright install` once, and a running configured app)
```
Optional authenticated e2e: set `E2E_EMAIL` / `E2E_PASSWORD` to a confirmed Supabase user.

## What exists
| File | Covers |
|---|---|
| tests/unit/audit.test.ts | price (correct/incorrect/formats/currency), discount, dates (formats, wrong year, start), URL (variants, other page, missing, email, shortener), required/prohibited phrases, required info, claims, cross-channel, empty brief/inputs, invalid inputs, fixes |
| tests/unit/lib.test.ts | token encryption, PKCE (RFC 7636 vector), OAuth URL, token endpoint (secret handling, invalid_grant), Buffer client (401/expired, 429, GraphQL rate limit, timeout, network), same-origin check, rate limiter, SSRF URL validation, diff |
| tests/unit/schemas.test.ts | campaign input validation, confirm-to-apply schema |
| tests/e2e/smoke.spec.ts | landing, protected redirects, login validation, API auth/CSRF, optional full demo flow |
| supabase/tests/rls_isolation.sql | cross-user data isolation, token table inaccessible, child-row hijack blocked |

## What was actually executed (by the author, in a sandbox without npm network access)
* `audit.test.ts` (35 tests) and `lib.test.ts` (21 tests): **56/56 passed** using Node 22's test runner with a tiny Vitest-compatible shim. They have **not** been run under real Vitest.
* NOT executed: `schemas.test.ts` (needs zod), Playwright tests, RLS SQL test, `tsc`, `next build`, any live Supabase/Buffer call.

## Manual checklist (needs your accounts)
1. Register, log in, log out; `/dashboard` redirects to login when signed out.
2. Create two users; confirm user B cannot open user A's `/campaigns/<id>` (404).
3. Create/edit/delete a campaign with only a name; then with a full brief.
4. Settings → Connect Buffer; deny on the consent screen (see message); connect again.
5. Select posts → add → run audit → results filter/sort → CSV download → printable report.
6. Open a flagged post → apply suggestions → save draft → approve → Send to Buffer (confirm) → verify in Buffer.
7. Change the post text in Buffer, then try sending: expect the "changed in Buffer" refusal.
8. Disconnect, then try fetching posts: expect the connect prompt. Revoke access in Buffer: expect "Reconnect".
