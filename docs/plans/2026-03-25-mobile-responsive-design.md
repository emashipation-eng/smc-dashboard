# Mobile Responsive Design

**Date:** 2026-03-25
**Status:** Approved

## Problem

The dashboard renders correctly on desktop but is unusable on mobile. The root cause is `DashboardShell` which renders a fixed `w-56` sidebar alongside `<main>`, squashing content on small screens. No responsive breakpoints exist for navigation or page grids.

## Approved Design

### 1. DashboardShell + Sidebar — Hamburger Drawer

- Add `sidebarOpen: boolean` state to `DashboardShell`
- Pass `onOpen` callback to `Header`, pass `isOpen/onClose` to `Sidebar`
- On `md+`: sidebar always visible, no change from current behaviour
- On `< md`: sidebar hidden (`-translate-x-full`), slides in from left when hamburger tapped
- Semi-transparent backdrop rendered behind open drawer; tap closes it

### 2. Header — Hamburger Button

- Add `☰` icon button on the left, visible only on `< md` (`md:hidden`)
- Date string hidden on `< sm` (`sm:hidden`) to prevent overflow
- Title truncates with `truncate` if long

### 3. Page Grids — All 5 Pages

| File | Change |
|---|---|
| `FinancialDashboard.tsx` | Chart row `grid-cols-1 lg:grid-cols-2`; table `overflow-x-auto` |
| `OperationsDashboard.tsx` | Funnel + tables stack to `grid-cols-1`; tables `overflow-x-auto` |
| `InventoryDashboard.tsx` | Alert cards `grid-cols-1 sm:grid-cols-2`; table `overflow-x-auto` |
| `SalesDashboard.tsx` | Pipeline + followup stack to `grid-cols-1`; tables `overflow-x-auto` |
| `SettingsPage.tsx` | Import cards `grid-cols-1 md:grid-cols-2` |

### 4. Tables — Universal Scroll Wrapper

All `<table>` elements wrapped in `<div className="overflow-x-auto">` so columns don't break on narrow screens.

### 5. What Does Not Change

- Desktop layout is pixel-identical
- All data, charts, hooks, services untouched
- No new npm dependencies — pure Tailwind responsive prefixes

## Files Affected

```
src/components/layout/DashboardShell.tsx   — drawer state + backdrop
src/components/layout/Sidebar.tsx          — mobile close button + transform
src/components/layout/Header.tsx           — hamburger button
src/pages/FinancialDashboard.tsx           — grid + table fixes
src/pages/OperationsDashboard.tsx          — grid + table fixes
src/pages/InventoryDashboard.tsx           — grid + table fixes
src/pages/SalesDashboard.tsx               — grid + table fixes
src/pages/SettingsPage.tsx                 — import cards grid fix
```
