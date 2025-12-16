import React, { useState } from 'react';
import { useHospital } from '../context/HospitalContext';
import { User, Activity, Briefcase, Lock, Key } from 'lucide-react';
import { Role } from '../types';

export const Login: React.FC = () => {
  const { setCurrentUserRole } = useHospital();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Credentials Logic
    // Front Office: Himasoffice / Himas1984@
    // Doctor: DoctorHimas / Doctor8419@
    // Package Team: Team1984 / Team8131@

    if (userId === 'Himasoffice' && password === 'Himas1984@') {
      setCurrentUserRole('FRONT_OFFICE');
      return;
    }

    if (userId === 'DoctorHimas' && password === 'Doctor8419@') {
      setCurrentUserRole('DOCTOR');
      return;
    }

    if (userId === 'Team1984' && password === 'Team8131@') {
      setCurrentUserRole('PACKAGE_TEAM');
      return;
    }
    
    setError('Invalid User ID or Password');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-hospital-600 rounded-2xl shadow-lg">
            <Activity className="w-12 h-12 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-extrabold text-slate-800 mb-2">Himas Hospital</h1>
        <p className="text-slate-500">Secure Management Portal</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 w-full max-w-md">
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Staff Login</h2>
            <p className="text-sm text-gray-400">Please enter your credentials</p>
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
                placeholder="Enter your User ID"
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
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium border border-red-100">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="w-full bg-hospital-600 text-white py-3 rounded-xl font-bold hover:bg-hospital-700 shadow-lg shadow-hospital-200 transition-all flex items-center justify-center gap-2"
          >
            <Key className="w-4 h-4" />
            Secure Login
          </button>
        </form>
      </div>
      
      <div className="mt-8 text-center text-sm text-gray-400">
        <p>&copy; {new Date().getFullYear()} Himas Hospital Systems. Authorized Personnel Only.</p>
      </div>
    </div>
  );
};