# Performance & Stability Notes

## Root causes observed
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
