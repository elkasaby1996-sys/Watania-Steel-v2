# Performance & Stability Notes

## Auth and dashboard loading — September 2026

- Supabase auth listeners no longer await database requests while the SDK holds its session lock. Profile results are deferred and ignored after newer auth events or unsubscribe.
- Initial authentication requests coalesce, and pending startup/profile results cannot undo sign-out. SDK clients are reused across Vite hot reload and old auth listeners are disposed.
- Dashboard rows and metrics share a single active-order query and one delivered-ID lookup for up to 100 IDs. Previously a pass issued five data queries for that case, including a full history request. Auth/profile queries are additional in both cases; larger datasets require pagination and ID batches.
- Dashboard fetching is route-owned. Fresh results are reused for 30 seconds. Background refreshes retain visible data and show a recoverable refresh error instead of clearing the dashboard.
- Order creation now checks duplicate IDs directly against active and historical tables, so it no longer depends on a history preload. Existing metrics semantics for carryover, future orders, order types, and working steel mix are preserved.
- Session changes invalidate pending reads; successful mutations invalidate older order reads and update totals with the visible rows.
- Run `npm run test:performance` for the isolated regression tests and `npm run check` for TypeScript and the production build.

## Steel Analytics loading — September 2026

- Replaced full-archive downloads with server-side date bounds. History uses its stored date; delivered orders use delivery timestamps with a null-timestamp date fallback. Pagination has a stable ID tie-breaker.
- Latest-date discovery reads date/type metadata and stops at the first eligible record. Active candidates older than the latest matching historical date are skipped. Legacy type normalization remains supported; finding an uncommon type may require multiple metadata pages.
- Targeted history-ID checks preserve history precedence even when the archived version falls outside the selected window or has a different steel type.
- Range data and summaries share concurrent requests and cache fresh results for 60 seconds. Changing type reuses range rows when the dates match. Caller cancellation is independent, unused reads are aborted, and order mutations/session changes invalidate analytics caches.
- Eleven regression tests pass, including an analytics fixture with 1,500 old records and more than 1,000 recent records. The test checks bounded requests, pagination, totals, date boundaries, duplicate precedence, cache reuse, cancellation, failure recovery, and invalidation. All test network responses are mocked; no live latency percentage is claimed.

## Loading across routes — September 2026

| Route | Loading change |
| --- | --- |
| History | Already server-paginated; now 50 rows per page, 30-second page caching, shared requests, debounced text/company filters, no extra old-page request when filters change, and retained rows on same-page refresh/failure. Database errors surface instead of appearing as an empty archive. |
| Drivers | Reuses the driver list; two paginated cycle queries aggregate all drivers instead of two queries per driver. Existing cycle, status and source-counting semantics are preserved. |
| Driver detail | Independent profile, cycle metrics and 50-row order-history loads; custom metrics load only when shown. No full archive download for the initial order-history view. |
| Clients | Read RPCs cache by function and arguments, share in-flight requests, and propagate cancellation. Stale search responses are ignored. |
| Client/site detail | Summary is independent of orders and analytics. Overview sites and analytics load on demand. Site orders fetch every selected page, including returning to page 1. |
| Inventory | Six small table reads share/cache requests. Revisits retain tables while refreshing; failures preserve previous table data and offer retry. |
| Offcut Usage | Date-bounded, cached, cancellable range reads with stable pagination beyond the API row cap. Obsolete filter responses are ignored. |
| Users | Cached/shared profile-list reads with only displayed columns; successful role changes refresh the list. |

`src/lib/queryCache.ts` provides a bounded in-memory cache (100 entries), 30-second default freshness, independent caller cancellation, a StrictMode reuse grace period, forced refresh, and prefix invalidation. Analytics retains its 60-second freshness. Successful service writes invalidate dependent caches; session changes clear all cached/pending reads and store data. Route components remount on identity/path changes. Dashboard/order dialogs no longer preload full history after mutations.

Validation: 18 isolated regression tests cover real SDK auth behavior, bounded/paginated query shapes, 20-driver batching (3 queries instead of 42 for that fixture), history/cache freshness, independent cancellation, mutation invalidation, failed-refresh retention, and account isolation. TypeScript and production build pass. No live business records were modified in testing.

Limits: exact History counts and broad substring search still execute in the database; their cost needs query-plan measurement before index changes. Deep driver-history pages merge sorted prefixes from both tables, so their payload grows with the requested page; a server-side union RPC is a future improvement for very deep navigation. Inventory/user/client directory lists remain small list/summary reads. Report exports remain explicit, on-demand work. This change does not claim a measured latency percentage or resolve the existing large entry-bundle warning.

## Earlier History improvements
- History page triggered duplicate history loads (mount + search effect), leading to repeated full-table fetches and overlapping requests.
- Client-side filtering/grouping loaded all history orders, increasing payload size and rerender cost on each search/filter change.
- History refreshes after edits relied on reloading the entire history store, even when only one page needed updating.

## Fixes applied
- Added a paginated history fetch with server-side filtering/sorting and a reduced column selection.
- Added debounced search, abortable requests, and in-flight request guards to prevent overlapping fetches.
- Implemented pagination controls, lightweight focus/online refresh, and loading/error/empty states.
- Added an optional history refresh callback for order edits to avoid forcing a full history reload.

## Recommended database indexes (no migrations applied)
- `history_orders (delivered_at DESC)` for newest-first sorting.
- `history_orders (date)` for date range filters.
- `history_orders (status)` for status filtering.
- `history_orders (company)` for company filtering.
- `history_orders (delivery_number)` for delivery number lookups.
