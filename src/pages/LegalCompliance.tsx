import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LegalDocument, UserDataRequest } from '../types/admin';
import { Globe, FileText, UserX, Download, CheckCircle2, RefreshCw, Save, ShieldCheck } from 'lucide-react';

export const LegalCompliance: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'POLICIES' | 'GDPR'>('POLICIES');
  const [selectedSlug, setSelectedSlug] = useState<'privacy-policy' | 'terms-of-service' | 'community-guidelines'>('privacy-policy');
  const [version, setVersion] = useState('1.0.0');
  const [contentHtml, setContentHtml] = useState('');

  const [gdprRequests, setGdprRequests] = useState<UserDataRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (activeTab === 'POLICIES') {
      fetchPolicy(selectedSlug);
    } else {
      fetchGdprRequests();
    }
  }, [activeTab, selectedSlug]);

  const fetchPolicy = async (slug: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('legal_documents')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (data) {
        setVersion(data.version || '1.0.0');
        setContentHtml(data.content_html || '');
      } else {
        setVersion('1.0.0');
        setContentHtml(`<h1>${slug.replace(/-/g, ' ').toUpperCase()}</h1><p>Enter official legal terms and policies here...</p>`);
      }
    } catch (err: any) {
      console.error('Error fetching policy:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGdprRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_data_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGdprRequests(data || []);
    } catch (err: any) {
      console.error('Error fetching GDPR requests:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load user data requests' });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('legal_documents')
        .upsert({
          slug: selectedSlug,
          version: version.trim(),
          content_html: contentHtml,
          updated_at: new Date().toISOString()
        }, { onConflict: 'slug' });

      if (error) throw error;
      setStatusMsg({ type: 'success', text: `Successfully updated policy "${selectedSlug}" (v${version})!` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save policy document' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateGdprStatus = async (reqId: string, newStatus: 'processing' | 'completed' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('user_data_requests')
        .update({ status: newStatus })
        .eq('id', reqId);

      if (error) throw error;
      setStatusMsg({ type: 'success', text: `GDPR request status updated to ${newStatus.toUpperCase()}` });
      fetchGdprRequests();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update GDPR request' });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Globe className="w-7 h-7 text-purple-400" />
            Legal Policies & GDPR Compliance
          </h1>
          <p className="text-sm text-zinc-400">Manage dynamic legal documents, privacy terms, and process user data export / account deletion requests.</p>
        </div>
      </div>

      {/* Status Message */}
      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between ${statusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="underline">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 gap-6">
        <button
          onClick={() => setActiveTab('POLICIES')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'POLICIES' ? 'border-purple-500 text-purple-400' : 'border-transparent text-zinc-400 hover:text-white'}`}
        >
          <FileText className="w-4 h-4" />
          <span>Dynamic Legal Policies</span>
        </button>
        <button
          onClick={() => setActiveTab('GDPR')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'GDPR' ? 'border-purple-500 text-purple-400' : 'border-transparent text-zinc-400 hover:text-white'}`}
        >
          <UserX className="w-4 h-4" />
          <span>User Data Requests ({gdprRequests.length})</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'POLICIES' ? (
        <div className="bg-[#141418] border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="text-xs font-bold text-zinc-300">Select Policy:</label>
              <select
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value as any)}
                className="bg-[#0f0f11] border border-zinc-800 rounded-xl px-4 py-2 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
              >
                <option value="privacy-policy">Privacy Policy</option>
                <option value="terms-of-service">Terms of Service</option>
                <option value="community-guidelines">Community Guidelines</option>
              </select>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="text-xs font-bold text-zinc-300">Version:</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="bg-[#0f0f11] border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-purple-500 w-28"
              />
            </div>
          </div>

          <form onSubmit={handleSavePolicy} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">HTML Content / Markdown</label>
              <textarea
                rows={12}
                value={contentHtml}
                onChange={(e) => setContentHtml(e.target.value)}
                className="w-full bg-[#0f0f11] border border-zinc-800 rounded-xl p-4 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                placeholder="<h1>Privacy Policy</h1><p>...</p>"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-900/40 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Publishing Policy...' : 'Save & Publish Policy'}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        loading ? (
          <div className="text-center py-16 text-zinc-500 text-xs font-bold">Loading user data requests...</div>
        ) : gdprRequests.length === 0 ? (
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-white font-bold text-base">No Pending Data Requests</h3>
            <p className="text-zinc-400 text-xs">All GDPR export and account deletion requests have been fulfilled.</p>
          </div>
        ) : (
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-[11px] font-black uppercase text-zinc-400 bg-zinc-900/50">
                    <th className="p-4">Request ID</th>
                    <th className="p-4">User ID</th>
                    <th className="p-4">Request Type</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Requested At</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-xs text-zinc-300">
                  {gdprRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-zinc-900/30 transition-all">
                      <td className="p-4 font-mono text-zinc-500">{req.id.substring(0, 8)}...</td>
                      <td className="p-4 font-mono text-purple-400 font-bold">{req.user_id ? req.user_id.substring(0, 8) + '...' : 'N/A'}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${
                          req.request_type === 'delete_account' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        }`}>
                          {req.request_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${
                          req.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          req.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-4 text-zinc-400">{new Date(req.created_at).toLocaleString()}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleUpdateGdprStatus(req.id, 'processing')}
                          className="px-2.5 py-1.5 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-300 hover:text-white rounded-lg font-bold text-[11px] border border-yellow-500/30 transition-all"
                        >
                          Processing
                        </button>
                        <button
                          onClick={() => handleUpdateGdprStatus(req.id, 'completed')}
                          className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg font-bold text-[11px] border border-emerald-500/30 transition-all"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => handleUpdateGdprStatus(req.id, 'rejected')}
                          className="px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-lg font-bold text-[11px] border border-red-500/30 transition-all"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
};
