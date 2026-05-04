import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Edit,
  Eye,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  XCircle
} from 'lucide-react';
import { OrderDetailsDialog } from '../components/OrderDetailsDialog';
import { useAuthStore } from '../stores/authStore';
import { hasPermission } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { type HistoryOrder, historyService, type HistoryOrderFilters } from '../lib/supabase';
import { useToast } from '../hooks/use-toast';
import { RoleBasedComponent } from '../components/RoleBasedComponent';
import { formatNumber, roundTo3Decimals } from '../lib/utils';
import { ROUTES } from '@/routes/routes';
import { logger } from '@/lib/logger';
import { useDeviceInfo } from '@/hooks/useDeviceInfo';
import { normalizeOrderType } from '@/lib/orderTypes';

const HISTORY_PAGE_SIZE = 100;
const HISTORY_REFRESH_DEBOUNCE_MS = 300;

type DailyMetric = {
  straightBar: number;
  cutAndBend: number;
  total: number;
};

export function History() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isMobile } = useDeviceInfo();

  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<HistoryOrder | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [historyOrders, setHistoryOrders] = useState<HistoryOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [visiblePageStart, setVisiblePageStart] = useState(0);
  const [visiblePageEnd, setVisiblePageEnd] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [debouncedSearch, statusFilter, companyFilter, dateFrom, dateTo]);

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

    previousController?.abort();
    setLoading(true);
    setError(null);

    try {
      const result = await historyService.getPaginated({
        page,
        pageSize: HISTORY_PAGE_SIZE,
        filters,
        signal: controller.signal
      });

      if (controller.signal.aborted || requestId !== requestIdRef.current || result.aborted) {
        return;
      }

      setHistoryOrders(result.data);
      setTotalCount(result.count);
      setServerTotalPages(result.totalPages || 1);
      setVisiblePageStart(result.pageStart || 0);
      setVisiblePageEnd(result.pageEnd || 0);
    } catch (fetchError) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) {
        return;
      }

      const message = fetchError instanceof Error ? fetchError.message : 'Failed to load history orders.';
      setError(message);
      setHistoryOrders([]);
      setTotalCount(0);
      setServerTotalPages(1);
      setVisiblePageStart(0);
      setVisiblePageEnd(0);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [page, filters]);

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

  const deliveredOrdersByDate = useMemo(() => {
    const grouped: Record<string, HistoryOrder[]> = {};

    historyOrders.forEach((order) => {
      const orderDateTime = order?.date || order?.delivered_at;
      if (!orderDateTime) return;
      const orderDate = String(orderDateTime).split('T')[0];
      grouped[orderDate] = grouped[orderDate] || [];
      grouped[orderDate].push(order);
    });

    Object.keys(grouped).forEach((date) => {
      grouped[date].sort((a, b) => {
        const timeA = new Date(a.date || a.delivered_at || '').getTime();
        const timeB = new Date(b.date || b.delivered_at || '').getTime();
        return timeB - timeA;
      });
    });

    return grouped;
  }, [historyOrders]);

  const dailyMetrics = useMemo(() => {
    const metrics: Record<string, DailyMetric> = {};

    Object.entries(deliveredOrdersByDate).forEach(([date, orders]) => {
      let straightBar = 0;
      let cutAndBend = 0;

      orders.forEach((order) => {
        const tons = order.tons || 0;
        const orderType = normalizeOrderType(order.order_type);

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

  const totalPages = useMemo(() => Math.max(1, serverTotalPages), [serverTotalPages]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return 'Invalid Date';

    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return 'Invalid Date';

      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  }, []);

  const getStatusBadge = useCallback((status: string) => {
    if (status === 'in-progress') {
      return <Badge variant="warning">In progress</Badge>;
    }

    return <Badge variant="success">Delivered</Badge>;
  }, []);

  const getSignedBadge = useCallback((signed?: boolean | null) => {
    if (signed) {
      return (
        <Badge variant="success">
          <CheckCircle size={12} className="mr-1" />
          Signed
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="border-warning/60 text-foreground">
        <XCircle size={12} className="mr-1 text-warning" />
        Not signed
      </Badge>
    );
  }, []);

  const handleViewOrder = useCallback((order: HistoryOrder) => {
    logger.debug('History selected order:', order);
    setSelectedOrder(order);
    setDetailsDialogOpen(true);
  }, []);

  const toggleDateCollapse = useCallback((date: string) => {
    setCollapsedDates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  }, []);

  const refreshHistory = useCallback(() => {
    fetchHistoryOrders();
  }, [fetchHistoryOrders]);

  const resetFilters = useCallback(() => {
    setHistorySearchQuery('');
    setDebouncedSearch('');
    setCompanyFilter('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }, []);

  const updateSignedDeliveryNote = useCallback(async (order: HistoryOrder) => {
    try {
      const newStatus = !order.signed_delivery_note;

      await historyService.update(order.id, {
        signed_delivery_note: newStatus
      } as HistoryOrder);

      await fetchHistoryOrders();

      toast({
        title: 'Delivery Note Updated',
        description: `Delivery note marked as ${newStatus ? 'signed' : 'not signed'}.`,
      });
    } catch (updateError) {
      console.error('Failed to update delivery note:', updateError);
      toast({
        title: 'Error',
        description: 'Failed to update delivery note. Please try again.',
        variant: 'destructive'
      });
    }
  }, [fetchHistoryOrders, toast]);

  const hasActiveFilters = Boolean(
    historySearchQuery.trim() ||
    debouncedSearch ||
    companyFilter.trim() ||
    statusFilter !== 'all' ||
    dateFrom ||
    dateTo
  );

  const activeFilterCount = [
    historySearchQuery.trim() || debouncedSearch,
    companyFilter.trim(),
    statusFilter !== 'all',
    dateFrom || dateTo
  ].filter(Boolean).length;

  const pageStart = totalCount === 0 ? 0 : visiblePageStart;
  const pageEnd = totalCount === 0 ? 0 : visiblePageEnd;
  const resultSummary = totalCount === 0 ? 'No results' : `Showing ${pageStart}-${pageEnd} of ${totalCount}`;
  const canEdit = hasPermission(user?.profile?.role, 'edit');

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-lg border border-border bg-card px-4 py-4 shadow-card sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(ROUTES.dashboard)}
              className="h-8 w-fit px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
            >
              <ArrowLeft size={15} />
              Dashboard
            </Button>
            <div>
              <h1 className="break-words font-headline text-2xl font-semibold text-foreground sm:text-3xl">
                Delivery Archive
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Delivered orders by date, tonnage, driver, and signed delivery note.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground sm:justify-end">
            <span>{totalCount.toLocaleString()} delivered orders</span>
            <span className="hidden text-border sm:inline">|</span>
            <span>{resultSummary}</span>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card px-4 py-4 shadow-card sm:px-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1.55fr)_minmax(180px,0.9fr)_minmax(160px,0.7fr)_minmax(320px,1.25fr)_minmax(210px,auto)] xl:items-end">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Search</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                id="history-search"
                name="historySearch"
                placeholder="Delivery, company, site, driver"
                value={historySearchQuery}
                onChange={(event) => setHistorySearchQuery(event.target.value)}
                className="h-10 bg-background pl-10 text-foreground"
              />
            </div>
          </label>

          <label className={`space-y-1.5 ${filtersExpanded || hasActiveFilters ? '' : 'hidden lg:block'}`}>
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Company</span>
            <Input
              id="history-company"
              name="historyCompany"
              placeholder="Any company"
              value={companyFilter}
              onChange={(event) => setCompanyFilter(event.target.value)}
              className="h-10 bg-background text-foreground"
            />
          </label>

          <label className={`space-y-1.5 ${filtersExpanded || hasActiveFilters ? '' : 'hidden lg:block'}`}>
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Status</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="history-status" className="h-10 bg-background text-foreground">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="in-progress">In progress</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Date range</span>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <Input
                aria-label="History start date"
                id="history-date-from"
                name="historyDateFrom"
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="h-10 bg-background text-foreground"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                aria-label="History end date"
                id="history-date-to"
                name="historyDateTo"
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="h-10 bg-background text-foreground"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 xl:justify-end xl:pl-5">
            <Button
              type="button"
              onClick={() => setFiltersExpanded((value) => !value)}
              variant="outline"
              size="sm"
              className="h-10 border-border text-foreground hover:bg-accent lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {filtersExpanded || hasActiveFilters ? 'Less' : 'Filters'}
            </Button>
            <Button
              onClick={resetFilters}
              variant="ghost"
              size="sm"
              className="h-10 text-muted-foreground hover:text-foreground"
              disabled={!hasActiveFilters || loading}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        {hasActiveFilters ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <span>{activeFilterCount} active {activeFilterCount === 1 ? 'filter' : 'filters'}</span>
            {debouncedSearch ? <Badge variant="outline">Search: {debouncedSearch}</Badge> : null}
            {companyFilter.trim() ? <Badge variant="outline">Company: {companyFilter.trim()}</Badge> : null}
            {statusFilter !== 'all' ? <Badge variant="outline">Status: {statusFilter}</Badge> : null}
            {dateFrom || dateTo ? <Badge variant="outline">Dates: {dateFrom || 'start'} to {dateTo || 'today'}</Badge> : null}
          </div>
        ) : null}
      </section>

      {error ? (
        <section className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <h2 className="font-semibold text-foreground">Archive did not load</h2>
                <p className="mt-1 text-muted-foreground">
                  Keep your filters in place and retry. If this repeats, check the connection or Supabase access.
                </p>
                <p className="mt-2 break-words text-xs text-destructive">{error}</p>
              </div>
            </div>
            <Button onClick={refreshHistory} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </div>
        </section>
      ) : null}

      <div className="space-y-3">
        {loading ? (
          <section className="rounded-lg border border-border bg-card p-4 shadow-card">
            <div className="space-y-3" aria-label="Loading archive orders">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="grid gap-2 rounded-md border border-border bg-background/50 p-3 sm:grid-cols-[120px_1fr_160px_100px]">
                  <div className="h-4 rounded bg-muted animate-pulse" />
                  <div className="h-4 rounded bg-muted animate-pulse" />
                  <div className="h-4 rounded bg-muted animate-pulse" />
                  <div className="h-4 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          </section>
        ) : sortedDates.length > 0 ? (
          sortedDates.map((date) => {
            const isCollapsed = collapsedDates.has(date);
            const metrics = dailyMetrics[date];

            return (
              <section key={date} className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
                <Collapsible open={!isCollapsed} onOpenChange={() => toggleDateCollapse(date)}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full cursor-pointer px-4 py-3 text-left transition-colors hover:bg-muted/35">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <h3 className="truncate text-base font-semibold text-foreground sm:text-lg">
                            {formatDate(date)}
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:flex sm:items-center sm:gap-4">
                          <span className="text-muted-foreground">
                            Total <strong className="font-mono font-semibold text-foreground">{formatNumber(metrics?.total || 0)}t</strong>
                          </span>
                          <span className="text-muted-foreground">
                            Straight <strong className="font-mono font-semibold text-foreground">{formatNumber(metrics?.straightBar || 0)}t</strong>
                          </span>
                          <span className="text-muted-foreground">
                            Cut & Bend <strong className="font-mono font-semibold text-foreground">{formatNumber(metrics?.cutAndBend || 0)}t</strong>
                          </span>
                          <span className="text-muted-foreground">
                            {deliveredOrdersByDate[date].length} orders
                          </span>
                        </div>
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t border-border">
                      {isMobile ? (
                        <div className="divide-y divide-border">
                          {deliveredOrdersByDate[date].map((order) => (
                            <article key={order.id} className="space-y-3 bg-card px-4 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-mono text-sm font-semibold text-foreground">{order.delivery_number || order.id}</p>
                                  <p className="mt-1 line-clamp-2 break-words text-sm font-medium text-foreground">{order.customer_name}</p>
                                </div>
                                {getStatusBadge(order.status)}
                              </div>

                              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <div className="min-w-0">
                                  <dt className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Company</dt>
                                  <dd className="truncate text-foreground">{order.company || 'N/A'}</dd>
                                </div>
                                <div>
                                  <dt className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Tons</dt>
                                  <dd className="font-mono text-foreground">{formatNumber(order.tons)}</dd>
                                </div>
                                <div className="min-w-0">
                                  <dt className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Site</dt>
                                  <dd className="truncate text-foreground">{order.site || 'N/A'}</dd>
                                </div>
                                <div>
                                  <dt className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Shift</dt>
                                  <dd className="text-foreground">{order.shift === 'morning' ? 'Morning' : 'Night'}</dd>
                                </div>
                              </dl>

                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                  {getSignedBadge(order.signed_delivery_note)}
                                  <span>{order.driver_name || 'No driver'}</span>
                                  {order.phone_number ? (
                                    <a
                                      href={`tel:${order.phone_number.replace(/[\s\-\(\)]/g, '')}`}
                                      className="font-mono text-primary underline-offset-4 hover:underline"
                                      title="Click to call"
                                    >
                                      {order.phone_number}
                                    </a>
                                  ) : null}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-9 px-3"
                                  onClick={() => handleViewOrder(order)}
                                >
                                  {canEdit ? <Edit size={14} className="mr-1" /> : <Eye size={14} className="mr-1" />}
                                  {canEdit ? 'Edit' : 'View'}
                                </Button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[1120px] caption-bottom text-sm">
                            <thead className="bg-muted/45">
                              <tr className="border-b border-border">
                                <th className="h-10 px-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Delivery</th>
                                <th className="h-10 px-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Order</th>
                                <th className="h-10 px-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Company</th>
                                <th className="h-10 px-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Site</th>
                                <th className="h-10 px-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Date</th>
                                <th className="h-10 px-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Status</th>
                                <th className="h-10 px-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Tons</th>
                                <th className="h-10 px-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Shift</th>
                                <th className="h-10 px-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Note</th>
                                <th className="h-10 px-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Contact</th>
                                <th className="h-10 px-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {deliveredOrdersByDate[date].map((order) => (
                                <tr key={order.id} className="transition-colors hover:bg-muted/35">
                                  <td className="px-3 py-2.5 align-top font-mono text-foreground">{order.delivery_number || order.id}</td>
                                  <td className="max-w-[260px] px-3 py-2.5 align-top text-foreground">
                                    <span className="line-clamp-2 break-words">{order.customer_name}</span>
                                  </td>
                                  <td className="max-w-[180px] truncate px-3 py-2.5 align-top text-foreground">{order.company || 'N/A'}</td>
                                  <td className="max-w-[200px] truncate px-3 py-2.5 align-top text-foreground">{order.site || 'N/A'}</td>
                                  <td className="px-3 py-2.5 align-top font-mono text-xs text-muted-foreground">{order.date}</td>
                                  <td className="px-3 py-2.5 align-top">{getStatusBadge(order.status)}</td>
                                  <td className="px-3 py-2.5 text-right align-top font-mono text-foreground">{formatNumber(order.tons)}</td>
                                  <td className="px-3 py-2.5 align-top">
                                    <Badge variant="secondary" className="border-border bg-muted/50">
                                      {order.shift === 'morning' ? 'Morning' : 'Night'}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2.5 align-top">
                                    <RoleBasedComponent action="edit" fallback={getSignedBadge(order.signed_delivery_note)}>
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          updateSignedDeliveryNote(order);
                                        }}
                                        className="rounded-md"
                                        title={`Click to mark as ${order.signed_delivery_note ? 'not signed' : 'signed'}`}
                                      >
                                        {getSignedBadge(order.signed_delivery_note)}
                                      </button>
                                    </RoleBasedComponent>
                                  </td>
                                  <td className="px-3 py-2.5 align-top">
                                    <div>
                                      <p className="text-sm text-foreground">{order.driver_name || 'N/A'}</p>
                                      {order.phone_number ? (
                                        <a
                                          href={`tel:${order.phone_number.replace(/[\s\-\(\)]/g, '')}`}
                                          className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                                          title="Click to call"
                                        >
                                          {order.phone_number}
                                        </a>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">-</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5 text-right align-top">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleViewOrder(order)}
                                      className="h-8 bg-transparent px-2 text-foreground hover:bg-accent hover:text-accent-foreground"
                                      title={canEdit ? 'Edit Order Details' : 'View Order Details'}
                                    >
                                      {canEdit ? <Edit size={16} /> : <Eye size={16} />}
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </section>
            );
          })
        ) : (
          <section className="rounded-lg border border-border bg-card p-8 text-center shadow-card">
            <div className="mx-auto max-w-md">
              <Calendar className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">
                {hasActiveFilters ? 'No archive records match these filters' : 'No delivered orders yet'}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {hasActiveFilters
                  ? 'Reset the filters or widen the date range to continue searching the archive.'
                  : 'Delivered orders will appear here after they move into history.'}
              </p>
              {hasActiveFilters ? (
                <Button onClick={resetFilters} variant="outline" size="sm" className="mt-4">
                  <RotateCcw className="h-4 w-4" />
                  Reset filters
                </Button>
              ) : null}
            </div>
          </section>
        )}
      </div>

      <section className="rounded-lg border border-border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-4"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-4"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      </section>

      <OrderDetailsDialog
        order={selectedOrder}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onHistoryUpdated={refreshHistory}
      />
    </div>
  );
}
