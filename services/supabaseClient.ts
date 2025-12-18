import { createClient } from '@supabase/supabase-js';

/**
 * Access environment variables via import.meta.env (Vite standard).
 * These are injected at build time by Vite.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail-fast if variables are missing to prevent runtime null errors
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'CRITICAL: Supabase environment variables are missing. ' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  );
}

/**
 * Singleton Supabase Client.
 * Guaranteed to be non-nullable and correctly configured.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
