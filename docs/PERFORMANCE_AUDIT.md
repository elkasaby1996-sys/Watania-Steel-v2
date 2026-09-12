# Watania Steel loading and performance audit

## Implementation update — 12 September 2026

The auth deadlock and startup/dashboard fetching findings (1–3) have now been addressed. Auth callbacks return synchronously, late profile results are guarded, initialization and concurrent profile reads coalesce, and development hot reload cleans up listeners while reusing the SDK client. The dashboard owns its route's loading, shares orders and metrics in one snapshot, reuses fresh results for 30 seconds, and retains data on background refresh or refresh failure. Global history preloading was removed; order creation checks duplicate IDs with targeted queries. Mutation and identity changes invalidate pending dashboard reads.

Verification: `npm run test:performance` covers the actual auth listener with the installed SDK, stale auth responses, initialization/sign-out races, shared data loads, retained data on failure, account cache isolation, mutation totals, active-order pagination, and duplicate-ID lookups. Ten tests pass. All test network responses are mocked. `docs/performance-auth-repro.mjs` remains an isolated demonstration of the original unsafe pattern; use the new regression suite to test the fix.

Follow-up: date-bounded analytics (5) is also implemented. Summary queries now fetch only the selected date window, latest-date discovery reads metadata, and shared cancellable requests reuse fresh range data. History precedence, legacy order types, and delivery-date fallback semantics are covered by an additional regression test; eleven tests now pass. See `PERF_NOTES.md` for details.

Further follow-up: the shared caching/cancellation logic now also covers History, Drivers and driver detail, Clients and client/site detail, Inventory, Offcut Usage, and Users. Findings 4, 6, and 7 are addressed at the application layer. History already had server pagination; its page size is now 50, with cached revisits, debounced search/company filters, atomic filter/page changes, and retained rows during refresh. Driver metrics use two paginated cycle queries; driver order history is paginated. Client summary loading is independent and secondary tabs load on demand. Eighteen regression tests now pass. See `PERF_NOTES.md` for scope and limitations.

The original audit below records the pre-fix code paths and line references. Server query plans and live latency measurements remain outside the evidence collected here.

Date: 12 September 2026. Scope: startup, authentication, refresh behavior, data access, route loading, and rendering. Application code was not changed during this audit; the prior UI edits remain in place.

The most serious finding is an authentication deadlock, reproduced against the installed Supabase SDK with mocked HTTP responses. The remaining findings are confirmed code paths; their production latency impact has not been measured.

## 1. High — Auth callback can block subsequent requests indefinitely

**Location:** `src/lib/auth.ts:198–209`, `src/stores/authStore.ts:94–134`.

The async `onAuthStateChange` callback awaits a 300 ms delay and then `getUserProfile()`, which queries Supabase through the same client. On token refresh, the SDK waits for subscribers while holding its auth lock. The nested database request needs `getSession()` to obtain its access token and waits for that lock. Neither completes. Later queries can join the blocked queue, explaining a page that stays on loading even when the network is available.

The delay does not release the lock: it is awaited inside the callback. The installed `@supabase/supabase-js` and `@supabase/auth-js` versions are both **2.87.1**. Inspection of `GoTrueClient._acquireLock`, its awaited subscriber notifications, and `fetchWithAuth` confirms the dependency cycle.

**Reproduction:** `node docs/performance-auth-repro.mjs`. This uses synthetic credentials and a custom mock fetch; it does not access the application's database. Two runs of the reproduction completed with the same result:

| Observation | Current awaited pattern | Deferred callback control |
| --- | --- | --- |
| Token-refresh handler entered | Yes | Yes |
| Token refresh completed within the observation window | No | Yes |
| Later independent query completed | No | Yes |
| Profile requests reached mock fetch | 0 | 2 |

The refresh was observed for 1.3 seconds, including a later independent query. The lock dependency explains why this is a deadlock rather than a slow mock response. This reproduces the application's callback pattern in isolation, not a forced token refresh in the user's live session.

**Fix first:** make the callback synchronous and schedule profile loading after it returns. Guard deferred results against sign-out/account changes, deduplicate profile reads, and handle auth events deliberately. Do not disable auth locking. Add a loading deadline and recovery UI as a separate resilience measure.

This matches [Supabase's documented API-call deadlock](https://supabase.com/docs/guides/troubleshooting/why-is-my-supabase-api-call-not-returning-PGzXw0).

## 2. Medium — Profile updates trigger another complete data refresh

**Location:** `src/App.tsx:114–166`, `src/stores/authStore.ts:130–145`.

The initial data effect depends on the entire `user` object. The resume handler explicitly calls `refreshProfile()`, `loadOrders()`, `loadDashboardMetrics()`, and `loadHistoryOrders()`. When the profile request returns, it creates a new user object, rerunning the initial effect and starting another refresh pass. Auth events also replace that object.

The 10-second resume throttle does not cover the initial effect. Orders and metrics have in-flight guards, so those duplicates depend on response order; history has no such guard and can overlap. Even successful background refreshes set the main loading flags, replacing already loaded totals and rows with skeletons.

**Fix:** key initial loading to authenticated identity, centralize refresh scheduling and freshness checks, and distinguish initial loading from background revalidation. Preserve loaded content during background work.

## 3. Medium — Every route fetches history and duplicates dashboard queries

**Location:** `src/App.tsx:120–125`, `src/stores/dashboardStore.ts:217–345`, `src/lib/supabase.ts:298–304,678–713`.

App startup and resume fetch all orders and unpaginated history regardless of the visible route. Metrics separately fetch overlapping order fields. Both the order loader and metric loader then perform delivered-ID lookups against history. These lookups are sequential within each loader and process IDs in serial batches of 100.

With 1–100 relevant order IDs, a normal pass performs five data queries: orders, history-ID lookup, metrics orders, another history-ID lookup, and history. Authentication/profile and route-specific queries are additional. The order query also downloads delivered rows before excluding them in JavaScript. The history endpoint's server row cap may limit the returned rows; this is still an unpaginated request, not evidence that the entire database is returned.

The History page already uses pagination, but the global history request bypasses that improvement. `getTodayOrders()` also rebuilds an ID set from the globally loaded history on each call.

**Fix:** fetch data for the visible route, share a canonical active-order result with dashboard metrics, and preserve history deduplication through an indexed server query/view or equivalent targeted lookup. Keep full-history exports separate from routine page loads.

## 4. Medium — Driver metrics scale at two queries per driver

**Location:** `src/pages/Drivers.tsx:27–32`, `src/lib/supabase.ts:581–665`, `src/stores/driversStore.ts:54–84`.

Opening Drivers fetches the driver list directly and again inside `getMetrics()`. Metrics then issue an orders query followed by a history query for every driver. The requests for different drivers run concurrently, but each driver's pair is sequential and downloads full rows to calculate counts and sums locally.

For N drivers, the page initiates **2N + 2 queries**, excluding global App queries. For example, 20 drivers means 42 queries. This is a code-derived example, not a measured live driver count. The loaders have no in-flight guards, so development StrictMode can duplicate the mount work.

**Fix:** reuse the driver list and aggregate all drivers in one RPC, or use two bounded cycle queries and group once. Add request deduplication and freshness caching.

## 5. Medium — A short analytics range still downloads all delivered history

**Location:** `src/lib/steelAnalytics.ts:89–174,207–223`, `src/pages/SteelAnalytics.ts:103–117`.

Before determining the most recent date, analytics downloads all delivered rows from both tables in sequential 1,000-row pages. Date-range and order-type filtering happen afterward in JavaScript. Thus a seven-day view can still require years of records. A 60-second cache helps repeat views, but not cold loads or loads after expiry; there is no shared in-flight cache.

**Fix:** query the latest relevant date using a bounded server query, then fetch or aggregate only the selected range. Preserve the current deduplication and differing date semantics for active versus historical records.

## 6. Medium — Client RPCs ignore cancellation, and summary waits for analytics

**Location:** `src/lib/clientsApi.ts:20–23`, `src/pages/ClientProfile.tsx:339–391`.

The RPC helper accepts `_signal` but never passes it to the Supabase query. Page cleanup prevents some stale UI updates, but the requests continue. Navigating between clients or rapidly changing pages leaves obsolete work running, including under development StrictMode.

Client profile summary, sites, and analytics are committed only after a single `Promise.all` finishes, although Orders is the default tab. A slow analytics request delays the summary; an analytics failure also sets errors on otherwise independent sections.

**Fix:** propagate `abortSignal(signal)` for cancellable reads and commit independent results separately. Fetch analytics when its tab is needed. Treat cancellation of writes separately because aborting a response does not guarantee the database mutation was cancelled.

## 7. Medium — Inventory revisits refetch all sections and hide cached content

**Location:** `src/pages/Inventory.tsx:344–346`, `src/stores/inventoryStore.ts:46–59`, `src/lib/supabase.ts:1097–1125`.

Each mount starts six inventory queries through `Promise.all`, without a freshness check or in-flight guard. All sections wait for the slowest response and the shared loading flag. Development StrictMode can start twelve queries. Cached store data exists but is not used to avoid the full reload. Errors clear the cached inventory.

**Fix:** reuse fresh inventory on revisits, deduplicate loading, retain cached values on refresh failures, and allow independent sections to finish separately when useful.

## Additional costs and limitations

- A production build with `write: false` succeeded. The main entry is **576,736 bytes minified** (about **168.8 kB gzip** in the preceding build). The shared Recharts chunk is **370,984 bytes**, and the dashboard chunk is **34,929 bytes**. The chart chunk is separate; it is not evidence that every dashboard load downloads it. Supabase, React DOM, shared UI dependencies, and the monolithic data-service module contribute to the entry. Bundle work is secondary to fixing the deadlock and request patterns.
- `App`, `AppShell`, and multiple dashboard components subscribe to whole Zustand stores. Any store update can rerender these consumers even when their selected fields did not change. Selectors can reduce unnecessary rendering. No React Profiler trace was collected, so there is no measured CPU attribution.
- Startup waits for `auth.getUser()` and then a profile query before leaving the full-page loader. There is no application deadline or recovery control on this path. A network timeout alone would not repair the lock cycle in finding 1, which can occur before fetch starts.
- History search performs a broad substring OR across ten fields with an exact count. Its actual database cost needs query plans and deployed-index inspection before recommending migrations.
- The live localhost page transitioned from its startup loader to populated data during the audit. No persistent live-session hang was forced. Browser console inspection returned no captured warnings/errors at the time checked. Request-level browser timing was unavailable through the inspection surface, so no network latency or Core Web Vitals numbers are claimed.
- Localhost runs Vite development code and React StrictMode. Development module compilation and duplicated unguarded mount effects must be distinguished from production behavior; production asset sizes above came from an actual production build.

## Recommended order

1. Fix and regression-test the auth deadlock, including token refresh, returning to the tab, and sign-out while a profile read is pending.
2. Consolidate startup/resume loading and preserve visible data during refresh.
3. Remove global history fetching and duplicate active-order queries while preserving current order/history semantics.
4. Batch driver metrics, bound analytics queries, and repair client RPC cancellation.
5. Improve inventory freshness, store subscriptions, and loading boundaries; then measure production navigation and query plans before further bundle or database tuning.
