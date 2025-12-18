import { createClient } from '@supabase/supabase-js';

/**
 * Robust environment variable retrieval.
 * Uses optional chaining on import.meta.env to prevent "Cannot read properties of undefined" 
 * errors in environments where Vite has not yet injected the env object.
 */
const getEnvVar = (key: string, fallback: string): string => {
  try {
    // Safely access import.meta.env using optional chaining
    const value = import.meta?.env?.[key];
    return typeof value === 'string' && value.length > 0 ? value : fallback;
  } catch (e) {
    return fallback;
  }
};

// Values provided by the user for this specific project
const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL', 'https://xggnswfyegchwlplzvto.supabase.co');
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY', 'sb_publishable_SrP6OJaEA9J1Xz22Tr3jdA_5QNPSwox');

/**
 * Singleton Supabase client.
 * Guaranteed non-nullable and initialized with valid strings.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
