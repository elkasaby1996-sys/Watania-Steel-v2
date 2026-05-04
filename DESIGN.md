---
name: Watania Steel ERP
description: A calm industrial operations interface for today's steel orders, drivers, inventory, and daily snapshots.
colors:
  industrial-night: "#141c29"
  sidebar-night: "#111722"
  steel-panel: "#1d2635"
  field-panel: "#1f2937"
  muted-panel: "#263140"
  steel-border: "#344256"
  steel-accent: "#303d50"
  watania-maroon: "#7e1b34"
  maroon-ring: "#931f3c"
  slate-secondary: "#2c3849"
  steel-tertiary: "#47566b"
  text-primary: "#d1d9e0"
  text-muted: "#7b899d"
  success-green: "#339958"
  warning-amber: "#e69b19"
  danger-red: "#d22d2d"
  light-background: "#f8fafb"
  light-foreground: "#1b2336"
  light-sidebar: "#eaeff5"
typography:
  display:
    fontFamily: "Poppins, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  headline:
    fontFamily: "Poppins, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
  title:
    fontFamily: "Poppins, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.08em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "10px"
  xl: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.watania-maroon}"
    textColor: "{colors.light-background}"
    rounded: "{rounded.lg}"
    padding: "0 20px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.slate-secondary}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "0 20px"
    height: "40px"
  card:
    backgroundColor: "{colors.steel-panel}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input:
    backgroundColor: "{colors.field-panel}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
    height: "40px"
  badge:
    backgroundColor: "{colors.slate-secondary}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "2px 10px"
---

# Design System: Watania Steel ERP

## 1. Overview

**Creative North Star: "The Shift Ledger"**

The system should feel like a disciplined operations ledger for a steel factory: dark, sturdy, calm, and built for fast daily reading. The current visual language already leans industrial with navy-black surfaces, muted steel borders, maroon brand emphasis, and compact dashboard modules.

This is a product interface, so the design serves daily work. It should put today's orders, delivery progress, driver movement, tonnage, inventory, and exceptions above decorative polish. The interface rejects generic SaaS dashboard styling, overly colorful charts, and template-like metric grids that flatten every operational signal into the same visual weight.

**Key Characteristics:**
- Dark industrial base with a restrained maroon action color.
- Compact app shell with fixed sidebar and top bar.
- Data-first hierarchy using cards, tables, badges, and charts.
- Subtle shadow depth, mostly for separating working surfaces.
- Desktop-first density with simplified mobile order cards.

## 2. Colors

The palette is a restrained industrial night system: blue-gray steel surfaces, maroon brand action, and semantic status colors used sparingly.

### Primary
- **Watania Maroon** (#7e1b34): Primary actions, active navigation marks, brand emphasis, and the rare surface that needs immediate attention.
- **Maroon Ring** (#931f3c): Focus rings and keyboard-visible outlines. It should remain a state marker, not a decorative glow.

### Secondary
- **Slate Secondary** (#2c3849): Secondary buttons, neutral badges, and quiet grouped controls.
- **Steel Tertiary** (#47566b): Supporting operational categories, especially when a third non-alert distinction is needed.

### Tertiary
- **Success Green** (#339958): Completed work, positive status, and confirmed delivery signals.
- **Warning Amber** (#e69b19): Delayed work, pending risk, and metrics that require attention.
- **Danger Red** (#d22d2d): Destructive actions and true error states only.

### Neutral
- **Industrial Night** (#141c29): Main application background.
- **Sidebar Night** (#111722): Persistent navigation background.
- **Steel Panel** (#1d2635): Default card, top bar, popover, and major content surface.
- **Field Panel** (#1f2937): Inputs and recessed controls.
- **Muted Panel** (#263140): Table headers, skeletons, quiet grouped areas, and low-priority fills.
- **Steel Border** (#344256): Default borders and dividers.
- **Text Primary** (#d1d9e0): Main readable text on dark surfaces.
- **Text Muted** (#7b899d): Secondary labels, helper text, and timestamps.

### Named Rules

**The Today-First Color Rule.** Maroon and semantic colors should point to action, state, or exception. Do not spend them on decoration.

**The Chart Restraint Rule.** Charts should reuse the system palette and status colors. Do not create rainbow chart series unless the data genuinely needs many comparable categories.

## 3. Typography

**Display Font:** Poppins with sans-serif fallback  
**Body Font:** Inter with sans-serif fallback  
**Label/Mono Font:** JetBrains Mono for order IDs, numeric columns, and tabular operational values

**Character:** The type system is direct and practical. Poppins gives headings a sturdy operational voice, Inter keeps dense tables readable, and JetBrains Mono improves scanning for IDs, tons, dates, and numeric columns.

### Hierarchy
- **Display** (700, 1.5rem, 1.2): Page titles such as daily orders and primary screen headings.
- **Headline** (700, 1.25rem, 1.3): App shell title and important section headers.
- **Title** (600, 1.125rem, 1.35): Card titles, table section titles, and modal headings.
- **Body** (400, 0.875rem, 1.5): Tables, forms, descriptions, and operational copy. Keep prose blocks under 75 characters per line.
- **Label** (600, 0.75rem, 0.08em): Table headers, compact metadata, badges, and uppercase labels.

### Named Rules

**The Numbers Need Shape Rule.** Use JetBrains Mono and tabular alignment for IDs, tons, dates, phone numbers, counts, and money-like values.

## 4. Elevation

The current system uses a hybrid of tonal layering and subtle shadows. Surfaces are mostly separated by dark panel color and borders; shadows add low ambient depth to cards, hover states, and elevated controls.

### Shadow Vocabulary
- **Card Shadow** (`0 1px 3px rgba(0, 0, 0, 0.25)`): Default card and panel separation on dark backgrounds.
- **Card Hover** (`0 4px 12px rgba(0, 0, 0, 0.3)`): Hover response for cards or interactive surface previews.
- **Industrial Low** (`0 2px 8px rgba(0, 0, 0, 0.3)`): Primary buttons and important controls.
- **Industrial Medium** (`0 4px 12px rgba(0, 0, 0, 0.35)`): Floating controls, menus, and overlays.
- **Industrial High** (`0 8px 24px rgba(0, 0, 0, 0.4)`): Dialogs and high-priority overlays.

### Named Rules

**The Flat Until Useful Rule.** Do not add heavy shadow for decoration. Use elevation to explain surface priority, hover, focus, or overlay depth.

## 5. Components

### Buttons

- **Shape:** Rounded industrial rectangles with 10px corners by default, 8px on small buttons.
- **Primary:** Watania Maroon background, light text, 40px height, 20px horizontal padding, subtle industrial shadow.
- **Hover / Focus:** Primary hover darkens to 90 percent opacity. Focus uses a 2px maroon ring with background offset.
- **Secondary / Ghost / Outline:** Secondary buttons use Slate Secondary with a Steel Border. Ghost buttons stay transparent until hover and are preferred for navigation and icon controls.

### Chips

- **Style:** Badges use 8px radius, 10px horizontal padding, 12px text, and medium weight.
- **State:** Status badges may use success, warning, danger, tertiary, or secondary fills, but every badge must keep clear text labels. Color is never the only status signal.

### Cards / Containers

- **Corner Style:** 10px default radius, 12px for large table containers.
- **Background:** Steel Panel on Industrial Night, with Steel Border for separation.
- **Shadow Strategy:** Card Shadow at rest, Card Hover only when the whole surface is interactive.
- **Border:** Default 1px Steel Border, often softened through opacity on dense tables.
- **Internal Padding:** 24px for dashboard cards and section panels, 16px for compact mobile cards.

### Inputs / Fields

- **Style:** 40px height, 10px radius, Field Panel background, Steel Border stroke, 12px horizontal padding.
- **Focus:** Maroon Ring with 2px outline and background-colored offset.
- **Error / Disabled:** Disabled fields drop to 50 percent opacity. Error states should use Danger Red plus explicit helper text.

### Navigation

The app shell uses a fixed Sidebar Night sidebar and Steel Panel top bar. Sidebar items are 44px tall with 12px to 16px horizontal padding, 20px icons, and ghost-button behavior. Active items use Sidebar Active, brighter text, and a maroon leading indicator. Mobile navigation becomes a 288px drawer with a dim overlay.

### Tables

Tables are the core operational surface. Use sticky muted headers, 11px uppercase labels with 0.08em tracking, 16px horizontal cell padding, 12px vertical cell padding, alternating low-opacity muted rows, and a subtle accent hover state. Numeric columns should be right aligned and mono.

## 6. Do's and Don'ts

### Do:

- **Do** lead with today's operational snapshot before historical analysis.
- **Do** use Watania Maroon for primary actions, active navigation, and meaningful emphasis.
- **Do** keep charts restrained, using the palette above instead of overly colorful chart sets.
- **Do** preserve desktop density while keeping mobile cards readable and touch-friendly.
- **Do** support Arabic, English, and Hindi copy length variation when designing labels and responsive layouts.
- **Do** pair status color with text labels and icons where useful.

### Don't:

- **Don't** make the product look like a generic SaaS dashboard.
- **Don't** use overly colorful charts that compete with daily operations.
- **Don't** repeat identical metric-card grids endlessly without changing hierarchy or density.
- **Don't** use marketing-style hero layouts inside the operational app.
- **Don't** use decorative gradient text, default glassmorphism, or colored side-stripe borders.
- **Don't** rely on color alone for delayed, completed, pending, or delivered states.
