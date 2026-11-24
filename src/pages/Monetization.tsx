import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AdRevenueEntry, CreatorApplication } from '../types/admin';
import { DollarSign, Plus, CheckCircle, XCircle, Clock, Sparkles, Settings, Megaphone, Smartphone, Save, ToggleLeft, ToggleRight, Search } from 'lucide-react';

export const Monetization: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ADMOB_CONFIG' | 'REVENUE' | 'APPLICATIONS' | 'SPONSORS'>('ADMOB_CONFIG');
  const [entries, setEntries] = useState<AdRevenueEntry[]>([]);
  const [apps, setApps] = useState<CreatorApplication[]>([]);
  const [sponsoredPosts, setSponsoredPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // AdMob Settings Form
  const [bannerId, setBannerId] = useState('ca-app-pub-3940256099942544/6300978111');
  const [interstitialId, setInterstitialId] = useState('ca-app-pub-3940256099942544/1033173712');
  const [rewardedId, setRewardedId] = useState('ca-app-pub-3940256099942544/5224354917');
  const [testMode, setTestMode] = useState(true);
  const [adsEnabled, setAdsEnabled] = useState(true);

  // New Revenue Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [grossUsd, setGrossUsd] = useState<number>(0);
  const [verifiedImps, setVerifiedImps] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Application Review Modal
  const [reviewApp, setReviewApp] = useState<CreatorApplication | null>(null);
  const [decisionReason, setDecisionReason] = useState('');

  // Sponsor Ad Modal
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [sponsorTitle, setSponsorTitle] = useState('');
  const [sponsorBannerUrl, setSponsorBannerUrl] = useState('');
  const [sponsorTargetUrl, setSponsorTargetUrl] = useState('');

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Load AdMob settings from Supabase app_settings
      const { data: appSettings } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (appSettings) {
        setAdsEnabled(appSettings.enable_monetization ?? true);
      }

      // Load saved AdMob settings from localStorage backup
      const saved = localStorage.getItem('avsocial_admob_config');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setBannerId(parsed.bannerId || bannerId);
          setInterstitialId(parsed.interstitialId || interstitialId);
          setRewardedId(parsed.rewardedId || rewardedId);
          setTestMode(parsed.testMode ?? true);
          setAdsEnabled(parsed.adsEnabled ?? adsEnabled);
        } catch (e) {}
      }

      const { data: revenueData } = await supabase
        .from('ad_revenue_entries')
        .select('*')
        .order('created_at', { ascending: false });

      let { data: appsData, error: appsErr } = await supabase
        .from('creator_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (appsErr || !appsData || appsData.length === 0) {
        const { data: legacyApps } = await supabase
          .from('monetization_applications')
          .select('*')
          .order('created_at', { ascending: false });
        appsData = legacyApps || [];
      }

      const { data: sponsorData } = await supabase
        .from('sponsor_ads')
        .select('*')
        .order('created_at', { ascending: false });

      setEntries(revenueData || []);
      setApps(appsData || []);
      setSponsoredPosts(sponsorData || []);
    } catch (err: any) {
      console.error('Error fetching monetization data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdmobConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const config = { bannerId, interstitialId, rewardedId, testMode, adsEnabled };
      localStorage.setItem('avsocial_admob_config', JSON.stringify(config));

      // Persist to Supabase app_settings
      await supabase.from('app_settings').upsert({
        id: 1,
        enable_monetization: adsEnabled,
        updated_at: new Date().toISOString()
      });

      setStatusMsg({ type: 'success', text: 'AdMob Ad Unit settings saved to Supabase & configuration active!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save AdMob config' });
    }
  };

  const handleRecordRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.rpc('admin_record_ad_revenue', {
        p_period_start: startDate,
        p_period_end: endDate,
        p_gross_revenue_usd: grossUsd,
        p_verified_impressions: verifiedImps,
        p_notes: notes
      });
      if (error) throw error;
      setStatusMsg({ type: 'success', text: 'AdMob Revenue period created successfully!' });
      setShowCreateModal(false);
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to record ad revenue' });
    }
  };

  const handleSettlePeriod = async (entryId: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_settle_revenue_entry', {
        p_entry_id: entryId
      });
      if (error) throw error;
      setStatusMsg({ type: 'success', text: `Revenue period settled! Credited ${data?.creators_paid || 0} creators.` });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to settle revenue entry' });
    }
  };

  const handleReviewApp = async (approve: boolean) => {
    if (!reviewApp) return;
    try {
      const { error } = await supabase.rpc('admin_review_monetization_application', {
        p_application_id: reviewApp.id,
        p_approve: approve,
        p_reason: decisionReason
      });
      if (error) throw error;
      setStatusMsg({ type: 'success', text: `Application for @${reviewApp.user_handle} ${approve ? 'Approved' : 'Rejected'}` });
      setReviewApp(null);
      setDecisionReason('');
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to review application' });
    }
  };

  const handleCreateSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('sponsor_ads').insert({
        title: sponsorTitle,
        banner_url: sponsorBannerUrl,
        target_url: sponsorTargetUrl,
        is_active: true,
        created_at: new Date().toISOString()
      });
      if (error) throw error;
      setStatusMsg({ type: 'success', text: 'Sponsor ad campaign published!' });
      setShowSponsorModal(false);
      setSponsorTitle('');
      setSponsorBannerUrl('');
      setSponsorTargetUrl('');
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to create sponsor ad' });
    }
  };

  // Filtered Lists
  const filteredEntries = entries.filter((e) => {
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = (e.id || '').toLowerCase().includes(q) || (e.notes || '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const filteredApps = apps.filter((a) => {
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = (a.user_handle || '').toLowerCase().includes(q) || (a.channel_name || '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const filteredSponsors = sponsoredPosts.filter((sp) => {
    const q = searchQuery.toLowerCase();
    return (sp.title || '').toLowerCase().includes(q) || (sp.target_url || '').toLowerCase().includes(q);
  });

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            AdMob Ads & Creator Monetization Hub <DollarSign className="w-6 h-6 text-emerald-400" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Configure AdMob Ad Unit IDs, Test Mode, revenue cycles, creator payouts & sponsor ad campaigns
          </p>
        </div>

        {activeTab === 'REVENUE' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-900/40 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Record AdMob Period
          </button>
        )}

        {activeTab === 'SPONSORS' && (
          <button
            onClick={() => setShowSponsorModal(true)}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-900/40 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Sponsor Ad
          </button>
        )}
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-xs underline font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
        <div className="flex space-x-2 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => { setActiveTab('ADMOB_CONFIG'); setStatusFilter('ALL'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ADMOB_CONFIG' ? 'bg-purple-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" /> AdMob Unit IDs & Settings
          </button>
          <button
            onClick={() => { setActiveTab('REVENUE'); setStatusFilter('ALL'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'REVENUE' ? 'bg-purple-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Revenue & Creator Pool ({entries.length})
          </button>
          <button
            onClick={() => { setActiveTab('APPLICATIONS'); setStatusFilter('ALL'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'APPLICATIONS' ? 'bg-purple-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Creator Applications ({apps.filter((a) => a.status === 'PENDING').length} Pending)
          </button>
          <button
            onClick={() => { setActiveTab('SPONSORS'); setStatusFilter('ALL'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'SPONSORS' ? 'bg-purple-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            <Megaphone className="w-4 h-4" /> Sponsor Ads ({sponsoredPosts.length})
          </button>
        </div>

        {activeTab !== 'ADMOB_CONFIG' && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            {activeTab !== 'SPONSORS' && (
              <div className="flex bg-zinc-900 rounded-xl p-1 border border-zinc-800">
                {['ALL', 'PENDING', 'SETTLED', 'APPROVED', 'REJECTED'].filter(st => {
                  if (activeTab === 'REVENUE') return ['ALL', 'PENDING', 'SETTLED'].includes(st);
                  if (activeTab === 'APPLICATIONS') return ['ALL', 'PENDING', 'APPROVED', 'REJECTED'].includes(st);
                  return true;
                }).map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                      statusFilter === st ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}
            <div className="relative flex-1 md:w-60">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        )}
      </div>

      {activeTab === 'ADMOB_CONFIG' ? (
        /* ADMOB CONFIG FORM */
        <form onSubmit={handleSaveAdmobConfig} className="bg-[#141418] border border-zinc-800 rounded-xl p-6 max-w-xl space-y-5 shadow-xl">
          <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
            <div>
              <div className="font-bold text-sm text-white">Enable Ads in Mobile App</div>
              <div className="text-xs text-zinc-500 mt-0.5">Global switch for Banner, Interstitial & Rewarded Ads</div>
            </div>
            <div onClick={() => setAdsEnabled(!adsEnabled)} className="cursor-pointer">
              {adsEnabled ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-zinc-600" />}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
            <div>
              <div className="font-bold text-sm text-white">AdMob Test Mode</div>
              <div className="text-xs text-zinc-500 mt-0.5">Use Google test ad unit IDs to prevent policy ban during testing</div>
            </div>
            <div onClick={() => setTestMode(!testMode)} className="cursor-pointer">
              {testMode ? <ToggleRight className="w-8 h-8 text-purple-500" /> : <ToggleLeft className="w-8 h-8 text-zinc-600" />}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Banner Ad Unit ID</label>
            <input
              type="text"
              required
              value={bannerId}
              onChange={(e) => setBannerId(e.target.value)}
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Interstitial Ad Unit ID</label>
            <input
              type="text"
              required
              value={interstitialId}
              onChange={(e) => setInterstitialId(e.target.value)}
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Rewarded Ad Unit ID</label>
            <input
              type="text"
              required
              value={rewardedId}
              onChange={(e) => setRewardedId(e.target.value)}
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono text-xs"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save AdMob Configuration</span>
          </button>
        </form>
      ) : activeTab === 'REVENUE' ? (
        /* REVENUE TABLE */
        <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="p-4">Period Dates</th>
                  <th className="p-4">AdMob Gross (USD)</th>
                  <th className="p-4">Verified Impressions</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">Loading entries...</td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">No AdMob revenue periods recorded matching filter.</td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-white">{entry.id}</div>
                        <div className="text-zinc-400 text-[11px]">{entry.period_start} to {entry.period_end}</div>
                      </td>
                      <td className="p-4 font-mono font-bold text-emerald-400 text-sm">${entry.gross_revenue_usd?.toFixed(2)}</td>
                      <td className="p-4 font-mono text-zinc-300">{entry.verified_impressions?.toLocaleString() || 0}</td>
                      <td className="p-4">
                        {entry.status === 'SETTLED' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            SETTLED & CREDITED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            PENDING SETTLEMENT
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {entry.status !== 'SETTLED' && (
                          <button
                            onClick={() => handleSettlePeriod(entry.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md"
                          >
                            Settle & Credit Creators
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'APPLICATIONS' ? (
        /* APPLICATIONS TABLE */
        <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="p-4">Creator Handle</th>
                  <th className="p-4">Channel / Page Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Application Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">No creator onboarding applications found.</td>
                  </tr>
                ) : (
                  filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 font-bold text-white">@{app.user_handle}</td>
                      <td className="p-4 text-zinc-300">{app.channel_name || 'N/A'}</td>
                      <td className="p-4 text-zinc-400">{app.category || 'General'}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            app.status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : app.status === 'REJECTED'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {app.status === 'PENDING' && (
                          <button
                            onClick={() => setReviewApp(app)}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg"
                          >
                            Review Application
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* SPONSOR ADS TABLE */
        <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="p-4">Campaign Title</th>
                  <th className="p-4">Banner URL</th>
                  <th className="p-4">Target Link</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredSponsors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-zinc-500">No active sponsor ads created.</td>
                  </tr>
                ) : (
                  filteredSponsors.map((sp) => (
                    <tr key={sp.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 font-bold text-white">{sp.title}</td>
                      <td className="p-4 text-purple-400 font-mono text-[11px]">{sp.banner_url}</td>
                      <td className="p-4 text-blue-400 font-mono text-[11px]">{sp.target_url}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ACTIVE CAMPAIGN
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE ADMOB REVENUE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleRecordRevenue} className="bg-[#141418] border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-lg text-white">Record New AdMob Revenue Period</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Start Date</label>
                <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">End Date</label>
                <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Gross AdMob Revenue ($ USD)</label>
              <input type="number" step="0.01" required value={grossUsd} onChange={(e) => setGrossUsd(Number(e.target.value))} placeholder="1500.00" className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm font-mono font-bold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Verified Total Impressions</label>
              <input type="number" value={verifiedImps} onChange={(e) => setVerifiedImps(Number(e.target.value))} placeholder="500000" className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-mono" />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl">Record Period</button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE SPONSOR MODAL */}
      {showSponsorModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateSponsor} className="bg-[#141418] border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-lg text-white">Create Sponsor Ad Campaign</h3>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Campaign Title</label>
              <input type="text" required value={sponsorTitle} onChange={(e) => setSponsorTitle(e.target.value)} placeholder="e.g. Summer Mega Sale" className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mig-1">Banner Image URL</label>
              <input type="text" required value={sponsorBannerUrl} onChange={(e) => setSponsorBannerUrl(e.target.value)} placeholder="https://..." className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Target Action Link URL</label>
              <input type="text" required value={sponsorTargetUrl} onChange={(e) => setSponsorTargetUrl(e.target.value)} placeholder="https://..." className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-mono" />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button type="button" onClick={() => setShowSponsorModal(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl">Publish Campaign</button>
            </div>
          </form>
        </div>
      )}

      {/* REVIEW APPLICATION MODAL */}
      {reviewApp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-lg text-white">Review Creator Application</h3>
            <p className="text-xs text-zinc-400">Applicant: @{reviewApp.user_handle}</p>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Decision Reason / Notes</label>
              <textarea value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} placeholder="Provide reason..." className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs" />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setReviewApp(null)} className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl">Cancel</button>
              <button onClick={() => handleReviewApp(false)} className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl">Reject</button>
              <button onClick={() => handleReviewApp(true)} className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl">Approve Creator</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
