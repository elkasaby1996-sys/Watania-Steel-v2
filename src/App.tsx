import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Profiler, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './pages/Dashboard';
import { History } from './pages/History';
import { Users } from './pages/Users';
import { Drivers } from './pages/Drivers';
import { DriverDetail } from './pages/DriverDetail';
import { SteelAnalytics } from './pages/SteelAnalytics';
import { Clients } from './pages/Clients';
import { ClientDetail } from './pages/ClientDetail';
import { Inventory } from './pages/Inventory';
import { OffcutUsage } from './pages/OffcutUsage';
import { ImageAssets } from './components/ImageAssets';
import { Toaster } from './components/ui/toaster';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useDashboardStore } from './stores/dashboardStore';
import { useAuthStore } from './stores/authStore';
import { useDashboardDataSync } from './hooks/useDashboardDataSync';
import { useRealtimeOrders } from './hooks/useRealtimeOrders';
import { logReactRender } from './lib/performance';

function App() {
  const { sidebarCollapsed } = useDashboardStore();
  const { initialize } = useAuthStore();
  const { user } = useAuthStore();
  const dataEnabled = Boolean(user);
  useDashboardDataSync(dataEnabled);
  useRealtimeOrders(dataEnabled);

  useEffect(() => {
    // Initialize auth first
    initialize();
  }, [initialize]);

  const handleRender: React.ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration
  ) => {
    logReactRender(
      `${id}:${phase}`,
      Math.round(actualDuration + baseDuration)
    );
  };

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
                <Profiler id="AppRoutes" onRender={handleRender}>
                  <div className="max-w-7xl mx-auto">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/history" element={<History />} />
                      <Route path="/users" element={<Users />} />
                      <Route path="/drivers" element={<Drivers />} />
                      <Route path="/drivers/:driverId" element={<DriverDetail />} />
                      <Route path="/clients" element={<Clients />} />
                      <Route path="/clients/:clientSlug" element={<ClientDetail />} />
                      <Route path="/inventory" element={<Inventory />} />
                      <Route path="/offcut-usage" element={<OffcutUsage />} />
                      <Route path="/steel-analytics" element={<SteelAnalytics />} />
                      {/* Catch all route - redirect to dashboard */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </div>
                </Profiler>
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
