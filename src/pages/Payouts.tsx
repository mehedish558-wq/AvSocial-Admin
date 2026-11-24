import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CreatorPayout, FraudFlag } from '../types/admin';
import { CreditCard, CheckCircle, XCircle, DollarSign, Send, ShieldAlert, AlertOctagon, CheckCheck, Search } from 'lucide-react';

export const Payouts: React.FC = () => {
  const [payouts, setPayouts] = useState<CreatorPayout[]>([]);
  const [fraudFlags, setFraudFlags] = useState<FraudFlag[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('SUPER_ADMIN');
  const [dualApprovalThreshold, setDualApprovalThreshold] = useState<number>(5000);
  const [loading, setLoading] = useState(true);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');

  // Action Modal
  const [selectedPayout, setSelectedPayout] = useState<CreatorPayout | null>(null);
  const [adminNote, setAdminNote] = useState('');

  // Toggle Payout Access Modal
  const [toggleHandle, setToggleHandle] = useState('');
  const [toggleAccessModal, setToggleAccessModal] = useState(false);
  const [accessEnabled, setAccessEnabled] = useState(true);

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        const { data: me } = await supabase
          .from('app_users')
          .select('role')
          .eq('uid', sessionData.session.user.id)
          .single();
        if (me?.role) setCurrentUserRole(me.role);
      }

      // Check app_settings first for dual_approval_threshold
      const { data: appConfig } = await supabase
        .from('app_settings')
        .select('dual_approval_threshold')
        .eq('id', 1)
        .maybeSingle();

      if (appConfig?.dual_approval_threshold) {
        setDualApprovalThreshold(appConfig.dual_approval_threshold);
      } else {
        const { data: configData } = await supabase
          .from('admin_configs')
          .select('dual_approval_threshold_bdt')
          .eq('id', 'app_settings')
          .maybeSingle();
        if (configData?.dual_approval_threshold_bdt) {
          setDualApprovalThreshold(configData.dual_approval_threshold_bdt);
        }
      }

      const { data, error } = await supabase
        .from('creator_payouts')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: flags } = await supabase
        .from('fraud_flags')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayouts(data || []);
      setFraudFlags(flags || []);
    } catch (err: any) {
      console.error('Error fetching payouts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'STAFF_REVIEWED' | 'PAY' | 'REJECT') => {
    if (!selectedPayout) return;
    try {
      const requiresDual = selectedPayout.amount_bdt >= dualApprovalThreshold;

      let targetStatus = action;
      if (requiresDual && action === 'PAY' && currentUserRole !== 'SUPER_ADMIN') {
        targetStatus = 'STAFF_REVIEWED';
      }

      const { error } = await supabase.rpc('admin_creator_payout_action', {
        p_payout_id: selectedPayout.id,
        p_action: targetStatus,
        p_note: adminNote
      });

      if (error) throw error;

      await supabase.from('admin_activity_logs').insert({
        admin_handle: 'admin',
        action: `PAYOUT_${targetStatus}`,
        target: selectedPayout.user_handle,
        details: `Amount: ৳${selectedPayout.amount_bdt} (${selectedPayout.method}). Note: ${adminNote}`,
        created_at: new Date().toISOString()
      });

      setStatusMsg({
        type: 'success',
        text:
          targetStatus === 'STAFF_REVIEWED'
            ? `Payout ৳${selectedPayout.amount_bdt} marked STAFF_REVIEWED. Awaiting Super Admin final approval.`
            : `Payout ${selectedPayout.id} status updated to ${targetStatus}`
      });

      setSelectedPayout(null);
      setAdminNote('');
      fetchPayouts();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to process payout action' });
    }
  };

  const handleToggleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.rpc('admin_set_creator_payout_access', {
        p_user_handle: toggleHandle,
        p_enabled: accessEnabled
      });
      if (error) throw error;
      setStatusMsg({ type: 'success', text: `Updated payout access for @${toggleHandle}` });
      setToggleAccessModal(false);
      setToggleHandle('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to toggle payout access' });
    }
  };

  const filteredPayouts = payouts.filter((p) => {
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesMethod =
      methodFilter === 'ALL' ||
      (methodFilter === 'RECHARGE' && (p.method?.toLowerCase().includes('recharge') || p.account_number?.toLowerCase().includes('recharge'))) ||
      (methodFilter === 'BKASH_NAGAD' && (p.method?.toLowerCase().includes('bkash') || p.method?.toLowerCase().includes('nagad') || p.method?.toLowerCase().includes('rocket'))) ||
      (methodFilter === 'BANK' && p.method?.toLowerCase().includes('bank')) ||
      (methodFilter === 'USDT' && (p.method?.toLowerCase().includes('binance') || p.method?.toLowerCase().includes('usdt')));
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (p.user_handle || '').toLowerCase().includes(q) ||
      (p.method || '').toLowerCase().includes(q) ||
      (p.account_number || '').toLowerCase().includes(q) ||
      (p.id || '').toLowerCase().includes(q);
    return matchesStatus && matchesMethod && matchesSearch;
  });

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            Creator Cashout & Dual-Approval System <CreditCard className="w-6 h-6 text-yellow-400" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Audit bKash, Nagad & Rocket withdrawals with Dual-Approval protection for large payouts (≥ ৳{dualApprovalThreshold})
          </p>
        </div>

        <button
          onClick={() => setToggleAccessModal(true)}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-900/40 flex items-center gap-2"
        >
          <Send className="w-4 h-4" /> Toggle Creator Payout Access
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

      {/* Fraud Red Flags Banner */}
      {fraudFlags.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between text-red-400">
          <div className="flex items-center space-x-3">
            <AlertOctagon className="w-5 h-5 text-red-500" />
            <div>
              <div className="font-bold text-xs">Suspicious Referral & Payout Activity Detected</div>
              <div className="text-[11px] text-zinc-400">{fraudFlags.length} users flagged for high referral velocity.</div>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-red-600 text-white font-black text-[10px] rounded-md">
            FRAUD RED FLAG
          </span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col space-y-3 bg-[#141418] border border-zinc-800 p-4 rounded-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-zinc-500 uppercase mr-1">Status:</span>
            {['ALL', 'PENDING', 'STAFF_REVIEWED', 'PAY', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-yellow-500 text-black shadow font-black'
                    : 'text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800'
                }`}
              >
                {st === 'STAFF_REVIEWED' ? '2ND APPROVAL' : st}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search handle, account, method..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60">
          <span className="text-[11px] font-bold text-zinc-500 uppercase mr-1">Method:</span>
          {[
            { id: 'ALL', label: 'All Gateways' },
            { id: 'RECHARGE', label: '📱 Mobile Recharge' },
            { id: 'BKASH_NAGAD', label: '💳 bKash / Nagad / Rocket' },
            { id: 'BANK', label: '🏦 Bank Wire' },
            { id: 'USDT', label: '🪙 Binance USDT' }
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMethodFilter(m.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                methodFilter === m.id
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payout Requests Table */}
      <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
              <tr>
                <th className="p-4">Payout ID / Handle</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4">Account Number</th>
                <th className="p-4">Amount (BDT / USD)</th>
                <th className="p-4">Approval Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">
                    Loading payout requests...
                  </td>
                </tr>
              ) : filteredPayouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">
                    No cashout requests found matching filter.
                  </td>
                </tr>
              ) : (
                filteredPayouts.map((p) => {
                  const isLarge = p.amount_bdt >= dualApprovalThreshold;
                  return (
                    <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-white">{p.id}</div>
                        <div className="text-purple-400 font-mono">@{p.user_handle}</div>
                      </td>
                      <td className="p-4 font-bold text-purple-300">{p.method}</td>
                      <td className="p-4 font-mono font-bold text-zinc-200">{p.account_number}</td>
                      <td className="p-4 font-mono">
                        <div className="font-bold text-emerald-400 text-sm flex items-center gap-1">
                          ৳{p.amount_bdt?.toFixed(2)}
                          {isLarge && (
                            <span
                              className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded text-[9px]"
                              title="Dual-Approval Required"
                            >
                              DUAL
                            </span>
                          )}
                        </div>
                        <div className="text-zinc-500 text-[11px]">${p.amount_usd?.toFixed(2)} USD</div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === 'PAY'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : p.status === 'STAFF_REVIEWED'
                              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                              : p.status === 'REJECTED'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          }`}
                        >
                          {p.status === 'STAFF_REVIEWED' ? 'AWAITING 2ND APPROVAL' : p.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {(p.status === 'PENDING' || p.status === 'STAFF_REVIEWED') && (
                          <button
                            onClick={() => setSelectedPayout(p)}
                            className={`px-3 py-1.5 font-bold text-xs rounded-lg ${
                              p.status === 'STAFF_REVIEWED'
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                                : 'bg-purple-600 hover:bg-purple-500 text-white'
                            }`}
                          >
                            {p.status === 'STAFF_REVIEWED' ? 'Final 2nd Approval' : 'Review & Process'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PROCESS PAYOUT ACTION MODAL */}
      {selectedPayout && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-lg text-white">Process Cashout Request</h3>
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1 text-xs">
              <div><strong className="text-zinc-400">Creator:</strong> @{selectedPayout.user_handle}</div>
              <div><strong className="text-zinc-400">Method:</strong> {selectedPayout.method} ({selectedPayout.account_number})</div>
              <div>
                <strong className="text-zinc-400">Amount:</strong> ৳{selectedPayout.amount_bdt} (${selectedPayout.amount_usd} USD)
                {selectedPayout.amount_bdt >= dualApprovalThreshold && (
                  <span className="ml-2 text-yellow-400 font-bold">(Requires Super Admin 2nd Approval)</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Admin Note / TrxID</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="e.g. Verified TrxID: 9X87YY6..."
                className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setSelectedPayout(null)}
                className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('REJECT')}
                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl"
              >
                Reject & Refund
              </button>
              <button
                onClick={() => handleAction('PAY')}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
              >
                {selectedPayout.amount_bdt >= dualApprovalThreshold && currentUserRole !== 'SUPER_ADMIN'
                  ? 'Mark Staff Reviewed'
                  : 'Approve & Release Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOGGLE CREATOR ACCESS MODAL */}
      {toggleAccessModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleToggleAccess}
            className="bg-[#141418] border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4"
          >
            <h3 className="font-bold text-lg text-white">Toggle Creator Cashout Access</h3>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Creator Handle</label>
              <input
                type="text"
                required
                value={toggleHandle}
                onChange={(e) => setToggleHandle(e.target.value)}
                placeholder="e.g. john_doe"
                className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs"
              />
            </div>

            <label className="flex items-center space-x-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={accessEnabled}
                onChange={(e) => setAccessEnabled(e.target.checked)}
                className="accent-purple-600"
              />
              <span className="text-xs font-bold text-white">Allow Creator to Request Cashouts</span>
            </label>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setToggleAccessModal(false)}
                className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl"
              >
                Save Setting
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
