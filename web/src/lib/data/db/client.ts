import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { DbReads } from "./compose";
import { createDbReads } from "./source";

/**
 * The database, when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set (null otherwise, and the
 * app runs on mock data). The service-role key bypasses row-level security, so it must only ever
 * be used on the server: `server-only` makes importing this file from client code a build error.
 */
export function databaseFromEnv(env: NodeJS.ProcessEnv = process.env): DbReads | null {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return createDbReads(client);
}
