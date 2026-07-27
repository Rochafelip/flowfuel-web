# Account Activation + Vehicle Registration Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a working account-activation page (`/activate`) to the web frontend — which today has none — and rebuild `/vehicles/new` as a 4-step wizard matching the mobile app's field set (vehicle type, FIPE for cars *and* motorcycles, energy/fuel type, conditional tank/battery capacity, license-plate formatting, optional photo).

**Architecture:** Two additive API functions (`resendActivationRequest`, `activateRequest`) plus one multipart helper (`uploadVehiclePhoto`) in `services/api.ts`; a new `Activate.tsx` route wired from `Register.tsx`; `services/fipe.ts` and `hooks/useFipeSelection.ts` parametrized by vehicle category (`carros`/`motos`) instead of hardcoded to cars; `VehicleNew.tsx` rewritten in place as a single-file wizard (step components defined in the same file, mirroring how the mobile app keeps `AddVehicleScreen.kt` as one file) using local `useState` per field, no new state-management library.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, `react-router-dom` v7.6. No test runner configured in this project — verification is `npx tsc -b` (not `--noEmit`, which fails with `TS6310` in this composite project) plus manual browser verification tasks.

**Reference spec:** `docs/superpowers/specs/2026-07-26-account-activation-vehicle-wizard-design.md`

**Working directory for all steps below:** `/home/rocha/Projetos/flowfuel-frontend`

## Global Constraints

- No new npm dependencies — everything in plain React + Tailwind, following existing patterns (`SegmentedToggle`, `TextField`, `Button`, `Screen`).
- Backend contract is fixed and already deployed — no backend changes in this plan: `POST /auth/activate` `{token}` → `{accessToken, refreshToken, ...}`; `POST /auth/resend-activation` `{email}` → generic message (anti-enumeration, no rate-limit header to parse); `POST /vehicles` accepts `type` (`"Carro"`/`"Moto"`), `energyType` (`"COMBUSTION"`/`"ELECTRIC"`/`"HYBRID"`), `fuelSubType`, `currentKm`, `capacity` (tank, required-ish), `batteryCapacity`, `brand`, `model`, `manufactureYear`, `modelYear`, `color`, `licensePlate`; `POST /vehicles/{id}/photo` is multipart.
- Vehicle photo is **optional** on web (deliberate deviation from mobile, which requires it) — no crop/recoup editor, just a file input + circular preview.
- Cooldown for "reenviar código" is a fixed 30s client-side timer (no backend rate-limit info available today).
- `ToastContext`'s `showToast(message, variant?)` only supports `'success' | 'error'` (no `'info'`) — resend confirmation uses `'success'`.
- `authenticatedRequest` in `services/api.ts` is not modified — its header-merging behavior (`...options` fully replaces the default `headers` object, it does not deep-merge) is why the new photo upload gets its own dedicated function instead of reusing `authenticatedRequest`.

---

## File Structure

```
Modify: src/services/api.ts
Modify: src/services/fipe.ts
Modify: src/hooks/useFipeSelection.ts
Create: src/routes/Activate.tsx
Modify: src/routes/Register.tsx
Modify: src/App.tsx
Modify: src/routes/VehicleNew.tsx
```

---

### Task 1: Verify the type-check command

**Files:** none (setup verification only).

- [ ] **Step 1: Confirm the type-check command**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`

Expected: no output, clean exit (code 0). If `npx tsc` fails with a permission/PATH error, use `node node_modules/typescript/bin/tsc -b` in every subsequent task's type-check step instead.

---

### Task 2: `services/api.ts` — activation requests + vehicle photo upload

**Files:**
- Modify: `src/services/api.ts` (full replacement below)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `resendActivationRequest(email: string): Promise<{message: string; activationToken?: string}>`, `activateRequest(token: string): Promise<{accessToken: string; refreshToken: string}>`, `uploadVehiclePhoto(vehicleId: number, file: File): Promise<unknown>`. Consumed by `Activate.tsx` (Task 3) and `VehicleNew.tsx` (Task 9).

- [ ] **Step 1: Replace the file's contents**

```ts
// src/services/api.ts
const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://flowfuel-api.fly.dev'

export function clearSession() {
  localStorage.removeItem('@token')
  localStorage.removeItem('@app_token')
  localStorage.removeItem('@active_vehicle')
}

export async function loginRequest(email: string, password: string) {
  const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error('Email ou senha inválidos')
  }

  return response.json()
}

export async function registerRequest(
  name: string,
  email: string,
  password: string
) {
  const response = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  })

  if (!response.ok) {
    try {
      const err = await response.json()
      throw new Error(err.message || 'Erro ao criar conta')
    } catch {
      throw new Error('Erro ao criar conta')
    }
  }

  return response.json()
}

export async function resendActivationRequest(email: string) {
  const response = await fetch(`${BASE_URL}/api/v1/auth/resend-activation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    throw new Error('Erro ao reenviar o código de ativação')
  }

  return response.json()
}

export async function activateRequest(token: string) {
  const response = await fetch(`${BASE_URL}/api/v1/auth/activate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  })

  if (!response.ok) {
    try {
      const err = await response.json()
      throw new Error(err.detail || 'Código de ativação inválido ou expirado')
    } catch {
      throw new Error('Código de ativação inválido ou expirado')
    }
  }

  return response.json()
}

export async function authenticatedRequest(
  endpoint: string,
  options?: Partial<RequestInit>
) {
  const token = localStorage.getItem('@token')

  const response = await fetch(`${BASE_URL}/api/v1${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...options,
  })

  if (response.status === 401) {
    clearSession()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    throw new Error('Erro na requisição')
  }

  return response.json()
}

export async function uploadVehiclePhoto(vehicleId: number, file: File) {
  const token = localStorage.getItem('@token')
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${BASE_URL}/api/v1/vehicles/${vehicleId}/photo`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  if (response.status === 401) {
    clearSession()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    throw new Error('Erro ao enviar foto do veículo')
  }

  return response.json()
}
```

Note: `uploadVehiclePhoto` deliberately does its own `fetch` instead of calling `authenticatedRequest`, because `authenticatedRequest`'s `...options` spread would fully replace (not merge) the default `headers` object — passing custom headers there would silently drop the `Authorization` header. A multipart request also must *not* set `Content-Type` manually (the browser sets the boundary itself), so this function only sends `Authorization`.

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/services/api.ts
git commit -m "feat: add activation and vehicle-photo-upload API requests"
```

---

### Task 3: Create `src/routes/Activate.tsx`

**Files:**
- Create: `src/routes/Activate.tsx`

**Interfaces:**
- Consumes: `resendActivationRequest`, `activateRequest` (Task 2), `useAuth().signIn` (existing `AuthContext`), `useToast().showToast` (existing `ToastContext`).
- Produces: `Activate` component (default export style not used in this repo — named export `export function Activate()`), consumed by `App.tsx` (Task 5).

- [ ] **Step 1: Create the file**

```tsx
// src/routes/Activate.tsx
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { activateRequest, resendActivationRequest } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'

const RESEND_COOLDOWN_SECONDS = 30

export function Activate() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const { showToast } = useToast()

  const [token, setToken] = useState(searchParams.get('token') ?? '')
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [isActivating, setIsActivating] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS)
    const interval = setInterval(() => {
      setCooldown((current) => {
        if (current <= 1) {
          clearInterval(interval)
          return 0
        }
        return current - 1
      })
    }, 1000)
  }

  async function handleResend() {
    if (isResending || cooldown > 0) return
    setIsResending(true)
    try {
      await resendActivationRequest(email)
      showToast('Código reenviado. Confira seu email.', 'success')
      startCooldown()
    } catch (error) {
      console.log(error)
      showToast('Erro ao reenviar o código.')
    } finally {
      setIsResending(false)
    }
  }

  async function handleActivate(e: FormEvent) {
    e.preventDefault()
    if (!token.trim() || isActivating) return

    setIsActivating(true)
    setTokenError(null)
    try {
      const data = await activateRequest(token.trim())
      await signIn(data.accessToken)
      showToast('Conta ativada com sucesso!', 'success')
      navigate('/')
    } catch (error) {
      setTokenError(
        error instanceof Error ? error.message : 'Código de ativação inválido ou expirado'
      )
    } finally {
      setIsActivating(false)
    }
  }

  return (
    <Screen centered>
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
          Verifique seu email
        </h1>

        <p className="mb-1 text-center text-sm text-gray-600">
          Enviamos um código de ativação para{' '}
          {email ? <span className="font-bold text-gray-900">{email}</span> : 'o seu email'}.
        </p>

        <p className="mb-4 text-center text-sm text-gray-600">
          Cole o código abaixo para ativar sua conta. Não esqueça de checar a pasta de spam.
        </p>

        <form onSubmit={handleActivate} className="flex flex-col gap-3">
          <TextField
            placeholder="Código de ativação"
            value={token}
            onChange={(e) => {
              setToken(e.target.value)
              setTokenError(null)
            }}
          />
          {tokenError && <p className="text-sm text-red-600">{tokenError}</p>}

          <Button type="submit" disabled={!token.trim() || isActivating}>
            {isActivating ? 'Ativando...' : 'Ativar conta'}
          </Button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={isResending || cooldown > 0}
          className="mt-4 block w-full text-center text-sm font-bold text-green-700 disabled:opacity-60"
        >
          {isResending
            ? 'Reenviando...'
            : cooldown > 0
              ? `Reenviar código (${cooldown}s)`
              : 'Reenviar código'}
        </button>

        <Link to="/login" className="mt-3 block text-center text-sm text-green-700">
          Já ativei, entrar
        </Link>
      </div>
    </Screen>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit. (This task alone won't fully clean-build if `App.tsx` doesn't reference the file yet — that's fine, `tsc -b` only errors on files that are actually imported somewhere or fail on their own syntax; this file has no unresolved imports so it type-checks standalone.)

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/routes/Activate.tsx
git commit -m "feat: add account activation page"
```

---

### Task 4: Wire `Register.tsx` to redirect to `/activate`

**Files:**
- Modify: `src/routes/Register.tsx:36-45`

**Interfaces:**
- Consumes: nothing new (still uses `registerRequest`, `useNavigate`).
- Produces: nothing new — just changes the post-success navigation target that Task 5's route must resolve.

- [ ] **Step 1: Read the current block and confirm it matches**

The relevant lines today:

```tsx
    try {
      await registerRequest(name, email, password)

      showToast('Conta criada! Verifique seu email para ativar antes de entrar.', 'success')
      navigate('/login')
    } catch (error) {
      showToast('Erro ao criar conta. Tente novamente.')
      console.error(error)
    }
```

- [ ] **Step 2: Replace it**

```tsx
    try {
      await registerRequest(name, email, password)

      navigate(`/activate?email=${encodeURIComponent(email)}`)
    } catch (error) {
      showToast('Erro ao criar conta. Tente novamente.')
      console.error(error)
    }
```

(The toast is dropped because `Activate.tsx`'s own heading/body already conveys "check your email" — showing both would be redundant.)

- [ ] **Step 3: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 4: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/routes/Register.tsx
git commit -m "feat: redirect to /activate after registering instead of /login"
```

---

### Task 5: Register the `/activate` route in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `Activate` from `./routes/Activate` (Task 3).
- Produces: nothing new.

- [ ] **Step 1: Read the current file and confirm it matches**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { VehicleProvider } from './context/VehicleContext'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './context/ConfirmContext'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { ToastContainer } from './components/ui/ToastContainer'
import { ConfirmDialog } from './components/ui/ConfirmDialog'
import { Login } from './routes/Login'
import { Register } from './routes/Register'
import { SelectVehicle } from './routes/SelectVehicle'
import { VehicleNew } from './routes/VehicleNew'
import { Home } from './routes/Home'
import { Refuels } from './routes/Refuels'
import { RefuelForm } from './routes/RefuelForm'
import { VehicleEvents } from './routes/VehicleEvents'
import { VehicleEventForm } from './routes/VehicleEventForm'
import { Export } from './routes/Export'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
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
                    <Route path="/export" element={<Export />} />
                  </Route>
                </Route>
              </Routes>
              <ToastContainer />
              <ConfirmDialog />
            </VehicleProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
```

If a concurrent session has touched this file since, re-read it for real before editing — this file is shared across many plans in this repo.

- [ ] **Step 2: Add the import and the route**

Add next to the other route imports:

```tsx
import { Activate } from './routes/Activate'
```

Add next to `/register`:

```tsx
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/activate" element={<Activate />} />
```

- [ ] **Step 3: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 4: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/App.tsx
git commit -m "feat: register /activate route"
```

---

### Task 6: Manual verification — account activation

**Files:** none — manual browser pass.

- [ ] **Step 1: Start the dev server**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npm run dev` (leave running; it points at the real deployed backend `https://flowfuel-api.fly.dev` per `services/api.ts`'s default `BASE_URL`, since `VITE_API_URL` isn't set locally).

- [ ] **Step 2: Register a brand-new account**

Open `http://localhost:5173/register` in the browser, submit the form with a **real email address you control** (registering requires a never-used email — the QA account in memory, `yhe66@web-library.net`, is already activated and can't be reused for this test) and any valid name/password.

Expected: redirected to `http://localhost:5173/activate?email=<the email>`, page shows "Verifique seu email" with the email address bolded.

- [ ] **Step 3: Reenviar código**

Click "Reenviar código". Expected: toast "Código reenviado. Confira seu email." (green/success), button becomes "Reenviar código (30s)" and counts down every second to 0, at which point it's clickable again.

- [ ] **Step 4: Ativar com código inválido**

Type any random text (e.g. `xxxxxx`) into the code field and click "Ativar conta". Expected: red inline error text below the field (something like "Código de ativação inválido ou expirado"), the typed text stays in the field (not cleared), no toast, no navigation.

- [ ] **Step 5: Ativar com o código real**

Check the inbox for the email you registered with (or, if the deployed backend has `flowfuel.account-activation.expose-token=true`, read `activationToken` from the network response body of the "Reenviar código" call in devtools instead). Paste the real code into the field and click "Ativar conta".

Expected: toast "Conta ativada com sucesso!" (success), browser navigates to `http://localhost:5173/`, and the app behaves as logged in (same as a normal login) — confirm by checking `localStorage.getItem('@token')` is set in devtools.

- [ ] **Step 6: `?token=` prefill**

Navigate directly to `http://localhost:5173/activate?email=test%40example.com&token=abc123`. Expected: the code field is pre-filled with `abc123` on page load (activation isn't triggered automatically — the user still has to click "Ativar conta").

---

### Task 7: `services/fipe.ts` — parametrize by vehicle category

**Files:**
- Modify: `src/services/fipe.ts` (full replacement below)

**Interfaces:**
- Consumes: nothing.
- Produces: `FipeVehicleCategory = 'carros' | 'motos'` (exported type), `fetchBrands(category)`, `fetchModels(category, brandCode)`, `fetchYears(category, brandCode, modelCode)` — all now take `category` as their first argument. Consumed by `useFipeSelection` (Task 8).

- [ ] **Step 1: Replace the file's contents**

```ts
// src/services/fipe.ts
const FIPE_BASE_URL = 'https://parallelum.com.br/fipe/api/v1'

export type FipeVehicleCategory = 'carros' | 'motos'

export interface FipeOption {
  codigo: string | number
  nome: string
}

async function fipeRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${FIPE_BASE_URL}${path}`)

  if (!response.ok) {
    throw new Error(`Falha ao consultar FIPE: ${response.status}`)
  }

  return response.json()
}

export function fetchBrands(category: FipeVehicleCategory): Promise<FipeOption[]> {
  return fipeRequest<FipeOption[]>(`/${category}/marcas`)
}

export function fetchModels(
  category: FipeVehicleCategory,
  brandCode: string
): Promise<FipeOption[]> {
  return fipeRequest<{ modelos: FipeOption[] }>(
    `/${category}/marcas/${brandCode}/modelos`
  ).then((result) => result.modelos)
}

export function fetchYears(
  category: FipeVehicleCategory,
  brandCode: string,
  modelCode: string
): Promise<FipeOption[]> {
  return fipeRequest<FipeOption[]>(
    `/${category}/marcas/${brandCode}/modelos/${modelCode}/anos`
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: **fails** at this point — `src/hooks/useFipeSelection.ts` still calls `fetchBrands()`/`fetchModels(code)`/`fetchYears(brandCode, code)` with the old (pre-category) argument counts. That's expected; Task 8 fixes it. Confirm the error is specifically in `useFipeSelection.ts` (wrong argument count), not somewhere else.

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/services/fipe.ts
git commit -m "feat: parametrize FIPE service by vehicle category (carros/motos)"
```

(Committing a change that leaves the build red for one task is intentional here — Task 8 is the very next task and fixes it immediately. This mirrors how the two files are really one unit of work split for reviewability.)

---

### Task 8: `hooks/useFipeSelection.ts` — accept category, reset cascade on change

**Files:**
- Modify: `src/hooks/useFipeSelection.ts` (full replacement below)

**Interfaces:**
- Consumes: `fetchBrands(category)`, `fetchModels(category, brandCode)`, `fetchYears(category, brandCode, modelCode)`, `FipeVehicleCategory` (Task 7).
- Produces: `useFipeSelection(category: FipeVehicleCategory)` returning the same shape as before (`brands, models, years, brandCode, modelCode, yearCode, loadingBrands, loadingModels, loadingYears, brandsError, modelsError, yearsError, retryBrands, retryModels, retryYears, selectBrand, selectModel, selectYear, brandName, modelName, modelYear`), now re-fetching brands and clearing the cascade whenever `category` changes. Consumed by `VehicleNew.tsx` (Task 9), which calls `useFipeSelection(vehicleType === 'Carro' ? 'carros' : 'motos')`.

- [ ] **Step 1: Replace the file's contents**

```ts
// src/hooks/useFipeSelection.ts
import { useEffect, useState } from 'react'
import {
  fetchBrands,
  fetchModels,
  fetchYears,
  type FipeOption,
  type FipeVehicleCategory,
} from '../services/fipe'

export function useFipeSelection(category: FipeVehicleCategory) {
  const [brands, setBrands] = useState<FipeOption[]>([])
  const [models, setModels] = useState<FipeOption[]>([])
  const [years, setYears] = useState<FipeOption[]>([])

  const [brandCode, setBrandCode] = useState('')
  const [modelCode, setModelCode] = useState('')
  const [yearCode, setYearCode] = useState('')

  const [loadingBrands, setLoadingBrands] = useState(true)
  const [loadingModels, setLoadingModels] = useState(false)
  const [loadingYears, setLoadingYears] = useState(false)

  const [brandsError, setBrandsError] = useState(false)
  const [modelsError, setModelsError] = useState(false)
  const [yearsError, setYearsError] = useState(false)

  function loadBrands() {
    setLoadingBrands(true)
    setBrandsError(false)
    fetchBrands(category)
      .then(setBrands)
      .catch(() => setBrandsError(true))
      .finally(() => setLoadingBrands(false))
  }

  useEffect(() => {
    setBrandCode('')
    setModelCode('')
    setYearCode('')
    setModels([])
    setYears([])
    loadBrands()
    // loadBrands is intentionally not in the dep array: it closes over `category`
    // itself, and including it would just re-describe this same effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  function selectBrand(code: string) {
    setBrandCode(code)
    setModelCode('')
    setYearCode('')
    setModels([])
    setYears([])

    if (!code) return

    setLoadingModels(true)
    setModelsError(false)
    fetchModels(category, code)
      .then(setModels)
      .catch(() => setModelsError(true))
      .finally(() => setLoadingModels(false))
  }

  function selectModel(code: string) {
    setModelCode(code)
    setYearCode('')
    setYears([])

    if (!code) return

    setLoadingYears(true)
    setYearsError(false)
    fetchYears(category, brandCode, code)
      .then(setYears)
      .catch(() => setYearsError(true))
      .finally(() => setLoadingYears(false))
  }

  function selectYear(code: string) {
    setYearCode(code)
  }

  const brandName = brands.find((b) => String(b.codigo) === brandCode)?.nome ?? ''
  const modelName = models.find((m) => String(m.codigo) === modelCode)?.nome ?? ''
  const modelYear = yearCode ? parseInt(yearCode, 10) : null

  return {
    brands,
    models,
    years,
    brandCode,
    modelCode,
    yearCode,
    loadingBrands,
    loadingModels,
    loadingYears,
    brandsError,
    modelsError,
    yearsError,
    retryBrands: loadBrands,
    retryModels: () => selectBrand(brandCode),
    retryYears: () => selectModel(modelCode),
    selectBrand,
    selectModel,
    selectYear,
    brandName,
    modelName,
    modelYear,
  }
}
```

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: **still fails**, now in `src/routes/VehicleNew.tsx` (it calls `useFipeSelection()` with zero arguments). Confirm the error moved from `useFipeSelection.ts` to `VehicleNew.tsx` — Task 9 fixes it.

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/hooks/useFipeSelection.ts
git commit -m "feat: reset FIPE cascade and refetch brands when vehicle category changes"
```

---

### Task 9: Rewrite `src/routes/VehicleNew.tsx` as a 4-step wizard

**Files:**
- Modify: `src/routes/VehicleNew.tsx` (full replacement below)

**Interfaces:**
- Consumes: `authenticatedRequest`, `uploadVehiclePhoto` (Task 2), `useFipeSelection(category)` (Task 8), `FipeOption` (Task 7), `useVehicle().loadActiveVehicle`, `useToast().showToast`, `Screen`, `TextField`, `Button`, `SegmentedToggle` (all pre-existing, unchanged).
- Produces: `VehicleNew` component (unchanged export name/shape — `App.tsx` already imports `{ VehicleNew }` from this path, no change needed there).

- [ ] **Step 1: Replace the file's contents**

```tsx
// src/routes/VehicleNew.tsx
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest, uploadVehiclePhoto } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import { useFipeSelection } from '../hooks/useFipeSelection'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'
import { SegmentedToggle } from '../components/ui/SegmentedToggle'
import type { FipeOption } from '../services/fipe'

const selectClass =
  'h-12 w-full rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-60'

type VehicleTypeValue = 'Carro' | 'Moto'
type EnergyTypeValue = 'COMBUSTION' | 'ELECTRIC' | 'HYBRID'
type FuelTypeValue = 'Gasolina comum' | 'Etanol' | 'Diesel' | 'Flex' | 'GNV'

const FUEL_OPTIONS: FuelTypeValue[] = ['Gasolina comum', 'Etanol', 'Diesel', 'Flex', 'GNV']

function parseFipeYearLabel(option: FipeOption): number | null {
  const fromCode = parseInt(String(option.codigo).split('-')[0], 10)
  if (!Number.isNaN(fromCode)) return fromCode
  const fromName = parseInt(String(option.nome).slice(0, 4), 10)
  return Number.isNaN(fromName) ? null : fromName
}

function formatLicensePlateDisplay(raw: string): string {
  const isOldFormat = /^[A-Z]{3}\d{4}$/.test(raw)
  return isOldFormat ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw
}

export function VehicleNew() {
  const navigate = useNavigate()
  const { loadActiveVehicle } = useVehicle()
  const { showToast } = useToast()

  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Etapa 1 — Identificação
  const [vehicleType, setVehicleType] = useState<VehicleTypeValue>('Carro')
  const [useFipeSearch, setUseFipeSearch] = useState(true)
  const fipe = useFipeSelection(vehicleType === 'Carro' ? 'carros' : 'motos')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [manufactureYear, setManufactureYear] = useState('')
  const [modelYear, setModelYear] = useState('')
  const [brandError, setBrandError] = useState(false)
  const [modelError, setModelError] = useState(false)
  const [manufactureYearError, setManufactureYearError] = useState(false)
  const [modelYearError, setModelYearError] = useState(false)

  // Etapa 2 — Classificação
  const [energyType, setEnergyType] = useState<EnergyTypeValue>('COMBUSTION')
  const [fuelType, setFuelType] = useState<FuelTypeValue>('Flex')
  const showFuelType = energyType === 'COMBUSTION' || energyType === 'HYBRID'
  const showTankCapacity = energyType === 'COMBUSTION' || energyType === 'HYBRID'
  const showBatteryCapacity = energyType === 'ELECTRIC' || energyType === 'HYBRID'

  // Etapa 3 — Detalhes
  const [licensePlate, setLicensePlate] = useState('')
  const [color, setColor] = useState('')
  const [currentKm, setCurrentKm] = useState('')
  const [tankCapacity, setTankCapacity] = useState('')
  const [batteryCapacity, setBatteryCapacity] = useState('')
  const [licensePlateError, setLicensePlateError] = useState(false)

  // Etapa 4 — Foto (opcional)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    }
  }, [photoPreviewUrl])

  function handleVehicleTypeChange(value: VehicleTypeValue) {
    if (value === vehicleType) return
    setVehicleType(value)
    setBrand('')
    setModel('')
    setManufactureYear('')
    setModelYear('')
    setBrandError(false)
    setModelError(false)
    setManufactureYearError(false)
    setModelYearError(false)
  }

  function handleFipeBrandSelect(code: string) {
    fipe.selectBrand(code)
    const option = fipe.brands.find((b) => String(b.codigo) === code)
    setBrand(option?.nome ?? '')
    setBrandError(false)
    setModel('')
    setModelYear('')
  }

  function handleFipeModelSelect(code: string) {
    fipe.selectModel(code)
    const option = fipe.models.find((m) => String(m.codigo) === code)
    setModel(option?.nome ?? '')
    setModelError(false)
    setModelYear('')
  }

  function handleFipeYearSelect(code: string) {
    fipe.selectYear(code)
    const option = fipe.years.find((y) => String(y.codigo) === code)
    const year = option ? parseFipeYearLabel(option) : null
    if (year) {
      setModelYear(String(year))
      setManufactureYear(String(year))
      setModelYearError(false)
      setManufactureYearError(false)
    }
  }

  function handleManufactureYearChange(value: string) {
    setManufactureYear(value.replace(/\D/g, '').slice(0, 4))
    setManufactureYearError(false)
  }

  function handleModelYearChange(value: string) {
    setModelYear(value.replace(/\D/g, '').slice(0, 4))
    setModelYearError(false)
  }

  function handleLicensePlateChange(value: string) {
    setLicensePlate(value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7))
    setLicensePlateError(false)
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setPhotoFile(file)
    setPhotoPreviewUrl(file ? URL.createObjectURL(file) : null)
  }

  function goToNextStep() {
    if (currentStep === 1) {
      const brandInvalid = !brand.trim()
      const modelInvalid = !model.trim()
      const mfYearInvalid = manufactureYear.length !== 4
      const mdYearInvalid = modelYear.length !== 4
      if (brandInvalid || modelInvalid || mfYearInvalid || mdYearInvalid) {
        setBrandError(brandInvalid)
        setModelError(modelInvalid)
        setManufactureYearError(mfYearInvalid)
        setModelYearError(mdYearInvalid)
        return
      }
      setCurrentStep(2)
      return
    }
    if (currentStep === 2) {
      setCurrentStep(3)
      return
    }
    if (currentStep === 3) {
      if (licensePlate.length !== 7) {
        setLicensePlateError(true)
        return
      }
      setCurrentStep(4)
    }
  }

  function goToPreviousStep() {
    setCurrentStep((step) => Math.max(1, step - 1))
  }

  function skipLicensePlate() {
    setLicensePlateError(false)
    setCurrentStep(4)
  }

  async function handleSubmit() {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const payload: Record<string, unknown> = {
        type: vehicleType,
        energyType,
        currentKm: parseInt(currentKm, 10) || 0,
        brand: brand.trim(),
        model: model.trim(),
        manufactureYear: parseInt(manufactureYear, 10),
        modelYear: parseInt(modelYear, 10),
        color: color.trim() || undefined,
        licensePlate: licensePlate || undefined,
      }

      if (showFuelType) payload.fuelSubType = fuelType
      if (showTankCapacity && tankCapacity) payload.capacity = Number(tankCapacity)
      if (showBatteryCapacity && batteryCapacity) payload.batteryCapacity = Number(batteryCapacity)
      if (payload.capacity === undefined && payload.batteryCapacity !== undefined) {
        payload.capacity = payload.batteryCapacity
      }

      const created = await authenticatedRequest('/vehicles', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (photoFile) {
        try {
          await uploadVehiclePhoto(created.id, photoFile)
        } catch (photoError) {
          console.log(photoError)
          showToast('Veículo cadastrado, mas a foto não pôde ser enviada.')
        }
      }

      await authenticatedRequest(`/vehicles/${created.id}/active`, { method: 'PUT' })
      await loadActiveVehicle()
      showToast('Veículo cadastrado com sucesso.', 'success')
      navigate('/')
    } catch (error) {
      console.log(error)
      showToast('Erro ao cadastrar veículo')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault()
    if (currentStep < 4) {
      goToNextStep()
    } else {
      void handleSubmit()
    }
  }

  return (
    <Screen wide>
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">Cadastrar Veículo</h1>

      <WizardStepper currentStep={currentStep} />

      <form onSubmit={handleFormSubmit} className="mt-6 flex flex-col gap-4">
        {currentStep === 1 && (
          <Step1Identification
            vehicleType={vehicleType}
            onVehicleTypeChange={handleVehicleTypeChange}
            useFipeSearch={useFipeSearch}
            onToggleManualEntry={() => setUseFipeSearch((v) => !v)}
            fipe={fipe}
            brand={brand}
            onBrandChange={(v) => {
              setBrand(v)
              setBrandError(false)
            }}
            brandError={brandError}
            model={model}
            onModelChange={(v) => {
              setModel(v)
              setModelError(false)
            }}
            modelError={modelError}
            manufactureYear={manufactureYear}
            onManufactureYearChange={handleManufactureYearChange}
            manufactureYearError={manufactureYearError}
            modelYear={modelYear}
            onModelYearChange={handleModelYearChange}
            modelYearError={modelYearError}
            onFipeBrandSelect={handleFipeBrandSelect}
            onFipeModelSelect={handleFipeModelSelect}
            onFipeYearSelect={handleFipeYearSelect}
          />
        )}

        {currentStep === 2 && (
          <Step2Classification
            energyType={energyType}
            onEnergyTypeChange={setEnergyType}
            showFuelType={showFuelType}
            fuelType={fuelType}
            onFuelTypeChange={setFuelType}
          />
        )}

        {currentStep === 3 && (
          <Step3Details
            licensePlate={licensePlate}
            onLicensePlateChange={handleLicensePlateChange}
            licensePlateError={licensePlateError}
            color={color}
            onColorChange={setColor}
            currentKm={currentKm}
            onCurrentKmChange={setCurrentKm}
            showTankCapacity={showTankCapacity}
            tankCapacity={tankCapacity}
            onTankCapacityChange={setTankCapacity}
            showBatteryCapacity={showBatteryCapacity}
            batteryCapacity={batteryCapacity}
            onBatteryCapacityChange={setBatteryCapacity}
          />
        )}

        {currentStep === 4 && (
          <Step4Photo photoPreviewUrl={photoPreviewUrl} onPhotoChange={handlePhotoChange} />
        )}

        <div className="mt-2 flex flex-col gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {currentStep < 4 ? 'Continuar' : isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
          </Button>

          {currentStep === 3 && (
            <button
              type="button"
              onClick={skipLicensePlate}
              className="block w-full text-center text-sm text-green-700"
            >
              Preencher placa depois
            </button>
          )}

          {currentStep > 1 ? (
            <button
              type="button"
              onClick={goToPreviousStep}
              className="block w-full text-center text-sm text-green-700"
            >
              Voltar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="block w-full text-center text-sm text-green-700"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </Screen>
  )
}

function WizardStepper({ currentStep }: { currentStep: number }) {
  const labels = ['Identificação', 'Classificação', 'Detalhes', 'Foto']

  return (
    <div className="flex items-start">
      {labels.map((label, index) => {
        const step = index + 1
        const isCompleted = step < currentStep
        const isActive = step === currentStep

        return (
          <div key={label} className="flex flex-1 items-center">
            {index > 0 && (
              <div className={`h-0.5 flex-1 ${step <= currentStep ? 'bg-green-600' : 'bg-gray-300'}`} />
            )}
            <div className="flex flex-col items-center gap-1 px-1">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                  isCompleted || isActive
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 text-gray-500'
                }`}
              >
                {isCompleted ? '✓' : step}
              </div>
              <span
                className={`text-center text-[11px] ${
                  isCompleted || isActive ? 'font-bold text-green-700' : 'text-gray-500'
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface Step1Props {
  vehicleType: VehicleTypeValue
  onVehicleTypeChange: (value: VehicleTypeValue) => void
  useFipeSearch: boolean
  onToggleManualEntry: () => void
  fipe: ReturnType<typeof useFipeSelection>
  brand: string
  onBrandChange: (value: string) => void
  brandError: boolean
  model: string
  onModelChange: (value: string) => void
  modelError: boolean
  manufactureYear: string
  onManufactureYearChange: (value: string) => void
  manufactureYearError: boolean
  modelYear: string
  onModelYearChange: (value: string) => void
  modelYearError: boolean
  onFipeBrandSelect: (code: string) => void
  onFipeModelSelect: (code: string) => void
  onFipeYearSelect: (code: string) => void
}

function Step1Identification({
  vehicleType,
  onVehicleTypeChange,
  useFipeSearch,
  onToggleManualEntry,
  fipe,
  brand,
  onBrandChange,
  brandError,
  model,
  onModelChange,
  modelError,
  manufactureYear,
  onManufactureYearChange,
  manufactureYearError,
  modelYear,
  onModelYearChange,
  modelYearError,
  onFipeBrandSelect,
  onFipeModelSelect,
  onFipeYearSelect,
}: Step1Props) {
  return (
    <div className="flex flex-col gap-4">
      <SegmentedToggle
        options={[
          { value: 'Carro', label: 'Carro' },
          { value: 'Moto', label: 'Moto' },
        ]}
        value={vehicleType}
        onChange={onVehicleTypeChange}
      />

      {useFipeSearch ? (
        <>
          {fipe.brandsError ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-300 px-3 py-3 text-sm">
              <span>Não foi possível carregar as marcas.</span>
              <button type="button" onClick={fipe.retryBrands} className="font-bold text-green-700">
                Tentar novamente
              </button>
            </div>
          ) : (
            <select
              className={selectClass}
              value={fipe.brandCode}
              onChange={(e) => onFipeBrandSelect(e.target.value)}
              disabled={fipe.loadingBrands}
            >
              <option value="">
                {fipe.loadingBrands ? 'Carregando marcas...' : 'Selecione a marca'}
              </option>
              {fipe.brands.map((b) => (
                <option key={b.codigo} value={String(b.codigo)}>
                  {b.nome}
                </option>
              ))}
            </select>
          )}
          {brandError && <p className="text-sm text-red-600">Selecione a marca.</p>}

          {fipe.modelsError ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-300 px-3 py-3 text-sm">
              <span>Não foi possível carregar os modelos.</span>
              <button type="button" onClick={fipe.retryModels} className="font-bold text-green-700">
                Tentar novamente
              </button>
            </div>
          ) : (
            <select
              className={selectClass}
              value={fipe.modelCode}
              onChange={(e) => onFipeModelSelect(e.target.value)}
              disabled={!fipe.brandCode || fipe.loadingModels}
            >
              <option value="">
                {fipe.loadingModels ? 'Carregando modelos...' : 'Selecione o modelo'}
              </option>
              {fipe.models.map((m) => (
                <option key={m.codigo} value={String(m.codigo)}>
                  {m.nome}
                </option>
              ))}
            </select>
          )}
          {modelError && <p className="text-sm text-red-600">Selecione o modelo.</p>}

          {fipe.yearsError ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-300 px-3 py-3 text-sm">
              <span>Não foi possível carregar os anos.</span>
              <button type="button" onClick={fipe.retryYears} className="font-bold text-green-700">
                Tentar novamente
              </button>
            </div>
          ) : (
            <select
              className={selectClass}
              value={fipe.yearCode}
              onChange={(e) => onFipeYearSelect(e.target.value)}
              disabled={!fipe.modelCode || fipe.loadingYears}
            >
              <option value="">{fipe.loadingYears ? 'Carregando anos...' : 'Selecione o ano'}</option>
              {fipe.years.map((y) => (
                <option key={y.codigo} value={String(y.codigo)}>
                  {y.nome}
                </option>
              ))}
            </select>
          )}
          {modelYearError && <p className="text-sm text-red-600">Ano do modelo inválido.</p>}

          <TextField
            placeholder="Ano de Fabricação"
            value={manufactureYear}
            onChange={(e) => onManufactureYearChange(e.target.value)}
            inputMode="numeric"
          />
          {manufactureYearError && <p className="text-sm text-red-600">Ano de fabricação inválido.</p>}

          <button
            type="button"
            onClick={onToggleManualEntry}
            className="text-sm font-bold text-green-700"
          >
            Não encontrou? Preencher manualmente
          </button>
        </>
      ) : (
        <>
          <TextField placeholder="Marca" value={brand} onChange={(e) => onBrandChange(e.target.value)} />
          {brandError && <p className="text-sm text-red-600">Informe a marca.</p>}

          <TextField placeholder="Modelo" value={model} onChange={(e) => onModelChange(e.target.value)} />
          {modelError && <p className="text-sm text-red-600">Informe o modelo.</p>}

          <div className="flex gap-3">
            <div className="flex-1">
              <TextField
                placeholder="Ano de Fabricação"
                value={manufactureYear}
                onChange={(e) => onManufactureYearChange(e.target.value)}
                inputMode="numeric"
              />
              {manufactureYearError && <p className="text-sm text-red-600">Inválido.</p>}
            </div>
            <div className="flex-1">
              <TextField
                placeholder="Ano do Modelo"
                value={modelYear}
                onChange={(e) => onModelYearChange(e.target.value)}
                inputMode="numeric"
              />
              {modelYearError && <p className="text-sm text-red-600">Inválido.</p>}
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleManualEntry}
            className="text-sm font-bold text-green-700"
          >
            Usar busca FIPE
          </button>
        </>
      )}
    </div>
  )
}

interface Step2Props {
  energyType: EnergyTypeValue
  onEnergyTypeChange: (value: EnergyTypeValue) => void
  showFuelType: boolean
  fuelType: FuelTypeValue
  onFuelTypeChange: (value: FuelTypeValue) => void
}

function Step2Classification({
  energyType,
  onEnergyTypeChange,
  showFuelType,
  fuelType,
  onFuelTypeChange,
}: Step2Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm font-bold text-gray-700">Tipo de energia</p>
        <SegmentedToggle
          options={[
            { value: 'COMBUSTION', label: 'Combustão' },
            { value: 'ELECTRIC', label: 'Elétrico' },
            { value: 'HYBRID', label: 'Híbrido' },
          ]}
          value={energyType}
          onChange={onEnergyTypeChange}
        />
      </div>

      {showFuelType && (
        <div>
          <p className="mb-2 text-sm font-bold text-gray-700">Tipo de combustível</p>
          <div className="flex flex-wrap gap-2">
            {FUEL_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onFuelTypeChange(option)}
                className={`rounded-full border px-3 py-1.5 text-sm font-bold transition-colors ${
                  fuelType === option
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 text-gray-600'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface Step3Props {
  licensePlate: string
  onLicensePlateChange: (value: string) => void
  licensePlateError: boolean
  color: string
  onColorChange: (value: string) => void
  currentKm: string
  onCurrentKmChange: (value: string) => void
  showTankCapacity: boolean
  tankCapacity: string
  onTankCapacityChange: (value: string) => void
  showBatteryCapacity: boolean
  batteryCapacity: string
  onBatteryCapacityChange: (value: string) => void
}

function Step3Details({
  licensePlate,
  onLicensePlateChange,
  licensePlateError,
  color,
  onColorChange,
  currentKm,
  onCurrentKmChange,
  showTankCapacity,
  tankCapacity,
  onTankCapacityChange,
  showBatteryCapacity,
  batteryCapacity,
  onBatteryCapacityChange,
}: Step3Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <TextField
            placeholder="Placa (ABC1D23)"
            value={formatLicensePlateDisplay(licensePlate)}
            onChange={(e) => onLicensePlateChange(e.target.value)}
          />
          {licensePlateError && <p className="text-sm text-red-600">Placa inválida.</p>}
        </div>
        <div className="flex-1">
          <TextField placeholder="Cor" value={color} onChange={(e) => onColorChange(e.target.value)} />
        </div>
      </div>

      <TextField
        placeholder="Km Atual"
        value={currentKm}
        onChange={(e) => onCurrentKmChange(e.target.value)}
        inputMode="numeric"
      />

      {showTankCapacity && (
        <TextField
          placeholder="Capacidade do tanque (L)"
          value={tankCapacity}
          onChange={(e) => onTankCapacityChange(e.target.value)}
          inputMode="decimal"
        />
      )}

      {showBatteryCapacity && (
        <TextField
          placeholder="Capacidade da bateria (kWh)"
          value={batteryCapacity}
          onChange={(e) => onBatteryCapacityChange(e.target.value)}
          inputMode="decimal"
        />
      )}
    </div>
  )
}

interface Step4Props {
  photoPreviewUrl: string | null
  onPhotoChange: (e: ChangeEvent<HTMLInputElement>) => void
}

function Step4Photo({ photoPreviewUrl, onPhotoChange }: Step4Props) {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-center text-sm text-gray-600">Adicione uma foto do veículo (opcional).</p>

      <label className="flex h-40 w-40 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-gray-300 bg-gray-50">
        {photoPreviewUrl ? (
          <img src={photoPreviewUrl} alt="Foto do veículo" className="h-full w-full object-cover" />
        ) : (
          <span className="px-2 text-center text-xs text-gray-500">Escolher foto</span>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
      </label>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit — this resolves the errors left dangling since Task 7.

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/routes/VehicleNew.tsx
git commit -m "feat: rewrite vehicle registration as a 4-step wizard matching the mobile app"
```

---

### Task 10: Manual verification — vehicle registration wizard

**Files:** none — manual browser pass. Requires a logged-in session (use the QA account from memory, `yhe66@web-library.net`, or the account activated in Task 6).

- [ ] **Step 1: Start the dev server (if not already running)**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npm run dev`, log in, navigate to `/vehicles/new`.

Expected: stepper shows 4 steps ("Identificação" highlighted as step 1), Step 1 shows Carro/Moto toggle (Carro selected) and the marca/modelo/ano-do-modelo `<select>`s populated from the FIPE API (marcas load automatically).

- [ ] **Step 2: FIPE cascade for Carro**

Pick a marca → confirm modelo `<select>` populates and enables. Pick a modelo → confirm ano `<select>` populates and enables. Pick an ano → confirm "Ano de Fabricação" auto-fills with that year. Click "Continuar" with all fields present. Expected: advances to Step 2 ("Classificação" now highlighted, "Identificação" shows a checkmark).

- [ ] **Step 3: Validation on Step 1**

Go back ("Voltar"), clear the "Ano de Fabricação" field, click "Continuar". Expected: stays on Step 1, red error text appears under "Ano de Fabricação" only (not under marca/modelo, which are still filled).

- [ ] **Step 4: Moto switches FIPE category**

With marca/modelo/ano filled for Carro, switch the toggle to "Moto". Expected: marca/modelo/ano-do-modelo fields all clear and reset to "Carregando marcas..." then repopulate with motorcycle brands (different list than car brands — e.g. Honda, Yamaha appear).

- [ ] **Step 5: Manual fallback**

Click "Não encontrou? Preencher manualmente". Expected: the three `<select>`s are replaced by "Marca"/"Modelo" text fields and a manual "Ano do Modelo" field alongside "Ano de Fabricação". Fill them and advance.

- [ ] **Step 6: Step 2 — energia e combustível**

Confirm "Combustão" is selected by default and a row of fuel chips (Gasolina comum/Etanol/Diesel/Flex/GNV) is visible with "Flex" pre-selected. Switch to "Elétrico": confirm the fuel chips row disappears. Switch to "Híbrido": confirm the fuel chips row reappears. Click "Continuar".

- [ ] **Step 7: Step 3 — placa, capacidades condicionais**

With energy type still "Híbrido" from Step 6, confirm **both** "Capacidade do tanque (L)" and "Capacidade da bateria (kWh)" fields are visible. Type a plate in the old format, e.g. `ABC1234` (letters then digits) — confirm it visually renders as `ABC-1234` while typing. Click "Continuar" with an incomplete plate (fewer than 7 characters) — expected: red error text, stays on Step 3. Click "Preencher placa depois" instead — expected: advances straight to Step 4 regardless of the plate's validity.

- [ ] **Step 8: Step 4 — foto opcional, submissão**

Without selecting any photo, click "Cadastrar". Expected: succeeds (no photo is a valid submission), toast "Veículo cadastrado com sucesso.", redirected to `/`. Confirm the new vehicle appears as the active vehicle (check `/select-vehicle` or the home screen's vehicle display).

- [ ] **Step 9: Com foto**

Repeat the whole flow once more, this time picking an image file on Step 4 (confirm a circular preview of the picked image appears before submitting). Expected: succeeds the same way, and — using devtools' Network tab — confirm a `POST .../vehicles/{id}/photo` multipart request fired and returned 2xx.

---

### Task 11: Deploy and smoke-test in production

**Files:** none — deployment + verification only.

- [ ] **Step 1: Deploy**

This repo auto-deploys to Render (`render.yaml`) on push to `main`. Push the commits from Tasks 2–9.

Run: `cd /home/rocha/Projetos/flowfuel-frontend && git push origin main`

- [ ] **Step 2: Re-run the critical path in production**

Once Render finishes deploying, repeat Task 6's Steps 2, 3, 5 (register → activate page shows → resend works → real code activates and auto-logs-in) and Task 10's Steps 1, 2, 8, 9 (wizard loads, FIPE cascade works, submit with and without photo both succeed) against the production URL instead of `localhost:5173`.

---

## Self-Review

**Cobertura do spec:**
- "Ao invés de toast + `/login`, navega para `/activate?email=...`" → Task 4.
- Rota pública `/activate` com ícone/título/instrução/reenvio com cooldown/link "já ativei"/campo manual → Task 3, Task 5.
- Suporte a `?token=` prefill sem auto-ativar → Task 3 (Step 6 of Task 6 verifies it).
- Login automático via `signIn(accessToken)` após ativar → Task 3.
- Erro de token inválido inline (não toast) lendo `detail` do `ProblemDetail` → Task 2 (`activateRequest`) + Task 3.
- Wizard de 4 etapas com mesma divisão do mobile → Task 9.
- FIPE para carro e moto → Tasks 7-8-9.
- Fallback manual (marca/modelo texto livre) → Task 9 (`Step1Identification`, `useFipeSearch` branch).
- Tipo de energia + combustível condicional → Task 9 (`Step2Classification`).
- Placa com máscara visual (só formato antigo), cor, km, capacidade condicional (tanque/bateria) → Task 9 (`Step3Details`, `formatLicensePlateDisplay`).
- "Preencher depois" pula validação da placa → Task 9 (`skipLicensePlate`).
- Foto opcional, sem crop, preview circular → Task 9 (`Step4Photo`).
- Upload de foto não desfaz o cadastro se falhar → Task 9 (`handleSubmit`'s inner `try/catch` around `uploadVehiclePhoto`).
- `PUT /vehicles/{id}/active` + `loadActiveVehicle()` + toast + navigate → Task 9 (`handleSubmit`, preserved from the pre-existing behavior).

**Placeholder scan:** nenhum "TBD"/"TODO"/"similar to Task N" — todo step tem código completo ou comando exato, incluindo o arquivo inteiro reescrito nas Tasks 2, 3, 7, 8, 9.

**Consistência de tipos:** `useFipeSelection(category: FipeVehicleCategory)` (Task 8) é chamado como `useFipeSelection(vehicleType === 'Carro' ? 'carros' : 'motos')` (Task 9) — tipos batem (`'carros' | 'motos'`). `fetchBrands/fetchModels/fetchYears` (Task 7) recebem `category` como primeiro argumento em todas as 3 chamadas dentro do hook (Task 8). `resendActivationRequest(email: string)`/`activateRequest(token: string)`/`uploadVehiclePhoto(vehicleId: number, file: File)` (Task 2) são chamados com os mesmos tipos em `Activate.tsx` (Task 3) e `VehicleNew.tsx` (Task 9) respectivamente. `Step1Props`-`Step4Props` (Task 9) batem exatamente com os valores passados no JSX do componente principal, campo a campo.

**Nota sobre risco de arquivo compartilhado:** `src/App.tsx` (Task 5) já foi tocado por múltiplos planos anteriores neste repo — o executor deve reconferir o conteúdo real antes de aplicar o Step 2 caso o Step 1 não bata exatamente, em vez de sobrescrever cegamente.
