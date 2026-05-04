# Watania Steel v2 - App Logic Review

## 1. Purpose and Scope

This application is an internal operations system for steel delivery and production workflows. It combines:

- Active order management
- Delivered order archiving/history
- Driver management and cycle metrics
- Client and site analysis
- Inventory tracking
- Offcut usage tracking and executive reporting
- Steel analytics dashboards
- Role-based access control

Core stack:

- Frontend: React + TypeScript + Tailwind + Radix
- State: Zustand
- Backend: Supabase (Postgres + Auth + RPC)

---

## 2. High-Level Architecture

### 2.1 UI and Routing

Main app shell and routes are in:

- `src/App.tsx`
- `src/routes/routes.ts`

Routing model:

- Lazy-loaded page modules for performance
- Protected shell layout (sidebar/topbar) for authenticated users
- Dedicated print/report route without normal shell chrome

Main routes:

- `/` Dashboard
- `/history` Delivery archive
- `/drivers` Drivers + metrics
- `/clients` Clients + site analytics
- `/inventory` Inventory tables
- `/offcut-usage` Offcut operations
- `/steel-analytics` Delivered steel analytics
- `/reports/offcut/executive` Print-ready offcut executive report

### 2.2 Domain State (Zustand Stores)

- `src/stores/authStore.ts`: authentication session/profile
- `src/stores/dashboardStore.ts`: active orders, history cache, metrics, activities
- `src/stores/driversStore.ts`: drivers and driver metrics
- `src/stores/inventoryStore.ts`: inventory table data and updates

### 2.3 Data Access Layer

Main service module:

- `src/lib/supabase.ts`

Specialized service modules:

- `src/lib/clientsApi.ts` (RPC-centric client/site domain)
- `src/lib/steelAnalytics.ts` (analytics RPC + range logic)
- `src/lib/rpcWithRetry.ts` (retry wrapper for transient RPC errors)

---

## 3. Authentication and Authorization Logic

### 3.1 Authentication Flow

Files:

- `src/components/ProtectedRoute.tsx`
- `src/pages/Login.tsx`
- `src/stores/authStore.ts`
- `src/lib/auth.ts`

Flow:

1. App boot calls `useAuthStore.initialize()`.
2. Store fetches current Supabase auth user.
3. Store loads profile from `profiles` table.
4. Protected routes render only when user exists.
5. If unauthenticated, app renders `Login`.

Auth state subscription:

- `authService.onAuthStateChange` keeps store in sync after login/logout/token events.

### 3.2 Role-Based Permissions

Defined in `src/lib/auth.ts`:

- `viewer`: view-only
- `editor`: view + create + edit
- `admin`: full access including delete/admin pages

UI enforcement:

- `hasPermission(...)`
- `RoleBasedComponent` wrapper (`src/components/RoleBasedComponent.tsx`)

Important:

- Permissions are enforced heavily in UI.
- Database/RLS policies should still be treated as the final security boundary.

---

## 4. Data Model and Core Tables

Primary operational entities in `src/lib/supabase.ts`:

- `orders`: active/in-flight orders
- `history_orders`: delivered archive
- `drivers`: driver master
- `profiles`: auth role profile
- `activities`: lightweight activity feed
- `offcut_usage`: offcut entries
- inventory tables: `qatar_steel`, `al_watania_steel`, `special_length`, `coils`, `wire`, `coupler`

Client/site domain:

- Backed by RPCs and `client_sites` table via `clientsApi.ts`.

---

## 5. Order Lifecycle Logic (Critical)

### 5.1 Active Orders Source

Dashboard active list comes from `orders` table only.

File: `src/stores/dashboardStore.ts`

- `loadOrders()` fetches `orderService.getAll()`.
- Filters out delivered statuses from active in-memory list.

### 5.2 Create Order

Files:

- `src/components/AddOrderDialog.tsx`
- `src/stores/dashboardStore.ts`

Flow:

1. UI validates required fields + duplicate delivery number check.
2. Calls `dashboardStore.addOrder(order)`.
3. If status is active: inserts into `orders`.
4. If status is delivered: writes directly to `history_orders`.

### 5.3 Mark as Delivered (Truck Action)

Files:

- `src/components/OrderTable.tsx`
- `src/stores/dashboardStore.ts`
- `src/lib/supabase.ts` (`historyService.moveOrderToHistory`)

Flow:

1. User clicks truck button in `OrderTable`.
2. Calls `markAsDelivered(orderId)` in dashboard store.
3. Store loads current order object and calls `historyService.moveOrderToHistory(order)`.
4. Service:
   - Ensures client/site linkage (`ensureOrderClientSite`)
   - Inserts/updates record in `history_orders`
   - Uses actual delivered timestamp (`delivered_at`)
   - Sets archive `date` to delivery day (`YYYY-MM-DD`)
   - Deletes order from `orders`
5. Store immediately removes the order from in-memory `orders` list so it disappears from dashboard table instantly.
6. Store refreshes active + history data in background and logs activity.

### 5.4 Move Back to Active

Files:

- `src/components/OrderDetailsDialog.tsx`
- `src/stores/dashboardStore.ts`
- `src/lib/supabase.ts` (`historyService.moveOrderToActive`)

When history order status becomes `in-progress`, service upserts into `orders` and removes from `history_orders`.

---

## 6. Dashboard Logic

Files:

- `src/pages/Dashboard.tsx`
- `src/components/HeroSection.tsx`
- `src/components/DashboardCards.tsx`
- `src/components/OrderTable.tsx`

Composition:

- Header + create order action
- KPI cards
- Active orders table
- Diameter distribution chart

Metrics logic (`loadDashboardMetrics`):

- Pulls today’s orders by `date`
- Aggregates:
  - total orders
  - cut-and-bend tons
  - straight-bar tons
  - total tons
  - signed delivery notes
  - steel mix breakdown

---

## 7. History Page Logic

Files:

- `src/pages/History.tsx`
- `src/lib/supabase.ts` (`historyService.getPaginated`)

Behavior:

- Server-side pagination and filtering
- Debounced search input
- AbortController for request cancellation
- Request ID guard to prevent stale overwrite

Filters:

- status
- company
- dateFrom/dateTo (applied to `delivered_at`)
- global search across multiple fields (`id`, delivery number, customer, company, site, driver, phone, status, type, shift)

Grouping:

- UI groups rows by delivery day (`delivered_at` day fallback to `date`)

---

## 8. Drivers Logic

Files:

- `src/pages/Drivers.tsx`
- `src/pages/DriverDetail.tsx`
- `src/stores/driversStore.ts`
- `src/lib/supabase.ts` (`driverService`)

Key logic:

- Drivers loaded from `drivers`.
- Metrics merge orders from both `orders` and `history_orders`.
- Standard cycle window: 25th -> 25th.
- Driver detail supports:
  - current cycle metrics
  - custom date-range metrics
  - complete order history by driver name

---

## 9. Clients and Sites Logic

Files:

- `src/pages/Clients.tsx`
- `src/pages/ClientProfile.tsx`
- `src/pages/ClientSiteDetails.tsx`
- `src/lib/clientsApi.ts`

Pattern:

- RPC-driven data access for summary/performance/analytics.
- Client profile merges master site records + performance rows.
- Orders pagination is fetched through RPC returning `total_count`.

Admin capabilities:

- client merge RPC
- site merge RPC

---

## 10. Inventory Logic

Files:

- `src/pages/Inventory.tsx`
- `src/stores/inventoryStore.ts`
- `src/lib/supabase.ts` (`inventoryService`)

Behavior:

- Multi-section inventory page for distinct tables.
- Each section has configurable columns and row-label logic.
- Edit modal updates multiple rows, then reloads table.
- Some tables highlight low values.

---

## 11. Offcut Usage and Executive Report Logic

Files:

- `src/pages/OffcutUsage.tsx`
- `src/lib/supabase.ts` (`offcutUsageService`)
- `src/reports/offcut/buildExecutiveOffcutReportData.ts`
- `src/reports/offcut/OffcutExecutivePrintPage.tsx`
- `src/reports/offcut/offcutExecutivePrint.css`

### 11.1 Offcut Data Operations

- Filter by daily/monthly/custom range.
- CRUD on `offcut_usage`.
- Aggregate diameter totals and summary metrics.

### 11.2 Executive Report Pipeline

Flow:

1. Build report payload from filtered offcut rows + production rows (orders/history cut-and-bend).
2. Serialize payload and store it with unique report ID.
3. Open report route with `?rid=<reportId>`.
4. Print page resolves payload by report ID (cross-tab safe fallback chain).
5. Render print-ready multi-page report.

Current report content:

- Executive summary narrative
- KPI panel and benchmarks
- Comparative diameter efficiency table
- Production/offcut breakdown tables
- Daily and monthly charts with annotations

---

## 12. Steel Analytics Logic

Files:

- `src/pages/SteelAnalytics.tsx`
- `src/lib/steelAnalytics.ts`

Flow:

1. Compute max available date across `orders` + `history_orders`.
2. Build selected range anchored to latest date.
3. Call RPC `steel_analytics_summary(start_date, end_date, mode)`.
4. Normalize return shape to UI model.
5. Render totals + line/pie analysis.

Includes a short TTL in-memory cache for repeated range requests.

---

## 13. Activity Logging Logic

Files:

- `src/lib/supabase.ts` (`activityService`)
- `src/stores/dashboardStore.ts`

Used after core mutations:

- create order
- update order
- mark delivered
- move history to active

Activities are best-effort; failures don’t block main operation.

---

## 14. Reliability and Performance Patterns

Implemented patterns:

- Debounced search (history, clients)
- Request cancellation with `AbortController`
- Guard against stale responses via request IDs
- Retry wrappers for transient RPC failures
- Lazy-loaded routes for initial load performance

Known performance note:

- Build warns about large chunks; code-splitting improvements are possible but app remains functional.

---

## 15. Known Caveats / Review Risks

1. User management limits:

- UI can list/update roles.
- Browser-side `auth.admin` operations require suitable key/policy setup; create-user is intentionally guide-based.

2. Date handling consistency:

- Delivery/archive now uses delivery timestamp/day semantics.
- Reviewer should validate all downstream reports/RPCs align with this design.

3. Duplication of business logic:

- Some mutation logic exists in both dialog/store/service layers.
- Refactor opportunity: centralize write workflows at service/store boundary.

4. Mixed defensive patterns:

- Some services throw on error, others return empty arrays.
- Could be standardized for predictability.

---

## 16. Suggested Review Checklist

1. Security:

- Confirm RLS and DB policies enforce role restrictions independent of UI.

2. Data integrity:

- Validate order move semantics between `orders` and `history_orders` under concurrent edits.

3. Role enforcement:

- Verify all destructive operations are backend-protected, not only hidden in UI.

4. Date semantics:

- Confirm reporting windows use intended date columns (`date` vs `delivered_at`).

5. RPC contracts:

- Verify expected shape of client/analytics RPC payloads and null handling.

6. Observability:

- Decide if activity logs should be guaranteed writes vs best-effort.

---

## 17. File Map (Primary)

- App shell and routing: `src/App.tsx`, `src/routes/routes.ts`
- Auth: `src/lib/auth.ts`, `src/stores/authStore.ts`, `src/components/ProtectedRoute.tsx`
- Orders/history services: `src/lib/supabase.ts`
- Dashboard/order UI: `src/pages/Dashboard.tsx`, `src/components/OrderTable.tsx`, `src/components/OrderDetailsDialog.tsx`, `src/components/AddOrderDialog.tsx`
- History page: `src/pages/History.tsx`
- Drivers: `src/pages/Drivers.tsx`, `src/pages/DriverDetail.tsx`, `src/stores/driversStore.ts`
- Clients/sites: `src/lib/clientsApi.ts`, `src/pages/Clients.tsx`, `src/pages/ClientProfile.tsx`, `src/pages/ClientSiteDetails.tsx`
- Inventory: `src/pages/Inventory.tsx`, `src/stores/inventoryStore.ts`
- Offcut/report: `src/pages/OffcutUsage.tsx`, `src/reports/offcut/*`
- Steel analytics: `src/lib/steelAnalytics.ts`, `src/pages/SteelAnalytics.tsx`

