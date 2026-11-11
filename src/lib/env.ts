import { z } from "zod";

const b64Key32 = z
  .string()
  .refine((v) => {
    try { return Buffer.from(v, "base64").length === 32; } catch { return false; }
  }, "must be 32 random bytes encoded as base64");

const schema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  BUFFER_CLIENT_ID: z.string().min(1),
  BUFFER_CLIENT_SECRET: z.string().optional(),
  BUFFER_REDIRECT_URI: z.string().url(),
  TOKEN_ENCRYPTION_KEY: b64Key32,
});

export type ServerEnv = z.infer<typeof schema>;
let cached: ServerEnv | null = null;

/** Validated server-side environment. Error messages name the variables, never their values. */
export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const bad = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration. ${bad}`);
  }
  cached = parsed.data;
  return cached;
}

/** True when the Buffer OAuth client is configured (so the UI can explain what is missing). */
export function bufferConfigured(): boolean {
  return Boolean(process.env.BUFFER_CLIENT_ID && process.env.BUFFER_REDIRECT_URI && process.env.TOKEN_ENCRYPTION_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
