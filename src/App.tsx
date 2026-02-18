import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect, useRef } from 'react';
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
  const { sidebarCollapsed } = useDashboardStore();
  const location = useLocation();
  const isReportRoute = location.pathname.startsWith(ROUTES.offcutExecutiveReport);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background text-foreground">
        <ImageAssets />
        {!isReportRoute && <Sidebar />}
        <main
          className={`transition-all duration-300 ${isReportRoute ? 'ml-0' : sidebarCollapsed ? 'ml-16' : 'ml-64'}`}
        >
          {!isReportRoute && <TopBar />}
          <div className={isReportRoute ? '' : 'pt-16 p-6'}>
            <div className={isReportRoute ? '' : 'max-w-7xl mx-auto'}>
              <Suspense fallback={<RouteSkeleton />}>
                <Routes>
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
        <Toaster />
      </div>
    </ProtectedRoute>
  );
}

function App() {
  const { loadOrders, loadDashboardMetrics } = useDashboardStore();
  const { initialize, user, loading: authLoading, initialized } = useAuthStore();
  const initializedRef = useRef(false);

  useEffect(() => {
    // Guard against React StrictMode double-invoking effects in development.
    if (initializedRef.current) return;
    initializedRef.current = true;
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!initialized || authLoading || !user) {
      return;
    }

    // Load initial app data only after auth is ready.
    loadOrders();
    loadDashboardMetrics();

    const dashboardStore = useDashboardStore.getState();
    if (dashboardStore.loadHistoryOrders) {
      dashboardStore.loadHistoryOrders();
    }
  }, [initialized, authLoading, user, loadOrders, loadDashboardMetrics]);

  return (
    <ErrorBoundary>
      <Router>
        <AppShell />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
