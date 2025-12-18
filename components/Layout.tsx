import React from 'react';
import { useHospital } from '../context/HospitalContext';
import { LogOut, Activity, User, Briefcase, FileText, Menu, X, Cloud, Check, Loader2, AlertCircle, Info } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUserRole, setCurrentUserRole, saveStatus, refreshData, isLoading, lastErrorMessage } = useHospital();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [showErrorDetail, setShowErrorDetail] = React.useState(false);

  const handleLogout = () => {
    localStorage.removeItem("himas_hospital_role_v1");
    setCurrentUserRole(null);
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
    if (saveStatus === 'saving') return <span className="flex items-center gap-1 text-blue-400 text-xs animate-pulse"><Loader2 className="w-3 h-3 animate-spin"/> Syncing...</span>;
    if (saveStatus === 'saved') return <span className="flex items-center gap-1 text-green-400 text-xs"><Check className="w-3 h-3"/> Saved</span>;
    if (saveStatus === 'error') return (
      <div className="flex flex-col gap-1">
        <span onClick={() => refreshData()} className="flex items-center gap-1 text-red-400 text-xs cursor-pointer hover:underline font-bold">
          <AlertCircle className="w-3 h-3"/> Failed (Retry)
        </span>
        {lastErrorMessage && (
          <button 
            onClick={() => setShowErrorDetail(!showErrorDetail)}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white"
          >
            <Info className="w-2 h-2" /> {showErrorDetail ? 'Hide' : 'View'} Error
          </button>
        )}
      </div>
    );
    return <span className="flex items-center gap-1 text-gray-500 text-xs"><Cloud className="w-3 h-3"/> Connected</span>;
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 space-y-4">
        <Loader2 className="w-12 h-12 text-hospital-600 animate-spin" />
        <div className="text-hospital-800 font-bold text-lg animate-pulse">Syncing Database...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center shadow-sm z-20">
        <div className="font-bold text-hospital-600">HiMAS</div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
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
             <h1 className="text-2xl font-bold tracking-tighter text-white">HiMAS</h1>
             <div className="text-[0.6rem] text-slate-400 uppercase tracking-widest font-semibold">Hospital Management</div>
          </div>

          <div className="mb-8">
            <div className="text-xs uppercase text-slate-400 font-semibold tracking-wider mb-2">Session</div>
            <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
              <div className="text-hospital-400">{getRoleIcon()}</div>
              <div>
                <div className="font-medium text-slate-200 text-sm">{getRoleLabel()}</div>
                <div className="mt-1"><CloudStatus /></div>
              </div>
            </div>
            
            {showErrorDetail && lastErrorMessage && (
              <div className="mt-2 p-3 bg-red-900/50 border border-red-700 rounded-lg text-[10px] font-mono text-red-200 break-words max-h-32 overflow-y-auto">
                <div className="font-bold mb-1 border-b border-red-700 pb-1">Detail:</div>
                {lastErrorMessage}
              </div>
            )}
          </div>

          <nav className="space-y-2 flex-1">
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 text-white rounded-lg transition-colors">
              <FileText className="w-5 h-5" /> Dashboard
            </button>
          </nav>

          <div className="pt-6 border-t border-slate-800">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <LogOut className="w-5 h-5" /> Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto h-screen relative">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-0 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
};