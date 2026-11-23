/**
 * Typed, validated environment variables. Import `publicEnv` anywhere;
 * import `serverEnv()` only from server code (it reads secrets).
 */
import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_DEFAULT_REGION: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .default("RO"),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

function format(error: z.ZodError): string {
  return error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
}

let cachedPublic: PublicEnv | undefined;

/** Public (browser-safe) variables. Next.js inlines NEXT_PUBLIC_* at build time. */
export function publicEnv(): PublicEnv {
  if (cachedPublic) return cachedPublic;
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
    NEXT_PUBLIC_DEFAULT_REGION: process.env.NEXT_PUBLIC_DEFAULT_REGION || undefined,
  });
  if (!parsed.success) {
    throw new Error(
      `Invalid public environment variables (see .env.example):\n${format(parsed.error)}`,
    );
  }
  cachedPublic = parsed.data;
  return cachedPublic;
}

/** Server-only variables, including secrets. Never call from client components. */
export function serverEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must not be called in the browser");
  }
  const parsed = serverSchema.safeParse({ ...publicEnv(), ...process.env });
  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables (see .env.example):\n${format(parsed.error)}`,
    );
  }
  return parsed.data;
}

/** True when Supabase is configured; lets pages render a setup notice instead of crashing. */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
