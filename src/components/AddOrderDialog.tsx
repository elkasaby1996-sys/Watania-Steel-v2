import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { Plus } from 'lucide-react';
import { useDashboardStore } from '../stores/dashboardStore';
import { useDriversStore } from '../stores/driversStore';
import { useAuthStore } from '../stores/authStore';
import { hasPermission } from '../lib/auth';
import { useToast } from '../hooks/use-toast';
import { CalculatorInput } from './CalculatorInput';

interface OrderFormData {
  deliveryNumber: string;
  deliveryName: string;
  company: string;
  site: string;
  driverName: string;
  phoneNumber: string;
  status: 'in-progress' | 'delivered';
  tons: string;
  shift: 'morning' | 'night';
  signedDeliveryNote: boolean;
  orderType: 'straight-bar' | 'cut-and-bend';
  orderDate: string;
  breakdown: {
    '8mm': string;
    '10mm': string;
    '12mm': string;
    '14mm': string;
    '16mm': string;
    '18mm': string;
    '20mm': string;
    '25mm': string;
    '32mm': string;
  };
}

export function AddOrderDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<OrderFormData>({
    deliveryNumber: '',
    deliveryName: '',
    company: '',
    site: '',
    driverName: 'none',
    phoneNumber: '',
        status: 'in-progress',
    tons: '',
    shift: 'morning',
    signedDeliveryNote: false,
    orderType: 'straight-bar',
    orderDate: new Date().toISOString().split('T')[0], // Default to today
    breakdown: {
      '8mm': '',
      '10mm': '',
      '12mm': '',
      '14mm': '',
      '16mm': '',
      '18mm': '',
      '20mm': '',
      '25mm': '',
      '32mm': ''
    }
  });
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  
  const { addOrder } = useDashboardStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [activeDrivers, setActiveDrivers] = useState<any[]>([]);

  // Load drivers when dialog opens
  useEffect(() => {
    if (open) {
      const loadDriversData = async () => {
        try {
          const { useDriversStore } = await import('../stores/driversStore');
          const { loadDrivers, getActiveDrivers } = useDriversStore.getState();
          await loadDrivers();
          const drivers = getActiveDrivers();
          setActiveDrivers(drivers);
        } catch (error) {
          console.error('Failed to load drivers:', error);
          setActiveDrivers([]);
        }
      };
      loadDriversData();
    }
  }, [open]);

  // Check if user has permission to create orders
  const canCreate = hasPermission(user?.profile?.role, 'create');

  const calculateTotalTons = (): number => {
    return Object.values(formData.breakdown).reduce((total, value) => {
      const num = parseFloat(value) || 0;
      return total + num;
    }, 0);
  };

  const validateForm = (): boolean => {
    const newErrors: any = {};

    if (!formData.deliveryNumber || formData.deliveryNumber.trim() === '') {
      newErrors.deliveryNumber = 'Delivery number is required';
    }
    if (!formData.deliveryName || formData.deliveryName.trim() === '') {
      newErrors.deliveryName = 'Delivery name is required';
    }
    if (!formData.company || formData.company.trim() === '') {
      newErrors.company = 'Company is required';
    }
    if (!formData.site || formData.site.trim() === '') {
      newErrors.site = 'Site is required';
    }
    if (!formData.orderDate || formData.orderDate.trim() === '') {
      newErrors.orderDate = 'Order date is required';
    }
    // Driver details are optional - can be updated later
    if (formData.phoneNumber && formData.phoneNumber.trim() !== '' && !/^\+?[\d\s\-\(\)]+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    // Validate breakdown totals
    const totalBreakdown = calculateTotalTons();
    const enteredTons = parseFloat(formData.tons) || 0;
    
    if (!formData.tons || formData.tons.trim() === '') {
      newErrors.tons = 'Total tons is required';
    } else if (isNaN(Number(formData.tons)) || Number(formData.tons) <= 0) {
      newErrors.tons = 'Please enter a valid number of tons';
    } else if (totalBreakdown > 0 && Math.abs(totalBreakdown - enteredTons) > 0.1) {
      newErrors.tons = `Total tons (${enteredTons}) doesn't match breakdown total (${totalBreakdown.toFixed(2)})`;
    }

    // Check for duplicate delivery numbers (exact match including special characters)
    const { orders, historyOrders } = useDashboardStore.getState();
    const deliveryNumber = formData.deliveryNumber;
    const existingActiveOrder = orders.find(o => o.id === deliveryNumber);
    const existingHistoryOrder = historyOrders.find(o => o.id === deliveryNumber);
    
    if (existingActiveOrder || existingHistoryOrder) {
      newErrors.deliveryNumber = `Delivery number "${deliveryNumber}" already exists`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check permissions first
    if (!canCreate) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create orders. Contact your administrator.",
        variant: "destructive"
      });
      return;
    }
    
    if (!validateForm()) {
      return;
    }

    try {
      // Use delivery number as order ID
      const orderId = formData.deliveryNumber;
      
      // Calculate amount based on tons
      const tons = Number(formData.tons);
      const amount = tons * 100; // 100 per ton as example
      
      const newOrder = {
        id: orderId,
        customerName: formData.deliveryName,
        date: new Date().toISOString().split('T')[0],
        status: formData.status,
        amount,
        tons,
        shift: formData.shift,
        deliveryNumber: formData.deliveryNumber,
        company: formData.company || '',
        site: formData.site || '',
        driverName: formData.driverName === 'none' ? '' : formData.driverName || '',
        phoneNumber: formData.phoneNumber || '',
        signedDeliveryNote: formData.signedDeliveryNote,
        orderType: formData.orderType,
        breakdown: {
          '8mm': parseFloat(formData.breakdown['8mm']) || 0,
          '10mm': parseFloat(formData.breakdown['10mm']) || 0,
          '12mm': parseFloat(formData.breakdown['12mm']) || 0,
          '14mm': parseFloat(formData.breakdown['14mm']) || 0,
          '16mm': parseFloat(formData.breakdown['16mm']) || 0,
          '18mm': parseFloat(formData.breakdown['18mm']) || 0,
          '20mm': parseFloat(formData.breakdown['20mm']) || 0,
          '25mm': parseFloat(formData.breakdown['25mm']) || 0,
          '32mm': parseFloat(formData.breakdown['32mm']) || 0,
        }
      };

      await addOrder(newOrder);
      
      toast({
        title: "Order Created",
        description: `Order ${orderId} has been successfully created.`,
      });

      // Reset form and close dialog
      setFormData({
        deliveryNumber: '',
        deliveryName: '',
        company: '',
        site: '',
        driverName: 'none',
        phoneNumber: '',
        status: 'in-progress',
        tons: '',
        shift: 'morning',
        signedDeliveryNote: false,
        orderType: 'straight-bar',
        breakdown: {
          '8mm': '',
          '10mm': '',
          '12mm': '',
          '14mm': '',
          '16mm': '',
          '18mm': '',
          '20mm': '',
          '25mm': '',
          '32mm': ''
        }
      });
      setErrors({});
      setOpen(false);
    } catch (error) {
      console.error('Order creation failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create order. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: keyof OrderFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBreakdownChange = (size: keyof OrderFormData['breakdown'], value: string) => {
    setFormData(prev => ({
      ...prev,
      breakdown: {
        ...prev.breakdown,
        [size]: value
      }
    }));
    
    // Auto-calculate total tons if breakdown is being used
    const newBreakdown = { ...formData.breakdown, [size]: value };
    const total = Object.values(newBreakdown).reduce((sum, val) => {
      const num = parseFloat(val) || 0;
      return sum + num;
    }, 0);
    
    if (total > 0) {
      setFormData(prev => ({ ...prev, tons: total.toFixed(2) }));
    }
  };

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form when dialog closes
      setFormData({
        deliveryNumber: '',
        deliveryName: '',
        company: '',
        site: '',
        driverName: 'none',
        phoneNumber: '',
        status: 'in-progress',
        tons: '',
        shift: 'morning',
        signedDeliveryNote: false,
        orderType: 'straight-bar',
        orderDate: new Date().toISOString().split('T')[0],
        breakdown: {
          '8mm': '',
          '10mm': '',
          '12mm': '',
          '14mm': '',
          '16mm': '',
          '18mm': '',
          '20mm': '',
          '25mm': '',
          '32mm': ''
        }
      });
      setErrors({});
      setLoading(false);
      setActiveDrivers([]);
    }
  };

  // Don't render the dialog if user doesn't have permission
  if (!canCreate) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
          <Plus size={20} />
          <span className="font-medium">Add New Order</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] bg-background text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create New Order</DialogTitle>
        </DialogHeader>
        <form 
          onSubmit={handleSubmit} 
          className="space-y-6" 
          id="add-order-form"
          onReset={() => {
            console.log('🔄 Form reset triggered');
            setErrors({});
            setLoading(false);
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="add-deliveryNumber" className="text-foreground">
                  Delivery Number * (Can include letters, numbers, special characters)
                </Label>
              <Input
                id="add-deliveryNumber"
                name="deliveryNumber"
                value={formData.deliveryNumber}
                onChange={(e) => handleInputChange('deliveryNumber', e.target.value)}
                placeholder="Enter any delivery number (e.g., DEL-001, PROJ-2024-ABC, etc.)"
                className={`bg-background text-foreground border-border ${
                  errors.deliveryNumber ? 'border-destructive' : ''
                }`}
              />
              {errors.deliveryNumber && (
                <p className="text-sm text-destructive">{errors.deliveryNumber}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="add-deliveryName" className="text-foreground">
                Delivery Name *
              </Label>
              <Input
                id="add-deliveryName"
                name="deliveryName"
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
            <Label htmlFor="add-company" className="text-foreground">
              Company *
            </Label>
            <Input
              id="add-company"
              name="company"
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
            <Label htmlFor="add-site" className="text-foreground">
              Site *
            </Label>
            <Input
              id="add-site"
              name="site"
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
                <Label htmlFor="add-driverName" className="text-foreground">
                  Driver Name
                </Label>
                <Select
                  name="driverName"
                  value={formData.driverName}
                  onValueChange={(value) => {
                    const driverName = value === 'none' ? '' : value;
                    handleInputChange('driverName', driverName);
                    // Auto-fill phone number if driver is selected
                    if (value !== 'none') {
                      const selectedDriver = activeDrivers.find(d => d.name === value);
                      if (selectedDriver) {
                        handleInputChange('phoneNumber', selectedDriver.phone_number);
                      }
                    } else {
                      // Clear phone number if no driver selected
                      handleInputChange('phoneNumber', '');
                    }
                  }}
                >
                  <SelectTrigger id="add-driverName" className="bg-background text-foreground border-border">
                    <SelectValue placeholder="Select driver (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground">
                    <SelectItem value="none">No driver assigned</SelectItem>
                    {activeDrivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.name}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Select from active drivers or leave empty</p>
              </div>
            
            <div className="space-y-2">
              <Label htmlFor="add-phoneNumber" className="text-foreground">
                Phone Number
              </Label>
              <Input
                id="add-phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                placeholder="+1 (555) 123-4567 (optional)"
                className={`bg-background text-foreground border-border ${
                  errors.phoneNumber ? 'border-destructive' : ''
                }`}
              />
              {errors.phoneNumber && (
                <p className="text-sm text-destructive">{errors.phoneNumber}</p>
              )}
              <p className="text-xs text-muted-foreground">Can be updated later</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-order-date" className="text-foreground">
                  Order Date *
                </Label>
                <Input
                  id="add-order-date"
                  name="orderDate"
                  type="date"
                  value={formData.orderDate}
                  onChange={(e) => handleInputChange('orderDate', e.target.value)}
                  className={`bg-background text-foreground border-border ${
                    errors.orderDate ? 'border-destructive' : ''
                  }`}
                />
                {errors.orderDate && (
                  <p className="text-sm text-destructive">{errors.orderDate}</p>
                )}
              </div>

            <div className="space-y-2">
              <Label htmlFor="add-tons" className="text-foreground">
                Total Tons *
              </Label>
              <Input
                id="add-tons"
                name="tons"
                type="number"
                step="0.1"
                value={formData.tons}
                onChange={(e) => handleInputChange('tons', e.target.value)}
                placeholder="12.5"
                className={`bg-background text-foreground border-border ${
                  errors.tons ? 'border-destructive' : ''
                }`}
              />
              {errors.tons && (
                <p className="text-sm text-destructive">{errors.tons}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-shift" className="text-foreground">
                Shift
              </Label>
              <Select
                name="shift"
                value={formData.shift}
                onValueChange={(value: 'morning' | 'night') => 
                  handleInputChange('shift', value)
                }
              >
                <SelectTrigger id="add-shift" className="bg-background text-foreground border-border">
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="morning">Morning Shift</SelectItem>
                  <SelectItem value="night">Night Shift</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-orderType" className="text-foreground">
                Order Type *
              </Label>
              <Select
                name="orderType"
                value={formData.orderType}
                onValueChange={(value: 'straight-bar' | 'cut-and-bend') => 
                  handleInputChange('orderType', value)
                }
              >
                <SelectTrigger id="add-orderType" className="bg-background text-foreground border-border">
                  <SelectValue placeholder="Select order type" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="straight-bar">Straight Bar</SelectItem>
                  <SelectItem value="cut-and-bend">Cut and Bend</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-status" className="text-foreground">
                Order Status
              </Label>
                <Select
                  name="status"
                  value={formData.status}
                  onValueChange={(value: 'in-progress' | 'delivered') => 
                    handleInputChange('status', value)
                  }
                >
                  <SelectTrigger id="add-status" className="bg-background text-foreground border-border">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground">
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="add-signedDeliveryNote"
              checked={formData.signedDeliveryNote}
              onCheckedChange={(checked) => handleInputChange('signedDeliveryNote', checked as boolean)}
            />
            <Label htmlFor="add-signedDeliveryNote" className="text-foreground">
              Signed Delivery Note Received
            </Label>
          </div>

          <Separator />

          {/* Steel Breakdown Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-foreground">Steel Breakdown (Tons)</h4>
              <div className="text-sm text-muted-foreground">
                Total: {calculateTotalTons().toFixed(2)} tons
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(formData.breakdown).map(([size, value]) => (
                <div key={size} className="space-y-1">
                  <Label htmlFor={`breakdown-${size}`} className="text-xs text-foreground">
                    {size}
                  </Label>
                  <CalculatorInput
                    id={`breakdown-${size}`}
                    name={`breakdown-${size}`}
                    value={value}
                    onChange={(newValue) => handleBreakdownChange(size as keyof OrderFormData['breakdown'], newValue)}
                    placeholder="0.0 or =10+5"
                    className="bg-background text-foreground border-border text-sm h-8"
                    step="0.1"
                  />
                </div>
              ))}
            </div>
            
              <p className="text-xs text-muted-foreground">
                Enter tonnage for each steel bar size. Start with "=" for calculations (e.g., =10+5).
              </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
