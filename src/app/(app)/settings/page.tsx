import { supabaseServer } from "@/lib/supabase/server";
import { getConnection } from "@/lib/buffer/tokens";
import { bufferConfigured } from "@/lib/env";
import { Alert, Card, CardHeader, PageHeader } from "@/components/ui";
import { BufferCard } from "@/components/buffer-card";

export const metadata = { title: "Buffer & account" };

const MESSAGES: Record<string, string> = {
  denied: "You declined access in Buffer. Nothing was connected.",
  invalid_state: "The sign-in request could not be verified (it may have expired). Please try connecting again.",
  connect_failed: "Buffer connected but we couldn’t finish setting it up. Check the redirect URI and client credentials, then try again.",
  buffer_error: "Buffer returned an error. Please try again.",
  not_configured: "Buffer settings are missing on the server. See the README.",
  rate_limited: "Too many attempts. Wait a minute and try again.",
};

const HINTS: Record<string, string> = {
  invalid_scope: "A requested permission isn't enabled on your Buffer client. In Buffer → Settings → API → your client → Permissions, enable account:read, posts:read and posts:write (and offline_access if it is listed), save, then try again.",
  invalid_request: "Buffer rejected the request parameters. Check that the redirect URI on your Buffer client is exactly the same as BUFFER_REDIRECT_URI in .env.local, then restart the server.",
  invalid_client: "Buffer doesn't recognise BUFFER_CLIENT_ID. Re-copy it from Buffer → Settings → API, then restart the server.",
};

export default async function Settings({ searchParams }: { searchParams: { connected?: string; error?: string; code?: string; desc?: string } }) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  const configured = bufferConfigured();
  const conn = configured && user ? await getConnection(user.id).catch(() => null) : null;
  return (
    <>
      <PageHeader title="Buffer & account" />
      <div className="max-w-3xl space-y-5">
        {searchParams.connected && <Alert tone="success">Buffer connected.</Alert>}
        {searchParams.error && (
          <Alert tone="error">
            {MESSAGES[searchParams.error] ?? "Something went wrong."}
            {searchParams.code && <p className="mt-1 font-mono text-xs">Buffer said: {searchParams.code.slice(0, 60)}{searchParams.desc ? ` · ${searchParams.desc.slice(0, 200)}` : ""}</p>}
            {searchParams.code && HINTS[searchParams.code] && <p className="mt-1">{HINTS[searchParams.code]}</p>}
          </Alert>
        )}
        <BufferCard configured={configured} connection={conn as any} />
        <Card><CardHeader title="Demo mode" /><p className="p-5 text-sm text-slate-600">Don’t have a Buffer account handy? Use <strong>Load demo campaign</strong> on the dashboard. Demo campaigns are labelled everywhere, excluded from dashboard totals, and can never send anything to Buffer.</p></Card>
        <Card><CardHeader title="Account" /><p className="p-5 text-sm">Signed in as <strong>{user?.email}</strong></p></Card>
      </div>
    </>
  );
}
