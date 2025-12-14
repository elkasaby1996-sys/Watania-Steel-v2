import React, { useEffect } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useDriversStore } from '../stores/driversStore';
import { AddDriverDialog } from '../components/AddDriverDialog';
import { DriversTable } from '../components/DriversTable';
import { DriversMetrics } from '../components/DriversMetrics';
import { DatabaseSchemaAlert } from '../components/DatabaseSchemaAlert';
import { RoleBasedComponent } from '../components/RoleBasedComponent';

export function Drivers() {
  const navigate = useNavigate();
  const driversStore = useDriversStore();

  // Safe access to store data and functions
  const searchQuery = driversStore?.searchQuery || '';
  const setSearchQuery = driversStore?.setSearchQuery || (() => {});
  const loadDrivers = driversStore?.loadDrivers || (() => Promise.resolve());
  const loadMetrics = driversStore?.loadMetrics || (() => Promise.resolve());
  const drivers = driversStore?.drivers || [];
  const error = driversStore?.error || null;

  useEffect(() => {
    if (loadDrivers && loadMetrics) {
      loadDrivers();
      loadMetrics();
    }
  }, [loadDrivers, loadMetrics]);


  // Show database setup alert if drivers table doesn't exist OR is_active column is missing
  const showSetupAlert = error && typeof error === 'string' && (
    error.includes('does not exist') || 
    error.includes('is_active') || 
    error.includes('schema cache')
  );

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
        <div className="flex-1">
          <h1 className="text-3xl font-headline font-bold text-foreground">
            Drivers Management
          </h1>
          <p className="text-muted-foreground">
            Manage drivers and track their performance metrics
          </p>
        </div>
        <RoleBasedComponent action="create">
          <AddDriverDialog />
        </RoleBasedComponent>
      </div>

      {/* Database Setup Alert */}
      {showSetupAlert && <DatabaseSchemaAlert />}

      {/* Metrics Section */}
      <DriversMetrics />

      {/* Search and Filters */}
      <Card>
        <div className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                id="drivers-search"
                name="driversSearch"
                placeholder="Search drivers by name or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background text-foreground border-border"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {drivers.length} drivers total
            </p>
          </div>
        </div>
      </Card>

      {/* Drivers Table */}
      <DriversTable />
    </div>
  );
}
