# Responsive App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce persistent navigation between the app's protected routes — a fixed sidebar on desktop (≥1024px) and a hamburger-triggered drawer on mobile (<1024px) — plus a vehicle-switcher link in the topbar, replacing the app-wide `max-w-md` cap that today makes every screen look like a narrow phone column even on desktop.

**Architecture:** Six new presentational components under `src/components/layout/` (`NavLinks`, `Sidebar`, `Topbar`, `MobileDrawer`, `VehicleSwitcherLink`, `AppLayout`) compose into a layout-route (`AppLayout`) that wraps every route currently nested under `<ProtectedRoute />` in `src/App.tsx`. Desktop/mobile switching is pure Tailwind (`hidden lg:flex` / `lg:hidden`) — no JS viewport detection. `Screen.tsx` gets a new `wide` prop (`max-w-3xl` instead of `max-w-md`) applied to the authenticated screens only; `Login`/`Register` keep today's behavior untouched. Per `docs/superpowers/specs/2026-07-26-home-screen-redesign-design.md`, `Home.tsx`'s content (dashboard cards, action buttons) is owned by a separate, actively-developed plan — this plan only touches its `<Screen>` wrapper, in its own late task, re-reading the file fresh before editing.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, react-router-dom v7.6. No test runner is configured in this project (no Jest/Vitest in `package.json`) — verification is TypeScript type-checking (`npx tsc -b --noEmit`) plus manual browser testing in the final task.

**Reference spec:** `docs/superpowers/specs/2026-07-26-responsive-app-shell-design.md`

**Working directory for all steps below:** `/home/rocha/Projetos/flowfuel-frontend`

## Global Constraints

- Breakpoint is 1024px (Tailwind's `lg`), fixed and global — not configurable per section.
- No new dependencies (no icon library) — icons are emoji, matching the existing convention in `src/routes/Home.tsx`.
- No JavaScript viewport/breakpoint detection (`matchMedia`, `resize` listeners) — desktop vs. mobile is resolved entirely by Tailwind responsive classes.
- `ProtectedRoute.tsx` keeps its current sole responsibility (auth/active-vehicle redirect) — this plan never modifies it.
- Nav items are exactly 3: Dashboard (`/`), Abastecimentos (`/refuels`), Eventos (`/vehicle-events`) — no Postos/Perfil, no FAB.
- Vehicle switcher is a plain link to the existing `/select-vehicle` route — no new dropdown component, no new vehicle-list fetch.
- `Home.tsx` content itself is out of scope (owned by `docs/superpowers/plans/2026-07-26-home-screen-redesign.md`) — only its `<Screen>` wrapper prop is touched, and only after confirming the file's current state.

---

## File Structure

```
Create: src/components/layout/NavLinks.tsx
Create: src/components/layout/Sidebar.tsx
Create: src/components/layout/VehicleSwitcherLink.tsx
Create: src/components/layout/Topbar.tsx
Create: src/components/layout/MobileDrawer.tsx
Create: src/components/layout/AppLayout.tsx
Modify: src/components/ui/Screen.tsx
Modify: src/App.tsx
Modify: src/routes/Refuels.tsx
Modify: src/routes/RefuelForm.tsx
Modify: src/routes/VehicleEvents.tsx
Modify: src/routes/VehicleEventForm.tsx
Modify: src/routes/SelectVehicle.tsx
Modify: src/routes/VehicleNew.tsx
Modify: src/routes/Home.tsx
```

---

### Task 1: Verify the type-check command works

**Files:** none (setup verification only).

- [ ] **Step 1: Confirm the type-check command**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b --noEmit`
Expected: no output, clean exit (code 0) — confirms the exact command used for every subsequent task's type-check step. If `npx tsc` fails with a permission/PATH error in this environment, use `node node_modules/typescript/bin/tsc -b --noEmit` instead for all remaining tasks.

---

### Task 2: Create `NavLinks` — shared nav-item list

**Files:**
- Create: `src/components/layout/NavLinks.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `NavLinks({ onNavigate?: () => void })` — a `<nav>` of 3 links with active-state highlighting. `onNavigate` fires on every link click (used by `MobileDrawer`, Task 6, to close itself). Consumed by `Sidebar` (Task 3) and `MobileDrawer` (Task 6).

- [ ] **Step 1: Create the component**

```tsx
// src/components/layout/NavLinks.tsx
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/refuels', label: 'Abastecimentos', icon: '⛽', end: false },
  { to: '/vehicle-events', label: 'Eventos', icon: '🔧', end: false },
]

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:bg-green-50'
            }`
          }
        >
          <span className="text-base">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no output, clean exit.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/NavLinks.tsx
git commit -m "feat: add NavLinks shared nav-item list"
```

---

### Task 3: Create `Sidebar` — desktop fixed nav

**Files:**
- Create: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `NavLinks` (Task 2), no props.
- Produces: `Sidebar()` — a fixed-position column, visible only ≥1024px. Consumed by `AppLayout` (Task 7).

- [ ] **Step 1: Create the component**

```tsx
// src/components/layout/Sidebar.tsx
import { NavLinks } from './NavLinks'

export function Sidebar() {
  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white lg:p-4">
      <p className="mb-6 px-3 text-lg font-bold text-green-700">⛽ FlowFuel</p>
      <NavLinks />
    </aside>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no output, clean exit.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: add Sidebar desktop nav"
```

---

### Task 4: Create `VehicleSwitcherLink`

**Files:**
- Create: `src/components/layout/VehicleSwitcherLink.tsx`

**Interfaces:**
- Consumes: `useVehicle()` from `src/context/VehicleContext.tsx` (existing — `activeVehicle: { brand: string; model: string } | null`).
- Produces: `VehicleSwitcherLink()` — link to `/select-vehicle` showing the active vehicle name, or just the app name when there's no active vehicle yet (onboarding). Consumed by `Topbar` (Task 5).

- [ ] **Step 1: Create the component**

```tsx
// src/components/layout/VehicleSwitcherLink.tsx
import { Link } from 'react-router-dom'
import { useVehicle } from '../../context/VehicleContext'

export function VehicleSwitcherLink() {
  const { activeVehicle } = useVehicle()

  if (!activeVehicle) {
    return <span className="text-sm font-bold text-green-700">⛽ FlowFuel</span>
  }

  return (
    <Link
      to="/select-vehicle"
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-gray-700 hover:bg-green-50"
    >
      {activeVehicle.brand} {activeVehicle.model}
      <span aria-hidden="true">▾</span>
    </Link>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no output, clean exit.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/VehicleSwitcherLink.tsx
git commit -m "feat: add VehicleSwitcherLink"
```

---

### Task 5: Create `Topbar`

**Files:**
- Create: `src/components/layout/Topbar.tsx`

**Interfaces:**
- Consumes: `VehicleSwitcherLink` (Task 4). Props: `{ onOpenDrawer: () => void }`.
- Produces: `Topbar({ onOpenDrawer })` — sticky header with a hamburger button (mobile only) and the vehicle switcher. Consumed by `AppLayout` (Task 7).

- [ ] **Step 1: Create the component**

```tsx
// src/components/layout/Topbar.tsx
import { VehicleSwitcherLink } from './VehicleSwitcherLink'

export function Topbar({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:px-6">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Abrir menu"
        className="-ml-2 flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-700 hover:bg-green-50 lg:hidden"
      >
        ☰
      </button>
      <div className="ml-auto">
        <VehicleSwitcherLink />
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no output, clean exit.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Topbar.tsx
git commit -m "feat: add Topbar with hamburger and vehicle switcher"
```

---

### Task 6: Create `MobileDrawer`

**Files:**
- Create: `src/components/layout/MobileDrawer.tsx`

**Interfaces:**
- Consumes: `NavLinks` (Task 2). Props: `{ open: boolean; onClose: () => void }`.
- Produces: `MobileDrawer({ open, onClose })` — off-canvas panel with backdrop, closes on backdrop click, Esc, or route change. Consumed by `AppLayout` (Task 7).

- [ ] **Step 1: Create the component**

```tsx
// src/components/layout/MobileDrawer.tsx
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { NavLinks } from './NavLinks'

export function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const location = useLocation()

  useEffect(() => {
    onClose()
  }, [location.pathname])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-20 lg:hidden">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white p-4 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-lg font-bold text-green-700">⛽ FlowFuel</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-700 hover:bg-green-50"
          >
            ✕
          </button>
        </div>
        <NavLinks onNavigate={onClose} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no output, clean exit. (The `onClose` dependency on the second `useEffect` is stable enough in practice since `AppLayout`, Task 7, will pass a `useState` setter directly — no `useCallback` needed.)

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/MobileDrawer.tsx
git commit -m "feat: add MobileDrawer off-canvas nav"
```

---

### Task 7: Create `AppLayout` — composes the shell

**Files:**
- Create: `src/components/layout/AppLayout.tsx`

**Interfaces:**
- Consumes: `Sidebar` (Task 3), `Topbar` (Task 5), `MobileDrawer` (Task 6), `Outlet` from `react-router-dom`.
- Produces: `AppLayout()` — the layout-route component. Consumed by `src/App.tsx` (Task 9).

- [ ] **Step 1: Create the component**

```tsx
// src/components/layout/AppLayout.tsx
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileDrawer } from './MobileDrawer'

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-screen bg-green-50">
      <Sidebar />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="lg:pl-60">
        <Topbar onOpenDrawer={() => setDrawerOpen(true)} />
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no output, clean exit.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppLayout.tsx
git commit -m "feat: add AppLayout composing sidebar, topbar and drawer"
```

---

### Task 8: Add `wide` prop to `Screen`

**Files:**
- Modify: `src/components/ui/Screen.tsx`

**Interfaces:**
- Produces: `Screen`'s prop type gains `wide?: boolean` (default `false`). When `true` and `centered` is `false`, the inner wrapper uses `max-w-3xl` instead of `max-w-md`. No change to the `centered` branch (it has no max-width wrapper today). Consumed by Task 10 and Task 11.

- [ ] **Step 1: Read the current file**

Current content of `src/components/ui/Screen.tsx`:

```tsx
import type { ReactNode } from 'react'

const safeAreaPadding = {
  paddingLeft: 'max(1.25rem, env(safe-area-inset-left))',
  paddingRight: 'max(1.25rem, env(safe-area-inset-right))',
  paddingTop: '1.25rem',
  paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
}

export function Screen({
  children,
  centered = false,
  className = '',
}: {
  children: ReactNode
  centered?: boolean
  className?: string
}) {
  if (centered) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center bg-green-50 ${className}`}
        style={safeAreaPadding}
      >
        {children}
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-green-50 ${className}`} style={safeAreaPadding}>
      <div className="mx-auto max-w-md">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Add the `wide` prop**

Replace the whole file with:

```tsx
import type { ReactNode } from 'react'

const safeAreaPadding = {
  paddingLeft: 'max(1.25rem, env(safe-area-inset-left))',
  paddingRight: 'max(1.25rem, env(safe-area-inset-right))',
  paddingTop: '1.25rem',
  paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
}

export function Screen({
  children,
  centered = false,
  wide = false,
  className = '',
}: {
  children: ReactNode
  centered?: boolean
  wide?: boolean
  className?: string
}) {
  if (centered) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center bg-green-50 ${className}`}
        style={safeAreaPadding}
      >
        {children}
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-green-50 ${className}`} style={safeAreaPadding}>
      <div className={`mx-auto ${wide ? 'max-w-3xl' : 'max-w-md'}`}>{children}</div>
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no output, clean exit. (No existing call site passes `wide`, so this is purely additive — every current screen keeps rendering at `max-w-md`.)

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Screen.tsx
git commit -m "feat: add wide prop to Screen for desktop app-shell screens"
```

---

### Task 9: Wire `AppLayout` into `src/App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `AppLayout` (Task 7).

- [ ] **Step 1: Read the current file**

Current content of `src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { VehicleProvider } from './context/VehicleContext'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { Login } from './routes/Login'
import { Register } from './routes/Register'
import { SelectVehicle } from './routes/SelectVehicle'
import { VehicleNew } from './routes/VehicleNew'
import { Home } from './routes/Home'
import { Refuels } from './routes/Refuels'
import { RefuelForm } from './routes/RefuelForm'
import { VehicleEvents } from './routes/VehicleEvents'
import { VehicleEventForm } from './routes/VehicleEventForm'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <VehicleProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/select-vehicle" element={<SelectVehicle />} />
              <Route path="/vehicles/new" element={<VehicleNew />} />
              <Route path="/" element={<Home />} />
              <Route path="/refuels" element={<Refuels />} />
              <Route path="/refuels/new" element={<RefuelForm />} />
              <Route path="/refuels/:id/edit" element={<RefuelForm />} />
              <Route path="/vehicle-events" element={<VehicleEvents />} />
              <Route path="/vehicle-events/new" element={<VehicleEventForm />} />
              <Route path="/vehicle-events/:id/edit" element={<VehicleEventForm />} />
            </Route>
          </Routes>
        </VehicleProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

**Note:** if this file no longer matches the block above (another in-progress plan — `docs/superpowers/plans/2026-07-26-home-screen-redesign.md` — may have touched it in the meantime), stop and re-read the live file before editing; apply the same change (nest a new `<Route element={<AppLayout />}>` around the existing protected routes) against whatever the current content actually is, instead of blindly pasting Step 2 below.

- [ ] **Step 2: Nest `AppLayout` around the protected routes**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { VehicleProvider } from './context/VehicleContext'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { Login } from './routes/Login'
import { Register } from './routes/Register'
import { SelectVehicle } from './routes/SelectVehicle'
import { VehicleNew } from './routes/VehicleNew'
import { Home } from './routes/Home'
import { Refuels } from './routes/Refuels'
import { RefuelForm } from './routes/RefuelForm'
import { VehicleEvents } from './routes/VehicleEvents'
import { VehicleEventForm } from './routes/VehicleEventForm'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <VehicleProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/select-vehicle" element={<SelectVehicle />} />
                <Route path="/vehicles/new" element={<VehicleNew />} />
                <Route path="/" element={<Home />} />
                <Route path="/refuels" element={<Refuels />} />
                <Route path="/refuels/new" element={<RefuelForm />} />
                <Route path="/refuels/:id/edit" element={<RefuelForm />} />
                <Route path="/vehicle-events" element={<VehicleEvents />} />
                <Route path="/vehicle-events/new" element={<VehicleEventForm />} />
                <Route path="/vehicle-events/:id/edit" element={<VehicleEventForm />} />
              </Route>
            </Route>
          </Routes>
        </VehicleProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no output, clean exit.

- [ ] **Step 4: Manual smoke check**

Run: `npm run dev`, open the app in a browser, log in. Confirm the sidebar (desktop width) or hamburger button (narrow window) now appears around `Home`, and that navigating to `/refuels` and `/vehicle-events` still renders their existing content (unstyled by this plan, just wrapped).

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire AppLayout into protected routes"
```

---

### Task 10: Apply `wide` to the six non-Home authenticated screens

**Files:**
- Modify: `src/routes/Refuels.tsx:56`
- Modify: `src/routes/RefuelForm.tsx:148`
- Modify: `src/routes/VehicleEvents.tsx:63`
- Modify: `src/routes/VehicleEventForm.tsx:116`
- Modify: `src/routes/SelectVehicle.tsx:74`
- Modify: `src/routes/VehicleNew.tsx:80`

**Interfaces:**
- Consumes: `Screen`'s `wide` prop (Task 8).

Each of the six files below has exactly one **non-centered** `<Screen>` usage (their `<Screen centered>` loading/error states are untouched — `centered` ignores `wide` entirely, see Task 8). In each file, change that one line from `<Screen>` to `<Screen wide>`.

- [ ] **Step 1: `src/routes/Refuels.tsx`**

Change line 56 from `<Screen>` to `<Screen wide>`.

- [ ] **Step 2: `src/routes/RefuelForm.tsx`**

Change line 148 from `<Screen>` to `<Screen wide>`.

- [ ] **Step 3: `src/routes/VehicleEvents.tsx`**

Change line 63 from `<Screen>` to `<Screen wide>`.

- [ ] **Step 4: `src/routes/VehicleEventForm.tsx`**

Change line 116 from `<Screen>` to `<Screen wide>`.

- [ ] **Step 5: `src/routes/SelectVehicle.tsx`**

Change line 74 from `<Screen>` to `<Screen wide>`.

- [ ] **Step 6: `src/routes/VehicleNew.tsx`**

Change line 80 from `<Screen>` to `<Screen wide>`.

- [ ] **Step 7: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no output, clean exit.

- [ ] **Step 8: Commit**

```bash
git add src/routes/Refuels.tsx src/routes/RefuelForm.tsx src/routes/VehicleEvents.tsx src/routes/VehicleEventForm.tsx src/routes/SelectVehicle.tsx src/routes/VehicleNew.tsx
git commit -m "feat: widen non-Home authenticated screens inside the app shell"
```

---

### Task 11: Apply `wide` to `Home.tsx`

**Files:**
- Modify: `src/routes/Home.tsx`

**Interfaces:**
- Consumes: `Screen`'s `wide` prop (Task 8).

`Home.tsx` is being actively rewritten by a separate, concurrently-developed plan (`docs/superpowers/plans/2026-07-26-home-screen-redesign.md`) — its exact content and line numbers are expected to differ from what this plan saw during design. This task must not assume stale line numbers.

- [ ] **Step 1: Re-read the current file**

Run: `cat src/routes/Home.tsx` (or open it in an editor) and locate the single **non-centered** `<Screen>` usage — the one wrapping the actual dashboard content (not the `<Screen centered>` loading/error states, which are unaffected by `wide`, see Task 8).

- [ ] **Step 2: Add `wide`**

Change that one `<Screen>` occurrence to `<Screen wide>`, leaving every other line in the file untouched.

- [ ] **Step 3: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no output, clean exit.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Home.tsx
git commit -m "feat: widen Home screen inside the app shell"
```

---

### Task 12: Manual verification across breakpoints

**Files:** none (verification only).

- [ ] **Step 1: Build check**

Run: `npm run build`
Expected: `tsc -b && vite build` completes with no errors.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`, open the printed local URL in a browser, log in with a test account that has an active vehicle.

- [ ] **Step 3: Desktop width (≥1024px)**

Resize the browser (or devtools responsive mode) to ≥1024px wide. Confirm: the sidebar is fixed on the left with "⛽ FlowFuel" and 3 links; no hamburger button is visible; clicking Dashboard/Abastecimentos/Eventos navigates and highlights the corresponding link (`bg-green-100 text-green-700`); the vehicle name appears top-right and clicking it navigates to `/select-vehicle`.

- [ ] **Step 4: Mobile width (375px and 768px)**

Resize to 375px, then 768px. Confirm: the sidebar is gone; a hamburger button appears top-left; clicking it opens the drawer with a dark backdrop and the same 3 links; clicking a link navigates and closes the drawer; clicking the backdrop, or pressing Esc, also closes the drawer without navigating; the vehicle name still appears top-right of the Topbar.

- [ ] **Step 5: Onboarding state (no active vehicle)**

If possible, test with an account with zero vehicles (or clear `localStorage`'s `@active_vehicle` and reload while on `/select-vehicle`). Confirm the Topbar shows only "⛽ FlowFuel" — no vehicle-switcher link — on `/select-vehicle` and `/vehicles/new`.

- [ ] **Step 6: Wide-content sanity check**

At a very wide viewport (≥1440px), confirm content on `Refuels`, `SelectVehicle`, and `VehicleNew` sits in a centered column noticeably wider than the old phone-width column, but does not stretch edge-to-edge.

- [ ] **Step 7: Deploy for real-device check**

After local verification passes, deploy to Render (existing `render.yaml` blueprint) to confirm the drawer and sidebar behave correctly on an actual phone and a real desktop monitor, matching the pattern used by prior specs in this project.

---

## Self-Review

**Spec coverage:** Sidebar ≥1024px (Task 3, 7), drawer + hamburger <1024px (Task 5, 6, 7), CSS-only breakpoint switching (Tasks 3/5/6/7, no JS detection anywhere), `AppLayout` wrapping all protected routes (Task 9), `Screen`'s `max-w-md` → `wide` opt-in (Task 8, 10, 11), vehicle switcher as a link to existing `/select-vehicle` (Task 4), no switcher when no active vehicle (Task 4, verified in Task 12 Step 5), `ProtectedRoute` untouched (Global Constraints, no task modifies it), Login/Register untouched (no task modifies them), no icon library / no new dependencies (Global Constraints, emoji used throughout), no content reflow (Home/Refuels/etc. internals untouched — only the `<Screen>` prop changes in Tasks 10-11).

**Placeholder scan:** no TBD/TODO; every step has complete, pasteable code or an exact shell command.

**Type consistency:** `NavLinks({ onNavigate? })` (Task 2) matches its two call sites — `Sidebar` (Task 3, called with no props) and `MobileDrawer` (Task 6, called with `onNavigate={onClose}`). `Topbar({ onOpenDrawer })` (Task 5) matches its call in `AppLayout` (Task 7, `onOpenDrawer={() => setDrawerOpen(true)}`). `MobileDrawer({ open, onClose })` (Task 6) matches its call in `AppLayout` (Task 7). `Screen`'s `wide?: boolean` (Task 8) matches every call site added in Tasks 10-11 (`<Screen wide>`, no other prop shape introduced).
