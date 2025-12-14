import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDashboardStore } from '@/stores/dashboardStore';
import { useToast } from '@/hooks/use-toast';
import { orderService, frontendToDb } from '@/lib/supabase';

// Use consistent Order type
type Order = {
  id: string;
  customerName: string;
  date: string;
  status: 'pending' | 'in-progress' | 'completed' | 'delayed' | 'delivered';
  amount: number;
  tons: number;
  shift: 'morning' | 'night';
  deliveryNumber?: string;
  company?: string;
  site?: string;
  driverName?: string;
  phoneNumber?: string;
  deliveredAt?: string;
  signedDeliveryNote?: boolean;
  orderType?: 'straight-bar' | 'cut-and-bend';
}

interface EditOrderDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OrderFormData {
  deliveryNumber: string;
  deliveryName: string;
  company: string;
  site: string;
  driverName: string;
  phoneNumber: string;
  status: 'pending' | 'in-progress' | 'completed' | 'delayed';
}

export function EditOrderDialog({ order, open, onOpenChange }: EditOrderDialogProps) {
  const [formData, setFormData] = useState<OrderFormData>({
    deliveryNumber: '',
    deliveryName: '',
    company: '',
    site: '',
    driverName: '',
    phoneNumber: '',
    status: 'pending'
  });
  const [errors, setErrors] = useState<Partial<OrderFormData>>({});
  
  const { toast } = useToast();

  useEffect(() => {
    if (order) {
      setFormData({
        deliveryNumber: order.deliveryNumber || '',
        deliveryName: order.customerName || '',
        company: order.company || '',
        site: order.site || '',
        driverName: order.driverName || '',
        phoneNumber: order.phoneNumber || '',
        status: order.status === 'delivered' ? 'completed' : order.status
      });
    }
  }, [order]);

  const validateForm = (): boolean => {
    const newErrors: Partial<OrderFormData> = {};

    if (!formData.deliveryNumber.trim()) {
      newErrors.deliveryNumber = 'Delivery number is required';
    }
    if (!formData.deliveryName.trim()) {
      newErrors.deliveryName = 'Delivery name is required';
    }
    if (!formData.company.trim()) {
      newErrors.company = 'Company is required';
    }
    if (!formData.site.trim()) {
      newErrors.site = 'Site is required';
    }
    if (!formData.driverName.trim()) {
      newErrors.driverName = 'Driver name is required';
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
    
    if (!validateForm() || !order) {
      return;
    }

    try {
      const updatedOrder = {
        ...order,
        customerName: formData.deliveryName,
        status: formData.status,
        deliveryNumber: formData.deliveryNumber,
        company: formData.company,
        site: formData.site,
        driverName: formData.driverName,
        phoneNumber: formData.phoneNumber
      };

      // Use direct service call instead of store function
      const dbOrder = frontendToDb(updatedOrder);
      await orderService.update(updatedOrder.id, dbOrder);
      
      // Reload orders
      const dashboardState = useDashboardStore.getState();
      if (dashboardState.loadOrders) {
        await dashboardState.loadOrders();
      }
      
      toast({
        title: "Order Updated",
        description: `Order ${order.id} has been successfully updated.`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update order:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update order",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: keyof OrderFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Order {order.id}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deliveryNumber" className="text-foreground">
                Delivery Number *
              </Label>
              <Input
                id="deliveryNumber"
                value={formData.deliveryNumber}
                onChange={(e) => handleInputChange('deliveryNumber', e.target.value)}
                placeholder="DEL-001"
                className={`bg-background text-foreground border-border ${
                  errors.deliveryNumber ? 'border-destructive' : ''
                }`}
              />
              {errors.deliveryNumber && (
                <p className="text-sm text-destructive">{errors.deliveryNumber}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="deliveryName" className="text-foreground">
                Delivery Name *
              </Label>
              <Input
                id="deliveryName"
                value={formData.deliveryName}
                onChange={(e) => handleInputChange('deliveryName', e.target.value)}
                placeholder="John Smith"
                className={`bg-background text-foreground border-border ${
                  errors.deliveryName ? 'border-destructive' : ''
                }`}
              />
              {errors.deliveryName && (
                <p className="text-sm text-destructive">{errors.deliveryName}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company" className="text-foreground">
              Company *
            </Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              placeholder="Acme Corporation"
              className={`bg-background text-foreground border-border ${
                errors.company ? 'border-destructive' : ''
              }`}
            />
            {errors.company && (
              <p className="text-sm text-destructive">{errors.company}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="site" className="text-foreground">
              Site *
            </Label>
            <Input
              id="site"
              value={formData.site}
              onChange={(e) => handleInputChange('site', e.target.value)}
              placeholder="Main Warehouse - Building A"
              className={`bg-background text-foreground border-border ${
                errors.site ? 'border-destructive' : ''
              }`}
            />
            {errors.site && (
              <p className="text-sm text-destructive">{errors.site}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="driverName" className="text-foreground">
                Driver Name *
              </Label>
              <Input
                id="driverName"
                value={formData.driverName}
                onChange={(e) => handleInputChange('driverName', e.target.value)}
                placeholder="Mike Johnson"
                className={`bg-background text-foreground border-border ${
                  errors.driverName ? 'border-destructive' : ''
                }`}
              />
              {errors.driverName && (
                <p className="text-sm text-destructive">{errors.driverName}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-foreground">
                Phone Number *
              </Label>
              <Input
                id="phoneNumber"
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="status" className="text-foreground">
              Order Status
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'pending' | 'in-progress' | 'completed' | 'delayed') => 
                handleInputChange('status', value)
              }
            >
              <SelectTrigger className="bg-background text-foreground border-border">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
              </SelectContent>
            </Select>
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
              Update Order
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
