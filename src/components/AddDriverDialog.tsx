import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Plus } from 'lucide-react';
import { useDriversStore } from '../stores/driversStore';
import { useAuthStore } from '../stores/authStore';
import { hasPermission } from '../lib/auth';
import { useToast } from '../hooks/use-toast';

interface DriverFormData {
  name: string;
  phoneNumber: string;
  isActive: boolean;
}

export function AddDriverDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<DriverFormData>({
    name: '',
    phoneNumber: '',
    isActive: true
  });
  const [errors, setErrors] = useState<Partial<DriverFormData>>({});
  
  const { addDriver } = useDriversStore();
  const { user } = useAuthStore();
  const { toast } = useToast();

  // Check if user has permission to create drivers
  const canCreate = hasPermission(user?.profile?.role, 'create');

  const validateForm = (): boolean => {
    const newErrors: Partial<DriverFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Driver name is required';
    }
    
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreate) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create drivers. Contact your administrator.",
        variant: "destructive"
      });
      return;
    }
    
    if (!validateForm()) {
      return;
    }

    try {
      const newDriver = {
        name: formData.name.trim(),
        phone_number: formData.phoneNumber.trim(),
        is_active: formData.isActive
      };

      await addDriver(newDriver);
      
      toast({
        title: "Driver Created",
        description: `Driver ${formData.name} has been successfully created.`,
      });

      // Reset form and close dialog
      setFormData({
        name: '',
        phoneNumber: '',
        isActive: true
      });
      setErrors({});
      setOpen(false);
    } catch (error) {
      console.error('Driver creation failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create driver. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: keyof DriverFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Don't render the dialog if user doesn't have permission
  if (!canCreate) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
          <Plus size={20} />
          <span className="font-medium">Add New Driver</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-background text-foreground" aria-describedby="add-driver-description">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add New Driver</DialogTitle>
        </DialogHeader>
        <div id="add-driver-description" className="sr-only">
          Create a new driver with contact information and status.
        </div>
        <form onSubmit={handleSubmit} className="space-y-6" id="add-driver-form">
          <div className="space-y-2">
            <Label htmlFor="add-driver-name" className="text-foreground">
              Driver Name *
            </Label>
            <Input
              id="add-driver-name"
              name="driverName"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="John Smith"
              className={`bg-background text-foreground border-border ${
                errors.name ? 'border-destructive' : ''
              }`}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="add-driver-phone" className="text-foreground">
              Phone Number *
            </Label>
            <Input
              id="add-driver-phone"
              name="driverPhone"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              placeholder="+1 (555) 123-4567"
              className={`bg-background text-foreground border-border ${
                errors.phoneNumber ? 'border-destructive' : ''
              }`}
            />
            {errors.phoneNumber && (
              <p className="text-sm text-destructive">{errors.phoneNumber}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="add-driver-active"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange('isActive', checked as boolean)}
            />
            <Label htmlFor="add-driver-active" className="text-foreground">
              Driver is Active
            </Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Create Driver
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
