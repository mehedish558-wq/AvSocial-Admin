import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { Analytics } from './pages/Analytics';
import { Users } from './pages/Users';
import { UsersOnly } from './pages/UsersOnly';
import { Monetization } from './pages/Monetization';
import { Payouts } from './pages/Payouts';
import { BadWords } from './pages/BadWords';
import { BoostedPosts } from './pages/BoostedPosts';
import { DeviceBans } from './pages/DeviceBans';
import { StaffPerformance } from './pages/StaffPerformance';
import { StorageClean } from './pages/StorageClean';
import { Moderation } from './pages/Moderation';
import { Rewards } from './pages/Rewards';
import { Verification } from './pages/Verification';
import { Notifications } from './pages/Notifications';
import { AppSettings } from './pages/AppSettings';
import { Support } from './pages/Support';
import { Security } from './pages/Security';
import { SystemHealth } from './pages/SystemHealth';
import { Website } from './pages/Website';
import { PagesGroups } from './pages/PagesGroups';
import { DepositReconciler } from './pages/DepositReconciler';
import { Revenue } from './pages/Revenue';

// New Enterprise & RBAC Pages
import { UserReports } from './pages/UserReports';
import { BanAppeals } from './pages/BanAppeals';
import { ReelsLive } from './pages/ReelsLive';
import { AdReview } from './pages/AdReview';
import { WalletLedger } from './pages/WalletLedger';
import { AiModeration } from './pages/AiModeration';
import { FeedAlgorithm } from './pages/FeedAlgorithm';
import { ChatSafety } from './pages/ChatSafety';
import { CopyrightAudio } from './pages/CopyrightAudio';
import { LegalCompliance } from './pages/LegalCompliance';
import { CreatorApplications } from './pages/CreatorApplications';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [adminName, setAdminName] = useState('');
  const [adminHandle, setAdminHandle] = useState('');
  const [adminRole, setAdminRole] = useState('SUPER_ADMIN');
  const [customPermissions, setCustomPermissions] = useState<Record<string, boolean>>({});
  const [sessionUid, setSessionUid] = useState<string | null>(null);

  useEffect(() => {
    checkSession();
    const handleFocus = () => {
      checkSession();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  useEffect(() => {
    if (!sessionUid) return;
    const channel = supabase
      .channel('public:app_users:perms:' + sessionUid)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_users',
          filter: `uid=eq.${sessionUid}`
        },
        (payload) => {
          if (payload.new && (payload.new as any).custom_permissions) {
            setCustomPermissions((payload.new as any).custom_permissions);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionUid]);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setIsAuthenticated(false);
      return;
    }

    setSessionUid(session.user.id);
    const userEmail = (session.user.email || '').toLowerCase();
    const isCeoEmail = userEmail === 'com.noxmeta@gmail.com' || userEmail === 'ceo@avsocial.app';

    // Verify user role
    try {
      let { data, error } = await supabase
        .from('app_users')
        .select('name, handle, role, custom_permissions')
        .eq('uid', session.user.id)
        .maybeSingle();

      if (data?.custom_permissions) {
        setCustomPermissions(data.custom_permissions);
      }

      if (isCeoEmail) {
        if (!data || (data.role || '').toUpperCase() !== 'SUPER_ADMIN') {
          await supabase.from('app_users').upsert({
            uid: session.user.id,
            email: userEmail,
            name: 'CEO Super Admin',
            handle: 'ceo',
            role: 'SUPER_ADMIN'
          });
        }
        const activeHandle = data?.handle || 'ceo';
        localStorage.setItem('admin_handle', activeHandle.toLowerCase());
        setAdminName(data?.name || 'CEO Super Admin');
        setAdminHandle(activeHandle);
        setAdminRole('SUPER_ADMIN');
        setIsAuthenticated(true);
        return;
      }

      if (error || !data) {
        setIsAuthenticated(false);
        return;
      }

      const role = (data.role || '').toUpperCase();
      const handle = (data.handle || '').toLowerCase();
      const isCEO = handle === 'ceo';

      if (!isCEO && !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MODERATOR'].includes(role)) {
        setIsAuthenticated(false);
        return;
      }

      localStorage.setItem('admin_handle', handle);
      setAdminName(data.name || 'Admin');
      setAdminHandle(handle || 'admin');
      setAdminRole(isCEO ? 'SUPER_ADMIN' : (role === 'MANAGER' ? 'ADMIN' : role));
      setIsAuthenticated(true);
    } catch {
      if (isCeoEmail) {
        setAdminName('CEO Super Admin');
        setAdminHandle('ceo');
        setAdminRole('SUPER_ADMIN');
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#0f0f11] flex items-center justify-center text-zinc-500 font-bold text-sm">
        Initializing Web Admin Security Session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={checkSession} />;
  }

  const normalizedRole = adminRole.toUpperCase();

  // Helper route protection wrapper based on custom permissions
  const ProtectedRoute = ({ element, path, allowedRoles }: { element: React.ReactNode; path: string; allowedRoles: string[] }) => {
    if (normalizedRole === 'SUPER_ADMIN') return <>{element}</>;
    // Strictly require custom permission to be explicitly granted true
    if (customPermissions && customPermissions[path] === true) {
      return <>{element}</>;
    }
    // If not authorized for this specific path, redirect to their first granted path
    const firstAllowedPath = Object.keys(customPermissions || {}).find(p => customPermissions?.[p] === true);
    if (firstAllowedPath && firstAllowedPath !== path) {
      return <Navigate to={firstAllowedPath} replace />;
    }
    return <Navigate to="/" replace />;
  };

  return (
    <Router>
      <div className="flex min-h-screen bg-[#0f0f11]">
        <Sidebar currentRole={adminRole} customPermissions={customPermissions} onLogout={handleLogout} />
        <div className="flex-1 flex flex-col min-w-0">
          <Header adminName={adminName} adminHandle={adminHandle} />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              {/* Category 1: Overview & Analytics (Super Admin only) */}
              <Route path="/" element={<ProtectedRoute path="/" element={<Overview />} allowedRoles={['SUPER_ADMIN']} />} />
              <Route path="/users-roles" element={<ProtectedRoute path="/users-roles" element={<Users />} allowedRoles={['SUPER_ADMIN']} />} />
              <Route path="/analytics" element={<ProtectedRoute path="/analytics" element={<Analytics />} allowedRoles={['SUPER_ADMIN']} />} />
              <Route path="/staff-performance" element={<ProtectedRoute path="/staff-performance" element={<StaffPerformance />} allowedRoles={['SUPER_ADMIN']} />} />

              {/* Category 2: Users & Moderation */}
              <Route path="/users" element={<ProtectedRoute path="/users" element={<UsersOnly />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MODERATOR']} />} />
              <Route path="/user-reports" element={<Navigate to="/moderation" replace />} />
              <Route path="/moderation" element={<ProtectedRoute path="/moderation" element={<Moderation />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MODERATOR']} />} />
              <Route path="/ai-moderation" element={<ProtectedRoute path="/ai-moderation" element={<AiModeration />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MODERATOR']} />} />
              <Route path="/chat-safety" element={<ProtectedRoute path="/chat-safety" element={<ChatSafety />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MODERATOR']} />} />
              <Route path="/ban-appeals" element={<ProtectedRoute path="/ban-appeals" element={<BanAppeals />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MODERATOR']} />} />
              <Route path="/appeals" element={<ProtectedRoute path="/appeals" element={<BanAppeals />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MODERATOR']} />} />
              <Route path="/bad-words" element={<ProtectedRoute path="/bad-words" element={<BadWords />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MODERATOR']} />} />
              <Route path="/device-bans" element={<ProtectedRoute path="/device-bans" element={<DeviceBans />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MODERATOR']} />} />

              {/* Category 3: Social Features */}
              <Route path="/pages-groups" element={<ProtectedRoute path="/pages-groups" element={<PagesGroups />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MODERATOR']} />} />
              <Route path="/reels-live" element={<ProtectedRoute path="/reels-live" element={<ReelsLive />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MODERATOR']} />} />
              <Route path="/reels-live-monitor" element={<ProtectedRoute path="/reels-live-monitor" element={<ReelsLive />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MODERATOR']} />} />
              <Route path="/copyright-audio" element={<ProtectedRoute path="/copyright-audio" element={<CopyrightAudio />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MODERATOR']} />} />
              <Route path="/verification" element={<ProtectedRoute path="/verification" element={<Verification />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MODERATOR']} />} />
              <Route path="/support" element={<ProtectedRoute path="/support" element={<Support />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MODERATOR']} />} />

              {/* Category 4: Monetization & Ads */}
              <Route path="/monetization" element={<ProtectedRoute path="/monetization" element={<Monetization />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']} />} />
              <Route path="/creator-applications" element={<ProtectedRoute path="/creator-applications" element={<CreatorApplications />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']} />} />
              <Route path="/ad-review" element={<ProtectedRoute path="/ad-review" element={<AdReview />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']} />} />
              <Route path="/boosted-posts" element={<ProtectedRoute path="/boosted-posts" element={<BoostedPosts />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']} />} />
              <Route path="/payment-gateways" element={<ProtectedRoute path="/payment-gateways" element={<Rewards />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']} />} />
              <Route path="/rewards" element={<ProtectedRoute path="/rewards" element={<Rewards />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']} />} />

              {/* Category 4b: Revenue & Earnings */}
              <Route path="/revenue" element={<ProtectedRoute path="/revenue" element={<Revenue />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']} />} />
              <Route path="/deposits" element={<ProtectedRoute path="/deposits" element={<DepositReconciler />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']} />} />
              <Route path="/payouts" element={<ProtectedRoute path="/payouts" element={<Payouts />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']} />} />
              <Route path="/wallet-ledger" element={<ProtectedRoute path="/wallet-ledger" element={<WalletLedger />} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']} />} />

              {/* Category 5: System & Security */}
              <Route path="/feed-algorithm" element={<ProtectedRoute path="/feed-algorithm" element={<FeedAlgorithm />} allowedRoles={['SUPER_ADMIN', 'ADMIN']} />} />
              <Route path="/legal-compliance" element={<ProtectedRoute path="/legal-compliance" element={<LegalCompliance />} allowedRoles={['SUPER_ADMIN', 'ADMIN']} />} />
              <Route path="/fraud-firewall" element={<ProtectedRoute path="/fraud-firewall" element={<DeviceBans />} allowedRoles={['SUPER_ADMIN', 'ADMIN']} />} />
              <Route path="/fraud-flags" element={<ProtectedRoute path="/fraud-flags" element={<Payouts />} allowedRoles={['SUPER_ADMIN', 'ADMIN']} />} />
              <Route path="/security" element={<ProtectedRoute path="/security" element={<Security />} allowedRoles={['SUPER_ADMIN', 'ADMIN']} />} />
              <Route path="/app-version-control" element={<ProtectedRoute path="/app-version-control" element={<AppSettings />} allowedRoles={['SUPER_ADMIN', 'ADMIN']} />} />
              <Route path="/media-browser" element={<ProtectedRoute path="/media-browser" element={<StorageClean />} allowedRoles={['SUPER_ADMIN', 'ADMIN']} />} />
              <Route path="/storage" element={<ProtectedRoute path="/storage" element={<StorageClean />} allowedRoles={['SUPER_ADMIN', 'ADMIN']} />} />
              <Route path="/notifications" element={<ProtectedRoute path="/notifications" element={<Notifications />} allowedRoles={['SUPER_ADMIN', 'ADMIN']} />} />
              <Route path="/website" element={<ProtectedRoute path="/website" element={<Website />} allowedRoles={['SUPER_ADMIN', 'ADMIN']} />} />
              <Route path="/settings" element={<ProtectedRoute path="/settings" element={<AppSettings />} allowedRoles={['SUPER_ADMIN', 'ADMIN']} />} />
              <Route path="/health" element={<ProtectedRoute path="/health" element={<SystemHealth />} allowedRoles={['SUPER_ADMIN', 'ADMIN']} />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};
