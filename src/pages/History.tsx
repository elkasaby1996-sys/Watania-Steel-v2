import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Edit,
  ArrowLeft,
  Search,
  Calendar,
  Eye,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { OrderDetailsDialog } from '../components/OrderDetailsDialog';
import { useAuthStore } from '../stores/authStore';
import { hasPermission } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { type HistoryOrder, historyService, type HistoryOrderFilters } from '../lib/supabase';
import { useToast } from '../hooks/use-toast';
import { RoleBasedComponent } from '../components/RoleBasedComponent';
import { roundTo3Decimals, formatNumber } from '../lib/utils';
import { ROUTES } from '@/routes/routes';
import { logger } from '@/lib/logger';
import { useDeviceInfo } from '@/hooks/useDeviceInfo';

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const HISTORY_REFRESH_DEBOUNCE_MS = 300;

export function History() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [historyOrders, setHistoryOrders] = useState<HistoryOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isMobile } = useDeviceInfo();

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const debounceTimer = window.setTimeout(() => {
      setDebouncedSearch(historySearchQuery.trim());
    }, HISTORY_REFRESH_DEBOUNCE_MS);

    return () => window.clearTimeout(debounceTimer);
  }, [historySearchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, companyFilter, dateFrom, dateTo, pageSize]);

  const filters: HistoryOrderFilters = useMemo(() => {
    return {
      status: statusFilter === 'all' ? undefined : statusFilter,
      company: companyFilter.trim() || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      search: debouncedSearch || undefined
    };
  }, [statusFilter, companyFilter, dateFrom, dateTo, debouncedSearch]);

  const fetchHistoryOrders = useCallback(async () => {
    const previousController = abortRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    if (previousController) {
      previousController.abort();
    }

    setLoading(true);
    setError(null);

    try {
      const result = await historyService.getPaginated({
        page,
        pageSize,
        filters,
        signal: controller.signal
      });

      if (controller.signal.aborted || requestId !== requestIdRef.current || result.aborted) {
        return;
      }

      setHistoryOrders(result.data);
      setTotalCount(result.count);
    } catch (fetchError) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) {
        return;
      }

      const message = fetchError instanceof Error ? fetchError.message : 'Failed to load history orders.';
      setError(message);
      setHistoryOrders([]);
      setTotalCount(0);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    fetchHistoryOrders();
  }, [fetchHistoryOrders]);

  useEffect(() => {
    const handleFocus = () => {
      fetchHistoryOrders();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
    };
  }, [fetchHistoryOrders]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const refreshHistory = useCallback(() => {
    fetchHistoryOrders();
  }, [fetchHistoryOrders]);

  const deliveredOrdersByDate = useMemo(() => {
    const grouped: { [date: string]: HistoryOrder[] } = {};

    historyOrders.forEach(order => {
      const orderDateTime = order?.delivered_at || order?.date;
      if (!orderDateTime) return;
      const orderDate = String(orderDateTime).split('T')[0];
      if (!grouped[orderDate]) {
        grouped[orderDate] = [];
      }
      grouped[orderDate].push(order);
    });

    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => {
        const timeA = new Date(a.delivered_at || a.date).getTime();
        const timeB = new Date(b.delivered_at || b.date).getTime();
        return timeB - timeA;
      });
    });

    return grouped;
  }, [historyOrders]);

  const dailyMetrics = useMemo(() => {
    const metrics: { [date: string]: { straightBar: number; cutAndBend: number; total: number } } = {};

    Object.entries(deliveredOrdersByDate).forEach(([date, orders]) => {
      let straightBar = 0;
      let cutAndBend = 0;

      orders.forEach(order => {
        const tons = order.tons || 0;
        const orderType = order.order_type || 'straight-bar';

        if (orderType === 'cut-and-bend') {
          cutAndBend += tons;
        } else {
          straightBar += tons;
        }
      });

      metrics[date] = {
        straightBar: roundTo3Decimals(straightBar),
        cutAndBend: roundTo3Decimals(cutAndBend),
        total: roundTo3Decimals(straightBar + cutAndBend)
      };
    });

    return metrics;
  }, [deliveredOrdersByDate]);

  const sortedDates = useMemo(() => {
    return Object.keys(deliveredOrdersByDate).sort((a, b) =>
      new Date(b).getTime() - new Date(a).getTime()
    );
  }, [deliveredOrdersByDate]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [totalCount, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const formatDate = useCallback((dateString: string) => {
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
  }, []);

  const getStatusBadge = useCallback((status: string) => {
    if (status === 'in-progress') {
      return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
    }

    return <Badge className="bg-success text-success-foreground">Delivered</Badge>;
  }, []);

  const handleViewOrder = useCallback((order: any) => {
    logger.debug('🔍 History - Selected order:', order);
    setSelectedOrder(order);
    setDetailsDialogOpen(true);
  }, []);

  const toggleDateCollapse = useCallback((date: string) => {
    setCollapsedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  }, []);

  const pageStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, totalCount);

  return (
    <div className={isMobile ? 'space-y-4' : 'space-y-6'}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTES.dashboard)}
            className="text-foreground hover:bg-accent"
          >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Button>
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-headline font-bold text-foreground`}>
            Delivery Archive
          </h1>
          <p className="text-muted-foreground">
            Complete historical record of all delivered orders with daily metrics
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <Card>
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className={`relative flex-1 ${isMobile ? 'w-full min-w-0 max-w-none' : 'min-w-[240px] max-w-md'}`}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                id="history-search"
                name="historySearch"
                placeholder="Search all fields..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="pl-10 bg-background text-foreground border-border"
              />
            </div>
            <div className={isMobile ? 'w-full' : 'min-w-[200px]'}>
              <Input
                id="history-company"
                name="historyCompany"
                placeholder="Filter by company"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="bg-background text-foreground border-border"
              />
            </div>
            <div className={isMobile ? 'w-full' : 'min-w-[160px]'}>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="history-status" className="bg-background text-foreground border-border">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={`flex items-center gap-2 ${isMobile ? 'w-full flex-col items-stretch' : ''}`}>
              <Input
                id="history-date-from"
                name="historyDateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-background text-foreground border-border"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                id="history-date-to"
                name="historyDateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-background text-foreground border-border"
              />
            </div>
            <div className={isMobile ? 'w-full' : 'min-w-[140px]'}>
              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger id="history-page-size" className="bg-background text-foreground border-border">
                  <SelectValue placeholder="Page size" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  {PAGE_SIZE_OPTIONS.map(option => (
                    <SelectItem key={option} value={String(option)}>
                      {option} per page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={refreshHistory}
              variant="outline"
              size="sm"
              className="text-foreground border-border hover:bg-accent"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              {totalCount} delivered orders found
            </span>
            <span>
              {totalCount === 0 ? 'No results' : `Showing ${pageStart}-${pageEnd} of ${totalCount}`}
            </span>
          </div>
        </div>
      </Card>

      {error ? (
        <Card>
          <div className="p-4 text-sm text-destructive">
            {error}
          </div>
        </Card>
      ) : null}

      {/* Orders by Date - Collapsible */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <div className="p-6 space-y-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-6 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </Card>
        ) : sortedDates.length > 0 ? (
          sortedDates.map((date) => {
            const isCollapsed = collapsedDates.has(date);
            return (
              <Card key={date}>
                <Collapsible open={!isCollapsed} onOpenChange={() => toggleDateCollapse(date)}>
                  <CollapsibleTrigger asChild>
                    <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className={`flex items-center justify-between ${isMobile ? 'flex-col items-start gap-3' : ''}`}>
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
                        <div className={`flex items-center gap-4 ${isMobile ? 'w-full flex-col items-start gap-2' : ''}`}>
                          {/* Daily Metrics - Next to the date */}
                          <div className={`flex items-center gap-4 ${isMobile ? 'flex-wrap gap-2' : ''}`}>
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
                      {isMobile ? (
                        <div className="space-y-3">
                          {deliveredOrdersByDate[date].map((order) => (
                            <div key={order.id} className="rounded-xl border border-border/80 p-4 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-mono text-foreground">{order.delivery_number || order.id}</p>
                                {getStatusBadge(order.status)}
                              </div>
                              <p className="font-medium text-foreground">{order.customer_name}</p>
                              <p className="text-sm text-muted-foreground">Company: {order.company || 'N/A'}</p>
                              <p className="text-sm text-muted-foreground">Site: {order.site || 'N/A'}</p>
                              <p className="text-sm text-muted-foreground">Date: {order.date}</p>
                              <p className="text-sm text-muted-foreground">Tons: {formatNumber(order.tons)} tons</p>
                              <p className="text-sm text-muted-foreground">
                                Shift: {order.shift === 'morning' ? 'Morning' : 'Night'}
                              </p>
                              <div>
                                {order.signed_delivery_note ? (
                                  <Badge className="bg-success text-success-foreground">
                                    <CheckCircle size={12} className="mr-1" />
                                    Signed
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-400 text-white">
                                    <XCircle size={12} className="mr-1" />
                                    Not Signed
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm">
                                <p className="text-muted-foreground">{order.driver_name || 'N/A'}</p>
                                {order.phone_number ? (
                                  <a
                                    href={`tel:${order.phone_number.replace(/[\s\-\(\)]/g, '')}`}
                                    className="text-primary hover:text-primary/80 underline"
                                    title="Click to call"
                                  >
                                    {order.phone_number}
                                  </a>
                                ) : null}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-10 px-3"
                                onClick={() => handleViewOrder(order)}
                              >
                                {hasPermission(user?.profile?.role, 'edit') ? <Edit size={14} className="mr-1" /> : <Eye size={14} className="mr-1" />}
                                {hasPermission(user?.profile?.role, 'edit') ? 'Edit' : 'View'}
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
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
                            {deliveredOrdersByDate[date].map((order) => (
                              <TableRow key={order.id} className="border-border hover:bg-muted/50">
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
                                          logger.debug('🔄 Toggling delivery note for history order:', order.id);
                                          logger.debug('📋 Current status:', order.signed_delivery_note);

                                          // Toggle signed delivery note status for history order
                                          const newStatus = !order.signed_delivery_note;

                                          const updatedHistoryOrder: Partial<HistoryOrder> = {
                                            signed_delivery_note: newStatus
                                          };

                                          await historyService.update(order.id, updatedHistoryOrder as HistoryOrder);

                                          await fetchHistoryOrders();

                                          toast({
                                            title: "Delivery Note Updated",
                                            description: `Delivery note marked as ${newStatus ? 'signed' : 'not signed'}.`,
                                          });
                                        } catch (updateError) {
                                          console.error('❌ Failed to update delivery note:', updateError);
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
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      )}
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
                {debouncedSearch ? 'Try adjusting your search terms.' : 'Delivered orders will appear here.'}
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Pagination Controls */}
      <Card>
        <div className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-4"
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-4"
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <OrderDetailsDialog
        order={selectedOrder}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onHistoryUpdated={refreshHistory}
      />
    </div>
  );
}
