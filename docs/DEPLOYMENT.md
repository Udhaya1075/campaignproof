# Deployment (Vercel + Supabase)

1. Push the project to a **private** GitHub repo (check `.gitignore` excludes `.env.local`; never commit secrets).
2. vercel.com → Add New → Project → import the repo. Framework: Next.js (auto).
3. Project → Settings → Environment Variables. Add every variable from `.env.example` for Production (and Preview if wanted):
   `NEXT_PUBLIC_APP_URL=https://YOUR-APP.vercel.app`, Supabase URL/anon/service-role, `BUFFER_CLIENT_ID`, `BUFFER_CLIENT_SECRET`,
   `BUFFER_REDIRECT_URI=https://YOUR-APP.vercel.app/api/buffer/callback`, `TOKEN_ENCRYPTION_KEY` (a **new** key for production).
4. Buffer → Settings → API → your client → add the production redirect URI (keep the localhost one).
5. Supabase → Authentication → URL Configuration: Site URL = production URL; add `https://YOUR-APP.vercel.app/**` as a redirect URL.
6. Deploy. Smoke test: register → Settings → Connect Buffer → approve → create campaign → select posts → run audit.
7. Changing `TOKEN_ENCRYPTION_KEY` invalidates stored Buffer tokens; users must reconnect.
8. Replace the privacy and terms templates before inviting the public.
