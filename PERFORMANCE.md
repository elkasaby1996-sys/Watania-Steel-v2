# OMS Performance Improvements

## Overview
This document summarizes the performance work completed in the OMS web app and how to extend it.

### Key Changes
- Added a lightweight query cache (`src/lib/queryCache.ts`) with stale-while-revalidate behavior, request de-duplication, and invalidation.
- Introduced a shared data sync hook (`src/hooks/useDashboardDataSync.ts`) to keep the dashboard store updated from cached data.
- Added realtime resubscription with backoff for orders/history/activity updates (`src/hooks/useRealtimeOrders.ts`), plus background revalidation (focus + interval).
- Implemented debounced search inputs (e.g., history + clients) to avoid re-fetch/re-render storms.
- Added virtualized rendering for large history tables in `src/pages/History.tsx`.
- Added lightweight performance instrumentation (request count + payload size, and query timings).

## How to Use the Query Cache
### Simple usage
```ts
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { queryKeys } from '@/lib/queryKeys';
import { orderService } from '@/lib/supabase';

const { data, isFetching, refresh } = useCachedQuery(
  queryKeys.orders({ scope: 'active' }),
  (signal) => orderService.list({ status: ['in-progress'], signal }),
  { staleTime: 30000, refetchIntervalMs: 60000 }
);
```

### Invalidate after mutations
```ts
import { invalidateQueries } from '@/lib/queryCache';
import { queryKeys } from '@/lib/queryKeys';

invalidateQueries(queryKeys.orders({ scope: 'active' }));
```

## Realtime & Reliability
- Subscriptions are created once in `useRealtimeOrders()` and cleaned up on unmount.
- Automatic backoff is applied for reconnects when channels time out or error.
- Background revalidation ensures the UI updates even if realtime is temporarily unavailable.

## Recommended Database Indexes
Add these indexes in Supabase to improve filtered/sorted queries:
```sql
create index if not exists orders_status_created_at_idx on public.orders (status, created_at desc);
create index if not exists orders_company_idx on public.orders (company);
create index if not exists orders_delivery_number_idx on public.orders (delivery_number);

create index if not exists history_orders_delivered_at_idx on public.history_orders (delivered_at desc);
create index if not exists history_orders_company_idx on public.history_orders (company);
create index if not exists history_orders_delivery_number_idx on public.history_orders (delivery_number);

create index if not exists activities_timestamp_idx on public.activities (timestamp desc);
```

## Extending Performance Work
- Use `useDebouncedValue` for any new search/filter inputs.
- For lists with 50+ rows, prefer the virtualized pattern used in `History`.
- Add `timeAsync('label', ...)` around any new expensive queries to keep logging consistent.
- Reuse `queryKeys` to ensure cache hits and consistent invalidation.
