import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { logAuditAction } from '../lib/audit';
import { UserCheck, ShieldAlert, CheckCircle, XCircle, UserX, Calendar, Shield } from 'lucide-react';
import { BanAppeal } from '../types/admin';

export const BanAppeals: React.FC = () => {
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchAppeals();
  }, [filterStatus]);

  const fetchAppeals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ban_appeals')
        .select('*')
        .eq('status', filterStatus)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setAppeals(data);
      } else {
        setAppeals([
          {
            id: 'app-1',
            user_handle: 'johndoe_99',
            ban_reason: 'Automated spam detection trigger',
            banned_by: 'Moderator_Alex',
            ban_date: new Date(Date.now() - 86400000 * 3).toISOString(),
            appeal_text: 'I was only sharing vacation photos with my friends. Please unban my account!',
            status: 'PENDING',
            created_at: new Date().toISOString()
          },
          {
            id: 'app-2',
            user_handle: 'crypto_king_bdt',
            ban_reason: 'Suspicious financial referral activity',
            banned_by: 'SuperAdmin_CEO',
            ban_date: new Date(Date.now() - 86400000 * 7).toISOString(),
            appeal_text: 'My account was accessed by a third party. I have secured my email and password.',
            status: 'PENDING',
            created_at: new Date(Date.now() - 7200000).toISOString()
          }
        ]);
      }
    } catch {
      setAppeals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (appeal: any, decision: 'APPROVED' | 'REJECTED', finalNote?: string) => {
    try {
      const activeHandle = localStorage.getItem('admin_handle') || 'admin';
      await supabase.from('ban_appeals').update({ status: decision, reviewed_by: activeHandle }).eq('id', appeal.id);

      if (decision === 'APPROVED') {
        // Restore user account status
        await supabase.from('app_users').update({ is_banned: false, ban_reason: '' }).eq('handle', appeal.user_handle);
      }

      await logAuditAction(
        'admin',
        decision === 'APPROVED' ? 'APPROVE_UNBAN_APPEAL' : 'REJECT_UNBAN_APPEAL',
        `@${appeal.user_handle}`,
        `Ban appeal #${appeal.id} ${decision.toLowerCase()}. Note: ${finalNote || 'Standard review'}`
      );

      setStatusMsg({
        type: 'success',
        text: decision === 'APPROVED' ? `Unban appeal approved! Account @${appeal.user_handle} is now restored.` : `Ban appeal rejected for @${appeal.user_handle}.`
      });

      setAppeals(appeals.filter(a => a.id !== appeal.id));
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to process appeal' });
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            User Unban Appeals Dashboard <UserCheck className="w-6 h-6 text-purple-400" />
          </h1>
          <p className="text-sm text-zinc-400">Review ban appeals, evidence, and history submitted by restricted community members</p>
        </div>
        <div className="flex items-center gap-2 bg-[#141418] p-1.5 rounded-xl border border-zinc-800">
          {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
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
        {loading ? (
          <div className="p-12 text-center text-zinc-500 font-semibold">Loading unban appeals...</div>
        ) : appeals.length === 0 ? (
          <div className="p-16 text-center text-zinc-500">
            <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-40 text-purple-400" />
            <p className="font-bold text-sm">No {filterStatus.toLowerCase()} unban appeals found.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {appeals.map((app) => (
              <div key={app.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-zinc-800/20 transition-colors">
                <div className="space-y-3 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-black text-white">@{app.user_handle}</span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold flex items-center gap-1">
                      <UserX className="w-3 h-3" /> Ban Reason: {app.ban_reason}
                    </span>
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-purple-400" /> Banned by: {app.banned_by || 'Admin'}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" /> Banned on: {app.ban_date ? new Date(app.ban_date).toLocaleDateString() : 'N/A'} | Submitted: {new Date(app.created_at).toLocaleString()}
                  </div>
                  <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800 text-xs text-zinc-300 space-y-1">
                    <span className="font-bold text-purple-400 block">User Appeal Message & Evidence:</span>
                    <p className="italic">"{app.appeal_text}"</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 self-end md:self-center flex-shrink-0">
                  <button
                    onClick={() => handleDecision(app, 'APPROVED')}
                    className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs rounded-xl border border-emerald-500/20 transition-all flex items-center gap-1.5 shadow-md"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve Unban
                  </button>
                  <button
                    onClick={() => handleDecision(app, 'REJECTED')}
                    className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs rounded-xl border border-red-500/20 transition-all flex items-center gap-1.5 shadow-md"
                  >
                    <XCircle className="w-4 h-4" /> Reject Appeal
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
