import { put } from "@vercel/blob";

export async function uploadFileToBlob(file: File): Promise<string | null> {
  const token =
    import.meta.env.VITE_BLOB_READ_WRITE_TOKEN ||
    (globalThis as any).env?.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    throw new Error("Missing VITE_BLOB_READ_WRITE_TOKEN in environment");
  }

  const { url } = await put(`uploads/${file.name}`, file, {
    access: "public",
    token,
  });

  return url;
}