import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { logAuditAction } from '../lib/audit';
import {
  CheckCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Search,
  Plus,
  Settings,
  UserCheck,
  FileText,
  Copy,
  ExternalLink,
  AlertTriangle,
  Award
} from 'lucide-react';

export const Verification: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [docsModalData, setDocsModalData] = useState<any | null>(null);
  const [rejectModalData, setRejectModalData] = useState<any | null>(null);

  // Plan Form State
  const [newPlanName, setNewPlanName] = useState('');
  const [newBadgeType, setNewBadgeType] = useState<'BLUE' | 'GOLD'>('BLUE');
  const [newPrice, setNewPrice] = useState<number>(9.99);
  const [newCoinCost, setNewCoinCost] = useState<number>(1000);
  const [newDurationDays, setNewDurationDays] = useState<number>(30);

  // Manual Grant Form State
  const [selectedUserUid, setSelectedUserUid] = useState('');
  const [grantBadgeType, setGrantBadgeType] = useState<'BLUE' | 'GOLD'>('BLUE');
  const [grantDurationDays, setGrantDurationDays] = useState<number>(30);

  // Reject Form State
  const [rejectionReason, setRejectionReason] = useState('');
  const [markRefunded, setMarkRefunded] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Verification Requests with Plan & User details
      const { data: reqData, error: reqErr } = await supabase
        .from('verification_requests')
        .select(`
          *,
          verification_plans ( plan_name, badge_type, price ),
          app_users:user_id ( uid, name, handle, email, user_avatar_path )
        `)
        .order('created_at', { ascending: false });

      if (reqErr) {
        // Fallback if relation join fails or table is slightly different
        const { data: fallbackReq } = await supabase.from('verification_requests').select('*').order('created_at', { ascending: false });
        setRequests(fallbackReq || []);
      } else {
        setRequests(reqData || []);
      }

      // 2. Fetch Plans
      const { data: planData } = await supabase.from('verification_plans').select('*');
      setPlans(planData || [
        { id: 'p1', plan_name: 'Creator Blue Pro', badge_type: 'BLUE', price: 9.99, coin_cost: 1000, duration_days: 30, is_active: true },
        { id: 'p2', plan_name: 'VIP Gold Elite', badge_type: 'GOLD', price: 29.99, coin_cost: 3000, duration_days: 90, is_active: true }
      ]);

      // 3. Fetch Users for manual grant
      const { data: userData } = await supabase.from('app_users').select('uid, name, handle, email').limit(100);
      setUsersList(userData || []);

    } catch (err: any) {
      console.error('Error fetching verification data:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to fetch verification data' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      const adminId = 'admin'; // or current admin session id
      const { error } = await supabase.rpc('approve_verification_request', {
        p_request_id: requestId,
        p_admin_id: adminId
      });

      if (error) throw error;

      const req = requests.find(r => r.id === requestId);
      if (req?.user_id) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await supabase.from('app_users').update({
          is_verified: true,
          verification_badge: true,
          badge_expires_at: expiresAt.toISOString(),
          verification_badge_expires_at: expiresAt.toISOString()
        }).eq('uid', req.user_id);
      }

      await logAuditAction('admin', 'APPROVE_VERIFICATION', `Request ID: ${requestId}`, 'Approved paid verification badge request');
      setStatusMsg({ type: 'success', text: 'Verification request approved successfully!' });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to approve request' });
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalData) return;

    try {
      const adminId = 'admin';
      const { error } = await supabase.rpc('reject_verification_request', {
        p_request_id: rejectModalData.id,
        p_reason: rejectionReason || 'Does not meet platform guidelines',
        p_refund: markRefunded,
        p_admin_id: adminId
      });

      if (error) throw error;

      await logAuditAction('admin', 'REJECT_VERIFICATION', `Request ID: ${rejectModalData.id}`, `Reason: ${rejectionReason}, Refunded: ${markRefunded}`);
      setStatusMsg({ type: 'success', text: 'Verification request rejected & processed.' });
      setRejectModalData(null);
      setRejectionReason('');
      setMarkRefunded(false);
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to reject request' });
    }
  };

  const handleRevoke = async (request: any) => {
    if (!confirm(`Are you sure you want to revoke verification badge for @${request.app_users?.handle || request.user_handle}?`)) return;

    try {
      const userId = request.user_id;
      // Update request status to REVOKED
      await supabase.from('verification_requests').update({ status: 'REVOKED' }).eq('id', request.id);

      // Update user status
      if (userId) {
        await supabase.from('app_users').update({
          is_verified: false,
          verification_badge: false,
          badge_type: null,
          badge_expires_at: null,
          verification_badge_expires_at: null
        }).eq('uid', userId);
      }

      await logAuditAction('admin', 'REVOKE_VERIFICATION', `Request ID: ${request.id}`, 'Revoked verification badge');
      setStatusMsg({ type: 'success', text: 'Verification badge revoked successfully.' });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to revoke badge' });
    }
  };

  const handleGrantManually = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserUid) return;

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + grantDurationDays);

      const { error } = await supabase.from('app_users').update({
        is_verified: true,
        verification_badge: true,
        badge_type: grantBadgeType,
        badge_expires_at: expiresAt.toISOString(),
        verification_badge_expires_at: expiresAt.toISOString(),
        verification_badge_at: new Date().toISOString()
      }).eq('uid', selectedUserUid);

      if (error) throw error;

      await logAuditAction('admin', 'GRANT_MANUAL_BADGE', `User UID: ${selectedUserUid}`, `Type: ${grantBadgeType}, Duration: ${grantDurationDays} days`);
      setStatusMsg({ type: 'success', text: `Successfully granted ${grantBadgeType} badge manually!` });
      setShowGrantModal(false);
      setSelectedUserUid('');
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to grant badge manually' });
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('verification_plans').insert({
        plan_name: newPlanName,
        badge_type: newBadgeType,
        price: newPrice,
        coin_cost: newCoinCost,
        duration_days: newDurationDays,
        is_active: true
      });

      if (error) throw error;

      await logAuditAction('admin', 'CREATE_VERIFICATION_PLAN', newPlanName, `Price: $${newPrice}, Duration: ${newDurationDays} days`);
      setStatusMsg({ type: 'success', text: 'Verification plan created successfully!' });
      setShowPlanModal(false);
      setNewPlanName('');
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to create plan' });
    }
  };

  const togglePlanStatus = async (planId: string, currentActive: boolean) => {
    try {
      await supabase.from('verification_plans').update({ is_active: !currentActive }).eq('id', planId);
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to toggle plan' });
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesTab = filterTab === 'ALL' || r.status === filterTab;
    const q = searchQuery.toLowerCase();
    const handle = (r.app_users?.handle || r.user_handle || '').toLowerCase();
    const name = (r.app_users?.name || r.full_name || '').toLowerCase();
    const txId = (r.transaction_id || '').toLowerCase();
    const matchesSearch = handle.includes(q) || name.includes(q) || txId.includes(q);
    return matchesTab && matchesSearch;
  });

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            Verification Checkmark Badges <ShieldCheck className="w-6 h-6 text-blue-400" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Paid verification badge system, KYC review, payment proof audit, and subscription management
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPlanModal(true)}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md transition-all"
          >
            <Settings className="w-4 h-4 text-purple-400" /> Plan Settings
          </button>
          <button
            onClick={() => setShowGrantModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-blue-900/40 transition-all"
          >
            <UserCheck className="w-4 h-4" /> Grant Badge Manually
          </button>
        </div>
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

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#141418] border border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {['ALL', 'PENDING', 'APPROVED', 'EXPIRED', 'REJECTED', 'REVOKED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                filterTab === tab
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search handle, name, txn ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Responsive Table */}
      <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Plan & Payment</th>
                <th className="p-4">KYC & Proof</th>
                <th className="p-4">Validity</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-zinc-500">
                    Loading verification requests...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldCheck className="w-8 h-8 text-zinc-600" />
                      <span>No verification requests found matching your filter.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((r) => {
                  const user = r.app_users || {};
                  const plan = r.verification_plans || {};
                  return (
                    <tr key={r.id} className="hover:bg-zinc-800/35 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">
                            {user.user_avatar_path ? (
                              <img src={user.user_avatar_path} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-white">
                                {(user.name || r.full_name || 'U').charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1">
                              {user.name || r.full_name || 'Unknown User'}
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                            </div>
                            <div className="text-zinc-400 font-mono text-[11px]">@{user.handle || r.user_handle}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-white">{plan.plan_name || 'Standard Verification'}</div>
                        <div className="text-zinc-400 text-[11px] flex items-center gap-2 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 font-bold uppercase text-[10px] text-purple-300">
                            {r.payment_method || 'Coins'}
                          </span>
                          <span className="font-mono text-yellow-400">${r.amount_paid || plan.price || '0.00'}</span>
                        </div>
                        {r.transaction_id && (
                          <div className="text-[10px] text-zinc-500 font-mono mt-1 flex items-center gap-1">
                            Txn: {r.transaction_id}
                            <button
                              onClick={() => navigator.clipboard.writeText(r.transaction_id)}
                              className="text-zinc-400 hover:text-white"
                              title="Copy Txn ID"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <button
                          onClick={() => setDocsModalData(r)}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-blue-400 font-bold rounded-lg flex items-center gap-1.5 transition-all border border-zinc-700"
                        >
                          <FileText className="w-3.5 h-3.5" /> View Docs ({r.document_type || 'ID'})
                        </button>
                      </td>

                      <td className="p-4">
                        {r.starts_at && r.expires_at ? (
                          <div className="text-xs">
                            <div className="text-zinc-300 font-mono">From: {new Date(r.starts_at).toLocaleDateString()}</div>
                            <div className="text-zinc-400 font-mono">Till: {new Date(r.expires_at).toLocaleDateString()}</div>
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-xs italic">Pending approval</span>
                        )}
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            r.status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : r.status === 'PENDING'
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              : r.status === 'EXPIRED'
                              ? 'bg-zinc-700/40 text-zinc-400 border border-zinc-600'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {r.status || 'PENDING'}
                        </span>
                      </td>

                      <td className="p-4 text-right space-x-2">
                        {r.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(r.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectModalData(r)}
                              className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold text-xs rounded-lg border border-red-500/30"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {r.status === 'APPROVED' && (
                          <button
                            onClick={() => handleRevoke(r)}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-red-600/20 text-zinc-400 hover:text-red-400 font-bold text-xs rounded-lg border border-zinc-700 transition-all"
                          >
                            Revoke Badge
                          </button>
                        )}
                        {r.status !== 'PENDING' && r.status !== 'APPROVED' && (
                          <span className="text-zinc-500 text-[11px] italic">No actions</span>
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

      {/* 1. Plan Settings Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl w-full max-w-xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" /> Manage Verification Plans
              </h2>
              <button onClick={() => setShowPlanModal(false)} className="text-zinc-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {plans.map((p) => (
                <div key={p.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      {p.plan_name}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${p.badge_type === 'GOLD' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {p.badge_type}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">
                      Price: ${p.price} | Coins: {p.coin_cost} | Duration: {p.duration_days} Days
                    </div>
                  </div>
                  <button
                    onClick={() => togglePlanStatus(p.id, p.is_active)}
                    className={`px-3 py-1 rounded text-xs font-bold ${p.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}
                  >
                    {p.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleCreatePlan} className="border-t border-zinc-800 pt-4 space-y-4">
              <h3 className="font-bold text-sm text-white">Create New Verification Plan</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                    placeholder="e.g. VIP Elite"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Badge Type</label>
                  <select
                    value={newBadgeType}
                    onChange={(e) => setNewBadgeType(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="BLUE">BLUE</option>
                    <option value="GOLD">GOLD</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Price ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(parseFloat(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Coin Cost</label>
                  <input
                    type="number"
                    required
                    value={newCoinCost}
                    onChange={(e) => setNewCoinCost(parseInt(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-zinc-400 block mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    required
                    value={newDurationDays}
                    onChange={(e) => setNewDurationDays(parseInt(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Grant Badge Manually Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" /> Grant Verification Badge Manually
              </h2>
              <button onClick={() => setShowGrantModal(false)} className="text-zinc-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleGrantManually} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Select User</label>
                <select
                  required
                  value={selectedUserUid}
                  onChange={(e) => setSelectedUserUid(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">-- Choose User --</option>
                  {usersList.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name || 'User'} (@{u.handle}) - {u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Badge Type</label>
                <select
                  value={grantBadgeType}
                  onChange={(e) => setGrantBadgeType(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="BLUE">BLUE Checkmark</option>
                  <option value="GOLD">GOLD Checkmark</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Duration (Days)</label>
                <input
                  type="number"
                  required
                  value={grantDurationDays}
                  onChange={(e) => setGrantDurationDays(parseInt(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl"
                >
                  Grant Badge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. View KYC & Proof Docs Modal */}
      {docsModalData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl w-full max-w-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" /> KYC & Payment Proof Review
              </h2>
              <button onClick={() => setDocsModalData(null)} className="text-zinc-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-2">
                <div className="text-zinc-400">User: <strong className="text-white">@{docsModalData.app_users?.handle || docsModalData.user_handle}</strong></div>
                <div className="text-zinc-400">Document Type: <strong className="text-white uppercase">{docsModalData.document_type || 'National ID'}</strong></div>
                <div className="text-zinc-400">Transaction ID: <strong className="text-white font-mono">{docsModalData.transaction_id || 'N/A'}</strong></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {docsModalData.document_front_url && (
                  <div className="space-y-1">
                    <span className="text-zinc-400 font-bold">Document Front</span>
                    <a href={docsModalData.document_front_url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 aspect-video relative group">
                      <img src={docsModalData.document_front_url} alt="Doc Front" className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold gap-1 transition-all">
                        <ExternalLink className="w-4 h-4" /> Open Full
                      </div>
                    </a>
                  </div>
                )}

                {docsModalData.document_back_url && (
                  <div className="space-y-1">
                    <span className="text-zinc-400 font-bold">Document Back</span>
                    <a href={docsModalData.document_back_url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 aspect-video relative group">
                      <img src={docsModalData.document_back_url} alt="Doc Back" className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold gap-1 transition-all">
                        <ExternalLink className="w-4 h-4" /> Open Full
                      </div>
                    </a>
                  </div>
                )}

                {docsModalData.selfie_url && (
                  <div className="space-y-1">
                    <span className="text-zinc-400 font-bold">Verification Selfie</span>
                    <a href={docsModalData.selfie_url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 aspect-video relative group">
                      <img src={docsModalData.selfie_url} alt="Selfie" className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold gap-1 transition-all">
                        <ExternalLink className="w-4 h-4" /> Open Full
                      </div>
                    </a>
                  </div>
                )}

                {docsModalData.payment_proof_url && (
                  <div className="space-y-1">
                    <span className="text-zinc-400 font-bold">Payment Receipt / Proof</span>
                    <a href={docsModalData.payment_proof_url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 aspect-video relative group">
                      <img src={docsModalData.payment_proof_url} alt="Payment Proof" className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold gap-1 transition-all">
                        <ExternalLink className="w-4 h-4" /> Open Full
                      </div>
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-zinc-800">
              <button
                onClick={() => setDocsModalData(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl"
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Reject & Refund Modal */}
      {rejectModalData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" /> Reject Verification Request
              </h2>
              <button onClick={() => setRejectModalData(null)} className="text-zinc-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Rejection Reason</label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this KYC or payment proof was rejected..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="refundCheck"
                  checked={markRefunded}
                  onChange={(e) => setMarkRefunded(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-900 border-zinc-800 text-blue-600 focus:ring-0"
                />
                <label htmlFor="refundCheck" className="text-xs text-zinc-300 font-bold select-none cursor-pointer">
                  Mark as Refunded (Return coin cost / payment)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setRejectModalData(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-900/40"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
