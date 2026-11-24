import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ReportedChat } from '../types/admin';
import { ShieldCheck, MessageSquare, AlertTriangle, Eye, CheckCircle2, XCircle, RefreshCw, Lock } from 'lucide-react';

export const ChatSafety: React.FC = () => {
  const [reports, setReports] = useState<ReportedChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<any[] | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reported_chats')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err: any) {
      console.error('Error fetching chat reports:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load chat safety reports' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId: string, newStatus: 'warned' | 'banned' | 'dismissed', reportedUserId?: string) => {
    try {
      const { error } = await supabase
        .from('reported_chats')
        .update({ status: newStatus })
        .eq('id', reportId);

      if (error) throw error;

      if (newStatus === 'banned' && reportedUserId) {
        await supabase
          .from('app_users')
          .update({ is_chat_banned: true })
          .eq('uid', reportedUserId);
      }

      setStatusMsg({ type: 'success', text: `Chat report status updated to ${newStatus.toUpperCase()}` });
      fetchReports();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update chat report' });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-purple-400" />
            DM & Chat Safety Inspector
          </h1>
          <p className="text-sm text-zinc-400">Review reported private chat conversations, inspect message snapshots, and enforce safety policies.</p>
        </div>
        <button
          onClick={fetchReports}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all border border-zinc-700 self-start"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Reports</span>
        </button>
      </div>

      {/* Status Message */}
      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between ${statusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="underline">Dismiss</button>
        </div>
      )}

      {/* Reports Table / List */}
      {loading ? (
        <div className="text-center py-16 text-zinc-500 text-xs font-bold">Loading reported chats...</div>
      ) : reports.length === 0 ? (
        <div className="bg-[#141418] border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
          <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-white font-bold text-base">No Open Chat Reports</h3>
          <p className="text-zinc-400 text-xs">All user direct messages and conversations are currently clean and safe.</p>
        </div>
      ) : (
        <div className="bg-[#141418] border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[11px] font-black uppercase text-zinc-400 bg-zinc-900/50">
                  <th className="p-4">Report ID</th>
                  <th className="p-4">Reporter ID</th>
                  <th className="p-4">Reported User ID</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Conversation Snapshot</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-xs text-zinc-300">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-zinc-900/30 transition-all">
                    <td className="p-4 font-mono text-zinc-500">{report.id.substring(0, 8)}...</td>
                    <td className="p-4 font-mono text-zinc-400">{report.reporter_id ? report.reporter_id.substring(0, 8) + '...' : 'System'}</td>
                    <td className="p-4 font-mono text-purple-400 font-bold">{report.reported_id ? report.reported_id.substring(0, 8) + '...' : 'N/A'}</td>
                    <td className="p-4 font-semibold text-white max-w-xs truncate">{report.reason}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${
                        report.status === 'warned' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                        report.status === 'banned' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        report.status === 'dismissed' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' :
                        'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      }`}>
                        {report.status || 'pending'}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedSnapshot(report.message_snapshot || [])}
                        className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-[11px] transition-all border border-zinc-700"
                      >
                        <Eye className="w-3.5 h-3.5 text-purple-400" />
                        <span>View Log ({Array.isArray(report.message_snapshot) ? report.message_snapshot.length : 0})</span>
                      </button>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'warned')}
                        className="px-2.5 py-1.5 bg-orange-600/20 hover:bg-orange-600 text-orange-300 hover:text-white rounded-lg font-bold text-[11px] border border-orange-500/30 transition-all"
                      >
                        Warn
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'banned', report.reported_id)}
                        className="px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-lg font-bold text-[11px] border border-red-500/30 transition-all"
                      >
                        Ban Chat
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                        className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-bold text-[11px] border border-zinc-700 transition-all"
                      >
                        Dismiss
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Snapshot Modal */}
      {selectedSnapshot && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl w-full max-w-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-400" />
                Conversation Message Snapshot
              </h3>
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-[#0f0f11] rounded-xl border border-zinc-800 font-mono text-xs">
              {selectedSnapshot.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">No message snapshot recorded in this report.</div>
              ) : (
                selectedSnapshot.map((msg, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                    <div className="flex justify-between text-[10px] text-zinc-500">
                      <span>Sender: {msg.sender_id || msg.sender || 'Unknown'}</span>
                      <span>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ''}</span>
                    </div>
                    <p className="text-white font-sans">{msg.content || msg.text || JSON.stringify(msg)}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl"
              >
                Close Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
