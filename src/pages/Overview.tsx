import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users,
  DollarSign,
  CreditCard,
  Trash2,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Bell,
  Settings,
  LifeBuoy,
  ShieldCheck,
  Activity,
  Globe,
  Layers,
  CheckCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Overview: React.FC = () => {
  const [userCount, setUserCount] = useState<number>(0);
  const [postCount, setPostCount] = useState<number>(0);
  const [reelCount, setReelCount] = useState<number>(0);
  const [pendingPayouts, setPendingPayouts] = useState<number>(0);
  const [pendingApps, setPendingApps] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { count: users } = await supabase.from('app_users').select('*', { count: 'exact', head: true });
      const { count: posts } = await supabase.from('posts').select('*', { count: 'exact', head: true });
      const { count: reels } = await supabase.from('reels').select('*', { count: 'exact', head: true });
      const { count: payouts } = await supabase.from('creator_payouts').select('*', { count: 'exact', head: true }).eq('status', 'PENDING');
      let { count: apps } = await supabase.from('creator_applications').select('*', { count: 'exact', head: true }).eq('status', 'PENDING');
      if (apps === null || apps === 0) {
        const { count: legacyApps } = await supabase.from('monetization_applications').select('*', { count: 'exact', head: true }).eq('status', 'PENDING');
        apps = legacyApps || 0;
      }

      setUserCount(users || 0);
      setPostCount(posts || 0);
      setReelCount(reels || 0);
      setPendingPayouts(payouts || 0);
      setPendingApps(apps || 0);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Registered Users', value: userCount, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { title: 'Total Published Posts', value: postCount, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { title: 'Total Reels Uploaded', value: reelCount, icon: Sparkles, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { title: 'Pending Cashout Requests', value: pendingPayouts, icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Pending Creator Applications', value: pendingApps, icon: DollarSign, color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
  ];

  const adminNavSections = [
    { title: 'Users & Roles', desc: 'Manage user roles, ban/unban, edit coins & granular permissions.', link: '/users', icon: Users, color: 'text-purple-400' },
    { title: 'AdMob & Revenue', desc: 'Record revenue, creator pool splits & review creator applications.', link: '/monetization', icon: DollarSign, color: 'text-emerald-400' },
    { title: 'Payouts & Cashouts', desc: 'Process bKash/Nagad/Rocket withdrawal requests & toggle payout access.', link: '/payouts', icon: CreditCard, color: 'text-yellow-400' },
    { title: 'Content Moderation', desc: 'Review, delete & warn reported posts, reels, stories & comments.', link: '/moderation', icon: ShieldAlert, color: 'text-red-400' },
    { title: 'Notifications & Push', desc: 'Send broadcast push notifications & manage in-app announcements.', link: '/notifications', icon: Bell, color: 'text-pink-400' },
    { title: 'App Settings & Config', desc: 'Maintenance mode, force update, registration switch & feature flags.', link: '/settings', icon: Settings, color: 'text-blue-400' },
    { title: 'Support & Tickets', desc: 'Review user complaints, bug reports & respond to support tickets.', link: '/support', icon: LifeBuoy, color: 'text-orange-400' },
    { title: 'Security & Audit Logs', desc: 'Audit admin staff activity logs & security session monitoring.', link: '/security', icon: ShieldCheck, color: 'text-purple-400' },
    { title: 'System Monitoring', desc: 'Monitor database status, API latency & storage bucket usage.', link: '/health', icon: Activity, color: 'text-emerald-400' },
    { title: 'Website & SEO', desc: 'Edit public landing page content, hero banner & meta SEO tags.', link: '/website', icon: Globe, color: 'text-cyan-400' },
    { title: 'Pages & Groups', desc: 'Manage user brand pages, group reports & page verification badges.', link: '/pages-groups', icon: Layers, color: 'text-indigo-400' },
    { title: 'Storage & DB Clean', desc: 'Clean broken media, clear chat logs/stories & DB reset slate.', link: '/storage', icon: Trash2, color: 'text-red-400' },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          Platform Overview & Web Control Hub <Sparkles className="w-6 h-6 text-purple-400" />
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Real-time ecosystem statistics & centralized web admin controls
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-[#141418] border border-zinc-800 rounded-xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-zinc-400">{stat.title}</span>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <div className="text-2xl font-black text-white">
                {loading ? '...' : stat.value.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Navigation Cards */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Web Admin Control Sections</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {adminNavSections.map((sec) => {
            const Icon = sec.icon;
            return (
              <Link
                key={sec.link}
                to={sec.link}
                className="bg-[#141418] hover:bg-zinc-800/80 border border-zinc-800 rounded-xl p-5 transition-all group shadow-lg"
              >
                <Icon className={`w-7 h-7 ${sec.color} mb-3 group-hover:scale-110 transition-transform`} />
                <h3 className="font-bold text-white text-base">{sec.title}</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{sec.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
