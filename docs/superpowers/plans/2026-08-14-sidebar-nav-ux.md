# Sidebar/Drawer Navigation UX Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the duplicate icon between "Abastecimentos"/"Postos", give the active nav item a stronger indicator, isolate "Sair" from page navigation with its own footer treatment, make the "FlowFuel" logo a link back to the Dashboard, and add keyboard focus-visible states everywhere in the sidebar/drawer.

**Architecture:** Nearly all the behavior lives in the shared `NavLinks.tsx` (consumed by both `Sidebar.tsx` desktop and `MobileDrawer.tsx` mobile), so fixing it there propagates to both surfaces automatically. `Sidebar.tsx`/`MobileDrawer.tsx` only need their static logo `<p>` swapped for a `<Link>`, and `Topbar.tsx`'s hamburger button needs a focus ring.

**Tech Stack:** React 19, React Router 7, TypeScript (strict), Tailwind CSS. No test framework exists in this repo — verification is `npx tsc -b` after each task and `npm run build` at the end.

---

## File Structure

- Modify `src/components/layout/NavLinks.tsx` — icon fix, stronger active indicator, "Sair" moved to an isolated footer block, focus-visible everywhere.
- Modify `src/components/layout/Sidebar.tsx` — logo becomes a `Link` to `/`.
- Modify `src/components/layout/MobileDrawer.tsx` — logo becomes a `Link` to `/` (closes the drawer on click, like other nav items); close button (`✕`) gets a focus ring.
- Modify `src/components/layout/Topbar.tsx` — hamburger button (`☰`) gets a focus ring.

---

### Task 1: `NavLinks.tsx` — icon, active indicator, isolated "Sair", focus-visible

**Files:**
- Modify: `src/components/layout/NavLinks.tsx`

- [ ] **Step 1: Replace the file**

```tsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useConfirm } from '../../context/ConfirmContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/refuels', label: 'Abastecimentos', icon: '⛽', end: false },
  { to: '/vehicle-events', label: 'Eventos', icon: '🔧', end: false },
  { to: '/stations', label: 'Postos', icon: '📍', end: false },
  { to: '/export', label: 'Exportar', icon: '📤', end: false },
  { to: '/profile', label: 'Perfil', icon: '👤', end: false },
]

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut } = useAuth()
  const confirm = useConfirm()
  const navigate = useNavigate()

  async function handleLogout() {
    if (!(await confirm('Tem certeza que deseja sair?', 'Sair'))) return
    onNavigate?.()
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 ${
                isActive
                  ? 'border-green-600 bg-green-100 text-green-700'
                  : 'border-transparent text-gray-600 hover:bg-green-50'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          <span className="text-base">🚪</span>
          Sair
        </button>
      </div>
    </div>
  )
}
```

Key changes from the current file:
- "Postos" icon: `⛽` → `📍` (no longer duplicates "Abastecimentos").
- Every `NavLink` reserves a 3px transparent left border (`border-transparent`) at rest, which turns `border-green-600` when active — this is on top of the existing background/text color change, not a replacement for it.
- The component now returns a `<div className="flex flex-1 flex-col">` instead of a bare `<nav>`. The page-navigation items are still inside their own `<nav>`; the "Sair" button moved outside of it, into a sibling block with `mt-auto` (pushes it to the bottom of whatever flex-column container `NavLinks` is placed in) and a `border-t` divider.
- "Sair" styling changed from "identical to nav items" to neutral-until-hovered: `text-gray-600 hover:bg-red-50 hover:text-red-600`.
- Both the `NavLink`s and the "Sair" button gained `focus-visible:outline` rings (green for nav items, red for "Sair", matching each element's hover color).

This requires `Sidebar.tsx` and `MobileDrawer.tsx` (Tasks 2–3) to already be flex-column containers with a bounded height so `flex-1`/`mt-auto` have something to push against — verify this holds for both when you get there (it does: both use `inset-y-0` plus `flex flex-col`).

- [ ] **Step 2: Type check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/NavLinks.tsx
git commit -m "refactor(nav): fix duplicate icon, stronger active indicator, isolate Sair, add focus-visible"
```

---

### Task 2: `Sidebar.tsx` — logo becomes a link

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Replace the file**

```tsx
import { Link } from 'react-router-dom'
import { NavLinks } from './NavLinks'

export function Sidebar() {
  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white lg:p-4">
      <Link
        to="/"
        className="mb-6 rounded-lg px-3 py-1 text-lg font-bold text-green-700 transition-colors hover:bg-green-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
      >
        ⛽ FlowFuel
      </Link>
      <NavLinks />
    </aside>
  )
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(sidebar): make logo a link back to the dashboard"
```

---

### Task 3: `MobileDrawer.tsx` — logo becomes a link, close button gets focus ring

**Files:**
- Modify: `src/components/layout/MobileDrawer.tsx`

- [ ] **Step 1: Update imports**

Find:

```tsx
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { NavLinks } from './NavLinks'
```

Replace with:

```tsx
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { NavLinks } from './NavLinks'
```

- [ ] **Step 2: Replace the header block**

Find:

```tsx
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
```

Replace with:

```tsx
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-lg font-bold text-green-700 transition-colors hover:bg-green-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            ⛽ FlowFuel
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-700 hover:bg-green-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            ✕
          </button>
        </div>
```

- [ ] **Step 3: Type check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/MobileDrawer.tsx
git commit -m "feat(mobile-drawer): make logo a link back to the dashboard, add focus ring to close button"
```

---

### Task 4: `Topbar.tsx` — hamburger button gets a focus ring

**Files:**
- Modify: `src/components/layout/Topbar.tsx`

- [ ] **Step 1: Update the hamburger button's className**

Find:

```tsx
        className="-ml-2 flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-700 hover:bg-green-50 lg:hidden"
```

Replace with:

```tsx
        className="-ml-2 flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-700 hover:bg-green-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 lg:hidden"
```

- [ ] **Step 2: Type check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Topbar.tsx
git commit -m "feat(topbar): add focus ring to the mobile menu button"
```

---

### Task 5: Full build verification and push

**Files:** none (verification only)

- [ ] **Step 1: Run the full production build**

Run: `npm run build`
Expected: `tsc -b` passes with zero errors, then `vite build` completes and prints the `dist/` output summary.

- [ ] **Step 2: Push and let the deploy preview confirm visually**

```bash
git push
```

Expected: deploy builds successfully; open the deployed preview on both desktop (sidebar) and mobile (hamburger → drawer) and confirm: "Postos" shows a pin icon (not the fuel pump), the active page has a green left border, "Sair" sits at the bottom of the menu separated by a divider and turns red on hover, and the "⛽ FlowFuel" logo navigates to the dashboard when clicked.
