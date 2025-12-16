import { createClient } from '@supabase/supabase-js';

declare const process: {
  env: {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
  }
};

// NOTE: Ensure these variables are set in your .env file
// VITE_SUPABASE_URL=https://your-project.supabase.co
// VITE_SUPABASE_ANON_KEY=your-anon-key
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

let client;

if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    client = createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    client = createMockClient();
  }
} else {
  console.warn("⚠️ Supabase Credentials not found. App running in offline mode.");
  client = createMockClient();
}

function createMockClient() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
        }),
      }),
      upsert: async () => ({ error: { message: 'Supabase not configured' } }),
    }),
  } as any;
}

export const supabase = client;