import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  BarChart3,
  Users,
  Shield,
  TrendingUp,
  Sparkles,
  ShieldAlert,
  DollarSign,
  CreditCard,
  RefreshCw
} from 'lucide-react';

export const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeStaff, setActiveStaff] = useState(0);
  const [totalPostsReels, setTotalPostsReels] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [totalAdRevenueUsd, setTotalAdRevenueUsd] = useState(0);
  const [pendingPayoutsBdt, setPendingPayoutsBdt] = useState(0);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // 1. Total Users
      const { count: userCount } = await supabase
        .from('app_users')
        .select('*', { count: 'exact', head: true });
      setTotalUsers(userCount || 0);

      // 2. Active Staff (ADMIN, MANAGER, MODERATOR)
      const { count: staffCount } = await supabase
        .from('app_users')
        .select('*', { count: 'exact', head: true })
        .in('role', ['ADMIN', 'MANAGER', 'MODERATOR', 'SUPER_ADMIN']);
      setActiveStaff(staffCount || 0);

      // 3. Total Posts & Reels
      const { count: postCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });
      const { count: reelCount } = await supabase
        .from('reels')
        .select('*', { count: 'exact', head: true });
      setTotalPostsReels((postCount || 0) + (reelCount || 0));

      // 4. Pending Reports
      let { count: reportCount } = await supabase
        .from('reported_content')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING');
      if (reportCount === null) {
        const { count: pluralCount } = await supabase
          .from('reported_contents')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'PENDING');
        reportCount = pluralCount || 0;
      }
      setPendingReports(reportCount || 0);

      // 5. Total Ad Revenue USD
      const { data: revData } = await supabase
        .from('ad_revenue_entries')
        .select('gross_revenue_usd');
      const sumRevenue = (revData || []).reduce((acc, curr) => acc + (Number(curr.gross_revenue_usd) || 0), 0);
      setTotalAdRevenueUsd(sumRevenue);

      // 6. Pending Payouts BDT
      const { data: payoutData } = await supabase
        .from('creator_payouts')
        .select('amount_bdt, status')
        .eq('status', 'PENDING');
      const sumPayouts = (payoutData || []).reduce((acc, curr) => acc + (Number(curr.amount_bdt) || 0), 0);
      setPendingPayoutsBdt(sumPayouts);

    } catch (err) {
      console.error('Error fetching analytics metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      title: 'Total Registered Users',
      value: totalUsers.toLocaleString(),
      icon: Users,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20'
    },
    {
      title: 'Active Staff Members',
      value: activeStaff.toLocaleString(),
      icon: Shield,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20'
    },
    {
      title: 'Total Posts & Reels Published',
      value: totalPostsReels.toLocaleString(),
      icon: TrendingUp,
      color: 'text-pink-400',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20'
    },
    {
      title: 'Pending Content Reports',
      value: pendingReports.toLocaleString(),
      icon: ShieldAlert,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20'
    },
    {
      title: 'Total Ad Revenue (USD)',
      value: `$${totalAdRevenueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20'
    },
    {
      title: 'Pending Payouts (BDT)',
      value: `৳${pendingPayoutsBdt.toLocaleString()}`,
      icon: CreditCard,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20'
    }
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            Analytics & Growth Insights <BarChart3 className="w-6 h-6 text-purple-400" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time platform metrics, user engagement, ad revenue and payout obligations
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Metrics
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`bg-[#141418] border ${card.border} rounded-2xl p-6 shadow-xl flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {card.title}
                </span>
                <div className={`p-3 rounded-xl ${card.bg}`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
              <div className="text-3xl font-black text-white tracking-tight">
                {loading ? <span className="text-zinc-600 animate-pulse">Loading...</span> : card.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
