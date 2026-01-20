import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) 
  ? import.meta.env.VITE_SUPABASE_URL 
  : 'https://xggnswfyegchwlplzvto.supabase.co';

const SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) 
  ? import.meta.env.VITE_SUPABASE_ANON_KEY 
  : 'sb_publishable_SrP6OJaEA9J1Xz22Tr3jdA_5QNPSwox';

/**
 * Hyper-aggressive fetch wrapper for Supabase free-tier cold starts.
 * Retries immediately on connection resets to minimize wake-up latency.
 */
const customFetch = async (url: string, options: any, retryCount = 0): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    
    // 502/503/504 usually mean the gateway is waiting for the DB to spin up
    if (!response.ok && [502, 503, 504].includes(response.status) && retryCount < 8) {
      const delay = retryCount === 0 ? 200 : 1000; // Immediate first retry, then standard backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      return customFetch(url, options, retryCount + 1);
    }
    return response;
  } catch (error: any) {
    // "Failed to fetch" usually means the connection was reset while the DB was waking
    if (retryCount < 8) {
      const delay = retryCount === 0 ? 200 : 800; 
      await new Promise(resolve => setTimeout(resolve, delay));
      return customFetch(url, options, retryCount + 1);
    }
    throw error;
  }
};

if (!SUPABASE_URL || typeof SUPABASE_URL !== 'string') {
  throw new Error("Supabase URL is missing or invalid.");
}

if (!SUPABASE_ANON_KEY || typeof SUPABASE_ANON_KEY !== 'string') {
  throw new Error("Supabase Anon Key is missing or invalid.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    fetch: (url, options) => customFetch(url as string, options),
    headers: { 'x-application-name': 'himas-hospital-pro' },
  },
});