import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { logAuditAction } from '../lib/audit';
import { ShieldCheck, Check, X, Save, RefreshCw } from 'lucide-react';

interface PermissionActions {
  view: boolean;
  edit: boolean;
  approve: boolean;
  delete: boolean;
}

interface PermissionRow {
  module: string;
  key: string;
  admin: PermissionActions;
  manager: PermissionActions;
  moderator: PermissionActions;
}

export const RoleMatrix: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'manager' | 'moderator'>('manager');
  const [permissions, setPermissions] = useState<PermissionRow[]>([
    { module: 'User Reports & Content Moderation', key: 'moderation', admin: { view: true, edit: true, approve: true, delete: true }, manager: { view: true, edit: true, approve: true, delete: true }, moderator: { view: true, edit: true, approve: true, delete: true } },
    { module: 'Ban Appeals & Device/IP Bans', key: 'bans', admin: { view: true, edit: true, approve: true, delete: true }, manager: { view: true, edit: true, approve: true, delete: false }, moderator: { view: true, edit: true, approve: true, delete: false } },
    { module: 'Social Features, Pages, Groups & Reels', key: 'social', admin: { view: true, edit: true, approve: true, delete: true }, manager: { view: true, edit: true, approve: true, delete: true }, moderator: { view: true, edit: true, approve: true, delete: true } },
    { module: 'AdMob Revenue & Creator Monetization', key: 'monetization', admin: { view: true, edit: true, approve: true, delete: true }, manager: { view: true, edit: true, approve: true, delete: false }, moderator: { view: false, edit: false, approve: false, delete: false } },
    { module: 'Deposit Reconciler & Payouts Cashouts', key: 'payouts', admin: { view: true, edit: true, approve: true, delete: true }, manager: { view: true, edit: true, approve: true, delete: false }, moderator: { view: false, edit: false, approve: false, delete: false } },
    { module: 'Ad Review & Boosted Posts Queue', key: 'ad_review', admin: { view: true, edit: true, approve: true, delete: true }, manager: { view: true, edit: true, approve: true, delete: false }, moderator: { view: false, edit: false, approve: false, delete: false } },
    { module: 'Wallet Ledger & Financial Gateways', key: 'wallet', admin: { view: true, edit: true, approve: true, delete: true }, manager: { view: true, edit: true, approve: true, delete: false }, moderator: { view: false, edit: false, approve: false, delete: false } },
    { module: 'Security Audit Logs & Fraud Firewall', key: 'security', admin: { view: true, edit: false, approve: true, delete: false }, manager: { view: false, edit: false, approve: false, delete: false }, moderator: { view: false, edit: false, approve: false, delete: false } },
    { module: 'App Settings, Version Control & DB Clean', key: 'settings', admin: { view: true, edit: true, approve: true, delete: true }, manager: { view: false, edit: false, approve: false, delete: false }, moderator: { view: false, edit: false, approve: false, delete: false } },
    { module: 'Role & Permission Matrix Control', key: 'role_matrix', admin: { view: false, edit: false, approve: false, delete: false }, manager: { view: false, edit: false, approve: false, delete: false }, moderator: { view: false, edit: false, approve: false, delete: false } },
  ]);

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const { data } = await supabase.from('app_settings').select('settings_json').eq('key', 'role_permissions_matrix').maybeSingle();
      if (data?.settings_json) {
        const parsed = (data.settings_json as any[])
          .filter(item => item.key !== 'overview' && item.key !== 'users')
          .map(item => ({
            ...item,
            manager: item.manager || item.financeManager || { view: false, edit: false, approve: false, delete: false }
          }));
        setPermissions(parsed);
      }
    } catch (err) {
      console.error('Error loading permissions:', err);
    }
  };

  const handleToggle = (rowIndex: number, action: keyof PermissionActions) => {
    const updated = [...permissions];
    updated[rowIndex][selectedRole][action] = !updated[rowIndex][selectedRole][action];
    setPermissions(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      await supabase.from('app_settings').upsert({
        key: 'role_permissions_matrix',
        settings_json: permissions,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

      await logAuditAction(
        'super_admin',
        'UPDATE_ROLE_PERMISSIONS',
        'RBAC Matrix',
        `Updated granular role permissions matrix for ${selectedRole.toUpperCase()}`
      );

      setStatusMsg({ type: 'success', text: `Permissions for ${selectedRole.toUpperCase()} saved and applied successfully!` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save permissions' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            Role & Permission Matrix Control <ShieldCheck className="w-6 h-6 text-purple-400" />
          </h1>
          <p className="text-sm text-zinc-400">Category 1 (Overview & Analytics) is strictly reserved for Super Admin and excluded here. Configure permissions for Categories 2–5 below.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-900/40 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : `Save ${selectedRole.toUpperCase()} Permissions`}
        </button>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold border ${statusMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
          {statusMsg.text}
        </div>
      )}

      {/* Role Selector Tabs (Super Admin selects role to configure) */}
      <div className="flex items-center gap-3 bg-[#141418] p-3 rounded-xl border border-zinc-800">
        <span className="text-xs font-bold text-zinc-400 px-2">Select Role to Edit:</span>
        {(['admin', 'manager', 'moderator'] as const).map(role => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${
              selectedRole === role
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {role}
          </button>
        ))}
      </div>

      {/* Role Tier Legend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { role: 'ADMIN', desc: 'Configurable administrative control over users, moderation, social features, and finance.', color: 'border-blue-500/40 bg-blue-950/20 text-blue-400' },
          { role: 'MANAGER', desc: 'Operational & financial control over monetization, deposits, payouts, and core moderation.', color: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400' },
          { role: 'MODERATOR', desc: 'Access limited strictly to Users & Moderation and Social Features.', color: 'border-pink-500/40 bg-pink-950/20 text-pink-400' },
        ].map((tier, i) => (
          <div key={i} className={`p-5 rounded-xl border ${tier.color} space-y-2 shadow-lg`}>
            <span className="text-xs font-black px-2 py-0.5 rounded bg-black/30 border border-current">
              {tier.role}
            </span>
            <p className="text-xs text-zinc-300 leading-relaxed">{tier.desc}</p>
          </div>
        ))}
      </div>

      {/* Interactive Matrix Table for Selected Role */}
      <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-black uppercase text-purple-400 tracking-wider">
            Configuring Permissions for: {selectedRole.toUpperCase()}
          </span>
          <span className="text-[11px] text-zinc-500">Category 1 modules are Super Admin exclusive and hidden from permission assignment</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/30 text-xs font-bold text-zinc-400">
                <th className="p-4">Administrative Module</th>
                <th className="p-4 text-center">View</th>
                <th className="p-4 text-center">Edit</th>
                <th className="p-4 text-center">Approve</th>
                <th className="p-4 text-center">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-xs text-zinc-300">
              {permissions.map((p, rowIndex) => {
                const currentActions = p[selectedRole];
                return (
                  <tr key={p.key} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="p-4 font-bold text-white">{p.module}</td>
                    {(['view', 'edit', 'approve', 'delete'] as const).map(action => (
                      <td key={action} className="p-4 text-center">
                        <button
                          onClick={() => handleToggle(rowIndex, action)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all ${
                            currentActions[action] ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-900/40' : 'bg-zinc-800 text-zinc-600'
                          }`}
                        >
                          {currentActions[action] ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </button>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
