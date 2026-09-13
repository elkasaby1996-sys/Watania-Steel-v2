import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { MobileNavigation } from './components/MobileNavigation';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ImageAssets } from './components/ImageAssets';
import { Toaster } from './components/ui/toaster';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useDashboardStore } from './stores/dashboardStore';
import { useAuthStore } from './stores/authStore';
import { ROUTES } from './routes/routes';
import { RouteSkeleton } from './components/RouteSkeleton';
import { useDeviceInfo } from './hooks/useDeviceInfo';

import { routeModules, preloadRoute } from './routes/routeModules';

const Dashboard = lazy(routeModules[ROUTES.dashboard]);
const History = lazy(routeModules[ROUTES.history]);
const Users = lazy(routeModules[ROUTES.users]);
const Drivers = lazy(routeModules[ROUTES.drivers]);
const DriverDetail = lazy(routeModules[ROUTES.driverDetail]);
const SteelAnalytics = lazy(routeModules[ROUTES.steelAnalytics]);
const Clients = lazy(routeModules[ROUTES.clients]);
const ClientProfilePage = lazy(routeModules[ROUTES.clientProfile]);
const ClientSiteDetailsPage = lazy(routeModules[ROUTES.clientSite]);
const Inventory = lazy(routeModules[ROUTES.inventory]);
const OffcutUsage = lazy(routeModules[ROUTES.offcutUsage]);
const OffcutExecutivePrintPage = lazy(routeModules[ROUTES.offcutExecutiveReport]);

function AppShell() {
  const userId = useAuthStore(state => state.user?.id);
  const sidebarCollapsed = useDashboardStore(state => state.sidebarCollapsed);
  const location = useLocation();
  const { isMobile } = useDeviceInfo();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isReportRoute = location.pathname.startsWith(ROUTES.offcutExecutiveReport);

  useEffect(() => {
    if (!userId || isReportRoute) return;
    let cancelled = false;
    // Warm code only, one page at a time after initial rendering. Data is still
    // fetched by the destination page with its normal permissions and filters.
    const pages = [ROUTES.dashboard, ROUTES.history, ROUTES.clients, ROUTES.drivers,
      ROUTES.inventory, ROUTES.offcutUsage, ROUTES.steelAnalytics];
    let timer: ReturnType<typeof setTimeout>;
    const next = async () => {
      const path = pages.shift();
      if (cancelled || !path) return;
      if (document.visibilityState !== 'visible') { pages.unshift(path); }
      else await preloadRoute(path);
      if (!cancelled) timer = setTimeout(next, 1000);
    };
    timer = setTimeout(next, 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [userId, isReportRoute]);

  const preloadLink = (event: React.SyntheticEvent) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
    if (link && link.origin === window.location.origin) void preloadRoute(link.pathname);
  };

  useEffect(() => {
    if (isMobile) {
      setMobileSidebarOpen(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.pathname, isMobile]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-glass-shell text-foreground" onPointerOver={preloadLink} onFocusCapture={preloadLink} onTouchStart={preloadLink}>
        <ImageAssets />
        <a className="skip-link" href="#workspace-content">Skip to workspace</a>
        {!isReportRoute && (
          <Sidebar
            isMobile={isMobile}
            mobileOpen={mobileSidebarOpen}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />
        )}
        <main id="workspace-content"
          className={`transition-all duration-300 ${
            isReportRoute ? 'ml-0' : isMobile ? 'ml-0' : sidebarCollapsed ? 'ml-16' : 'ml-64'
          }`}
        >
          {!isReportRoute && (
            <TopBar
              isMobile={isMobile}
              menuOpen={mobileSidebarOpen}
              onMenuClick={() => setMobileSidebarOpen((prev) => !prev)}
            />
          )}
          <div className={isReportRoute ? '' : isMobile ? 'workspace-main phone-safe-page' : 'workspace-main p-6'}>
            <div className={isReportRoute ? '' : 'mx-auto w-full max-w-[1500px]'}>
              <Suspense fallback={<RouteSkeleton />}>
                <Routes key={`${userId}:${location.pathname}`}>
                  <Route path={ROUTES.dashboard} element={<Dashboard />} />
                  <Route path={ROUTES.history} element={<History />} />
                  <Route path={ROUTES.users} element={<Users />} />
                  <Route path={ROUTES.drivers} element={<Drivers />} />
                  <Route path={ROUTES.driverDetail} element={<DriverDetail />} />
                  <Route path={ROUTES.clients} element={<Clients />} />
                  <Route path={ROUTES.clientProfile} element={<ClientProfilePage />} />
                  <Route path={ROUTES.clientSite} element={<ClientSiteDetailsPage />} />
                  <Route path={ROUTES.inventory} element={<Inventory />} />
                  <Route path={ROUTES.offcutUsage} element={<OffcutUsage />} />
                  <Route path={ROUTES.steelAnalytics} element={<SteelAnalytics />} />
                  <Route path={ROUTES.offcutExecutiveReport} element={<OffcutExecutivePrintPage />} />
                  {/* Catch all route - redirect to dashboard */}
                  <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
                </Routes>
              </Suspense>
            </div>
          </div>
        </main>
        {!isReportRoute && isMobile && <MobileNavigation menuOpen={mobileSidebarOpen} onMenuClick={() => setMobileSidebarOpen(true)} />}
        <Toaster />
      </div>
    </ProtectedRoute>
  );
}

function App() {
  const initialize = useAuthStore(state => state.initialize);
  const refreshProfile = useAuthStore(state => state.refreshProfile);
  const userId = useAuthStore(state => state.user?.id);
  const lastResumeRefreshAtRef = useRef(0);

  useEffect(() => {
    // The store coalesces initialization, including StrictMode and hot reload.
    void preloadRoute(window.location.pathname);
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!userId) return;
    const refreshOnResume = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastResumeRefreshAtRef.current < 30_000) return;
      lastResumeRefreshAtRef.current = now;
      void refreshProfile();
    };
    window.addEventListener('focus', refreshOnResume);
    window.addEventListener('online', refreshOnResume);
    document.addEventListener('visibilitychange', refreshOnResume);
    return () => {
      window.removeEventListener('focus', refreshOnResume);
      window.removeEventListener('online', refreshOnResume);
      document.removeEventListener('visibilitychange', refreshOnResume);
    };
  }, [userId, refreshProfile]);

  return (
    <ErrorBoundary>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppShell />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
