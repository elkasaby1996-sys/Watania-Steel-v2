import { AddOrderDialog } from './AddOrderDialog';
import { RoleBasedComponent } from './RoleBasedComponent';
import { useAuthStore } from '../stores/authStore';

export function HeroSection() {
  const { user } = useAuthStore();
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="mb-6">
      <div className="page-header glass-panel rounded-2xl p-4 sm:p-5">
        <div>
          <h1 className="page-header-title">
            Al Watania Steel - Daily Orders
          </h1>
          <p className="page-header-subtitle">
            {today} - Track and manage steel deliveries
          </p>
        </div>
        <div className="page-header-actions">
          <RoleBasedComponent action="create">
            <AddOrderDialog />
          </RoleBasedComponent>
        </div>
      </div>
    </div>
  );
}
