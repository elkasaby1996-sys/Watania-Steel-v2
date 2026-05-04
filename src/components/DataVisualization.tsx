import { OrderChart } from './OrderChart';
import { StatusChart } from './StatusChart';
import { SteelBreakdownChart } from './SteelBreakdownChart';

export function DataVisualization() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 sm:gap-6">
        <OrderChart />
        <StatusChart />
      </div>
      <SteelBreakdownChart />
    </div>
  );
}
