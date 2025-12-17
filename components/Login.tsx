import React, { useState } from 'react';
import { useHospital } from '../context/HospitalContext';
import { User, ShieldCheck, Mail, ArrowRight, Activity, Briefcase, CheckCircle2, Lock, UserPlus, Phone, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import { Role } from '../types';

export const Login: React.FC = () => {
  const { setCurrentUserRole, staffUsers, registerStaff, isStaffLoaded } = useHospital();
  
  // View State
  const [view, setView] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login Form State
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  
  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regRole, setRegRole] = useState<Role>('PACKAGE_TEAM');
  const [regOtp, setRegOtp] = useState('');
  const [showRegOtpInput, setShowRegOtpInput] = useState(false);

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // --- ACTIONS ---

  const handleSendLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isStaffLoaded) {
      setError('System initializing... Please wait.');
      return;
    }

    if (!selectedRole) {
      setError('Please select your department role.');
      return;
    }
    if (!loginEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    
    // Auth Check
    const isFirstRun = staffUsers.length === 0;
    const isValidUser = staffUsers.find(u => u.email.toLowerCase() === loginEmail.toLowerCase() && u.role === selectedRole);

    if (!isFirstRun && !isValidUser) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setError('Access Denied: Email not registered for this role.');
      setIsLoading(false);
      return;
    }

    // Simulate Network Request
    await new Promise(resolve => setTimeout(resolve, 800));
    alert(`Your Login OTP is: 1234`);
    setShowOtpInput(true);
    setIsLoading(false);
  };

  const handleVerifyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate Verification
    await new Promise(resolve => setTimeout(resolve, 600));

    if (otp === '1234') { 
      if (selectedRole) {
        localStorage.setItem("role", selectedRole);
        localStorage.setItem("username", loginEmail);
        setCurrentUserRole(selectedRole);
      }
    } else {
      setError('Invalid OTP. Please try again.');
      setIsLoading(false);
    }
  };

  const handleInitiateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!regName || !regEmail || !regMobile || !regRole) {
      setError('All fields are required.');
      return;
    }

    if (!regEmail.includes('@')) {
        setError('Please enter a valid email address.');
        return;
    }

    // Duplicate Check
    if (staffUsers.some(u => u.email.toLowerCase() === regEmail.toLowerCase())) {
      setError('This email is already registered.');
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate sending OTP
    alert(`Your Registration Verification Code is: 5678`);
    
    setShowRegOtpInput(true);
    setIsLoading(false);
  };

  const handleVerifyRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (regOtp !== '5678') {
        setError('Invalid Verification Code.');
        return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    registerStaff({
      name: regName,
      email: regEmail,
      mobile: regMobile,
      role: regRole
    });

    setSuccessMsg('Registration Successful! Please login.');
    setIsLoading(false);
    
    // Reset and Switch to Login
    setTimeout(() => {
      setLoginEmail(regEmail);
      setSelectedRole(regRole);
      setView('LOGIN');
      setSuccessMsg('');
      setRegName('');
      setRegEmail('');
      setRegMobile('');
      setRegOtp('');
      setShowRegOtpInput(false);
    }, 1500);
  };

  // --- COMPONENTS ---

  const RoleCard = ({ role, icon: Icon, label, desc }: { role: Role, icon: any, label: string, desc: string }) => (
    <div 
      onClick={() => { setSelectedRole(role); setError(''); }}
      className={`
        cursor-pointer p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center text-center gap-1
        ${selectedRole === role 
          ? 'border-hospital-500 bg-hospital-50 shadow-md transform scale-105' 
          : 'border-gray-100 bg-white hover:border-hospital-200 hover:shadow-sm'}
      `}
    >
      <div className={`p-2 rounded-full ${selectedRole === role ? 'bg-hospital-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className={`font-bold text-sm ${selectedRole === role ? 'text-hospital-700' : 'text-gray-700'}`}>{label}</div>
        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{desc}</div>
      </div>
      {selectedRole === role && <div className="absolute top-2 right-2 text-hospital-500"><CheckCircle2 className="w-4 h-4" /></div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
           <div className="h-20 w-20 bg-white rounded-full shadow-lg flex items-center justify-center">
              <Activity className="w-10 h-10 text-hospital-600" />
           </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Himas Hospital</h1>
        <p className="text-slate-500 text-sm font-medium">Secure Management Portal</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 w-full max-w-lg transition-all relative overflow-hidden">
        {isLoading && (
            <div className="absolute inset-0 bg-white/80 z-10 flex flex-col items-center justify-center backdrop-blur-sm">
                <Loader2 className="w-10 h-10 text-hospital-600 animate-spin" />
                <p className="text-sm font-semibold text-hospital-800 mt-2">Processing...</p>
            </div>
        )}

        {view === 'LOGIN' ? (
          /* --- LOGIN VIEW --- */
          <>
            {!showOtpInput ? (
              <form onSubmit={handleSendLoginOtp} className="space-y-6 animate-in fade-in slide-in-from-left-4">
                <div className="text-center">
                  <h2 className="text-lg font-bold text-gray-800">Staff Login</h2>
                  <p className="text-xs text-gray-400">Select your role to access the dashboard</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <RoleCard role="FRONT_OFFICE" icon={User} label="Front Office" desc="Patient Reg" />
                  <RoleCard role="DOCTOR" icon={Activity} label="Doctor" desc="Assessment" />
                  <RoleCard role="PACKAGE_TEAM" icon={Briefcase} label="Counseling" desc="Packages & Admin" />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-hospital-500 transition-colors w-5 h-5" />
                    <input 
                      type="email" 
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-hospital-50 focus:border-hospital-500 outline-none transition-all"
                      placeholder="user@himashospital.com"
                      autoFocus
                    />
                  </div>
                  {staffUsers.length === 0 && (
                    <p className="text-xs text-green-600 pl-1 flex items-center gap-1 font-semibold animate-pulse">
                      First login? Register a Package Team user first.
                    </p>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isLoading || !selectedRole || !loginEmail}
                  className="w-full bg-hospital-600 text-white py-3.5 rounded-xl font-bold hover:bg-hospital-700 shadow-lg shadow-hospital-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                >
                  Get Login OTP <ArrowRight className="w-4 h-4" />
                </button>

                <div className="pt-4 border-t border-gray-100 text-center">
                   <button 
                     type="button"
                     onClick={() => { setView('REGISTER'); setError(''); setShowRegOtpInput(false); }}
                     className="text-sm text-hospital-600 font-semibold hover:text-hospital-800 flex items-center justify-center gap-1 mx-auto"
                   >
                     <UserPlus className="w-4 h-4" /> Package Team Registration
                   </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyLogin} className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="text-center">
                  <h2 className="text-lg font-bold text-gray-800">Verify Identity</h2>
                  <p className="text-sm text-gray-500 mt-1">Enter code sent to {loginEmail}</p>
                </div>

                <div className="flex justify-center my-4">
                  <input 
                    type="text" 
                    value={otp}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 4) setOtp(val);
                    }}
                    className="w-40 text-center text-3xl font-bold tracking-[0.5em] py-3 border-b-4 border-hospital-200 focus:border-hospital-600 outline-none transition-all text-gray-800 placeholder-gray-200"
                    placeholder="0000"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium">
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isLoading || otp.length < 4}
                  className="w-full bg-hospital-600 text-white py-3.5 rounded-xl font-bold hover:bg-hospital-700 shadow-lg shadow-hospital-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Verify & Access
                </button>

                <button 
                  type="button" 
                  onClick={() => { setShowOtpInput(false); setOtp(''); setError(''); }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
                >
                  Back to Login
                </button>
              </form>
            )}
          </>
        ) : (
          /* --- REGISTER VIEW --- */
          <form onSubmit={showRegOtpInput ? handleVerifyRegister : handleInitiateRegister} className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={() => setView('LOGIN')} className="p-1 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Package Team Registration</h2>
                    <p className="text-xs text-gray-400">Create new staff access</p>
                </div>
            </div>

            <div className="space-y-3">
                <div className={showRegOtpInput ? 'opacity-50 pointer-events-none' : ''}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name (Username)</label>
                    <div className="relative">
                        <User className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                        <input 
                            required type="text" 
                            className="w-full pl-9 p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-hospital-500 outline-none"
                            placeholder="Dr. John Doe"
                            value={regName}
                            onChange={e => setRegName(e.target.value)}
                            disabled={showRegOtpInput}
                        />
                    </div>
                </div>

                <div className={showRegOtpInput ? 'opacity-50 pointer-events-none' : ''}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                        <input 
                            required type="email" 
                            className="w-full pl-9 p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-hospital-500 outline-none"
                            placeholder="john@hospital.com"
                            value={regEmail}
                            onChange={e => setRegEmail(e.target.value)}
                            disabled={showRegOtpInput}
                        />
                    </div>
                </div>

                <div className={showRegOtpInput ? 'opacity-50 pointer-events-none' : ''}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Mobile Number</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                        <input 
                            required type="tel" 
                            className="w-full pl-9 p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-hospital-500 outline-none"
                            placeholder="9876543210"
                            value={regMobile}
                            onChange={e => setRegMobile(e.target.value)}
                            disabled={showRegOtpInput}
                        />
                    </div>
                </div>

                <div className={showRegOtpInput ? 'opacity-50 pointer-events-none' : ''}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned Role</label>
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-3">
                        <div className="bg-purple-500 p-1.5 rounded-full text-white">
                            <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-purple-900">Package Team</div>
                            <div className="text-[10px] text-purple-700">Administrative Access</div>
                        </div>
                        <Lock className="w-4 h-4 text-purple-400 ml-auto" />
                    </div>
                </div>

                {/* OTP INPUT SECTION */}
                {showRegOtpInput && (
                    <div className="animate-in fade-in slide-in-from-top-2 pt-2 border-t border-gray-100">
                        <label className="block text-sm font-bold text-hospital-700 mb-2">Enter Email Verification Code</label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-2.5 text-hospital-500 w-4 h-4" />
                            <input 
                                required type="text" 
                                className="w-full pl-9 p-2.5 border-2 border-hospital-300 rounded-lg text-sm focus:border-hospital-600 focus:outline-none bg-hospital-50 font-bold tracking-widest text-center"
                                placeholder="0000"
                                value={regOtp}
                                onChange={e => {
                                   const val = e.target.value.replace(/\D/g, '');
                                   if(val.length <= 4) setRegOtp(val);
                                }}
                                autoFocus
                            />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 text-center">Code sent to {regEmail}</p>
                    </div>
                )}
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> {error}
                </div>
            )}

            {successMsg && (
                <div className="p-3 bg-green-50 text-green-700 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {successMsg}
                </div>
            )}

            <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-4 
                   ${showRegOtpInput ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-hospital-600 hover:bg-hospital-700 shadow-hospital-200'}
                `}
            >
                {isLoading ? 'Processing...' : (showRegOtpInput ? 'Verify & Register' : 'Send Verification Code')}
            </button>
            
            {showRegOtpInput && (
                <button 
                    type="button" 
                    onClick={() => { setShowRegOtpInput(false); setRegOtp(''); setError(''); }}
                    className="w-full text-xs text-gray-500 hover:text-gray-800 underline"
                >
                    Change Details
                </button>
            )}
          </form>
        )}
      </div>
      
      <div className="mt-8 text-center text-xs text-gray-400">
        <p>&copy; {new Date().getFullYear()} Himas Hospital Systems.</p>
        <p className="mt-1">Authorized Access Only. IP Logged.</p>
      </div>
    </div>
  );
};