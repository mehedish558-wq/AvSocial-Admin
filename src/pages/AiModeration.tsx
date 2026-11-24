import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AiModerationLog } from '../types/admin';
import { ShieldAlert, CheckCircle2, AlertTriangle, ShieldCheck, Search, RefreshCw, XCircle } from 'lucide-react';

export const AiModeration: React.FC = () => {
  const [logs, setLogs] = useState<AiModerationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_moderation_logs')
        .select('*, app_users:user_id(name, handle, user_avatar_path)')
        .eq('status', 'pending_review')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      console.error('Error fetching AI moderation logs:', err);
      // Fallback if relation join fails
      try {
        const { data: fallbackData } = await supabase
          .from('ai_moderation_logs')
          .select('*')
          .eq('status', 'pending_review')
          .order('created_at', { ascending: false });
        setLogs(fallbackData || []);
      } catch (e) {
        setStatusMsg({ type: 'error', text: err.message || 'Failed to load AI moderation items' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, newStatus: 'approved_by_admin' | 'auto_blocked', contentId: string, contentType: string) => {
    try {
      const { error } = await supabase
        .from('ai_moderation_logs')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      if (newStatus === 'auto_blocked') {
        // Also hide/delete the target content if table exists
        const tableMap: Record<string, string> = {
          POST: 'posts',
          REEL: 'reels',
          COMMENT: 'comments',
          MESSAGE: 'chat_messages'
        };
        const targetTable = tableMap[contentType.toUpperCase()];
        if (targetTable) {
          await supabase.from(targetTable).delete().eq('id', contentId);
        }
      }

      setStatusMsg({ type: 'success', text: `Successfully marked item as ${newStatus === 'approved_by_admin' ? 'Approved (Safe)' : 'Blocked'}` });
      fetchLogs();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update moderation item' });
    }
  };

  const filteredLogs = logs.filter(log =>
    log.content_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.content_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.app_users?.handle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-purple-400" />
            AI Auto-Moderation Center
          </h1>
          <p className="text-sm text-zinc-400">Review content flagged automatically by AI safety models (NSFW, Violence, Hate Speech).</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all border border-zinc-700 self-start"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Status Message */}
      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between ${statusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="underline">Dismiss</button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 bg-[#141418] p-3 rounded-xl border border-zinc-800">
        <Search className="w-4 h-4 text-zinc-400 ml-2" />
        <input
          type="text"
          placeholder="Filter by content type, ID, or user handle..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent text-white text-xs placeholder-zinc-500 focus:outline-none w-full"
        />
      </div>

      {/* Content Table / List */}
      {loading ? (
        <div className="text-center py-16 text-zinc-500 text-xs font-bold">Loading AI moderation queue...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-[#141418] border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
          <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-white font-bold text-base">Queue is Clear!</h3>
          <p className="text-zinc-400 text-xs">No pending AI flagged items require manual review at this moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredLogs.map((log) => {
            const nsfw = Number(log.nsfw_score || 0) * 100;
            const violence = Number(log.violence_score || 0) * 100;
            const hate = Number(log.hate_score || 0) * 100;
            const labels = Array.isArray(log.flagged_labels) ? log.flagged_labels : [];

            return (
              <div key={log.id} className="bg-[#141418] border border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-purple-500/40 transition-all">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-black uppercase">
                      {log.content_type}
                    </span>
                    <span className="text-xs text-zinc-500">ID: {log.content_id}</span>
                    <span className="text-xs text-zinc-400">• {new Date(log.created_at).toLocaleString()}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white text-xs overflow-hidden">
                      {log.app_users?.user_avatar_path ? (
                        <img src={log.app_users.user_avatar_path} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (log.app_users?.handle?.[0] || 'U').toUpperCase()
                      )}
                    </div>
                    <div>
                      <h4 className="text-white text-xs font-bold">{log.app_users?.name || 'Unknown User'}</h4>
                      <p className="text-zinc-500 text-[11px]">@{log.app_users?.handle || 'unknown'}</p>
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="grid grid-cols-3 gap-3 max-w-md pt-1">
                    <div className={`p-2 rounded-xl border text-center ${nsfw > 50 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
                      <div className="text-[10px] font-bold uppercase">NSFW</div>
                      <div className="text-sm font-black">{nsfw.toFixed(1)}%</div>
                    </div>
                    <div className={`p-2 rounded-xl border text-center ${violence > 50 ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
                      <div className="text-[10px] font-bold uppercase">Violence</div>
                      <div className="text-sm font-black">{violence.toFixed(1)}%</div>
                    </div>
                    <div className={`p-2 rounded-xl border text-center ${hate > 50 ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
                      <div className="text-[10px] font-bold uppercase">Hate</div>
                      <div className="text-sm font-black">{hate.toFixed(1)}%</div>
                    </div>
                  </div>

                  {labels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {labels.map((lbl, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-[10px] font-semibold">
                          #{lbl}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 self-end md:self-center">
                  <button
                    onClick={() => handleAction(log.id, 'approved_by_admin', log.content_id, log.content_type)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-900/40 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve (Safe)</span>
                  </button>
                  <button
                    onClick={() => handleAction(log.id, 'auto_blocked', log.content_id, log.content_type)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-900/40 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Block Content</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
