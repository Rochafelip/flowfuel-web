# Vehicle Share (Web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a vehicle owner share a vehicle with another user (invite by email + expiry), see/revoke that share, and let a guest see and respond to pending invites — all inside the existing "Meus veículos" screen.

**Architecture:** The backend API (`/vehicle-shares/*`) already exists and is fully functional. This plan only adds a web client: new functions in `src/services/vehicle.ts`, a new `ShareVehicleDialog` modal component modeled on the existing `DeleteAccountDialog`, and new state/handlers/sections in `src/routes/Vehicles.tsx`.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS. No test runner is configured in this project (no vitest/jest, no test script in `package.json`) — verification for these tasks is `tsc -b` (type check, note `tsconfig.json` has `noUnusedLocals`/`noUnusedParameters` enabled) plus manual verification in `npm run dev`, matching the "Testes" section of the approved spec.

**Spec:** `docs/superpowers/specs/2026-07-27-vehicle-share-web-design.md`

**Note on task granularity:** Because `noUnusedLocals` is on, state/imports introduced in a task must be *used* by the end of that same task, or `tsc -b` will fail. Tasks 3 and 4 each bundle state + data loading + handlers + render together for this reason (rather than splitting state from render into separate tasks).

---

## Task 1: Service functions for vehicle sharing

**Files:**

- Modify: `src/services/vehicle.ts`

- [ ] **Step 1: Add `shareVehicle`, `listPendingShares`, `acceptVehicleShare`, `rejectVehicleShare`**

Add these functions to `src/services/vehicle.ts`, right after the existing `listSharedVehicles` function:

```ts
export function shareVehicle(
  vehicleId: number,
  inviteeEmail: string,
  durationDays: number
): Promise<VehicleShare> {
  return authenticatedRequest('/vehicle-shares', {
    method: 'POST',
    body: JSON.stringify({ vehicleId, inviteeEmail, durationDays }),
  })
}

export function listPendingShares(): Promise<VehicleShare[]> {
  return authenticatedRequest('/vehicle-shares/pending')
}

export function acceptVehicleShare(id: number): Promise<VehicleShare> {
  return authenticatedRequest(`/vehicle-shares/${id}/accept`, { method: 'POST' })
}

export function rejectVehicleShare(id: number): Promise<VehicleShare> {
  return authenticatedRequest(`/vehicle-shares/${id}/reject`, { method: 'POST' })
}
```

- [ ] **Step 2: Add `getVehicleShare` and `revokeVehicleShare` (raw fetch, empty/204 responses)**

`GET /vehicle-shares/vehicle/{id}` returns `204 No Content` when there's no
share, and `DELETE /vehicle-shares/{id}` returns `204 No Content` on success.
`authenticatedRequest` always calls `response.json()`, which throws on an
empty body — so these two need their own fetch, the same way
`activateVehicle` and `deleteVehicle` already do in this file. Add them
right after `deleteVehicle`:

```ts
export async function getVehicleShare(vehicleId: number): Promise<VehicleShare | null> {
  const token = localStorage.getItem('@token')
  const response = await fetch(`${BASE_URL}/api/v1/vehicle-shares/vehicle/${vehicleId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status === 401) {
    clearSession()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (response.status === 204) {
    return null
  }

  if (!response.ok) {
    throw new Error('Não foi possível carregar o compartilhamento do veículo')
  }

  return response.json()
}

export async function revokeVehicleShare(id: number): Promise<void> {
  const token = localStorage.getItem('@token')
  const response = await fetch(`${BASE_URL}/api/v1/vehicle-shares/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status === 401) {
    clearSession()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    throw new Error('Não foi possível revogar o compartilhamento')
  }
}
```

- [ ] **Step 3: Type check**

Run: `npx tsc -b`
Expected: no errors (the file already imports `VehicleShare` from `../types/Vehicle`, which has all fields these functions need; every new function is exported, so none can be flagged as unused).

- [ ] **Step 4: Commit**

```bash
git add src/services/vehicle.ts
git commit -m "feat: add vehicle share service functions"
```

---

## Task 2: `ShareVehicleDialog` component

**Files:**

- Create: `src/components/ui/ShareVehicleDialog.tsx`

- [ ] **Step 1: Write the component**

Modeled on `src/components/ui/DeleteAccountDialog.tsx` (same overlay/dialog
structure, same use of `TextField`):

```tsx
import { useState } from 'react'
import { TextField } from './TextField'
import type { Vehicle } from '../../types/Vehicle'

const DEFAULT_DURATION_DAYS = 30
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ShareVehicleDialog({
  vehicle,
  submitting,
  onConfirm,
  onDismiss,
}: {
  vehicle: Vehicle
  submitting: boolean
  onConfirm: (email: string, durationDays: number) => void
  onDismiss: () => void
}) {
  const [email, setEmail] = useState('')
  const [durationDays, setDurationDays] = useState(DEFAULT_DURATION_DAYS)

  const isEmailValid = EMAIL_PATTERN.test(email)
  const isDurationValid = durationDays >= 1 && durationDays <= 365
  const canSubmit = isEmailValid && isDurationValid && !submitting

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onDismiss} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Compartilhar ${vehicle.brand} ${vehicle.model}`}
        className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
      >
        <p className="mb-3 text-base font-bold text-gray-900">
          Compartilhar {vehicle.brand} {vehicle.model}
        </p>
        <p className="mb-1 text-sm font-bold text-gray-700">E-mail do convidado</p>
        <TextField
          type="email"
          placeholder="nome@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="mt-3 mb-1 text-sm font-bold text-gray-700">Validade (dias)</p>
        <TextField
          type="number"
          min={1}
          max={365}
          value={durationDays}
          onChange={(e) => setDurationDays(Number(e.target.value))}
        />
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(email, durationDays)}
            disabled={!canSubmit}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-40"
          >
            Compartilhar
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/ShareVehicleDialog.tsx
git commit -m "feat: add ShareVehicleDialog component"
```

---

## Task 3: Share/revoke controls on owned vehicle cards

**Files:**

- Modify: `src/routes/Vehicles.tsx`

- [ ] **Step 1: Update imports**

Replace the existing import block at the top of the file:

```ts
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  activateVehicle,
  deleteVehicle,
  getVehicleShare,
  listSharedVehicles,
  listVehicles,
  revokeVehicleShare,
  shareVehicle,
} from '../services/vehicle'
import { useVehicle } from '../context/VehicleContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import type { Vehicle, VehicleShare } from '../types/Vehicle'
import { Screen } from '../components/ui/Screen'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { Button } from '../components/ui/Button'
import { ShareVehicleDialog } from '../components/ui/ShareVehicleDialog'
```

(`acceptVehicleShare`, `rejectVehicleShare`, `listPendingShares` are added
in Task 4, together with the code that uses them — kept out of this task's
imports so `tsc -b` doesn't flag them as unused in the meantime.)

- [ ] **Step 2: Add share-related state**

Inside the `Vehicles` component, right after the existing `busyId` state
line (`const [busyId, setBusyId] = useState<number | null>(null)`), add:

```ts
  const [shareByVehicleId, setShareByVehicleId] = useState<Record<number, VehicleShare | null>>({})
  const [sharingVehicle, setSharingVehicle] = useState<Vehicle | null>(null)
  const [shareSubmitting, setShareSubmitting] = useState(false)
  const [shareBusyId, setShareBusyId] = useState<number | null>(null)
```

- [ ] **Step 3: Extend `load()` to fetch per-vehicle share status**

Replace the existing `load` function:

```ts
  async function load() {
    try {
      setLoading(true)
      setError(false)
      const [page, shared] = await Promise.all([
        listVehicles(),
        listSharedVehicles().catch(() => []),
      ])
      setVehicles(page.content)
      setSharedVehicles(shared)

      const shareEntries = await Promise.all(
        page.content.map(async (v) => {
          try {
            return [v.id, await getVehicleShare(v.id)] as const
          } catch {
            return [v.id, null] as const
          }
        })
      )
      setShareByVehicleId(Object.fromEntries(shareEntries))
    } catch (err) {
      console.log(err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }
```

- [ ] **Step 4: Add share/revoke handlers**

Add these functions right after the existing `handleDelete` function:

```ts
  async function handleShareSubmit(vehicle: Vehicle, email: string, durationDays: number) {
    try {
      setShareSubmitting(true)
      await shareVehicle(vehicle.id, email, durationDays)
      setSharingVehicle(null)
      const share = await getVehicleShare(vehicle.id)
      setShareByVehicleId((current) => ({ ...current, [vehicle.id]: share }))
      showToast('Convite enviado.', 'success')
    } catch (err) {
      console.log(err)
      showToast(err instanceof Error ? err.message : 'Não foi possível compartilhar o veículo')
    } finally {
      setShareSubmitting(false)
    }
  }

  async function handleRevoke(share: VehicleShare) {
    const ok = await confirm(
      `Revogar o compartilhamento com "${share.guestName}"? Esta ação não pode ser desfeita.`
    )
    if (!ok) return

    try {
      setShareBusyId(share.id)
      await revokeVehicleShare(share.id)
      setShareByVehicleId((current) => ({ ...current, [share.vehicleId]: null }))
      showToast('Compartilhamento revogado.', 'success')
    } catch (err) {
      console.log(err)
      showToast(err instanceof Error ? err.message : 'Não foi possível revogar o compartilhamento')
    } finally {
      setShareBusyId(null)
    }
  }
```

- [ ] **Step 5: Replace the owned-vehicle action row and add the dialog**

Find this block inside the `vehicles.map((vehicle) => { ... })` render (the
`<div className="mt-3 flex flex-wrap items-center gap-2">...</div>` that
currently holds "Definir como ativo" / "Editar" / "Excluir"). Keep it as-is,
but add the share/revoke block immediately after it, still inside the same
`<Card>`:

```tsx
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {!isActive && (
                      <button
                        className="rounded-md px-2 py-3 text-sm font-bold text-green-700 disabled:opacity-50 active:bg-green-50"
                        disabled={isBusy}
                        onClick={() => handleActivate(vehicle.id)}
                      >
                        Definir como ativo
                      </button>
                    )}
                    <button
                      className="rounded-md px-2 py-3 text-sm font-bold text-green-700 disabled:opacity-50 active:bg-green-50"
                      disabled={isBusy}
                      onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
                    >
                      Editar
                    </button>
                    <button
                      className="rounded-md px-2 py-3 text-sm font-bold text-red-600 disabled:opacity-50 active:bg-red-50"
                      disabled={isBusy}
                      onClick={() => handleDelete(vehicle)}
                    >
                      Excluir
                    </button>
                  </div>

                  {(() => {
                    const share = shareByVehicleId[vehicle.id]
                    const isShareBusy = shareBusyId === share?.id

                    if (!share) {
                      return (
                        <div className="mt-2">
                          <button
                            className="rounded-md px-2 py-3 text-sm font-bold text-blue-700 disabled:opacity-50 active:bg-blue-50"
                            onClick={() => setSharingVehicle(vehicle)}
                          >
                            Compartilhar
                          </button>
                        </div>
                      )
                    }

                    return (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                          {share.status === 'PENDING'
                            ? `Convite enviado para ${share.guestName ?? 'convidado'}`
                            : `Compartilhado com ${share.guestName}`}
                        </span>
                        <button
                          className="rounded-md px-2 py-3 text-sm font-bold text-red-600 disabled:opacity-50 active:bg-red-50"
                          disabled={isShareBusy}
                          onClick={() => handleRevoke(share)}
                        >
                          Revogar
                        </button>
                      </div>
                    )
                  })()}
```

Then, at the end of the component's JSX, right before the final closing
`</Screen>` tag, add:

```tsx
      {sharingVehicle && (
        <ShareVehicleDialog
          vehicle={sharingVehicle}
          submitting={shareSubmitting}
          onConfirm={(email, durationDays) => handleShareSubmit(sharingVehicle, email, durationDays)}
          onDismiss={() => setSharingVehicle(null)}
        />
      )}
```

- [ ] **Step 6: Type check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 7: Manual verification**

Run: `npm run dev`, open the app, log in, go to "Meus veículos" (Perfil →
Meus veículos). Confirm:
- Every owned vehicle without a share shows a "Compartilhar" button.
- Clicking it opens the dialog; submitting with a valid registered user's
  email and a duration between 1–365 sends the invite, closes the dialog,
  and the card now shows "Convite enviado para {nome}" + "Revogar" instead
  of "Compartilhar".
- Clicking "Revogar" asks for confirmation; confirming removes the badge
  and brings back the "Compartilhar" button.
- Trying to share a vehicle that already has a pending/active share isn't
  possible from the UI (button is hidden), and if you force a second
  invite via a race, the 409 from the backend shows as a toast rather than
  crashing the screen.

- [ ] **Step 8: Commit**

```bash
git add src/routes/Vehicles.tsx
git commit -m "feat: add share/revoke controls to owned vehicle cards"
```

---

## Task 4: "Convites pendentes" section

**Files:**

- Modify: `src/routes/Vehicles.tsx`

- [ ] **Step 1: Add the three remaining service imports**

Update the import from `../services/vehicle` to also include
`acceptVehicleShare`, `listPendingShares`, and `rejectVehicleShare`:

```ts
import {
  acceptVehicleShare,
  activateVehicle,
  deleteVehicle,
  getVehicleShare,
  listPendingShares,
  listSharedVehicles,
  listVehicles,
  rejectVehicleShare,
  revokeVehicleShare,
  shareVehicle,
} from '../services/vehicle'
```

- [ ] **Step 2: Add pending-invites state**

Right after the `shareByVehicleId` state line added in Task 3, add:

```ts
  const [pendingInvites, setPendingInvites] = useState<VehicleShare[]>([])
```

- [ ] **Step 3: Fetch pending invites in `load()`**

Update the `Promise.all` call inside `load()` to also fetch pending
invites, and store the result:

```ts
      const [page, shared, pending] = await Promise.all([
        listVehicles(),
        listSharedVehicles().catch(() => []),
        listPendingShares().catch(() => []),
      ])
      setVehicles(page.content)
      setSharedVehicles(shared)
      setPendingInvites(pending)
```

(This replaces the two-element destructure/`setSharedVehicles(shared)` pair
from Task 3 with the three-element version shown above — everything else
in `load()` stays the same.)

- [ ] **Step 4: Add accept/reject handlers**

Add these functions right after `handleRevoke`:

```ts
  async function handleAcceptInvite(share: VehicleShare) {
    try {
      setShareBusyId(share.id)
      await acceptVehicleShare(share.id)
      await load()
      showToast('Convite aceito.', 'success')
    } catch (err) {
      console.log(err)
      showToast(err instanceof Error ? err.message : 'Não foi possível aceitar o convite')
    } finally {
      setShareBusyId(null)
    }
  }

  async function handleRejectInvite(share: VehicleShare) {
    try {
      setShareBusyId(share.id)
      await rejectVehicleShare(share.id)
      await load()
      showToast('Convite rejeitado.', 'success')
    } catch (err) {
      console.log(err)
      showToast(err instanceof Error ? err.message : 'Não foi possível rejeitar o convite')
    } finally {
      setShareBusyId(null)
    }
  }
```

- [ ] **Step 5: Render the section**

Find the existing "Compartilhados comigo" block:

```tsx
      {sharedVehicles.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-bold">Compartilhados comigo</h2>
```

Insert a new section immediately **before** it (same indentation level):

```tsx
      {pendingInvites.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-bold">Convites pendentes</h2>
          <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
            {pendingInvites.map((invite) => {
              const isInviteBusy = shareBusyId === invite.id

              return (
                <li key={invite.id}>
                  <Card>
                    <p className="font-bold">
                      {invite.vehicleBrand} {invite.vehicleModel}
                    </p>
                    <p>De: {invite.ownerName}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        className="rounded-md px-2 py-3 text-sm font-bold text-green-700 disabled:opacity-50 active:bg-green-50"
                        disabled={isInviteBusy}
                        onClick={() => handleAcceptInvite(invite)}
                      >
                        Aceitar
                      </button>
                      <button
                        className="rounded-md px-2 py-3 text-sm font-bold text-red-600 disabled:opacity-50 active:bg-red-50"
                        disabled={isInviteBusy}
                        onClick={() => handleRejectInvite(invite)}
                      >
                        Rejeitar
                      </button>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        </div>
      )}

```

- [ ] **Step 6: Type check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 7: Manual verification**

Using two accounts (or one account with a second registered user to invite):
- Share a vehicle from account A to account B's email.
- Log in as account B, go to "Meus veículos". Confirm the "Convites
  pendentes" section appears above "Compartilhados comigo" with the shared
  vehicle and owner name.
- Click "Aceitar": the invite disappears from "Convites pendentes" and the
  vehicle now appears under "Compartilhados comigo" with the "Emprestado"
  badge.
- Repeat the share from A, and this time click "Rejeitar" as B: the invite
  disappears and does not appear under "Compartilhados comigo".
- Confirm the "Convites pendentes" heading does not render at all when
  there are no pending invites.

- [ ] **Step 8: Commit**

```bash
git add src/routes/Vehicles.tsx
git commit -m "feat: add pending invites section to Vehicles screen"
```

---

## Task 5: Full production build check

**Files:** none (verification only)

- [ ] **Step 1: Run the production build**

Run: `npm run build`
Expected: build completes with no TypeScript or Vite errors.

- [ ] **Step 2: Manual end-to-end smoke test**

Run: `npm run preview`, open the served URL, and re-run the full flow from
Tasks 3 and 4 once against the production build (share, revoke, accept,
reject) to confirm nothing behaves differently from `npm run dev`.
