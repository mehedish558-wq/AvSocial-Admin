import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { logAuditAction } from '../lib/audit';
import { AppUser, UserRole } from '../types/admin';
import {
  Users as UsersIcon,
  Shield,
  Ban,
  Coins,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserPlus,
  Lock,
  MessageSquareOff,
  PhoneOff,
  X,
  Check,
  RefreshCw
} from 'lucide-react';

export const UsersOnly: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteHandle, setInviteHandle] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('MODERATOR');

  const [banUser, setBanUser] = useState<AppUser | null>(null);
  const [banReason, setBanReason] = useState('');

  const [coinsUser, setCoinsUser] = useState<AppUser | null>(null);
  const [coinAmount, setCoinAmount] = useState<number>(0);

  const [submittingBan, setSubmittingBan] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*');

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error('Error fetching users from Supabase:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to fetch users from database' });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanHandle = inviteHandle.replace('@', '');
      const { error: rpcErr } = await supabase.rpc('admin_onboard_staff', {
        p_name: inviteName,
        p_handle: cleanHandle,
        p_email: inviteEmail,
        p_role: inviteRole
      });

      if (rpcErr) {
        const newStaff: AppUser = {
          uid: 'u_' + Date.now(),
          name: inviteName,
          handle: cleanHandle,
          email: inviteEmail,
          role: inviteRole,
          is_banned: false,
          wallet_coins: 1000
        };
        const { error: insertErr } = await supabase.from('app_users').insert(newStaff);
        if (insertErr) throw insertErr;
      }

      await logAuditAction('admin', 'ONBOARD_STAFF', cleanHandle, `Onboarded staff member @${cleanHandle} as ${inviteRole}`);
      setStatusMsg({ type: 'success', text: `Staff account created for @${cleanHandle} as ${inviteRole}!` });
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
      setInviteHandle('');
      await fetchUsers();
    } catch (err: any) {
      console.error('Invite staff error:', err);
      setStatusMsg({ type: 'error', text: `Failed to onboard staff: ${err.message || err}` });
    }
  };

  const handleUpdateBan = async () => {
    if (!banUser) return;
    setStatusMsg(null);
    setModalError(null);
    setSubmittingBan(true);

    const shouldBan = !banUser.is_banned;
    const reasonText = shouldBan ? (banReason || 'Policy violation') : '';

    try {
      const { error: rpcErr } = await supabase.rpc('ban_user_rpc', {
        target_uid: banUser.uid,
        ban_status: shouldBan,
        reason: reasonText
      });

      if (rpcErr) {
        const { error: updateErr } = await supabase
          .from('app_users')
          .update({ is_banned: shouldBan, ban_reason: reasonText })
          .eq('uid', banUser.uid);
        if (updateErr) throw updateErr;
      }

      await logAuditAction('admin', shouldBan ? 'BAN_USER' : 'UNBAN_USER', banUser.handle || banUser.uid, `User @${banUser.handle} was ${shouldBan ? 'banned' : 'unbanned'}`);

      setStatusMsg({
        type: 'success',
        text: shouldBan ? `Successfully banned @${banUser.handle}` : `Successfully unbanned @${banUser.handle}`
      });
      setBanUser(null);
      setBanReason('');
      await fetchUsers();
    } catch (err: any) {
      console.error('Ban update error:', err);
      const errMsg = err?.message || String(err);
      setModalError(errMsg);
      setStatusMsg({ type: 'error', text: `Failed to update ban status: ${errMsg}` });
    } finally {
      setSubmittingBan(false);
    }
  };

  const handleToggleChatBan = async (user: AppUser) => {
    const newVal = !user.is_chat_banned;
    try {
      const { error: updateErr } = await supabase
        .from('app_users')
        .update({ is_chat_banned: newVal })
        .eq('uid', user.uid);
      if (updateErr) throw updateErr;

      await logAuditAction('admin', newVal ? 'CHAT_BLOCK_USER' : 'CHAT_UNBLOCK_USER', user.handle || user.uid, `Chat access ${newVal ? 'restricted' : 'restored'} for @${user.handle}`);
      setUsers(users.map(u => u.uid === user.uid ? { ...u, is_chat_banned: newVal } : u));
      setStatusMsg({ type: 'success', text: `Chat access ${newVal ? 'restricted' : 'restored'} for @${user.handle}` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update chat ban' });
    }
  };

  const handleToggleCallBan = async (user: AppUser) => {
    const newVal = !user.is_call_banned;
    try {
      const { error: updateErr } = await supabase
        .from('app_users')
        .update({ is_call_banned: newVal })
        .eq('uid', user.uid);
      if (updateErr) throw updateErr;

      await logAuditAction('admin', newVal ? 'CALL_BLOCK_USER' : 'CALL_UNBLOCK_USER', user.handle || user.uid, `Call access ${newVal ? 'restricted' : 'restored'} for @${user.handle}`);
      setUsers(users.map(u => u.uid === user.uid ? { ...u, is_call_banned: newVal } : u));
      setStatusMsg({ type: 'success', text: `Call access ${newVal ? 'restricted' : 'restored'} for @${user.handle}` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update call ban' });
    }
  };

  const handleUpdateCoins = async () => {
    if (!coinsUser) return;
    try {
      const { error: updateErr } = await supabase
        .from('app_users')
        .update({ wallet_coins: coinAmount })
        .eq('uid', coinsUser.uid);
      if (updateErr) throw updateErr;

      await logAuditAction('admin', 'UPDATE_COINS', coinsUser.handle || coinsUser.uid, `Updated coins balance for @${coinsUser.handle} to ${coinAmount}`);
      setUsers(users.map(u => u.uid === coinsUser.uid ? { ...u, wallet_coins: coinAmount } : u));
      setStatusMsg({ type: 'success', text: `Updated coins for @${coinsUser.handle} to ${coinAmount}` });
      setCoinsUser(null);
      await fetchUsers();
    } catch (err: any) {
      console.error('Coin update error:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update coins balance' });
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.handle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            Real App Users & Moderation <UsersIcon className="w-6 h-6 text-purple-400" />
          </h1>
          <p className="text-sm text-zinc-400">Managing registered users, account statuses, chat/call restrictions, and bans.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchUsers}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Users
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-900/40 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Onboard Staff Member
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-bold ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => statusMsg && setStatusMsg(null)} className="underline font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Search Input */}
      <div className="flex justify-end">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name, @handle or email..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-700/80 rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
              <tr>
                <th className="p-4">User Details</th>
                <th className="p-4">Role Tier</th>
                <th className="p-4">Status & Restrictions</th>
                <th className="p-4">Coins Balance</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">
                    Loading users from Supabase...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">
                    No registered users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">{u.name || 'User'}</div>
                      <div className="text-zinc-400 font-mono">@{u.handle}</div>
                      <div className="text-zinc-500 text-[11px]">{u.email}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-md text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {u.role || 'USER'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {u.is_banned ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Banned
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        )}
                        {u.is_chat_banned && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                            <MessageSquareOff className="w-3 h-3" /> Chat Banned
                          </span>
                        )}
                        {u.is_call_banned && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            <PhoneOff className="w-3 h-3" /> Call Banned
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-yellow-400">
                      🪙 {u.wallet_coins || 0}
                    </td>
                    <td className="p-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleToggleChatBan(u)}
                        className={`p-1.5 rounded-lg border ${
                          u.is_chat_banned
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                            : 'bg-orange-500/10 text-orange-300 border-orange-500/20'
                        }`}
                        title={u.is_chat_banned ? 'Restore Chat Access' : 'Restrict Chat (Chat Ban)'}
                      >
                        <MessageSquareOff className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleToggleCallBan(u)}
                        className={`p-1.5 rounded-lg border ${
                          u.is_call_banned
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        }`}
                        title={u.is_call_banned ? 'Restore Call Access' : 'Restrict Calls (Call Ban)'}
                      >
                        <PhoneOff className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setCoinsUser(u);
                          setCoinAmount(u.wallet_coins || 0);
                        }}
                        className="p-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 rounded-lg border border-yellow-500/20"
                        title="Edit Coins Balance"
                      >
                        <Coins className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setBanUser(u);
                          setBanReason(u.ban_reason || '');
                          setModalError(null);
                        }}
                        className={`p-1.5 rounded-lg border ${
                          u.is_banned
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20'
                            : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border-orange-500/20'
                        }`}
                        title={u.is_banned ? 'Unban User' : 'Ban User'}
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ONBOARD STAFF MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-400" /> Onboard Staff Member
            </h2>
            <form onSubmit={handleInviteStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Handle (@username)</label>
                <input
                  type="text"
                  required
                  value={inviteHandle}
                  onChange={(e) => setInviteHandle(e.target.value)}
                  placeholder="sarah_admin"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="sarah@avsocial.app"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Staff Role Tier</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="MODERATOR">MODERATOR</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-900/40"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BAN MODAL */}
      {banUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-400" />
              {banUser.is_banned ? `Unban @${banUser.handle}?` : `Ban @${banUser.handle}?`}
            </h2>

            {!banUser.is_banned && (
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Reason for Ban</label>
                <input
                  type="text"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="e.g. Hate speech / Spamming"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            )}

            {modalError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl font-bold">
                {modalError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setBanUser(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={submittingBan}
                onClick={handleUpdateBan}
                className={`px-5 py-2 text-white font-bold text-xs rounded-xl shadow-lg ${
                  banUser.is_banned ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {submittingBan ? 'Processing...' : (banUser.is_banned ? 'Confirm Unban' : 'Confirm Ban')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COINS MODAL */}
      {coinsUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              Update Wallet Coins for @{coinsUser.handle}
            </h2>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">New Coin Balance</label>
              <input
                type="number"
                value={coinAmount}
                onChange={(e) => setCoinAmount(parseInt(e.target.value) || 0)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setCoinsUser(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCoins}
                className="px-5 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-xs rounded-xl shadow-lg"
              >
                Save Coins
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
