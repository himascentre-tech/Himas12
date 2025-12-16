import React, { useState } from 'react';
import { useHospital } from '../context/HospitalContext';
import { User, Lock, Key } from 'lucide-react';
import { Role } from '../types';

export const Login: React.FC = () => {
  const { setCurrentUserRole } = useHospital();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);

    // Simulate network delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));

    let role: Role = null;

    // CREDENTIALS CHECK (Exact Match Required)
    if (userId.trim() === "Himasoffice" && password.trim() === "Himas1984@") {
      role = "FRONT_OFFICE";
    } 
    else if (userId.trim() === "DoctorHimas" && password.trim() === "Doctor8419@") {
      role = "DOCTOR";
    } 
    else if (userId.trim() === "Team1984" && password.trim() === "Team8131@") {
      role = "PACKAGE_TEAM";
    }
    
    if (role) {
      console.log(`Login Successful: ${role}`);
      // 1. Persist Session
      localStorage.setItem("role", role);
      localStorage.setItem("username", userId);
      // 2. Update Context (Triggers Cloud Fetch)
      setCurrentUserRole(role);
    } else {
      setError('Invalid User ID or Password. Please try again.');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-6">
          <img 
            src="https://placehold.co/600x200/f8fafc/0284c7?text=HiMAS+Hospital&font=montserrat" 
            alt="Himas Hospital Logo"
            className="h-28 w-auto object-contain"
          />
        </div>
        <p className="text-slate-600 font-bold tracking-wide text-lg">21st Century Surgical Hospital</p>
        <p className="text-slate-400 text-sm mt-1">Secure Management Portal</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 w-full max-w-md">
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Staff Login</h2>
            <p className="text-sm text-gray-400">Please enter your authorized credentials</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                value={userId}
                onChange={e => setUserId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-hospital-500 focus:border-hospital-500 outline-none transition-all"
                placeholder="Enter User ID"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-hospital-500 focus:border-hospital-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium border border-red-100 flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoggingIn}
            className="w-full bg-hospital-600 text-white py-3 rounded-xl font-bold hover:bg-hospital-700 shadow-lg shadow-hospital-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? 'Verifying...' : (
              <>
                <Key className="w-4 h-4" />
                Secure Login
              </>
            )}
          </button>
        </form>
      </div>
      
      <div className="mt-8 text-center text-sm text-gray-400">
        <p>&copy; {new Date().getFullYear()} Himas Hospital Systems. Authorized Personnel Only.</p>
      </div>
    </div>
  );
};