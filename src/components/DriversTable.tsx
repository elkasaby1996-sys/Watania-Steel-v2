import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit, Trash2, Phone, User, CheckCircle, XCircle } from 'lucide-react';
import { useDriversStore } from '@/stores/driversStore';
import { EditDriverDialog } from './EditDriverDialog';
import { RoleBasedComponent } from './RoleBasedComponent';
import { useToast } from '../hooks/use-toast';

// PhoneLink component inline to avoid import issues
const PhoneLink = ({ phoneNumber }: { phoneNumber: string }) => {
  if (!phoneNumber) {
    return <span className="text-muted-foreground">N/A</span>;
  }

  const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');

  return (
    <a 
      href={`tel:${cleanNumber}`}
      className="text-primary hover:text-primary/80 underline cursor-pointer inline-flex items-center gap-1"
      title="Click to call"
    >
      📞 {phoneNumber}
    </a>
  );
};

interface Driver {
  id: string;
  name: string;
  phone_number: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export function DriversTable() {
  const navigate = useNavigate();
  const driversStore = useDriversStore();
  const { toast } = useToast();
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Safe access to store functions and data
  const getFilteredDrivers = driversStore?.getFilteredDrivers || (() => []);
  const deleteDriver = driversStore?.deleteDriver || (() => Promise.resolve());
  const updateDriver = driversStore?.updateDriver || (() => Promise.resolve());
  const metrics = driversStore?.metrics || [];

  const drivers = getFilteredDrivers();
  const safeMetrics = Array.isArray(metrics) ? metrics : [];

  const getDriverMetrics = (driverName: string) => {
    if (!driverName || !Array.isArray(safeMetrics)) {
      return {
        total_orders: 0,
        completed_orders: 0,
        pending_orders: 0,
        total_tons: 0
      };
    }
    
    return safeMetrics.find(m => m && m.driver_name === driverName) || {
      total_orders: 0,
      completed_orders: 0,
      pending_orders: 0,
      total_tons: 0
    };
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-success text-success-foreground">
        <CheckCircle size={12} className="mr-1" />
        Active
      </Badge>
    ) : (
      <Badge className="bg-gray-400 text-white">
        <XCircle size={12} className="mr-1" />
        Inactive
      </Badge>
    );
  };

  const handleEditDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setEditDialogOpen(true);
  };

  const handleDeleteDriver = async (driverId: string, driverName: string) => {
    try {
      await deleteDriver(driverId);
      toast({
        title: "Driver Deleted",
        description: `Driver ${driverName} has been successfully deleted.`,
      });
    } catch (error) {
      console.error('Failed to delete driver:', error);
      toast({
        title: "Error",
        description: "Failed to delete driver. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleViewDriverDetails = (driver: Driver) => {
    navigate(`/drivers/${driver.id}`);
  };

  const handleStatusToggle = async (driver: Driver) => {
    const newStatus = !driver.is_active;
    
    try {
      await updateDriver(driver.id, { is_active: newStatus });
      toast({
        title: "Status Updated",
        description: `Driver ${driver.name} is now ${newStatus ? 'active' : 'inactive'}.`,
      });
    } catch (error) {
      console.error('Failed to update driver status:', error);
      toast({
        title: "Error",
        description: "Failed to update driver status. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Drivers List</h3>
          <p className="text-sm text-muted-foreground">
            {drivers.length} drivers total
          </p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-foreground">Driver Name</TableHead>
                <TableHead className="text-foreground">Phone Number</TableHead>
                <TableHead className="text-foreground">Status & Actions</TableHead>
                <TableHead className="text-foreground">Total Orders</TableHead>
                <TableHead className="text-foreground">Completed</TableHead>
                <TableHead className="text-foreground">Total Tons</TableHead>
                <TableHead className="text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(drivers) && drivers.length > 0 ? (
                drivers.map((driver) => {
                  if (!driver || !driver.id) return null;
                  
                  const driverMetrics = getDriverMetrics(driver.name);
                  return (
                    <TableRow key={driver.id} className="border-border hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-muted-foreground" />
                          <Button
                            variant="ghost"
                            className="font-medium text-foreground hover:text-primary hover:bg-accent p-0 h-auto"
                            onClick={() => handleViewDriverDetails(driver)}
                          >
                            {driver.name}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <PhoneLink phoneNumber={driver.phone_number} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(driver.is_active)}
                          <RoleBasedComponent action="edit">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusToggle(driver)}
                              className="text-xs px-2 py-1 h-6"
                              title={`Click to ${driver.is_active ? 'deactivate' : 'activate'}`}
                            >
                              {driver.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                          </RoleBasedComponent>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground font-medium">
                        {driverMetrics.total_orders}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {driverMetrics.completed_orders}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {driverMetrics.total_tons} tons
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {/* Edit Button - For Editors+ */}
                          <RoleBasedComponent action="edit">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditDriver(driver)}
                              className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                              title="Edit Driver"
                            >
                              <Edit size={16} />
                            </Button>
                          </RoleBasedComponent>
                          
                          {/* Delete Button - Only for Admins */}
                          <RoleBasedComponent action="delete">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  title="Delete Driver"
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-background text-foreground" aria-describedby="delete-driver-description">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription id="delete-driver-description" className="text-muted-foreground">
                                    This action cannot be undone. This will permanently delete driver {driver.name || 'Unknown Driver'}.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-background text-foreground border-border hover:bg-accent">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteDriver(driver.id, driver.name || 'Unknown Driver')}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </RoleBasedComponent>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No drivers found. Add your first driver!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <EditDriverDialog 
        driver={selectedDriver}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </Card>
  );
}
