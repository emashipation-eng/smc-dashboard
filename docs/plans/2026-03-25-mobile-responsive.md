# Mobile Responsive Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the SMC dashboard fully usable on mobile by adding a hamburger drawer for navigation and tightening spacing on small screens.

**Architecture:** The sidebar becomes a slide-in drawer on mobile (hidden by default, toggled via a ☰ button in the header). `DashboardShell` owns the open/close state and passes callbacks down. Desktop layout is untouched. All tables already have `overflow-x-auto`; most page grids already stack correctly — only padding needs tightening.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v3 (responsive prefixes only — no new packages)

---

### Task 1: DashboardShell — hamburger drawer state + backdrop

**Files:**
- Modify: `src/components/layout/DashboardShell.tsx`

**Step 1: Replace the file contents**

```tsx
import { useState } from 'react'
import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

interface Props { children: ReactNode }

export default function DashboardShell({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <main className="flex-1 overflow-auto min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        {children}
      </main>
    </div>
  )
}
```

> Note: `Header` is now rendered inside `DashboardShell` so it can receive `onMenuClick`. Each page currently renders `<Header title="..." />` directly — we'll remove those in Task 3.

**Step 2: Verify TypeScript compiles**

```bash
cd /Users/ashish/claude/smc/smc-dashboard
npx tsc --noEmit 2>&1 | head -20
```

Expected: errors about Sidebar/Header prop mismatches (we fix those next — that's OK for now)

**Step 3: Commit**

```bash
git add src/components/layout/DashboardShell.tsx
git commit -m "feat(mobile): add hamburger drawer state and backdrop to DashboardShell"
```

---

### Task 2: Sidebar — accept mobile props, slide-in transform

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**Step 1: Replace the file contents**

```tsx
import { NavLink } from 'react-router-dom'
import { REFRESH_INTERVAL_MS } from '../../utils/constants'

const REFRESH_LABEL = `Auto-refresh: ${REFRESH_INTERVAL_MS / 60000} min`

const NAV = [
  { to: '/financial',  label: 'Financial',   icon: '₹' },
  { to: '/operations', label: 'Operations',  icon: '⚙' },
  { to: '/inventory',  label: 'Inventory',   icon: '📦' },
  { to: '/sales',      label: 'Sales & CRM', icon: '📋' },
  { to: '/settings',   label: 'Settings',    icon: '⚙' },
]

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: Props) {
  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-30 w-56 bg-brand flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:flex md:min-h-screen
      `}
    >
      {/* Header row with close button on mobile */}
      <div className="px-4 py-5 border-b border-brand-light flex items-center justify-between">
        <div>
          <p className="text-white font-bold text-lg leading-tight">Sai Metal Crafts</p>
          <p className="text-blue-300 text-xs mt-0.5">ERP Dashboard</p>
        </div>
        <button
          onClick={onClose}
          className="md:hidden text-blue-200 hover:text-white p-1"
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-light text-white'
                  : 'text-blue-200 hover:bg-brand-light hover:text-white'
              }`
            }
          >
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-brand-light">
        <p className="text-blue-300 text-xs">{REFRESH_LABEL}</p>
      </div>
    </aside>
  )
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: only Header prop errors remain

**Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(mobile): sidebar becomes slide-in drawer on mobile"
```

---

### Task 3: Header — add hamburger button + remove title prop

**Files:**
- Modify: `src/components/layout/Header.tsx`

**Step 1: Replace Header to accept `onMenuClick` and drop `title` prop**

The title will be removed — on mobile the header is too narrow for a long title + date + badge + hamburger. Each page already knows its own title; we'll rely on the browser tab title or a future breadcrumb. For now, show "SMC Dashboard" or nothing.

```tsx
import { getOverallDataSource } from '../../services/googleSheets'
import { getImportedSheetKeys } from '../../services/importStore'

interface HeaderProps {
  onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const now = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  })

  const source = getOverallDataSource()
  const importedCount = getImportedSheetKeys().length

  const badge = source === 'imported'
    ? { label: `${importedCount} sheet${importedCount !== 1 ? 's' : ''} imported`, color: 'bg-green-100 text-green-700' }
    : source === 'live'
    ? { label: 'Live', color: 'bg-green-100 text-green-700' }
    : { label: 'Mock data', color: 'bg-gray-100 text-gray-500' }

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-1 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Spacer on desktop where hamburger is hidden */}
      <div className="hidden md:block" />

      <div className="flex items-center gap-3 ml-auto">
        <span className="hidden sm:block text-sm text-gray-500">{now}</span>
        <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${badge.color}`}>
          {badge.label}
        </span>
      </div>
    </header>
  )
}
```

**Step 2: Remove `title` prop from all page `<Header />` usages**

Run this to find them:
```bash
grep -rn "<Header title=" src/pages/
```

For each file found, change `<Header title="..." />` → `<Header />`.

Files to update:
- `src/pages/FinancialDashboard.tsx`
- `src/pages/OperationsDashboard.tsx`
- `src/pages/InventoryDashboard.tsx`
- `src/pages/SalesDashboard.tsx`
- `src/pages/SettingsPage.tsx`

**Step 3: Verify TypeScript compiles clean**

```bash
npx tsc --noEmit 2>&1
```

Expected: 0 errors

**Step 4: Commit**

```bash
git add src/components/layout/Header.tsx src/pages/
git commit -m "feat(mobile): add hamburger button to header, remove title prop"
```

---

### Task 4: Page padding — tighten on mobile

**Files:**
- Modify: `src/pages/FinancialDashboard.tsx`
- Modify: `src/pages/OperationsDashboard.tsx`
- Modify: `src/pages/InventoryDashboard.tsx`
- Modify: `src/pages/SalesDashboard.tsx`
- Modify: `src/pages/SettingsPage.tsx`

**Step 1: In each page, change outer padding div**

Find: `className="p-6 space-y-6"`
Replace with: `className="p-3 sm:p-6 space-y-4 sm:space-y-6"`

Also find any standalone `p-6` on wrapper divs in loading/error states and change to `p-3 sm:p-6`.

**Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -10
```

Expected: `✓ built in ...`

**Step 3: Commit**

```bash
git add src/pages/
git commit -m "feat(mobile): tighten page padding on small screens"
```

---

### Task 5: Deploy to Vercel + push to GitHub

**Step 1: Deploy**

```bash
cd /Users/ashish/claude/smc/smc-dashboard
vercel deploy --prod --yes 2>&1
```

Expected: `Aliased: https://smc-dashboard-three.vercel.app`

**Step 2: Push to GitHub**

```bash
git push origin main
```

**Step 3: Verify**

Open the Vercel URL on a mobile browser and confirm:
- ☰ button visible in header
- Tapping ☰ opens the sidebar drawer from the left
- Tapping a nav link closes the drawer and navigates
- Tapping the backdrop closes the drawer
- All pages have proper spacing and readable text

---

## Summary of Changes

| File | What changes |
|---|---|
| `DashboardShell.tsx` | Adds `sidebarOpen` state, backdrop, passes props to Sidebar/Header |
| `Sidebar.tsx` | Slide-in transform, accepts `isOpen/onClose`, close button on mobile |
| `Header.tsx` | Hamburger button (mobile only), drops `title` prop |
| `pages/*.tsx` (5 files) | Remove `title` from `<Header />`, tighten padding |

**No new dependencies. No logic changes. Desktop layout identical.**
