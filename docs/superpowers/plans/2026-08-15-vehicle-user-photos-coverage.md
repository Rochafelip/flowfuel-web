# Cobertura de foto de carro/usuário no Web — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show vehicle photo and user photo (with existing fallbacks) in the 4 places on the Web app where they're referenced but not displayed today: the vehicle list, the vehicle-selection screen, the Topbar vehicle switcher, and the "Perfil" nav item.

**Architecture:** Two new presentational components (`VehiclePhoto`, `UserAvatar`) wrap the existing `useAuthenticatedImage` hook and the existing fallback visuals (🚗 emoji / name initial) already used elsewhere in the app. Four existing files get a small, local edit each to render one of these components where a photo was missing. No backend changes — every payload involved already includes the photo field.

**Tech Stack:** React + TypeScript, Tailwind CSS. No test framework configured in this repo (confirmed in the spec) — verification is `tsc -b` (typecheck) per task, plus a final visual check after deploy.

**Spec:** `docs/superpowers/specs/2026-08-15-vehicle-user-photos-coverage-design.md`

---

## Task 1: `VehiclePhoto` component

**Files:**
- Create: `src/components/ui/VehiclePhoto.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useAuthenticatedImage } from '../../hooks/useAuthenticatedImage'

type VehiclePhotoSize = 'sm' | 'md' | 'lg'
type VehiclePhotoRounded = 'lg' | 'full'

const sizeClasses: Record<VehiclePhotoSize, string> = {
  sm: 'h-6 w-6 text-sm',
  md: 'h-8 w-8 text-base',
  lg: 'h-12 w-12 text-xl',
}

const roundedClasses: Record<VehiclePhotoRounded, string> = {
  lg: 'rounded-lg',
  full: 'rounded-full',
}

export function VehiclePhoto({
  path,
  size = 'md',
  rounded = 'lg',
  className = '',
}: {
  path: string | null
  size?: VehiclePhotoSize
  rounded?: VehiclePhotoRounded
  className?: string
}) {
  const photoUrl = useAuthenticatedImage(path)

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 ${sizeClasses[size]} ${roundedClasses[rounded]} ${className}`}
    >
      {photoUrl ? <img src={photoUrl} alt="" className="h-full w-full object-cover" /> : '🚗'}
    </div>
  )
}
```

This reuses `useAuthenticatedImage` (`src/hooks/useAuthenticatedImage.ts`) unchanged — it already handles fetching, blob-URL creation/cleanup, and silently resolving to `null` on failure (which is exactly the fallback trigger here). The 🚗 fallback and `bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400` colors match the box already used in `SelectVehicle.tsx` today.

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors (new file is not imported anywhere yet, so this just confirms the file itself is valid TypeScript/JSX).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/VehiclePhoto.tsx
git commit -m "feat: add VehiclePhoto component"
```

---

## Task 2: `UserAvatar` component

**Files:**
- Create: `src/components/ui/UserAvatar.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useAuthenticatedImage } from '../../hooks/useAuthenticatedImage'

type UserAvatarSize = 'sm' | 'md'

const sizeClasses: Record<UserAvatarSize, string> = {
  sm: 'h-5 w-5 text-xs',
  md: 'h-6 w-6 text-sm',
}

export function UserAvatar({
  path,
  name,
  size = 'md',
  className = '',
}: {
  path: string | null
  name: string
  size?: UserAvatarSize
  className?: string
}) {
  const photoUrl = useAuthenticatedImage(path)

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700 font-bold text-gray-500 dark:text-gray-400 ${sizeClasses[size]} ${className}`}
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  )
}
```

Same fallback pattern already used in `Profile.tsx` (`profile.name ?? profile.email).charAt(0).toUpperCase()` inside a `rounded-full` circle).

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/UserAvatar.tsx
git commit -m "feat: add UserAvatar component"
```

---

## Task 3: Vehicle photo in "Meus veículos" list

**Files:**
- Modify: `src/routes/Vehicles.tsx`

- [ ] **Step 1: Import `VehiclePhoto`**

Add near the top with the other `components/ui` imports:

```tsx
import { VehiclePhoto } from '../components/ui/VehiclePhoto'
```

- [ ] **Step 2: Render the photo next to the vehicle name**

Find this block (inside the `vehicles.map(...)` render, currently the first thing inside each `<Card>`):

```tsx
                <Card interactive>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-bold text-gray-900 dark:text-gray-100">
                      {vehicle.brand} {vehicle.model}
                    </p>
                    {isActive && (
```

Replace with:

```tsx
                <Card interactive>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <VehiclePhoto path={vehicle.photo} size="lg" />
                      <p className="font-bold text-gray-900 dark:text-gray-100">
                        {vehicle.brand} {vehicle.model}
                      </p>
                    </div>
                    {isActive && (
```

And close the new wrapping `<div>` right after the `isActive` block. The `isActive` block currently ends with:

```tsx
                    {isActive && (
                      <span className="rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-xs font-bold text-green-700 dark:text-green-400">
                        Ativo
                      </span>
                    )}
                  </div>
```

That closing `</div>` already matches the *outer* `flex items-center justify-between` div — no change needed there, since the new wrapping `<div className="flex items-center gap-3">` closes right before `{isActive && (`.

`vehicle` here is typed as `Vehicle` (from `src/types/Vehicle.ts`), which already has `photo: string | null` — no type changes needed in this file.

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Vehicles.tsx
git commit -m "feat: show vehicle photo in the vehicle list"
```

---

## Task 4: Vehicle photo in "Selecionar veículo"

**Files:**
- Modify: `src/routes/SelectVehicle.tsx`

- [ ] **Step 1: Add `photo` to the local `VehicleListItem` type**

Current:

```tsx
interface VehicleListItem {
  id: number
  brand: string
  model: string
  modelYear: number
  licensePlate: string
}
```

New:

```tsx
interface VehicleListItem {
  id: number
  brand: string
  model: string
  modelYear: number
  licensePlate: string
  photo: string | null
}
```

The API (`GET /vehicles`, via `authenticatedRequest('/vehicles')`) already returns `photo` in each item's payload (see `VehicleResponseDTO` in the backend) — this is purely a frontend type fix, no request changes needed.

- [ ] **Step 2: Import `VehiclePhoto`**

```tsx
import { VehiclePhoto } from '../components/ui/VehiclePhoto'
```

- [ ] **Step 3: Replace the hardcoded 🚗 box with `VehiclePhoto`**

Current:

```tsx
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40 text-base text-green-700 dark:text-green-400">
                🚗
              </div>
```

New:

```tsx
              <VehiclePhoto path={item.photo} size="md" />
```

(`size="md"` is `h-8 w-8`, matching the exact box size being replaced — no layout shift.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/routes/SelectVehicle.tsx
git commit -m "feat: show vehicle photo in the vehicle selection screen"
```

---

## Task 5: Vehicle photo in the Topbar switcher

**Files:**
- Modify: `src/components/layout/VehicleSwitcherLink.tsx`

- [ ] **Step 1: Replace the file contents**

Full new file:

```tsx
import { Link } from 'react-router-dom'
import { useVehicle } from '../../context/VehicleContext'
import { VehiclePhoto } from '../ui/VehiclePhoto'

export function VehicleSwitcherLink() {
  const { activeVehicle } = useVehicle()

  if (!activeVehicle) {
    return <span className="text-sm font-bold text-green-700 dark:text-green-400">⛽ FlowFuel</span>
  }

  return (
    <Link
      to="/select-vehicle"
      className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-950"
    >
      <VehiclePhoto path={activeVehicle.photo} size="sm" rounded="full" />
      {activeVehicle.brand} {activeVehicle.model}
      <span aria-hidden="true">▾</span>
    </Link>
  )
}
```

`activeVehicle` comes from `VehicleContext` and is a full `Vehicle` object (already includes `photo`) — no new fetch. `gap-1` was bumped to `gap-2` so the added avatar has breathing room from the text, matching the spacing already used elsewhere (e.g. `Card` action rows use `gap-2`).

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/VehicleSwitcherLink.tsx
git commit -m "feat: show vehicle photo in the topbar switcher"
```

---

## Task 6: User avatar in the "Perfil" nav item

**Files:**
- Modify: `src/components/layout/NavLinks.tsx`

- [ ] **Step 1: Replace the file contents**

Full new file:

```tsx
import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useConfirm } from '../../context/ConfirmContext'
import { decodeUserIdFromToken } from '../../lib/jwt'
import { getProfileRequest } from '../../services/profile'
import { UserAvatar } from '../ui/UserAvatar'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/refuels', label: 'Abastecimentos', icon: '⛽', end: false },
  { to: '/vehicle-events', label: 'Eventos', icon: '🔧', end: false },
  { to: '/stations', label: 'Postos', icon: '📍', end: false },
  { to: '/export', label: 'Exportar', icon: '📤', end: false },
  { to: '/profile', label: 'Perfil', icon: '👤', end: false },
]

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { token, signOut } = useAuth()
  const confirm = useConfirm()
  const navigate = useNavigate()

  const [userName, setUserName] = useState<string | null>(null)
  const [userPhoto, setUserPhoto] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    const userId = decodeUserIdFromToken(token)
    if (!userId) return

    getProfileRequest(userId)
      .then((profile) => {
        setUserName(profile.name ?? profile.email)
        setUserPhoto(profile.profilePicture)
      })
      .catch((err) => console.log(err))
  }, [token])

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
                  ? 'border-green-600 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-gray-950'
              }`
            }
          >
            {item.to === '/profile' ? (
              <UserAvatar path={userPhoto} name={userName ?? '?'} size="sm" />
            ) : (
              <span className="text-base">{item.icon}</span>
            )}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-gray-100 dark:border-gray-700 pt-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          <span className="text-base">🚪</span>
          Sair
        </button>
      </div>
    </div>
  )
}
```

Notes for whoever implements this:
- `getProfileRequest` and the `UserProfile` type live in `src/services/profile.ts` (`getProfileRequest(userId: number): Promise<UserProfile>`, where `UserProfile.profilePicture: string | null` and `UserProfile.name: string | null`).
- `decodeUserIdFromToken` lives in `src/lib/jwt.ts` and returns `number | null`.
- `useAuth()` (from `src/context/AuthContext.tsx`) exposes `token: string | null` — already used elsewhere in this file for `signOut`.
- While the profile hasn't loaded yet (or the fetch fails), `userPhoto` stays `null` and `userName` stays `null`, so `UserAvatar` shows the fallback letter `'?'` — this is intentional per the spec ("mesmo fallback de sem foto enquanto carrega"), not a bug to fix.
- Only the `/profile` item's icon changes; all other items keep their emoji unchanged.

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/NavLinks.tsx
git commit -m "feat: show user avatar in the profile nav item"
```

---

## Task 7: Deploy verification

**Files:** none (verification only)

- [ ] **Step 1: Push to trigger the Render deploy**

```bash
git push origin main
```

- [ ] **Step 2: Confirm in the browser after deploy finishes**

Per the standing preference for this project (verify via deploy, not local dev server): open the deployed app and check, for an account that has both a vehicle photo and a profile picture set:
- "Meus veículos" shows the vehicle photo on each card.
- "Selecionar veículo" (via the topbar switcher's dropdown target) shows the vehicle photo.
- The topbar switcher itself shows a small circular vehicle photo next to the vehicle name.
- The "Perfil" item in the sidebar/mobile drawer shows the user's photo instead of 👤.

Also check an account/vehicle *without* a photo to confirm fallbacks (🚗 / name initial) still render correctly in all 4 places.

---

## Self-review notes

- **Spec coverage:** all 4 locations from the spec (`Vehicles.tsx`, `SelectVehicle.tsx`, `VehicleSwitcherLink.tsx`, `NavLinks.tsx`) have a task; both new components (`VehiclePhoto`, `UserAvatar`) have a task; the `VehicleListItem.photo` type fix called out in the spec is in Task 4.
- **Type consistency:** `VehiclePhoto` accepts `path: string | null` in every call site (`vehicle.photo`, `item.photo`, `activeVehicle.photo` are all `string | null` per `src/types/Vehicle.ts`). `UserAvatar` accepts `path: string | null, name: string` consistently between its definition (Task 2) and its one call site (Task 6).
- **Out of scope confirmed unchanged:** no backend files, no new routes, no upload/edit UI in these 4 places.
