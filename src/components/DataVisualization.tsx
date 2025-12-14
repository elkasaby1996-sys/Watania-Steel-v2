import { OrderChart } from './OrderChart';
import { StatusChart } from './StatusChart';
import { SteelBreakdownChart } from './SteelBreakdownChart';

export function DataVisualization() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OrderChart />
        <StatusChart />
      </div>
      <SteelBreakdownChart />
    </div>
  );
}
