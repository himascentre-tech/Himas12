import React, { useState } from "react";
import { uploadFileToBlob } from "../services/blobService";
import { ExternalLink } from "lucide-react";

export const BlobUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setUrl(null);

    try {
      const uploadedUrl = await uploadFileToBlob(file);
      if (uploadedUrl) {
        setUrl(uploadedUrl);
      } else {
        setError("Upload failed — No URL returned.");
      }
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm w-full max-w-lg mx-auto mt-4">
      <h3 className="text-lg font-bold mb-3">Upload to Vercel Blob</h3>
      <input type="file" className="block w-full border p-2 rounded mb-3"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

      {file && (
        <p className="text-sm text-slate-600 mb-3">
          Selected: <b>{file.name}</b> ({(file.size / 1024).toFixed(1)} KB)
        </p>
      )}

      <button disabled={!file || uploading} onClick={handleUpload}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50">
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {url && (
        <div className="mt-3 text-green-600">
          <p className="font-semibold">Upload successful!</p>
          <a href={url} target="_blank" rel="noreferrer"
            className="underline inline-flex items-center gap-1">
            {url} <ExternalLink size={14} />
          </a>
        </div>
      )}

      {error && <p className="mt-3 text-red-600 font-medium">{error}</p>}
    </div>
  );
};