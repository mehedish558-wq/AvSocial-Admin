import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AdRevenueEntry, CreatorPayout } from '../types/admin';
import { DollarSign, Plus, CheckCircle2, Clock, RefreshCw, CreditCard, Wallet, FileText, Check, X } from 'lucide-react';

export const Revenue: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'REPORTS' | 'PAYOUTS' | 'DEPOSITS'>('REPORTS');

  // Revenue state
  const [entries, setEntries] = useState<AdRevenueEntry[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [grossUsd, setGrossUsd] = useState<number>(0);
  const [verifiedImps, setVerifiedImps] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Payouts state
  const [payouts, setPayouts] = useState<CreatorPayout[]>([]);

  // Deposits state
  const [deposits, setDeposits] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'REPORTS') {
        const { data } = await supabase.from('ad_revenue_entries').select('*').order('created_at', { ascending: false });
        setEntries(data || []);
      } else if (activeTab === 'PAYOUTS') {
        const { data } = await supabase.from('creator_payouts').select('*').order('created_at', { ascending: false });
        setPayouts(data || []);
      } else if (activeTab === 'DEPOSITS') {
        let { data } = await supabase.from('deposit_requests').select('*').order('created_at', { ascending: false });
        if (!data || data.length === 0) {
          const { data: altData } = await supabase.from('wallet_deposits').select('*').order('created_at', { ascending: false });
          data = altData;
        }
        setDeposits(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching revenue data:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const handleRecordRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.rpc('admin_record_ad_revenue', {
        p_period_start: startDate,
        p_period_end: endDate,
        p_gross_revenue_usd: Number(grossUsd),
        p_verified_impressions: Number(verifiedImps),
        p_notes: notes
      });
      if (error) throw error;
      setStatusMsg({ type: 'success', text: 'AdMob Revenue period created successfully!' });
      setShowCreateModal(false);
      setStartDate('');
      setEndDate('');
      setGrossUsd(0);
      setVerifiedImps(0);
      setNotes('');
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to record ad revenue' });
    }
  };

  const handleSettlePeriod = async (entryId: string) => {
    try {
      const { error } = await supabase.rpc('admin_settle_revenue_entry', { p_entry_id: entryId });
      if (error) throw error;
      setStatusMsg({ type: 'success', text: 'Revenue period settled and distributed successfully!' });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to settle revenue entry' });
    }
  };

  const handlePayoutAction = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('creator_payouts').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setStatusMsg({ type: 'success', text: `Payout request updated to ${newStatus}` });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update payout' });
    }
  };

  const handleDepositAction = async (id: string, approved: boolean) => {
    try {
      const { error } = await supabase.from('deposit_requests').update({ status: approved ? 'APPROVED' : 'REJECTED' }).eq('id', id);
      if (error) throw error;
      setStatusMsg({ type: 'success', text: `Deposit request ${approved ? 'approved' : 'rejected'}` });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update deposit' });
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            Revenue & Financial Hub <DollarSign className="w-6 h-6 text-purple-400" />
          </h1>
          <p className="text-sm text-zinc-400">Manage ad revenue reports, creator payouts, and user wallet deposit reconciliations.</p>
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === 'REPORTS' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-900/40 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Record AdMob Period
            </button>
          )}
          <button
            onClick={fetchData}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between ${statusMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="underline">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 gap-6">
        <button
          onClick={() => setActiveTab('REPORTS')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'REPORTS' ? 'border-purple-500 text-purple-400' : 'border-transparent text-zinc-400 hover:text-white'}`}
        >
          <FileText className="w-4 h-4" />
          <span>AdMob Revenue Reports</span>
        </button>
        <button
          onClick={() => setActiveTab('PAYOUTS')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'PAYOUTS' ? 'border-purple-500 text-purple-400' : 'border-transparent text-zinc-400 hover:text-white'}`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Creator Payouts & Cashouts</span>
        </button>
        <button
          onClick={() => setActiveTab('DEPOSITS')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'DEPOSITS' ? 'border-purple-500 text-purple-400' : 'border-transparent text-zinc-400 hover:text-white'}`}
        >
          <Wallet className="w-4 h-4" />
          <span>Deposit Reconciler</span>
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="text-center py-16 text-zinc-500 text-xs font-bold">Loading revenue data...</div>
      ) : activeTab === 'REPORTS' ? (
        <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="p-4">Period</th>
                  <th className="p-4">Gross Revenue (USD)</th>
                  <th className="p-4">Verified Impressions</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Notes</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {entries.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-zinc-500">No ad revenue entries recorded.</td></tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 font-bold text-white">{entry.period_start} to {entry.period_end}</td>
                      <td className="p-4 font-mono font-bold text-emerald-400">${Number(entry.gross_revenue_usd || 0).toLocaleString()}</td>
                      <td className="p-4 font-mono text-zinc-300">{Number(entry.verified_impressions || 0).toLocaleString()} imps</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${entry.status === 'SETTLED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                          {entry.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="p-4 text-zinc-400 max-w-xs truncate">{entry.notes || 'N/A'}</td>
                      <td className="p-4 text-right">
                        {entry.status !== 'SETTLED' && (
                          <button onClick={() => handleSettlePeriod(entry.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md transition-all">
                            Settle & Distribute
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'PAYOUTS' ? (
        <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="p-4">Creator Handle</th>
                  <th className="p-4">Method & Account</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {payouts.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-zinc-500">No creator payout requests found.</td></tr>
                ) : (
                  payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 font-bold text-white">@{p.user_handle}</td>
                      <td className="p-4">
                        <div className="text-white font-semibold">{p.method}</div>
                        <div className="text-zinc-500 font-mono text-[11px]">{p.account_number}</div>
                      </td>
                      <td className="p-4 font-mono font-bold text-emerald-400">${p.amount_usd} (${p.amount_bdt} BDT)</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">{p.status}</span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button onClick={() => handlePayoutAction(p.id, 'APPROVE')} className="px-3 py-1 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold">Approve</button>
                        <button onClick={() => handlePayoutAction(p.id, 'PAY')} className="px-3 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg font-bold">Pay</button>
                        <button onClick={() => handlePayoutAction(p.id, 'REJECTED')} className="px-3 py-1 bg-red-600/20 text-red-300 border border-red-500/30 rounded-lg font-bold">Reject</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="p-4">Deposit ID</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Gateway</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {deposits.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-zinc-500">No deposit requests recorded.</td></tr>
                ) : (
                  deposits.map((d) => (
                    <tr key={d.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 font-mono text-zinc-400">{d.id.substring(0, 8)}...</td>
                      <td className="p-4 font-mono font-bold text-yellow-400">🪙 {d.amount || d.coins || 0}</td>
                      <td className="p-4 font-semibold text-white">{d.gateway || d.method || 'bKash/Stripe'}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">{d.status || 'PENDING'}</span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button onClick={() => handleDepositAction(d.id, true)} className="px-3 py-1 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold">Approve</button>
                        <button onClick={() => handleDepositAction(d.id, false)} className="px-3 py-1 bg-red-600/20 text-red-300 border border-red-500/30 rounded-lg font-bold">Reject</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Revenue Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-400" /> Record AdMob Revenue Period
            </h2>
            <form onSubmit={handleRecordRevenue} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Start Date</label>
                  <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">End Date</label>
                  <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-purple-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Gross Revenue (USD)</label>
                <input type="number" step="0.01" required value={grossUsd} onChange={(e) => setGrossUsd(parseFloat(e.target.value) || 0)} placeholder="1500.00" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Verified Impressions</label>
                <input type="number" required value={verifiedImps} onChange={(e) => setVerifiedImps(parseInt(e.target.value) || 0)} placeholder="500000" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Notes</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Monthly payout period" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-900/40">Record Revenue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
