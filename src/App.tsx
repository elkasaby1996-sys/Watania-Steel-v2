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

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const History = lazy(() => import('./pages/History').then((module) => ({ default: module.History })));
const Users = lazy(() => import('./pages/Users').then((module) => ({ default: module.Users })));
const Drivers = lazy(() => import('./pages/Drivers').then((module) => ({ default: module.Drivers })));
const DriverDetail = lazy(() => import('./pages/DriverDetail').then((module) => ({ default: module.DriverDetail })));
const SteelAnalytics = lazy(() => import('./pages/SteelAnalytics').then((module) => ({ default: module.SteelAnalytics })));
const Clients = lazy(() => import('./pages/Clients').then((module) => ({ default: module.Clients })));
const ClientProfilePage = lazy(() => import('./pages/ClientProfile').then((module) => ({ default: module.ClientProfilePage })));
const ClientSiteDetailsPage = lazy(() => import('./pages/ClientSiteDetails').then((module) => ({ default: module.ClientSiteDetailsPage })));
const Inventory = lazy(() => import('./pages/Inventory').then((module) => ({ default: module.Inventory })));
const OffcutUsage = lazy(() => import('./pages/OffcutUsage').then((module) => ({ default: module.OffcutUsage })));
const OffcutExecutivePrintPage = lazy(() =>
  import('./reports/offcut/OffcutExecutivePrintPage').then((module) => ({ default: module.OffcutExecutivePrintPage }))
);

function AppShell() {
  const userId = useAuthStore(state => state.user?.id);
  const sidebarCollapsed = useDashboardStore(state => state.sidebarCollapsed);
  const location = useLocation();
  const { isMobile } = useDeviceInfo();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isReportRoute = location.pathname.startsWith(ROUTES.offcutExecutiveReport);

  useEffect(() => {
    if (isMobile) {
      setMobileSidebarOpen(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.pathname, isMobile]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-glass-shell text-foreground">
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
