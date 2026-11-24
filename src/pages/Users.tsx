import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { logAuditAction } from '../lib/audit';
import { AppUser, UserRole } from '../types/admin';
import {
  Users as UsersIcon,
  Shield,
  Ban,
  Sliders,
  Coins,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserPlus,
  Lock,
  MessageSquareOff,
  PhoneOff,
  X,
  Check
} from 'lucide-react';

const ALL_SIDEBAR_CATEGORIES = [
  {
    title: '1. Users & Moderation',
    items: [
      { name: 'Users', path: '/users' },
      { name: 'Moderation', path: '/moderation' },
      { name: 'AI Auto-Moderation', path: '/ai-moderation' },
      { name: 'DM & Chat Safety', path: '/chat-safety' },
      { name: 'Appeal & Unban Requests', path: '/ban-appeals' },
      { name: 'Bad Words Filter', path: '/bad-words' },
      { name: 'Device & IP Bans', path: '/device-bans' }
    ]
  },
  {
    title: '2. Social Features',
    items: [
      { name: 'Pages & Groups', path: '/pages-groups' },
      { name: 'Reels & Live Monitor', path: '/reels-live' },
      { name: 'Reels Audio & Copyright', path: '/copyright-audio' },
      { name: 'Verification Badges', path: '/verification' },
      { name: 'Support & Tickets', path: '/support' }
    ]
  },
  {
    title: '3. Monetization & Ads',
    items: [
      { name: 'AdMob Monetization', path: '/monetization' },
      { name: 'Creator Applications & Review', path: '/creator-applications' },
      { name: 'Ad Review Queue', path: '/ad-review' },
      { name: 'Boosted Posts & Ads', path: '/boosted-posts' },
      { name: 'Payment Gateways & Rates', path: '/payment-gateways' },
      { name: 'Rewards & Exchange Rates', path: '/rewards' }
    ]
  },
  {
    title: '4. Revenue & Earnings',
    items: [
      { name: 'Revenue Reports & Settle', path: '/revenue' },
      { name: 'Deposit Reconciler', path: '/deposits' },
      { name: 'Payouts & Cashouts', path: '/payouts' },
      { name: 'Wallet & Ledger History', path: '/wallet-ledger' }
    ]
  },
  {
    title: '5. System & Security',
    items: [
      { name: 'Feed Algorithm & Tags', path: '/feed-algorithm' },
      { name: 'Legal & GDPR Requests', path: '/legal-compliance' },
      { name: 'Referral Fraud Firewall', path: '/fraud-firewall' },
      { name: 'Fraud Red Flags & Logs', path: '/fraud-flags' },
      { name: 'Security & Audit Logs', path: '/security' },
      { name: 'App Version Control', path: '/app-version-control' },
      { name: 'Storage Media Browser', path: '/media-browser' },
      { name: 'Storage & DB Clean', path: '/storage' },
      { name: 'Notifications & Push', path: '/notifications' },
      { name: 'Website & SEO', path: '/website' },
      { name: 'App Settings & Config', path: '/settings' },
      { name: 'System Monitoring', path: '/health' }
    ]
  }
];

export const Users: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteHandle, setInviteHandle] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('MODERATOR');

  const [editingRoleUser, setEditingRoleUser] = useState<AppUser | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('USER');

  const [banUser, setBanUser] = useState<AppUser | null>(null);
  const [banReason, setBanReason] = useState('');

  const [coinsUser, setCoinsUser] = useState<AppUser | null>(null);
  const [coinAmount, setCoinAmount] = useState<number>(0);

  const [deleteUser, setDeleteUser] = useState<AppUser | null>(null);

  // Custom Sub-Option Permissions Modal State
  const [selectedStaffForPerms, setSelectedStaffForPerms] = useState<AppUser | null>(null);
  const [permsRole, setPermsRole] = useState<UserRole>('MODERATOR');
  const [staffPermissionsMap, setStaffPermissionsMap] = useState<Record<string, boolean>>({});

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

  const handleUpdateRole = async () => {
    if (!editingRoleUser) return;
    setStatusMsg(null);
    try {
      const { error: rpcErr } = await supabase.rpc('admin_update_user_role', {
        p_target_uid: editingRoleUser.uid,
        p_new_role: newRole
      });

      if (rpcErr) {
        const { error: updateErr } = await supabase
          .from('app_users')
          .update({ role: newRole })
          .eq('uid', editingRoleUser.uid);
        if (updateErr) throw updateErr;
      }

      setUsers(users.map(u => u.uid === editingRoleUser.uid ? { ...u, role: newRole } : u));
      setStatusMsg({ type: 'success', text: `Successfully updated role for @${editingRoleUser.handle} to ${newRole}` });
      setEditingRoleUser(null);
      await fetchUsers();
    } catch (err: any) {
      console.error('Role update error:', err);
      setStatusMsg({ type: 'error', text: `Failed to update role: ${err.message || err}` });
    }
  };

  const [submittingBan, setSubmittingBan] = useState(false);
  const [submittingDelete, setSubmittingDelete] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

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

      setUsers(users.map(u => u.uid === coinsUser.uid ? { ...u, wallet_coins: coinAmount } : u));
      setStatusMsg({ type: 'success', text: `Updated coins for @${coinsUser.handle} to ${coinAmount}` });
      setCoinsUser(null);
      await fetchUsers();
    } catch (err: any) {
      console.error('Coin update error:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update coins balance' });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setStatusMsg(null);
    setModalError(null);
    setSubmittingDelete(true);

    try {
      const { error: deleteErr } = await supabase
        .from('app_users')
        .delete()
        .eq('uid', deleteUser.uid);

      if (deleteErr) throw deleteErr;

      setStatusMsg({
        type: 'success',
        text: `Successfully deleted user @${deleteUser.handle}`
      });
      setDeleteUser(null);
      await fetchUsers();
    } catch (err: any) {
      console.error('Delete user error:', err);
      const errMsg = err?.message || String(err);
      setModalError(errMsg);
      setStatusMsg({ type: 'error', text: `Failed to delete user: ${errMsg}` });
    } finally {
      setSubmittingDelete(false);
    }
  };

  const handleSaveCustomPermissions = async () => {
    if (!selectedStaffForPerms) return;
    setStatusMsg(null);
    try {
      const { error } = await supabase
        .from('app_users')
        .update({
          custom_permissions: staffPermissionsMap,
          role: permsRole
        })
        .eq('uid', selectedStaffForPerms.uid);

      if (error) throw error;

      await logAuditAction(
        'admin',
        'UPDATE_STAFF_CUSTOM_PERMISSIONS',
        `@${selectedStaffForPerms.handle}`,
        `Updated custom sub-option permissions and role tier (${permsRole})`
      );

      setStatusMsg({ type: 'success', text: `Successfully updated permissions and access for @${selectedStaffForPerms.handle}` });
      setSelectedStaffForPerms(null);
      await fetchUsers();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save custom permissions' });
    }
  };

  const handleRoleTierChangeInModal = (newRoleVal: UserRole) => {
    setPermsRole(newRoleVal);
  };

  const handleSelectAllPermissions = (select: boolean) => {
    const updated: Record<string, boolean> = {};
    ALL_SIDEBAR_CATEGORIES.forEach(cat => {
      cat.items.forEach(item => {
        updated[item.path] = select;
      });
    });
    setStaffPermissionsMap(updated);
  };

  const filteredUsers = users.filter((u) => {
    const matchesFilter =
      selectedRoleFilter === 'ALL' || (u.role || 'USER').toUpperCase() === selectedRoleFilter;
    const matchesSearch =
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.handle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            Real App Users & Abuse Control <Shield className="w-6 h-6 text-purple-400" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Managing registered users, role tiers, chat/call restrictions and account bans from Supabase
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchUsers}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl"
          >
            Refresh Real Users
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

      {/* Role Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex space-x-2 overflow-x-auto pb-2 md:pb-0">
          {['ALL', 'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MODERATOR', 'USER'].map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedRoleFilter === role
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {role.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search real users by name, @handle or email..."
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
                    Loading real app users from Supabase...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">
                    No registered users found in Supabase table `app_users`.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isStaff = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MODERATOR'].includes((u.role || '').toUpperCase());
                  return (
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
                        {isStaff && (
                          <button
                            onClick={() => {
                              setSelectedStaffForPerms(u);
                              const initialRole = (u.role || 'MODERATOR') as UserRole;
                              setPermsRole(initialRole);
                              const currentPerms = u.custom_permissions || {};
                              const initial: Record<string, boolean> = {};
                              ALL_SIDEBAR_CATEGORIES.forEach(cat => {
                                cat.items.forEach(item => {
                                  initial[item.path] = currentPerms[item.path] === true;
                                });
                              });
                              setStaffPermissionsMap(initial);
                            }}
                            className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/20"
                            title="Custom Sub-Option Permissions"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>
                        )}

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
                            setEditingRoleUser(u);
                            setNewRole((u.role || 'USER') as UserRole);
                          }}
                          className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-lg border border-purple-500/20"
                          title="Change Role Tier"
                        >
                          <Shield className="w-4 h-4" />
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

                        <button
                          onClick={() => {
                            setDeleteUser(u);
                            setModalError(null);
                          }}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20"
                          title="Permanently Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CUSTOM SUB-OPTION PERMISSIONS MODAL */}
      {selectedStaffForPerms && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl w-full max-w-3xl p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-purple-400" /> Custom Sub-Option Access & Permissions
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">Staff Member: <strong className="text-white">@{selectedStaffForPerms.handle}</strong> ({selectedStaffForPerms.name})</p>
              </div>
              <button onClick={() => setSelectedStaffForPerms(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Base Role Tier</label>
                  <select
                    value={permsRole}
                    onChange={(e) => handleRoleTierChangeInModal(e.target.value as UserRole)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-purple-500"
                  >
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="MODERATOR">MODERATOR</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2 pt-2 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => handleSelectAllPermissions(true)}
                    className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-bold"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAllPermissions(false)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-xs font-bold"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <p className="text-[11px] text-zinc-400 italic">Check ONLY the options you want to grant to this staff member. Granted options will appear in serial order (1, 2, 3...) when they log into the Admin Panel:</p>
                {ALL_SIDEBAR_CATEGORIES.map((cat, idx) => (
                  <div key={idx} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-400">{cat.title}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {cat.items.map((sub) => {
                        const isGranted = staffPermissionsMap[sub.path] === true;
                        return (
                          <label
                            key={sub.path}
                            className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                              isGranted ? 'bg-purple-950/20 border-purple-500/30 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                            }`}
                          >
                            <span className="text-xs font-medium">{sub.name}</span>
                            <input
                              type="checkbox"
                              checked={isGranted}
                              onChange={(e) => {
                                setStaffPermissionsMap({
                                  ...staffPermissionsMap,
                                  [sub.path]: e.target.checked
                                });
                              }}
                              className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedStaffForPerms(null)}
                  className="px-5 py-2.5 bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomPermissions}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                >
                  Save Permissions & Access
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ONBOARD STAFF MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleInviteStaff} className="bg-[#141418] border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-lg text-white">Onboard Staff Member</h3>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Full Name</label>
              <input type="text" required value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="John Doe" className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Handle (@username)</label>
              <input type="text" required value={inviteHandle} onChange={(e) => setInviteHandle(e.target.value)} placeholder="john_admin" className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Email Address</label>
              <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="john@avsocial.com" className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Staff Role Tier</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)} className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-bold">
                <option value="ADMIN">ADMIN</option>
                <option value="MANAGER">MANAGER</option>
                <option value="MODERATOR">MODERATOR</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button type="button" onClick={() => setShowInviteModal(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl">Create Staff Account</button>
            </div>
          </form>
        </div>
      )}

      {/* CHANGE ROLE MODAL */}
      {editingRoleUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-lg text-white">Change Primary Role Tier</h3>
            <p className="text-xs text-zinc-400">Target user: @{editingRoleUser.handle}</p>
            <div className="space-y-2">
              {['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MODERATOR', 'USER'].map((r) => (
                <label
                  key={r}
                  className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer hover:border-purple-500"
                >
                  <span className="text-xs font-bold text-white">{r}</span>
                  <input
                    type="radio"
                    name="role"
                    checked={newRole === r}
                    onChange={() => setNewRole(r as UserRole)}
                    className="accent-purple-600"
                  />
                </label>
              ))}
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setEditingRoleUser(null)}
                className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRole}
                className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BAN MODAL */}
      {banUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-lg text-white">
              {banUser.is_banned ? 'Unban User' : 'Ban User Account'}
            </h3>
            <p className="text-xs text-zinc-400">Target user: @{banUser.handle}</p>
            {modalError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold">
                {modalError}
              </div>
            )}
            {!banUser.is_banned && (
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Reason for Ban</label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  disabled={submittingBan}
                  placeholder="e.g. Violation of community guidelines..."
                  className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs disabled:opacity-50"
                />
              </div>
            )}
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => { setBanUser(null); setModalError(null); }}
                disabled={submittingBan}
                className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl hover:bg-zinc-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateBan}
                disabled={submittingBan}
                className={`px-4 py-2 text-white text-xs font-bold rounded-xl disabled:opacity-50 ${
                  banUser.is_banned ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {submittingBan ? 'Processing...' : `Confirm ${banUser.is_banned ? 'Unban' : 'Ban'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT COINS MODAL */}
      {coinsUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-lg text-white">Edit Wallet Coins Balance</h3>
            <p className="text-xs text-zinc-400">Target user: @{coinsUser.handle}</p>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Total Coins</label>
              <input
                type="number"
                value={coinAmount}
                onChange={(e) => setCoinAmount(Number(e.target.value))}
                className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm font-mono font-bold"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setCoinsUser(null)}
                className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCoins}
                className="px-4 py-2 bg-yellow-600 text-white text-xs font-bold rounded-xl"
              >
                Update Coins
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE USER MODAL */}
      {deleteUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#141418] border border-red-500/30 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center space-x-3 text-red-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-lg text-white">Delete User Account</h3>
            </div>
            <p className="text-xs text-zinc-400">
              Are you sure you want to permanently delete user <strong className="text-white">@{deleteUser.handle}</strong>? This action cannot be undone.
            </p>
            {modalError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold">
                {modalError}
              </div>
            )}
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => { setDeleteUser(null); setModalError(null); }}
                disabled={submittingDelete}
                className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl hover:bg-zinc-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={submittingDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl disabled:opacity-50"
              >
                {submittingDelete ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
