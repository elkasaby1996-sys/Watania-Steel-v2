import React from 'react';
import { HeroSection } from '@/components/HeroSection';
import { DashboardCards } from '@/components/DashboardCards';
import { OrderTable } from '@/components/OrderTable';
import { DiameterDistributionChart } from '@/components/DiameterDistributionChart';
import { DailySummaryCard } from '@/components/DailySummaryCard';

export function Dashboard() {
  return (
    <div className="space-y-6">
      <HeroSection />
      <DashboardCards />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailySummaryCard />
      </div>
      <OrderTable />
      <div className="grid grid-cols-1 gap-6">
        <DiameterDistributionChart />
      </div>
    </div>
  );
}
