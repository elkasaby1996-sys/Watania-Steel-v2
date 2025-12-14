import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit, Truck, Trash2, Eye, CheckCircle, XCircle } from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboardStore';
import { OrderDetailsDialog } from './OrderDetailsDialog';
import { RoleBasedComponent } from './RoleBasedComponent';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/lib/auth';
import { orderService } from '@/lib/supabase';

export function OrderTable() {
  const { getFilteredTodayOrders, deleteOrder } = useDashboardStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const todayOrders = getFilteredTodayOrders();
  const userRole = user?.profile?.role;

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

  const handleMarkAsDelivered = async (orderId: string) => {
    console.log('🚚 Truck button clicked for order:', orderId);
    
    const order = todayOrders.find(o => o.id === orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    console.log('📦 Order details:', { id: order.id, date: order.date, status: order.status });
    
    try {
      // Use the store's markAsDelivered method which handles everything properly
      const { markAsDelivered } = useDashboardStore.getState();
      await markAsDelivered(orderId);
      
      console.log('✅ Order moved to history successfully');
      
    } catch (error) {
      console.error('❌ Failed to move order to history:', error);
      throw error;
    }
  };

  const handleViewOrder = (order: any) => {
    console.log('🔍 OrderTable - Selected order:', order);
    alert(`Debug: Order data = ${JSON.stringify({
      id: order.id,
      orderType: order.orderType,
      signedDeliveryNote: order.signedDeliveryNote,
      breakdown: order.breakdown
    }, null, 2)}`);
    setSelectedOrder(order);
    setDetailsDialogOpen(true);
  };

  const handleDeleteOrder = (orderId: string) => {
    deleteOrder(orderId);
    toast({
      title: "Order Deleted",
      description: `Order ${orderId} has been successfully deleted.`,
    });
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Today's Orders</h3>
          <p className="text-sm text-muted-foreground">
            {todayOrders.length} active orders
          </p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-foreground">Delivery Number</TableHead>
                <TableHead className="text-foreground">Delivery Name</TableHead>
                <TableHead className="text-foreground">Company</TableHead>
                <TableHead className="text-foreground">Site</TableHead>
                <TableHead className="text-foreground">Date</TableHead>
                <TableHead className="text-foreground">Status</TableHead>
                <TableHead className="text-foreground">Tons</TableHead>
                <TableHead className="text-foreground">Shift</TableHead>
                <TableHead className="text-foreground">Delivery Note</TableHead>
                <TableHead className="text-foreground">Contact</TableHead>
                <TableHead className="text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todayOrders.length > 0 ? (
                todayOrders.map((order) => (
                  <TableRow key={order.id} className="border-border hover:bg-muted/50">
                    <TableCell className="font-mono text-foreground">{order.id}</TableCell>
                    <TableCell className="text-foreground">{order.customerName}</TableCell>
                    <TableCell className="text-foreground">{order.company || 'N/A'}</TableCell>
                    <TableCell className="text-foreground">{order.site || 'N/A'}</TableCell>
                    <TableCell className="text-foreground">{order.date}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-foreground">{order.tons} tons</TableCell>
                    <TableCell>
                      <Badge className={order.shift === 'morning' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                        {order.shift === 'morning' ? 'Morning' : 'Night'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <RoleBasedComponent action="edit" fallback={
                        order.signedDeliveryNote ? (
                          <Badge className="bg-success text-success-foreground">
                            <CheckCircle size={12} className="mr-1" />
                            Signed
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-400 text-white">
                            <XCircle size={12} className="mr-1" />
                            Not Signed
                          </Badge>
                        )
                      }>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              // Toggle signed delivery note status
                              // Create updated order object and use store function
                              const updatedOrder = {
                                ...order,
                                signedDeliveryNote: newStatus
                              };
                              
                              // Use store's updateOrder function
                              const dashboardState = useDashboardStore.getState();
                              if (dashboardState.updateOrder) {
                                await dashboardState.updateOrder(updatedOrder);
                              } else {
                                // Fallback to direct service call
                                const updateData = {
                                  signed_delivery_note: newStatus
                                };
                                await orderService.update(order.id, updateData);
                                
                                // Reload orders
                                if (dashboardState.loadOrders) {
                                  await dashboardState.loadOrders();
                                }
                              }
                              
                              toast({
                                title: "Delivery Note Updated",
                                description: `Delivery note marked as ${!order.signedDeliveryNote ? 'signed' : 'not signed'}.`,
                              });
                            } catch (error) {
                              console.error('Failed to update delivery note:', error);
                              toast({
                                title: "Error",
                                description: "Failed to update delivery note. Please try again.",
                                variant: "destructive"
                              });
                            }
                          }}
                          className="p-0 h-auto hover:bg-transparent"
                          title={`Click to mark as ${order.signedDeliveryNote ? 'not signed' : 'signed'}`}
                        >
                          {order.signedDeliveryNote ? (
                            <Badge className="bg-success text-success-foreground cursor-pointer hover:bg-success/80 transition-colors">
                              <CheckCircle size={12} className="mr-1" />
                              Signed
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-400 text-white cursor-pointer hover:bg-gray-500 transition-colors">
                              <XCircle size={12} className="mr-1" />
                              Not Signed
                            </Badge>
                          )}
                        </Button>
                      </RoleBasedComponent>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm text-foreground">{order.driverName || 'N/A'}</p>
                        {order.phoneNumber ? (
                          <a 
                            href={`tel:${order.phoneNumber.replace(/[\s\-\(\)]/g, '')}`}
                            className="text-sm text-primary hover:text-primary/80 underline cursor-pointer"
                            title="Click to call"
                          >
                            📞 {order.phoneNumber}
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {/* View/Edit Button - Viewers see eye icon, Editors+ see edit icon */}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewOrder(order)}
                          className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                          title={hasPermission(userRole, 'edit') ? "Edit Order Details" : "View Order Details"}
                        >
                          {hasPermission(userRole, 'edit') ? <Edit size={16} /> : <Eye size={16} />}
                        </Button>
                        
                        {/* Mark as Delivered - Only for Editors+ and non-delivered orders */}
                        <RoleBasedComponent action="edit">
                          {order.status !== 'delivered' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={async () => {
                                try {
                                  console.log('🚚 Truck button clicked for order:', order.id);
                                  console.log('📦 Order details:', { id: order.id, date: order.date, status: order.status });
                                  
                                  await handleMarkAsDelivered(order.id);
                                  
                                  toast({
                                    title: "Order Delivered",
                                    description: `Order ${order.id} has been marked as delivered and moved to history.`,
                                  });
                                } catch (error) {
                                  console.error('❌ Mark as delivered failed:', error);
                                  toast({
                                    title: "Error",
                                    description: error instanceof Error ? error.message : "Failed to mark order as delivered. Please try again.",
                                    variant: "destructive"
                                  });
                                }
                              }}
                              className="bg-transparent text-success hover:bg-success/10 hover:text-success"
                              title="Mark as Delivered"
                            >
                              <Truck size={16} />
                            </Button>
                          )}
                        </RoleBasedComponent>
                        
                        {/* Delete Button - Only for Admins */}
                        <RoleBasedComponent action="delete">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive"
                                title="Delete Order"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-background text-foreground" aria-describedby="delete-order-description">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription id="delete-order-description" className="text-muted-foreground">
                                  This action cannot be undone. This will permanently delete order {order.id}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-background text-foreground border-border hover:bg-accent">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteOrder(order.id)}
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
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    No orders for today yet. Create your first order!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <OrderDetailsDialog 
        order={selectedOrder}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
    </Card>
  );
}
