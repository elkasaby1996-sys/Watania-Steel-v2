import React from 'react';
import { HeroSection } from '@/components/HeroSection';
import { DashboardCards } from '@/components/DashboardCards';
import { OrderTable } from '@/components/OrderTable';
import { DiameterDistributionChart } from '@/components/DiameterDistributionChart';

export function Dashboard() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <HeroSection />
      <DashboardCards />
      <OrderTable />
      <div className="grid grid-cols-1 gap-5 sm:gap-6">
        <DiameterDistributionChart />
      </div>
    </div>
  );
}
