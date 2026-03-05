// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

/**
 * ✅ Public/anonymous client
 * Use for public reads (Reader pages, browsing).
 */
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);

/**
 * ⚠️ Legacy export kept for compatibility.
 * Treat this as PUBLIC client too (not cookie-auth).
 * Do NOT rely on it for authenticated RPC/mutations.
 */
export const supabase = supabasePublic;