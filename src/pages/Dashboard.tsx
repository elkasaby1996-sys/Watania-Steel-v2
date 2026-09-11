import { HeroSection } from '@/components/HeroSection';
import { DashboardCards } from '@/components/DashboardCards';
import { OrderTable } from '@/components/OrderTable';
import { DiameterDistributionChart } from '@/components/DiameterDistributionChart';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Warehouse, Truck, History } from 'lucide-react';
import { ROUTES } from '@/routes/routes';

export function Dashboard() {
  return (
    <div className="dashboard-workspace">
      <HeroSection />
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
