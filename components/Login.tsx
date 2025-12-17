import React, { useState } from 'react';
import { useHospital } from '../context/HospitalContext';
import { User, Lock, Eye, EyeOff, Activity, ArrowRight, ShieldCheck, Loader2, KeyRound } from 'lucide-react';
import { Role } from '../types';

export const Login: React.FC = () => {
  const { setCurrentUserRole, staffUsers, isStaffLoaded } = useHospital();
  
  // Login Form State
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isStaffLoaded) {
      setError('System initializing... Please wait.');
      return;
    }

    if (!loginId || !password) {
      setError('Please enter both User ID and Password.');
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate network check

    let identifiedRole: Role | null = null;
    let identifiedName = '';

    // 1. Check Default System Credentials (Hardcoded)
    if (loginId.toLowerCase() === 'himasoffice' && password === 'Himas1984@') {
        identifiedRole = 'FRONT_OFFICE';
        identifiedName = 'Front Office';
    } 
    else if (loginId.toLowerCase() === 'doctorhimas' && password === 'Doctor8419@') {
        identifiedRole = 'DOCTOR';
        identifiedName = 'Dr. Himas';
    } 
    else if (loginId.toLowerCase() === 'team1984' && password === 'Team8131@') {
        identifiedRole = 'PACKAGE_TEAM';
        identifiedName = 'Package Team';
    } 
    // 2. Check Dynamic Staff Users (Database)
    else {
        const user = staffUsers.find(u => 
            (u.email.toLowerCase() === loginId.toLowerCase() || u.name.toLowerCase() === loginId.toLowerCase()) && 
            u.password === password
        );
        if (user) {
            identifiedRole = user.role;
            identifiedName = user.name;
        }
    }

    if (identifiedRole) {
        localStorage.setItem("role", identifiedRole);
        localStorage.setItem("username", identifiedName);
        setCurrentUserRole(identifiedRole);
    } else {
        setError('Invalid User ID or Password.');
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
           <div className="h-20 w-20 bg-white rounded-2xl shadow-lg flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <Activity className="w-10 h-10 text-hospital-600" />
           </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Himas Web App</h1>
        <p className="text-slate-500 text-sm font-medium tracking-wide">SECURE HOSPITAL PORTAL</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-2xl shadow-slate-200 border border-white w-full max-w-md relative overflow-hidden">
        {isLoading && (
            <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                <Loader2 className="w-10 h-10 text-hospital-600 animate-spin mb-3" />
                <p className="text-sm font-bold text-gray-600 tracking-wide uppercase">Authenticating</p>
            </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
            <div className="text-center">
                <h2 className="text-xl font-bold text-gray-800">Staff Login</h2>
                <p className="text-sm text-gray-400">Enter your credentials to access</p>
            </div>

            <div className="space-y-4">
                <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">User ID / Email</label>
                <div className="relative group">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-hospital-600 transition-colors w-5 h-5" />
                    <input 
                        type="text" 
                        value={loginId}
                        onChange={e => setLoginId(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-hospital-50 focus:border-hospital-500 outline-none transition-all font-medium"
                        placeholder="e.g. Himasoffice"
                        autoFocus
                    />
                </div>
                </div>

                <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Password</label>
                <div className="relative group">
                    <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-hospital-600 transition-colors w-5 h-5" />
                    <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-hospital-50 focus:border-hospital-500 outline-none transition-all font-medium"
                        placeholder="••••••••"
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2 font-medium border border-red-100 animate-in fade-in slide-in-from-top-1">
                <ShieldCheck className="w-4 h-4" /> {error}
                </div>
            )}

            <button 
                type="submit" 
                disabled={isLoading || !loginId || !password}
                className="w-full bg-hospital-600 text-white py-3.5 rounded-xl font-bold hover:bg-hospital-700 shadow-lg shadow-hospital-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.99]"
            >
                Secure Login <ArrowRight className="w-4 h-4" />
            </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400 font-medium mb-1">Restricted Access • Authorized Personnel Only</p>
            <p className="text-[10px] text-gray-300">Default IDs: Himasoffice, DoctorHimas, Team1984</p>
        </div>
      </div>
      
      <div className="mt-8 text-center text-xs text-slate-400 font-medium">
        <p>&copy; {new Date().getFullYear()} Himas Hospital Systems.</p>
      </div>
    </div>
  );
};