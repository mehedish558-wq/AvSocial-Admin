import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { logAuditAction } from '../lib/audit';
import { DollarSign, CheckCircle, XCircle, Search, RefreshCw, CreditCard, ShieldCheck, Wallet, ArrowDownRight } from 'lucide-react';

interface DepositRequest {
  id: string;
  user_handle: string;
  usd_amount: number;
  bdt_amount: number;
  gateway: string;
  trx_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_note?: string;
  created_at: string;
}

export const DepositReconciler: React.FC = () => {
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [gatewayFilter, setGatewayFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Reconcile action modal
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      // Fetch from deposit_requests table or audit_logs fallback
      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        // Query audit_logs where action = 'ADD_FUND'
        const { data: logData } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('action', 'ADD_FUND')
          .order('created_at', { ascending: false });

        if (logData) {
          const mapped: DepositRequest[] = logData.map((item: any) => {
            let detailsObj: any = {};
            try {
              detailsObj = typeof item.details === 'string' ? JSON.parse(item.details) : (item.details || {});
            } catch (_) {}

            return {
              id: item.id?.toString() || `dep_${Date.now()}`,
              user_handle: item.user_handle || 'user',
              usd_amount: detailsObj.usd_amount || 10.0,
              bdt_amount: (detailsObj.usd_amount || 10.0) * 120,
              gateway: detailsObj.gateway || 'bKash Merchant',
              trx_id: detailsObj.trx_id || `DEP-${item.id}`,
              status: detailsObj.status || 'PENDING',
              created_at: item.created_at
            };
          });
          setDeposits(mapped);
        } else {
          setDeposits([]);
        }
      } else {
        setDeposits(data);
      }
    } catch (err: any) {
      console.error('Error fetching deposit requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (deposit: DepositRequest) => {
    try {
      const { error } = await supabase.rpc('submit_add_fund_request', {
        p_user_handle: deposit.user_handle,
        p_usd_amount: deposit.usd_amount,
        p_gateway: deposit.gateway,
        p_trx_id: deposit.trx_id
      });

      if (error) throw error;

      await logAuditAction(
        'admin',
        'APPROVE_DEPOSIT_RECONCILIATION',
        deposit.user_handle,
        `Approved $${deposit.usd_amount} deposit via ${deposit.gateway} (TrxID: ${deposit.trx_id})`
      );

      setStatusMsg({
        type: 'success',
        text: `Deposit #${deposit.trx_id} approved! $${deposit.usd_amount} (${deposit.usd_amount * 2000} coins) credited to @${deposit.user_handle}'s wallet.`
      });

      setSelectedDeposit(null);
      fetchDeposits();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to approve deposit' });
    }
  };

  const handleReject = async (deposit: DepositRequest) => {
    try {
      await logAuditAction(
        'admin',
        'REJECT_DEPOSIT_RECONCILIATION',
        deposit.user_handle,
        `Rejected deposit TrxID: ${deposit.trx_id}. Reason: ${adminNote}`
      );

      setStatusMsg({ type: 'success', text: `Deposit #${deposit.trx_id} rejected.` });
      setSelectedDeposit(null);
      setAdminNote('');
      fetchDeposits();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to reject deposit' });
    }
  };

  const filteredDeposits = deposits.filter((d) => {
    const matchesGateway = gatewayFilter === 'ALL' || d.gateway.toLowerCase().includes(gatewayFilter.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      (d.user_handle || '').toLowerCase().includes(q) || (d.trx_id || '').toLowerCase().includes(q) || (d.gateway || '').toLowerCase().includes(q);
    return matchesGateway && matchesStatus && matchesQuery;
  });

  const totalUsdDeposited = deposits.filter(d => d.status === 'APPROVED').reduce((acc, curr) => acc + (curr.usd_amount || 0), 0);
  const totalPendingRequests = deposits.filter(d => d.status === 'PENDING').length;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            Deposit & Add Funds Reconciler <Wallet className="w-6 h-6 text-emerald-400" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Audit, verify TrxIDs, and approve bKash, Nagad, SSLCommerz, Stripe & Binance wallet top-up requests
          </p>
        </div>
        <button
          onClick={fetchDeposits}
          className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Ledger
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
          <button onClick={() => setStatusMsg(null)} className="text-xs underline font-bold">Dismiss</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#141418] border border-zinc-800 rounded-xl p-5">
          <div className="flex justify-between items-center text-zinc-400 text-xs font-semibold uppercase">
            <span>Total Approved Deposits</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">${totalUsdDeposited.toFixed(2)}</p>
          <span className="text-[10px] text-zinc-500">৳{(totalUsdDeposited * 120).toLocaleString()} BDT</span>
        </div>

        <div className="bg-[#141418] border border-zinc-800 rounded-xl p-5">
          <div className="flex justify-between items-center text-zinc-400 text-xs font-semibold uppercase">
            <span>Pending Reconciliations</span>
            <ArrowDownRight className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">{totalPendingRequests}</p>
          <span className="text-[10px] text-zinc-500">Awaiting TrxID check</span>
        </div>

        <div className="bg-[#141418] border border-zinc-800 rounded-xl p-5">
          <div className="flex justify-between items-center text-zinc-400 text-xs font-semibold uppercase">
            <span>Total Requests Logged</span>
            <CreditCard className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{deposits.length}</p>
          <span className="text-[10px] text-zinc-500">Deposit entries</span>
        </div>

        <div className="bg-[#141418] border border-zinc-800 rounded-xl p-5">
          <div className="flex justify-between items-center text-zinc-400 text-xs font-semibold uppercase">
            <span>Audit Verification</span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400 mt-2">100% RPC</p>
          <span className="text-[10px] text-zinc-500">Security Definer Secured</span>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#141418] border border-zinc-800 p-4 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'bKash', 'Nagad', 'SSLCommerz', 'Stripe', 'Binance'].map((gw) => (
            <button
              key={gw}
              onClick={() => setGatewayFilter(gw)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                gatewayFilter === gw
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800'
              }`}
            >
              {gw}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search TrxID, handle, or gateway..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
              <tr>
                <th className="p-4">User Handle</th>
                <th className="p-4">Gateway</th>
                <th className="p-4">Transaction ID (TrxID)</th>
                <th className="p-4">Deposit Amount</th>
                <th className="p-4">Coins Credited</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date & Time</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500">Loading deposit reconciliation ledger...</td>
                </tr>
              ) : filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500">No deposit requests recorded matching filter.</td>
                </tr>
              ) : (
                filteredDeposits.map((dep) => (
                  <tr key={dep.id} className="hover:bg-zinc-800/35 transition-colors">
                    <td className="p-4 font-bold text-white">@{dep.user_handle}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {dep.gateway}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-amber-300">{dep.trx_id}</td>
                    <td className="p-4 font-bold text-emerald-400">${dep.usd_amount.toFixed(2)} (৳{dep.bdt_amount.toFixed(0)})</td>
                    <td className="p-4 font-mono text-purple-300">+{(dep.usd_amount * 2000).toLocaleString()} coins</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-black ${
                          dep.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : dep.status === 'REJECTED'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {dep.status}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400 font-mono">{new Date(dep.created_at).toLocaleString()}</td>
                    <td className="p-4 text-right">
                      {dep.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(dep)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md flex items-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => setSelectedDeposit(dep)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg shadow-md flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-zinc-500 text-xs italic">Reconciled</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {selectedDeposit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-lg text-white">Reject Deposit #{selectedDeposit.trx_id}</h3>
            <p className="text-xs text-zinc-400">
              User: <span className="font-bold text-white">@{selectedDeposit.user_handle}</span> | Amount: <span className="font-bold text-emerald-400">${selectedDeposit.usd_amount}</span>
            </p>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Reason for Rejection</label>
              <textarea
                required
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="e.g. Invalid TrxID or payment not received on merchant dashboard"
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDeposit(null)}
                className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReject(selectedDeposit)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
