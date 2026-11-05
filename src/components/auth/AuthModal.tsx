import React, { useState, useEffect } from 'react';
import { storageService, calculateAge } from '../../services/storageService';
import { supabaseAuthService } from '../../services/supabaseAuthService';
import { supabaseDbService } from '../../services/supabaseDbService';
import { LanguageCode, UserAccount, VerificationChannel } from '../../types';
import { SUPPORTED_LANGUAGES } from '../../data/languages';
import { 
  X, 
  Lock, 
  Mail, 
  Phone, 
  User, 
  ShieldCheck, 
  AlertCircle, 
  Calendar, 
  Globe, 
  CheckCircle2, 
  KeyRound, 
  Info,
  Clock,
  RotateCcw,
  Database,
  Check,
  Key
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  mode: 'signin' | 'register';
  onClose: () => void;
  onSuccess: (user: UserAccount, isNewRegistration: boolean) => void;
  onSwitchMode: (mode: 'signin' | 'register') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  mode,
  onClose,
  onSuccess,
  onSwitchMode,
}) => {
  // Registration Form Fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [verificationChannel, setVerificationChannel] = useState<VerificationChannel>('email');
  const [contactValue, setContactValue] = useState(''); // Email or Phone
  const [dateOfBirth, setDateOfBirth] = useState('2000-01-01');
  const [preferredLanguage, setPreferredLanguage] = useState<LanguageCode>('en');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Under-12 Parent Fields
  const [parentName, setParentName] = useState('');
  const [parentContact, setParentContact] = useState('');

  // Sign In Fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Password Reset State
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Verification Step State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [providerStatus, setProviderStatus] = useState<string | null>(null);
  const [testCodeNotice, setTestCodeNotice] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Status & Error
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Calculate age
  const calculatedAge = calculateAge(dateOfBirth);
  const isUnder12 = calculatedAge < 12;

  // Handle countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const resetState = () => {
    setError(null);
    setIsVerifying(false);
    setVerificationCode('');
    setTestCodeNotice(null);
    setProviderStatus(null);
  };

  // STEP 1: Send Verification Request
  const handleInitiateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setLoading(true);

    if (!fullName.trim()) {
      setError('Please provide your full display name.');
      setLoading(false);
      return;
    }
    if (!username.trim() || username.length < 3) {
      setError('Username must be at least 3 characters.');
      setLoading(false);
      return;
    }
    if (!contactValue.trim()) {
      setError(`Please provide your ${verificationChannel === 'email' ? 'email address' : 'phone number'}.`);
      setLoading(false);
      return;
    }
    if (!dateOfBirth) {
      setError('Date of birth is required for age-appropriate safety customization.');
      setLoading(false);
      return;
    }
    if (isUnder12 && (!parentName.trim() || !parentContact.trim())) {
      setError('For learners under 12, parent or guardian details are required for authorization.');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      setLoading(false);
      return;
    }

    try {
      let supabaseMessage = '';

      // 1. Supabase Auth registration dispatch
      if (supabaseAuthService.isConfigured()) {
        if (verificationChannel === 'email') {
          const supRes = await supabaseAuthService.signUp({
            email: contactValue,
            password,
            fullName,
            username,
            dateOfBirth,
            preferredLanguage,
            parentName: isUnder12 ? parentName : undefined,
            parentContact: isUnder12 ? parentContact : undefined,
          });

          if (supRes.error && !supRes.error.toLowerCase().includes('already registered')) {
            console.info('Supabase signUp note:', supRes.error);
          } else if (supRes.message) {
            supabaseMessage = supRes.message;
          }
        } else {
          const supOtp = await supabaseAuthService.sendOtp(contactValue, 'phone');
          if (supOtp.message) {
            supabaseMessage = supOtp.message;
          }
        }
      }

      // 2. Server verification token dispatch as sync fallback
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: verificationChannel,
          contact: contactValue,
        }),
      });

      const data = await res.json();
      if (!res.ok && !supabaseMessage) {
        throw new Error(data.error || 'Failed to dispatch verification code.');
      }

      setProviderStatus(supabaseMessage || data.providerStatus);
      if (data.testCode) {
        setTestCodeNotice(data.testCode);
      }
      setIsVerifying(true);
      setResendCooldown(45);
    } catch (err: any) {
      setError(err.message || 'Error sending verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend code handler
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setLoading(true);

    try {
      if (supabaseAuthService.isConfigured()) {
        await supabaseAuthService.sendOtp(contactValue, verificationChannel);
      }

      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: verificationChannel,
          contact: contactValue,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend code.');
      }

      if (data.testCode) {
        setTestCodeNotice(data.testCode);
      }
      setResendCooldown(45);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify Code and Finalize Registration
  const handleConfirmVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let verifiedBySupabase = false;
      let authenticatedSupabaseUser: any = null;

      // 1. Verify via Supabase Auth
      if (supabaseAuthService.isConfigured()) {
        const supVerify = await supabaseAuthService.verifyOtp(contactValue, verificationCode.trim(), verificationChannel);
        if (supVerify.success) {
          verifiedBySupabase = true;
          authenticatedSupabaseUser = supVerify.user;
        }
      }

      // 2. If not verified via Supabase, verify with server endpoint
      if (!verifiedBySupabase) {
        const res = await fetch('/api/auth/verify-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact: contactValue,
            code: verificationCode.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Verification code failed. Please check the code and try again.');
        }
      }

      // 3. Register user account locally
      const regRes = storageService.registerAccount({
        fullName,
        username,
        email: verificationChannel === 'email' ? contactValue : `${username}@sanr10.local`,
        phone: verificationChannel === 'phone' ? contactValue : undefined,
        verificationChannel,
        password,
        dateOfBirth,
        preferredLanguage,
        parentName: isUnder12 ? parentName : undefined,
        parentContact: isUnder12 ? parentContact : undefined,
      });

      if (!regRes.success || !regRes.user) {
        throw new Error(regRes.error || 'Failed to initialize account.');
      }

      const activeUser = regRes.user;
      if (authenticatedSupabaseUser?.id) {
        activeUser.id = authenticatedSupabaseUser.id;
        storageService.saveAccount(activeUser);
        storageService.setActiveSession(activeUser.id);
      }

      // 4. Save user profile to Supabase profiles table
      const profile = storageService.getProfile(activeUser.id);
      if (profile) {
        await supabaseDbService.upsertProfile(profile);
      }

      onSuccess(activeUser, true);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check code.');
    } finally {
      setLoading(false);
    }
  };

  // Sign In Submission
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!loginIdentifier.trim() || !loginPassword) {
      setError('Please enter your email, phone, or username, and password.');
      setLoading(false);
      return;
    }

    try {
      let authenticatedUser: UserAccount | null = null;

      // 1. Try Supabase Auth
      if (supabaseAuthService.isConfigured()) {
        const supRes = await supabaseAuthService.signInWithPassword(loginIdentifier, loginPassword);
        if (supRes.success && supRes.user) {
          const supUser = supRes.user;
          const cloudProfile = await supabaseDbService.getProfile(supUser.id);

          let account = storageService.getAccounts().find(a => 
            a.id === supUser.id || 
            (supUser.email && a.email.toLowerCase() === supUser.email.toLowerCase())
          );

          if (!account) {
            const meta = supUser.user_metadata || {};
            account = {
              id: supUser.id,
              fullName: cloudProfile?.fullName || meta.full_name || 'Learner',
              username: cloudProfile?.username || meta.username || supUser.email?.split('@')[0] || 'learner',
              email: supUser.email || '',
              phone: supUser.phone || meta.phone,
              verificationChannel: supUser.phone ? 'phone' : 'email',
              isVerified: true,
              verifiedAt: supUser.confirmed_at || new Date().toISOString(),
              dateOfBirth: cloudProfile?.dateOfBirth || meta.date_of_birth || '2000-01-01',
              age: cloudProfile?.age || 20,
              isUnder12: Boolean(cloudProfile?.isUnder12),
              isMinor: (cloudProfile?.age || 20) < 18,
              passwordHash: btoa(loginPassword),
              role: (cloudProfile?.role as any) || 'learner',
              consentRecords: [],
              languagePreferences: cloudProfile?.languagePreferences || {
                interfaceLanguage: 'en',
                responseLanguage: 'en',
                learningLanguage: 'en',
              },
              createdAt: supUser.created_at || new Date().toISOString(),
            };
            storageService.saveAccount(account);
          } else {
            account.id = supUser.id;
            storageService.saveAccount(account);
          }

          if (cloudProfile) {
            storageService.saveProfile(cloudProfile);
          }

          storageService.setActiveSession(account.id);
          authenticatedUser = account;
        } else if (supRes.requiresOtp) {
          setContactValue(loginIdentifier);
          setVerificationChannel(loginIdentifier.includes('@') ? 'email' : 'phone');
          setIsVerifying(true);
          setError('Email registered in Supabase but not yet confirmed. Please enter the OTP code sent to your inbox.');
          setLoading(false);
          return;
        }
      }

      // 2. Fallback to storageService if not authenticated via Supabase
      if (!authenticatedUser) {
        const res = storageService.authenticate(loginIdentifier, loginPassword);
        if (!res.success || !res.user) {
          throw new Error(res.error || 'Authentication failed. Please verify credentials or create an account.');
        }
        authenticatedUser = res.user;
      }

      onSuccess(authenticatedUser, false);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Password Reset Handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setError('Please provide a valid registered email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setResetSuccessMessage(null);

    try {
      const res = await supabaseAuthService.resetPassword(resetEmail);
      if (!res.success) {
        throw new Error(res.error || 'Failed to dispatch password reset link.');
      }
      setResetSuccessMessage('Password reset link dispatched! Please check your email inbox.');
    } catch (err: any) {
      setError(err.message || 'Password reset request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="w-full max-w-lg bg-[#0C101A] border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Close auth dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1.5 mb-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono text-violet-400 font-semibold tracking-wide">
              <span>SAN_R-10</span>
              <span>·</span>
              <span>DASASURYA IDENTITY & SECURITY</span>
            </div>
            {supabaseAuthService.isConfigured() && (
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
                <Database className="w-3 h-3 text-emerald-400" />
                <span>Supabase Auth & RLS Connected</span>
              </div>
            )}
          </div>
          <h3 className="text-2xl font-bold text-white tracking-tight">
            {isResettingPassword 
              ? 'Reset Your Password'
              : mode === 'register' 
                ? isVerifying ? 'Confirm Verification' : 'Create Secure Account' 
                : 'Sign In to Your Sanctuary'}
          </h3>
          <p className="text-xs text-slate-400">
            {isResettingPassword
              ? 'Receive an authenticated reset link dispatched to your registered email.'
              : mode === 'register'
                ? isVerifying 
                  ? `Enter the code sent to your ${verificationChannel}.`
                  : 'Configure language, verified credentials, and age safeguards.'
                : 'Access your sovereign learning roadmaps, chapter notes, and chakra sessions.'}
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Success notification */}
        {(successNotice || resetSuccessMessage) && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successNotice || resetSuccessMessage}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: REGISTRATION - VERIFICATION CODE CONFIRMATION */}
        {/* ------------------------------------------------------------- */}
        {mode === 'register' && isVerifying && (
          <form onSubmit={handleConfirmVerification} className="space-y-4">
            <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-violet-300 font-semibold flex items-center gap-1.5">
                  {verificationChannel === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  <span>Verification Channel: {verificationChannel.toUpperCase()}</span>
                </span>
                <span className="text-slate-400 font-mono text-[11px] truncate max-w-[180px]">
                  {contactValue}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {providerStatus}
              </p>

              {/* Developer Test Code Notice (Transparently displayed when no SMTP/SMS gateway is connected in .env) */}
              {testCodeNotice && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                  <span className="font-mono">Server Verification Code: <strong>{testCodeNotice}</strong></span>
                  <button
                    type="button"
                    onClick={() => setVerificationCode(testCodeNotice)}
                    className="text-[11px] underline hover:text-white"
                  >
                    Auto-Fill
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Enter 6-Digit Verification Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123456"
                  className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-lg text-lg text-white font-mono tracking-widest placeholder-slate-600 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setIsVerifying(false)}
                className="text-slate-400 hover:text-white underline"
              >
                ← Edit Contact Details
              </button>

              <button
                type="button"
                disabled={resendCooldown > 0 || loading}
                onClick={handleResendCode}
                className="text-violet-400 hover:text-violet-300 disabled:opacity-50 flex items-center gap-1 font-mono"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || verificationCode.length < 6}
              className="w-full py-2.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium text-sm transition-all shadow-md shadow-violet-950/40"
            >
              {loading ? 'Verifying Code...' : 'Verify & Activate Account'}
            </button>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: REGISTRATION - INITIAL FORM */}
        {/* ------------------------------------------------------------- */}
        {mode === 'register' && !isVerifying && (
          <form onSubmit={handleInitiateRegistration} className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
            
            {/* Display Name & Username */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Display Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Sandeep Elangovan"
                    className="w-full pl-8 pr-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <span className="text-xs font-mono">@</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="sandeep_e"
                    className="w-full pl-8 pr-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            </div>

            {/* Verification Channel Choice (Email vs Phone) */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Verification Channel Choice
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => { setVerificationChannel('email'); setContactValue(''); }}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                    verificationChannel === 'email'
                      ? 'bg-violet-600/30 border-violet-500 text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Verify via Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setVerificationChannel('phone'); setContactValue(''); }}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                    verificationChannel === 'phone'
                      ? 'bg-violet-600/30 border-violet-500 text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Verify via Phone (SMS)</span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  {verificationChannel === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                </div>
                <input
                  type={verificationChannel === 'email' ? 'email' : 'tel'}
                  required
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                  placeholder={verificationChannel === 'email' ? 'learner@example.com' : '+1 555-0199'}
                  className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {/* Date of Birth & Language */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Date of Birth
                  </label>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isUnder12 ? 'bg-amber-950 text-amber-300 border border-amber-500/30 font-semibold' : 'text-slate-400'
                  }`}>
                    Age: {calculatedAge}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="date"
                    required
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Preferred Language
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value as LanguageCode)}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-violet-500"
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                        {lang.name} ({lang.nativeName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Child-Safe Mode & Parental Consent Fields if Under 12 */}
            {isUnder12 && (
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Child Safety Engine: Parent/Guardian Authorization Required</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Because you are under 12, strict child-safe learning is enforced. External links, public sharing, and unguided interactions are restricted until parent authorization is verified.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Parent / Guardian Name</label>
                    <input
                      type="text"
                      required
                      value={parentName}
                      onChange={e => setParentName(e.target.value)}
                      placeholder="Guardian Full Name"
                      className="w-full p-1.5 bg-black/60 border border-white/10 rounded text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Parent Contact (Email / Phone)</label>
                    <input
                      type="text"
                      required
                      value={parentContact}
                      onChange={e => setParentContact(e.target.value)}
                      placeholder="parent@example.com"
                      className="w-full p-1.5 bg-black/60 border border-white/10 rounded text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Password Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-8 pr-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-8 pr-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium text-sm transition-all shadow-md shadow-violet-950/40 mt-1"
            >
              {loading ? 'Dispatching Verification...' : `Send Verification Code to ${verificationChannel === 'email' ? 'Email' : 'Phone'}`}
            </button>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 3: SIGN IN */}
        {/* ------------------------------------------------------------- */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email, Phone or Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="learner@example.com or username"
                  className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500 font-mono text-[11px]">Protected Session</span>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setResetSuccessMessage(null);
                  setIsResettingPassword(true);
                  setResetEmail(loginIdentifier.includes('@') ? loginIdentifier : '');
                }}
                className="text-violet-400 hover:text-violet-300 transition-colors underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium text-sm transition-all shadow-md shadow-violet-950/40 mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 4: FORGOT / RESET PASSWORD */}
        {/* ------------------------------------------------------------- */}
        {isResettingPassword && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Registered Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="learner@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Supabase Auth will dispatch a secure single-use password recovery link to your inbox.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsResettingPassword(false);
                  setError(null);
                  setResetSuccessMessage(null);
                }}
                className="w-1/3 py-2 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 py-2 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-medium transition-colors shadow-sm"
              >
                {loading ? 'Dispatching...' : 'Send Recovery Link'}
              </button>
            </div>
          </form>
        )}

        {/* Footer switch */}
        <div className="mt-5 pt-4 border-t border-white/[0.08] text-center text-xs text-slate-400">
          {mode === 'register' ? (
            <p>
              Already verified and have an account?{' '}
              <button
                type="button"
                onClick={() => { resetState(); onSwitchMode('signin'); }}
                className="text-violet-400 hover:text-violet-300 font-medium ml-1 transition-colors"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              New to SAN_R-10?{' '}
              <button
                type="button"
                onClick={() => { resetState(); onSwitchMode('register'); }}
                className="text-violet-400 hover:text-violet-300 font-medium ml-1 transition-colors"
              >
                Create Account & Verify
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};
