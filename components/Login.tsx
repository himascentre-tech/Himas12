import React, { useState, useEffect } from 'react';
import { useHospital } from '../context/HospitalContext';
import { sendSMSOTP } from '../services/smsService';
import { User, ShieldCheck, Mail, ArrowRight, Activity, Briefcase, CheckCircle2, Lock, UserPlus, Phone, ArrowLeft, Loader2, KeyRound, Eye, EyeOff, Smartphone, RefreshCw, Timer } from 'lucide-react';
import { Role } from '../types';

export const Login: React.FC = () => {
  const { setCurrentUserRole, staffUsers, registerStaff, isStaffLoaded } = useHospital();
  
  // View State
  const [view, setView] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [generatedLoginOtp, setGeneratedLoginOtp] = useState<string | null>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [identifiedRole, setIdentifiedRole] = useState<Role | null>(null);
  const [targetMobile, setTargetMobile] = useState('');
  
  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regRole, setRegRole] = useState<Role>('PACKAGE_TEAM');
  const [regPassword, setRegPassword] = useState('');
  const [regOtpInput, setRegOtpInput] = useState('');
  const [generatedRegOtp, setGeneratedRegOtp] = useState<string | null>(null);
  const [showRegOtpInput, setShowRegOtpInput] = useState(false);

  // Common UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // --- TIMERS ---
  useEffect(() => {
    if (resendTimer > 0) {
      const timerId = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [resendTimer]);

  // --- ACTIONS ---

  const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

  const handleLoginCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isStaffLoaded) {
      setError('System initializing... Please wait.');
      return;
    }

    if (!loginEmail || !loginPassword) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    
    // Auth Check
    const user = staffUsers.find(u => u.email.toLowerCase() === loginEmail.toLowerCase());

    if (!user) {
      await new Promise(resolve => setTimeout(resolve, 800)); // Fake delay
      setError('Invalid credentials.');
      setIsLoading(false);
      return;
    }

    // Password Check
    if (user.password && user.password !== loginPassword) {
       await new Promise(resolve => setTimeout(resolve, 800));
       setError('Invalid credentials.');
       setIsLoading(false);
       return;
    }

    if (!user.mobile) {
        setError('No mobile number registered. Contact Administrator.');
        setIsLoading(false);
        return;
    }

    // Success - Set Role context for next step
    setIdentifiedRole(user.role);
    setTargetMobile(user.mobile);

    // Generate and Send SMS OTP
    const code = generateOTP();
    setGeneratedLoginOtp(code);
    
    const smsSent = await sendSMSOTP(user.mobile, code);
    
    if (smsSent) {
      setResendTimer(30);
    } else {
      setError("Failed to send SMS. Service unavailable.");
      setIsLoading(false);
      return;
    }

    setShowOtpInput(true);
    setIsLoading(false);
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    const code = generateOTP();
    let mobile = '';
    
    if (view === 'LOGIN') {
        setGeneratedLoginOtp(code);
        mobile = targetMobile;
    } else {
        setGeneratedRegOtp(code);
        mobile = regMobile;
    }

    const success = await sendSMSOTP(mobile, code);
    if (success) {
        setResendTimer(30);
        setError(''); 
    } else {
        setError('Failed to resend code.');
    }
    setIsLoading(false);
  };

  const handleVerifyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate Verification Processing
    await new Promise(resolve => setTimeout(resolve, 600));

    if (otpInput === generatedLoginOtp) { 
      if (identifiedRole) {
        localStorage.setItem("role", identifiedRole);
        localStorage.setItem("username", loginEmail);
        setCurrentUserRole(identifiedRole);
      }
    } else {
      setError('Invalid code. Please try again.');
      setIsLoading(false);
    }
  };

  const handleInitiateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!regName || !regEmail || !regMobile || !regRole || !regPassword) {
      setError('All fields are required.');
      return;
    }

    if (!regEmail.includes('@')) {
        setError('Please enter a valid email address.');
        return;
    }
    
    if (regMobile.length < 10) {
        setError('Please enter a valid mobile number.');
        return;
    }

    // Duplicate Check
    if (staffUsers.some(u => u.email.toLowerCase() === regEmail.toLowerCase())) {
      setError('This email is already registered.');
      return;
    }

    setIsLoading(true);
    
    // Generate and Send SMS OTP
    const code = generateOTP();
    setGeneratedRegOtp(code);
    
    const smsSent = await sendSMSOTP(regMobile, code);
    
    if (smsSent) {
      setResendTimer(30);
    } else {
      setError("Failed to send SMS.");
      setIsLoading(false);
      return;
    }
    
    setShowRegOtpInput(true);
    setIsLoading(false);
  };

  const handleVerifyRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (regOtpInput !== generatedRegOtp) {
        setError('Invalid Verification Code.');
        return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    registerStaff({
      name: regName,
      email: regEmail,
      mobile: regMobile,
      role: regRole,
      password: regPassword
    });

    setSuccessMsg('Registration Successful! Please login.');
    setIsLoading(false);
    
    // Reset and Switch to Login
    setTimeout(() => {
      setLoginEmail(regEmail);
      setLoginPassword(''); 
      setView('LOGIN');
      setSuccessMsg('');
      setRegName('');
      setRegEmail('');
      setRegMobile('');
      setRegPassword('');
      setRegOtpInput('');
      setGeneratedRegOtp(null);
      setShowRegOtpInput(false);
      setShowOtpInput(false);
      setResendTimer(0);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
           <div className="h-20 w-20 bg-white rounded-2xl shadow-lg flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <Activity className="w-10 h-10 text-hospital-600" />
           </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Himas Hospital</h1>
        <p className="text-slate-500 text-sm font-medium tracking-wide">SECURE MANAGEMENT PORTAL</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-2xl shadow-slate-200 border border-white w-full max-w-lg transition-all relative overflow-hidden">
        {isLoading && (
            <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                <Loader2 className="w-10 h-10 text-hospital-600 animate-spin mb-3" />
                <p className="text-sm font-bold text-gray-600 tracking-wide uppercase">Processing Request</p>
            </div>
        )}

        {view === 'LOGIN' ? (
          /* --- LOGIN VIEW --- */
          <>
            {!showOtpInput ? (
              <form onSubmit={handleLoginCredentials} className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-800">Staff Access</h2>
                  <p className="text-sm text-gray-400">Please authenticate to continue</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Username / Email</label>
                    <div className="relative group">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-hospital-600 transition-colors w-5 h-5" />
                        <input 
                        type="email" 
                        value={loginEmail}
                        onChange={e => setLoginEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-hospital-50 focus:border-hospital-500 outline-none transition-all font-medium"
                        placeholder="user@himashospital.com"
                        autoFocus
                        />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Password</label>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-hospital-600 transition-colors w-5 h-5" />
                        <input 
                        type={showPassword ? "text" : "password"} 
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
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
                  <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2 font-medium border border-red-100">
                    <ShieldCheck className="w-4 h-4" /> {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isLoading || !loginEmail || !loginPassword}
                  className="w-full bg-hospital-600 text-white py-3.5 rounded-xl font-bold hover:bg-hospital-700 shadow-lg shadow-hospital-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.99]"
                >
                  Verify Credentials <ArrowRight className="w-4 h-4" />
                </button>

                <div className="pt-6 border-t border-gray-100 text-center">
                   <button 
                     type="button"
                     onClick={() => { setView('REGISTER'); setError(''); setShowRegOtpInput(false); }}
                     className="text-sm text-gray-500 hover:text-hospital-700 font-medium transition-colors flex items-center justify-center gap-1 mx-auto"
                   >
                     New User? <span className="text-hospital-600 font-bold">Register Here</span>
                   </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyLogin} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="text-center">
                  <div className="mx-auto w-14 h-14 bg-green-50 border border-green-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
                     <Smartphone className="w-7 h-7 text-green-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">Security Verification</h2>
                  <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                    We sent a 4-digit code to your mobile ending in <span className="font-bold text-gray-900">******{targetMobile.slice(-4)}</span>
                  </p>
                </div>

                <div className="flex justify-center my-6">
                  <input 
                    type="text" 
                    value={otpInput}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 4) setOtpInput(val);
                    }}
                    className="w-48 text-center text-3xl font-bold tracking-[0.5em] py-3 border-b-4 border-hospital-200 focus:border-hospital-600 outline-none transition-all text-gray-800 placeholder-gray-200 font-mono"
                    placeholder="0000"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <button 
                    type="submit" 
                    disabled={isLoading || otpInput.length < 4}
                    className="w-full bg-hospital-600 text-white py-3.5 rounded-xl font-bold hover:bg-hospital-700 shadow-lg shadow-hospital-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    Confirm & Login
                  </button>

                  <button 
                     type="button" 
                     onClick={handleResendOTP}
                     disabled={resendTimer > 0 || isLoading}
                     className="w-full py-2 text-sm text-gray-500 hover:text-gray-800 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {resendTimer > 0 ? (
                       <><Timer className="w-4 h-4"/> Resend code in {resendTimer}s</>
                     ) : (
                       <><RefreshCw className="w-4 h-4"/> Resend Code</>
                     )}
                   </button>
                </div>

                <div className="pt-2">
                   <button 
                    type="button" 
                    onClick={() => { setShowOtpInput(false); setOtpInput(''); setError(''); setResendTimer(0); }}
                    className="w-full text-xs text-gray-400 hover:text-gray-600 hover:underline"
                  >
                    ← Back to Login
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          /* --- REGISTER VIEW --- */
          <form onSubmit={showRegOtpInput ? handleVerifyRegister : handleInitiateRegister} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                <button type="button" onClick={() => setView('LOGIN')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Staff Registration</h2>
                    <p className="text-xs text-gray-400">Request new account access</p>
                </div>
            </div>

            <div className="space-y-3">
                <div className={showRegOtpInput ? 'opacity-40 pointer-events-none' : ''}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
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

                <div className={showRegOtpInput ? 'opacity-40 pointer-events-none' : ''}>
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

                <div className={showRegOtpInput ? 'opacity-40 pointer-events-none' : ''}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Mobile Number (For OTP)</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                        <input 
                            required type="tel" 
                            className="w-full pl-9 p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-hospital-500 outline-none font-mono"
                            placeholder="9876543210"
                            value={regMobile}
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, '');
                              if(val.length <= 10) setRegMobile(val);
                            }}
                            disabled={showRegOtpInput}
                        />
                    </div>
                </div>

                <div className={showRegOtpInput ? 'opacity-40 pointer-events-none' : ''}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Set Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                        <input 
                            required type="password" 
                            className="w-full pl-9 p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-hospital-500 outline-none"
                            placeholder="••••••••"
                            value={regPassword}
                            onChange={e => setRegPassword(e.target.value)}
                            disabled={showRegOtpInput}
                        />
                    </div>
                </div>

                <div className={showRegOtpInput ? 'opacity-40 pointer-events-none' : ''}>
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
                    <div className="animate-in fade-in slide-in-from-top-2 pt-4 border-t border-gray-100">
                        <div className="text-center mb-4">
                           <label className="block text-sm font-bold text-hospital-700 mb-1">Mobile Verification</label>
                           <p className="text-xs text-gray-400">Code sent to {regMobile}</p>
                        </div>
                        <div className="relative flex justify-center">
                            <input 
                                required type="text" 
                                className="w-40 pl-4 pr-4 p-2.5 border-2 border-hospital-300 rounded-lg text-lg focus:border-hospital-600 focus:outline-none bg-hospital-50 font-bold tracking-[0.3em] text-center font-mono"
                                placeholder="0000"
                                value={regOtpInput}
                                onChange={e => {
                                   const val = e.target.value.replace(/\D/g, '');
                                   if(val.length <= 4) setRegOtpInput(val);
                                }}
                                autoFocus
                            />
                        </div>
                        
                        <div className="text-center mt-3">
                           <button 
                             type="button" 
                             onClick={handleResendOTP}
                             disabled={resendTimer > 0 || isLoading}
                             className="text-xs text-gray-500 hover:text-gray-800 underline disabled:opacity-50 disabled:no-underline"
                           >
                             {resendTimer > 0 ? `Resend available in ${resendTimer}s` : 'Resend Code'}
                           </button>
                        </div>
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
                {isLoading ? 'Processing...' : (showRegOtpInput ? 'Verify & Complete Registration' : 'Send Verification Code')}
            </button>
            
            {showRegOtpInput && (
                <button 
                    type="button" 
                    onClick={() => { setShowRegOtpInput(false); setRegOtpInput(''); setError(''); setResendTimer(0); }}
                    className="w-full text-xs text-gray-400 hover:text-gray-800 mt-2"
                >
                    Cancel & Edit Details
                </button>
            )}
          </form>
        )}
      </div>
      
      <div className="mt-8 text-center text-xs text-slate-400 font-medium">
        <p>&copy; {new Date().getFullYear()} Himas Hospital Systems.</p>
        <div className="flex justify-center gap-4 mt-2 opacity-60">
           <span>Privacy Policy</span>
           <span>•</span>
           <span>Terms of Service</span>
           <span>•</span>
           <span>Support</span>
        </div>
      </div>
    </div>
  );
};