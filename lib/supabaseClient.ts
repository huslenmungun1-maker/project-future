// lib/supabaseClient.ts
// Both exports now return the shared GoTrueClient singleton from browserClient.ts,
// eliminating the duplicate-instance warnings.
import { getBrowserClient } from "@/lib/browserClient";

export const supabasePublic = getBrowserClient();
export const supabase = supabasePublic;
