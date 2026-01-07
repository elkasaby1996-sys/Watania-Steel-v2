import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useSafeQuery } from '@/hooks/use-safe-query';
import { useDashboardStore } from '@/stores/dashboardStore';

type SearchItem = {
  id: string;
  type: 'order' | 'history' | 'client';
  primary: string;
  secondary: string;
  company?: string;
};

type SearchResults = {
  orders: SearchItem[];
  history: SearchItem[];
  clients: SearchItem[];
};

const EMPTY_RESULTS: SearchResults = {
  orders: [],
  history: [],
  clients: []
};

const SEARCH_LIMIT = 6;
const CLIENTS_LIMIT = 5;

const isMissingTableError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String(error.message) : '';
  const status = 'status' in error ? Number(error.status) : 0;
  return (
    status === 404 ||
    message.includes('does not exist') ||
    message.includes('PGRST116')
  );
};
const isAbortError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const name = 'name' in error ? String(error.name) : '';
  const message = 'message' in error ? String(error.message) : '';
  return name === 'AbortError' || message.includes('AbortError');
};

const buildPrimary = (item: { delivery_number?: string | null; id: string }) =>
  item.delivery_number || item.id;

const buildSecondary = (item: { company?: string | null; site?: string | null }) =>
  [item.company, item.site].filter(Boolean).join(' • ') || '—';

export function GlobalSearch() {
  const navigate = useNavigate();
  const { setSearchQuery } = useDashboardStore();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const hasQuery = debouncedQuery.length >= 2;

  const { data, isLoading, error } = useSafeQuery(
    'global-search',
    async ({ signal }) => {
      if (!hasQuery) {
        return EMPTY_RESULTS;
      }

      try {
        const term = debouncedQuery.replace(/,/g, ' ');
        const match = `id.ilike.%${term}%,delivery_number.ilike.%${term}%,customer_name.ilike.%${term}%,company.ilike.%${term}%,site.ilike.%${term}%,driver_name.ilike.%${term}%,phone_number.ilike.%${term}%`;

        let ordersQuery = supabase
          .from('orders')
          .select('id,delivery_number,company,site,tons,date')
          .or(match)
          .limit(SEARCH_LIMIT);

        if (signal) {
          ordersQuery = ordersQuery.abortSignal(signal);
        }

        const { data: ordersData, error: ordersError } = await ordersQuery;
        if (ordersError) {
          throw ordersError;
        }

        let historyItems: SearchItem[] = [];
        try {
          let historyQuery = supabase
            .from('history_orders')
            .select('id,delivery_number,company,site,tons,date')
            .or(match)
            .limit(SEARCH_LIMIT);

          if (signal) {
            historyQuery = historyQuery.abortSignal(signal);
          }

          const { data: historyData, error: historyError } = await historyQuery;
          if (historyError) {
            throw historyError;
          }

          historyItems = (historyData || []).map((item) => ({
            id: item.id,
            type: 'history',
            primary: buildPrimary(item),
            secondary: buildSecondary(item)
          }));
        } catch (historyError) {
          if (!isMissingTableError(historyError)) {
            throw historyError;
          }

          let deliveredQuery = supabase
            .from('orders')
            .select('id,delivery_number,company,site,tons,date')
            .in('status', ['delivered', 'completed'])
            .or(match)
            .limit(SEARCH_LIMIT);

          if (signal) {
            deliveredQuery = deliveredQuery.abortSignal(signal);
          }

          const { data: deliveredData, error: deliveredError } = await deliveredQuery;
          if (deliveredError) {
            throw deliveredError;
          }

          historyItems = (deliveredData || []).map((item) => ({
            id: item.id,
            type: 'history',
            primary: buildPrimary(item),
            secondary: buildSecondary(item)
          }));
        }

        const orderItems: SearchItem[] = (ordersData || []).map((item) => ({
          id: item.id,
          type: 'order',
          primary: buildPrimary(item),
          secondary: buildSecondary(item)
        }));

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoff = thirtyDaysAgo.toISOString().split('T')[0];
        const clientTotals = new Map<string, number>();

        let ordersClientQuery = supabase
          .from('orders')
          .select('company,tons,date')
          .gte('date', cutoff)
          .ilike('company', `%${term}%`)
          .limit(200);

        if (signal) {
          ordersClientQuery = ordersClientQuery.abortSignal(signal);
        }

        const { data: ordersClientData, error: ordersClientError } = await ordersClientQuery;
        if (ordersClientError) {
          throw ordersClientError;
        }

        let historyClientRows: Array<{ company?: string | null; tons?: number | null }> = [];
        try {
          let historyClientQuery = supabase
            .from('history_orders')
            .select('company,tons,date')
            .gte('date', cutoff)
            .ilike('company', `%${term}%`)
            .limit(200);

          if (signal) {
            historyClientQuery = historyClientQuery.abortSignal(signal);
          }

          const { data: historyClientData, error: historyClientError } = await historyClientQuery;
          if (historyClientError) {
            throw historyClientError;
          }
          historyClientRows = historyClientData || [];
        } catch (historyClientError) {
          if (!isMissingTableError(historyClientError)) {
            throw historyClientError;
          }

          let deliveredClientQuery = supabase
            .from('orders')
            .select('company,tons,date')
            .gte('date', cutoff)
            .in('status', ['delivered', 'completed'])
            .ilike('company', `%${term}%`)
            .limit(200);

          if (signal) {
            deliveredClientQuery = deliveredClientQuery.abortSignal(signal);
          }

          const { data: deliveredClientData, error: deliveredClientError } = await deliveredClientQuery;
          if (deliveredClientError) {
            throw deliveredClientError;
          }
          historyClientRows = deliveredClientData || [];
        }

        [...(ordersClientData || []), ...historyClientRows].forEach((row) => {
          if (!row.company) return;
          const current = clientTotals.get(row.company) || 0;
          clientTotals.set(row.company, current + (Number(row.tons) || 0));
        });

        const clientItems: SearchItem[] = Array.from(clientTotals.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, CLIENTS_LIMIT)
          .map(([company]) => ({
            id: company,
            type: 'client',
            primary: company,
            secondary: 'Client',
            company
          }));

        return {
          orders: orderItems,
          history: historyItems,
          clients: clientItems
        };
      } catch (error) {
        if (isAbortError(error)) {
          return EMPTY_RESULTS;
        }
        return EMPTY_RESULTS;
      }
    },
    [debouncedQuery],
    {
      enabled: hasQuery,
      refreshOnFocus: false,
      refreshOnReconnect: false
    }
  );

  const results = error ? EMPTY_RESULTS : data || EMPTY_RESULTS;

  const topResult = useMemo(() => {
    return results.orders[0] || results.history[0] || results.clients[0] || null;
  }, [results]);

  const handleNavigate = (item: SearchItem) => {
    if (item.type === 'order') {
      setSearchQuery(item.primary);
      navigate('/');
    }
    if (item.type === 'history') {
      navigate(`/history?search=${encodeURIComponent(item.primary)}`);
    }
    if (item.type === 'client') {
      navigate(`/clients?company=${encodeURIComponent(item.primary)}`);
    }
    setQuery('');
    setDebouncedQuery('');
    setOpen(false);
  };

  return (
    <div className="relative w-full max-w-lg" ref={containerRef}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id="global-search"
        name="globalSearch"
        placeholder="Search orders, history, clients..."
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && topResult) {
            event.preventDefault();
            handleNavigate(topResult);
          }
        }}
        className="pl-9 bg-background text-foreground border-border"
      />

      {open && (hasQuery || isLoading) && (
        <Card className="absolute mt-2 w-full max-h-80 overflow-y-auto border-border bg-popover text-popover-foreground shadow-lg z-50">
          <div className="p-3 space-y-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Searching...</p>
            ) : (
              <>
                {results.orders.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Orders</p>
                    <ul className="space-y-2">
                      {results.orders.map((item) => (
                        <li key={`order-${item.id}`}>
                          <button
                            type="button"
                            onClick={() => handleNavigate(item)}
                            className="w-full text-left rounded-md px-2 py-1 hover:bg-accent transition-colors"
                          >
                            <p className="text-sm font-medium text-foreground">{item.primary}</p>
                            <p className="text-xs text-muted-foreground">{item.secondary}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {results.history.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">History / Delivered</p>
                    <ul className="space-y-2">
                      {results.history.map((item) => (
                        <li key={`history-${item.id}`}>
                          <button
                            type="button"
                            onClick={() => handleNavigate(item)}
                            className="w-full text-left rounded-md px-2 py-1 hover:bg-accent transition-colors"
                          >
                            <p className="text-sm font-medium text-foreground">{item.primary}</p>
                            <p className="text-xs text-muted-foreground">{item.secondary}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {results.clients.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Clients</p>
                    <ul className="space-y-2">
                      {results.clients.map((item) => (
                        <li key={`client-${item.id}`}>
                          <button
                            type="button"
                            onClick={() => handleNavigate(item)}
                            className="w-full text-left rounded-md px-2 py-1 hover:bg-accent transition-colors"
                          >
                            <p className="text-sm font-medium text-foreground">{item.primary}</p>
                            <p className="text-xs text-muted-foreground">{item.secondary}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {results.orders.length === 0 &&
                  results.history.length === 0 &&
                  results.clients.length === 0 && (
                    <p className="text-sm text-muted-foreground">No results found.</p>
                  )}
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
