import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit, Truck, Trash2, Eye, CheckCircle, XCircle, ArrowUpRight, PackageOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/routes/routes';
import { useDashboardStore } from '@/stores/dashboardStore';
import { OrderDetailsDialog } from './OrderDetailsDialog';
import { RoleBasedComponent } from './RoleBasedComponent';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/lib/auth';
import { orderService } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { useDeviceInfo } from '@/hooks/useDeviceInfo';

export function OrderTable() {
  const { getTodayOrders, deleteOrder, isLoadingOrders, ordersError, loadOrders } = useDashboardStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const { isMobile } = useDeviceInfo();

  const [statusFilter, setStatusFilter] = useState('all');
  const activeOrders = getTodayOrders();
  const todayOrders = activeOrders.filter((order) =>
    statusFilter === 'all' || order.status === statusFilter
  );
  const filters = [
    { value: 'all', label: 'All deliveries' },
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'delayed', label: 'Delayed' },
  ];
  const hasFilters = statusFilter !== 'all';
  const emptyState = <div className="queue-empty">
    <PackageOpen size={30} strokeWidth={1.3} />
    <strong>{hasFilters ? 'No matching deliveries' : 'Your delivery queue is clear'}</strong>
    <p>{hasFilters ? 'Try a different status.' : 'New active orders will appear here, ready to coordinate.'}</p>
    {hasFilters && <Button variant="outline" size="sm" onClick={() => setStatusFilter('all')}>Clear filters</Button>}
  </div>;
  const userRole = user?.profile?.role;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="queue-status queue-status-success">Completed</Badge>;
      case 'in-progress':
        return <Badge className="queue-status queue-status-progress">In progress</Badge>;
      case 'delayed':
        return <Badge className="queue-status queue-status-delayed">Delayed</Badge>;
      case 'pending':
        return <Badge className="queue-status">Pending</Badge>;
      case 'delivered':
        return <Badge className="queue-status queue-status-success">Delivered</Badge>;
      default:
        return <Badge className="queue-status">{status}</Badge>;
    }
  };

  const handleMarkAsDelivered = async (orderId: string) => {
    logger.debug('🚚 Truck button clicked for order:', orderId);
    
    const order = todayOrders.find(o => o.id === orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    logger.debug('📦 Order details:', { id: order.id, date: order.date, status: order.status });
    
    try {
      // Use the store's markAsDelivered method which handles everything properly
      const { markAsDelivered } = useDashboardStore.getState();
      await markAsDelivered(orderId);
      
      logger.debug('✅ Order moved to history successfully');
      
    } catch (error) {
      console.error('❌ Failed to move order to history:', error);
      throw error;
    }
  };

  const handleViewOrder = (order: any) => {
    logger.debug('OrderTable selected order:', order);
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

  const toggleSignedDeliveryNote = async (order: any) => {
    const newStatus = !order.signedDeliveryNote;
    const updatedOrder = {
      ...order,
      signedDeliveryNote: newStatus
    };

    const dashboardState = useDashboardStore.getState();
    if (dashboardState.updateOrder) {
      await dashboardState.updateOrder(updatedOrder);
    } else {
      const updateData = {
        signed_delivery_note: newStatus
      };
      await orderService.update(order.id, updateData);
      if (dashboardState.loadOrders) {
        await dashboardState.loadOrders();
      }
    }

    toast({
      title: "Delivery Note Updated",
      description: `Delivery note marked as ${!order.signedDeliveryNote ? 'signed' : 'not signed'}.`,
    });
  };

  return (
    <Card className="delivery-queue overflow-hidden" id="delivery-queue">
      <div className="p-6">
        <div className="queue-heading">
          <div><p className="eyebrow">Dispatch board</p><h2>Active deliveries</h2></div>
          <Link className="queue-history" to={ROUTES.history}>Order history <ArrowUpRight size={15} /></Link>
        </div>
        <div className="queue-toolbar">
          <div className="queue-filters" role="group" aria-label="Filter deliveries by status">
            {filters.map((filter) => <button type="button" key={filter.value} aria-pressed={statusFilter === filter.value} onClick={() => setStatusFilter(filter.value)}>
              {filter.label}<span>{isLoadingOrders || ordersError ? '—' : activeOrders.filter((order) => filter.value === 'all' || order.status === filter.value).length}</span>
            </button>)}
          </div>
        </div>

        {ordersError ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-red-400">{ordersError}</p>
            <Button variant="secondary" className="w-fit" onClick={() => loadOrders()}>
              Retry
            </Button>
          </div>
        ) : (
          isMobile ? (
            <div className="space-y-3">
              {isLoadingOrders ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className="glass-panel rounded-2xl p-4 space-y-3">
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  </div>
                ))
              ) : todayOrders.length > 0 ? (
                todayOrders.map((order) => (
                  <div key={order.id} className="mobile-delivery-card glass-panel rounded-2xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 break-all font-mono text-sm text-foreground">{order.id}</p>
                      <span className="shrink-0">{getStatusBadge(order.status)}</span>
                    </div>
                    <details className="mobile-order-title"><summary><span>{order.customerName}</span><small>Order description</small></summary><p>{order.customerName}</p></details>
                    <dl className="mobile-order-facts">
                      <div><dt>Company</dt><dd>{order.company || 'Not specified'}</dd></div>
                      <div><dt>Site</dt><dd>{order.site || 'Not specified'}</dd></div>
                      <div><dt>Scheduled</dt><dd>{order.date} / {order.shift === 'morning' ? 'Morning' : 'Night'}</dd></div>
                      <div><dt>Weight</dt><dd className="mobile-order-weight">{order.tons} <small>tons</small></dd></div>
                    </dl>
                    <div className="min-w-0 text-sm text-muted-foreground">
                      <p className="min-w-0 break-words">Driver: {order.driverName || 'N/A'}</p>
                      {order.phoneNumber ? (
                        <a
                          href={`tel:${order.phoneNumber.replace(/[\s\-\(\)]/g, '')}`}
                          className="inline-block max-w-full break-all text-primary underline hover:text-primary/80"
                          title="Click to call"
                        >
                          {order.phoneNumber}
                        </a>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 [&_button]:w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-11 px-3"
                        onClick={() => handleViewOrder(order)}
                      >
                        {hasPermission(userRole, 'edit') ? <Edit size={14} className="mr-1" /> : <Eye size={14} className="mr-1" />}
                        {hasPermission(userRole, 'edit') ? 'Edit' : 'View'}
                      </Button>
                      <RoleBasedComponent action="edit">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-11 px-3"
                          onClick={async () => {
                            try {
                              await toggleSignedDeliveryNote(order);
                            } catch (error) {
                              console.error('Failed to update delivery note:', error);
                              toast({
                                title: "Error",
                                description: "Failed to update delivery note. Please try again.",
                                variant: "destructive"
                              });
                            }
                          }}
                        >
                          {order.signedDeliveryNote ? 'Signed' : 'Not Signed'}
                        </Button>
                      </RoleBasedComponent>
                      <RoleBasedComponent action="edit">
                        {order.status !== 'delivered' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-11 px-3"
                            onClick={async () => {
                              try {
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
                          >
                            <Truck size={14} className="mr-1" />
                            Deliver
                          </Button>
                        )}
                      </RoleBasedComponent>
                      <RoleBasedComponent action="delete">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-11 px-3 text-destructive hover:text-destructive">
                              <Trash2 size={14} className="mr-1" />
                              Delete
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
                  </div>
                ))
              ) : (
                emptyState
              )}
            </div>
          ) : (
          <div className="overflow-x-auto rounded-2xl">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">Delivery</TableHead>
                  <TableHead className="text-foreground">Destination</TableHead>
                  <TableHead className="text-foreground">Schedule</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground">Weight</TableHead>
                  <TableHead className="text-foreground">Delivery Note</TableHead>
                  <TableHead className="text-foreground">Contact</TableHead>
                  <TableHead className="text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingOrders ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`} className="border-border">
                      {Array.from({ length: 8 }).map((_, cellIndex) => (
                        <TableCell key={cellIndex}>
                          <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : todayOrders.length > 0 ? (
                  todayOrders.map((order) => (
                    <TableRow key={order.id} className="border-border hover:bg-muted/50">
                    <TableCell><strong className="queue-primary-text queue-order-name" title={order.customerName}>{order.customerName}</strong><span className="queue-secondary-text font-mono">{order.id}</span></TableCell>
                    <TableCell><span className="queue-primary-text">{order.company || 'N/A'}</span><span className="queue-secondary-text">{order.site || 'No site specified'}</span></TableCell>
                    <TableCell><span className="queue-primary-text">{order.date}</span><span className="queue-secondary-text">{order.shift === 'morning' ? 'Morning shift' : 'Night shift'}</span></TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="queue-weight">{order.tons}<span> t</span></TableCell>
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
                              await toggleSignedDeliveryNote(order);
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
                            {order.phoneNumber}
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
                                  logger.debug('🚚 Truck button clicked for order:', order.id);
                                  logger.debug('📦 Order details:', { id: order.id, date: order.date, status: order.status });
                                  
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
                  <TableCell colSpan={8}>
                    {emptyState}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        ))}
        {!ordersError && !isLoadingOrders && activeOrders.length > 0 && <div className="queue-footer" role="status"><span>Showing {todayOrders.length} of {activeOrders.length} active deliveries</span><span>Weight in metric tons</span></div>}
      </div>
      
      <OrderDetailsDialog 
        order={selectedOrder}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
    </Card>
  );
}
