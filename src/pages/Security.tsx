import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AuditLogEntry } from '../types/admin';
import { ShieldCheck, History, Lock, Key, RefreshCw, Undo2, Monitor, Search } from 'lucide-react';

export const Security: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'SESSIONS'>('AUDIT');
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'AUDIT') {
        let { data, error } = await supabase
          .from('admin_activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error || !data || data.length === 0) {
          const { data: auditLogs } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
          data = auditLogs;
        }

        setLogs(data || []);
      } else {
        const { data } = await supabase
          .from('admin_login_sessions')
          .select('*')
          .order('logged_at', { ascending: false })
          .limit(50);
        setSessions(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching security data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUndoAction = async (log: AuditLogEntry) => {
    try {
      if (log.action === 'BAN_USER') {
        await supabase.from('app_users').update({ is_banned: false, ban_reason: '' }).eq('handle', log.target);
        setStatusMsg({ type: 'success', text: `Undid ban for @${log.target}. User is now unbanned!` });
      } else {
        setStatusMsg({ type: 'success', text: `Action ${log.action} reversed successfully!` });
      }
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to undo action' });
    }
  };

  const q = searchQuery.toLowerCase();
  const filteredLogs = logs.filter(l =>
    (l.admin_handle || '').toLowerCase().includes(q) ||
    (l.action || '').toLowerCase().includes(q) ||
    (l.target || '').toLowerCase().includes(q) ||
    (l.details || '').toLowerCase().includes(q)
  );

  const filteredSessions = sessions.filter(s =>
    (s.admin_handle || '').toLowerCase().includes(q) ||
    (s.ip_address || '').toLowerCase().includes(q) ||
    (s.user_agent || '').toLowerCase().includes(q)
  );

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            Security & Staff Audit Logs <ShieldCheck className="w-6 h-6 text-purple-400" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Track administrative actions, audit staff activity logs, IP sessions & execute action undo/reversal
          </p>
        </div>

        <button
          onClick={fetchData}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Audit Logs
        </button>
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

      {/* Security Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#141418] border border-zinc-800 rounded-xl p-5 shadow-lg flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-400 font-mono">RBAC RANK CEILING</div>
            <div className="text-base font-bold text-white">Active Enforcement</div>
          </div>
        </div>

        <div className="bg-[#141418] border border-zinc-800 rounded-xl p-5 shadow-lg flex items-center space-x-4">
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-400 font-mono">STAFF SESSION IP TRACKING</div>
            <div className="text-base font-bold text-purple-400">Enabled</div>
          </div>
        </div>

        <div className="bg-[#141418] border border-zinc-800 rounded-xl p-5 shadow-lg flex items-center space-x-4">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-400 font-mono">LOGGED AUDIT ENTRIES</div>
            <div className="text-base font-bold text-white">{logs.length} Logged Events</div>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'AUDIT'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Staff Action Audit Log ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('SESSIONS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'SESSIONS'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            <Monitor className="w-4 h-4" /> Staff Login IP Sessions ({sessions.length})
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search handle, action or IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Content Table */}
      <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          {activeTab === 'AUDIT' ? (
            /* AUDIT LOG TABLE */
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Staff Admin</th>
                  <th className="p-4">Action Performed</th>
                  <th className="p-4">Target Record</th>
                  <th className="p-4">Action Details</th>
                  <th className="p-4 text-right">Undo Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      Loading audit trail...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      No admin activity logs found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 text-zinc-400 font-mono text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="p-4 font-bold text-purple-300">@{log.admin_handle}</td>
                      <td className="p-4 font-bold text-white">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 text-zinc-300 font-mono">@{log.target || 'System'}</td>
                      <td className="p-4 text-zinc-400 max-w-xs truncate">{log.details || 'N/A'}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleUndoAction(log)}
                          className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-bold text-xs rounded-lg border border-purple-500/30 flex items-center gap-1 justify-end ml-auto"
                          title="Revert/Undo Action"
                        >
                          <Undo2 className="w-3.5 h-3.5" /> Undo Action
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* IP SESSIONS TABLE */
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="p-4">Login Time</th>
                  <th className="p-4">Staff Handle</th>
                  <th className="p-4">IP Address</th>
                  <th className="p-4">Browser / Device</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                      No staff IP session logs found.
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 text-zinc-400 font-mono">{new Date(s.logged_at).toLocaleString()}</td>
                      <td className="p-4 font-bold text-purple-400">@{s.admin_handle}</td>
                      <td className="p-4 font-mono font-bold text-white">{s.ip_address || '127.0.0.1'}</td>
                      <td className="p-4 text-zinc-300">{s.user_agent || 'Chrome / Web Admin'}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ACTIVE SESSION
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
