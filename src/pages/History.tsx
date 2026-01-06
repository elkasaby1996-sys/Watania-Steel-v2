import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Edit, ArrowLeft, Search, Calendar, Eye, CheckCircle, XCircle, Package, Wrench, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { useDashboardStore } from '../stores/dashboardStore';
import { OrderDetailsDialog } from '../components/OrderDetailsDialog';
import { DailyMetricsCard } from '../components/DailyMetricsCard';
import { useAuthStore } from '../stores/authStore';
import { hasPermission } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { type HistoryOrder, historyService } from '../lib/supabase';
import { useToast } from '../hooks/use-toast';
import { RoleBasedComponent } from '../components/RoleBasedComponent';
import { roundTo3Decimals, formatNumber } from '../lib/utils';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const HISTORY_ROW_HEIGHT = 56;
const HISTORY_OVERSCAN = 6;

interface VirtualizedHistoryBodyProps {
  orders: HistoryOrder[];
  renderRow: (order: HistoryOrder) => React.ReactElement;
  columnCount: number;
  maxHeight?: number;
}

const VirtualizedHistoryBody = ({
  orders,
  renderRow,
  columnCount,
  maxHeight = 520,
}: VirtualizedHistoryBodyProps) => {
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = orders.length * HISTORY_ROW_HEIGHT;
  const viewportHeight = Math.min(maxHeight, totalHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / HISTORY_ROW_HEIGHT) - HISTORY_OVERSCAN);
  const endIndex = Math.min(
    orders.length,
    Math.ceil((scrollTop + viewportHeight) / HISTORY_ROW_HEIGHT) + HISTORY_OVERSCAN
  );

  const paddingTop = startIndex * HISTORY_ROW_HEIGHT;
  const paddingBottom = Math.max(0, (orders.length - endIndex) * HISTORY_ROW_HEIGHT);

  return (
    <TableBody
      className="block max-h-[520px] overflow-auto"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      {paddingTop > 0 && (
        <TableRow className="table w-full border-0" style={{ height: paddingTop }}>
          <TableCell colSpan={columnCount} className="p-0 border-0" />
        </TableRow>
      )}
      {orders.slice(startIndex, endIndex).map(renderRow)}
      {paddingBottom > 0 && (
        <TableRow className="table w-full border-0" style={{ height: paddingBottom }}>
          <TableCell colSpan={columnCount} className="p-0 border-0" />
        </TableRow>
      )}
    </TableBody>
  );
};

export function History() {
  const dashboardStore = useDashboardStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(historySearchQuery, 300);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  const refreshHistory = () => {
    if (dashboardStore?.loadHistoryOrders) {
      dashboardStore.loadHistoryOrders();
    }
  };

  // Safe access to store functions with error handling
  const getDeliveredOrdersByDate = dashboardStore?.getDeliveredOrdersByDate;
  const getDailyMetrics = dashboardStore?.getDailyMetrics;

  let deliveredOrdersByDate: { [date: string]: HistoryOrder[] } = {};
  let dailyMetrics: { [date: string]: { straightBar: number; cutAndBend: number; total: number } } = {};

  const derivedData = useMemo(() => {
    try {
      const grouped = getDeliveredOrdersByDate ? getDeliveredOrdersByDate(debouncedSearch) : {};
      const metrics = getDailyMetrics ? getDailyMetrics(debouncedSearch) : calculateDailyMetrics(grouped);
      return { grouped, metrics };
    } catch (error) {
      console.error('Error getting delivered orders or metrics:', error);
      return { grouped: {}, metrics: {} };
    }
  }, [getDeliveredOrdersByDate, getDailyMetrics, debouncedSearch]);

  deliveredOrdersByDate = derivedData.grouped;
  dailyMetrics = derivedData.metrics;

  function calculateDailyMetrics(groupedOrders: { [date: string]: HistoryOrder[] }) {
    const metrics: { [date: string]: { straightBar: number; cutAndBend: number; total: number } } = {};
    
    try {
      Object.entries(groupedOrders).forEach(([date, orders]) => {
        let straightBar = 0;
        let cutAndBend = 0;
        
        if (Array.isArray(orders)) {
          orders.forEach(order => {
            const tons = order?.tons || 0;
            const orderType = order?.order_type || 'straight-bar';
            
            if (orderType === 'cut-and-bend') {
              cutAndBend += tons;
            } else {
              straightBar += tons;
            }
          });
        }
        
        metrics[date] = {
          straightBar: roundTo3Decimals(straightBar),
          cutAndBend: roundTo3Decimals(cutAndBend),
          total: roundTo3Decimals(straightBar + cutAndBend)
        };
      });
    } catch (error) {
      console.error('Error calculating daily metrics:', error);
    }
    
    return metrics;
  }

  const sortedDates = Object.keys(deliveredOrdersByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return 'Invalid Date';
    }
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatDeliveredTime = (deliveredAt?: string) => {
    if (!deliveredAt) return '';
    
    const deliveryDate = new Date(deliveredAt);
    return deliveryDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    return <Badge className="bg-success text-success-foreground">Delivered</Badge>;
  };

  const getDeliveryNoteBadge = (signedDeliveryNote: boolean) => {
    return signedDeliveryNote ? (
      <Badge className="bg-success text-success-foreground">
        <CheckCircle size={12} className="mr-1" />
        Signed
      </Badge>
    ) : (
      <Badge className="bg-gray-400 text-white">
        <XCircle size={12} className="mr-1" />
        Not Signed
      </Badge>
    );
  };

  const handleViewOrder = (order: any) => {
    console.log('🔍 History - Selected order:', order);
    setSelectedOrder(order);
    setDetailsDialogOpen(true);
  };

  const renderHistoryRow = (order: HistoryOrder) => (
    <TableRow key={order.id} className="border-border hover:bg-muted/50 table w-full table-fixed">
      <TableCell className="font-mono text-foreground">
        {order.delivery_number || order.id}
      </TableCell>
      <TableCell className="text-foreground">
        {order.customer_name}
      </TableCell>
      <TableCell className="text-foreground">{order.company || 'N/A'}</TableCell>
      <TableCell className="text-foreground">{order.site || 'N/A'}</TableCell>
      <TableCell className="text-foreground">{order.date}</TableCell>
      <TableCell>{getStatusBadge(order.status)}</TableCell>
      <TableCell className="text-foreground">{formatNumber(order.tons)} tons</TableCell>
      <TableCell>
        <Badge className={order.shift === 'morning' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
          {order.shift === 'morning' ? 'Morning' : 'Night'}
        </Badge>
      </TableCell>
      <TableCell>
        <RoleBasedComponent action="edit" fallback={
          order.signed_delivery_note ? (
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
          <div
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              
              try {
                console.log('🔄 Toggling delivery note for history order:', order.id);
                console.log('📋 Current status:', order.signed_delivery_note);
                
                // Toggle signed delivery note status for history order
                const newStatus = !order.signed_delivery_note;
                
                const updatedHistoryOrder: Partial<HistoryOrder> = {
                  signed_delivery_note: newStatus
                };
                
                await historyService.update(order.id, updatedHistoryOrder as HistoryOrder);
                
                // Reload history orders
                const dashboardState = useDashboardStore.getState();
                if (dashboardState.loadHistoryOrders) {
                  await dashboardState.loadHistoryOrders();
                }
                
                toast({
                  title: "Delivery Note Updated",
                  description: `Delivery note marked as ${newStatus ? 'signed' : 'not signed'}.`,
                });
              } catch (error) {
                console.error('❌ Failed to update delivery note:', error);
                toast({
                  title: "Error",
                  description: "Failed to update delivery note. Please try again.",
                  variant: "destructive"
                });
              }
            }}
            className="cursor-pointer"
            title={`Click to mark as ${order.signed_delivery_note ? 'not signed' : 'signed'}`}
          >
            {order.signed_delivery_note ? (
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
          </div>
        </RoleBasedComponent>
      </TableCell>
      <TableCell>
        <div>
          <p className="text-sm text-foreground">
            {order.driver_name || 'N/A'}
          </p>
          {order.phone_number ? (
            <a 
              href={`tel:${order.phone_number.replace(/[\s\-\(\)]/g, '')}`}
              className="text-sm text-primary hover:text-primary/80 underline cursor-pointer"
              title="Click to call"
            >
              📞 {order.phone_number}
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => handleViewOrder(order)}
          className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
          title={hasPermission(user?.profile?.role, 'edit') ? "Edit Order Details" : "View Order Details"}
        >
          {hasPermission(user?.profile?.role, 'edit') ? <Edit size={16} /> : <Eye size={16} />}
        </Button>
      </TableCell>
    </TableRow>
  );

  const toggleDateCollapse = (date: string) => {
    setCollapsedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const getTotalOrdersCount = () => {
    return Object.values(deliveredOrdersByDate).reduce((total, orders) => total + orders.length, 0);
  };

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
            Delivery Archive
          </h1>
          <p className="text-muted-foreground">
            Complete historical record of all delivered orders with daily metrics
          </p>
        </div>
      </div>


      {/* Search Bar */}
      <Card>
        <div className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                id="history-search"
                name="historySearch"
                placeholder="Search orders by delivery number, delivery name, company..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="pl-10 bg-background text-foreground border-border"
              />
            </div>
            <Button
              onClick={refreshHistory}
              variant="outline"
              size="sm"
              className="text-foreground border-border hover:bg-accent"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <p className="text-sm text-muted-foreground">
              {getTotalOrdersCount()} delivered orders found
            </p>
          </div>
        </div>
      </Card>

      {/* Orders by Date - Collapsible */}
      <div className="space-y-4">
        {sortedDates.length > 0 ? (
          sortedDates.map((date) => {
            const isCollapsed = collapsedDates.has(date);
            return (
              <Card key={date}>
                <Collapsible open={!isCollapsed} onOpenChange={() => toggleDateCollapse(date)}>
                  <CollapsibleTrigger asChild>
                    <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isCollapsed ? (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                          <h3 className="text-lg font-semibold text-foreground">
                            {formatDate(date)}
                          </h3>
                        </div>
                        <div className="flex items-center gap-4">
                          {/* Daily Metrics - Next to the date */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="text-sm text-foreground">
                                Straight Bar: <strong>{formatNumber(dailyMetrics[date]?.straightBar || 0)} tons</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                              <span className="text-sm text-foreground">
                                Cut & Bend: <strong>{formatNumber(dailyMetrics[date]?.cutAndBend || 0)} tons</strong>
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {deliveredOrdersByDate[date].length} orders
                          </p>
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-6 pb-6">
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
                          {deliveredOrdersByDate[date].length > 50 ? (
                            <VirtualizedHistoryBody
                              orders={deliveredOrdersByDate[date]}
                              renderRow={renderHistoryRow}
                              columnCount={11}
                            />
                          ) : (
                            <TableBody>
                              {deliveredOrdersByDate[date].map(renderHistoryRow)}
                            </TableBody>
                          )}
                        </Table>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })
        ) : (
          <Card>
            <div className="p-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No delivered orders found</h3>
              <p className="text-muted-foreground">
                {historySearchQuery ? 'Try adjusting your search terms.' : 'Delivered orders will appear here.'}
              </p>
            </div>
          </Card>
        )}
      </div>

      <OrderDetailsDialog 
        order={selectedOrder}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
    </div>
  );
}
