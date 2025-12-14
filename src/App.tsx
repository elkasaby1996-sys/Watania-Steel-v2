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
import { ImageAssets } from './components/ImageAssets';
import { Toaster } from './components/ui/toaster';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useDashboardStore } from './stores/dashboardStore';
import { useAuthStore } from './stores/authStore';

function App() {
  const { sidebarCollapsed, loadOrders, loadActivities } = useDashboardStore();
  const { initialize } = useAuthStore();

  useEffect(() => {
    // Initialize auth first
    initialize();
  }, [initialize]);

  useEffect(() => {
    // Load initial data after auth is initialized
    loadOrders();
    loadActivities();
    
    // Load history orders for the history page
    const dashboardStore = useDashboardStore.getState();
    if (dashboardStore.loadHistoryOrders) {
      dashboardStore.loadHistoryOrders();
    }
  }, [loadOrders, loadActivities]);

  return (
    <ErrorBoundary>
      <Router>
        <ProtectedRoute>
          <div className="min-h-screen bg-background text-foreground">
            <ImageAssets />
            <Sidebar />
            <main className={`transition-all duration-300 ${
              sidebarCollapsed ? 'ml-16' : 'ml-64'
            }`}>
              <TopBar />
              <div className="pt-16 p-6">
                <div className="max-w-7xl mx-auto">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/drivers" element={<Drivers />} />
                    <Route path="/drivers/:driverId" element={<DriverDetail />} />
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
