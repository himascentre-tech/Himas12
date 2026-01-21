
import React, { useState } from "react";
import { uploadFileToBlob } from "../services/blobService";
import { Upload, FileCheck, Loader2, ExternalLink, X } from "lucide-react";

export const TestUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function handleUpload() {
    if (!file) return;
    
    setIsUploading(true);
    try {
      const result = await uploadFileToBlob(file);
      if (result) {
        setUrl(result);
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm max-w-md w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-hospital-100 p-2 rounded-xl">
          <Upload className="w-5 h-5 text-hospital-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Media Upload Test</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Vercel Blob Storage Integration</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative group">
          <input 
            type="file" 
            id="test-upload-input"
            className="hidden" 
            onChange={e => setFile(e.target.files?.[0] ?? null)} 
          />
          <label 
            htmlFor="test-upload-input"
            className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 hover:border-hospital-400 hover:bg-hospital-50 transition-all cursor-pointer bg-slate-50/50"
          >
            {file ? (
              <div className="flex flex-col items-center">
                <FileCheck className="w-8 h-8 text-emerald-500 mb-2" />
                <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{file.name}</span>
                <span className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-8 h-8 text-slate-300 mb-2 group-hover:text-hospital-500" />
                <span className="text-xs font-bold text-slate-400">Select file to test upload</span>
              </div>
            )}
          </label>
        </div>

        <button 
          onClick={handleUpload} 
          disabled={!file || isUploading}
          className="w-full bg-hospital-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-hospital-100 hover:bg-hospital-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {isUploading ? "Uploading..." : "Start Upload"}
        </button>

        {url && (
          <div className="animate-in fade-in slide-in-from-top-2 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Success</span>
              <button onClick={() => setUrl("")} className="text-emerald-400 hover:text-emerald-600">
                <X className="w-3 h-3" />
              </button>
            </div>
            <a 
              href={url} 
              target="_blank" 
              rel="noreferrer" 
              className="text-[10px] font-bold text-emerald-700 break-all flex items-center gap-1.5 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              {url}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestUpload;
