import { createClient } from '@supabase/supabase-js';

/**
 * Robust environment variable retrieval for Supabase.
 * We prioritize environment variables but fall back to the provided project credentials
 * to ensure the app never crashes due to missing configuration.
 */
const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) 
  ? import.meta.env.VITE_SUPABASE_URL 
  : 'https://xggnswfyegchwlplzvto.supabase.co';

const SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) 
  ? import.meta.env.VITE_SUPABASE_ANON_KEY 
  : 'sb_publishable_SrP6OJaEA9J1Xz22Tr3jdA_5QNPSwox';

// Validate that we have strings before creating the client to avoid TypeErrors
if (!SUPABASE_URL || typeof SUPABASE_URL !== 'string') {
  throw new Error("Supabase URL is missing or invalid. Check your environment variables.");
}

if (!SUPABASE_ANON_KEY || typeof SUPABASE_ANON_KEY !== 'string') {
  throw new Error("Supabase Anon Key is missing or invalid. Check your environment variables.");
}

/**
 * Singleton Supabase client.
 * Initialized with validated URL and Key strings.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
