# Dashboard Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `Home.tsx` placeholder with a real dashboard that fetches `GET /api/v1/dashboard/vehicle/{id}` and renders metric cards, covering COMBUSTION/ELECTRIC and HYBRID vehicles.

**Architecture:** `Home.tsx` reads `activeVehicle` from the existing `VehicleContext`, fetches dashboard data via the existing `authenticatedRequest` helper, and renders it as a grid of cards. The `Dashboard` type is corrected to match the backend's actual `DashboardDTO` (it currently has fields — `monthlySpent`, nested `lastRefuel` — that don't exist on the real API response).

**Tech Stack:** React 19 + TypeScript + Tailwind, Vite. No test runner is configured in this project — verification is manual (type-check via `tsc` + running the dev server against the real API).

---

## Task 1: Correct the `Dashboard` type

**Files:**
- Modify: `src/types/Dashboard.ts`

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `src/types/Dashboard.ts` with:

```ts
export type FuelMetrics = {
  totalEnergy: number
  totalSpent: number
  averagePrice: number
  averageConsumption: number
  energyUnit: string
  priceUnit: string
  consumptionUnit: string
}

export type Dashboard = {
  vehicleId: number
  energyType: 'COMBUSTION' | 'ELECTRIC' | 'HYBRID'
  totalRefuels: number
  totalSpent: number
  costPerKm: number
  totalEnergy: number | null
  averagePrice: number | null
  averageConsumption: number | null
  energyUnit: string | null
  priceUnit: string | null
  consumptionUnit: string | null
  breakdown: {
    fuel: FuelMetrics
    electric: FuelMetrics
  } | null
  lastRefuelDate: string | null
  lastOdometer: number | null
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors referencing `Dashboard.ts` (errors in `Home.tsx` about the old placeholder are fine — Task 2 fixes those).

- [ ] **Step 3: Commit**

```bash
git add src/types/Dashboard.ts
git commit -m "fix: correct Dashboard type to match backend DashboardDTO"
```

---

## Task 2: Rewrite `Home.tsx` to fetch and render real dashboard data

**Files:**
- Modify: `src/routes/Home.tsx`

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `src/routes/Home.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import type { Dashboard, FuelMetrics } from '../types/Dashboard'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const integerFormatter = new Intl.NumberFormat('pt-BR')

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-100 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  )
}

function FuelMetricsCard({
  title,
  metrics,
}: {
  title: string
  metrics: FuelMetrics
}) {
  return (
    <div className="rounded-lg bg-gray-100 p-4">
      <p className="mb-2 text-sm font-bold text-gray-700">{title}</p>

      <p className="text-sm text-gray-500">Consumo médio</p>
      <p className="mb-2 font-bold text-gray-900">
        {metrics.averageConsumption.toFixed(2)} {metrics.consumptionUnit}
      </p>

      <p className="text-sm text-gray-500">Preço médio</p>
      <p className="mb-2 font-bold text-gray-900">
        {currencyFormatter.format(metrics.averagePrice)} {metrics.priceUnit}
      </p>

      <p className="text-sm text-gray-500">Total gasto</p>
      <p className="font-bold text-gray-900">
        {currencyFormatter.format(metrics.totalSpent)}
      </p>
    </div>
  )
}

export function Home() {
  const { activeVehicle } = useVehicle()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [activeVehicle?.id])

  async function loadDashboard() {
    if (!activeVehicle) return

    try {
      setLoading(true)
      setError(false)
      const response = await authenticatedRequest(
        `/dashboard/vehicle/${activeVehicle.id}`
      )
      setDashboard(response)
    } catch (err) {
      console.log(err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    )
  }

  if (error || !dashboard) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Não foi possível carregar o dashboard</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-5">
      <h1 className="mb-5 text-xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3">
        <Card
          label="Total gasto"
          value={currencyFormatter.format(dashboard.totalSpent)}
        />

        <Card
          label="Custo por km"
          value={`${currencyFormatter.format(dashboard.costPerKm)}/km`}
        />

        <Card
          label="Total de abastecimentos"
          value={integerFormatter.format(dashboard.totalRefuels)}
        />

        <Card
          label="Último abastecimento"
          value={
            dashboard.lastRefuelDate
              ? `${formatDate(dashboard.lastRefuelDate)} · ${integerFormatter.format(
                  dashboard.lastOdometer ?? 0
                )} km`
              : 'Nenhum abastecimento ainda'
          }
        />

        {dashboard.energyType !== 'HYBRID' &&
          dashboard.averageConsumption !== null && (
            <Card
              label="Consumo médio"
              value={`${dashboard.averageConsumption.toFixed(2)} ${
                dashboard.consumptionUnit
              }`}
            />
          )}
      </div>

      {dashboard.energyType === 'HYBRID' && dashboard.breakdown && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <FuelMetricsCard title="Combustível" metrics={dashboard.breakdown.fuel} />
          <FuelMetricsCard title="Elétrico" metrics={dashboard.breakdown.electric} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Home.tsx
git commit -m "feat: connect dashboard screen to GET /dashboard/vehicle/{id}"
```

---

## Task 3: Manual verification against the real API

**Files:** none (verification only)

- [ ] **Step 1: Start the frontend dev server**

Run: `npm run dev`
Expected: Vite prints a local URL (default `http://localhost:5173`).

- [ ] **Step 2: Verify the COMBUSTION/ELECTRIC path**

In the browser: log in with a user that has an active COMBUSTION or ELECTRIC vehicle with at least one refuel (create one via `/vehicles/new` and log a refuel first if none exists). Load `/`.

Expected: page shows "Dashboard" heading, 5 cards (Total gasto, Custo por km, Total de abastecimentos, Último abastecimento, Consumo médio), no console errors, and the "Consumo médio" card shows a unit matching the vehicle's energy type (e.g. `km/L`).

- [ ] **Step 3: Verify the HYBRID path**

Create or use a vehicle with `energyType: HYBRID` that has at least one fuel refuel and one electric refuel logged. Load `/`.

Expected: the 4 common cards render, no single "Consumo médio" card appears, and two additional cards "Combustível" and "Elétrico" render below with their own consumption/price/total.

- [ ] **Step 4: Verify the empty-refuel path**

Use a freshly created vehicle with zero refuels. Load `/`.

Expected: "Último abastecimento" card shows "Nenhum abastecimento ainda" instead of crashing on a `null` date.

- [ ] **Step 5: Verify the error path**

With devtools open, throttle/block the network request to `/api/v1/dashboard/vehicle/*` (e.g. via DevTools request blocking) and reload `/`.

Expected: page shows "Não foi possível carregar o dashboard" instead of a blank screen or crash.
