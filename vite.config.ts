import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // @ts-ignore process is a node global available in the build script
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Use fallback strings if env vars are missing to ensure build consistency
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || "https://xggnswfyegchwlplzvto.supabase.co"),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || "sb_publishable_SrP6OJaEA9J1Xz22Tr3jdA_5QNPSwox"),
      'process.env.SENDGRID_API_KEY': JSON.stringify(env.SENDGRID_API_KEY || "")
    }
  };
});