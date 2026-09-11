import { AddOrderDialog } from './AddOrderDialog';
import { RoleBasedComponent } from './RoleBasedComponent';

export function HeroSection() {
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <section className="operations-heading">
      <div>
        <p className="eyebrow">Operations / Daily overview</p>
        <h1>Today, at Watania<span>.</span></h1>
        <p className="operations-description">Your orders, materials and deliveries. All in view.</p>
      </div>
      <div className="operations-heading-actions">
        <span className="operations-date">{today}</span>
        <RoleBasedComponent action="create"><AddOrderDialog /></RoleBasedComponent>
      </div>
    </section>
  );
}

