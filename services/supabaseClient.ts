import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Client Configuration
 * 
 * We use process.env here because vite.config.ts is configured to 'define' 
 * these variables into the global scope. This avoids issues where 
 * import.meta.env might be undefined in certain execution contexts.
 */
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://xggnswfyegchwlplzvto.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_SrP6OJaEA9J1Xz22Tr3jdA_5QNPSwox";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Helper to check if client is configured
export const isSupabaseConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
