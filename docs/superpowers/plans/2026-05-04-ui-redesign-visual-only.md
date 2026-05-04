# UI Redesign Visual-Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved More Glass Shift Ledger visual redesign app-wide while preserving all routes, workflows, table columns, form fields, stores, Supabase calls, and business logic.

**Architecture:** Implement the redesign through global tokens and shared UI primitives first, then app shell styling, then page-specific visual polish. Mobile is treated as a first-class visual target: phone views should feel native on iPhone and Android, not like compressed desktop screens.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Radix UI primitives, lucide-react, Recharts, Zustand, Supabase.

---

## File Structure

Modify shared visual foundations:

- `src/index.css`: glass tokens, root colors, global background, reusable component utility classes, mobile safe-area helpers.
- `tailwind.config.js`: shadows, background images, radii, colors, and backdrop-aware design tokens.
- `src/components/ui/button.tsx`: visual-only variant class updates.
- `src/components/ui/card.tsx`: glass panel card styling.
- `src/components/ui/input.tsx`: glass input styling.
- `src/components/ui/badge.tsx`: glass chip badge styling.
- `src/components/ui/table.tsx`: glass table shell and readable rows.
- `src/components/ui/dialog.tsx`: native-feeling phone dialogs and elevated glass desktop dialogs.
- `src/components/ui/dropdown-menu.tsx`: glass dropdown menus and item states.
- `src/components/ui/select.tsx`: glass select trigger/content styling.
- `src/components/ui/popover.tsx`: glass popover styling.
- `src/components/ui/alert.tsx` and `src/components/ui/alert-dialog.tsx`: alert and confirmation visual consistency.
- `src/components/ui/toast.tsx` and `src/components/ui/toaster.tsx`: glass toast styling.

Modify app shell:

- `src/App.tsx`: app background, content padding, safe-area treatment, phone spacing.
- `src/components/Sidebar.tsx`: frosted desktop sidebar and native mobile drawer.
- `src/components/TopBar.tsx`: frosted top bar, phone-safe header, icon states.
- `src/components/RouteSkeleton.tsx`: matching glass skeleton/loading state.

Modify dashboard and common visual surfaces:

- `src/components/HeroSection.tsx`: compact today-first header styling.
- `src/components/DashboardCards.tsx`: glass metric cards.
- `src/components/ActivityFeed.tsx`: glass feed panel.
- `src/components/DailyMetricsCard.tsx`: daily snapshot cards.
- `src/components/DataVisualization.tsx`: chart panel shell.
- `src/components/DiameterDistributionChart.tsx`: chart panel and color styling.
- `src/components/OrderChart.tsx`, `src/components/StatusChart.tsx`, `src/components/SteelBreakdownChart.tsx`: chart palette and panel consistency.
- `src/components/DriversMetrics.tsx`: driver metric cards.

Modify dense operational views only where local classes bypass shared primitives:

- `src/components/OrderTable.tsx`: mobile order cards, table wrapper spacing, action button visual treatment.
- `src/components/DriversTable.tsx`: table/card visual polish without changing columns.
- `src/components/HistoryOverview.tsx`: overview surfaces.
- `src/pages/Dashboard.tsx`, `src/pages/History.tsx`, `src/pages/Drivers.tsx`, `src/pages/DriverDetail.tsx`, `src/pages/Clients.tsx`, `src/pages/ClientProfile.tsx`, `src/pages/ClientSiteDetails.tsx`, `src/pages/Inventory.tsx`, `src/pages/OffcutUsage.tsx`, `src/pages/SteelAnalytics.tsx`, `src/pages/Users.tsx`: page-level spacing and surface classes only.

Do not modify files in `src/stores`, `src/lib`, `supabase`, or SQL docs for this visual pass.

---

### Task 1: Baseline And Guardrails

**Files:**
- Read: `docs/superpowers/specs/2026-05-04-ui-redesign-visual-only-design.md`
- Read: `PRODUCT.md`
- Read: `DESIGN.md`
- Read: `src/index.css`
- Read: `tailwind.config.js`
- Verify: `package.json`

- [ ] **Step 1: Confirm clean working scope**

Run:

```powershell
git status --short --branch
```

Expected: branch is `UI-Update`. Existing untracked context files may include `PRODUCT.md`, `DESIGN.md`, and `DESIGN.json`; do not delete or overwrite them unless explicitly handling design context.

- [ ] **Step 2: Confirm build baseline**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: both commands complete successfully before visual edits. If either fails because of pre-existing code issues, record the exact failure in the implementation notes before continuing.

- [ ] **Step 3: Create a visual-only checklist**

Use this checklist while editing:

```text
Do not change table columns.
Do not change form fields.
Do not change routes.
Do not change store logic.
Do not change Supabase calls.
Do not change business calculations.
Only change visual classes, tokens, layout spacing, and component presentation.
```

- [ ] **Step 4: Commit only if baseline notes were added**

If no files changed, do not commit. If implementation notes were added, commit them:

```powershell
git add docs/superpowers/plans/2026-05-04-ui-redesign-visual-only.md
git commit -m "docs: record UI redesign baseline"
```

---

### Task 2: Global Glass Tokens And Utilities

**Files:**
- Modify: `src/index.css`
- Modify: `tailwind.config.js`
- Test: `npm run typecheck`, `npm run build`

- [ ] **Step 1: Update root visual tokens in `src/index.css`**

Replace only visual token values and add glass-specific tokens. Keep variable names compatible with existing Tailwind config:

```css
:root {
  --color-border: hsl(214, 24%, 32%);
  --color-input: hsl(216, 28%, 16%);
  --color-ring: hsl(345, 68%, 44%);
  --color-background: hsl(220, 42%, 7%);
  --color-foreground: hsl(210, 24%, 90%);
  --color-primary: hsl(345, 66%, 34%);
  --color-primary-foreground: hsl(210, 28%, 96%);
  --color-secondary: hsl(216, 25%, 24%);
  --color-secondary-foreground: hsl(210, 24%, 90%);
  --color-tertiary: hsl(216, 20%, 40%);
  --color-tertiary-foreground: hsl(210, 28%, 94%);
  --color-neutral: hsl(216, 28%, 16%);
  --color-neutral-foreground: hsl(210, 24%, 90%);
  --color-destructive: hsl(0, 66%, 52%);
  --color-destructive-foreground: hsl(210, 28%, 96%);
  --color-success: hsl(142, 48%, 42%);
  --color-success-foreground: hsl(210, 28%, 96%);
  --color-warning: hsl(38, 82%, 53%);
  --color-warning-foreground: hsl(220, 42%, 7%);
  --color-muted: hsl(216, 26%, 20%);
  --color-muted-foreground: hsl(214, 18%, 64%);
  --color-accent: hsl(216, 28%, 24%);
  --color-accent-foreground: hsl(210, 28%, 95%);
  --color-popover: hsl(218, 32%, 14%);
  --color-popover-foreground: hsl(210, 24%, 90%);
  --color-card: hsl(217, 30%, 16%);
  --color-card-foreground: hsl(210, 24%, 90%);
  --color-sidebar: hsl(220, 42%, 7%);
  --color-sidebar-foreground: hsl(212, 21%, 72%);
  --color-sidebar-border: hsl(214, 24%, 28%);
  --color-sidebar-accent: hsl(345, 66%, 34%);
  --color-sidebar-hover: hsl(216, 30%, 18%);
  --color-sidebar-active: hsl(216, 30%, 22%);
  --glass-panel: hsla(217, 30%, 16%, 0.58);
  --glass-panel-strong: hsla(217, 30%, 14%, 0.76);
  --glass-panel-soft: hsla(217, 30%, 18%, 0.42);
  --glass-border: hsla(210, 28%, 92%, 0.16);
  --glass-border-strong: hsla(210, 28%, 96%, 0.24);
  --glass-highlight: hsla(210, 28%, 98%, 0.11);
  --glass-shadow: 0 22px 55px rgba(0, 0, 0, 0.34);
  --glass-shadow-soft: 0 14px 34px rgba(0, 0, 0, 0.22);
  --glass-blur: 22px;
  --radius: 14px;
}
```

- [ ] **Step 2: Add reusable glass utilities in `src/index.css`**

Add the following under `@layer components`:

```css
@layer components {
  .glass-shell {
    background:
      radial-gradient(circle at 8% 8%, hsla(345, 66%, 34%, 0.28), transparent 26%),
      radial-gradient(circle at 82% 16%, hsla(216, 20%, 40%, 0.24), transparent 30%),
      linear-gradient(135deg, hsl(220, 42%, 7%), hsl(218, 36%, 12%) 48%, hsl(220, 42%, 8%));
  }

  .glass-panel {
    background: var(--glass-panel);
    border: 1px solid var(--glass-border);
    box-shadow: inset 0 1px var(--glass-highlight), var(--glass-shadow-soft);
    backdrop-filter: blur(var(--glass-blur)) saturate(145%);
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(145%);
  }

  .glass-panel-strong {
    background: var(--glass-panel-strong);
    border: 1px solid var(--glass-border-strong);
    box-shadow: inset 0 1px var(--glass-highlight), var(--glass-shadow);
    backdrop-filter: blur(var(--glass-blur)) saturate(150%);
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(150%);
  }

  .glass-card-hover {
    transition: border-color 180ms ease-out, box-shadow 180ms ease-out, background-color 180ms ease-out;
  }

  .glass-card-hover:hover {
    border-color: var(--glass-border-strong);
    box-shadow: inset 0 1px var(--glass-highlight), 0 24px 58px rgba(0, 0, 0, 0.3);
  }

  .phone-safe-page {
    padding-left: max(0.75rem, env(safe-area-inset-left));
    padding-right: max(0.75rem, env(safe-area-inset-right));
    padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
  }
}
```

- [ ] **Step 3: Add global background polish**

Update `html, body` and `body` base styles so the app uses the glass shell background without changing app structure:

```css
html,
body {
  min-height: 100%;
  color: var(--color-foreground);
  background:
    radial-gradient(circle at 10% 0%, hsla(345, 66%, 34%, 0.22), transparent 28%),
    radial-gradient(circle at 85% 12%, hsla(216, 20%, 40%, 0.22), transparent 32%),
    hsl(220, 42%, 7%);
  font-family: var(--font-sans);
}
```

- [ ] **Step 4: Update Tailwind shadows and backgrounds in `tailwind.config.js`**

Add or replace these `extend` entries while keeping existing color token references:

```js
backgroundImage: {
  'glass-shell': 'radial-gradient(circle at 8% 8%, hsla(345, 66%, 34%, 0.28), transparent 26%), radial-gradient(circle at 82% 16%, hsla(216, 20%, 40%, 0.24), transparent 30%), linear-gradient(135deg, hsl(220, 42%, 7%), hsl(218, 36%, 12%) 48%, hsl(220, 42%, 8%))',
  'glass-maroon': 'linear-gradient(145deg, hsl(345, 66%, 42%), hsl(345, 66%, 30%))',
  'glass-panel': 'linear-gradient(145deg, hsla(217, 30%, 18%, 0.72), hsla(217, 30%, 13%, 0.52))',
},
borderRadius: {
  lg: '14px',
  md: '10px',
  sm: '6px',
  xl: '18px',
  '2xl': '22px',
},
boxShadow: {
  industrial: '0 12px 30px rgba(126, 27, 52, 0.28)',
  'industrial-md': '0 18px 46px rgba(0, 0, 0, 0.32)',
  'industrial-lg': '0 28px 80px rgba(0, 0, 0, 0.46)',
  card: 'inset 0 1px rgba(255, 255, 255, 0.1), 0 14px 34px rgba(0, 0, 0, 0.22)',
  'card-hover': 'inset 0 1px rgba(255, 255, 255, 0.14), 0 24px 58px rgba(0, 0, 0, 0.3)',
  glass: 'inset 0 1px rgba(255, 255, 255, 0.11), 0 22px 55px rgba(0, 0, 0, 0.34)',
}
```

- [ ] **Step 5: Verify tokens compile**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: both pass.

- [ ] **Step 6: Commit global tokens**

Run:

```powershell
git add src/index.css tailwind.config.js
git commit -m "style: add glassmorphic design tokens"
```

---

### Task 3: Shared UI Primitives

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/table.tsx`
- Modify: `src/components/ui/dialog.tsx`
- Modify: `src/components/ui/dropdown-menu.tsx`
- Modify: `src/components/ui/select.tsx`
- Modify: `src/components/ui/popover.tsx`
- Modify: `src/components/ui/alert.tsx`
- Modify: `src/components/ui/alert-dialog.tsx`
- Modify: `src/components/ui/toast.tsx`
- Test: `npm run typecheck`, `npm run build`

- [ ] **Step 1: Update button variants**

In `button.tsx`, keep the existing `variant` and `size` API unchanged. Update only class strings:

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-glass-maroon text-primary-foreground shadow-industrial hover:brightness-110 active:brightness-95 border border-primary/35",
        destructive:
          "bg-destructive text-destructive-foreground shadow-industrial hover:bg-destructive/90 active:bg-destructive/80 border border-destructive/30",
        outline:
          "border border-white/15 bg-white/[0.03] text-foreground backdrop-blur-xl hover:bg-accent/70 hover:text-accent-foreground hover:border-white/25",
        secondary:
          "bg-secondary/70 text-secondary-foreground border border-white/12 backdrop-blur-xl hover:bg-secondary/90",
        ghost: "text-foreground hover:bg-white/[0.07] hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

- [ ] **Step 2: Update card primitive**

In `card.tsx`, keep exported component names unchanged. Update default card class:

```tsx
"glass-panel glass-card-hover rounded-xl text-card-foreground"
```

Keep `CardHeader`, `CardContent`, and `CardFooter` APIs unchanged, but tune spacing to stay consistent:

```tsx
"flex flex-col space-y-1.5 p-5 sm:p-6"
"p-5 pt-0 sm:p-6 sm:pt-0"
"flex items-center p-5 pt-0 sm:p-6 sm:pt-0"
```

- [ ] **Step 3: Update input primitive**

In `input.tsx`, keep props unchanged. Replace default class with:

```tsx
"flex h-11 w-full rounded-lg border border-white/14 bg-input/75 px-3 py-2 text-sm text-foreground shadow-sm backdrop-blur-xl transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
```

- [ ] **Step 4: Update badge primitive**

In `badge.tsx`, keep variants unchanged. Update base and variant classes:

```tsx
"inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background backdrop-blur-xl"
```

Use tinted borders:

```tsx
default: "border-primary/35 bg-primary/85 text-primary-foreground hover:bg-primary",
secondary: "border-white/12 bg-secondary/70 text-secondary-foreground hover:bg-secondary/90",
destructive: "border-destructive/35 bg-destructive/85 text-destructive-foreground hover:bg-destructive",
outline: "border-white/16 text-foreground bg-white/[0.03]",
success: "border-success/35 bg-success/85 text-success-foreground",
warning: "border-warning/40 bg-warning/90 text-warning-foreground",
```

- [ ] **Step 5: Update table primitive**

In `table.tsx`, keep all exports and markup structure unchanged. Update shell and row styling:

```tsx
<div className="relative w-full overflow-auto rounded-2xl border border-white/14 bg-card/70 shadow-glass backdrop-blur-xl">
```

Use readable header and rows:

```tsx
"sticky top-0 z-10 bg-muted/80 backdrop-blur-xl [&_tr]:border-b"
"[&_tr:last-child]:border-0 [&_tr:nth-child(even)]:bg-white/[0.025]"
"border-b border-white/10 transition-colors duration-150 hover:bg-accent/45 data-[state=selected]:bg-accent"
"h-12 px-4 text-left align-middle font-semibold text-[11px] uppercase tracking-[0.08em] text-muted-foreground"
"px-4 py-3 align-middle text-card-foreground"
```

- [ ] **Step 6: Update dialogs and dropdowns for desktop and phone**

In `dialog.tsx`, update overlay and content classes only:

```tsx
"fixed inset-0 z-50 bg-black/65 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
```

```tsx
"fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-1rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl border border-white/16 bg-card/85 p-5 shadow-industrial-lg backdrop-blur-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:w-full sm:p-6"
```

In `dropdown-menu.tsx`, update content classes to:

```tsx
"z-50 min-w-[8rem] overflow-hidden rounded-xl border border-white/14 bg-popover/85 p-1.5 text-popover-foreground shadow-industrial-md backdrop-blur-2xl"
```

Update item classes to use `hover`/`focus` glass states:

```tsx
"relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors focus:bg-white/[0.08] focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0"
```

- [ ] **Step 7: Apply the same glass treatment to select, popover, alert, alert-dialog, and toast**

Use these rules:

```text
Content surfaces: bg-popover/85 or bg-card/85, border-white/14, rounded-xl or rounded-2xl, backdrop-blur-2xl, shadow-industrial-md/lg.
Triggers and controls: bg-input/75 or bg-white/[0.03], border-white/14, hover:bg-white/[0.07].
Alerts: readable opaque glass, status color border/tint, no side stripe borders.
Toasts: glass-panel-strong with readable text and clear action states.
```

- [ ] **Step 8: Verify primitives compile**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: both pass.

- [ ] **Step 9: Commit primitive styling**

Run:

```powershell
git add src/components/ui
git commit -m "style: refresh shared UI primitives"
```

---

### Task 4: App Shell And Phone-Native Frame

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/TopBar.tsx`
- Modify: `src/components/RouteSkeleton.tsx`
- Test: `npm run typecheck`, `npm run build`

- [ ] **Step 1: Update app background and page padding**

In `App.tsx`, keep routing and data-loading logic unchanged. Change only class names around the shell:

```tsx
<div className="min-h-screen bg-glass-shell text-foreground">
```

Update the main content wrapper:

```tsx
<div className={isReportRoute ? '' : isMobile ? 'pt-16 phone-safe-page' : 'pt-20 p-6'}>
  <div className={isReportRoute ? '' : 'mx-auto w-full max-w-[1500px]'}>
```

- [ ] **Step 2: Update desktop sidebar glass**

In `Sidebar.tsx`, keep `menuItems`, permissions, and navigation behavior unchanged. Update wrapper classes:

```tsx
className={`fixed left-0 top-0 h-full border-r border-white/12 bg-sidebar/70 shadow-glass backdrop-blur-2xl transition-all duration-300 ease-in-out z-50 ${
  isMobile
    ? `w-72 max-w-[calc(100vw-1rem)] ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`
    : sidebarCollapsed
    ? 'w-16'
    : 'w-64'
}`}
```

Update overlay:

```tsx
"fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
```

Update nav active and default item classes:

```tsx
item.active
  ? 'bg-primary/20 text-gray-50 font-medium border border-primary/35 shadow-[inset_0_1px_rgba(255,255,255,0.08)]'
  : 'text-sidebar-foreground hover:text-gray-100 hover:bg-white/[0.06]'
```

- [ ] **Step 3: Update top bar glass and phone behavior**

In `TopBar.tsx`, keep theme toggle, refresh, dropdown, and sign-out behavior unchanged. Update header:

```tsx
<header className={`fixed top-0 right-0 z-40 h-16 border-b border-white/12 bg-card/70 shadow-glass backdrop-blur-2xl transition-all duration-300 ease-in-out ${
  isMobile ? 'left-0' : sidebarCollapsed ? 'left-16' : 'left-64'
}`}>
```

Use phone-safe horizontal padding:

```tsx
<div className={`flex h-full items-center justify-between ${isMobile ? 'px-3 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]' : 'px-6'}`}>
```

- [ ] **Step 4: Update loading skeleton**

In `RouteSkeleton.tsx`, keep exported component unchanged. Use glass panels and muted shimmer blocks:

```tsx
"glass-panel rounded-2xl p-5"
"animate-pulse rounded-lg bg-white/[0.06]"
```

- [ ] **Step 5: Verify app shell compiles**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: both pass.

- [ ] **Step 6: Commit app shell**

Run:

```powershell
git add src/App.tsx src/components/Sidebar.tsx src/components/TopBar.tsx src/components/RouteSkeleton.tsx
git commit -m "style: apply glass app shell"
```

---

### Task 5: Dashboard And Chart Surfaces

**Files:**
- Modify: `src/components/HeroSection.tsx`
- Modify: `src/components/DashboardCards.tsx`
- Modify: `src/components/DailyMetricsCard.tsx`
- Modify: `src/components/ActivityFeed.tsx`
- Modify: `src/components/DataVisualization.tsx`
- Modify: `src/components/DiameterDistributionChart.tsx`
- Modify: `src/components/OrderChart.tsx`
- Modify: `src/components/StatusChart.tsx`
- Modify: `src/components/SteelBreakdownChart.tsx`
- Modify: `src/components/DriversMetrics.tsx`
- Modify: `src/pages/Dashboard.tsx`
- Test: `npm run typecheck`, `npm run build`

- [ ] **Step 1: Refresh dashboard page rhythm**

In `Dashboard.tsx`, keep component order unchanged. Update wrapper spacing:

```tsx
<div className="space-y-5 sm:space-y-6">
```

- [ ] **Step 2: Refresh today header**

In `HeroSection.tsx`, keep date and `AddOrderDialog` logic unchanged. Update layout classes:

```tsx
<div className="mb-6">
  <div className="page-header glass-panel rounded-2xl p-4 sm:p-5">
```

Update title/subtitle classes through `src/index.css` page header utilities:

```css
.page-header-title {
  @apply font-headline text-xl sm:text-2xl font-bold text-foreground;
}

.page-header-subtitle {
  @apply mt-1 text-sm text-muted-foreground;
}
```

- [ ] **Step 3: Refresh metric cards**

In `DashboardCards.tsx`, keep `cards` array length and metric values unchanged. Change only classes:

```tsx
<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
```

Use card content:

```tsx
<Card key={index} className="p-5">
  <div className="flex items-start justify-between gap-4">
    <div className="min-w-0">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{card.title}</p>
      <p className="text-3xl font-bold tabular-nums text-gray-50">{card.value}</p>
    </div>
    <div className={`rounded-xl border border-white/10 p-3 shadow-[inset_0_1px_rgba(255,255,255,0.08)] ${card.bgColor}`}>
      <card.icon className={`h-6 w-6 ${card.color}`} />
    </div>
  </div>
</Card>
```

- [ ] **Step 4: Refresh chart panels without changing chart data**

For chart components, keep data arrays, calculations, and Recharts props that define data unchanged. Update only container classes and color constants.

Use this palette where local chart colors exist:

```ts
const chartPalette = {
  maroon: 'hsl(345, 66%, 44%)',
  steel: 'hsl(216, 20%, 54%)',
  amber: 'hsl(38, 82%, 58%)',
  green: 'hsl(142, 48%, 46%)',
  muted: 'hsl(214, 18%, 64%)',
};
```

Use `Card` or `glass-panel rounded-2xl` for chart wrappers.

- [ ] **Step 5: Verify dashboard compiles**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: both pass.

- [ ] **Step 6: Commit dashboard and charts**

Run:

```powershell
git add src/components/HeroSection.tsx src/components/DashboardCards.tsx src/components/DailyMetricsCard.tsx src/components/ActivityFeed.tsx src/components/DataVisualization.tsx src/components/DiameterDistributionChart.tsx src/components/OrderChart.tsx src/components/StatusChart.tsx src/components/SteelBreakdownChart.tsx src/components/DriversMetrics.tsx src/pages/Dashboard.tsx src/index.css
git commit -m "style: polish dashboard glass surfaces"
```

---

### Task 6: Dense Pages, Tables, And Mobile Cards

**Files:**
- Modify: `src/components/OrderTable.tsx`
- Modify: `src/components/DriversTable.tsx`
- Modify: `src/components/HistoryOverview.tsx`
- Modify: `src/pages/History.tsx`
- Modify: `src/pages/Drivers.tsx`
- Modify: `src/pages/DriverDetail.tsx`
- Modify: `src/pages/Clients.tsx`
- Modify: `src/pages/ClientProfile.tsx`
- Modify: `src/pages/ClientSiteDetails.tsx`
- Modify: `src/pages/Inventory.tsx`
- Modify: `src/pages/OffcutUsage.tsx`
- Modify: `src/pages/SteelAnalytics.tsx`
- Modify: `src/pages/Users.tsx`
- Test: `npm run typecheck`, `npm run build`

- [ ] **Step 1: Update `OrderTable.tsx` desktop panel**

Keep all columns, actions, status logic, and handlers unchanged. Change the outer wrapper from plain `Card` presentation to glass spacing:

```tsx
<Card className="overflow-hidden">
  <div className="p-4 sm:p-6">
```

Keep `<Table>`, `<TableHeader>`, `<TableHead>`, and row cells unchanged except visual class additions.

- [ ] **Step 2: Update `OrderTable.tsx` mobile cards**

Do not remove any displayed mobile fields or buttons. Update mobile card wrapper only:

```tsx
<div key={order.id} className="glass-panel rounded-2xl p-4 space-y-3">
```

Use larger touch-friendly actions:

```tsx
className="h-11 px-3"
```

Keep all existing `onClick`, permission checks, phone links, delivery note actions, edit/view buttons, and delete confirmation behavior unchanged.

- [ ] **Step 3: Update `DriversTable.tsx` and `HistoryOverview.tsx`**

Apply the same rule:

```text
Outer repeated item containers: glass-panel rounded-2xl p-4.
Table wrappers: rely on shared Table primitive.
Action buttons: keep existing variant and handler.
No columns, labels, or data mapping changes.
```

- [ ] **Step 4: Update page-level wrappers**

For each page listed in this task, keep component order and business logic unchanged. Add or tune only visual spacing:

```tsx
<div className="space-y-5 sm:space-y-6">
```

For page headers that are plain blocks, use:

```tsx
<div className="page-header glass-panel rounded-2xl p-4 sm:p-5">
```

For page-local panels not using `Card`, use:

```tsx
className="glass-panel rounded-2xl p-4 sm:p-6"
```

- [ ] **Step 5: Verify dense pages compile**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: both pass.

- [ ] **Step 6: Commit dense page styling**

Run:

```powershell
git add src/components/OrderTable.tsx src/components/DriversTable.tsx src/components/HistoryOverview.tsx src/pages/History.tsx src/pages/Drivers.tsx src/pages/DriverDetail.tsx src/pages/Clients.tsx src/pages/ClientProfile.tsx src/pages/ClientSiteDetails.tsx src/pages/Inventory.tsx src/pages/OffcutUsage.tsx src/pages/SteelAnalytics.tsx src/pages/Users.tsx
git commit -m "style: refresh operational pages"
```

---

### Task 7: Phone-Native Visual Adaptation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/TopBar.tsx`
- Modify: `src/components/ui/dialog.tsx`
- Modify: `src/components/ui/select.tsx`
- Modify: `src/components/ui/dropdown-menu.tsx`
- Modify: `src/components/OrderTable.tsx`
- Modify: `src/components/DriversTable.tsx`
- Modify: page files touched in Task 6 only if a phone-specific visual class is needed
- Test: `npm run typecheck`, `npm run build`

- [ ] **Step 1: Add native phone safe-area behavior**

In `src/index.css`, confirm these utilities exist from Task 2:

```css
.phone-safe-page {
  padding-left: max(0.75rem, env(safe-area-inset-left));
  padding-right: max(0.75rem, env(safe-area-inset-right));
  padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
}
```

If not present, add them.

- [ ] **Step 2: Make phone app shell feel native**

In `TopBar.tsx`, ensure mobile top bar uses compact title and stable 44px icon targets:

```tsx
className="mr-2 h-11 w-11 text-foreground hover:bg-white/[0.07] hover:text-accent-foreground"
```

Use:

```tsx
{isMobile ? 'Watania ERP' : 'Factory Management System'}
```

Keep existing behavior unchanged.

- [ ] **Step 3: Make mobile drawer feel native**

In `Sidebar.tsx`, use:

```tsx
isMobile ? `w-[min(18rem,calc(100vw-1rem))] rounded-r-2xl ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}` : ...
```

Keep overlay click-to-close and route navigation unchanged.

- [ ] **Step 4: Make dialogs phone-native**

In `dialog.tsx`, use width and max-height classes that prevent cramped mobile modals:

```tsx
"max-h-[calc(100dvh-1rem)] overflow-y-auto"
```

Add to `DialogContent` class after `w-[calc(100%-1rem)]`. Keep Radix content behavior unchanged.

- [ ] **Step 5: Keep mobile cards complete**

In `OrderTable.tsx` and `DriversTable.tsx`, compare mobile card fields against the existing code before editing. Confirm no existing displayed field or action is removed.

Use this visual-only rule:

```text
Mobile cards: full width, rounded-2xl, glass-panel, p-4, space-y-3.
Action rows: flex-wrap gap-2, buttons h-11.
Identifiers and numeric values: font-mono tabular-nums.
Phone links: keep tel href exactly as existing code builds it.
```

- [ ] **Step 6: Verify phone build**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: both pass.

- [ ] **Step 7: Commit phone-native adaptation**

Run:

```powershell
git add src/App.tsx src/components/Sidebar.tsx src/components/TopBar.tsx src/components/ui/dialog.tsx src/components/ui/select.tsx src/components/ui/dropdown-menu.tsx src/components/OrderTable.tsx src/components/DriversTable.tsx src/index.css
git commit -m "style: improve native phone presentation"
```

---

### Task 8: App-Wide Visual QA And Final Fixes

**Files:**
- Modify only files already touched in Tasks 2-7
- Test: `npm run typecheck`, `npm run build`
- Browser: local Vite app

- [ ] **Step 1: Run full verification**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: both pass.

- [ ] **Step 2: Start local dev server**

Run:

```powershell
npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL, usually `http://127.0.0.1:5173/`.

- [ ] **Step 3: Desktop visual QA**

Check these views at desktop width:

```text
Dashboard
History
Drivers
Clients
Inventory
Offcut Usage
Steel Analytics
Users
One create/edit dialog
One dropdown menu
Navigation expanded and collapsed
```

Acceptance:

```text
More Glass Shift Ledger direction is visible.
No table columns changed.
No visible form fields disappeared.
Dense tables are readable.
Charts are restrained.
No generic SaaS dashboard feel.
```

- [ ] **Step 4: Phone visual QA**

Check at iPhone/Android-sized viewport:

```text
Dashboard
OrderTable mobile cards
Drivers mobile view
One form/dialog flow
Mobile drawer open and closed
Top bar controls
```

Acceptance:

```text
Phone view feels native, not like squeezed desktop.
Touch targets are comfortable.
Glass opacity is strong enough for text readability.
All existing mobile fields and actions remain visible.
Safe-area padding prevents edge crowding.
```

- [ ] **Step 5: Fix only visual regressions**

If QA finds issues, modify only visual classes/tokens in already-touched files. Do not change logic, columns, fields, routes, or data.

- [ ] **Step 6: Final verification**

Run:

```powershell
npm run typecheck
npm run build
git status --short
```

Expected: typecheck and build pass; git status shows only intended visual files changed.

- [ ] **Step 7: Final commit**

Run:

```powershell
git add src/index.css tailwind.config.js src/App.tsx src/components src/pages
git commit -m "style: complete glass UI redesign"
```

---

## Plan Self-Review

Spec coverage:

- More Glass Shift Ledger direction: covered by Tasks 2-6.
- Visual-only boundary: covered by Tasks 1, 6, 7, and 8.
- No table column changes: explicitly guarded in Tasks 1, 6, and 8.
- Native phone adaptation: covered by Task 7 and phone QA in Task 8.
- Dense readability: covered by table primitive, mobile card, and QA tasks.
- Verification: covered after each implementation task and in Task 8.

Placeholder scan:

- No `TODO`, `TBD`, or "implement later" placeholders are used.
- Steps that modify code provide exact files, class strings, or rules.

Type consistency:

- Existing exported component APIs are preserved.
- Existing variants and routes are preserved.
- Commands match scripts in `package.json`: `typecheck`, `build`, and `dev`.
