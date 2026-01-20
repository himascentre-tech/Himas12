
import React, { useState, useEffect } from "react";
import { useHospital } from "../context/HospitalContext";
import { supabase } from "../services/supabaseClient";
import { Role } from "../types";
import { Building2, Mail, Lock, Loader2, Stethoscope, Users, Briefcase, AlertCircle, Clock } from 'lucide-react';

const ACCOUNT_MAP: Record<string, { email: string, role: Role }> = {
  'Himasoffice': { email: 'office@himas.com', role: 'FRONT_OFFICE' },
  'office@himas.com': { email: 'office@himas.com', role: 'FRONT_OFFICE' },
  'DoctorHimas': { email: 'doctor@himas.com', role: 'DOCTOR' },
  'doctor@himas.com': { email: 'doctor@himas.com', role: 'DOCTOR' },
  'Team1984': { email: 'team@himas.com', role: 'PACKAGE_TEAM' },
  'team@himas.com': { email: 'team@himas.com', role: 'PACKAGE_TEAM' },
};

export const Login: React.FC = () => {
  const { setCurrentUserRole } = useHospital();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTakingLong, setIsTakingLong] = useState(false);

  useEffect(() => {
    let timer: number;
    if (isLoading) {
      timer = window.setTimeout(() => {
        setIsTakingLong(true);
      }, 4000);
    } else {
      setIsTakingLong(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

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
      // Auth attempt
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password,
      });

      if (authError) throw authError;
      
      // If successful, set role which triggers dashboard load
      setCurrentUserRole(account.role);
    } catch (err: any) {
      console.error("Login Error:", err);
      setError(err.message || "Login failed. Check credentials.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
           <div className="bg-hospital-600 p-3 rounded-xl shadow-lg">
             <Building2 className="w-8 h-8 text-white" />
           </div>
           <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Himas Hospital</h1>
        </div>
        <p className="text-slate-500 font-medium text-sm tracking-wide">Secure Staff Portal Access</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-hospital-600 rounded-t-2xl" />
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Staff ID / Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-hospital-500 outline-none font-medium disabled:opacity-50"
                placeholder="e.g. Himasoffice"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
          </div>
          <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
             <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="password"
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-hospital-500 outline-none font-medium disabled:opacity-50"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {isTakingLong && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <Clock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700 leading-relaxed">
                <span className="font-bold block mb-0.5">Database is waking up...</span>
                First login of the day may take up to 30 seconds. Please do not refresh the page.
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-hospital-700 hover:bg-hospital-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : 'Login to Dashboard'}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t flex justify-between">
           <div className="flex flex-col items-center gap-1 group cursor-help" title="Himasoffice / Himas1984@">
             <Users className="w-4 h-4 text-slate-300" />
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Office</span>
           </div>
           <div className="flex flex-col items-center gap-1 group cursor-help" title="DoctorHimas / Doctor8419@">
             <Stethoscope className="w-4 h-4 text-slate-300" />
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Doctor</span>
           </div>
           <div className="flex flex-col items-center gap-1 group cursor-help" title="Team1984 / Team8131@">
             <Briefcase className="w-4 h-4 text-slate-300" />
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Packages</span>
           </div>
        </div>
      </div>
      <p className="mt-8 text-xs text-slate-400 font-medium">Himas Hospital Management System v2.2</p>
    </div>
  );
};
