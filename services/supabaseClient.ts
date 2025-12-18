import { createClient } from "@supabase/supabase-js";

// Use environment variables for Supabase configuration
// In Vite, these are accessed via import.meta.env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://xggnswfyegchwlplzvto.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_SrP6OJaEA9J1Xz22Tr3jdA_5QNPSwox";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Helper to check if client is configured
export const isSupabaseConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
