import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Lock, Mail, AlertCircle, Sparkles, Send, KeyRound } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('');
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;

      const user = data.user;
      if (!user) throw new Error('Authentication failed');

      await verifyAdminAccess(user.id, user.email || '');
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMagicLink = async () => {
    if (!email) {
      setError('Please enter your admin email address first.');
      return;
    }
    setError('');
    setStatus('');
    setLoading(true);

    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({ email });
      if (otpErr) throw otpErr;

      setShowOtpInput(true);
      setStatus(`Login code/link sent to ${email}. Please check your inbox or enter the OTP code below.`);
    } catch (err: any) {
      setError(err.message || 'Failed to send login code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('');
    setLoading(true);

    try {
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email'
      });

      if (verifyErr) throw verifyErr;

      const user = data.user;
      if (!user) throw new Error('OTP verification failed.');

      await verifyAdminAccess(user.id, user.email || '');
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your admin email address first.');
      return;
    }
    setError('');
    setStatus('');
    setLoading(true);

    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email);
      if (resetErr) throw resetErr;

      setStatus(`Password reset link sent to ${email}. Please check your inbox.`);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const verifyAdminAccess = async (uid: string, userEmail: string) => {
    const isCeoEmail = userEmail.toLowerCase() === 'com.noxmeta@gmail.com' || userEmail.toLowerCase() === 'ceo@avsocial.app';

    let { data: userData } = await supabase
      .from('app_users')
      .select('role, handle')
      .eq('uid', uid)
      .maybeSingle();

    if (isCeoEmail) {
      if (!userData || (userData.role || '').toUpperCase() !== 'SUPER_ADMIN') {
        await supabase.from('app_users').upsert({
          uid: uid,
          email: userEmail,
          name: 'CEO Super Admin',
          handle: 'ceo',
          role: 'SUPER_ADMIN'
        });
      }
      return;
    }

    const role = (userData?.role || '').toUpperCase();
    const handle = (userData?.handle || '').toLowerCase();
    const isCEO = isCeoEmail || handle === 'ceo';

    if (!isCEO && !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MODERATOR'].includes(role)) {
      await supabase.auth.signOut();
      throw new Error('Access Denied: You do not have Web Admin credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f11] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#141418] border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-purple-600 via-pink-500 to-yellow-400 rounded-2xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-4 shadow-xl shadow-purple-900/40">
            AV
          </div>
          <h2 className="text-2xl font-black text-white flex items-center justify-center gap-2">
            AvSocial Web Admin <Sparkles className="w-5 h-5 text-purple-400 fill-purple-400/20" />
          </h2>
          <p className="text-zinc-400 text-sm mt-1">Sign in to access Web Control Panel</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center space-x-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {status && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">
            {status}
          </div>
        )}

        {!showOtpInput ? (
          <form onSubmit={handlePasswordLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-2">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="com.noxmeta@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold uppercase text-zinc-400">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
                >
                  Reset Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-purple-900/40 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Web Admin'}
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-zinc-800"></div>
              <span className="flex-shrink mx-4 text-zinc-500 text-xs font-bold uppercase">Or</span>
              <div className="flex-grow border-t border-zinc-800"></div>
            </div>

            <button
              type="button"
              onClick={handleSendMagicLink}
              disabled={loading}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 border border-zinc-700 disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-purple-400" /> Send Magic Link / OTP Code
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-2">
                Enter Email OTP Code
              </label>
              <div className="relative">
                <KeyRound className="w-5 h-5 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="6-digit OTP code"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-white placeholder-zinc-500 text-sm font-mono focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? 'Verifying OTP...' : 'Verify OTP & Sign In'}
            </button>

            <button
              type="button"
              onClick={() => { setShowOtpInput(false); setStatus(''); setError(''); }}
              className="w-full text-xs text-zinc-400 hover:text-white underline font-semibold text-center block"
            >
              Back to Password Sign In
            </button>
          </form>
        )}

        <div className="mt-8 text-center border-t border-zinc-800 pt-4">
          <p className="text-xs text-zinc-500 flex items-center justify-center gap-1">
            <Shield className="w-3.5 h-3.5 text-zinc-400" /> Authorized Admin Personnel Only
          </p>
        </div>
      </div>
    </div>
  );
};
