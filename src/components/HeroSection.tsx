import { AddOrderDialog } from './AddOrderDialog';
import { RoleBasedComponent } from './RoleBasedComponent';
import { CalendarDays, ArrowDownRight } from 'lucide-react';

export function HeroSection() {
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <section className="operations-heading">
      <div>
        <p className="eyebrow"><span className="heading-marker" /> Watania Steel / Operations</p>
        <h1>A clear view of <span>what’s moving.</span></h1>
        <p className="operations-description">Track production, coordinate deliveries, and keep the factory moving.</p>
      </div>
      <div className="operations-heading-actions">
        <span className="operations-date"><CalendarDays size={14} />{today}</span>
        <RoleBasedComponent action="create"><AddOrderDialog /></RoleBasedComponent>
        <a href="#delivery-queue" className="queue-jump">View delivery queue <ArrowDownRight size={14} /></a>
      </div>
    </section>
  );
}
