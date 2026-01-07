import React from 'react';
import { HeroSection } from '@/components/HeroSection';
import { DashboardCards } from '@/components/DashboardCards';
import { OrderTable } from '@/components/OrderTable';
import { SteelMixWidget } from '@/components/SteelMixWidget';
import { SignedDeliveryNotesCard } from '@/components/SignedDeliveryNotesCard';

export function Dashboard() {
  return (
    <div className="space-y-6">
      <HeroSection />
      <DashboardCards />
      <OrderTable />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SteelMixWidget />
        <SignedDeliveryNotesCard />
      </div>
    </div>
  );
}
