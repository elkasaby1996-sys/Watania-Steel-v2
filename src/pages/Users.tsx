import { WorkspaceHeading } from '@/components/WorkspaceHeading';
import React from 'react';
import { UserManagement } from '@/components/UserManagement';
import { ROUTES } from '@/routes/routes';

export function Users() {

  return (
    <div className="space-y-5 sm:space-y-6">
      <WorkspaceHeading
        eyebrow="Administration"
        title="User management"
        description="Manage user accounts and role assignments."
        backTo={ROUTES.dashboard}
      />

      <UserManagement />
    </div>
  );
}
