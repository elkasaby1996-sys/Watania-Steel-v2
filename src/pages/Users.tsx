import React from 'react';
import { UserManagement } from '@/components/UserManagement';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function Users() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="text-foreground hover:bg-accent"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-headline font-bold text-foreground">
            User Management
          </h1>
          <p className="text-muted-foreground">
            Manage user accounts and role assignments
          </p>
        </div>
      </div>

      <UserManagement />
    </div>
  );
}
