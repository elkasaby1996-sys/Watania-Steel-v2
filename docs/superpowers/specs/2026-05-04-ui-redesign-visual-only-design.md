# UI Redesign Visual-Only Design

## Goal

Redesign the Watania Steel ERP interface app-wide with a modern, premium glassmorphic version of the approved **Shift Ledger** direction.

The redesign is strictly visual. It must preserve the existing app structure, routes, workflows, table columns, form fields, filtering behavior, store logic, Supabase interactions, permissions, and data flow.

## Approved Direction

**Shift Ledger Glass, More Glass**

The app should feel like a premium industrial operations console: dark, calm, precise, translucent, and modern. The design should use frosted surfaces, subtle highlights, glass-like borders, stronger depth, and polished hover/focus states while keeping dense operational data readable.

This direction intentionally keeps the current Watania industrial identity:

- Dark navy operating environment
- Maroon as the action and active-state color
- Steel blue-gray supporting surfaces
- Status colors used only for operational state
- Dense desktop layouts with practical mobile cards

## Non-Negotiable Scope Boundaries

Do not change:

- Table columns or column order
- Form fields, labels, validation, or submission logic
- Routes, navigation destinations, permissions, or role behavior
- Store logic, Supabase calls, data mapping, or calculations
- Search, filters, sorting, dialogs, modals, or actions
- Chart data, metric definitions, or business semantics

Allowed changes:

- Colors and CSS variables
- Surface styling, translucency, borders, shadows, and backdrop blur
- Spacing and visual rhythm where it does not alter information structure
- Typography tuning and numeric readability
- Button, badge, input, card, table, sidebar, top bar, dialog, toast, and skeleton styling
- Chart colors and chart container styling only
- Responsive visual presentation, without removing data or changing available actions
- Phone-native visual adaptation, without changing workflows or available data

## Visual System

### Scene

Watania Steel staff use this system on desktop computers during active daily operations, with some users checking status from iPhone and Android phones. The UI should be comfortable for a full workday: modern enough to feel premium, restrained enough to keep attention on today's work.

### Palette

Use a dark industrial base with stronger glass layers:

- Background: deep navy-black with subtle radial accents and a faint grid/steel texture treatment.
- Sidebar: frosted dark surface with stronger blur and glass border.
- Top bar: translucent panel with blur, border, and soft internal highlight.
- Cards: semi-transparent steel panels with inner highlight and soft shadow.
- Tables: slightly more opaque than cards for legibility.
- Maroon: primary action, active navigation, focus emphasis, and rare operational priority.
- Semantic colors: success, warning, destructive, and tertiary status only.

Avoid generic SaaS colors and overly colorful charts. Charts should use maroon, steel, amber, green, and muted variants from the system.

### Glass Rule

Use glassmorphism as an app-wide material system, not decoration.

Glass should appear on:

- Sidebar
- Top bar
- Dashboard cards
- Page panels
- Tables and table containers
- Dialogs and popovers
- Toasts and dropdown menus
- Mobile drawer and mobile cards

Glass should be controlled on dense content:

- Table headers can be frosted.
- Table rows should remain readable with stronger background opacity.
- Inputs should have clear contrast and visible borders.
- Long forms should prioritize legibility over transparency.

### Typography

Keep the existing type families:

- Poppins for page and section headings
- Inter for UI, body, buttons, forms, and tables
- JetBrains Mono for order IDs, numeric columns, dates, phone numbers, tons, and operational identifiers

Tune hierarchy for polish:

- Page titles should feel confident but not oversized.
- Card values should be crisp and readable.
- Table headers should remain compact, uppercase, and scannable.
- Letter spacing must stay at `0` except for small uppercase labels and table headers.

### Layout

Preserve existing layout structure:

- Fixed sidebar
- Fixed top bar
- Main content area
- Existing page components and route structure
- Existing dashboard card count and table placement

Improve visual rhythm:

- Use slightly larger gaps around major panels.
- Use consistent glass radius across app shell surfaces.
- Keep card padding comfortable but not loose.
- Keep desktop information density.
- Keep mobile cards touch-friendly without hiding actions.

## Component Treatment

### App Shell

Sidebar becomes a frosted glass rail/panel with:

- Translucent dark fill
- 1px light-tinted border
- Internal top highlight
- Soft shadow
- Stronger active navigation state
- Maroon active indicator

Top bar becomes a frosted glass command surface with:

- Translucent steel fill
- Blur and saturation
- Bottom border
- Rounded treatment where layout allows
- Clear icon button states

### Cards

Cards become glass panels:

- Semi-transparent steel background
- Tinted border
- Inner highlight
- Soft shadow
- Slight hover elevation only when the card is interactive

Metric cards should not become generic SaaS stat cards. They must show hierarchy through label, value, compact supporting signal, and restrained color.

### Tables

Tables remain the core operational surface.

Treatment:

- Glass container with stronger opacity than cards
- Sticky header with muted frosted background
- Row dividers with low-opacity borders
- Alternating rows as subtle tonal changes
- Hover rows with restrained accent fill
- Numeric columns using mono alignment

No table columns may be added, removed, reordered, renamed, or hidden as part of this redesign.

### Buttons

Buttons keep existing variants and behavior.

Treatment:

- Primary: maroon glass-gradient feel, strong text contrast, soft maroon shadow
- Secondary: translucent steel panel with border
- Outline: glass border, transparent fill, clear hover
- Ghost: transparent at rest, frosted on hover
- Icon: stable square sizing with tooltip/title preserved where present

### Inputs And Forms

Inputs should look modern but remain highly readable:

- Translucent dark field fill
- Clear border
- Strong focus ring
- Visible placeholder contrast
- Disabled state remains obvious
- Error state pairs color with text

Do not change form layout or field semantics in this visual pass.

### Badges And Status

Badges should look like compact glass chips:

- Rounded pill or compact rounded rectangle
- Status color with border/tint
- Clear text label
- No color-only meaning

### Dialogs, Dropdowns, Toasts

Use elevated glass:

- Stronger blur than cards
- Higher opacity than background glass
- Clear border and shadow
- Readable text contrast
- Existing Radix behavior unchanged

### Charts

Chart containers receive the same glass panel treatment.

Chart colors should be restrained:

- Maroon for primary/action series
- Amber for warning or total emphasis
- Green for success/completed
- Steel blue-gray for neutral comparisons

Do not change data transformations or metric definitions.

## Responsive Behavior

Desktop remains the primary experience.

Mobile should feel native on iPhone and Android, not like a compressed desktop viewport. It should:

- Preserve all existing actions
- Keep table-to-card transformations where already present
- Use glass mobile cards with stronger opacity for text
- Keep touch targets comfortable
- Avoid hiding business-critical fields
- Use phone-appropriate spacing, sticky app-shell behavior, safe-area padding, and bottom-reachable actions where existing actions are already present
- Make mobile dialogs, drawers, dropdowns, and forms feel app-like, with readable full-width surfaces and stable scrolling
- Preserve the same data fields and actions when converting dense desktop areas into mobile cards

No new mobile workflow should be invented in this pass.

## Implementation Targets

Likely files to update:

- `src/index.css`
- `tailwind.config.js`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/table.tsx`
- `src/components/Sidebar.tsx`
- `src/components/TopBar.tsx`
- Dashboard and chart container components where visual classes are local
- Dialog, dropdown, toast, skeleton, and alert primitives if needed for consistency

Avoid broad logic edits. If a component needs class changes, keep prop APIs unchanged.

## Verification

Run:

- `npm run typecheck`
- `npm run build`

Visual checks:

- Dashboard desktop
- Dashboard mobile width
- One dense table screen
- One dialog/form screen
- Navigation open/collapsed/mobile drawer
- Phone viewport checks for Dashboard, one dense list/table screen, and one form/dialog flow
- Light/dark toggle behavior if retained

Acceptance criteria:

- App-wide visual language feels like approved More Glass Shift Ledger direction.
- Existing app behavior is unchanged.
- Existing table columns are unchanged.
- Dense data remains readable.
- Phone view feels native on iPhone and Android rather than like a squeezed desktop layout.
- No generic SaaS look.
- No overly colorful chart treatment.
- No decorative glass that harms table or form legibility.

## Open Decisions

Proceed with the approved **More Glass** direction. If implementation reveals a specific table or form becomes less readable, reduce glass opacity only for that dense component while preserving the overall glassmorphic system.
