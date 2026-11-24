import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SupportTicket } from '../types/admin';
import { LifeBuoy, MessageSquare, CheckCircle, Clock, AlertTriangle, Send, Search } from 'lucide-react';

export const Support: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Reply Modal
  const [replyTicket, setReplyTicket] = useState<SupportTicket | null>(null);
  const [adminReply, setAdminReply] = useState('');
  const [newStatus, setNewStatus] = useState<'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('RESOLVED');

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      setTickets(data || []);
    } catch (err: any) {
      console.error('Error fetching support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyTicket) return;
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          admin_reply: adminReply,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', replyTicket.id);

      if (error) throw error;
      setStatusMsg({ type: 'success', text: `Replied to ticket #${replyTicket.id}` });
      setReplyTicket(null);
      setAdminReply('');
      fetchTickets();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update ticket' });
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      (t.user_handle || '').toLowerCase().includes(q) ||
      (t.subject || '').toLowerCase().includes(q) ||
      (t.message || '').toLowerCase().includes(q) ||
      (t.id || '').toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          Support & User Feedback Inbox <LifeBuoy className="w-6 h-6 text-purple-400" />
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Review user complaints, bug reports & respond to support tickets
        </p>
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

      {/* Status Filters & Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
        <div className="flex space-x-2 overflow-x-auto w-full md:w-auto">
          {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              {st.replace('_', ' ')} (
              {st === 'ALL' ? tickets.length : tickets.filter((t) => t.status === st).length})
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search handle, subject, text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
              <tr>
                <th className="p-4">Ticket ID / User</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Category</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">
                    Loading tickets...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">
                    No support tickets found matching filter.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{t.id}</div>
                      <div className="text-purple-400 font-mono text-[11px]">@{t.user_handle}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-white">{t.subject}</div>
                      <div className="text-zinc-400 max-w-xs truncate text-[11px]">{t.message}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                        {t.category || 'GENERAL'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.status === 'RESOLVED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : t.status === 'IN_PROGRESS'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          setReplyTicket(t);
                          setAdminReply(t.admin_reply || '');
                          setNewStatus(t.status || 'RESOLVED');
                        }}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg"
                      >
                        View & Reply
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REPLY MODAL */}
      {replyTicket && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSendReply}
            className="bg-[#141418] border border-zinc-800 rounded-2xl p-6 max-w-lg w-full space-y-4"
          >
            <h3 className="font-bold text-lg text-white">Support Ticket Reply</h3>
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1 text-xs">
              <div><strong className="text-zinc-400">User:</strong> @{replyTicket.user_handle}</div>
              <div><strong className="text-zinc-400">Subject:</strong> {replyTicket.subject}</div>
              <div className="pt-1 text-zinc-300">{replyTicket.message}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Admin Response</label>
              <textarea
                required
                rows={4}
                value={adminReply}
                onChange={(e) => setAdminReply(e.target.value)}
                placeholder="Write reply to send to user..."
                className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Update Ticket Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as any)}
                className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-bold"
              >
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setReplyTicket(null)}
                className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Send Reply
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
