import { createClient } from "@supabase/supabase-js";

// ✅ Hardcoded for Google AI Studio (NO .env support)
const SUPABASE_URL = "https://xggnswfyegchwlplzvto.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_SrP6OJaEA9J1Xz22Tr3jdA_5QNPSwox";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// keep for compatibility
export const isSupabaseConfigured = true;
