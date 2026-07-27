# Profile Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a profile screen cluster to the web frontend — `/profile` (avatar, info, stats, actions, danger zone), `/profile/edit` (name/phone), `/profile/change-password` — plus the logout mechanism the web app is currently completely missing (no button, no menu item, anywhere).

**Architecture:** New `src/lib/jwt.ts` decodes the `userId` claim straight out of the existing JWT (no backend change, no `AuthContext` change) since the profile endpoints are all `/auth/{userId}/...`. New `src/services/profile.ts` holds every profile-related API call; the three endpoints that return an empty body (change password, delete profile picture, delete account) get their own raw `fetch` calls instead of going through `authenticatedRequest`, which unconditionally calls `.json()` on every response and would throw on an empty body. A new `useAuthenticatedImage` hook fetches the avatar as an authenticated blob (the backend redirects `GET /auth/{userId}/profile-picture` to a public storage URL, but `<img>` can't send an `Authorization` header, so the fetch has to happen in JS). `ConfirmContext`/`ConfirmDialog` get a small backward-compatible addition (optional custom confirm-button label) so the logout confirmation can say "Sair" instead of the hardcoded "Excluir".

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, `react-router-dom` v7.6. No test runner configured — verification is `npx tsc -b` plus manual browser verification tasks.

**Reference spec:** `docs/superpowers/specs/2026-07-26-profile-screen-design.md`

**Working directory for all steps below:** `/home/rocha/Projetos/flowfuel-frontend`

## Global Constraints

- No new npm dependencies.
- No backend changes — every endpoint used here already exists and is already used by the mobile app for the equivalent screens.
- Avatar upload has no crop editor (same deliberate simplification as the vehicle-photo feature): file input + circular preview.
- `changePasswordRequest`, `deleteProfilePictureRequest`, and `deleteAccountRequest` must NOT go through `authenticatedRequest` — their backend endpoints return an empty body (`204`/`200` with no content), and `authenticatedRequest` always calls `.json()` on the response regardless of status, which throws `SyntaxError` on an empty body.
- `ConfirmContext`'s `confirm(message, confirmLabel?)` keeps `confirmLabel` optional and defaulting to `'Excluir'` — every existing call site (`Refuels.tsx`, `VehicleEvents.tsx`) calls `confirm(message)` with one argument and must keep behaving identically.
- Editing the phone field to empty and saving must actually clear it server-side — send `phone: phone.trim()` (possibly `""`) to `PUT /auth/{userId}/profile`, never `phone: null` (the backend treats a `null` phone as "leave unchanged", not "clear").

---

## File Structure

```
Create: src/lib/jwt.ts
Modify: src/services/api.ts (add fetchAuthenticatedBlob)
Create: src/hooks/useAuthenticatedImage.ts
Create: src/services/profile.ts
Modify: src/context/ConfirmContext.tsx (optional confirmLabel)
Modify: src/components/ui/ConfirmDialog.tsx (render confirmLabel)
Create: src/components/ui/DeleteAccountDialog.tsx
Create: src/routes/Profile.tsx
Create: src/routes/ProfileEdit.tsx
Create: src/routes/ChangePassword.tsx
Modify: src/App.tsx (3 new routes)
Modify: src/components/layout/NavLinks.tsx (Perfil nav item + Sair button)
```

---

### Task 1: Verify the type-check command

**Files:** none.

- [ ] **Step 1**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit.

---

### Task 2: `src/lib/jwt.ts` — decode `userId` from the JWT

**Files:**
- Create: `src/lib/jwt.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `decodeUserIdFromToken(token: string): number | null`. Consumed by `Profile.tsx`, `ProfileEdit.tsx`, `ChangePassword.tsx` (Tasks 8-10).

- [ ] **Step 1: Create the file**

```ts
// src/lib/jwt.ts
export function decodeUserIdFromToken(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(atob(normalized))
    const value = claims.userId

    if (typeof value === 'number') return value
    if (typeof value === 'string') return Number(value) || null
    return null
  } catch {
    return null
  }
}
```

The backend's `JwtUtil.generateToken` (`flowfuel` repo, `config/JwtUtil.java`) puts the user id in a `userId` claim (`.claim("userId", userId)`) — JWTs are signed, not encrypted, so this is safe to read client-side without verifying the signature (the backend still verifies it on every authenticated request; this is purely for the frontend to know which `/auth/{userId}/...` URL to call).

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/lib/jwt.ts
git commit -m "feat: add JWT userId decoder for profile endpoints"
```

---

### Task 3: `services/api.ts` — add `fetchAuthenticatedBlob`

**Files:**
- Modify: `src/services/api.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `fetchAuthenticatedBlob(path: string): Promise<Blob>`. Consumed by `useAuthenticatedImage` (Task 4).

- [ ] **Step 1: Read the current file and confirm it matches**

The file should currently end with the `uploadVehiclePhoto` function added in the vehicle-wizard plan (`2026-07-26-account-activation-vehicle-wizard.md`). Confirm with:

Run: `grep -n "export async function uploadVehiclePhoto" -A 20 /home/rocha/Projetos/flowfuel-frontend/src/services/api.ts`

- [ ] **Step 2: Append the new function at the end of the file**

```ts
export async function fetchAuthenticatedBlob(path: string): Promise<Blob> {
  const token = localStorage.getItem('@token')

  const response = await fetch(`${BASE_URL}/api/v1${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Erro ao carregar imagem')
  }

  return response.blob()
}
```

Note: `path` here is the internal path the backend already returns (e.g. `/auth/123/profile-picture`), which does **not** include the `/api/v1` prefix — this function adds it, same as every other function in this file. This deliberately does its own `fetch` instead of `authenticatedRequest` because it needs `.blob()`, not `.json()`.

- [ ] **Step 3: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 4: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/services/api.ts
git commit -m "feat: add fetchAuthenticatedBlob for loading images that require auth"
```

---

### Task 4: `src/hooks/useAuthenticatedImage.ts`

**Files:**
- Create: `src/hooks/useAuthenticatedImage.ts`

**Interfaces:**
- Consumes: `fetchAuthenticatedBlob(path)` (Task 3).
- Produces: `useAuthenticatedImage(path: string | null): string | null` — returns an object URL (or `null` while loading / on failure / when `path` is `null`). Consumed by `Profile.tsx` (Task 8).

- [ ] **Step 1: Create the file**

```ts
// src/hooks/useAuthenticatedImage.ts
import { useEffect, useState } from 'react'
import { fetchAuthenticatedBlob } from '../services/api'

export function useAuthenticatedImage(path: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!path) {
      setUrl(null)
      return
    }

    let objectUrl: string | null = null
    let cancelled = false

    fetchAuthenticatedBlob(path)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setUrl(null)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path])

  return url
}
```

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/hooks/useAuthenticatedImage.ts
git commit -m "feat: add useAuthenticatedImage hook for avatar display"
```

---

### Task 5: `src/services/profile.ts`

**Files:**
- Create: `src/services/profile.ts`

**Interfaces:**
- Consumes: `authenticatedRequest` (`services/api.ts`), `PageResponse<T>` (`types/Page.ts`).
- Produces: `UserProfile` type, `ProfileStats` type, `getProfileRequest(userId)`, `updateProfileRequest(userId, {name, phone})`, `getProfileStats()`, `changePasswordRequest(userId, current, next)`, `uploadProfilePictureRequest(userId, file)`, `deleteProfilePictureRequest(userId)`, `deleteAccountRequest(userId)`. Consumed by `Profile.tsx`, `ProfileEdit.tsx`, `ChangePassword.tsx` (Tasks 8-10).

- [ ] **Step 1: Create the file**

```ts
// src/services/profile.ts
import { authenticatedRequest } from './api'
import type { PageResponse } from '../types/Page'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://flowfuel-api.fly.dev'

export interface UserProfile {
  id: number
  email: string
  name: string | null
  phone: string | null
  profilePicture: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface ProfileStats {
  vehiclesCount: number
  refuelsCount: number
  eventsCount: number
}

export function getProfileRequest(userId: number): Promise<UserProfile> {
  return authenticatedRequest(`/auth/${userId}/profile`)
}

export function updateProfileRequest(
  userId: number,
  data: { name: string; phone: string }
): Promise<UserProfile> {
  return authenticatedRequest(`/auth/${userId}/profile`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function getProfileStats(): Promise<ProfileStats> {
  const vehiclesPage: PageResponse<{ id: number }> = await authenticatedRequest(
    '/vehicles?size=100'
  )
  const vehicles = vehiclesPage.content

  const [refuelCounts, eventCounts] = await Promise.all([
    Promise.all(
      vehicles.map((v) =>
        authenticatedRequest(`/refuels/vehicle/${v.id}?page=0&size=1`).then(
          (page: PageResponse<unknown>) => page.totalElements
        )
      )
    ),
    Promise.all(
      vehicles.map((v) =>
        authenticatedRequest(`/vehicle-events/vehicle/${v.id}?page=0&size=1`).then(
          (page: PageResponse<unknown>) => page.totalElements
        )
      )
    ),
  ])

  return {
    vehiclesCount: vehicles.length,
    refuelsCount: refuelCounts.reduce((sum, n) => sum + n, 0),
    eventsCount: eventCounts.reduce((sum, n) => sum + n, 0),
  }
}

export async function changePasswordRequest(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const token = localStorage.getItem('@token')
  const response = await fetch(`${BASE_URL}/api/v1/auth/${userId}/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  })

  if (!response.ok) {
    try {
      const err = await response.json()
      throw new Error(err.detail || 'Não foi possível trocar a senha')
    } catch {
      throw new Error('Não foi possível trocar a senha')
    }
  }
}

export async function uploadProfilePictureRequest(
  userId: number,
  file: File
): Promise<{ internalUrl: string }> {
  const token = localStorage.getItem('@token')
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${BASE_URL}/api/v1/auth/${userId}/upload-profile-picture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Não foi possível enviar a foto')
  }

  return response.json()
}

export async function deleteProfilePictureRequest(userId: number): Promise<void> {
  const token = localStorage.getItem('@token')
  const response = await fetch(`${BASE_URL}/api/v1/auth/${userId}/profile-picture`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Não foi possível remover a foto')
  }
}

export async function deleteAccountRequest(userId: number): Promise<void> {
  const token = localStorage.getItem('@token')
  const response = await fetch(`${BASE_URL}/api/v1/auth/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Não foi possível excluir a conta')
  }
}
```

Notes:
- `changePasswordRequest`, `deleteProfilePictureRequest`, `deleteAccountRequest` deliberately do their own `fetch` and never call `.json()` on the response — their backend endpoints (`UserController.changePassword`/`deleteProfilePicture`/`deleteUser`) return an empty body (`204` or `200` with no content), and `authenticatedRequest` would throw trying to parse that as JSON.
- `changePasswordRequest` also deliberately does **not** use `authenticatedRequest` for a second reason: a wrong current password returns `401` with `ProblemDetail.detail = "Senha atual inválida"` (`AuthService.changePassword` throws `BadCredentialsException`, confirmed in `flowfuel` repo's `GlobalExceptionHandler.handleBadCredentials`) — if this went through `authenticatedRequest`, its blanket `401 → clearSession + redirect /login` behavior would log the user out instead of showing "senha atual inválida" inline.
- `updateProfileRequest`'s `phone` parameter is `string`, not `string | null` — sending `phone: null` would be interpreted by the backend as "leave unchanged" (`UserProfileService.updateUserProfile`: `if (dto.phone() != null) user.setPhone(...)`), so clearing the field and saving must send `phone: ""`, not `phone: null`.
- `getProfileStats` mirrors the mobile app's `GetProfileStatsUseCase`: no dedicated stats endpoint exists, so it fetches all vehicles then, for each one, the first page (`size=1`) of refuels and events just to read `totalElements`, summing across vehicles.

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/services/profile.ts
git commit -m "feat: add profile service (get/update profile, stats, password, picture, delete account)"
```

---

### Task 6: `ConfirmContext`/`ConfirmDialog` — optional custom confirm label

**Files:**
- Modify: `src/context/ConfirmContext.tsx` (full replacement below)
- Modify: `src/components/ui/ConfirmDialog.tsx` (full replacement below)

**Interfaces:**
- Consumes: nothing new.
- Produces: `useConfirm(): (message: string, confirmLabel?: string) => Promise<boolean>` — every existing call site (`confirm(message)`, one argument) keeps working identically since `confirmLabel` defaults to `'Excluir'`. Consumed by `NavLinks.tsx` (Task 12) and `Profile.tsx` (Task 8) as `confirm(message, 'Sair')` / `confirm(message, 'Remover')`.

- [ ] **Step 1: Replace `src/context/ConfirmContext.tsx`**

```tsx
// src/context/ConfirmContext.tsx
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface ConfirmRequest {
  message: string
  confirmLabel: string
  resolve: (value: boolean) => void
}

interface ConfirmContextData {
  request: ConfirmRequest | null
  confirm: (message: string, confirmLabel?: string) => Promise<boolean>
  resolveRequest: (value: boolean) => void
}

const ConfirmContext = createContext<ConfirmContextData>({} as ConfirmContextData)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)

  const confirm = useCallback((message: string, confirmLabel = 'Excluir') => {
    return new Promise<boolean>((resolve) => {
      setRequest({ message, confirmLabel, resolve })
    })
  }, [])

  const resolveRequest = useCallback(
    (value: boolean) => {
      request?.resolve(value)
      setRequest(null)
    },
    [request]
  )

  return (
    <ConfirmContext.Provider value={{ request, confirm, resolveRequest }}>
      {children}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const { confirm } = useContext(ConfirmContext)
  return confirm
}

export function useConfirmRequest() {
  const { request, resolveRequest } = useContext(ConfirmContext)
  return { request, resolveRequest }
}
```

- [ ] **Step 2: Replace `src/components/ui/ConfirmDialog.tsx`**

```tsx
// src/components/ui/ConfirmDialog.tsx
import { useEffect, useRef } from 'react'
import { useConfirmRequest } from '../../context/ConfirmContext'

export function ConfirmDialog() {
  const { request, resolveRequest } = useConfirmRequest()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const triggerElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!request) return

    triggerElementRef.current = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') resolveRequest(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      triggerElementRef.current?.focus()
    }
  }, [request, resolveRequest])

  if (!request) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => resolveRequest(false)}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={request.message}
        className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
      >
        <p className="mb-6 text-base text-gray-900">{request.message}</p>
        <div className="flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => resolveRequest(false)}
            className="rounded-lg px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => resolveRequest(true)}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
```

The only change from the current file is the last button's text: `{request.confirmLabel}` instead of the hardcoded `Excluir`.

- [ ] **Step 3: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 4: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/context/ConfirmContext.tsx src/components/ui/ConfirmDialog.tsx
git commit -m "feat: allow ConfirmDialog to use a custom confirm button label"
```

---

### Task 7: `src/components/ui/DeleteAccountDialog.tsx`

**Files:**
- Create: `src/components/ui/DeleteAccountDialog.tsx`

**Interfaces:**
- Consumes: `TextField` (`components/ui/TextField.tsx`).
- Produces: `DeleteAccountDialog({ onConfirm, onDismiss }: { onConfirm: () => void; onDismiss: () => void })`. Consumed by `Profile.tsx` (Task 8).

- [ ] **Step 1: Create the file**

```tsx
// src/components/ui/DeleteAccountDialog.tsx
import { useState } from 'react'
import { TextField } from './TextField'

export function DeleteAccountDialog({
  onConfirm,
  onDismiss,
}: {
  onConfirm: () => void
  onDismiss: () => void
}) {
  const [input, setInput] = useState('')
  const canDelete = input === 'DELETE'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onDismiss} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Excluir conta permanentemente?"
        className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
      >
        <p className="mb-3 text-base font-bold text-gray-900">Excluir conta permanentemente?</p>
        <p className="mb-2 text-sm text-gray-600">
          Esta ação é irreversível. Ao excluir sua conta:
        </p>
        <ul className="mb-4 list-disc pl-5 text-sm text-gray-600">
          <li>Todos os seus dados serão removidos</li>
          <li>Seu histórico de abastecimentos será perdido</li>
          <li>Seus veículos cadastrados serão excluídos</li>
        </ul>
        <TextField
          placeholder="Digite DELETE para confirmar"
          value={input}
          onChange={(e) => setInput(e.target.value)}
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
            onClick={onConfirm}
            disabled={!canDelete}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/components/ui/DeleteAccountDialog.tsx
git commit -m "feat: add DeleteAccountDialog with type-DELETE-to-confirm"
```

---

### Task 8: `src/routes/Profile.tsx`

**Files:**
- Create: `src/routes/Profile.tsx`

**Interfaces:**
- Consumes: `useAuth()` (`context/AuthContext.tsx`), `useConfirm()` (Task 6), `useToast()` (`context/ToastContext.tsx`), `useAuthenticatedImage` (Task 4), `decodeUserIdFromToken` (Task 2), `getProfileRequest`/`getProfileStats`/`uploadProfilePictureRequest`/`deleteProfilePictureRequest`/`deleteAccountRequest`/`UserProfile`/`ProfileStats` (Task 5), `DeleteAccountDialog` (Task 7), `Screen`/`Button`/`Spinner` (existing).
- Produces: `Profile` component. Consumed by `App.tsx` (Task 11).

- [ ] **Step 1: Create the file**

```tsx
// src/routes/Profile.tsx
import { useEffect, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import { useAuthenticatedImage } from '../hooks/useAuthenticatedImage'
import { decodeUserIdFromToken } from '../lib/jwt'
import {
  deleteAccountRequest,
  deleteProfilePictureRequest,
  getProfileRequest,
  getProfileStats,
  uploadProfilePictureRequest,
  type ProfileStats,
  type UserProfile,
} from '../services/profile'
import { Screen } from '../components/ui/Screen'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { DeleteAccountDialog } from '../components/ui/DeleteAccountDialog'

export function Profile() {
  const { token, signOut } = useAuth()
  const confirm = useConfirm()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const userId = token ? decodeUserIdFromToken(token) : null

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const avatarUrl = useAuthenticatedImage(profile?.profilePicture ?? null)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    if (!userId) {
      setError(true)
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(false)
      const data = await getProfileRequest(userId)
      setProfile(data)
    } catch (err) {
      console.log(err)
      setError(true)
    } finally {
      setLoading(false)
    }
    getProfileStats()
      .then(setStats)
      .catch((err) => console.log(err))
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setIsUploadingPhoto(true)
    try {
      await uploadProfilePictureRequest(userId, file)
      await load()
    } catch (err) {
      console.log(err)
      showToast('Não foi possível enviar a foto')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  async function handleDeletePhoto() {
    if (!userId) return
    if (!(await confirm('Remover foto do perfil?', 'Remover'))) return

    setIsDeletingPhoto(true)
    try {
      await deleteProfilePictureRequest(userId)
      await load()
    } catch (err) {
      console.log(err)
      showToast('Não foi possível remover a foto')
    } finally {
      setIsDeletingPhoto(false)
    }
  }

  async function handleLogout() {
    if (!(await confirm('Tem certeza que deseja sair?', 'Sair'))) return
    await signOut()
    navigate('/login')
  }

  async function handleDeleteAccountConfirmed() {
    if (!userId) return
    setShowDeleteDialog(false)
    setIsDeletingAccount(true)
    try {
      await deleteAccountRequest(userId)
      await signOut()
      navigate('/login')
    } catch (err) {
      console.log(err)
      showToast('Não foi possível excluir a conta')
      setIsDeletingAccount(false)
    }
  }

  if (loading) {
    return (
      <Screen centered>
        <Spinner />
      </Screen>
    )
  }

  if (error || !profile) {
    return (
      <Screen centered>
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-600">Não foi possível carregar seu perfil.</p>
          <Button onClick={load} className="w-auto px-4">
            Tentar novamente
          </Button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen wide>
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">Perfil</h1>

      <div className="flex flex-col items-center gap-4">
        <label className="relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-gray-300 bg-gray-50">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl font-bold text-gray-400">
              {(profile.name ?? profile.email).charAt(0).toUpperCase()}
            </span>
          )}
          {isUploadingPhoto && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Spinner />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
            disabled={isUploadingPhoto || isDeletingPhoto}
          />
        </label>

        {profile.profilePicture && (
          <button
            type="button"
            onClick={handleDeletePhoto}
            disabled={isDeletingPhoto || isUploadingPhoto}
            className="text-sm font-bold text-red-600 disabled:opacity-60"
          >
            {isDeletingPhoto ? 'Removendo...' : 'Remover foto'}
          </button>
        )}

        <p className="text-lg font-bold text-gray-900">{profile.name ?? profile.email}</p>
      </div>

      <div className="mt-6 flex justify-evenly">
        <StatItem count={stats?.vehiclesCount} label="Veículos" />
        <StatItem count={stats?.refuelsCount} label="Abastecimentos" />
        <StatItem count={stats?.eventsCount} label="Eventos" />
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
        <InfoField label="Email" value={profile.email} />
        <InfoField label="Telefone" value={profile.phone ?? 'Não informado'} />
        {profile.createdAt && (
          <InfoField
            label="Membro desde"
            value={new Date(profile.createdAt).toLocaleDateString('pt-BR')}
          />
        )}
      </div>

      <div className="mt-6 flex flex-col overflow-hidden rounded-xl bg-white shadow-sm">
        <ActionRow label="Editar perfil" onClick={() => navigate('/profile/edit')} />
        <div className="border-t border-gray-100" />
        <ActionRow label="Trocar senha" onClick={() => navigate('/profile/change-password')} />
      </div>

      <div className="mt-6">
        <Button onClick={handleLogout}>Sair</Button>
      </div>

      <div className="mt-8 flex flex-col gap-3 rounded-xl border border-red-200 p-4">
        <p className="text-center text-sm font-bold text-red-600">Zona de Perigo</p>
        <button
          type="button"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isDeletingAccount}
          className="h-12 rounded-lg bg-red-600 text-base font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
        >
          {isDeletingAccount ? 'Excluindo...' : 'Excluir conta permanentemente'}
        </button>
      </div>

      {showDeleteDialog && (
        <DeleteAccountDialog
          onConfirm={handleDeleteAccountConfirmed}
          onDismiss={() => setShowDeleteDialog(false)}
        />
      )}
    </Screen>
  )
}

function StatItem({ count, label }: { count: number | undefined; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-xl font-bold text-green-700">{count ?? '–'}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-500">{label}</p>
      <p className="text-base text-gray-900">{value}</p>
    </div>
  )
}

function ActionRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between px-4 py-3 text-left text-base text-gray-900 hover:bg-gray-50"
    >
      {label}
      <span className="text-gray-400">›</span>
    </button>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/routes/Profile.tsx
git commit -m "feat: add profile hub screen (avatar, stats, info, actions, danger zone)"
```

---

### Task 9: `src/routes/ProfileEdit.tsx`

**Files:**
- Create: `src/routes/ProfileEdit.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `useToast()`, `decodeUserIdFromToken` (Task 2), `getProfileRequest`/`updateProfileRequest` (Task 5).
- Produces: `ProfileEdit` component. Consumed by `App.tsx` (Task 11).

- [ ] **Step 1: Create the file**

```tsx
// src/routes/ProfileEdit.tsx
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { decodeUserIdFromToken } from '../lib/jwt'
import { getProfileRequest, updateProfileRequest } from '../services/profile'
import { Screen } from '../components/ui/Screen'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'

export function ProfileEdit() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const userId = token ? decodeUserIdFromToken(token) : null

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [nameError, setNameError] = useState(false)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    getProfileRequest(userId)
      .then((profile) => {
        setName(profile.name ?? '')
        setPhone(profile.phone ?? '')
      })
      .catch((err) => {
        console.log(err)
        showToast('Não foi possível carregar seu perfil')
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!userId || submitting) return

    if (!name.trim()) {
      setNameError(true)
      return
    }

    setSubmitting(true)
    try {
      await updateProfileRequest(userId, { name: name.trim(), phone: phone.trim() })
      showToast('Perfil atualizado com sucesso.', 'success')
      navigate('/profile')
    } catch (err) {
      console.log(err)
      showToast('Não foi possível salvar as alterações')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Screen centered>
        <Spinner />
      </Screen>
    )
  }

  return (
    <Screen>
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">Editar Perfil</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          placeholder="Nome"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setNameError(false)
          }}
        />
        {nameError && <p className="text-sm text-red-600">Informe seu nome.</p>}

        <TextField
          placeholder="Telefone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Salvar'}
        </Button>

        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="block w-full text-center text-sm text-green-700"
        >
          Cancelar
        </button>
      </form>
    </Screen>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/routes/ProfileEdit.tsx
git commit -m "feat: add edit profile screen (name/phone)"
```

---

### Task 10: `src/routes/ChangePassword.tsx`

**Files:**
- Create: `src/routes/ChangePassword.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `useToast()`, `decodeUserIdFromToken` (Task 2), `changePasswordRequest` (Task 5).
- Produces: `ChangePassword` component. Consumed by `App.tsx` (Task 11).

- [ ] **Step 1: Create the file**

```tsx
// src/routes/ChangePassword.tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { decodeUserIdFromToken } from '../lib/jwt'
import { changePasswordRequest } from '../services/profile'
import { Screen } from '../components/ui/Screen'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'

export function ChangePassword() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const userId = token ? decodeUserIdFromToken(token) : null

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!userId || submitting) return

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Preencha todos os campos')
      return
    }
    if (newPassword.length < 6) {
      showToast('A nova senha deve ter no mínimo 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('As senhas não coincidem')
      return
    }

    setSubmitting(true)
    setCurrentPasswordError(null)
    try {
      await changePasswordRequest(userId, currentPassword, newPassword)
      showToast('Senha alterada com sucesso.', 'success')
      navigate('/profile')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível trocar a senha'
      setCurrentPasswordError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Screen>
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">Trocar Senha</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <TextField
            placeholder="Senha atual"
            type="password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value)
              setCurrentPasswordError(null)
            }}
          />
          {currentPasswordError && (
            <p className="mt-1 text-sm text-red-600">{currentPasswordError}</p>
          )}
        </div>

        <TextField
          placeholder="Nova senha"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <TextField
          placeholder="Confirmar nova senha"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Trocar senha'}
        </Button>

        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="block w-full text-center text-sm text-green-700"
        >
          Cancelar
        </button>
      </form>
    </Screen>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/routes/ChangePassword.tsx
git commit -m "feat: add change password screen"
```

---

### Task 11: Register the 3 new routes in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `Profile` (Task 8), `ProfileEdit` (Task 9), `ChangePassword` (Task 10).
- Produces: nothing new.

- [ ] **Step 1: Read the current file and confirm it matches**

This file was last touched by the account-activation/vehicle-wizard plan (adds `/activate`). Confirm its current routes block with:

Run: `grep -n "<Route" /home/rocha/Projetos/flowfuel-frontend/src/App.tsx`

Expected to see (among others) `/select-vehicle`, `/vehicles/new`, `/`, `/refuels`, `/vehicle-events`, `/export` inside the `ProtectedRoute`/`AppLayout` block. If the file doesn't match this shape, re-read it in full before editing — it's a shared file touched by many plans in this repo.

- [ ] **Step 2: Add the imports**

Add next to the other route imports:

```tsx
import { Profile } from './routes/Profile'
import { ProfileEdit } from './routes/ProfileEdit'
import { ChangePassword } from './routes/ChangePassword'
```

- [ ] **Step 3: Add the routes**

Inside the `<Route element={<AppLayout />}>` block, next to `<Route path="/export" element={<Export />} />`:

```tsx
                    <Route path="/export" element={<Export />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/profile/edit" element={<ProfileEdit />} />
                    <Route path="/profile/change-password" element={<ChangePassword />} />
```

- [ ] **Step 4: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 5: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/App.tsx
git commit -m "feat: register /profile, /profile/edit, /profile/change-password routes"
```

---

### Task 12: `NavLinks.tsx` — Perfil nav item + Sair logout button

**Files:**
- Modify: `src/components/layout/NavLinks.tsx` (full replacement below)

**Interfaces:**
- Consumes: `useAuth()`, `useConfirm()` (Task 6).
- Produces: nothing new — same `NavLinks({ onNavigate }: { onNavigate?: () => void })` export used by both `Sidebar.tsx` and `MobileDrawer.tsx` already.

- [ ] **Step 1: Read the current file and confirm it matches**

```tsx
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/refuels', label: 'Abastecimentos', icon: '⛽', end: false },
  { to: '/vehicle-events', label: 'Eventos', icon: '🔧', end: false },
  { to: '/export', label: 'Exportar', icon: '📤', end: false },
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

- [ ] **Step 2: Replace it**

```tsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useConfirm } from '../../context/ConfirmContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/refuels', label: 'Abastecimentos', icon: '⛽', end: false },
  { to: '/vehicle-events', label: 'Eventos', icon: '🔧', end: false },
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

      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-green-50"
      >
        <span className="text-base">🚪</span>
        Sair
      </button>
    </nav>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 4: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/components/layout/NavLinks.tsx
git commit -m "feat: add Perfil nav item and Sair logout button to sidebar/drawer"
```

---

### Task 13: Manual verification — profile screens

**Files:** none — manual browser pass. Requires a logged-in session (the QA account from memory, `yhe66@web-library.net`, or any activated account).

- [ ] **Step 1: Start the dev server**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npm run dev`, log in.

- [ ] **Step 2: Sidebar/drawer**

Confirm a "Perfil" link and a "Sair" button both appear at the bottom of the sidebar (desktop) and the mobile drawer (resize the window or use devtools device toolbar). Click "Sair": confirm a dialog appears with the message "Tem certeza que deseja sair?" and a button labeled **"Sair"** (not "Excluir") plus "Cancelar". Click "Cancelar" — confirm you stay logged in. Click "Sair" on the nav again and confirm this time — confirm you're logged out and redirected to `/login`.

- [ ] **Step 3: `/profile` hub**

Log back in, navigate to `/profile`. Confirm: avatar placeholder (first letter of name/email) when there's no photo; name/email; three stat numbers (Veículos/Abastecimentos/Eventos) that roughly match what you see on `/select-vehicle`, `/refuels`, `/vehicle-events`; Email/Telefone/Membro desde fields; "Editar perfil" and "Trocar senha" rows; "Sair" button; red "Zona de Perigo" box with "Excluir conta permanentemente".

- [ ] **Step 4: Avatar upload/remove**

Click the avatar circle, pick an image file. Confirm a spinner overlay shows briefly, then the picture appears in the circle. Reload the page (`F5`) — confirm the picture is still there (proves it survived a fresh `GET /auth/{userId}/profile` + blob fetch, not just local state). Click "Remover foto" — confirm a dialog appears asking "Remover foto do perfil?" with a button labeled **"Remover"** — confirm it, and confirm the avatar goes back to the letter placeholder.

- [ ] **Step 5: Editar perfil**

Click "Editar perfil". Confirm the Nome/Telefone fields are pre-filled with your current data. Clear the Nome field and click "Salvar" — confirm a red error appears and it doesn't submit. Type a new name and a phone number, save — confirm a success toast and redirect back to `/profile` with the new name showing. Go back into "Editar perfil", clear the Telefone field entirely, save, and confirm on `/profile` that "Telefone" now shows "Não informado" (proves the empty-string-not-null fix works).

- [ ] **Step 6: Trocar senha**

Click "Trocar senha". Try submitting with an empty field — confirm a toast ("Preencha todos os campos"). Try a new password under 6 characters — confirm the toast about minimum length. Try mismatched new/confirm passwords — confirm the toast about mismatch. Enter a **wrong** current password with valid new/confirm — confirm a red inline error under "Senha atual" reading something like "Senha atual inválida" (not a toast, and confirm you're NOT logged out / redirected to `/login`). Finally, enter the correct current password and a new one — confirm success toast, redirect to `/profile`, then log out and log back in with the **new** password to confirm it actually changed.

- [ ] **Step 7: Excluir conta (use a throwaway test account for this one)**

On a disposable test account (not your main one), go to `/profile` → "Excluir conta permanentemente". Confirm the dialog lists the consequences and the "Excluir" button stays disabled until you type exactly `DELETE` in the field. Type something else first (e.g. `delete` lowercase) — confirm the button stays disabled. Type `DELETE` — confirm the button enables — click it — confirm you're logged out and redirected to `/login`, and that logging back in with that email/password now fails (account is gone).

---

### Task 14: Deploy and smoke-test in production

**Files:** none.

- [ ] **Step 1: Deploy**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && git push origin main`

- [ ] **Step 2: Wait for the Render deploy and confirm the new bundle is live**

Run: `curl -s https://flowfuel-web.onrender.com/ | grep -o 'assets/index-[^"]*\.js'`, then `curl -s -I https://flowfuel-web.onrender.com/ | grep -i last-modified` — confirm the timestamp is recent (after the push) and the asset hash changed from before this deploy.

- [ ] **Step 3: Re-run the critical path in production**

Repeat Task 13's Steps 2, 3, 4 (nav logout label, profile hub loads with correct stats, avatar upload survives reload) against `https://flowfuel-web.onrender.com` instead of `localhost:5173`.

---

## Self-Review

**Cobertura do spec:**
- Decodificação do `userId` via JWT (sem mudar `AuthContext`) → Task 2.
- Avatar via blob autenticado (sem `<img>` com header) → Tasks 3-4.
- `GET/PUT /auth/{userId}/profile`, `PUT .../password`, upload/delete de foto, `DELETE /auth/{userId}` → Task 5.
- Estatísticas agregadas no cliente (sem endpoint dedicado) → Task 5 (`getProfileStats`).
- Hub de perfil (avatar, nome, stats, campos, ações, zona de perigo) → Task 8.
- Editar perfil (nome/telefone, incluindo o fix de "telefone vazio deve limpar, não `null`") → Task 9.
- Trocar senha (validação client-side + erro inline de senha atual errada sem deslogar) → Task 10.
- Excluir conta com confirmação "DELETE" → Task 7 + Task 8.
- Logout na tela de perfil e no menu (sidebar/drawer) → Tasks 8 e 12.
- Rótulo customizável do `ConfirmDialog` pra "Sair"/"Remover" em vez do "Excluir" fixo → Task 6.
- Rotas `/profile`, `/profile/edit`, `/profile/change-password` → Task 11.

**Placeholder scan:** nenhum "TBD"/"TODO" — todo step tem código completo ou comando exato, incluindo os arquivos inteiros reescritos nas Tasks 6 e 12.

**Consistência de tipos:** `decodeUserIdFromToken(token: string): number | null` (Task 2) é chamado como `token ? decodeUserIdFromToken(token) : null` em `Profile.tsx`/`ProfileEdit.tsx`/`ChangePassword.tsx` (Tasks 8-10), sempre tratando o resultado como `number | null`. `useAuthenticatedImage(path: string | null): string | null` (Task 4) é chamado como `useAuthenticatedImage(profile?.profilePicture ?? null)` em `Profile.tsx` — tipos batem. `getProfileRequest`/`updateProfileRequest`/`getProfileStats`/`changePasswordRequest`/`uploadProfilePictureRequest`/`deleteProfilePictureRequest`/`deleteAccountRequest` (Task 5) são chamados com os mesmos tipos de parâmetro nas Tasks 8-10. `confirm(message: string, confirmLabel?: string)` (Task 6) é chamado com dois argumentos em `Profile.tsx` (`'Sair'`, `'Remover'`) e `NavLinks.tsx` (`'Sair'`), e com um argumento nos call sites pré-existentes (`Refuels.tsx`, `VehicleEvents.tsx`, não tocados por este plano) — todos compatíveis com a nova assinatura.

**Nota sobre arquivos compartilhados:** `src/App.tsx` (Task 11) e `src/components/layout/NavLinks.tsx` (Task 12) já foram tocados por planos anteriores neste repo — o executor deve reconferir o conteúdo real antes de aplicar os Steps de edição caso não bata exatamente com o mostrado.
