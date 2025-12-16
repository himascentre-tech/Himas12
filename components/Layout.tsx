import React from 'react';
import { useHospital } from '../context/HospitalContext';
import { LogOut, Activity, User, Briefcase, FileText, Menu, X, Cloud, Check, Loader2, AlertCircle } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUserRole, setCurrentUserRole, saveStatus, lastSavedAt } = useHospital();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const handleLogout = () => {
    // Clear Session
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    // We do NOT clear STORAGE_KEY_PATIENTS here so the data remains cached for next login,
    // but context will reset role to null, showing login screen.
    setCurrentUserRole(null);
  };

  const getRoleLabel = () => {
    switch (currentUserRole) {
      case 'FRONT_OFFICE': return 'Front Office';
      case 'DOCTOR': return 'Doctor Panel';
      case 'PACKAGE_TEAM': return 'Package Team';
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

  // Status Indicator Component
  const CloudStatus = () => {
    if (saveStatus === 'saving') {
      return (
        <div className="flex items-center gap-2 text-xs text-blue-400 animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Syncing...</span>
        </div>
      );
    }
    if (saveStatus === 'saved') {
      return (
        <div className="flex items-center gap-2 text-xs text-green-400" title={`Last saved: ${lastSavedAt?.toLocaleTimeString()}`}>
          <Check className="w-3 h-3" />
          <span>Cloud Synced</span>
        </div>
      );
    }
    if (saveStatus === 'error') {
      return (
        <div className="flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-3 h-3" />
          <span>Sync Failed</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Cloud className="w-3 h-3" />
        <span>Offline Mode</span>
      </div>
    );
  };

  const LOGO_URL_DARK = "https://placehold.co/400x120/0f172a/ffffff?text=HiMAS"; 
  const LOGO_URL_LIGHT = "https://placehold.co/400x120/ffffff/0284c7?text=HiMAS"; 

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center shadow-sm z-20">
        <div className="flex items-center gap-2">
           <img src={LOGO_URL_LIGHT} alt="Himas Hospital" className="h-8 w-auto"/>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-10 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6">
          <div className="mb-8 px-2">
            <img src={LOGO_URL_DARK} alt="Himas Hospital" className="h-12 w-auto"/>
            <div className="text-[0.6rem] text-slate-400 mt-1 uppercase tracking-widest font-semibold">
              21st Century Surgical Hospital
            </div>
          </div>

          <div className="mb-8">
            <div className="text-xs uppercase text-slate-400 font-semibold tracking-wider mb-2">Current Session</div>
            <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
              <div className="text-hospital-400">{getRoleIcon()}</div>
              <div>
                <div className="font-medium text-slate-200">{getRoleLabel()}</div>
                <div className="mt-1">
                  <CloudStatus />
                </div>
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 text-white rounded-lg transition-colors">
              <FileText className="w-5 h-5" />
              Dashboard
            </button>
          </nav>
        </div>

        <div className="absolute bottom-0 w-full p-6 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto h-screen">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-0 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};