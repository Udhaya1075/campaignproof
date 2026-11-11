# HANDOFF

## Architecture
Next.js 14 App Router. Server components read Supabase with the user's session (RLS). Mutations go through `/api/*` handlers wrapped by `src/lib/api.ts` (auth, same-origin CSRF check, rate limit, error mapping). Buffer tokens: encrypted in `buffer_tokens` (service role only). Audit engine: `src/lib/audit/*` (pure; imports use `.ts` suffix so Node can run it directly).

## Stack
Next 14.2, React 18, TS 5.6, Tailwind 3.4, Supabase (`@supabase/ssr`), Zod 3, Vitest 2, Playwright.

## Completed
Everything listed in PROJECT_STATUS.md (code written; see "Not yet verified").

## Environment variables
`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BUFFER_CLIENT_ID`, `BUFFER_CLIENT_SECRET`, `BUFFER_REDIRECT_URI`, `TOKEN_ENCRYPTION_KEY`. Template: `.env.example`.

## Setup
README sections 7 to 10.

## Buffer API facts used (from developers.buffer.com, fetched Nov 2026)
* GraphQL endpoint `https://api.buffer.com`; OAuth `https://auth.buffer.com/auth` and `/token`; PKCE S256 required; HTTPS redirect URIs required.
* Scopes requested: `account:read posts:read posts:write offline_access`. Refresh tokens rotate and are single-use.
* Queries: `account{organizations}`, `channels(input:{organizationId})`, `posts(first,after,input:{organizationId,filter,sort})`, `post(input:{id})`; mutation `editPost(input:{id,text})` returning `PostActionSuccess | MutationError`.
* Rate limit: HTTP 429 + `Retry-After`; auth failures appear as 401 or `UNAUTHORIZED` errors.

## Current problems
Never compiled. See PROJECT_STATUS.md "Known issues".

## Exact next task
Run `npm install && npm run typecheck && npm test`. Paste the full output of any failure into a new message, and fix files one at a time (always return whole files).

## Continuing in a new Claude conversation
Upload this ZIP (or paste HANDOFF.md, PROJECT_STATUS.md and FILE_MANIFEST.md) and say: "Continue CampaignProof from HANDOFF.md. Here is the error output: …". Do not redesign the project. Provide complete files with exact paths.
