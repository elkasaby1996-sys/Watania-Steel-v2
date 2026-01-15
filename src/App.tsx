import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import { ImageAssets } from './components/ImageAssets';
import { Toaster } from './components/ui/toaster';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useDashboardStore } from './stores/dashboardStore';
import { useAuthStore } from './stores/authStore';
import { OffcutExecutiveReport } from './pages/reports/OffcutExecutiveReport';

function App() {
  const { sidebarCollapsed, loadOrders, loadDashboardMetrics } = useDashboardStore();
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
        <ProtectedRoute>
          <div className="min-h-screen bg-background text-foreground">
            <ImageAssets />
            <div className="print-hidden">
              <Sidebar />
            </div>
            <main className={`app-main transition-all duration-300 ${
              sidebarCollapsed ? 'ml-16' : 'ml-64'
            }`}>
              <div className="print-hidden">
                <TopBar />
              </div>
              <div className="app-content pt-16 p-6">
                <div className="max-w-7xl mx-auto">
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
                    <Route path="/reports/offcut/executive" element={<OffcutExecutiveReport />} />
                    <Route path="/steel-analytics" element={<SteelAnalytics />} />
                    {/* Catch all route - redirect to dashboard */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </div>
            </main>
            <Toaster />
          </div>
        </ProtectedRoute>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
