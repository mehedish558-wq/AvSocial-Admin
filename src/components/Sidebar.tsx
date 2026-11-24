import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  CreditCard,
  Trash2,
  ShieldAlert,
  Gift,
  CheckCircle,
  Bell,
  Settings,
  LifeBuoy,
  ShieldCheck,
  Activity,
  Globe,
  Layers,
  LogOut,
  Sparkles,
  BarChart3,
  Megaphone,
  Lock,
  Award,
  Wallet,
  Flame,
  Database,
  AlertOctagon,
  Search,
  ChevronDown,
  ChevronRight,
  Flag,
  UserCheck,
  Video,
  Music,
  Sliders
} from 'lucide-react';

interface SidebarProps {
  currentRole: string;
  customPermissions?: Record<string, boolean>;
  onLogout: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: any;
  roles?: string[];
}

interface NavCategory {
  id: string;
  title: string;
  allowedRoles: string[]; // roles that can see this category
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ currentRole, customPermissions, onLogout }) => {
  const normalizedRole = (currentRole || 'SUPER_ADMIN').toUpperCase();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    cat1: true,
    cat2: true,
    cat3: true,
    cat4: true,
    cat5: true,
  });

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const navCategories: NavCategory[] = [
    {
      id: 'cat1',
      title: '0. Overview & Analytics',
      allowedRoles: ['SUPER_ADMIN'],
      items: [
        { name: 'Dashboard Overview', path: '/', icon: LayoutDashboard },
        { name: 'Users & Roles', path: '/users-roles', icon: Users },
        { name: 'Analytics & Growth', path: '/analytics', icon: BarChart3 },
        { name: 'Staff Performance', path: '/staff-performance', icon: Award },
      ]
    },
    {
      id: 'cat2',
      title: '1. Users & Moderation',
      allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'],
      items: [
        { name: 'Users', path: '/users', icon: Users },
        { name: 'Moderation', path: '/moderation', icon: ShieldAlert },
        { name: 'AI Auto-Moderation', path: '/ai-moderation', icon: Sparkles },
        { name: 'DM & Chat Safety', path: '/chat-safety', icon: ShieldCheck },
        { name: 'Appeal & Unban Requests', path: '/ban-appeals', icon: UserCheck },
        { name: 'Bad Words Filter', path: '/bad-words', icon: ShieldAlert },
        { name: 'Device & IP Bans', path: '/device-bans', icon: Lock },
      ]
    },
    {
      id: 'cat3',
      title: '2. Social Features',
      allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'],
      items: [
        { name: 'Pages & Groups', path: '/pages-groups', icon: Layers },
        { name: 'Reels & Live Monitor', path: '/reels-live', icon: Video },
        { name: 'Reels Audio & Copyright', path: '/copyright-audio', icon: Music },
        { name: 'Verification Badges', path: '/verification', icon: CheckCircle },
        { name: 'Support & Tickets', path: '/support', icon: LifeBuoy },
      ]
    },
    {
      id: 'cat4',
      title: '3. Monetization & Ads',
      allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      items: [
        { name: 'AdMob Monetization', path: '/monetization', icon: DollarSign },
        { name: 'Creator Applications & Review', path: '/creator-applications', icon: Award },
        { name: 'Ad Review Queue', path: '/ad-review', icon: Megaphone },
        { name: 'Boosted Posts & Ads', path: '/boosted-posts', icon: Megaphone },
        { name: 'Payment Gateways & Rates', path: '/payment-gateways', icon: Gift },
        { name: 'Rewards & Exchange Rates', path: '/rewards', icon: Gift },
      ]
    },
    {
      id: 'catRevenue',
      title: '4. Revenue & Earnings',
      allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      items: [
        { name: 'Revenue Reports & Settle', path: '/revenue', icon: BarChart3 },
        { name: 'Deposit Reconciler', path: '/deposits', icon: Wallet },
        { name: 'Payouts & Cashouts', path: '/payouts', icon: CreditCard },
        { name: 'Wallet & Ledger History', path: '/wallet-ledger', icon: Wallet },
      ]
    },
    {
      id: 'cat5',
      title: '5. System & Security',
      allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
      items: [
        { name: 'Feed Algorithm & Tags', path: '/feed-algorithm', icon: Sliders },
        { name: 'Legal & GDPR Requests', path: '/legal-compliance', icon: Globe },
        { name: 'Referral Fraud Firewall', path: '/fraud-firewall', icon: Flame },
        { name: 'Fraud Red Flags & Logs', path: '/fraud-flags', icon: AlertOctagon },
        { name: 'Security & Audit Logs', path: '/security', icon: ShieldCheck },
        { name: 'App Version Control', path: '/app-version-control', icon: Settings },
        { name: 'Storage Media Browser', path: '/media-browser', icon: Database },
        { name: 'Storage & DB Clean', path: '/storage', icon: Trash2 },
        { name: 'Notifications & Push', path: '/notifications', icon: Bell },
        { name: 'Website & SEO', path: '/website', icon: Globe },
        { name: 'App Settings & Config', path: '/settings', icon: Settings },
        { name: 'System Monitoring', path: '/health', icon: Activity },
      ]
    }
  ];

  // Filter categories and items based strictly on granted customPermissions (for non-SUPER_ADMIN)
  const filteredCategories = navCategories
    .map(cat => {
      const filteredItems = cat.items.filter(item => {
        if (normalizedRole !== 'SUPER_ADMIN') {
          // Non-super admin staff members get ONLY the items explicitly granted in customPermissions
          if (customPermissions?.[item.path] !== true) return false;
        }
        if (!searchQuery) return true;
        return item.name.toLowerCase().includes(searchQuery.toLowerCase());
      });
      return {
        ...cat,
        items: filteredItems
      };
    })
    .filter(cat => cat.items.length > 0);

  return (
    <aside className="w-72 bg-[#141418] border-r border-zinc-800 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-yellow-400 flex items-center justify-center text-white font-black text-xl shadow-lg">
          AV
        </div>
        <div>
          <h1 className="font-bold text-lg text-white leading-tight flex items-center gap-1.5">
            AvSocial <Sparkles className="w-4 h-4 text-purple-400 fill-purple-400/20" />
          </h1>
          <p className="text-xs text-purple-400 font-medium">Web Admin Panel</p>
        </div>
      </div>

      {/* Role Badge */}
      <div className="px-4 py-2.5 bg-purple-950/40 border-b border-purple-900/30 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-purple-300">ADMIN TIER:</span>
        <span className="text-[11px] font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
          {normalizedRole}
        </span>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-zinc-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Quick search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0f0f11] border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-all"
          />
        </div>
      </div>

      {/* Navigation Categories & Items */}
      <nav className="flex-1 px-3 py-3 space-y-3 overflow-y-auto">
        {filteredCategories.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-xs">No assigned menu permissions found.</div>
        ) : (
          filteredCategories.map((cat, catIdx) => {
            const isExpanded = searchQuery ? true : (expandedCategories[cat.id] ?? true);
            const serialNum = normalizedRole === 'SUPER_ADMIN' ? catIdx : catIdx + 1;
            const cleanTitle = cat.title.replace(/^[0-9]+\.\s*/, '');
            const serialTitle = `${serialNum}. ${cleanTitle}`;
            return (
              <div key={cat.id} className="space-y-1">
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <span>{serialTitle}</span>
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>

                {isExpanded && (
                  <div className="space-y-0.5 pl-1">
                    {cat.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={({ isActive }) =>
                            `flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                              isActive
                                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40 font-bold'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                            }`
                          }
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{item.name}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>

      {/* Footer / Sign out */}
      <div className="p-3 border-t border-zinc-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-xs rounded-lg border border-red-500/20 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
