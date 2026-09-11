import { ClipboardList, Scissors, Ruler, Scale } from 'lucide-react';
import { Button } from './ui/button';
import { useDashboardStore } from '../stores/dashboardStore';

export function DashboardCards() {
  const { dashboardMetrics: metrics, isLoadingMetrics, metricsError, loadDashboardMetrics } = useDashboardStore();
  const format = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
  const items = [
    { label: 'Active orders', value: metrics.todayOrders, unit: 'orders', note: 'Current delivery queue', icon: ClipboardList },
    { label: 'Cut & bend', value: format(metrics.cutAndBendTons), unit: 't', note: 'Fabricated steel', icon: Scissors },
    { label: 'Straight bar', value: format(metrics.straightBarTons), unit: 't', note: 'Ready-length material', icon: Ruler },
    { label: 'Total tonnage', value: format(metrics.totalTons), unit: 't', note: 'Across active orders', icon: Scale },
  ];
  if (metricsError) return <div className="metrics-error" role="alert"><div><strong>Totals unavailable</strong><p>{metricsError}</p></div><Button variant="outline" onClick={() => loadDashboardMetrics()}>Retry</Button></div>;
  return <section className="metrics-strip" aria-label="Daily production totals" aria-busy={isLoadingMetrics}>
    {items.map(({ label, value, unit, note, icon: Icon }, index) => <div className="metric-item" key={label}>
      <div className="metric-label"><span>{label}</span><Icon size={18} strokeWidth={1.5} /></div>
      {isLoadingMetrics ? <div className="metric-skeleton animate-pulse" /> : <p className="metric-value">{value}<span>{unit}</span></p>}
      <p className="metric-note"><span>0{index + 1}</span>{note}</p>
    </div>)}
  </section>;
}
