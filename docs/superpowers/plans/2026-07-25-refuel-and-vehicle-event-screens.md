# Refuel and Vehicle Event Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full CRUD screens (list, create, edit, delete) for Refuel (abastecimento) and VehicleEvent (evento do veículo), consuming the existing backend endpoints, with entry points from the Dashboard.

**Architecture:** Two parallel route pairs (`Refuels`/`RefuelForm`, `VehicleEvents`/`VehicleEventForm`) share a `usePaginatedList` hook for "load more" pagination and follow the existing form/list conventions already in the codebase (`VehicleNew.tsx`, `SelectVehicle.tsx`). `VehicleContext`'s `Vehicle` type gains an `energyType` field, needed to decide whether the refuel form shows the HYBRID-only `refuelType` selector.

**Tech Stack:** React 19 + TypeScript + Tailwind + react-router-dom v7, Vite. No test runner configured — verification is manual (`npx tsc --noEmit` + `npm run build` + browser check).

---

## Task 1: Shared types and `Vehicle.energyType`

**Files:**
- Create: `src/types/Page.ts`
- Create: `src/types/Refuel.ts`
- Create: `src/types/VehicleEvent.ts`
- Modify: `src/context/VehicleContext.tsx`

- [ ] **Step 1: Create `src/types/Page.ts`**

```ts
export type PageResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
```

- [ ] **Step 2: Create `src/types/Refuel.ts`**

```ts
export type RefuelType = 'FUEL' | 'ELECTRIC'

export type Refuel = {
  id: number
  vehicleId: number
  refuelDate: string
  odometer: number
  kmSinceLastRefuel: number | null
  energyAmount: number
  pricePerUnit: number
  totalAmount: number
  fullTank: boolean
  refuelType: RefuelType
}

export type RefuelRequest = {
  vehicleId: number
  odometer: number
  energyAmount: number
  pricePerUnit: number
  fullTank: boolean
  refuelType: RefuelType | null
}
```

- [ ] **Step 3: Create `src/types/VehicleEvent.ts`**

```ts
export type VehicleEventType =
  | 'FUEL'
  | 'MAINTENANCE'
  | 'OIL_CHANGE'
  | 'CAR_WASH'
  | 'TIRES'
  | 'INSURANCE'
  | 'TAX'
  | 'DOCUMENTS'
  | 'OTHER'

export const VEHICLE_EVENT_TYPE_LABELS: Record<VehicleEventType, string> = {
  FUEL: 'Combustível',
  MAINTENANCE: 'Manutenção',
  OIL_CHANGE: 'Troca de óleo',
  CAR_WASH: 'Lavagem',
  TIRES: 'Pneus',
  INSURANCE: 'Seguro',
  TAX: 'Impostos/Taxas',
  DOCUMENTS: 'Documentos',
  OTHER: 'Outro',
}

export type VehicleEvent = {
  id: number
  vehicleId: number
  type: VehicleEventType
  amount: number
  eventDate: string
  odometer: number | null
  description: string | null
  createdAt: string
  updatedAt: string
}

export type VehicleEventRequest = {
  vehicleId: number
  type: VehicleEventType
  amount: number
  eventDate: string
  odometer: number | null
  description: string | null
}
```

- [ ] **Step 4: Add `energyType` to the `Vehicle` interface in `src/context/VehicleContext.tsx`**

Change:

```ts
interface Vehicle {
  id: string
  brand: string
  model: string
  modelYear: number
  currentKm: number
  licensePlate: string
}
```

to:

```ts
interface Vehicle {
  id: string
  brand: string
  model: string
  modelYear: number
  currentKm: number
  licensePlate: string
  energyType: 'COMBUSTION' | 'ELECTRIC' | 'HYBRID'
}
```

No other change to this file — `GET /vehicles/active` already returns `energyType` in its response body, this only makes the frontend type aware of it.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/types/Page.ts src/types/Refuel.ts src/types/VehicleEvent.ts src/context/VehicleContext.tsx
git commit -m "feat: add Refuel/VehicleEvent/Page types and Vehicle.energyType"
```

---

## Task 2: `usePaginatedList` hook

**Files:**
- Create: `src/hooks/usePaginatedList.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useCallback, useEffect, useState } from 'react'
import { authenticatedRequest } from '../services/api'
import type { PageResponse } from '../types/Page'

export function usePaginatedList<T>(endpoint: string | null) {
  const [items, setItems] = useState<T[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const loadPage = useCallback(
    async (pageToLoad: number) => {
      if (!endpoint) return

      try {
        setLoading(true)
        setError(false)
        const separator = endpoint.includes('?') ? '&' : '?'
        const response: PageResponse<T> = await authenticatedRequest(
          `${endpoint}${separator}page=${pageToLoad}&size=20`
        )
        setItems((prev) =>
          pageToLoad === 0 ? response.content : [...prev, ...response.content]
        )
        setPage(response.page)
        setTotalPages(response.totalPages)
      } catch (err) {
        console.log(err)
        setError(true)
      } finally {
        setLoading(false)
      }
    },
    [endpoint]
  )

  useEffect(() => {
    setItems([])
    setPage(0)
    setTotalPages(0)
    loadPage(0)
  }, [endpoint])

  function loadMore() {
    loadPage(page + 1)
  }

  function reload() {
    loadPage(0)
  }

  return {
    items,
    loading,
    error,
    hasMore: page + 1 < totalPages,
    loadMore,
    reload,
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (This hook isn't used by any component yet, so no unused-import errors should appear, but confirm the file itself compiles.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePaginatedList.ts
git commit -m "feat: add usePaginatedList hook for refuel/event lists"
```

---

## Task 3: Refuels list screen

**Files:**
- Create: `src/routes/Refuels.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import { usePaginatedList } from '../hooks/usePaginatedList'
import type { Refuel } from '../types/Refuel'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('pt-BR')
}

export function Refuels() {
  const { activeVehicle } = useVehicle()
  const navigate = useNavigate()
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const { items, loading, error, hasMore, loadMore, reload } =
    usePaginatedList<Refuel>(
      activeVehicle ? `/refuels/vehicle/${activeVehicle.id}` : null
    )

  async function handleDelete(id: number) {
    if (!confirm('Excluir este abastecimento?')) return

    try {
      setDeletingId(id)
      await authenticatedRequest(`/refuels/${id}`, { method: 'DELETE' })
      await reload()
    } catch (err) {
      console.log(err)
      alert('Erro ao excluir abastecimento')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-5">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold">Abastecimentos</h1>
        <button
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          onClick={() => navigate('/refuels/new')}
        >
          Novo abastecimento
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600">
          Não foi possível carregar os abastecimentos.
        </p>
      )}

      {items.length === 0 && !error && (
        <p className="text-gray-500">Nenhum abastecimento registrado</p>
      )}

      <ul>
        {items.map((item) => (
          <li key={item.id} className="mb-3 rounded-lg bg-gray-100 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-bold">{formatDateTime(item.refuelDate)}</p>
              {item.fullTank && (
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">
                  Tanque cheio
                </span>
              )}
            </div>

            <p>Odômetro: {item.odometer} km</p>
            {item.kmSinceLastRefuel !== null && (
              <p>+{item.kmSinceLastRefuel} km desde o último</p>
            )}
            <p>
              Quantidade: {item.energyAmount}{' '}
              {item.refuelType === 'FUEL' ? 'L' : 'kWh'}
            </p>
            <p>
              Preço: {currencyFormatter.format(item.pricePerUnit)}
              {item.refuelType === 'FUEL' ? '/L' : '/kWh'}
            </p>
            <p className="font-bold">
              Total: {currencyFormatter.format(item.totalAmount)}
            </p>

            <div className="mt-3 flex gap-3">
              <Link
                to={`/refuels/${item.id}/edit`}
                className="text-sm font-bold text-blue-600"
              >
                Editar
              </Link>
              <button
                className="text-sm font-bold text-red-600 disabled:opacity-50"
                disabled={deletingId === item.id}
                onClick={() => handleDelete(item.id)}
              >
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          className="mt-2 w-full rounded-lg bg-gray-200 py-3 text-sm font-bold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
          onClick={loadMore}
          disabled={loading}
        >
          {loading ? 'Carregando...' : 'Carregar mais'}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (`Refuels` isn't routed yet — Task 7 wires it up — so no "unused" concerns, TypeScript doesn't flag unused exported components.)

- [ ] **Step 3: Commit**

```bash
git add src/routes/Refuels.tsx
git commit -m "feat: add Refuels list screen"
```

---

## Task 4: RefuelForm (create/edit) screen

**Files:**
- Create: `src/routes/RefuelForm.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import type { Refuel, RefuelRequest, RefuelType } from '../types/Refuel'

const inputClass =
  'mb-4 h-12 w-full rounded-lg border border-gray-300 px-3 text-base'

export function RefuelForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const { activeVehicle } = useVehicle()
  const navigate = useNavigate()

  const [odometer, setOdometer] = useState('')
  const [energyAmount, setEnergyAmount] = useState('')
  const [pricePerUnit, setPricePerUnit] = useState('')
  const [fullTank, setFullTank] = useState(false)
  const [refuelType, setRefuelType] = useState<RefuelType>('FUEL')
  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)

  const isHybrid = activeVehicle?.energyType === 'HYBRID'

  useEffect(() => {
    if (isEditing) {
      loadRefuel()
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!odometer || !energyAmount || !pricePerUnit || !activeVehicle) {
      alert('Preencha todos os campos')
      return
    }

    const body: RefuelRequest = {
      vehicleId: Number(activeVehicle.id),
      odometer: parseInt(odometer),
      energyAmount: parseFloat(energyAmount),
      pricePerUnit: parseFloat(pricePerUnit),
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
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-5">
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">
        {isEditing ? 'Editar Abastecimento' : 'Novo Abastecimento'}
      </h1>

      <form onSubmit={handleSubmit} className="mx-auto max-w-sm">
        <input
          className={inputClass}
          placeholder="Odômetro (km)"
          value={odometer}
          onChange={(e) => setOdometer(e.target.value)}
          inputMode="numeric"
        />

        <input
          className={inputClass}
          placeholder={
            isHybrid && refuelType === 'ELECTRIC'
              ? 'Quantidade (kWh)'
              : 'Quantidade (L)'
          }
          value={energyAmount}
          onChange={(e) => setEnergyAmount(e.target.value)}
          inputMode="decimal"
        />

        <input
          className={inputClass}
          placeholder="Preço por unidade"
          value={pricePerUnit}
          onChange={(e) => setPricePerUnit(e.target.value)}
          inputMode="decimal"
        />

        {isHybrid && (
          <select
            className={inputClass}
            value={refuelType}
            onChange={(e) => setRefuelType(e.target.value as RefuelType)}
          >
            <option value="FUEL">Combustível</option>
            <option value="ELECTRIC">Elétrico</option>
          </select>
        )}

        <label className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            checked={fullTank}
            onChange={(e) => setFullTank(e.target.checked)}
          />
          Tanque cheio
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="mb-4 h-12 w-full rounded-lg bg-blue-600 text-base font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? 'Salvando...' : 'Salvar'}
        </button>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="block w-full text-center text-sm text-blue-600"
        >
          Voltar
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/RefuelForm.tsx
git commit -m "feat: add RefuelForm create/edit screen"
```

---

## Task 5: VehicleEvents list screen

**Files:**
- Create: `src/routes/VehicleEvents.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import { usePaginatedList } from '../hooks/usePaginatedList'
import {
  VEHICLE_EVENT_TYPE_LABELS,
  type VehicleEvent,
} from '../types/VehicleEvent'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}...` : text
}

export function VehicleEvents() {
  const { activeVehicle } = useVehicle()
  const navigate = useNavigate()
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const { items, loading, error, hasMore, loadMore, reload } =
    usePaginatedList<VehicleEvent>(
      activeVehicle ? `/vehicle-events/vehicle/${activeVehicle.id}` : null
    )

  async function handleDelete(id: number) {
    if (!confirm('Excluir este evento?')) return

    try {
      setDeletingId(id)
      await authenticatedRequest(`/vehicle-events/${id}`, { method: 'DELETE' })
      await reload()
    } catch (err) {
      console.log(err)
      alert('Erro ao excluir evento')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-5">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold">Eventos</h1>
        <button
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          onClick={() => navigate('/vehicle-events/new')}
        >
          Novo evento
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600">
          Não foi possível carregar os eventos.
        </p>
      )}

      {items.length === 0 && !error && (
        <p className="text-gray-500">Nenhum evento registrado</p>
      )}

      <ul>
        {items.map((item) => (
          <li key={item.id} className="mb-3 rounded-lg bg-gray-100 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-bold">{VEHICLE_EVENT_TYPE_LABELS[item.type]}</p>
              <p className="text-sm text-gray-500">{formatDate(item.eventDate)}</p>
            </div>

            <p className="font-bold">{currencyFormatter.format(item.amount)}</p>
            {item.odometer !== null && <p>Odômetro: {item.odometer} km</p>}
            {item.description && <p>{truncate(item.description, 100)}</p>}

            <div className="mt-3 flex gap-3">
              <Link
                to={`/vehicle-events/${item.id}/edit`}
                className="text-sm font-bold text-blue-600"
              >
                Editar
              </Link>
              <button
                className="text-sm font-bold text-red-600 disabled:opacity-50"
                disabled={deletingId === item.id}
                onClick={() => handleDelete(item.id)}
              >
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          className="mt-2 w-full rounded-lg bg-gray-200 py-3 text-sm font-bold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
          onClick={loadMore}
          disabled={loading}
        >
          {loading ? 'Carregando...' : 'Carregar mais'}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/VehicleEvents.tsx
git commit -m "feat: add VehicleEvents list screen"
```

---

## Task 6: VehicleEventForm (create/edit) screen

**Files:**
- Create: `src/routes/VehicleEventForm.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import {
  VEHICLE_EVENT_TYPE_LABELS,
  type VehicleEvent,
  type VehicleEventRequest,
  type VehicleEventType,
} from '../types/VehicleEvent'

const inputClass =
  'mb-4 h-12 w-full rounded-lg border border-gray-300 px-3 text-base'

const EVENT_TYPES = Object.keys(VEHICLE_EVENT_TYPE_LABELS) as VehicleEventType[]

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

export function VehicleEventForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const { activeVehicle } = useVehicle()
  const navigate = useNavigate()

  const [type, setType] = useState<VehicleEventType>('MAINTENANCE')
  const [amount, setAmount] = useState('')
  const [eventDate, setEventDate] = useState(todayIsoDate())
  const [odometer, setOdometer] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isEditing) {
      loadEvent()
    }
  }, [id])

  async function loadEvent() {
    try {
      const event: VehicleEvent = await authenticatedRequest(
        `/vehicle-events/${id}`
      )
      setType(event.type)
      setAmount(String(event.amount))
      setEventDate(event.eventDate)
      setOdometer(event.odometer !== null ? String(event.odometer) : '')
      setDescription(event.description ?? '')
    } catch (err) {
      console.log(err)
      alert('Erro ao carregar evento')
      navigate('/vehicle-events')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!amount || !eventDate || !activeVehicle) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    if (eventDate > todayIsoDate()) {
      alert('A data do evento não pode ser futura')
      return
    }

    const body: VehicleEventRequest = {
      vehicleId: Number(activeVehicle.id),
      type,
      amount: parseFloat(amount),
      eventDate,
      odometer: odometer ? parseInt(odometer) : null,
      description: description || null,
    }

    try {
      setSubmitting(true)

      if (isEditing) {
        await authenticatedRequest(`/vehicle-events/${id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
      } else {
        await authenticatedRequest('/vehicle-events', {
          method: 'POST',
          body: JSON.stringify(body),
        })
      }

      navigate('/vehicle-events')
    } catch (err) {
      console.log(err)
      alert('Erro ao salvar evento')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-5">
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">
        {isEditing ? 'Editar Evento' : 'Novo Evento'}
      </h1>

      <form onSubmit={handleSubmit} className="mx-auto max-w-sm">
        <select
          className={inputClass}
          value={type}
          onChange={(e) => setType(e.target.value as VehicleEventType)}
        >
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {VEHICLE_EVENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        <input
          className={inputClass}
          placeholder="Valor (R$)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
        />

        <input
          className={inputClass}
          type="date"
          value={eventDate}
          max={todayIsoDate()}
          onChange={(e) => setEventDate(e.target.value)}
        />

        <input
          className={inputClass}
          placeholder="Odômetro (km) - opcional"
          value={odometer}
          onChange={(e) => setOdometer(e.target.value)}
          inputMode="numeric"
        />

        <textarea
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-base"
          placeholder="Descrição (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={4}
        />

        <button
          type="submit"
          disabled={submitting}
          className="mb-4 h-12 w-full rounded-lg bg-blue-600 text-base font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? 'Salvando...' : 'Salvar'}
        </button>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="block w-full text-center text-sm text-blue-600"
        >
          Voltar
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/VehicleEventForm.tsx
git commit -m "feat: add VehicleEventForm create/edit screen"
```

---

## Task 7: Wire up navigation and routes

**Files:**
- Modify: `src/routes/Home.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add navigation links to `src/routes/Home.tsx`**

Add `Link` to the react-router-dom import:

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import type { Dashboard, FuelMetrics } from '../types/Dashboard'
```

Then insert a nav block right after the `<h1 className="mb-5 text-xl font-bold">Dashboard</h1>` line (inside the success-state return, before the `<div className="grid grid-cols-2 gap-3">` block):

```tsx
      <h1 className="mb-5 text-xl font-bold">Dashboard</h1>

      <div className="mb-5 flex gap-3">
        <Link to="/refuels" className="text-sm font-bold text-blue-600">
          Abastecimentos
        </Link>
        <Link to="/vehicle-events" className="text-sm font-bold text-blue-600">
          Eventos
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
```

- [ ] **Step 2: Add routes to `src/App.tsx`**

Replace the full file contents with:

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
              <Route
                path="/vehicle-events/:id/edit"
                element={<VehicleEventForm />}
              />
            </Route>
          </Routes>
        </VehicleProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build succeeds (`tsc -b && vite build`), no errors.

- [ ] **Step 5: Commit**

```bash
git add src/routes/Home.tsx src/App.tsx
git commit -m "feat: wire up Refuel and VehicleEvent routes and dashboard nav links"
```

---

## Task 8: Manual verification against the real API

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: Vite prints a local URL (default `http://localhost:5173`).

- [ ] **Step 2: Verify Refuel CRUD for a non-HYBRID vehicle**

Log in with a COMBUSTION or ELECTRIC active vehicle. From `/`, click "Abastecimentos". Click "Novo abastecimento", fill odômetro/quantidade/preço (no `refuelType` field should appear), submit.

Expected: redirected to `/refuels`, the new refuel appears at the top of the list with correct unit (L or kWh matching the vehicle's energy type) and computed total.

- [ ] **Step 3: Verify Refuel CRUD for a HYBRID vehicle**

Switch to (or create) a HYBRID vehicle. Go to `/refuels/new`.

Expected: a "Combustível"/"Elétrico" select appears; submitting with each option creates a refuel with the matching `refuelType`, reflected in the list (unit L vs kWh).

- [ ] **Step 4: Verify Refuel edit and delete**

Click "Editar" on an existing refuel, change the odômetro value, submit.

Expected: value updates in the list. Click "Excluir", confirm the browser dialog.

Expected: item disappears from the list (and the `DELETE` request returns success in the network tab).

- [ ] **Step 5: Verify VehicleEvent CRUD**

From `/`, click "Eventos". Click "Novo evento", pick a type (e.g. "Troca de óleo"), fill valor and data, submit.

Expected: redirected to `/vehicle-events`, new event appears with the correct label, formatted date, and amount.

- [ ] **Step 6: Verify VehicleEvent date validation and edit/delete**

Try setting the date picker to a future date and submitting.

Expected: browser alert "A data do evento não pode ser futura", no request sent. Then edit an existing event's amount and description, submit, confirm the update reflects in the list. Delete an event and confirm it's removed.

- [ ] **Step 7: Verify "Carregar mais" pagination**

Temporarily create more than 20 refuels (or more than 20 events) for the same vehicle, OR temporarily lower `size=20` to `size=2` in `usePaginatedList.ts` locally (do not commit this change) to force multiple pages with fewer records.

Expected: "Carregar mais" button appears, clicking it appends the next page's items without replacing the existing ones, and disappears once the last page is reached.

- [ ] **Step 8: Verify empty states**

For a freshly created vehicle with no refuels/events, visit `/refuels` and `/vehicle-events`.

Expected: "Nenhum abastecimento registrado" / "Nenhum evento registrado" messages, no crash.
