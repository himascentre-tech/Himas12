import React, { useState, useEffect } from "react";
import { useHospital } from "../context/HospitalContext";
import { supabase } from "../services/supabaseClient";
import { Role } from "../types";
import { 
  Building2, 
  Mail, 
  Lock, 
  Loader2, 
  Stethoscope, 
  Users, 
  Briefcase, 
  AlertCircle 
} from 'lucide-react';

const ACCOUNT_MAP: Record<string, { email: string, role: Role }> = {
  'Himasoffice': { email: 'office@himas.com', role: 'FRONT_OFFICE' },
  'office@himas.com': { email: 'office@himas.com', role: 'FRONT_OFFICE' },
  'DoctorHimas': { email: 'doctor@himas.com', role: 'DOCTOR' },
  'doctor@himas.com': { email: 'doctor@himas.com', role: 'DOCTOR' },
  'Team1984': { email: 'team@himas.com', role: 'PACKAGE_TEAM' },
  'team@himas.com': { email: 'team@himas.com', role: 'PACKAGE_TEAM' },
};

export const Login: React.FC = () => {
  const { setCurrentUserRole, prewarmDatabase } = useHospital();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    prewarmDatabase();
  }, [prewarmDatabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const account = ACCOUNT_MAP[identifier.trim()];
    if (!account) {
      setError("Invalid Staff Identifier");
      setIsLoading(false);
      return;
    }

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password,
      });

      if (authError) throw authError;
      setCurrentUserRole(account.role);
    } catch (err: any) {
      console.error("Login Error:", err);
      setError(err.message || "Connection failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6">
      {/* Header Logo & Title */}
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="bg-hospital-600 p-2 rounded-lg shadow-sm">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Himas Hospital</h1>
        </div>
        <p className="text-[13px] text-slate-400 font-medium tracking-wide">Secure Staff Portal Access</p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl shadow-slate-200/50 border-t-[5px] border-hospital-600 overflow-hidden">
        <form onSubmit={handleLogin} className="p-8 pb-5 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Staff ID / Email</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="text"
                disabled={isLoading}
                autoFocus
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-hospital-50 focus:border-hospital-500 outline-none font-medium text-slate-700 transition-all disabled:opacity-50"
                placeholder="e.g. Himasoffice"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                disabled={isLoading}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-hospital-50 focus:border-hospital-500 outline-none font-medium text-slate-700 transition-all disabled:opacity-50"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 text-red-600 text-[11px] font-bold rounded-xl flex items-center gap-2.5 border border-red-100 animate-in fade-in zoom-in-95">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-hospital-600 hover:bg-hospital-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-hospital-100 flex items-center justify-center gap-2.5 disabled:opacity-70 active:scale-[0.98]"
          >
            {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
            <span className="tracking-tight">Login to Dashboard</span>
          </button>
        </form>

        {/* Roles Footer Section */}
        <div className="px-8 pb-8">
          <div className="h-px bg-slate-100 mb-6 w-full" />
          <div className="flex justify-between items-center px-2">
            <div className="flex flex-col items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity cursor-help" title="Office: Himasoffice">
              <Users className="w-5 h-5 text-slate-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Office</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity cursor-help" title="Doctor: DoctorHimas">
              <Stethoscope className="w-5 h-5 text-slate-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Doctor</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity cursor-help" title="Packages: Team1984">
              <Briefcase className="w-5 h-5 text-slate-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Packages</span>
            </div>
          </div>
        </div>
      </div>

      {/* Version Information */}
      <p className="mt-8 text-[11px] text-slate-400 font-medium tracking-tight">
        Himas Hospital Management System v2.2
      </p>
    </div>
  );
};