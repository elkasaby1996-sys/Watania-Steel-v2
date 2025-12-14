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
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-foreground mb-2">
            Al Watania Steel - Daily Orders
          </h1>
          <p className="text-muted-foreground">
            {today} - Track and manage steel deliveries
          </p>
        </div>
        <div className="flex gap-3">
          <RoleBasedComponent action="create">
            <AddOrderDialog />
          </RoleBasedComponent>
        </div>
      </div>
    </div>
  );
}
