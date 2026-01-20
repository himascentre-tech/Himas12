
import React, { useEffect, useState } from 'react';
import { useHospital } from '../context/HospitalContext';
import { LogOut, Activity, User, Briefcase, FileText, Menu, X, Cloud, Check, Loader2, AlertCircle, RefreshCw, BookmarkPlus, Database } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUserRole, setCurrentUserRole, saveStatus, refreshData, isLoading, forceStopLoading, activeSubTab, setActiveSubTab, lastErrorMessage, clearError } = useHospital();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    let timer: number;
    if (isLoading) {
      timer = window.setTimeout(() => setShowTroubleshoot(true), 6000);
    } else {
      setShowTroubleshoot(false);
      setIsRetrying(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUserRole(null);
    } catch (error) {
      setCurrentUserRole(null);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    clearError();
    try {
      await refreshData();
    } finally {
      setIsRetrying(false);
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
        <div className="relative mb-10">
          <div className="w-24 h-24 border-4 border-slate-100 border-t-hospital-600 rounded-full animate-spin"></div>
          <Activity className="absolute inset-0 m-auto w-10 h-10 text-hospital-600 animate-pulse" />
        </div>
        
        <div className="text-center space-y-3 mb-10">
          <h2 className="text-slate-800 font-bold text-2xl tracking-tight">
            {lastErrorMessage ? "Sync Interrupted" : (showTroubleshoot ? "Waking Secure Database..." : "Synchronizing Hospital Data")}
          </h2>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            {lastErrorMessage 
              ? "A communication error occurred while fetching records." 
              : "Connecting to secure clinical database... This may take up to 30 seconds if the system has been inactive."}
          </p>
        </div>
        
        {lastErrorMessage && (
          <div className="mb-8 p-5 bg-red-50 border border-red-100 rounded-2xl max-w-md w-full shadow-sm animate-in fade-in zoom-in-95">
            <div className="flex gap-4">
              <div className="bg-red-500 p-1.5 rounded-lg h-fit mt-0.5">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
              <div className="space-y-1">
                <div className="text-[10px] font-black text-red-400 uppercase tracking-widest">Network Error Trace</div>
                <div className="text-xs font-bold text-red-700 leading-relaxed break-all">{lastErrorMessage}</div>
              </div>
            </div>
          </div>
        )}

        {(showTroubleshoot || lastErrorMessage) && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center gap-5 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-xl max-w-md w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-400" />
            
            <div className="flex items-center gap-3 text-amber-700 font-black text-xs uppercase tracking-widest">
              <Database className="w-4 h-4" /> 
              {lastErrorMessage ? "Connection Refused" : "Cold Start Detected"}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full">
               <button 
                 onClick={handleRetry} 
                 disabled={isRetrying}
                 className="flex-1 bg-white text-slate-700 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-100 flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
               >
                 {isRetrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                 Retry Sync
               </button>
               <button 
                 onClick={forceStopLoading} 
                 className="flex-1 bg-hospital-600 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-hospital-700 shadow-lg shadow-hospital-100 transition-all"
               >
                 Enter Offline
               </button>
            </div>
            
            <div className="p-3 bg-white/50 rounded-xl border border-white text-[10px] text-slate-500 text-center leading-relaxed">
              <span className="font-bold block mb-1">PRO TIP</span>
              Free database instances enter "Hibernation" during inactivity. Manual retry triggers an immediate wake signal.
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center shadow-sm z-20 no-print">
        <div className="font-bold text-hospital-600 tracking-tighter text-xl">HiMAS</div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      <aside className={`
        fixed inset-y-0 left-0 z-10 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out no-print
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
            <button 
              onClick={() => { setActiveSubTab('DASHBOARD'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeSubTab === 'DASHBOARD' ? 'bg-hospital-600 text-white shadow-lg shadow-hospital-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            >
              <FileText className="w-5 h-5" /> Dashboard
            </button>
            
            {currentUserRole === 'FRONT_OFFICE' && (
              <button 
                onClick={() => { setActiveSubTab('BOOKING'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeSubTab === 'BOOKING' ? 'bg-hospital-600 text-white shadow-lg shadow-hospital-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
              >
                <BookmarkPlus className="w-5 h-5" /> Scheduled Booking
              </button>
            )}
          </nav>

          <div className="pt-6 border-t border-slate-800">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-red-500/10 hover:text-red-400 rounded-xl font-bold transition-all">
              <LogOut className="w-5 h-5" /> Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto h-screen relative bg-[#f8fafc]">
        <div className="p-4 md:p-10 max-w-[1600px]">
          {children}
        </div>
      </main>
      
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-0 md:hidden no-print" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
};
