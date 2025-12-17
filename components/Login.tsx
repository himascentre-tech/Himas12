import React, { useState } from "react";
import { useHospital } from "../context/HospitalContext";
import { supabase } from "../services/supabaseClient";
import { Role } from "../types";
import { Building2, UserCircle, Lock, Loader2, Stethoscope, Users, Briefcase } from 'lucide-react';

export const Login: React.FC = () => {
  const { setCurrentUserRole } = useHospital();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Mapping Login ID to Email (for Supabase Auth) and Role (for App State)
  const credentialsMap: Record<string, { email: string, role: Role, label: string }> = {
    'Himasoffice': { email: 'office@himas.com', role: 'FRONT_OFFICE', label: 'Front Office' },
    'DoctorHimas': { email: 'doctor@himas.com', role: 'DOCTOR', label: 'Doctor Panel' },
    'Team1984': { email: 'team@himas.com', role: 'PACKAGE_TEAM', label: 'Package Team' },
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const creds = credentialsMap[loginId];

    if (!creds) {
      setError("Invalid Login ID. Please check your role ID.");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: creds.email,
        password,
      });

      if (error) throw error;

      // Set Role in Context to trigger view change
      setCurrentUserRole(creds.role);
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Invalid Password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
           <div className="bg-hospital-600 p-3 rounded-xl shadow-lg shadow-hospital-200">
             <Building2 className="w-8 h-8 text-white" />
           </div>
           <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Himas Hospital</h1>
        </div>
        <p className="text-slate-500 font-medium">Management Information System</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Staff Login</h2>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Login ID</label>
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-hospital-500 focus:outline-none transition-all font-medium text-slate-700 placeholder-slate-400"
                placeholder="e.g. Himasoffice"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
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
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-hospital-700 hover:bg-hospital-800 text-white font-bold py-3.5 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-hospital-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Secure Login'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100">
           <p className="text-xs text-center text-slate-400 font-semibold uppercase tracking-wider mb-4">Available Access Roles</p>
           <div className="flex justify-between gap-2">
              <div className="flex flex-col items-center gap-1 text-slate-400 hover:text-hospital-600 transition-colors cursor-help" title="ID: Himasoffice">
                 <Users className="w-5 h-5" />
                 <span className="text-[10px] font-bold">Front Office</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-slate-400 hover:text-hospital-600 transition-colors cursor-help" title="ID: DoctorHimas">
                 <Stethoscope className="w-5 h-5" />
                 <span className="text-[10px] font-bold">Doctor</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-slate-400 hover:text-hospital-600 transition-colors cursor-help" title="ID: Team1984">
                 <Briefcase className="w-5 h-5" />
                 <span className="text-[10px] font-bold">Package</span>
              </div>
           </div>
        </div>
      </div>
      
      <p className="mt-8 text-xs text-slate-400">
        © 2024 Himas Hospital Management System • Secured Access Only
      </p>
    </div>
  );
};
