# Vehicle Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add vehicle management to the web frontend — `/vehicles` (list own vehicles + read-only "Compartilhados comigo" section, set active, edit, delete) and `/vehicles/:id/edit` (single-page edit form) — plus fix a confirmed production bug where activating a vehicle throws on an empty response body.

**Architecture:** New `src/types/Vehicle.ts` and `src/services/vehicle.ts` centralize the `Vehicle`/`VehicleShare` shapes and API calls that today are either missing or duplicated inline in `SelectVehicle.tsx`/`VehicleNew.tsx`. The 4-step wizard's field components (`Step1Identification`...`Step4Photo`) are extracted from `VehicleNew.tsx` into `src/routes/vehicle/fields.tsx` so the new single-page edit form can reuse them without duplicating ~300 lines of JSX. `VehicleContext.tsx` adopts the shared `Vehicle` type instead of its own incomplete local one.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, `react-router-dom` v7.6. No test runner configured — verification is `npx tsc -b` plus manual browser verification tasks (established pattern in this repo, see `docs/superpowers/plans/2026-07-26-profile-screen.md`).

**Reference spec:** `docs/superpowers/specs/2026-07-27-vehicle-management-design.md`

**Working directory for all steps below:** `/home/rocha/Projetos/flowfuel-frontend`

## Global Constraints

- No new npm dependencies.
- No backend changes — every endpoint used here already exists (verified directly against the backend source in `~/Projetos/flowfuel`, not just inferred from the mobile app).
- **Confirmed backend contract corrections vs. the spec** (verified by reading `VehicleController.java`/`VehicleResponseDTO.java`/`VehicleRequestDTO.java`/`VehicleShareResponseDTO.java` and a live `curl` against `https://flowfuel-api.fly.dev` with the QA account):
  - The vehicle's JSON field is **`photo`**, not `photoUrl` — an internal path like `/vehicles/{id}/photo` that needs an authenticated fetch to resolve (it 302-redirects to a public storage URL, exactly like the profile avatar). Reuse `useAuthenticatedImage`/`fetchAuthenticatedBlob`, already built for the profile screen — do not use a plain `<img src>`.
  - Tank capacity (**`capacity`**, `number | null`) and battery capacity (**`batteryCapacity`**, `number | null`) are **two separate fields** in the backend response — not one shared field as assumed in the spec and in `docs/ANDROID_APP_SCREENS_REFERENCE.md` (that doc was written from the Android Kotlin domain model without checking the backend DTO directly).
  - **`PUT /vehicles/{id}/active` responds `200` with an empty body (`content-length: 0`, confirmed via a live `curl` against production).** `authenticatedRequest` in `src/services/api.ts` unconditionally calls `response.json()`, which throws `SyntaxError: Unexpected end of JSON input` on an empty body. This means the existing `SelectVehicle.tsx` (`activateVehicle`) and `VehicleNew.tsx` (auto-activate after creating a vehicle) calls to this endpoint **are both currently broken in production** — switching a vehicle silently does nothing, and finishing the vehicle wizard shows "Erro ao cadastrar veículo" even though the vehicle was in fact created. Tasks 6 and 7 below fix both call sites as part of this plan, using the same safe pattern already established for `DELETE /auth/{userId}` in `services/profile.ts` (a raw `fetch` that never calls `.json()`).
  - `DELETE /vehicles/{id}` is declared `public void deleteVehicle(...)` in `VehicleController.java` — same empty-body shape, so `deleteVehicle()` in the new service must also avoid `authenticatedRequest`.
  - `fuelSubType` has no backend validation constraint (confirmed via `VehicleRequestDTO.java` — no `@NotBlank`) and real production data was observed with values outside the app's own 5-option list (e.g. `"Gasolina"` instead of `"Gasolina comum"`) — type it as `string | null`, not a narrow union, so the type doesn't lie about what the API can actually return.
- `PUT /vehicles/{id}` (create and update) requires `type` (`@NotBlank`), `energyType` (`@NotNull`), `currentKm` (`@NotNull @Min(0)`) and **`capacity`** (`@NotNull @Min(1)`, required even for `ELECTRIC` vehicles) at the backend. `VehicleNew.tsx` already has a workaround for the `ELECTRIC`-without-tank case (copies `batteryCapacity` into `capacity` when the tank field is empty) — Task 5 moves this payload-building logic unchanged into the new edit form, do not "fix" or simplify it.
- `noUnusedLocals` and `noUnusedParameters` are both `true` in `tsconfig.json` — every import must be used, or `npx tsc -b` fails the build. Double-check imports in every step below match what's actually referenced in that file.
- `VehicleContext`'s local `Vehicle.id` was typed `string`, but the real API always returns a JSON number — Task 4 fixes this as a side effect of switching to the shared type. Verified safe: `setActiveVehicle` (the context method) has no call sites anywhere in the codebase besides its own declaration, and every read of `activeVehicle.id` (`Refuels.tsx`, `Home.tsx`, `VehicleEventForm.tsx`, `RefuelForm.tsx`, `VehicleEvents.tsx`) either interpolates it into a template literal or passes it through `Number(...)`, both of which accept a `number` input identically to a `string`.

---

## File Structure

```
Create:   src/types/Vehicle.ts
Create:   src/services/vehicle.ts
Modify:   src/context/VehicleContext.tsx (use shared Vehicle type)
Create:   src/routes/vehicle/fields.tsx (Step1-4 extracted from VehicleNew.tsx)
Modify:   src/routes/VehicleNew.tsx (import from vehicle/fields.tsx; fix active-vehicle bug)
Modify:   src/routes/SelectVehicle.tsx (fix activate-vehicle bug)
Create:   src/routes/Vehicles.tsx (list: own + shared-with-me, set active, edit, delete)
Create:   src/routes/VehicleEdit.tsx (single-page edit form)
Modify:   src/App.tsx (routes /vehicles, /vehicles/:id/edit)
Modify:   src/routes/Profile.tsx (ActionRow "Meus veículos")
```

---

### Task 1: Verify the type-check command

**Files:** none.

- [ ] **Step 1**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit.

---

### Task 2: `src/types/Vehicle.ts` — shared `Vehicle`/`VehicleShare` types

**Files:**
- Create: `src/types/Vehicle.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Vehicle`, `VehicleShare`. Consumed by every task below.

- [ ] **Step 1: Create the file**

```ts
// src/types/Vehicle.ts
export interface Vehicle {
  id: number
  type: 'Carro' | 'Moto'
  energyType: 'COMBUSTION' | 'ELECTRIC' | 'HYBRID'
  fuelSubType: string | null
  currentKm: number
  capacity: number | null
  batteryCapacity: number | null
  brand: string
  model: string
  manufactureYear: number | null
  modelYear: number | null
  color: string | null
  licensePlate: string | null
  photo: string | null
  isActive: boolean
}

export interface VehicleShare {
  id: number
  vehicleId: number
  vehicleBrand: string
  vehicleModel: string
  ownerId: number
  ownerName: string
  guestId: number | null
  guestName: string | null
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REVOKED' | 'EXPIRED'
  createdAt: string
  respondedAt: string | null
  expiresAt: string | null
}
```

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/types/Vehicle.ts
git commit -m "feat: add shared Vehicle and VehicleShare types"
```

---

### Task 3: `src/services/vehicle.ts` — vehicle API calls

**Files:**
- Create: `src/services/vehicle.ts`

**Interfaces:**
- Consumes: `authenticatedRequest`, `clearSession` (`src/services/api.ts`), `PageResponse<T>` (`src/types/Page.ts`), `Vehicle`, `VehicleShare` (Task 2).
- Produces: `listVehicles(): Promise<PageResponse<Vehicle>>`, `getVehicle(id: number): Promise<Vehicle>`, `updateVehicle(id: number, payload: Record<string, unknown>): Promise<Vehicle>`, `deleteVehicle(id: number): Promise<void>`, `activateVehicle(id: number): Promise<void>`, `listSharedVehicles(): Promise<VehicleShare[]>`. Consumed by Tasks 6, 7, 8, 9.

- [ ] **Step 1: Create the file**

```ts
// src/services/vehicle.ts
import { authenticatedRequest, clearSession } from './api'
import type { PageResponse } from '../types/Page'
import type { Vehicle, VehicleShare } from '../types/Vehicle'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://flowfuel-api.fly.dev'

export function listVehicles(): Promise<PageResponse<Vehicle>> {
  return authenticatedRequest('/vehicles?size=50')
}

export function getVehicle(id: number): Promise<Vehicle> {
  return authenticatedRequest(`/vehicles/${id}`)
}

export function updateVehicle(id: number, payload: Record<string, unknown>): Promise<Vehicle> {
  return authenticatedRequest(`/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

// PUT /vehicles/{id}/active responds 200 with an empty body (confirmed via
// production curl) — authenticatedRequest always calls response.json(),
// which throws SyntaxError on an empty body, so this does its own fetch.
export async function activateVehicle(id: number): Promise<void> {
  const token = localStorage.getItem('@token')
  const response = await fetch(`${BASE_URL}/api/v1/vehicles/${id}/active`, {
    method: 'PUT',
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
    throw new Error('Não foi possível ativar o veículo')
  }
}

// DELETE /vehicles/{id} is declared `void` on the backend — same empty-body
// shape as activateVehicle above, same reason for a raw fetch here.
export async function deleteVehicle(id: number): Promise<void> {
  const token = localStorage.getItem('@token')
  const response = await fetch(`${BASE_URL}/api/v1/vehicles/${id}`, {
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
    throw new Error('Não foi possível excluir o veículo')
  }
}

export function listSharedVehicles(): Promise<VehicleShare[]> {
  return authenticatedRequest('/vehicle-shares/active-for-me')
}
```

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/services/vehicle.ts
git commit -m "feat: add vehicle service (list, get, update, delete, activate, shared)"
```

---

### Task 4: `VehicleContext.tsx` — use the shared `Vehicle` type

**Files:**
- Modify: `src/context/VehicleContext.tsx`

**Interfaces:**
- Consumes: `Vehicle` (Task 2).
- Produces: no change to the context's public shape (`activeVehicle`, `loadingVehicle`, `loadActiveVehicle`, `setActiveVehicle`, `clearVehicle`) — only the underlying type gets more complete and `id` changes from (incorrectly) `string` to `number`.

- [ ] **Step 1: Read the current file and confirm it matches**

Run: `cat /home/rocha/Projetos/flowfuel-frontend/src/context/VehicleContext.tsx`

Confirm it still has a local `interface Vehicle { id: string; brand: string; model: string; modelYear: number; currentKm: number; licensePlate: string; energyType: 'COMBUSTION' | 'ELECTRIC' | 'HYBRID' }` near the top. If it doesn't match, stop and re-read this task against the actual file before editing.

- [ ] **Step 2: Replace the file content**

```tsx
// src/context/VehicleContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authenticatedRequest } from '../services/api'
import { useAuth } from './AuthContext'
import type { Vehicle } from '../types/Vehicle'

interface VehicleContextData {
  activeVehicle: Vehicle | null
  loadingVehicle: boolean
  loadActiveVehicle: () => Promise<void>
  setActiveVehicle: (vehicle: Vehicle) => Promise<void>
  clearVehicle: () => Promise<void>
}

const VehicleContext = createContext<VehicleContextData>(
  {} as VehicleContextData
)

export function VehicleProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()

  const [activeVehicle, setActiveVehicleState] = useState<Vehicle | null>(null)
  const [loadingVehicle, setLoadingVehicle] = useState(true)

  useEffect(() => {
    if (token) {
      loadActiveVehicle()
    } else {
      clearVehicle()
    }
  }, [token])

  async function loadActiveVehicle() {
    try {
      setLoadingVehicle(true)

      const storedVehicle = localStorage.getItem('@active_vehicle')

      if (storedVehicle) {
        setActiveVehicleState(JSON.parse(storedVehicle))
      }

      const response = await authenticatedRequest('/vehicles/active')

      if (response) {
        setActiveVehicleState(response)
        localStorage.setItem('@active_vehicle', JSON.stringify(response))
      } else {
        await clearVehicle()
      }
    } catch (error) {
      console.log(error)
      await clearVehicle()
    } finally {
      setLoadingVehicle(false)
    }
  }

  async function setActiveVehicle(vehicle: Vehicle) {
    setActiveVehicleState(vehicle)
    localStorage.setItem('@active_vehicle', JSON.stringify(vehicle))
  }

  async function clearVehicle() {
    setActiveVehicleState(null)
    localStorage.removeItem('@active_vehicle')
    setLoadingVehicle(false)
  }

  return (
    <VehicleContext.Provider
      value={{
        activeVehicle,
        loadingVehicle,
        loadActiveVehicle,
        setActiveVehicle,
        clearVehicle,
      }}
    >
      {children}
    </VehicleContext.Provider>
  )
}

export function useVehicle() {
  return useContext(VehicleContext)
}
```

- [ ] **Step 3: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit. If it fails, the error will point at a call site still assuming `activeVehicle.id` is a `string` — re-read the Global Constraints note above about why this is safe before "fixing" it by reverting the type.

- [ ] **Step 4: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/context/VehicleContext.tsx
git commit -m "refactor: use shared Vehicle type in VehicleContext"
```

---

### Task 5: `src/routes/vehicle/fields.tsx` — extract the wizard's step components

**Files:**
- Create: `src/routes/vehicle/fields.tsx`

**Interfaces:**
- Consumes: `TextField` (`src/components/ui/TextField.tsx`), `SegmentedToggle` (`src/components/ui/SegmentedToggle.tsx`), `useFipeSelection` (`src/hooks/useFipeSelection.ts`), `FipeOption` (`src/services/fipe.ts`).
- Produces: `selectClass`, `VehicleTypeValue`, `EnergyTypeValue`, `FuelTypeValue`, `FUEL_OPTIONS`, `parseFipeYearLabel(option: FipeOption): number | null`, `formatLicensePlateDisplay(raw: string): string`, `Step1Props`, `Step1Identification`, `Step2Props`, `Step2Classification`, `Step3Props` (now with an added optional `currentKmError?: boolean`), `Step3Details`, `Step4Props` (now with an added optional `existingPhotoUrl?: string | null`), `Step4Photo`. Consumed by Task 6 (`VehicleNew.tsx`) and Task 9 (`VehicleEdit.tsx`).

This is a byte-for-byte extraction of `VehicleNew.tsx`'s existing step components with exactly two additive changes: `Step3Details` gains an optional `currentKmError` prop (unused by `VehicleNew.tsx`, used by the new edit form to mark the odometer as required there), and `Step4Photo` gains an optional `existingPhotoUrl` prop (unused by `VehicleNew.tsx`, used by the edit form to preview the vehicle's current photo).

- [ ] **Step 1: Read the current `VehicleNew.tsx` and confirm it matches**

Run: `wc -l /home/rocha/Projetos/flowfuel-frontend/src/routes/VehicleNew.tsx`
Expected: `734` (or close). If significantly different, stop and re-read the file before proceeding — later tasks assume this exact structure.

- [ ] **Step 2: Create the new file**

```tsx
// src/routes/vehicle/fields.tsx
import type { ChangeEvent } from 'react'
import { TextField } from '../../components/ui/TextField'
import { SegmentedToggle } from '../../components/ui/SegmentedToggle'
import { useFipeSelection } from '../../hooks/useFipeSelection'
import type { FipeOption } from '../../services/fipe'

export const selectClass =
  'h-12 w-full rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-60'

export type VehicleTypeValue = 'Carro' | 'Moto'
export type EnergyTypeValue = 'COMBUSTION' | 'ELECTRIC' | 'HYBRID'
export type FuelTypeValue = 'Gasolina comum' | 'Etanol' | 'Diesel' | 'Flex' | 'GNV'

export const FUEL_OPTIONS: FuelTypeValue[] = ['Gasolina comum', 'Etanol', 'Diesel', 'Flex', 'GNV']

export function parseFipeYearLabel(option: FipeOption): number | null {
  const fromCode = parseInt(String(option.codigo).split('-')[0], 10)
  if (!Number.isNaN(fromCode)) return fromCode
  const fromName = parseInt(String(option.nome).slice(0, 4), 10)
  return Number.isNaN(fromName) ? null : fromName
}

export function formatLicensePlateDisplay(raw: string): string {
  const isOldFormat = /^[A-Z]{3}\d{4}$/.test(raw)
  return isOldFormat ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw
}

export interface Step1Props {
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

export function Step1Identification({
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

export interface Step2Props {
  energyType: EnergyTypeValue
  onEnergyTypeChange: (value: EnergyTypeValue) => void
  showFuelType: boolean
  fuelType: FuelTypeValue
  onFuelTypeChange: (value: FuelTypeValue) => void
}

export function Step2Classification({
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

export interface Step3Props {
  licensePlate: string
  onLicensePlateChange: (value: string) => void
  licensePlateError: boolean
  color: string
  onColorChange: (value: string) => void
  currentKm: string
  onCurrentKmChange: (value: string) => void
  currentKmError?: boolean
  showTankCapacity: boolean
  tankCapacity: string
  onTankCapacityChange: (value: string) => void
  showBatteryCapacity: boolean
  batteryCapacity: string
  onBatteryCapacityChange: (value: string) => void
}

export function Step3Details({
  licensePlate,
  onLicensePlateChange,
  licensePlateError,
  color,
  onColorChange,
  currentKm,
  onCurrentKmChange,
  currentKmError = false,
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
      {currentKmError && <p className="text-sm text-red-600">Informe o odômetro atual.</p>}

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

export interface Step4Props {
  photoPreviewUrl: string | null
  existingPhotoUrl?: string | null
  onPhotoChange: (e: ChangeEvent<HTMLInputElement>) => void
}

export function Step4Photo({ photoPreviewUrl, existingPhotoUrl, onPhotoChange }: Step4Props) {
  const displayUrl = photoPreviewUrl ?? existingPhotoUrl ?? null

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-center text-sm text-gray-600">Adicione uma foto do veículo (opcional).</p>

      <label className="flex h-40 w-40 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-gray-300 bg-gray-50">
        {displayUrl ? (
          <img src={displayUrl} alt="Foto do veículo" className="h-full w-full object-cover" />
        ) : (
          <span className="px-2 text-center text-xs text-gray-500">Escolher foto</span>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
      </label>
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: errors about `VehicleNew.tsx` having duplicate declarations (`Step1Identification`, `FUEL_OPTIONS`, etc. defined in both files) — this is expected until Task 6. Confirm the *only* errors are duplicate-identifier errors referencing `VehicleNew.tsx` and this new file; if there are other, unrelated errors, stop and investigate before continuing.

- [ ] **Step 4: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/routes/vehicle/fields.tsx
git commit -m "feat: extract vehicle wizard step components into a shared module"
```

---

### Task 6: `VehicleNew.tsx` — use the extracted fields module, fix the activate-vehicle bug

**Files:**
- Modify: `src/routes/VehicleNew.tsx`

**Interfaces:**
- Consumes: `Step1Identification`, `Step2Classification`, `Step3Details`, `Step4Photo`, `parseFipeYearLabel`, `VehicleTypeValue`, `EnergyTypeValue`, `FuelTypeValue` (Task 5); `activateVehicle` (Task 3).
- Produces: no change to `VehicleNew`'s exported shape — same `export function VehicleNew()`.

- [ ] **Step 1: Replace the file content**

```tsx
// src/routes/VehicleNew.tsx
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest, uploadVehiclePhoto } from '../services/api'
import { activateVehicle } from '../services/vehicle'
import { useVehicle } from '../context/VehicleContext'
import { useFipeSelection } from '../hooks/useFipeSelection'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { Button } from '../components/ui/Button'
import {
  Step1Identification,
  Step2Classification,
  Step3Details,
  Step4Photo,
  parseFipeYearLabel,
  type EnergyTypeValue,
  type FuelTypeValue,
  type VehicleTypeValue,
} from './vehicle/fields'

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
      if (showTankCapacity && tankCapacity) {
        payload.capacity = Number(tankCapacity.replace(',', '.'))
      }
      if (showBatteryCapacity && batteryCapacity) {
        payload.batteryCapacity = Number(batteryCapacity.replace(',', '.'))
      }
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

      await activateVehicle(created.id)
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
```

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit (this resolves the duplicate-identifier errors from Task 5, since `VehicleNew.tsx` no longer declares its own copies).

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/routes/VehicleNew.tsx
git commit -m "fix: use shared wizard fields in VehicleNew, fix activate-after-create bug"
```

---

### Task 7: `SelectVehicle.tsx` — fix the same activate-vehicle bug

**Files:**
- Modify: `src/routes/SelectVehicle.tsx`

**Interfaces:**
- Consumes: `activateVehicle` (Task 3).
- Produces: no change to `SelectVehicle`'s exported shape.

- [ ] **Step 1: Replace the file content**

```tsx
// src/routes/SelectVehicle.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { activateVehicle } from '../services/vehicle'
import { useVehicle } from '../context/VehicleContext'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { Spinner } from '../components/ui/Spinner'
import { Button } from '../components/ui/Button'

interface VehicleListItem {
  id: number
  brand: string
  model: string
  modelYear: number
  licensePlate: string
}

export function SelectVehicle() {
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { loadActiveVehicle } = useVehicle()
  const { showToast } = useToast()

  useEffect(() => {
    loadVehicles()
  }, [])

  async function loadVehicles() {
    try {
      const response = await authenticatedRequest('/vehicles')
      setVehicles(response.content)
    } catch (error) {
      console.log(error)
      showToast('Não foi possível carregar seus veículos')
    } finally {
      setLoading(false)
    }
  }

  async function activateSelectedVehicle(id: number) {
    try {
      await activateVehicle(id)
      await loadActiveVehicle()
      showToast('Veículo ativado.', 'success')
      navigate('/')
    } catch (error) {
      console.log(error)
      showToast('Não foi possível ativar o veículo')
    }
  }

  if (loading) {
    return (
      <Screen centered>
        <Spinner />
      </Screen>
    )
  }

  if (vehicles.length === 0) {
    return (
      <Screen centered>
        <div className="flex flex-col items-center gap-4">
          <p>Nenhum veículo cadastrado</p>

          <Button onClick={() => navigate('/vehicles/new')} className="w-auto px-4">
            Cadastrar Veículo
          </Button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen wide>
      <h1 className="mb-5 text-xl font-bold">Selecione um veículo</h1>

      <ul className="flex flex-col gap-3">
        {vehicles.map((item) => (
          <li key={item.id}>
            <button
              className="flex w-full items-center gap-3 rounded-xl bg-white p-4 text-left shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100"
              onClick={() => activateSelectedVehicle(item.id)}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-base text-green-700">
                🚗
              </div>
              <div>
                <p className="font-bold">
                  {item.brand} {item.model}
                </p>
                <p>Placa: {item.licensePlate}</p>
                <p>Ano: {item.modelYear}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
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
git add src/routes/SelectVehicle.tsx
git commit -m "fix: activating a vehicle from the switcher no longer silently fails"
```

---

### Task 8: `src/routes/Vehicles.tsx` — management list

**Files:**
- Create: `src/routes/Vehicles.tsx`

**Interfaces:**
- Consumes: `listVehicles`, `deleteVehicle`, `activateVehicle`, `listSharedVehicles` (Task 3); `Vehicle`, `VehicleShare` (Task 2); `useVehicle` (`VehicleContext`); `useToast`, `useConfirm`.
- Produces: `export function Vehicles()`. Consumed by Task 10 (`App.tsx`).

- [ ] **Step 1: Create the file**

```tsx
// src/routes/Vehicles.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  activateVehicle,
  deleteVehicle,
  listSharedVehicles,
  listVehicles,
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

function formatKm(km: number) {
  return `${km.toLocaleString('pt-BR')} km`
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

export function Vehicles() {
  const navigate = useNavigate()
  const { activeVehicle, loadActiveVehicle } = useVehicle()
  const { showToast } = useToast()
  const confirm = useConfirm()

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [sharedVehicles, setSharedVehicles] = useState<VehicleShare[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    } catch (err) {
      console.log(err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleActivate(id: number) {
    try {
      setBusyId(id)
      await activateVehicle(id)
      await loadActiveVehicle()
      showToast('Veículo ativado.', 'success')
    } catch (err) {
      console.log(err)
      showToast('Não foi possível ativar o veículo')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(vehicle: Vehicle) {
    const ok = await confirm(
      `Excluir "${vehicle.brand} ${vehicle.model}"? Esta ação não pode ser desfeita.`
    )
    if (!ok) return

    try {
      setBusyId(vehicle.id)
      await deleteVehicle(vehicle.id)
      await load()
      if (activeVehicle?.id === vehicle.id) {
        await loadActiveVehicle()
      }
      showToast('Veículo excluído.', 'success')
    } catch (err) {
      console.log(err)
      showToast('Não foi possível excluir o veículo')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <Screen centered>
        <Spinner />
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen centered>
        <div className="flex flex-col items-center gap-4">
          <ErrorState message="Não foi possível carregar seus veículos." />
          <Button fullWidth={false} onClick={load}>
            Tentar novamente
          </Button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen wide>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold">Meus veículos</h1>
        <Button fullWidth={false} className="text-sm" onClick={() => navigate('/vehicles/new')}>
          Novo veículo
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <p className="text-gray-600">Nenhum veículo cadastrado</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {vehicles.map((vehicle) => {
            const isActive = activeVehicle?.id === vehicle.id
            const isBusy = busyId === vehicle.id

            return (
              <li key={vehicle.id}>
                <Card>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-bold">
                      {vehicle.brand} {vehicle.model}
                    </p>
                    {isActive && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                        Ativo
                      </span>
                    )}
                  </div>

                  <p>Placa: {vehicle.licensePlate || '—'}</p>
                  <p>Odômetro: {formatKm(vehicle.currentKm)}</p>

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
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {sharedVehicles.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-bold">Compartilhados comigo</h2>
          <ul className="flex flex-col gap-3">
            {sharedVehicles.map((share) => (
              <li key={share.id}>
                <Card>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-bold">
                      {share.vehicleBrand} {share.vehicleModel}
                    </p>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                      Emprestado
                    </span>
                  </div>
                  <p>Compartilhado por: {share.ownerName}</p>
                  {share.expiresAt && <p>Até: {formatDate(share.expiresAt)}</p>}
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}
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
git add src/routes/Vehicles.tsx
git commit -m "feat: add vehicle management list (activate, edit, delete, shared-with-me)"
```

---

### Task 9: `src/routes/VehicleEdit.tsx` — single-page edit form

**Files:**
- Create: `src/routes/VehicleEdit.tsx`

**Interfaces:**
- Consumes: `getVehicle`, `updateVehicle` (Task 3); `uploadVehiclePhoto` (`src/services/api.ts`); `Vehicle` (Task 2); `Step1Identification`, `Step2Classification`, `Step3Details`, `Step4Photo`, `parseFipeYearLabel`, `VehicleTypeValue`, `EnergyTypeValue`, `FuelTypeValue` (Task 5); `useAuthenticatedImage` (`src/hooks/useAuthenticatedImage.ts`).
- Produces: `export function VehicleEdit()`. Consumed by Task 10 (`App.tsx`).

- [ ] **Step 1: Create the file**

```tsx
// src/routes/VehicleEdit.tsx
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { uploadVehiclePhoto } from '../services/api'
import { getVehicle, updateVehicle } from '../services/vehicle'
import { useVehicle } from '../context/VehicleContext'
import { useToast } from '../context/ToastContext'
import { useFipeSelection } from '../hooks/useFipeSelection'
import { useAuthenticatedImage } from '../hooks/useAuthenticatedImage'
import type { Vehicle } from '../types/Vehicle'
import { Screen } from '../components/ui/Screen'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import {
  Step1Identification,
  Step2Classification,
  Step3Details,
  Step4Photo,
  parseFipeYearLabel,
  type EnergyTypeValue,
  type FuelTypeValue,
  type VehicleTypeValue,
} from './vehicle/fields'

export function VehicleEdit() {
  const { id } = useParams<{ id: string }>()
  const vehicleId = Number(id)
  const navigate = useNavigate()
  const { activeVehicle, loadActiveVehicle } = useVehicle()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null)

  const [vehicleType, setVehicleType] = useState<VehicleTypeValue>('Carro')
  const [useFipeSearch, setUseFipeSearch] = useState(false)
  const fipe = useFipeSelection(vehicleType === 'Carro' ? 'carros' : 'motos')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [manufactureYear, setManufactureYear] = useState('')
  const [modelYear, setModelYear] = useState('')
  const [brandError, setBrandError] = useState(false)
  const [modelError, setModelError] = useState(false)
  const [manufactureYearError, setManufactureYearError] = useState(false)
  const [modelYearError, setModelYearError] = useState(false)

  const [energyType, setEnergyType] = useState<EnergyTypeValue>('COMBUSTION')
  const [fuelType, setFuelType] = useState<FuelTypeValue>('Flex')
  const showFuelType = energyType === 'COMBUSTION' || energyType === 'HYBRID'
  const showTankCapacity = energyType === 'COMBUSTION' || energyType === 'HYBRID'
  const showBatteryCapacity = energyType === 'ELECTRIC' || energyType === 'HYBRID'

  const [licensePlate, setLicensePlate] = useState('')
  const [color, setColor] = useState('')
  const [currentKm, setCurrentKm] = useState('')
  const [tankCapacity, setTankCapacity] = useState('')
  const [batteryCapacity, setBatteryCapacity] = useState('')
  const [licensePlateError, setLicensePlateError] = useState(false)
  const [currentKmError, setCurrentKmError] = useState(false)

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)

  const existingPhotoUrl = useAuthenticatedImage(existingPhotoPath)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    }
  }, [photoPreviewUrl])

  async function load() {
    if (!id || Number.isNaN(vehicleId)) {
      setLoadError(true)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setLoadError(false)
      const vehicle = await getVehicle(vehicleId)
      populateForm(vehicle)
    } catch (err) {
      console.log(err)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  function populateForm(vehicle: Vehicle) {
    setVehicleType(vehicle.type)
    setBrand(vehicle.brand)
    setModel(vehicle.model)
    setManufactureYear(vehicle.manufactureYear ? String(vehicle.manufactureYear) : '')
    setModelYear(vehicle.modelYear ? String(vehicle.modelYear) : '')
    setEnergyType(vehicle.energyType)
    setFuelType((vehicle.fuelSubType as FuelTypeValue | null) ?? 'Flex')
    setLicensePlate(vehicle.licensePlate ?? '')
    setColor(vehicle.color ?? '')
    setCurrentKm(String(vehicle.currentKm))
    setTankCapacity(vehicle.capacity ? String(vehicle.capacity) : '')
    setBatteryCapacity(vehicle.batteryCapacity ? String(vehicle.batteryCapacity) : '')
    setExistingPhotoPath(vehicle.photo)
  }

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

  function handleCurrentKmChange(value: string) {
    setCurrentKm(value)
    setCurrentKmError(false)
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setPhotoFile(file)
    setPhotoPreviewUrl(file ? URL.createObjectURL(file) : null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (isSubmitting) return

    const brandInvalid = !brand.trim()
    const modelInvalid = !model.trim()
    const mfYearInvalid = manufactureYear.length !== 4
    const mdYearInvalid = modelYear.length !== 4
    const plateInvalid = licensePlate.length !== 7
    const kmInvalid = !currentKm.trim()

    if (brandInvalid || modelInvalid || mfYearInvalid || mdYearInvalid || plateInvalid || kmInvalid) {
      setBrandError(brandInvalid)
      setModelError(modelInvalid)
      setManufactureYearError(mfYearInvalid)
      setModelYearError(mdYearInvalid)
      setLicensePlateError(plateInvalid)
      setCurrentKmError(kmInvalid)
      return
    }

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
      if (showTankCapacity && tankCapacity) {
        payload.capacity = Number(tankCapacity.replace(',', '.'))
      }
      if (showBatteryCapacity && batteryCapacity) {
        payload.batteryCapacity = Number(batteryCapacity.replace(',', '.'))
      }
      if (payload.capacity === undefined && payload.batteryCapacity !== undefined) {
        payload.capacity = payload.batteryCapacity
      }

      await updateVehicle(vehicleId, payload)

      if (photoFile) {
        try {
          await uploadVehiclePhoto(vehicleId, photoFile)
        } catch (photoError) {
          console.log(photoError)
          showToast('Veículo atualizado, mas a foto não pôde ser enviada.')
        }
      }

      if (activeVehicle?.id === vehicleId) {
        await loadActiveVehicle()
      }

      showToast('Veículo atualizado com sucesso.', 'success')
      navigate('/vehicles')
    } catch (error) {
      console.log(error)
      showToast('Erro ao salvar veículo')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Screen centered>
        <Spinner />
      </Screen>
    )
  }

  if (loadError) {
    return (
      <Screen centered>
        <div className="flex flex-col items-center gap-4">
          <ErrorState message="Não foi possível carregar este veículo." />
          <Button fullWidth={false} onClick={() => navigate('/vehicles')}>
            Voltar
          </Button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen wide>
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">Editar veículo</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Identificação</h2>
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
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Classificação</h2>
          <Step2Classification
            energyType={energyType}
            onEnergyTypeChange={setEnergyType}
            showFuelType={showFuelType}
            fuelType={fuelType}
            onFuelTypeChange={setFuelType}
          />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Detalhes</h2>
          <Step3Details
            licensePlate={licensePlate}
            onLicensePlateChange={handleLicensePlateChange}
            licensePlateError={licensePlateError}
            color={color}
            onColorChange={setColor}
            currentKm={currentKm}
            onCurrentKmChange={handleCurrentKmChange}
            currentKmError={currentKmError}
            showTankCapacity={showTankCapacity}
            tankCapacity={tankCapacity}
            onTankCapacityChange={setTankCapacity}
            showBatteryCapacity={showBatteryCapacity}
            batteryCapacity={batteryCapacity}
            onBatteryCapacityChange={setBatteryCapacity}
          />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Foto</h2>
          <Step4Photo
            photoPreviewUrl={photoPreviewUrl}
            existingPhotoUrl={existingPhotoUrl}
            onPhotoChange={handlePhotoChange}
          />
        </section>

        <div className="mt-2 flex flex-col gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
          </Button>
          <button
            type="button"
            onClick={() => navigate('/vehicles')}
            className="block w-full text-center text-sm text-green-700"
          >
            Cancelar
          </button>
        </div>
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
git add src/routes/VehicleEdit.tsx
git commit -m "feat: add single-page vehicle edit form"
```

---

### Task 10: Register the 2 new routes in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `Vehicles` (Task 8), `VehicleEdit` (Task 9).
- Produces: routes `/vehicles`, `/vehicles/:id/edit`.

- [ ] **Step 1: Read the current file and confirm it matches**

Run: `cat /home/rocha/Projetos/flowfuel-frontend/src/App.tsx`

Confirm the `<Routes>` block still has `/vehicles/new` as the only `/vehicles*` route inside the `ProtectedRoute`/`AppLayout` group. If other routes were added since, add the two new lines below in the same style rather than replacing the whole file.

- [ ] **Step 2: Add the two imports**

Add these two lines to the import block, right after `import { VehicleNew } from './routes/VehicleNew'`:

```tsx
import { Vehicles } from './routes/Vehicles'
import { VehicleEdit } from './routes/VehicleEdit'
```

- [ ] **Step 3: Add the two routes**

Add these two lines right after `<Route path="/vehicles/new" element={<VehicleNew />} />`:

```tsx
                    <Route path="/vehicles" element={<Vehicles />} />
                    <Route path="/vehicles/:id/edit" element={<VehicleEdit />} />
```

- [ ] **Step 4: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 5: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/App.tsx
git commit -m "feat: register /vehicles and /vehicles/:id/edit routes"
```

---

### Task 11: `Profile.tsx` — "Meus veículos" entry point

**Files:**
- Modify: `src/routes/Profile.tsx`

**Interfaces:**
- Consumes: nothing new (uses the existing `navigate` and `ActionRow` already in this file).
- Produces: no change to `Profile`'s exported shape.

- [ ] **Step 1: Read the current file and confirm it matches**

Run: `grep -n "ActionRow label=\"Editar perfil\"" -B 2 -A 4 /home/rocha/Projetos/flowfuel-frontend/src/routes/Profile.tsx`

Confirm the output matches:

```tsx
      <div className="mt-6 flex flex-col overflow-hidden rounded-xl bg-white shadow-sm">
        <ActionRow label="Editar perfil" onClick={() => navigate('/profile/edit')} />
        <div className="border-t border-gray-100" />
        <ActionRow label="Trocar senha" onClick={() => navigate('/profile/change-password')} />
      </div>
```

If it doesn't match (extra items already added by another change), insert the new `ActionRow` in the equivalent position instead of doing a blind find-and-replace.

- [ ] **Step 2: Insert "Meus veículos" before "Editar perfil"**

Replace:

```tsx
      <div className="mt-6 flex flex-col overflow-hidden rounded-xl bg-white shadow-sm">
        <ActionRow label="Editar perfil" onClick={() => navigate('/profile/edit')} />
        <div className="border-t border-gray-100" />
        <ActionRow label="Trocar senha" onClick={() => navigate('/profile/change-password')} />
      </div>
```

With:

```tsx
      <div className="mt-6 flex flex-col overflow-hidden rounded-xl bg-white shadow-sm">
        <ActionRow label="Meus veículos" onClick={() => navigate('/vehicles')} />
        <div className="border-t border-gray-100" />
        <ActionRow label="Editar perfil" onClick={() => navigate('/profile/edit')} />
        <div className="border-t border-gray-100" />
        <ActionRow label="Trocar senha" onClick={() => navigate('/profile/change-password')} />
      </div>
```

- [ ] **Step 3: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 4: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/routes/Profile.tsx
git commit -m "feat: add Meus veículos entry point in Profile"
```

---

### Task 12: Manual verification — vehicle management

**Files:** none — manual browser pass. Requires a logged-in session (QA account `yhe66@web-library.net` / `FlowFuel@2026!`, which has several vehicles already on production, per memory).

- [ ] **Step 1: Start the dev server**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npm run dev`, log in.

- [ ] **Step 2: Bug fix — activating a vehicle from the switcher**

Go to `/select-vehicle` (or click the vehicle name in the topbar to get there). Click a **different** vehicle than the currently active one. Confirm: a green "Veículo ativado." toast appears, you're navigated to `/` (Home), and the Home dashboard now shows the vehicle you just picked (not the old one). Before this plan, this silently did nothing — confirm it now actually works.

- [ ] **Step 3: Bug fix — creating a vehicle**

Go to `/vehicles/new`, complete all 4 steps with a throwaway vehicle (any brand/model, plate optional), click "Cadastrar" on step 4. Confirm: a green "Veículo cadastrado com sucesso." toast (not the red "Erro ao cadastrar veículo" it showed before this plan), you're navigated to `/`, and Home shows the new vehicle as active.

- [ ] **Step 4: `/vehicles` list**

Navigate to `/profile`, click "Meus veículos" — confirm it opens `/vehicles` and lists all your vehicles, with a green "Ativo" badge on the one that matches the Home dashboard. Confirm placa and odômetro are shown for each.

- [ ] **Step 5: Set as active from the list**

Click "Definir como ativo" on a non-active vehicle's card. Confirm: a success toast, the badge moves to that card, and the "Definir como ativo" button disappears from it (appearing instead on the previously-active card).

- [ ] **Step 6: Edit a vehicle**

Click "Editar" on any card. Confirm `/vehicles/:id/edit` loads with every field pre-filled (brand, model, years, plate formatted as `ABC-1234` or shown as-is for Mercosul plates, color, energy type, fuel type chip if applicable, odometer, tank/battery capacity, and the current photo if the vehicle has one — if it doesn't, confirm the "Escolher foto" placeholder shows instead of a broken image icon). Clear the "Km Atual" field and click "Salvar alterações" — confirm a red "Informe o odômetro atual." message appears and it does not submit. Put the km back, change the color, and save — confirm a success toast, redirect to `/vehicles`, and the updated color visible if you edit it again.

- [ ] **Step 7: Edit the active vehicle specifically**

Repeat step 6 on whichever vehicle currently has the "Ativo" badge, changing the brand or model slightly. After saving, go to `/` (Home) and confirm the header there reflects the change immediately (proves `loadActiveVehicle()` is called when the edited vehicle is the active one).

- [ ] **Step 8: Delete a vehicle**

On the throwaway vehicle created in Step 3, click "Excluir". Confirm a dialog appears with the message `Excluir "<brand> <model>"? Esta ação não pode ser desfeita.` and a button labeled "Excluir". Confirm it — confirm the card disappears from the list and a success toast shows. If you deleted the active vehicle, confirm the Home dashboard now shows a different vehicle as active (or the "no vehicles" empty state if that was your last one — don't do this to your only remaining real vehicle, use a throwaway).

- [ ] **Step 9: Shared-with-me section**

If the QA account has no active vehicle shares right now (per memory, likely none), confirm the "Compartilhados comigo" section simply doesn't render at all (no empty placeholder, no error) — this is expected, not a bug.

---

### Task 13: Deploy and smoke-test in production

**Files:** none.

- [ ] **Step 1: Deploy**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && git push origin main`

- [ ] **Step 2: Wait for the Render deploy and confirm the new bundle is live**

Run: `curl -s https://flowfuel-web.onrender.com/ | grep -o 'assets/index-[^"]*\.js'`, then `curl -s -I https://flowfuel-web.onrender.com/ | grep -i last-modified` — confirm the timestamp is recent (after the push) and the asset hash changed from before this deploy.

- [ ] **Step 3: Re-run the critical path in production**

Repeat Task 12's Steps 2 (activate bug fix) and 4 (list loads) against `https://flowfuel-web.onrender.com` instead of `localhost:5173`, using the QA account. Do **not** repeat Step 8 (delete) against production with real data unless you create a fresh throwaway vehicle first.

---

## Self-Review

**Cobertura do spec (`docs/superpowers/specs/2026-07-27-vehicle-management-design.md`):**
- Tipo/serviço compartilhados (`Vehicle`, `VehicleShare`, `services/vehicle.ts`) → Tasks 2-3, com os campos `capacity`/`batteryCapacity`/`photo` corrigidos contra o DTO real do backend (a spec presumia um único campo `capacity` e `photoUrl`, ambos incorretos — ver Global Constraints).
- `VehicleContext` usando o tipo compartilhado → Task 4.
- Lista `/vehicles` com veículos próprios, ativar/editar/excluir → Task 8.
- Seção "Compartilhados comigo" somente leitura → Task 8.
- `/vehicles/:id/edit` de página única, placa+odômetro obrigatórios, upload de foto só no salvar → Task 9.
- Extração de código compartilhado com `VehicleNew.tsx` (`vehicle/fields.tsx`) → Task 5, consumida pelas Tasks 6 e 9.
- Sem regressão em `/vehicles/new` → Task 6 (mesmo `handleSubmit`/validações, só troca de import e um bug real corrigido).
- Entrada de navegação em `/profile` → Task 11.
- `npx tsc -b` limpo como critério de aceitação → Step de type-check em toda task.

**Adição não prevista na spec, mas necessária:** Tasks 6 e 7 corrigem um bug de produção confirmado por `curl` real (ativar veículo lança `SyntaxError` em corpo vazio) nos dois únicos lugares que já chamavam esse endpoint antes deste plano. A spec dizia "não refatorar `SelectVehicle.tsx`" — isso não é violado aqui: é uma troca de uma chamada quebrada por uma função seg do novo serviço, não uma refatoração da tela.

**Placeholder scan:** nenhum "TBD"/"TODO" — todo step tem código completo ou comando exato, incluindo os arquivos inteiros reescritos nas Tasks 4, 6, 7, 8 e 9.

**Consistência de tipos:** `Vehicle`/`VehicleShare` (Task 2) são os mesmos em todos os `import type` das Tasks 3, 4, 8, 9. `listVehicles(): Promise<PageResponse<Vehicle>>`, `getVehicle(id: number): Promise<Vehicle>`, `updateVehicle(id: number, payload: Record<string, unknown>): Promise<Vehicle>`, `deleteVehicle(id: number): Promise<void>`, `activateVehicle(id: number): Promise<void>`, `listSharedVehicles(): Promise<VehicleShare[]>` (Task 3) são chamados com esses mesmos tipos de parâmetro em todas as tasks consumidoras. `Step1Props`/`Step2Props`/`Step3Props`/`Step4Props` e os componentes `Step1Identification`/`Step2Classification`/`Step3Details`/`Step4Photo` (Task 5) recebem exatamente as mesmas props nas Tasks 6 e 9, com `currentKmError`/`existingPhotoUrl` usados apenas na Task 9 (ambos opcionais, então a Task 6 não precisa passá-los). `useAuthenticatedImage(path: string | null): string | null` (já existente, do plano de perfil) é chamado como `useAuthenticatedImage(existingPhotoPath)` na Task 9, com `existingPhotoPath: string | null` vindo de `vehicle.photo` — tipos batem.

**Nota sobre arquivos compartilhados:** `src/App.tsx` e `src/routes/Profile.tsx` já foram tocados por planos anteriores neste repo — os Steps de leitura no início das Tasks 10 e 11 existem exatamente para o executor reconferir o conteúdo real antes de aplicar as edições, caso não bata exatamente com o mostrado aqui.
