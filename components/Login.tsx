import React, { useState } from "react";
import { useHospital } from "../context/HospitalContext";
import { supabase } from "../services/supabaseClient";
import { Role } from "../types";
import { Building2, Mail, Lock, Loader2, Stethoscope, Users, Briefcase, AlertCircle } from 'lucide-react';

/**
 * Account Mapping Layer
 * Translates either the specific username or email into the Supabase email.
 */
const ACCOUNT_MAP: Record<string, { email: string, role: Role, passHint: string }> = {
  'Himasoffice': { email: 'office@himas.com', role: 'FRONT_OFFICE', passHint: 'Himas1984@' },
  'office@himas.com': { email: 'office@himas.com', role: 'FRONT_OFFICE', passHint: 'Himas1984@' },
  'DoctorHimas': { email: 'doctor@himas.com', role: 'DOCTOR', passHint: 'Doctor8419@' },
  'doctor@himas.com': { email: 'doctor@himas.com', role: 'DOCTOR', passHint: 'Doctor8419@' },
  'Team1984': { email: 'team@himas.com', role: 'PACKAGE_TEAM', passHint: 'Team8131@' },
  'team@himas.com': { email: 'team@himas.com', role: 'PACKAGE_TEAM', passHint: 'Team8131@' },
};

export const Login: React.FC = () => {
  const { setCurrentUserRole } = useHospital();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const input = identifier.trim();
    
    // 1. Check if the provided Email/ID exists in our authorized map
    const account = ACCOUNT_MAP[input];

    if (!account) {
      setError("Invalid username");
      setIsLoading(false);
      return;
    }

    try {
      // 2. Perform Supabase Auth
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password,
      });

      if (authError) {
        if (authError.message.toLowerCase().includes("invalid login credentials")) {
          throw new Error("Invalid password. Please try again.");
        }
        throw authError;
      }

      // 3. Success: Set the application state for the specific role
      setCurrentUserRole(account.role);
    } catch (err: any) {
      console.error("Login attempt failed:", err.message);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-center gap-3 mb-2">
           <div className="bg-hospital-600 p-3 rounded-xl shadow-lg shadow-hospital-200">
             <Building2 className="w-8 h-8 text-white" />
           </div>
           <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Himas Hospital</h1>
        </div>
        <p className="text-slate-500 font-medium text-sm tracking-wide">Patient Management Information System</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-hospital-600" />
        
        <h2 className="text-xl font-bold text-slate-800 mb-6 text-center text-sm uppercase tracking-widest">Staff Portal</h2>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-hospital-500 focus:outline-none transition-all font-medium text-slate-700 placeholder-slate-400"
                placeholder="office@himas.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
             <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="password"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-hospital-500 focus:outline-none transition-all font-medium text-slate-700 placeholder-slate-400"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-hospital-700 hover:bg-hospital-800 text-white font-bold py-3.5 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-hospital-200 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enter System'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between">
           <div className="flex flex-col items-center gap-1 group cursor-help" title="ID: Himasoffice | Pass: Himas1984@">
             <Users className="w-4 h-4 text-slate-300 group-hover:text-hospital-500 transition-colors" />
             <span className="text-[10px] font-bold text-slate-400 uppercase">Office</span>
           </div>
           <div className="flex flex-col items-center gap-1 group cursor-help" title="ID: DoctorHimas | Pass: Doctor8419@">
             <Stethoscope className="w-4 h-4 text-slate-300 group-hover:text-hospital-500 transition-colors" />
             <span className="text-[10px] font-bold text-slate-400 uppercase">Doctor</span>
           </div>
           <div className="flex flex-col items-center gap-1 group cursor-help" title="ID: Team1984 | Pass: Team8131@">
             <Briefcase className="w-4 h-4 text-slate-300 group-hover:text-hospital-500 transition-colors" />
             <span className="text-[10px] font-bold text-slate-400 uppercase">Packages</span>
           </div>
        </div>
      </div>
      
      <p className="mt-8 text-xs text-slate-400 font-medium">
        Himas Hospital MIS © 2024 • Production Secure
      </p>
    </div>
  );
};