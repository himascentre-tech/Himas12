import { createClient } from '@supabase/supabase-js';

// Accessing environment variables via process.env because vite.config.ts 
// uses 'define' to inject these specific variables at build time.
// We add fallbacks to ensure the app works even if the environment injection fails.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://xggnswfyegchwlplzvto.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_SrP6OJaEA9J1Xz22Tr3jdA_5QNPSwox";

// Initialize client with values or empty strings to prevent startup crash
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Export compatibility flag for existing components
export const isSupabaseConfigured = true;