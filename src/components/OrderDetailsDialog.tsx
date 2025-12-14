import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { Calendar, Clock, User, Building, MapPin, Phone, Truck, Package, Weight, FileCheck, Wrench } from 'lucide-react';
import { useDashboardStore } from '../stores/dashboardStore';
import { useDriversStore } from '../stores/driversStore';
import { useAuthStore } from '../stores/authStore';
import { hasPermission } from '../lib/auth';
import { useToast } from '../hooks/use-toast';
import { historyService, orderService, type HistoryOrder } from '../lib/supabase';
import { CalculatorInput } from './CalculatorInput';

interface OrderDetailsDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly?: boolean;
}

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

export function OrderDetailsDialog({ order, open, onOpenChange, readOnly = false }: OrderDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<OrderFormData>({
    deliveryNumber: '',
    deliveryName: '',
    company: '',
    site: '',
    driverName: '',
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

  const { user } = useAuthStore();
  const { toast } = useToast();
  
  const userRole = user?.profile?.role;
  const canEdit = hasPermission(userRole, 'edit') && !readOnly;
  
  // Check if this is a history order
  const isHistoryOrder = order && (
    'customer_name' in order || 
    'delivery_number' in order || 
    'driver_name' in order ||
    'phone_number' in order ||
    'signed_delivery_note' in order ||
    'order_type' in order
  );

  // Get active drivers safely
  const [activeDrivers, setActiveDrivers] = useState<any[]>([]);

  useEffect(() => {
    if (open && isEditing) {
      const loadDrivers = async () => {
        try {
          const { useDriversStore } = await import('../stores/driversStore');
          const { loadDrivers: loadDriversFunc, getActiveDrivers } = useDriversStore.getState();
          await loadDriversFunc();
          const drivers = getActiveDrivers();
          setActiveDrivers(drivers);
        } catch (error) {
          console.error('Failed to load drivers:', error);
          setActiveDrivers([]);
        }
      };
      loadDrivers();
    }
  }, [open, isEditing]);

  useEffect(() => {
    if (order) {
      const orderData = isHistoryOrder ? {
        id: order.id,
        customerName: order.customer_name,
        date: order.date,
        status: order.status,
        amount: order.amount,
        tons: order.tons,
        shift: order.shift,
        deliveryNumber: order.delivery_number || order.id,
        company: order.company,
        site: order.site,
        driverName: order.driver_name,
        phoneNumber: order.phone_number,
        deliveredAt: order.delivered_at,
        signedDeliveryNote: order.signed_delivery_note,
        orderType: order.order_type,
        breakdown: {
          '8mm': Number(order.breakdown_8mm) || 0,
          '10mm': Number(order.breakdown_10mm) || 0,
          '12mm': Number(order.breakdown_12mm) || 0,
          '14mm': Number(order.breakdown_14mm) || 0,
          '16mm': Number(order.breakdown_16mm) || 0,
          '18mm': Number(order.breakdown_18mm) || 0,
          '20mm': Number(order.breakdown_20mm) || 0,
          '25mm': Number(order.breakdown_25mm) || 0,
          '32mm': Number(order.breakdown_32mm) || 0,
        }
      } : order;

      setFormData({
        deliveryNumber: orderData.deliveryNumber || orderData.id,
        deliveryName: orderData.customerName || '',
        company: orderData.company || '',
        site: orderData.site || '',
        driverName: orderData.driverName || '',
        phoneNumber: orderData.phoneNumber || '',
        status: orderData.status === 'delivered' ? 'delivered' : orderData.status,
        tons: orderData.tons?.toString() || '',
        shift: orderData.shift || 'morning',
        signedDeliveryNote: orderData.signedDeliveryNote || false,
        orderType: orderData.orderType || 'straight-bar',
        orderDate: orderData.date || new Date().toISOString().split('T')[0],
        breakdown: {
          '8mm': orderData.breakdown?.['8mm']?.toString() || '0',
          '10mm': orderData.breakdown?.['10mm']?.toString() || '0',
          '12mm': orderData.breakdown?.['12mm']?.toString() || '0',
          '14mm': orderData.breakdown?.['14mm']?.toString() || '0',
          '16mm': orderData.breakdown?.['16mm']?.toString() || '0',
          '18mm': orderData.breakdown?.['18mm']?.toString() || '0',
          '20mm': orderData.breakdown?.['20mm']?.toString() || '0',
          '25mm': orderData.breakdown?.['25mm']?.toString() || '0',
          '32mm': orderData.breakdown?.['32mm']?.toString() || '0',
        }
      });
      setIsEditing(false);
    }
  }, [order, isHistoryOrder]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success text-success-foreground">Completed</Badge>;
      case 'in-progress':
        return <Badge className="bg-tertiary text-tertiary-foreground">In Progress</Badge>;
      case 'delayed':
        return <Badge className="bg-warning text-warning-foreground">Delayed</Badge>;
      case 'pending':
        return <Badge className="bg-gray-400 text-white">Pending</Badge>;
      case 'delivered':
        return <Badge className="bg-green-600 text-white">Delivered</Badge>;
      default:
        return <Badge className="bg-gray-400 text-white">{status}</Badge>;
    }
  };

  const getShiftBadge = (shift: string) => {
    return (
      <Badge className={shift === 'morning' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
        {shift === 'morning' ? 'Morning Shift' : 'Night Shift'}
      </Badge>
    );
  };

  const formatDeliveredDate = (deliveredAt?: string, date?: string) => {
    const dateToFormat = deliveredAt || date;
    if (!dateToFormat) return '';
    
    const deliveryDate = new Date(dateToFormat);
    return deliveryDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: deliveredAt ? '2-digit' : undefined,
      minute: deliveredAt ? '2-digit' : undefined
    });
  };

  const handleInputChange = (field: keyof OrderFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBreakdownChange = (size: keyof OrderFormData['breakdown'], value: string) => {
    setFormData(prev => ({
      ...prev,
      breakdown: {
        ...prev.breakdown,
        [size]: value
      }
    }));
    
    const newBreakdown = { ...formData.breakdown, [size]: value };
    const total = Object.values(newBreakdown).reduce((sum, val) => {
      const num = parseFloat(val) || 0;
      return sum + num;
    }, 0);
    
    if (total > 0) {
      setFormData(prev => ({ ...prev, tons: total.toFixed(2) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!order) {
      toast({
        title: "Error",
        description: "No order data available",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const tons = Number(formData.tons);
      
      if (isHistoryOrder) {
        console.log('📝 Dialog: Handling HISTORY order update for:', order.id);
        
        const updatedHistoryOrder: any = {
          ...order,
          customer_name: formData.deliveryName,
          status: formData.status,
          delivery_number: formData.deliveryNumber,
          company: formData.company,
          site: formData.site,
          driver_name: formData.driverName,
          phone_number: formData.phoneNumber,
          tons: tons,
          shift: formData.shift,
          amount: tons * 100,
          signed_delivery_note: formData.signedDeliveryNote,
          order_type: formData.orderType,
          date: formData.orderDate,
          breakdown_8mm: parseFloat(formData.breakdown['8mm']) || 0,
          breakdown_10mm: parseFloat(formData.breakdown['10mm']) || 0,
          breakdown_12mm: parseFloat(formData.breakdown['12mm']) || 0,
          breakdown_14mm: parseFloat(formData.breakdown['14mm']) || 0,
          breakdown_16mm: parseFloat(formData.breakdown['16mm']) || 0,
          breakdown_18mm: parseFloat(formData.breakdown['18mm']) || 0,
          breakdown_20mm: parseFloat(formData.breakdown['20mm']) || 0,
          breakdown_25mm: parseFloat(formData.breakdown['25mm']) || 0,
          breakdown_32mm: parseFloat(formData.breakdown['32mm']) || 0,
        };

        if (formData.status === 'in-progress') {
          console.log('📤 Dialog: Moving history order to active orders');
          await historyService.moveOrderToActive(order);
          
          toast({
            title: "Order Moved",
            description: `Order ${order.id} has been moved back to active orders.`,
          });
          
          setIsEditing(false);
          onOpenChange(false);
          
          setTimeout(async () => {
            const dashboardState = useDashboardStore.getState();
            if (dashboardState.loadOrders) {
              await dashboardState.loadOrders();
            }
            if (dashboardState.loadHistoryOrders) {
              await dashboardState.loadHistoryOrders();
            }
          }, 500);
          
          return;
        } else {
          console.log('📝 Dialog: Updating history order in place');
          await historyService.update(order.id, updatedHistoryOrder);
          
          toast({
            title: "Order Updated",
            description: `Order ${order.id} has been successfully updated.`,
          });
          
          setTimeout(async () => {
            const dashboardState = useDashboardStore.getState();
            if (dashboardState.loadHistoryOrders) {
              await dashboardState.loadHistoryOrders();
            }
          }, 500);
        }
      } else {
        console.log('📝 Dialog: Handling ACTIVE order update for:', order.id);
        
        const updatedOrder = {
          ...order,
          customerName: formData.deliveryName,
          status: formData.status,
          deliveryNumber: formData.deliveryNumber,
          company: formData.company,
          site: formData.site,
          driverName: formData.driverName,
          phoneNumber: formData.phoneNumber,
          tons: tons,
          shift: formData.shift,
          amount: tons * 100,
          signedDeliveryNote: formData.signedDeliveryNote,
          orderType: formData.orderType,
          date: formData.orderDate,
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

        if (formData.status === 'delivered') {
          console.log('📤 Dialog: Active order marked as delivered, moving to history');
          await historyService.moveOrderToHistory(updatedOrder);
          
          toast({
            title: "Order Delivered",
            description: `Order ${order.id} has been marked as delivered and moved to history.`,
          });
        } else {
          console.log('📝 Dialog: Updating active order in place');
          
          const updateData = {
            customer_name: formData.deliveryName,
            delivery_number: formData.deliveryNumber,
            company: formData.company,
            site: formData.site,
            driver_name: formData.driverName,
            phone_number: formData.phoneNumber,
            tons: tons,
            shift: formData.shift,
            amount: tons * 100,
            signed_delivery_note: formData.signedDeliveryNote,
            order_type: formData.orderType,
            date: formData.orderDate,
            breakdown_8mm: parseFloat(formData.breakdown['8mm']) || 0,
            breakdown_10mm: parseFloat(formData.breakdown['10mm']) || 0,
            breakdown_12mm: parseFloat(formData.breakdown['12mm']) || 0,
            breakdown_14mm: parseFloat(formData.breakdown['14mm']) || 0,
            breakdown_16mm: parseFloat(formData.breakdown['16mm']) || 0,
            breakdown_18mm: parseFloat(formData.breakdown['18mm']) || 0,
            breakdown_20mm: parseFloat(formData.breakdown['20mm']) || 0,
            breakdown_25mm: parseFloat(formData.breakdown['25mm']) || 0,
            breakdown_32mm: parseFloat(formData.breakdown['32mm']) || 0,
          };
          
          await orderService.update(order.id, updateData);
          
          toast({
            title: "Order Updated",
            description: `Order ${order.id} has been successfully updated.`,
          });
        }
        
        setTimeout(async () => {
          const dashboardState = useDashboardStore.getState();
          if (dashboardState.loadOrders) {
            await dashboardState.loadOrders();
          }
          if (formData.status === 'delivered' && dashboardState.loadHistoryOrders) {
            await dashboardState.loadHistoryOrders();
          }
        }, 500);
      }

      setIsEditing(false);
      
    } catch (error) {
      console.error('❌ Dialog: Failed to update order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update order. Please try again.';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-background text-foreground max-h-[90vh] overflow-y-auto" aria-describedby="order-details-description">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-foreground">Order Details - {
              isHistoryOrder 
                ? (order.delivery_number || order.id)
                : (order.deliveryNumber || order.id)
            }</DialogTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge(order.status)}
              {getShiftBadge(order.shift)}
            </div>
          </div>
        </DialogHeader>
        <div id="order-details-description" className="sr-only">
          View and edit order information, steel breakdown, and delivery details.
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-6" id="edit-order-form">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-deliveryNumber" className="text-foreground">
                  Delivery Number *
                </Label>
                <Input
                  id="edit-deliveryNumber"
                  name="deliveryNumber"
                  value={formData.deliveryNumber}
                  onChange={(e) => handleInputChange('deliveryNumber', e.target.value)}
                  className="bg-background text-foreground border-border"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-deliveryName" className="text-foreground">
                  Delivery Name *
                </Label>
                <Input
                  id="edit-deliveryName"
                  name="deliveryName"
                  value={formData.deliveryName}
                  onChange={(e) => handleInputChange('deliveryName', e.target.value)}
                  className="bg-background text-foreground border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-company" className="text-foreground">
                Company *
              </Label>
              <Input
                id="edit-company"
                name="company"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                className="bg-background text-foreground border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-site" className="text-foreground">
                Site *
              </Label>
              <Input
                id="edit-site"
                name="site"
                value={formData.site}
                onChange={(e) => handleInputChange('site', e.target.value)}
                className="bg-background text-foreground border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-driverName" className="text-foreground">
                  Driver Name
                </Label>
                <Select
                  name="driverName"
                  value={formData.driverName || 'none'}
                  onValueChange={(value) => {
                    const driverName = value === 'none' ? '' : value;
                    handleInputChange('driverName', driverName);
                    if (value !== 'none' && Array.isArray(activeDrivers)) {
                      const selectedDriver = activeDrivers.find(d => d && d.name === value);
                      if (selectedDriver && selectedDriver.phone_number) {
                        handleInputChange('phoneNumber', selectedDriver.phone_number);
                      }
                    }
                  }}
                >
                  <SelectTrigger id="edit-driverName" className="bg-background text-foreground border-border">
                    <SelectValue placeholder="Select driver (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground">
                    <SelectItem value="none">No driver assigned</SelectItem>
                    {Array.isArray(activeDrivers) && activeDrivers.map((driver) => (
                      driver && driver.id && driver.name ? (
                        <SelectItem key={driver.id} value={driver.name}>
                          {driver.name}
                        </SelectItem>
                      ) : null
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-phoneNumber" className="text-foreground">
                  Phone Number
                </Label>
                <Input
                  id="edit-phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="bg-background text-foreground border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-order-date" className="text-foreground">
                  Order Date *
                </Label>
                <Input
                  id="edit-order-date"
                  name="orderDate"
                  type="date"
                  value={formData.orderDate}
                  onChange={(e) => handleInputChange('orderDate', e.target.value)}
                  className="bg-background text-foreground border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-tons" className="text-foreground">
                  Total Tons *
                </Label>
                <Input
                  id="edit-tons"
                  name="tons"
                  type="number"
                  step="0.1"
                  value={formData.tons}
                  onChange={(e) => handleInputChange('tons', e.target.value)}
                  placeholder="12.5"
                  className="bg-background text-foreground border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-shift" className="text-foreground">
                  Shift
                </Label>
                <Select
                  name="shift"
                  value={formData.shift}
                  onValueChange={(value: 'morning' | 'night') => 
                    handleInputChange('shift', value)
                  }
                >
                  <SelectTrigger id="edit-shift" className="bg-background text-foreground border-border">
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
                <Label htmlFor="edit-orderType" className="text-foreground">
                  Order Type *
                </Label>
                <Select
                  name="orderType"
                  value={formData.orderType}
                  onValueChange={(value: 'straight-bar' | 'cut-and-bend') => 
                    handleInputChange('orderType', value)
                  }
                >
                  <SelectTrigger id="edit-orderType" className="bg-background text-foreground border-border">
                    <SelectValue placeholder="Select order type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground">
                    <SelectItem value="straight-bar">Straight Bar</SelectItem>
                    <SelectItem value="cut-and-bend">Cut and Bend</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status" className="text-foreground">
                  Order Status
                </Label>
                <Select
                  name="status"
                  value={formData.status}
                  onValueChange={(value: 'in-progress' | 'delivered') => {
                    console.log('📊 Status change:', formData.status, '→', value);
                    handleInputChange('status', value);
                  }}
                >
                  <SelectTrigger id="edit-status" className="bg-background text-foreground border-border">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground">
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
                {isHistoryOrder && formData.status === 'in-progress' && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                    ⚠️ This will move the order back to today's active orders
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-signedDeliveryNote"
                checked={formData.signedDeliveryNote}
                onCheckedChange={(checked) => handleInputChange('signedDeliveryNote', checked as boolean)}
              />
              <Label htmlFor="edit-signedDeliveryNote" className="text-foreground">
                Signed Delivery Note Received
              </Label>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">Steel Breakdown (Tons)</h4>
                <div className="text-sm text-muted-foreground">
                  Total: {Object.values(formData.breakdown).reduce((sum, val) => {
                    const num = parseFloat(val) || 0;
                    return sum + num;
                  }, 0).toFixed(2)} tons
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(formData.breakdown).map(([size, value]) => (
                  <div key={size} className="space-y-1">
                    <Label htmlFor={`edit-breakdown-${size}`} className="text-xs text-foreground">
                      {size}
                    </Label>
                    <CalculatorInput
                      id={`edit-breakdown-${size}`}
                      name={`edit-breakdown-${size}`}
                      value={value}
                      onChange={(newValue) => handleBreakdownChange(size as keyof OrderFormData['breakdown'], newValue)}
                      placeholder="0.0 or =10+5"
                      className="bg-background text-foreground border-border text-sm h-8"
                      step="0.1"
                    />
                  </div>
                ))}
              </div>
              
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => setIsEditing(false)}
                className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
              >
                {loading ? (
                  'Processing...'
                ) : (
                  isHistoryOrder && formData.status === 'in-progress' 
                    ? 'Move to Active Orders' 
                    : 'Update Order'
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery Number</p>
                    <p className="font-medium text-foreground">
                      {isHistoryOrder 
                        ? (order.delivery_number || order.id)
                        : (order.deliveryNumber || order.id)
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {order.status === 'delivered' ? 'Delivered Date' : 'Order Date'}
                    </p>
                    <p className="font-medium text-foreground">
                      {formatDeliveredDate(order.deliveredAt || order.delivered_at, order.date)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Weight className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Weight</p>
                    <p className="font-medium text-foreground">{order.tons} tons</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Shift</p>
                    <p className="font-medium text-foreground">
                      {order.shift === 'morning' ? 'Morning Shift' : 'Night Shift'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Wrench className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Order Type</p>
                    <p className="font-medium text-foreground">
                      {(() => {
                        const orderType = isHistoryOrder 
                          ? order.order_type 
                          : order.orderType;
                        return orderType === 'cut-and-bend' ? 'Cut and Bend' : 'Straight Bar';
                      })()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileCheck className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery Note</p>
                    <p className="font-medium text-foreground">
                      {(() => {
                        const signedNote = isHistoryOrder 
                          ? order.signed_delivery_note 
                          : order.signedDeliveryNote;
                        return signedNote ? (
                          <span className="text-success">✓ Signed</span>
                        ) : (
                          <span className="text-muted-foreground">Not Signed</span>
                        );
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Customer Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery Name</p>
                    <p className="font-medium text-foreground">
                      {isHistoryOrder ? order.customer_name : order.customerName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-medium text-foreground">{order.company || 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Site</p>
                  <p className="font-medium text-foreground">{order.site || 'N/A'}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Steel Breakdown</h4>
              <div className="grid grid-cols-3 gap-3">
                {['8mm', '10mm', '12mm', '14mm', '16mm', '18mm', '20mm', '25mm', '32mm'].map((size) => {
                  let tons = 0;
                  if (isHistoryOrder) {
                    tons = Number(order[`breakdown_${size}`]) || 0;
                  } else {
                    tons = order.breakdown?.[size] || 0;
                  }
                  
                  return (
                    <div key={size} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm font-medium text-foreground">{size}</span>
                      <span className="text-sm text-muted-foreground">
                        {tons > 0 ? `${tons} tons` : '0 tons'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Driver Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Driver Name</p>
                    <p className="font-medium text-foreground">
                      {isHistoryOrder ? (order.driver_name || 'N/A') : (order.driverName || 'N/A')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone Number</p>
                    <div className="font-medium">
                      {(() => {
                        const phoneNumber = isHistoryOrder ? order.phone_number : order.phoneNumber;
                        return phoneNumber ? (
                          <a 
                            href={`tel:${phoneNumber.replace(/[\s\-\(\)]/g, '')}`}
                            className="text-primary hover:text-primary/80 underline cursor-pointer"
                            title="Click to call"
                          >
                            {phoneNumber}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
              >
                Close
              </Button>
              
              {canEdit && (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Edit Order
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
