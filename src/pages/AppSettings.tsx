import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { logAuditAction } from '../lib/audit';
import { Settings, Save, ShieldAlert, Sparkles, ToggleLeft, ToggleRight, Lock, DollarSign, AlertTriangle, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';

export const AppSettings: React.FC = () => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('AvSocial is undergoing scheduled maintenance. Please check back shortly.');
  const [registrationEnabled, setRegistrationEnabled] = useState(true);

  // App Version Config
  const [latestVersion, setLatestVersion] = useState('1.2.0');
  const [minVersion, setMinVersion] = useState('1.0.0');
  const [forceUpdate, setForceUpdate] = useState(false);
  const [updateUrl, setUpdateUrl] = useState('https://play.google.com/store/apps/details?id=com.example.avsocial');

  // Emergency Feature Kill-Switches
  const [killPostUploads, setKillPostUploads] = useState(false);
  const [killWithdrawals, setKillWithdrawals] = useState(false);
  const [killSignups, setKillSignups] = useState(false);
  const [killReelsUpload, setKillReelsUpload] = useState(false);

  // Dynamic Feature Flags (Granular Toggles)
  const [enableStories, setEnableStories] = useState(true);
  const [enableReels, setEnableReels] = useState(true);
  const [enableCalls, setEnableCalls] = useState(true);
  const [enableLiveStreaming, setEnableLiveStreaming] = useState(true);
  const [enableChat, setEnableChat] = useState(true);
  const [enableMonetization, setEnableMonetization] = useState(true);

  // Security & Rate Limiting Controls
  const [maxPostsPerMinute, setMaxPostsPerMinute] = useState<number>(5);
  const [maxCommentsPerMinute, setMaxCommentsPerMinute] = useState<number>(10);

  // AI & Auto-Moderation Settings
  const [aiSensitivity, setAiSensitivity] = useState<string>('moderate');

  // Monetization & Coin Exchange Rate Config
  const [coinExchangeRate, setCoinExchangeRate] = useState<number>(100);

  // Announcement Banner Manager
  const [announcementText, setAnnouncementText] = useState('🎉 Welcome to AvSocial! Check out our new Reels feature.');
  const [announcementActive, setAnnouncementActive] = useState(false);

  // Financial & Payout Limits
  const [dualApprovalThreshold, setDualApprovalThreshold] = useState<number>(5000);
  const [dailyMaxPayout, setDailyMaxPayout] = useState<number>(50000);

  // Auto-Moderation & Keyword Blacklist
  const [autoBanThreshold, setAutoBanThreshold] = useState<number>(3);
  const [blacklistedKeywords, setBlacklistedKeywords] = useState<string>('spam, scam, abuse, casino, gambling');

  // Policy URLs
  const [privacyUrl, setPrivacyUrl] = useState('https://AvSocial.app/privacy');
  const [termsUrl, setTermsUrl] = useState('https://AvSocial.app/terms');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (data) {
        setMaintenanceMode(data.maintenance_mode ?? false);
        setMaintenanceMsg(data.maintenance_msg ?? 'AvSocial is undergoing scheduled maintenance.');
        setRegistrationEnabled(data.registration_enabled ?? true);
        setLatestVersion(data.latest_version ?? '1.2.0');
        setMinVersion(data.min_version ?? '1.0.0');
        setForceUpdate(data.force_update ?? false);
        setUpdateUrl(data.update_url ?? 'https://play.google.com/store/apps/details?id=com.example.avsocial');
        setKillPostUploads(data.kill_post_uploads ?? false);
        setKillWithdrawals(data.kill_withdrawals ?? false);
        setKillSignups(data.kill_signups ?? false);
        setKillReelsUpload(data.kill_reels_upload ?? false);
        setEnableStories(data.enable_stories ?? true);
        setEnableReels(data.enable_reels ?? true);
        setEnableCalls(data.enable_calls ?? true);
        setEnableLiveStreaming(data.enable_live_streaming ?? true);
        setEnableChat(data.enable_chat ?? true);
        setEnableMonetization(data.enable_monetization ?? true);
        setMaxPostsPerMinute(data.max_posts_per_minute ?? 5);
        setMaxCommentsPerMinute(data.max_comments_per_minute ?? 10);
        setAiSensitivity(data.ai_sensitivity ?? 'moderate');
        setCoinExchangeRate(data.coin_exchange_rate ?? 100);
        setAnnouncementText(data.announcement_text ?? '');
        setAnnouncementActive(data.announcement_active ?? false);
        setDualApprovalThreshold(data.dual_approval_threshold ?? 5000);
        setDailyMaxPayout(data.daily_max_payout ?? 50000);
        setAutoBanThreshold(data.auto_ban_threshold ?? 3);
        setBlacklistedKeywords(data.blacklisted_keywords ?? 'spam, scam, abuse');
        setPrivacyUrl(data.privacy_url ?? 'https://AvSocial.app/privacy');
        setTermsUrl(data.terms_url ?? 'https://AvSocial.app/terms');
      } else if (error) {
        console.warn('Could not query app_settings from Supabase:', error.message);
      }
    } catch (err: any) {
      console.error('Failed to fetch app settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    const payload = {
      id: 1,
      maintenance_mode: maintenanceMode,
      maintenance_msg: maintenanceMsg,
      registration_enabled: registrationEnabled,
      latest_version: latestVersion,
      min_version: minVersion,
      force_update: forceUpdate,
      update_url: updateUrl,
      kill_post_uploads: killPostUploads,
      kill_withdrawals: killWithdrawals,
      kill_signups: killSignups,
      kill_reels_upload: killReelsUpload,
      enable_stories: enableStories,
      enable_reels: enableReels,
      enable_calls: enableCalls,
      enable_live_streaming: enableLiveStreaming,
      enable_chat: enableChat,
      enable_monetization: enableMonetization,
      max_posts_per_minute: maxPostsPerMinute,
      max_comments_per_minute: maxCommentsPerMinute,
      ai_sensitivity: aiSensitivity,
      coin_exchange_rate: coinExchangeRate,
      announcement_text: announcementText,
      announcement_active: announcementActive,
      dual_approval_threshold: dualApprovalThreshold,
      daily_max_payout: dailyMaxPayout,
      auto_ban_threshold: autoBanThreshold,
      blacklisted_keywords: blacklistedKeywords,
      privacy_url: privacyUrl,
      terms_url: termsUrl,
      updated_at: new Date().toISOString()
    };

    try {
      // 1. Direct Table Upsert to app_settings (100% reliable)
      const { error: upsertErr } = await supabase
        .from('app_settings')
        .upsert(payload, { onConflict: 'id' });

      if (upsertErr) {
        console.warn('Direct upsert failed, trying RPC fallback:', upsertErr.message);
        // 2. Fallback to RPC admin_update_app_settings
        const { error: rpcErr } = await supabase.rpc('admin_update_app_settings', {
          p_maintenance_mode: maintenanceMode,
          p_maintenance_msg: maintenanceMsg,
          p_registration_enabled: registrationEnabled,
          p_latest_version: latestVersion,
          p_min_version: minVersion,
          p_force_update: forceUpdate,
          p_update_url: updateUrl,
          p_kill_post_uploads: killPostUploads,
          p_kill_withdrawals: killWithdrawals,
          p_kill_signups: killSignups,
          p_kill_reels_upload: killReelsUpload,
          p_enable_stories: enableStories,
          p_enable_reels: enableReels,
          p_enable_calls: enableCalls,
          p_enable_live_streaming: enableLiveStreaming,
          p_enable_chat: enableChat,
          p_enable_monetization: enableMonetization,
          p_max_posts_per_minute: maxPostsPerMinute,
          p_max_comments_per_minute: maxCommentsPerMinute,
          p_ai_sensitivity: aiSensitivity,
          p_coin_exchange_rate: coinExchangeRate,
          p_announcement_text: announcementText,
          p_announcement_active: announcementActive,
          p_dual_approval_threshold: dualApprovalThreshold,
          p_daily_max_payout: dailyMaxPayout,
          p_auto_ban_threshold: autoBanThreshold,
          p_blacklisted_keywords: blacklistedKeywords,
          p_privacy_url: privacyUrl,
          p_terms_url: termsUrl
        });

        if (rpcErr) throw new Error(upsertErr.message + ' | ' + rpcErr.message);
      }

      // Log audit action
      await logAuditAction('admin', 'UPDATE_APP_SETTINGS', 'app_settings', `Registration: ${registrationEnabled ? 'ENABLED' : 'DISABLED'}, Maintenance: ${maintenanceMode}`);

      // Backup local storage
      localStorage.setItem('avsocial_app_settings', JSON.stringify(payload));

      setStatusMsg({
        type: 'success',
        text: 'Settings saved successfully to Supabase database!'
      });

      // Refresh to confirm persistence
      await fetchSettings();
    } catch (err: any) {
      console.error('Failed to save app settings:', err);
      setStatusMsg({
        type: 'error',
        text: `Failed to save settings: ${err.message || String(err)}`
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            App Remote Controls & Emergency Kill-Switches <Settings className="w-6 h-6 text-purple-400" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Configure emergency kill-switches, financial approval thresholds, auto-moderation rules & maintenance mode
          </p>
        </div>

        <button
          onClick={fetchSettings}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Settings
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between shadow-xl ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
            <span className="font-bold text-xs">{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-xs underline font-bold">
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl">
        {/* EMERGENCY KILL-SWITCHES */}
        <div className="bg-[#141418] border border-red-500/30 rounded-xl p-6 space-y-5 shadow-xl">
          <h2 className="text-base font-bold text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" /> Emergency Feature Kill-Switches (Instant Lock)
          </h2>
          <p className="text-xs text-zinc-400">
            Instantly disable specific app features in case of spam attack or security emergency.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setKillPostUploads(!killPostUploads)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                killPostUploads
                  ? 'bg-red-500/20 border-red-500 text-red-400 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300'
              }`}
            >
              <div>
                <div className="font-bold text-sm">Kill Post Uploads</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {killPostUploads ? 'LOCKED (All post creation blocked)' : 'NORMAL (Uploads allowed)'}
                </div>
              </div>
              {killPostUploads ? <ToggleRight className="w-8 h-8 text-red-500" /> : <ToggleLeft className="w-8 h-8 text-zinc-600" />}
            </div>

            <div
              onClick={() => setKillWithdrawals(!killWithdrawals)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                killWithdrawals
                  ? 'bg-red-500/20 border-red-500 text-red-400 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300'
              }`}
            >
              <div>
                <div className="font-bold text-sm">Kill Cashout Withdrawals</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {killWithdrawals ? 'LOCKED (All withdrawals frozen)' : 'NORMAL (Cashouts allowed)'}
                </div>
              </div>
              {killWithdrawals ? <ToggleRight className="w-8 h-8 text-red-500" /> : <ToggleLeft className="w-8 h-8 text-zinc-600" />}
            </div>

            <div
              onClick={() => setKillSignups(!killSignups)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                killSignups
                  ? 'bg-red-500/20 border-red-500 text-red-400 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300'
              }`}
            >
              <div>
                <div className="font-bold text-sm">Kill User Signups</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {killSignups ? 'LOCKED (New accounts blocked)' : 'NORMAL (Signups allowed)'}
                </div>
              </div>
              {killSignups ? <ToggleRight className="w-8 h-8 text-red-500" /> : <ToggleLeft className="w-8 h-8 text-zinc-600" />}
            </div>

            <div
              onClick={() => setKillReelsUpload(!killReelsUpload)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                killReelsUpload
                  ? 'bg-red-500/20 border-red-500 text-red-400 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300'
              }`}
            >
              <div>
                <div className="font-bold text-sm">Kill Reels Video Upload</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {killReelsUpload ? 'LOCKED (Reel uploads blocked)' : 'NORMAL (Reels allowed)'}
                </div>
              </div>
              {killReelsUpload ? <ToggleRight className="w-8 h-8 text-red-500" /> : <ToggleLeft className="w-8 h-8 text-zinc-600" />}
            </div>
          </div>
        </div>

        {/* GRANULAR FEATURE FLAGS & TOGGLES */}
        <div className="bg-[#141418] border border-purple-500/30 rounded-xl p-6 space-y-5 shadow-xl">
          <h2 className="text-base font-bold text-purple-400 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" /> Advanced Feature Flags & Module Toggles
          </h2>
          <p className="text-xs text-zinc-400">
            Enable or disable specific features dynamically across the mobile app without requiring an app store update.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setEnableStories(!enableStories)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                enableStories ? 'bg-purple-500/10 border-purple-500/40 text-purple-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}
            >
              <div>
                <div className="font-bold text-sm">Stories / Moments Module</div>
                <div className="text-xs opacity-75">{enableStories ? 'ACTIVE (Visible in app)' : 'DISABLED (Hidden)'}</div>
              </div>
              {enableStories ? <ToggleRight className="w-8 h-8 text-purple-400" /> : <ToggleLeft className="w-8 h-8 text-zinc-600" />}
            </div>

            <div
              onClick={() => setEnableReels(!enableReels)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                enableReels ? 'bg-purple-500/10 border-purple-500/40 text-purple-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}
            >
              <div>
                <div className="font-bold text-sm">Reels Short Video Feed</div>
                <div className="text-xs opacity-75">{enableReels ? 'ACTIVE (Visible in app)' : 'DISABLED (Hidden)'}</div>
              </div>
              {enableReels ? <ToggleRight className="w-8 h-8 text-purple-400" /> : <ToggleLeft className="w-8 h-8 text-zinc-600" />}
            </div>

            <div
              onClick={() => setEnableLiveStreaming(!enableLiveStreaming)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                enableLiveStreaming ? 'bg-purple-500/10 border-purple-500/40 text-purple-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}
            >
              <div>
                <div className="font-bold text-sm">Live Broadcasting & Streams</div>
                <div className="text-xs opacity-75">{enableLiveStreaming ? 'ACTIVE (Live tab enabled)' : 'DISABLED'}</div>
              </div>
              {enableLiveStreaming ? <ToggleRight className="w-8 h-8 text-purple-400" /> : <ToggleLeft className="w-8 h-8 text-zinc-600" />}
            </div>

            <div
              onClick={() => setEnableCalls(!enableCalls)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                enableCalls ? 'bg-purple-500/10 border-purple-500/40 text-purple-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}
            >
              <div>
                <div className="font-bold text-sm">Audio & Video Calling</div>
                <div className="text-xs opacity-75">{enableCalls ? 'ACTIVE (Calls enabled)' : 'DISABLED'}</div>
              </div>
              {enableCalls ? <ToggleRight className="w-8 h-8 text-purple-400" /> : <ToggleLeft className="w-8 h-8 text-zinc-600" />}
            </div>

            <div
              onClick={() => setEnableChat(!enableChat)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                enableChat ? 'bg-purple-500/10 border-purple-500/40 text-purple-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}
            >
              <div>
                <div className="font-bold text-sm">Direct Messaging / Chat</div>
                <div className="text-xs opacity-75">{enableChat ? 'ACTIVE (In-box enabled)' : 'DISABLED'}</div>
              </div>
              {enableChat ? <ToggleRight className="w-8 h-8 text-purple-400" /> : <ToggleLeft className="w-8 h-8 text-zinc-600" />}
            </div>

            <div
              onClick={() => setEnableMonetization(!enableMonetization)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                enableMonetization ? 'bg-purple-500/10 border-purple-500/40 text-purple-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}
            >
              <div>
                <div className="font-bold text-sm">Monetization & Rewards</div>
                <div className="text-xs opacity-75">{enableMonetization ? 'ACTIVE (Earning active)' : 'DISABLED'}</div>
              </div>
              {enableMonetization ? <ToggleRight className="w-8 h-8 text-purple-400" /> : <ToggleLeft className="w-8 h-8 text-zinc-600" />}
            </div>
          </div>
        </div>

        {/* RATE LIMITING & ANTI-BOT CONTROLS */}
        <div className="bg-[#141418] border border-zinc-800 rounded-xl p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Rate Limiting & Anti-Bot Controls <ShieldAlert className="w-5 h-5 text-amber-400" />
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Max Posts Per Minute (Per User)
              </label>
              <input
                type="number"
                value={maxPostsPerMinute}
                onChange={(e) => setMaxPostsPerMinute(Number(e.target.value))}
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono font-bold text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Max Comments Per Minute (Per User)
              </label>
              <input
                type="number"
                value={maxCommentsPerMinute}
                onChange={(e) => setMaxCommentsPerMinute(Number(e.target.value))}
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono font-bold text-sm"
              />
            </div>
          </div>
        </div>

        {/* AI MODERATION SENSITIVITY & MONETIZATION CONFIG */}
        <div className="bg-[#141418] border border-zinc-800 rounded-xl p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            AI Moderation Sensitivity & Coin Exchange Rate <Sparkles className="w-5 h-5 text-indigo-400" />
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                AI Auto-Moderation Sensitivity
              </label>
              <select
                value={aiSensitivity}
                onChange={(e) => setAiSensitivity(e.target.value)}
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-bold text-sm"
              >
                <option value="strict">Strict (High filtering, auto-hide all doubtful)</option>
                <option value="moderate">Moderate (Standard balanced check)</option>
                <option value="lenient">Lenient (Minimal filtering)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Coin Exchange Rate (Coins per ৳ 10 BDT)
              </label>
              <input
                type="number"
                value={coinExchangeRate}
                onChange={(e) => setCoinExchangeRate(Number(e.target.value))}
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono font-bold text-sm"
              />
            </div>
          </div>
        </div>

        {/* IN-APP ANNOUNCEMENT BANNER MANAGER */}
        <div className="bg-[#141418] border border-zinc-800 rounded-xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              In-App Announcement Banner Manager <Settings className="w-5 h-5 text-cyan-400" />
            </h2>
            <div
              onClick={() => setAnnouncementActive(!announcementActive)}
              className={`px-3 py-1.5 rounded-lg border cursor-pointer text-xs font-bold flex items-center gap-2 ${
                announcementActive ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}
            >
              <span>{announcementActive ? 'BANNER ACTIVE' : 'BANNER OFF'}</span>
              {announcementActive ? <ToggleRight className="w-5 h-5 text-cyan-400" /> : <ToggleLeft className="w-5 h-5 text-zinc-600" />}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
              Banner Notice Message
            </label>
            <input
              type="text"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="Enter announcement text shown to all users..."
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm"
            />
          </div>
        </div>

        {/* FINANCIAL DUAL-APPROVAL THRESHOLDS */}
        <div className="bg-[#141418] border border-zinc-800 rounded-xl p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Financial Dual-Approval & Payout Caps <DollarSign className="w-5 h-5 text-emerald-400" />
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Dual-Approval Threshold (৳ BDT)
              </label>
              <input
                type="number"
                value={dualApprovalThreshold}
                onChange={(e) => setDualApprovalThreshold(Number(e.target.value))}
                placeholder="5000"
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono font-bold text-sm"
              />
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Cashouts equal to or above this amount require Super Admin 2nd approval.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Daily Platform Payout Budget Cap (৳ BDT)
              </label>
              <input
                type="number"
                value={dailyMaxPayout}
                onChange={(e) => setDailyMaxPayout(Number(e.target.value))}
                placeholder="50000"
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono font-bold text-sm"
              />
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Maximum total BDT cashouts allowed per 24-hour cycle.
              </span>
            </div>
          </div>
        </div>

        {/* AUTO-MODERATION & KEYWORD BLACKLIST */}
        <div className="bg-[#141418] border border-zinc-800 rounded-xl p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Auto-Moderation Engine & Keyword Blacklist <ShieldCheck className="w-5 h-5 text-purple-400" />
          </h2>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
              Auto-Ban Warning Threshold
            </label>
            <input
              type="number"
              value={autoBanThreshold}
              onChange={(e) => setAutoBanThreshold(Number(e.target.value))}
              placeholder="3"
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono font-bold text-sm"
            />
            <span className="text-[11px] text-zinc-500 mt-1 block">
              Number of warnings before system automatically suspends the account.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
              Blacklisted Words & Spam Domain Links (Comma Separated)
            </label>
            <textarea
              rows={3}
              value={blacklistedKeywords}
              onChange={(e) => setBlacklistedKeywords(e.target.value)}
              placeholder="spam, casino, scam, bit.ly, abuse"
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-mono"
            />
          </div>
        </div>

        {/* Maintenance & Registration Controls */}
        <div className="bg-[#141418] border border-zinc-800 rounded-xl p-6 space-y-5 shadow-xl">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            System Operational Controls <Lock className="w-5 h-5 text-red-400" />
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                maintenanceMode
                  ? 'bg-red-500/10 border-red-500/40 text-red-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300'
              }`}
            >
              <div>
                <div className="font-bold text-sm">Maintenance Mode</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {maintenanceMode ? 'ACTIVE (App access locked)' : 'OFF (App operating normally)'}
                </div>
              </div>
              {maintenanceMode ? <ToggleRight className="w-8 h-8 text-red-500" /> : <ToggleLeft className="w-8 h-8 text-zinc-600" />}
            </div>

            <div
              onClick={() => setRegistrationEnabled(!registrationEnabled)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                registrationEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-orange-500/10 border-orange-500/40 text-orange-400'
              }`}
            >
              <div>
                <div className="font-bold text-sm">New User Registration</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {registrationEnabled ? 'ENABLED (Sign ups allowed)' : 'DISABLED (New sign ups blocked)'}
                </div>
              </div>
              {registrationEnabled ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-orange-500" />}
            </div>
          </div>

          {maintenanceMode && (
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Maintenance Notice Message
              </label>
              <textarea
                rows={2}
                value={maintenanceMsg}
                onChange={(e) => setMaintenanceMsg(e.target.value)}
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs"
              />
            </div>
          )}
        </div>

        {/* Force Update & Version Management */}
        <div className="bg-[#141418] border border-zinc-800 rounded-xl p-6 space-y-5 shadow-xl">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            App Version & Force Update Config <ShieldAlert className="w-5 h-5 text-yellow-400" />
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Latest App Version Code
              </label>
              <input
                type="text"
                value={latestVersion}
                onChange={(e) => setLatestVersion(e.target.value)}
                placeholder="1.2.0"
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono font-bold text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Minimum Required Version
              </label>
              <input
                type="text"
                value={minVersion}
                onChange={(e) => setMinVersion(e.target.value)}
                placeholder="1.0.0"
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono font-bold text-sm"
              />
            </div>
          </div>

          <div
            onClick={() => setForceUpdate(!forceUpdate)}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              forceUpdate
                ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300'
            }`}
          >
            <div>
              <div className="font-bold text-sm">Force App Update</div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {forceUpdate ? 'ENABLED (Users below min version must update)' : 'OFF (Optional updates)'}
              </div>
            </div>
            {forceUpdate ? <ToggleRight className="w-8 h-8 text-yellow-500" /> : <ToggleLeft className="w-8 h-8 text-zinc-600" />}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-purple-900/40 flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving Settings to Supabase...' : 'Save All Security & Emergency Settings'}</span>
        </button>
      </form>
    </div>
  );
};
