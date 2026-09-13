import { WorkspaceHeading } from '@/components/WorkspaceHeading';
import { AddOrderDialog } from './AddOrderDialog';
import { RoleBasedComponent } from './RoleBasedComponent';
import { CalendarDays, ArrowDownRight } from 'lucide-react';

export function HeroSection() {
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <WorkspaceHeading
      eyebrow="Watania Steel / Dashboard"
      title="Today’s operations"
      description="Monitor active orders, delivery progress, and steel tonnage."
    >
      <div className="operations-heading-actions">
        <span className="operations-date"><CalendarDays size={14} />{today}</span>
        <RoleBasedComponent action="create"><AddOrderDialog /></RoleBasedComponent>
        <a href="#delivery-queue" className="queue-jump">View delivery queue <ArrowDownRight size={14} /></a>
      </div>
    </WorkspaceHeading>
  );
}
