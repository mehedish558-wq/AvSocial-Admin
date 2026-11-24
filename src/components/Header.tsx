import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { logAuditAction } from '../lib/audit';
import { ShieldCheck, Bell, CheckCircle, XCircle, X, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  adminName: string;
  adminHandle: string;
}

export const Header: React.FC<HeaderProps> = ({ adminName, adminHandle }) => {
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('SUPER_ADMIN');

  useEffect(() => {
    fetchPendingApprovals();
    checkRole();
  }, []);

  const checkRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase.from('app_users').select('role').eq('uid', session.user.id).maybeSingle();
      if (data?.role) setCurrentUserRole(data.role.toUpperCase());
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const { data, error } = await supabase
        .from('pending_approvals')
        .select('*')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPendingApprovals(data);
      } else {
        setPendingApprovals([
          {
            id: 'pa-1',
            action_type: 'UPDATE_EXCHANGE_RATE',
            submitted_by: 'finance_manager',
            payload: { usdBdt: 125, creditsPerDollar: 2100 },
            created_at: new Date().toISOString()
          },
          {
            id: 'pa-2',
            action_type: 'LARGE_PAYOUT',
            submitted_by: 'admin_john',
            payload: { payoutId: 'payout-884', amountBdt: 75000, recipient: 'creator_shuvo' },
            created_at: new Date(Date.now() - 3600000).toISOString()
          }
        ]);
      }
    } catch {
      setPendingApprovals([]);
    }
  };

  const handleMakerCheckerAction = async (item: any, decision: 'APPROVED' | 'REJECTED') => {
    try {
      await supabase.from('pending_approvals').update({ status: decision, reviewed_by: adminHandle }).eq('id', item.id);

      if (decision === 'APPROVED') {
        if (item.action_type === 'UPDATE_EXCHANGE_RATE') {
          await supabase.from('app_settings').upsert({ id: 1, usd_to_bdt: item.payload.usdBdt, credits_per_dollar: item.payload.creditsPerDollar });
        }
      }

      await logAuditAction(
        adminHandle || 'super_admin',
        `MAKER_CHECKER_${decision}`,
        item.action_type,
        `Maker-Checker review for ${item.action_type} submitted by @${item.submitted_by}. Decision: ${decision}`
      );

      setPendingApprovals(pendingApprovals.filter(p => p.id !== item.id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <header className="h-16 border-b border-zinc-800 bg-[#141418]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Authenticated Web Security Session
          </span>
        </div>

        <div className="flex items-center space-x-4">
          {/* Maker-Checker Pending Approvals Bell Badge */}
          {currentUserRole === 'SUPER_ADMIN' && pendingApprovals.length > 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="relative p-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:bg-purple-600/30 transition-all flex items-center gap-1.5 px-3 text-xs font-bold"
            >
              <Bell className="w-4 h-4 animate-bounce text-purple-400" />
              <span>Maker-Checker ({pendingApprovals.length})</span>
            </button>
          )}

          <div className="text-right">
            <div className="text-sm font-bold text-white">{adminName || 'Super Admin'}</div>
            <div className="text-xs text-zinc-400">@{adminHandle || 'admin'}</div>
          </div>

          <div className="w-9 h-9 rounded-full bg-purple-600 border border-purple-400 flex items-center justify-center font-bold text-white shadow-md">
            {(adminName || 'A').charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Maker-Checker Approval Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl w-full max-w-xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" /> High-Risk Maker-Checker Approval Queue
              </h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {pendingApprovals.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs">No pending high-risk actions requiring approval.</div>
              ) : (
                pendingApprovals.map((item) => (
                  <div key={item.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-purple-400">{item.action_type}</span>
                      <span className="text-[11px] text-zinc-500">Submitted by @{item.submitted_by}</span>
                    </div>
                    <div className="bg-black/40 p-2.5 rounded-lg font-mono text-[11px] text-zinc-300">
                      {JSON.stringify(item.payload, null, 2)}
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                      <button
                        onClick={() => handleMakerCheckerAction(item, 'REJECTED')}
                        className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs rounded-lg border border-red-500/20 transition-all flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        onClick={() => handleMakerCheckerAction(item, 'APPROVED')}
                        className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs rounded-lg border border-emerald-500/20 transition-all flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve & Execute
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
