import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './pages/Dashboard';
import { History } from './pages/History';
import { Users } from './pages/Users';
import { Drivers } from './pages/Drivers';
import { DriverDetail } from './pages/DriverDetail';
import { SteelAnalytics } from './pages/SteelAnalytics';
import { Clients } from './pages/Clients';
import { ClientProfilePage } from './pages/ClientProfile';
import { ClientSiteDetailsPage } from './pages/ClientSiteDetails';
import { Inventory } from './pages/Inventory';
import { OffcutUsage } from './pages/OffcutUsage';
import { OffcutExecutivePrintPage } from './reports/offcut/OffcutExecutivePrintPage';
import { ImageAssets } from './components/ImageAssets';
import { Toaster } from './components/ui/toaster';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useDashboardStore } from './stores/dashboardStore';
import { useAuthStore } from './stores/authStore';

function AppShell() {
  const { sidebarCollapsed } = useDashboardStore();
  const location = useLocation();
  const isReportRoute = location.pathname.startsWith('/reports/offcut/executive');

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
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/history" element={<History />} />
                <Route path="/users" element={<Users />} />
                <Route path="/drivers" element={<Drivers />} />
                <Route path="/drivers/:driverId" element={<DriverDetail />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/clients/:clientId" element={<ClientProfilePage />} />
                <Route path="/clients/:clientId/sites/:siteId" element={<ClientSiteDetailsPage />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/offcut-usage" element={<OffcutUsage />} />
                <Route path="/steel-analytics" element={<SteelAnalytics />} />
                <Route path="/reports/offcut/executive" element={<OffcutExecutivePrintPage />} />
                {/* Catch all route - redirect to dashboard */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
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
  const { initialize } = useAuthStore();

  useEffect(() => {
    // Initialize auth first
    initialize();
  }, [initialize]);

  useEffect(() => {
    // Load initial data after auth is initialized
    loadOrders();
    loadDashboardMetrics();
    
    // Load history orders for the history page
    const dashboardStore = useDashboardStore.getState();
    if (dashboardStore.loadHistoryOrders) {
      dashboardStore.loadHistoryOrders();
    }
  }, [loadOrders, loadDashboardMetrics]);

  return (
    <ErrorBoundary>
      <Router>
        <AppShell />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
