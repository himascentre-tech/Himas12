import React, { useEffect, useState } from 'react';
import { useHospital } from '../context/HospitalContext';
import { LogOut, Activity, User, Briefcase, FileText, Menu, X, Cloud, Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUserRole, setCurrentUserRole, saveStatus, refreshData, isLoading, forceStopLoading } = useHospital();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowTroubleshoot(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowTroubleshoot(false);
    }
  }, [isLoading]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUserRole(null);
    } catch (error) {
      setCurrentUserRole(null);
    }
  };

  const getRoleLabel = () => {
    switch (currentUserRole) {
      case 'FRONT_OFFICE': return 'Front Office';
      case 'DOCTOR': return 'Doctor Panel';
      case 'PACKAGE_TEAM': return 'Counseling Packages';
      default: return '';
    }
  };

  const getRoleIcon = () => {
    switch (currentUserRole) {
      case 'FRONT_OFFICE': return <User className="w-6 h-6" />;
      case 'DOCTOR': return <Activity className="w-6 h-6" />;
      case 'PACKAGE_TEAM': return <Briefcase className="w-6 h-6" />;
      default: return <FileText className="w-6 h-6" />;
    }
  };

  const CloudStatus = () => {
    if (saveStatus === 'saving') return <span className="flex items-center gap-1 text-blue-400 text-[10px] animate-pulse"><Loader2 className="w-2.5 h-2.5 animate-spin"/> Syncing...</span>;
    if (saveStatus === 'saved') return <span className="flex items-center gap-1 text-green-400 text-[10px]"><Check className="w-2.5 h-2.5"/> Cloud Saved</span>;
    if (saveStatus === 'error') return (
      <span onClick={() => refreshData()} className="flex items-center gap-1 text-red-400 text-[10px] cursor-pointer hover:underline font-bold">
        <AlertCircle className="w-2.5 h-2.5"/> Sync Error
      </span>
    );
    return <span className="flex items-center gap-1 text-gray-500 text-[10px]"><Cloud className="w-2.5 h-2.5"/> Connected</span>;
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white p-6">
        <div className="relative mb-8">
          <div className="w-24 h-24 border-4 border-slate-100 border-t-hospital-600 rounded-full animate-spin"></div>
          <Activity className="absolute inset-0 m-auto w-10 h-10 text-hospital-600 animate-pulse" />
        </div>
        <div className="text-slate-800 font-bold text-2xl tracking-tight mb-2">Synchronizing Hospital Data</div>
        <p className="text-slate-400 text-sm max-w-xs text-center mb-8">Connecting to secure clinical database...</p>
        
        {showTroubleshoot && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm max-w-md w-full">
            <div className="text-amber-600 font-bold text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Connection slow
            </div>
            <div className="flex flex-wrap gap-2 justify-center w-full">
               <button onClick={() => window.location.reload()} className="flex-1 bg-white text-slate-700 px-4 py-3 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-100 flex items-center justify-center gap-2 transition-all">
                 <RefreshCw className="w-3 h-3" /> Refresh
               </button>
               <button onClick={forceStopLoading} className="flex-1 bg-hospital-600 text-white px-4 py-3 rounded-xl text-xs font-bold hover:bg-hospital-700 shadow-lg shadow-hospital-100 transition-all">
                 Enter Anyway
               </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center shadow-sm z-20">
        <div className="font-bold text-hospital-600 tracking-tighter text-xl">HiMAS</div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      <aside className={`
        fixed inset-y-0 left-0 z-10 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 h-full flex flex-col">
          <div className="mb-8 px-2">
             <h1 className="text-3xl font-bold tracking-tighter text-white">HiMAS</h1>
             <div className="text-[0.6rem] text-slate-500 uppercase tracking-widest font-bold mt-1">Hospital Management</div>
          </div>

          <div className="mb-8">
            <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-3">Active Session</div>
            <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
              <div className="text-hospital-400 bg-slate-900 p-2 rounded-xl">{getRoleIcon()}</div>
              <div>
                <div className="font-bold text-slate-200 text-xs">{getRoleLabel()}</div>
                <div className="mt-1 flex flex-col">
                  <CloudStatus />
                </div>
              </div>
            </div>
          </div>

          <nav className="space-y-2 flex-1">
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-hospital-600 text-white rounded-xl font-bold shadow-lg shadow-hospital-900/50 transition-all">
              <FileText className="w-5 h-5" /> Dashboard
            </button>
          </nav>

          <div className="pt-6 border-t border-slate-800">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-red-500/10 hover:text-red-400 rounded-xl font-bold transition-all">
              <LogOut className="w-5 h-5" /> Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto h-screen relative bg-[#f8fafc]">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-0 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
};