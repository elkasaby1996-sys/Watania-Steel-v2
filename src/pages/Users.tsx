import React from 'react';
import { UserManagement } from '@/components/UserManagement';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/routes/routes';

export function Users() {
  const navigate = useNavigate();

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="glass-panel flex flex-col items-stretch gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:p-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(ROUTES.dashboard)}
          className="w-full justify-start text-foreground hover:bg-accent sm:w-auto"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Button>
        <div className="min-w-0">
          <h1 className="break-words text-3xl font-headline font-bold text-foreground">
            User Management
          </h1>
          <p className="break-words text-muted-foreground">
            Manage user accounts and role assignments
          </p>
        </div>
      </div>

      <UserManagement />
    </div>
  );
}
