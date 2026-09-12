import { HeroSection } from '@/components/HeroSection';
import { DashboardCards } from '@/components/DashboardCards';
import { OrderTable } from '@/components/OrderTable';
import { DiameterDistributionChart } from '@/components/DiameterDistributionChart';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Warehouse, Truck, History } from 'lucide-react';
import { ROUTES } from '@/routes/routes';
import { useEffect } from 'react';
import { useDashboardStore } from '@/stores/dashboardStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';

export function Dashboard() {
  const userId = useAuthStore(state => state.user?.id);
  const loadOrders = useDashboardStore(state => state.loadOrders);
  const refreshing = useDashboardStore(state => state.isRefreshingOrders);
  const refreshError = useDashboardStore(state => state.refreshError);
  useEffect(() => {
    if (!userId) return;
    const refresh = () => {
      if (document.visibilityState === 'visible') void loadOrders({ force: false });
    };
    void loadOrders({ force: false });
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [userId, loadOrders]);
  return (
    <div className="dashboard-workspace">
      <HeroSection />
      {refreshing && <p role="status" className="text-xs text-muted-foreground">Updating orders…</p>}
      {refreshError && <div role="alert" className="flex items-center justify-between gap-3 text-sm text-muted-foreground"><span>Couldn’t refresh orders. Showing the last loaded data.</span><Button variant="outline" size="sm" onClick={() => loadOrders()}>Retry</Button></div>}
      <DashboardCards />
      <OrderTable />
      <div className="dashboard-secondary">
        <DiameterDistributionChart />
        <section className="workspace-links">
          <p className="eyebrow">Keep things moving</p>
          <h2>Factory workspace</h2>
          <p className="text-sm text-muted-foreground">Move from the overview to the details.</p>
          {[
            { title: 'Material inventory', detail: 'Review stock and steel availability', path: ROUTES.inventory, icon: Warehouse },
            { title: 'Drivers & dispatch', detail: 'Manage your delivery team', path: ROUTES.drivers, icon: Truck },
            { title: 'Order history', detail: 'Find completed deliveries', path: ROUTES.history, icon: History },
          ].map(({ title, detail, path, icon: Icon }) => <Link key={path} to={path} className="workspace-link"><Icon size={20} strokeWidth={1.5}/><span><strong>{title}</strong><small>{detail}</small></span><ArrowUpRight size={18}/></Link>)}
        </section>
      </div>
      <footer className="workspace-footer"><span>AL WATANIA STEEL</span><span>Factory operations · Qatar</span></footer>
    </div>
  );
}
