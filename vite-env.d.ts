// Fixed: Added missing Vercel Blob token properties to the ImportMetaEnv interface to resolve TypeScript errors in blobService.ts
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly SENDGRID_API_KEY: string;
  readonly API_KEY: string;
  readonly VITE_GOOGLE_SHEETS_WEBHOOK?: string;
  readonly VITE_BLOB_READ_WRITE_TOKEN: string;
  readonly BLOB_READ_WRITE_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}