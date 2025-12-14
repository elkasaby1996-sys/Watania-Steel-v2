import React from 'react';
import { HeroSection } from '@/components/HeroSection';
import { DashboardCards } from '@/components/DashboardCards';
import { OrderTable } from '@/components/OrderTable';
import { ActivityFeed } from '@/components/ActivityFeed';

export function Dashboard() {
  return (
    <div className="space-y-6">
      <HeroSection />
      <DashboardCards />
      <OrderTable />
      <div className="grid grid-cols-1 gap-6">
        <ActivityFeed />
      </div>
    </div>
  );
}
