import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { logAuditAction } from '../lib/audit';
import { Flag, ShieldAlert, CheckCircle, Trash2, Eye, UserX, AlertTriangle, X, ShieldCheck } from 'lucide-react';
import { ReportedContent } from '../types/admin';

export const UserReports: React.FC = () => {
  const [reports, setReports] = useState<ReportedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED'>('PENDING');
  const [selectedReport, setSelectedReport] = useState<ReportedContent | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchReports();
  }, [filterStatus]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reported_contents')
        .select('*')
        .eq('status', filterStatus)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReports(data);
      } else {
        setReports([
          {
            id: 'rep-1',
            content_type: 'POST',
            content_id: 'post-998',
            reporter_handle: 'user_alex',
            target_handle: 'spammer_99',
            reason: 'Harassment & abusive language',
            status: 'PENDING',
            created_at: new Date().toISOString()
          },
          {
            id: 'rep-2',
            content_type: 'USER',
            content_id: 'user-887',
            reporter_handle: 'sarah_m',
            target_handle: 'fake_profile_x',
            reason: 'Impersonation and scam',
            status: 'PENDING',
            created_at: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: 'rep-3',
            content_type: 'REEL',
            content_id: 'reel-442',
            reporter_handle: 'joy_99',
            target_handle: 'nsfw_creator',
            reason: 'Nudity & explicit content',
            status: 'PENDING',
            created_at: new Date(Date.now() - 7200000).toISOString()
          }
        ]);
      }
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (report: ReportedContent, actionType: 'DISMISS' | 'DELETE_CONTENT' | 'WARN_USER' | 'BAN_USER') => {
    try {
      let newStatus = 'RESOLVED';
      if (actionType === 'DISMISS') newStatus = 'DISMISSED';

      const activeHandle = localStorage.getItem('admin_handle') || 'admin';
      await supabase.from('reported_contents').update({ status: newStatus, resolved_by: activeHandle }).eq('id', report.id);

      if (actionType === 'DELETE_CONTENT') {
        await supabase.from(report.content_type === 'POST' ? 'posts' : 'reels').delete().eq('id', report.content_id);
      } else if (actionType === 'BAN_USER') {
        await supabase.from('app_users').update({ is_banned: true, ban_reason: report.reason }).eq('handle', report.target_handle);
      }

      await logAuditAction(
        'admin',
        `MODERATION_${actionType}`,
        `@${report.target_handle}`,
        `Resolved report #${report.id} for ${report.content_type} due to: ${report.reason}`
      );

      setStatusMsg({ type: 'success', text: `Successfully executed action: ${actionType} on @${report.target_handle}` });
      setSelectedReport(null);
      setReports(reports.filter(r => r.id !== report.id));
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to execute moderation action' });
    }
  };

  let content;
  if (loading) {
    content = <div className="p-12 text-center text-zinc-500 font-semibold">Loading user reports queue...</div>;
  } else if (reports.length === 0) {
    content = (
      <div className="p-16 text-center text-zinc-500">
        <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-40 text-purple-400" />
        <p className="font-bold text-sm">No {filterStatus.toLowerCase()} user reports found.</p>
      </div>
    );
  } else {
    content = (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-xs font-bold text-zinc-400">
              <th className="p-4">Content Type</th>
              <th className="p-4">Target Handle</th>
              <th className="p-4">Reporter</th>
              <th className="p-4">Reason / Badge</th>
              <th className="p-4">Date Reported</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-xs text-zinc-300">
            {reports.map((rep) => (
              <tr key={rep.id} className="hover:bg-zinc-800/40 transition-colors">
                <td className="p-4 font-bold text-purple-400">{rep.content_type}</td>
                <td className="p-4 font-bold text-white">@{rep.target_handle}</td>
                <td className="p-4 text-zinc-400">@{rep.reporter_handle}</td>
                <td className="p-4">
                  <span className="px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 font-bold text-[11px]">
                    {rep.reason}
                  </span>
                </td>
                <td className="p-4 text-zinc-500">{new Date(rep.created_at).toLocaleString()}</td>
                <td className="p-4 text-right space-x-2">
                  <button
                    onClick={() => setSelectedReport(rep)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-1 ml-auto"
                  >
                    <Eye className="w-3.5 h-3.5" /> Review Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            User Reports Queue <Flag className="w-6 h-6 text-purple-400" />
          </h1>
          <p className="text-sm text-zinc-400">Review flagged user profiles, posts, reels, and chat messages reported by community members</p>
        </div>
        <div className="flex items-center gap-2 bg-[#141418] p-1.5 rounded-xl border border-zinc-800 overflow-x-auto">
          {(['PENDING', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold border ${statusMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
          {statusMsg.text}
        </div>
      )}

      <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        {content}
      </div>

      {/* Review Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-purple-400" /> Report Details (#{selectedReport.id})
              </h2>
              <button onClick={() => setSelectedReport(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
                <div>
                  <span className="text-zinc-500 block mb-1">Content Type</span>
                  <span className="font-bold text-purple-400 text-sm">{selectedReport.content_type}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Target Handle</span>
                  <span className="font-bold text-white text-sm">@{selectedReport.target_handle}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Reported By</span>
                  <span className="text-zinc-300">@{selectedReport.reporter_handle}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Timestamp</span>
                  <span className="text-zinc-300">{new Date(selectedReport.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className="text-zinc-400 font-bold block mb-1.5">Violation Reason / Badge</span>
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-bold">
                  {selectedReport.reason}
                </div>
              </div>

              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-2">
                <span className="text-zinc-400 font-bold block">Reported Content Preview</span>
                <p className="text-zinc-300 italic">"Sample content snippet or media preview associated with {selectedReport.content_id}..."</p>
              </div>

              <div className="pt-4 border-t border-zinc-800 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleAction(selectedReport, 'DISMISS')}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-all"
                >
                  Keep Content (Dismiss)
                </button>
                <button
                  onClick={() => handleAction(selectedReport, 'DELETE_CONTENT')}
                  className="px-4 py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 font-bold rounded-xl border border-yellow-500/20 transition-all"
                >
                  Hide / Delete Post
                </button>
                <button
                  onClick={() => handleAction(selectedReport, 'WARN_USER')}
                  className="px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold rounded-xl border border-blue-500/20 transition-all"
                >
                  Warn User
                </button>
                <button
                  onClick={() => handleAction(selectedReport, 'BAN_USER')}
                  className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl border border-red-500/20 transition-all"
                >
                  Ban User (Permanent)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
