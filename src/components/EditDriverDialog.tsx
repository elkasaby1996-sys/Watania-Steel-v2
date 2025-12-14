import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { useDriversStore } from '../stores/driversStore';
import { useToast } from '../hooks/use-toast';

interface Driver {
  id: string;
  name: string;
  phone_number: string;
  is_active: boolean;
}

interface EditDriverDialogProps {
  driver: Driver | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DriverFormData {
  name: string;
  phoneNumber: string;
  isActive: boolean;
}

export function EditDriverDialog({ driver, open, onOpenChange }: EditDriverDialogProps) {
  const [formData, setFormData] = useState<DriverFormData>({
    name: '',
    phoneNumber: '',
    isActive: true
  });
  const [errors, setErrors] = useState<Partial<DriverFormData>>({});
  
  const { updateDriver } = useDriversStore();
  const { toast } = useToast();

  useEffect(() => {
    if (driver) {
      setFormData({
        name: driver.name || '',
        phoneNumber: driver.phone_number || '',
        isActive: driver.is_active
      });
    }
  }, [driver]);

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
    
    if (!validateForm() || !driver) {
      return;
    }

    try {
      const updatedDriver = {
        name: formData.name.trim(),
        phone_number: formData.phoneNumber.trim(),
        is_active: formData.isActive
      };

      await updateDriver(driver.id, updatedDriver);
      
      toast({
        title: "Driver Updated",
        description: `Driver ${formData.name} has been successfully updated.`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update driver:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update driver. Please try again.",
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

  if (!driver) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background text-foreground" aria-describedby="edit-driver-description">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Driver</DialogTitle>
        </DialogHeader>
        <div id="edit-driver-description" className="sr-only">
          Edit driver information including name, phone number, and status.
        </div>
        <form onSubmit={handleSubmit} className="space-y-6" id="edit-driver-form">
          <div className="space-y-2">
            <Label htmlFor="edit-driver-name" className="text-foreground">
              Driver Name *
            </Label>
            <Input
              id="edit-driver-name"
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
            <Label htmlFor="edit-driver-phone" className="text-foreground">
              Phone Number *
            </Label>
            <Input
              id="edit-driver-phone"
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
              id="edit-driver-active"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange('isActive', checked as boolean)}
            />
            <Label htmlFor="edit-driver-active" className="text-foreground">
              Driver is Active
            </Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Update Driver
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
