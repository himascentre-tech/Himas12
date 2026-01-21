
import React, { useEffect, useState } from 'react';
import { useHospital } from '../context/HospitalContext';
import { LogOut, Activity, User, Briefcase, FileText, Menu, X, Cloud, Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    currentUserRole, 
    setCurrentUserRole, 
    saveStatus, 
    refreshData, 
    isLoading, 
    isInitialLoading,
    forceStopLoading, 
    activeSubTab, 
    setActiveSubTab, 
    lastErrorMessage, 
    clearError 
  } = useHospital();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    let timer: number;
    if (isInitialLoading) {
      timer = window.setTimeout(() => setShowTroubleshoot(true), 12000);
    } else {
      setShowTroubleshoot(false);
      setIsRetrying(false);
    }
    return () => clearTimeout(timer);
  }, [isInitialLoading]);

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
      await refreshData(true);
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
      case 'FRONT_OFFICE': return <User className="w-5 h-5" />;
      case 'DOCTOR': return <Activity className="w-5 h-5" />;
      case 'PACKAGE_TEAM': return <Briefcase className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const CloudStatus = () => {
    if (saveStatus === 'saving') return <span className="flex items-center gap-1 text-blue-400 text-[10px] animate-pulse"><Loader2 className="w-2.5 h-2.5 animate-spin"/> Syncing...</span>;
    if (saveStatus === 'saved') return <span className="flex items-center gap-1 text-emerald-400 text-[10px]"><Check className="w-2.5 h-2.5"/> Cloud Secure</span>;
    if (saveStatus === 'error') return (
      <span onClick={() => refreshData()} className="flex items-center gap-1 text-red-400 text-[10px] cursor-pointer hover:underline font-bold">
        <AlertCircle className="w-2.5 h-2.5"/> Sync Interrupted
      </span>
    );
    return <span className="flex items-center gap-1 text-slate-500 text-[10px]"><Cloud className="w-2.5 h-2.5"/> Linked</span>;
  };

  // Only block the entire screen if we have no data at all yet
  if (isInitialLoading && currentUserRole) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white p-6 z-[9999]">
        <div className="relative mb-10">
          <div className="w-20 h-20 border-4 border-slate-100 border-t-hospital-600 rounded-full animate-spin"></div>
          <Activity className="absolute inset-0 m-auto w-8 h-8 text-hospital-600 animate-pulse" />
        </div>
        
        <div className="text-center space-y-3 mb-10">
          <h2 className="text-slate-800 font-bold text-2xl tracking-tight">
            {lastErrorMessage ? "Connection Issue" : "Initializing Workstation..."}
          </h2>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            {lastErrorMessage 
              ? "Re-establishing connection with the clinical database." 
              : "Synchronizing local facility records with the secure HiMAS network."}
          </p>
        </div>

        {showTroubleshoot && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-xl max-w-sm w-full">
            <div className="flex flex-col gap-2 w-full">
               <button onClick={handleRetry} disabled={isRetrying} className="flex-1 bg-white text-slate-700 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-100 flex items-center justify-center gap-2 transition-all">
                 {isRetrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Force Retry
               </button>
               <button onClick={forceStopLoading} className="flex-1 bg-hospital-600 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-hospital-700 transition-all">
                 Continue Offline
               </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row relative">
      {/* Mobile Top Nav */}
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center shadow-sm z-[100] no-print">
        <div className="font-bold text-hospital-600 tracking-tighter text-xl">HiMAS</div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[110] w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out no-print
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 h-full flex flex-col">
          <div className="mb-10">
             <h1 className="text-2xl font-black tracking-tighter text-white">HiMAS</h1>
             <div className="text-[8px] text-slate-500 uppercase tracking-widest font-black mt-1">Medical Enterprise v2.2</div>
          </div>

          <div className="mb-10">
            <div className="text-[9px] uppercase text-slate-500 font-black tracking-widest mb-3">System Access</div>
            <div className="flex items-center gap-3 p-4 bg-slate-800/40 rounded-2xl border border-white/5 shadow-inner">
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-white/5 text-hospital-400">
                {getRoleIcon()}
              </div>
              <div>
                <div className="font-bold text-slate-100 text-xs tracking-tight">{getRoleLabel()}</div>
                <div className="mt-1">
                  <CloudStatus />
                </div>
              </div>
            </div>
          </div>

          <nav className="space-y-2 flex-1">
            <button 
              onClick={() => { setActiveSubTab('DASHBOARD'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs transition-all ${activeSubTab === 'DASHBOARD' ? 'bg-hospital-600 text-white shadow-lg shadow-hospital-900/50' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <FileText className="w-5 h-5" /> Workspace
            </button>
          </nav>

          <div className="pt-6 border-t border-white/5">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/5 rounded-2xl font-bold text-xs transition-all">
              <LogOut className="w-5 h-5" /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 h-screen overflow-hidden flex flex-col relative bg-[#f8fafc] z-10">
        <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-[1500px] mx-auto h-full">
            {children}
          </div>
        </div>
        
        {/* Subtle Bottom Bar Loading */}
        {isLoading && !isInitialLoading && (
          <div className="absolute top-0 left-0 w-full h-0.5 bg-slate-100 overflow-hidden z-[120]">
            <div className="h-full bg-hospital-500 animate-[loading_1s_infinite_ease-in-out]" style={{width: '30%', transform: 'translateX(-100%)'}}></div>
            <style>{`@keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
          </div>
        )}
      </main>
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[105] md:hidden no-print" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
};
