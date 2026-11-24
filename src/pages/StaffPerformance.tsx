import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { StaffPerformanceSummary, AuditLogEntry } from '../types/admin';
import { Award, Shield, CheckCircle, Users, Activity, RefreshCw } from 'lucide-react';

interface StaffDetailSummary extends StaffPerformanceSummary {
  name: string;
  role: string;
}

export const StaffPerformance: React.FC = () => {
  const [summaries, setSummaries] = useState<StaffDetailSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const { data: staffUsers } = await supabase
        .from('app_users')
        .select('uid, name, handle, role')
        .in('role', ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MODERATOR']);

      const staffMap: Record<string, { name: string; role: string }> = {};
      (staffUsers || []).forEach(u => {
        if (u.handle) {
          staffMap[u.handle.toLowerCase()] = {
            name: u.name || 'Staff Member',
            role: (u.role || 'ADMIN').toUpperCase()
          };
        }
      });

      const { data: auditLogs } = await supabase.from('audit_logs').select('*');
      const { data: activityLogs } = await supabase.from('admin_activity_logs').select('*');
      const { data: reportedContent } = await supabase.from('reported_contents').select('resolved_by, status, created_at');
      const { data: banAppeals } = await supabase.from('ban_appeals').select('reviewed_by, status, created_at');

      const map: Record<string, StaffDetailSummary> = {};

      Object.entries(staffMap).forEach(([handle, info]) => {
        map[handle] = {
          admin_handle: handle,
          name: info.name,
          role: info.role,
          moderation_count: 0,
          ban_count: 0,
          payout_review_count: 0,
          ticket_reply_count: 0,
          total_actions: 0
        };
      });

      const seenLogKeys = new Set<string>();

      const processLog = (handleRaw: string, actionRaw: string, key?: string) => {
        if (!handleRaw) return;
        const handle = handleRaw.toLowerCase().replace('@', '');
        if (key) {
          if (seenLogKeys.has(key)) return;
          seenLogKeys.add(key);
        }

        if (!map[handle]) {
          map[handle] = {
            admin_handle: handle,
            name: staffMap[handle]?.name || handle.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            role: staffMap[handle]?.role || 'STAFF',
            moderation_count: 0,
            ban_count: 0,
            payout_review_count: 0,
            ticket_reply_count: 0,
            total_actions: 0
          };
        }

        map[handle].total_actions += 1;
        const action = (actionRaw || '').toUpperCase();
        if (action.includes('BAN') || action.includes('SUSPEND') || action.includes('CHAT_BLOCK') || action.includes('SMS_BLOCK') || action.includes('UNBAN') || action.includes('CHAT_UNBLOCK') || action.includes('WARN')) {
          map[handle].ban_count += 1;
        } else if (action.includes('PAYOUT') || action.includes('MONETIZATION') || action.includes('DEPOSIT') || action.includes('REVENUE')) {
          map[handle].payout_review_count += 1;
        } else if (action.includes('TICKET') || action.includes('SUPPORT') || action.includes('APPEAL')) {
          map[handle].ticket_reply_count += 1;
        } else {
          map[handle].moderation_count += 1;
        }
      };

      (auditLogs || []).forEach(log => {
        const key = log.id ? `audit_${log.id}` : `audit_${log.admin_handle}_${log.action}_${log.created_at}`;
        processLog(log.admin_handle, log.action, key);
      });

      (activityLogs || []).forEach(log => {
        const key = log.id ? `activity_${log.id}` : `act_${log.admin_handle}_${log.action}_${log.created_at}`;
        processLog(log.admin_handle, log.action, key);
      });

      (reportedContent || []).forEach((r: any) => {
        if (r.resolved_by && r.resolved_by !== 'admin' && r.resolved_by !== 'system') {
          processLog(r.resolved_by, 'MODERATION_RESOLVE_REPORT', `report_${r.created_at}_${r.resolved_by}`);
        }
      });

      (banAppeals || []).forEach((a: any) => {
        if (a.reviewed_by && a.reviewed_by !== 'admin' && a.reviewed_by !== 'system') {
          processLog(a.reviewed_by, 'APPEAL_REVIEW', `appeal_${a.created_at}_${a.reviewed_by}`);
        }
      });

      const sorted = Object.values(map).sort((a, b) => b.total_actions - a.total_actions);
      setSummaries(sorted);
    } catch (err) {
      console.error('Error calculating staff performance:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            Staff Activity & Performance Tracker <Award className="w-6 h-6 text-purple-400" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Tracking individual staff members (Name, Username, Role) across Super Admin, Admin, Manager, and Moderator tiers.
          </p>
        </div>
        <button
          onClick={fetchPerformanceData}
          className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md self-start"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Performance Scorecards
        </button>
      </div>

      <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
              <tr>
                <th className="p-4">Staff Member (Name & Username)</th>
                <th className="p-4">Role Tier</th>
                <th className="p-4">Moderation Actions</th>
                <th className="p-4">Bans / Unbans / Chat Blocks</th>
                <th className="p-4">Payouts & Finance</th>
                <th className="p-4">Tickets & Appeals</th>
                <th className="p-4 text-right">Total Impact Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">Calculating staff performance scores...</td>
                </tr>
              ) : summaries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">No staff audit records found.</td>
                </tr>
              ) : (
                summaries.map((s, idx) => (
                  <tr key={s.admin_handle} className="hover:bg-zinc-800/35 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center text-xs font-mono flex-shrink-0">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-white text-sm">{s.name}</div>
                          <div className="text-zinc-400 font-mono text-[11px]">@{s.admin_handle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {s.role}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-purple-400 font-bold">{s.moderation_count}</td>
                    <td className="p-4 font-mono text-red-400 font-bold">{s.ban_count}</td>
                    <td className="p-4 font-mono text-emerald-400 font-bold">{s.payout_review_count}</td>
                    <td className="p-4 font-mono text-blue-400 font-bold">{s.ticket_reply_count}</td>
                    <td className="p-4 text-right font-mono font-black text-white text-sm">
                      ⭐ {s.total_actions}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
