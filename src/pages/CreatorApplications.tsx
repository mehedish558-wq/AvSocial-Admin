import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CreatorApplication } from '../types/admin';
import { Award, CheckCircle2, XCircle, Clock, RefreshCw, Search, ShieldAlert } from 'lucide-react';

export const CreatorApplications: React.FC = () => {
  const [apps, setApps] = useState<CreatorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Review Modal
  const [reviewApp, setReviewApp] = useState<CreatorApplication | null>(null);
  const [decisionReason, setDecisionReason] = useState('');

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
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
      setApps(appsData || []);
    } catch (err: any) {
      console.error('Error fetching creator applications:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load creator applications' });
    } finally {
      setLoading(false);
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

      if (error) {
        await supabase
          .from('creator_applications')
          .update({ status: approve ? 'APPROVED' : 'REJECTED', decision_reason: decisionReason })
          .eq('id', reviewApp.id);
      }

      setStatusMsg({ type: 'success', text: `Application for @${reviewApp.user_handle} ${approve ? 'Approved' : 'Rejected'}` });
      setReviewApp(null);
      setDecisionReason('');
      fetchApplications();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to review application' });
    }
  };

  const filteredApps = apps.filter((a) => {
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = (a.user_handle || '').toLowerCase().includes(q) || (a.channel_name || '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            Creator Applications & Review <Award className="w-6 h-6 text-purple-400" />
          </h1>
          <p className="text-sm text-zinc-400">Review creator onboarding applications for monetization, approve/reject requests, and manage reapply workflows.</p>
        </div>

        <button
          onClick={fetchApplications}
          className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 self-start"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Applications
        </button>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between ${statusMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="underline">Dismiss</button>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex space-x-2">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === st ? 'bg-purple-600 text-white shadow-md' : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by creator handle or channel..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-700/80 rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
              <tr>
                <th className="p-4">Creator Handle</th>
                <th className="p-4">Channel / Page Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr><td colSpan={5} className="p-12 text-center text-zinc-500">Loading creator applications...</td></tr>
              ) : filteredApps.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-zinc-500">No creator applications found.</td></tr>
              ) : (
                filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-4 font-bold text-white">@{app.user_handle}</td>
                    <td className="p-4 text-zinc-300">{app.channel_name || 'N/A'}</td>
                    <td className="p-4 text-zinc-400">{app.category || 'General'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        app.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        app.status === 'REJECTED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => setReviewApp(app)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg shadow-md transition-all"
                      >
                        {app.status === 'PENDING' ? 'Review Application' : 'View Details'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {reviewApp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-400" /> Review Application: @{reviewApp.user_handle}
            </h2>
            <div className="space-y-2 text-xs text-zinc-300 bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <div><strong className="text-white">Channel Name:</strong> {reviewApp.channel_name || 'N/A'}</div>
              <div><strong className="text-white">Category:</strong> {reviewApp.category || 'General'}</div>
              <div><strong className="text-white">Current Status:</strong> {reviewApp.status}</div>
              <div><strong className="text-white">Submitted At:</strong> {new Date(reviewApp.created_at).toLocaleString()}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Decision Reason / Feedback (for user reapply/approval)</label>
              <textarea
                rows={3}
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="Provide feedback or rejection reason so creator can reapply..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setReviewApp(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReviewApp(false)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg"
              >
                Reject & Allow Reapply
              </button>
              <button
                onClick={() => handleReviewApp(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg"
              >
                Approve Monetization
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
