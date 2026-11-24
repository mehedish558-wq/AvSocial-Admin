import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BannedDeviceEntry, FraudFlag } from '../types/admin';
import { logAuditAction } from '../lib/audit';
import { ShieldAlert, Plus, Smartphone, Globe, Lock, Search, AlertOctagon, CheckCircle, Flame, UserX } from 'lucide-react';

export const DeviceBans: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DEVICE_BANS' | 'FRAUD_FIREWALL'>('DEVICE_BANS');
  const [bans, setBans] = useState<BannedDeviceEntry[]>([]);
  const [fraudFlags, setFraudFlags] = useState<FraudFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [identifierType, setIdentifierType] = useState<'DEVICE_ID' | 'IP_ADDRESS'>('DEVICE_ID');
  const [identifierValue, setIdentifierValue] = useState('');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: bansData } = await supabase
        .from('banned_devices')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: flagsData } = await supabase
        .from('fraud_flags')
        .select('*')
        .order('created_at', { ascending: false });

      setBans(bansData || []);
      setFraudFlags(flagsData || []);
    } catch (err) {
      console.error('Error fetching security data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifierValue.trim()) return;

    try {
      const newBan = {
        identifier_type: identifierType,
        identifier_value: identifierValue.trim(),
        reason: reason.trim() || 'Violation of terms',
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        created_at: new Date().toISOString(),
        banned_by: 'admin'
      };

      const { error } = await supabase.from('banned_devices').insert(newBan);
      if (error) throw error;

      await logAuditAction(
        'admin',
        'BAN_DEVICE_OR_IP',
        `${identifierType}: ${identifierValue}`,
        `Reason: ${reason}`
      );

      setStatusMsg({ type: 'success', text: `Successfully banned ${identifierType}: ${identifierValue}` });
      setShowModal(false);
      setIdentifierValue('');
      setReason('');
      setExpiresAt('');
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to ban device/IP' });
    }
  };

  const handleRemoveBan = async (ban: BannedDeviceEntry) => {
    if (!confirm(`Are you sure you want to remove ban on ${ban.identifier_type}: ${ban.identifier_value}?`)) return;
    try {
      const { error } = await supabase.from('banned_devices').delete().eq('id', ban.id);
      if (error) throw error;

      await logAuditAction(
        'admin',
        'REMOVE_DEVICE_OR_IP_BAN',
        `${ban.identifier_type}: ${ban.identifier_value}`,
        `Removed ban successfully`
      );

      setStatusMsg({ type: 'success', text: `Removed ban on ${ban.identifier_value}` });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to remove ban' });
    }
  };

  const handleFreezeWallet = async (handle: string) => {
    try {
      const { error } = await supabase.rpc('admin_toggle_user_chat_ban', {
        p_target_uid: handle,
        p_chat_banned: true
      });
      if (error) throw error;
      setStatusMsg({ type: 'success', text: `Frozen wallet and chat access for @${handle}` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to freeze wallet' });
    }
  };

  const handleDismissFlag = async (flagId: string) => {
    try {
      await supabase.from('fraud_flags').delete().eq('id', flagId);
      setStatusMsg({ type: 'success', text: `Dismissed fraud alert #${flagId}` });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to dismiss flag' });
    }
  };

  const filteredBans = bans.filter((b) => {
    const matchesType = typeFilter === 'ALL' || b.identifier_type === typeFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery = (b.identifier_value || '').toLowerCase().includes(q) || (b.reason || '').toLowerCase().includes(q);
    return matchesType && matchesQuery;
  });

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            Device Bans & Fraud Firewall <Lock className="w-6 h-6 text-red-400" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Permanently ban hardware device IDs/IPs and audit multi-account referral fraud rings
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-xl flex">
            <button
              onClick={() => setActiveTab('DEVICE_BANS')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'DEVICE_BANS' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Device & IP Bans
            </button>
            <button
              onClick={() => setActiveTab('FRAUD_FIREWALL')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'FRAUD_FIREWALL' ? 'bg-amber-600 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" /> Referral Fraud Firewall ({fraudFlags.length})
            </button>
          </div>

          {activeTab === 'DEVICE_BANS' && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-900/40 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Ban Device or IP
            </button>
          )}
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
          <button onClick={() => setStatusMsg(null)} className="text-xs underline font-bold">Dismiss</button>
        </div>
      )}

      {activeTab === 'DEVICE_BANS' ? (
        <>
          {/* Filter & Search Bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#141418] border border-zinc-800 p-4 rounded-xl">
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
              {['ALL', 'DEVICE_ID', 'IP_ADDRESS'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTypeFilter(tf)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    typeFilter === tf
                      ? 'bg-red-600 text-white shadow'
                      : 'text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800'
                  }`}
                >
                  {tf.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search device ID, IP or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                  <tr>
                    <th className="p-4">Type</th>
                    <th className="p-4">Identifier Value</th>
                    <th className="p-4">Ban Reason</th>
                    <th className="p-4">Expires At</th>
                    <th className="p-4">Banned By</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">Loading banned devices & IPs...</td>
                    </tr>
                  ) : filteredBans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">No active device or IP bans recorded matching filter.</td>
                    </tr>
                  ) : (
                    filteredBans.map((b) => (
                      <tr key={b.id} className="hover:bg-zinc-800/35 transition-colors">
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 w-fit">
                            {b.identifier_type === 'DEVICE_ID' ? <Smartphone className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                            {b.identifier_type}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-white text-sm">{b.identifier_value}</td>
                        <td className="p-4 text-zinc-300">{b.reason}</td>
                        <td className="p-4 font-mono text-zinc-400">{b.expires_at ? new Date(b.expires_at).toLocaleDateString() : 'Permanent'}</td>
                        <td className="p-4 text-zinc-400">@{b.banned_by || 'admin'}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleRemoveBan(b)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md"
                          >
                            Remove Ban
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Referral & Multi-Account Fraud Firewall */
        <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-amber-400" /> Multi-Account Referral Fraud Alerts
              </h2>
              <p className="text-xs text-zinc-400">Hardware fingerprint analysis flagging accounts created on identical hardware IDs</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="p-4">User Handle</th>
                  <th className="p-4">Risk Score</th>
                  <th className="p-4">Detected Reason</th>
                  <th className="p-4">Date Flagged</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {fraudFlags.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">No active referral fraud alerts detected. System secure ✓</td>
                  </tr>
                ) : (
                  fraudFlags.map((flag) => (
                    <tr key={flag.id} className="hover:bg-zinc-800/35 transition-colors">
                      <td className="p-4 font-bold text-purple-400">@{flag.user_handle}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30">
                          {flag.risk_score || 'HIGH'}
                        </span>
                      </td>
                      <td className="p-4 text-zinc-300">{flag.reason}</td>
                      <td className="p-4 text-zinc-400 font-mono">{new Date(flag.created_at).toLocaleString()}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleFreezeWallet(flag.user_handle)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg shadow-md"
                        >
                          Freeze Wallet
                        </button>
                        <button
                          onClick={() => handleDismissFlag(flag.id)}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-lg"
                        >
                          Dismiss
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateBan} className="bg-[#141418] border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-lg text-white">Permanently Ban Device or IP</h3>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Identifier Type</label>
              <select
                value={identifierType}
                onChange={(e) => setIdentifierType(e.target.value as any)}
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-bold"
              >
                <option value="DEVICE_ID">DEVICE_ID (Hardware Fingerprint)</option>
                <option value="IP_ADDRESS">IP_ADDRESS (Network IPv4/IPv6)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Value (Device ID or IP Address)</label>
              <input
                type="text"
                required
                value={identifierValue}
                onChange={(e) => setIdentifierValue(e.target.value)}
                placeholder="e.g. dev_998877 or 203.0.113.42"
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Ban Reason</label>
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Automated bot spam and referral farming"
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Expiry Date (Optional - Leave blank for Permanent)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl"
              >
                Apply Ban
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
