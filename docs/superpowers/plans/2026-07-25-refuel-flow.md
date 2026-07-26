# Refuel Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the already-built Refuel screens into routing, add entry points from the Dashboard, and add Odômetro/Trip and Preço-por-litro/Valor-total input toggles to `RefuelForm`.

**Architecture:** `Refuels.tsx` and `RefuelForm.tsx` already exist and already use the shared UI primitives — only `App.tsx` routing, `Home.tsx` entry points, and `RefuelForm.tsx`'s input modes need changes. A new `src/components/ui/SegmentedToggle.tsx` backs both toggles. The backend's `RefuelRequestDTO` (confirmed by reading `RefuelRequestDTO.java`) only accepts absolute `odometer` and `pricePerUnit` — both toggles compute those same two values on the frontend before submit; no API contract changes.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind CSS, react-router-dom. No test runner — verification is `npm run build` plus manual checks.

---

### Task 1: Wire Refuel routes into `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add imports and routes**

In `src/App.tsx`, add imports after the existing `Home` import:
```tsx
import { Refuels } from './routes/Refuels'
import { RefuelForm } from './routes/RefuelForm'
```

Add routes inside the existing `<Route element={<ProtectedRoute />}>` block, after `/` :
```tsx
              <Route path="/" element={<Home />} />
              <Route path="/refuels" element={<Refuels />} />
              <Route path="/refuels/new" element={<RefuelForm />} />
              <Route path="/refuels/:id/edit" element={<RefuelForm />} />
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire Refuel routes into the router"
```

---

### Task 2: Add Dashboard entry points

**Files:**
- Modify: `src/routes/Home.tsx`

- [ ] **Step 1: Import `useNavigate` and `Button`**

In `src/routes/Home.tsx`, change:
```tsx
import { useEffect, useState } from 'react'
import { authenticatedRequest } from '../services/api'
```
to:
```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
```

and add the `Button` import alongside the other `components/ui` imports:
```tsx
import { Button } from '../components/ui/Button'
```

- [ ] **Step 2: Get `navigate` in `Home()`**

Change:
```tsx
export function Home() {
  const { activeVehicle } = useVehicle()
```
to:
```tsx
export function Home() {
  const navigate = useNavigate()
  const { activeVehicle } = useVehicle()
```

- [ ] **Step 3: Add the buttons after the hybrid breakdown block**

Change the end of the returned JSX from:
```tsx
      {dashboard.energyType === 'HYBRID' && dashboard.breakdown && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <FuelMetricsCard icon="⛽" title="Combustível" metrics={dashboard.breakdown.fuel} />
          <FuelMetricsCard icon="🔌" title="Elétrico" metrics={dashboard.breakdown.electric} />
        </div>
      )}
    </Screen>
  )
}
```
to:
```tsx
      {dashboard.energyType === 'HYBRID' && dashboard.breakdown && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <FuelMetricsCard icon="⛽" title="Combustível" metrics={dashboard.breakdown.fuel} />
          <FuelMetricsCard icon="🔌" title="Elétrico" metrics={dashboard.breakdown.electric} />
        </div>
      )}

      <Button className="mt-5" onClick={() => navigate('/refuels/new')}>
        Novo Abastecimento
      </Button>

      <button
        type="button"
        onClick={() => navigate('/refuels')}
        className="mt-3 block w-full text-center text-sm text-green-700"
      >
        Ver histórico de abastecimentos
      </button>
    </Screen>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual check**

`npm run dev`, open `/`, confirm both new controls appear below the cards and navigate to `/refuels/new` and `/refuels` respectively.

- [ ] **Step 6: Commit**

```bash
git add src/routes/Home.tsx
git commit -m "feat: add refuel entry points to Dashboard"
```

---

### Task 3: `SegmentedToggle` component

**Files:**
- Create: `src/components/ui/SegmentedToggle.tsx`

- [ ] **Step 1: Create the component**

```tsx
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex rounded-lg border border-gray-300 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex-1 rounded-md py-2 text-sm font-bold transition-colors ${
            value === option.value
              ? 'bg-green-600 text-white'
              : 'text-gray-600'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/SegmentedToggle.tsx
git commit -m "feat: add SegmentedToggle primitive"
```

---

### Task 4: Add the distance (Odômetro/Trip) and price (Preço/Valor total) toggles to `RefuelForm`

**Files:**
- Modify: `src/routes/RefuelForm.tsx`

- [ ] **Step 1: Replace the file contents**

Read the current file first to confirm it still matches (it was last touched by an earlier commit that retrofitted it to the shared UI primitives), then replace it with:

```tsx
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import type { Refuel, RefuelRequest, RefuelType } from '../types/Refuel'
import type { Dashboard } from '../types/Dashboard'
import { Screen } from '../components/ui/Screen'
import { Spinner } from '../components/ui/Spinner'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'
import { SegmentedToggle } from '../components/ui/SegmentedToggle'

type DistanceMode = 'odometer' | 'trip'
type PriceMode = 'perUnit' | 'total'

export function RefuelForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const { activeVehicle } = useVehicle()
  const navigate = useNavigate()

  const [distanceMode, setDistanceMode] = useState<DistanceMode>('odometer')
  const [odometer, setOdometer] = useState('')
  const [tripKm, setTripKm] = useState('')
  const [baseline, setBaseline] = useState<number | null>(null)

  const [priceMode, setPriceMode] = useState<PriceMode>('perUnit')
  const [energyAmount, setEnergyAmount] = useState('')
  const [pricePerUnit, setPricePerUnit] = useState('')
  const [totalValue, setTotalValue] = useState('')

  const [fullTank, setFullTank] = useState(false)
  const [refuelType, setRefuelType] = useState<RefuelType>('FUEL')
  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)

  const isHybrid = activeVehicle?.energyType === 'HYBRID'

  useEffect(() => {
    if (isEditing) {
      loadRefuel()
    } else {
      loadBaseline()
    }
  }, [id])

  async function loadRefuel() {
    try {
      const refuel: Refuel = await authenticatedRequest(`/refuels/${id}`)
      setOdometer(String(refuel.odometer))
      setEnergyAmount(String(refuel.energyAmount))
      setPricePerUnit(String(refuel.pricePerUnit))
      setFullTank(refuel.fullTank)
      setRefuelType(refuel.refuelType)
    } catch (err) {
      console.log(err)
      alert('Erro ao carregar abastecimento')
      navigate('/refuels')
    } finally {
      setLoading(false)
    }
  }

  async function loadBaseline() {
    if (!activeVehicle) return

    try {
      const dashboard: Dashboard = await authenticatedRequest(
        `/dashboard/vehicle/${activeVehicle.id}`
      )
      setBaseline(dashboard.lastOdometer ?? activeVehicle.currentKm)
    } catch (err) {
      console.log(err)
      setBaseline(activeVehicle.currentKm)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const finalOdometer =
      distanceMode === 'trip' && !isEditing
        ? (baseline ?? 0) + parseInt(tripKm || '0')
        : parseInt(odometer || '0')

    const finalPricePerUnit =
      priceMode === 'total'
        ? parseFloat(totalValue || '0') / parseFloat(energyAmount || '1')
        : parseFloat(pricePerUnit || '0')

    const distanceFilled =
      distanceMode === 'trip' && !isEditing ? Boolean(tripKm) : Boolean(odometer)
    const priceFilled =
      priceMode === 'total' ? Boolean(totalValue) : Boolean(pricePerUnit)

    if (!distanceFilled || !energyAmount || !priceFilled || !activeVehicle) {
      alert('Preencha todos os campos')
      return
    }

    const body: RefuelRequest = {
      vehicleId: Number(activeVehicle.id),
      odometer: finalOdometer,
      energyAmount: parseFloat(energyAmount),
      pricePerUnit: finalPricePerUnit,
      fullTank,
      refuelType: isHybrid ? refuelType : null,
    }

    try {
      setSubmitting(true)

      if (isEditing) {
        await authenticatedRequest(`/refuels/${id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
      } else {
        await authenticatedRequest('/refuels', {
          method: 'POST',
          body: JSON.stringify(body),
        })
      }

      navigate('/refuels')
    } catch (err) {
      console.log(err)
      alert('Erro ao salvar abastecimento')
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

  const computedPricePerUnit =
    priceMode === 'total' && totalValue && energyAmount
      ? (parseFloat(totalValue) / parseFloat(energyAmount)).toFixed(2)
      : null

  return (
    <Screen>
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">
        {isEditing ? 'Editar Abastecimento' : 'Novo Abastecimento'}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isEditing && (
          <SegmentedToggle
            options={[
              { value: 'odometer', label: 'Odômetro' },
              { value: 'trip', label: 'Trip' },
            ]}
            value={distanceMode}
            onChange={setDistanceMode}
          />
        )}

        {distanceMode === 'trip' && !isEditing ? (
          <div>
            <TextField
              placeholder="Km rodados desde o último abastecimento"
              value={tripKm}
              onChange={(e) => setTripKm(e.target.value)}
              inputMode="numeric"
            />
            {baseline !== null && (
              <p className="mt-1 text-sm text-gray-600">
                A partir de {baseline.toLocaleString('pt-BR')} km
              </p>
            )}
          </div>
        ) : (
          <TextField
            placeholder="Odômetro (km)"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
            inputMode="numeric"
          />
        )}

        <TextField
          placeholder={
            isHybrid && refuelType === 'ELECTRIC'
              ? 'Quantidade (kWh)'
              : 'Quantidade (L)'
          }
          value={energyAmount}
          onChange={(e) => setEnergyAmount(e.target.value)}
          inputMode="decimal"
        />

        <SegmentedToggle
          options={[
            { value: 'perUnit', label: 'Preço por litro' },
            { value: 'total', label: 'Valor total' },
          ]}
          value={priceMode}
          onChange={setPriceMode}
        />

        {priceMode === 'total' ? (
          <div>
            <TextField
              placeholder="Valor total pago"
              value={totalValue}
              onChange={(e) => setTotalValue(e.target.value)}
              inputMode="decimal"
            />
            {computedPricePerUnit && (
              <p className="mt-1 text-sm text-gray-600">
                R$ {computedPricePerUnit}
                {isHybrid && refuelType === 'ELECTRIC' ? '/kWh' : '/L'}
              </p>
            )}
          </div>
        ) : (
          <TextField
            placeholder="Preço por unidade"
            value={pricePerUnit}
            onChange={(e) => setPricePerUnit(e.target.value)}
            inputMode="decimal"
          />
        )}

        {isHybrid && (
          <select
            className="h-12 w-full rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            value={refuelType}
            onChange={(e) => setRefuelType(e.target.value as RefuelType)}
          >
            <option value="FUEL">Combustível</option>
            <option value="ELECTRIC">Elétrico</option>
          </select>
        )}

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={fullTank}
            onChange={(e) => setFullTank(e.target.checked)}
          />
          Tanque cheio
        </label>

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Salvar'}
        </Button>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="block w-full text-center text-sm text-green-700"
        >
          Voltar
        </button>
      </form>
    </Screen>
  )
}
```

Note the `select` for `refuelType` picked up the green focus ring for consistency with the rest of the form's inputs (it didn't have one before).

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual check**

`npm run dev`, log in with an account that has an active vehicle:
- `/refuels/new` with no prior refuels: Trip mode shows "A partir de `<vehicle currentKm>` km".
- Create a refuel using Trip mode + Valor total mode; confirm it POSTs `odometer` and `pricePerUnit` computed correctly (check the Network tab request body).
- Create a second refuel using Trip mode; confirm the baseline shown is now the first refuel's odometer (from `dashboard.lastOdometer`).
- `/refuels/:id/edit` for an existing refuel: confirm the distance toggle is hidden (odometer field shown directly, pre-filled) and the price toggle still works.

- [ ] **Step 4: Commit**

```bash
git add src/routes/RefuelForm.tsx
git commit -m "feat: add distance and price input-mode toggles to RefuelForm"
```

---

### Task 5: Final full-app manual pass, push, and deploy

**Files:** none (verification and deployment only)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: succeeds with no errors or warnings.

- [ ] **Step 2: Manual pass**

Walk through: Dashboard → "Novo Abastecimento" → create a refuel with Trip + Valor total → back on Dashboard, numbers updated → "Ver histórico" → see the new refuel in the list → edit it → delete it. Confirm no regressions at 320px width.

- [ ] **Step 3: Push to GitHub**

```bash
git push
```

- [ ] **Step 4: Verify Render deploy**

Check the Render dashboard for `flowfuel-web` — deploy should pick up automatically and show "Live" with the latest commit SHA. Verify on `https://flowfuel-web.onrender.com`.
