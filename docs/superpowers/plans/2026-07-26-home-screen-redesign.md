# Home Screen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** replace the flat metrics grid in `src/routes/Home.tsx` with the richer dashboard layout from `docs/HOME_SCREEN_REFERENCE.md` (vehicle header, spend carousel, indicators grid, tip of the day, last-refuel detail, recent activity).

**Architecture:** two new small library files (`fuelSavingTips.ts`, `relativeDate.ts`) provide pure helpers; `Home.tsx` is rewritten to fetch `dashboard`, `refuels` and `vehicle-events` in parallel and derive monthly spend / recent activity on the client, per `docs/superpowers/specs/2026-07-26-home-screen-redesign-design.md`. Navigation between screens (sidebar/drawer) is **out of scope** — it's owned by the separate `docs/superpowers/specs/2026-07-26-responsive-app-shell-design.md` spec/plan, not this one. The existing "Novo Abastecimento" / "Novo Evento" action buttons at the bottom of `Home.tsx` stay exactly as they are today (no FAB in this design).

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, react-router-dom v7. No test runner is configured in this project (no Jest/Vitest in `package.json`) — verification is TypeScript type-checking (this project's `build` script is `tsc -b && vite build`; use `npx tsc -b` per Task 1's exact command) plus manual browser testing per Task 6's test plan.

**Reference spec:** `docs/superpowers/specs/2026-07-26-home-screen-redesign-design.md`

**Working directory for all steps below:** `/home/rocha/Projetos/flowfuel-frontend`

---

## File Structure

```
Create: src/lib/fuelSavingTips.ts
Create: src/lib/relativeDate.ts
Modify: src/types/VehicleEvent.ts
Modify: src/routes/Home.tsx
```

---

### Task 1: Verify the type-check command works

**Files:** none (setup verification only).

- [ ] **Step 1: Confirm the type-check command**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output (clean exit, no type errors) — this confirms the exact command to use for every subsequent task's type-check step. If `npx tsc` fails with a permission error in this environment, use `node node_modules/typescript/bin/tsc -b` instead for all remaining tasks.

---

### Task 2: Create `src/lib/fuelSavingTips.ts` — tip-of-the-day helper

**Files:**
- Create: `src/lib/fuelSavingTips.ts`

- [ ] **Step 1: Create the file**

```ts
export const FUEL_SAVING_TIPS = [
  'Mantenha os pneus calibrados: pneus vazios podem aumentar o consumo em até 10%.',
  'Evite acelerações e frenagens bruscas — dirigir de forma suave economiza combustível.',
  'Remova peso extra do porta-malas: cada 50 kg a mais aumenta o consumo do veículo.',
  'Troque o filtro de ar regularmente para manter a eficiência do motor.',
  'Use o ar-condicionado com moderação em velocidades baixas — ele aumenta o consumo.',
  'Planeje o trajeto com antecedência para evitar trânsito e paradas desnecessárias.',
  'Desligue o motor em paradas longas em vez de deixá-lo em ponto morto.',
  'Respeite os limites de velocidade: acima de 90 km/h o consumo cresce rapidamente.',
  'Faça a manutenção preventiva em dia — um motor bem regulado consome menos.',
  'Evite rodar com o tanque quase vazio: sedimentos no fundo do tanque podem sujar o sistema de combustível.',
]

export function getTipOfTheDay(date = new Date()): string {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const dayOfYear = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  )
  return FUEL_SAVING_TIPS[dayOfYear % FUEL_SAVING_TIPS.length]
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/fuelSavingTips.ts
git commit -m "feat: add tip-of-the-day helper for Home screen"
```

---

### Task 3: Create `src/lib/relativeDate.ts` — date-label and month-matching helpers

**Files:**
- Create: `src/lib/relativeDate.ts`

**Context:** `dashboard.lastRefuelDate` is a backend `LocalDate` (e.g. `"2026-07-20"`, no time component); `refuel.refuelDate` is a `LocalDateTime` (e.g. `"2026-07-20T14:30:00"`); `event.eventDate` is a `LocalDate`. Existing code (`src/routes/VehicleEvents.tsx`) already works around the `LocalDate` UTC-parsing pitfall by passing `{ timeZone: 'UTC' }` to `toLocaleDateString`. This file avoids the pitfall entirely by parsing only the `YYYY-MM-DD` prefix of any date string (both `LocalDate` and `LocalDateTime` values start with it) into a local `Date` at midnight, so day-difference math never depends on the browser's timezone.

- [ ] **Step 1: Create the file**

```ts
function dateOnly(dateString: string): Date {
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

function todayDateOnly(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function daysSince(dateString: string): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round(
    (todayDateOnly().getTime() - dateOnly(dateString).getTime()) / msPerDay
  )
}

export function formatLastRefuelSubtitle(lastRefuelDate: string | null): string {
  if (!lastRefuelDate) return 'Pronto para rodar'
  const days = daysSince(lastRefuelDate)
  if (days <= 0) return 'Abastecido hoje'
  if (days === 1) return 'Abastecimento foi ontem'
  return `Há ${days} dias sem abastecer`
}

export function formatLastRefuelLabel(lastRefuelDate: string | null): string {
  if (!lastRefuelDate) return 'Nenhum abastecimento ainda'
  const days = daysSince(lastRefuelDate)
  if (days <= 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  return `Há ${days} dias`
}

export function isDateStringInMonth(
  dateString: string,
  year: number,
  month: number
): boolean {
  const [y, m] = dateString.slice(0, 7).split('-').map(Number)
  return y === year && m === month
}

export function formatActivityDate(dateString: string): string {
  if (dateString.includes('T')) {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }
  return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}
```

`isDateStringInMonth`'s `month` parameter is 1-indexed (matches `Date#getMonth() + 1`, not `Date#getMonth()`) — callers must pass `now.getMonth() + 1`.

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/relativeDate.ts
git commit -m "feat: add relative-date helpers for Home screen"
```

---

### Task 4: Add event type icons to `src/types/VehicleEvent.ts`

**Files:**
- Modify: `src/types/VehicleEvent.ts`

**Current content (read the file yourself first to confirm it still matches before editing):**

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
```

- [ ] **Step 1: Add the icon map right after `VEHICLE_EVENT_TYPE_LABELS`**

Insert this block immediately after the closing `}` of `VEHICLE_EVENT_TYPE_LABELS`:

```ts

export const VEHICLE_EVENT_TYPE_ICONS: Record<VehicleEventType, string> = {
  FUEL: '⛽',
  MAINTENANCE: '🔧',
  OIL_CHANGE: '🛢️',
  CAR_WASH: '🚿',
  TIRES: '🛞',
  INSURANCE: '📄',
  TAX: '📄',
  DOCUMENTS: '📄',
  OTHER: '📦',
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/types/VehicleEvent.ts
git commit -m "feat: add icon map for vehicle event types"
```

---

### Task 5: Rewrite `src/routes/Home.tsx`

**Files:**
- Modify: `src/routes/Home.tsx`

**Current content (read the file yourself first to confirm it still matches before editing) — this is the file as of the dashboard-integration + vehicle-event-entry-points work already merged to `main`:**

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import type { Dashboard, FuelMetrics } from '../types/Dashboard'
import { Screen } from '../components/ui/Screen'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { Button } from '../components/ui/Button'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const integerFormatter = new Intl.NumberFormat('pt-BR')

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function IconBadge({ icon }: { icon: string }) {
  return (
    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-base text-green-700">
      {icon}
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: string
}) {
  return (
    <Card>
      <IconBadge icon={icon} />
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </Card>
  )
}

function FuelMetricsCard({
  icon,
  title,
  metrics,
}: {
  icon: string
  title: string
  metrics: FuelMetrics
}) {
  return (
    <Card>
      <IconBadge icon={icon} />
      <p className="mb-2 text-sm font-bold text-gray-700">{title}</p>

      <p className="text-sm text-gray-600">Consumo médio</p>
      <p className="mb-2 font-bold text-gray-900">
        {metrics.averageConsumption.toFixed(2)} {metrics.consumptionUnit}
      </p>

      <p className="text-sm text-gray-600">Preço médio</p>
      <p className="mb-2 font-bold text-gray-900">
        {currencyFormatter.format(metrics.averagePrice)} {metrics.priceUnit}
      </p>

      <p className="text-sm text-gray-600">Total gasto</p>
      <p className="font-bold text-gray-900">
        {currencyFormatter.format(metrics.totalSpent)}
      </p>
    </Card>
  )
}

export function Home() {
  const navigate = useNavigate()
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
      <Screen centered>
        <Spinner />
      </Screen>
    )
  }

  if (error || !dashboard) {
    return (
      <Screen centered>
        <ErrorState message="Não foi possível carregar o dashboard" />
      </Screen>
    )
  }

  return (
    <Screen>
      <h1 className="mb-5 text-xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon="💰"
          label="Total gasto"
          value={currencyFormatter.format(dashboard.totalSpent)}
        />

        <MetricCard
          icon="⛽"
          label="Custo por km"
          value={`${currencyFormatter.format(dashboard.costPerKm)}/km`}
        />

        <MetricCard
          icon="🧾"
          label="Total de abastecimentos"
          value={integerFormatter.format(dashboard.totalRefuels)}
        />

        <MetricCard
          icon="📅"
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
            <MetricCard
              icon="📊"
              label="Consumo médio"
              value={`${dashboard.averageConsumption.toFixed(2)} ${
                dashboard.consumptionUnit
              }`}
            />
          )}
      </div>

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

      <Button className="mt-5" onClick={() => navigate('/vehicle-events/new')}>
        Novo Evento
      </Button>

      <button
        type="button"
        onClick={() => navigate('/vehicle-events')}
        className="mt-3 block w-full text-center text-sm text-green-700"
      >
        Ver histórico de eventos
      </button>
    </Screen>
  )
}
```

- [ ] **Step 1: Replace the file's contents**

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import type { Dashboard, FuelMetrics } from '../types/Dashboard'
import type { Refuel } from '../types/Refuel'
import type { VehicleEvent } from '../types/VehicleEvent'
import {
  VEHICLE_EVENT_TYPE_LABELS,
  VEHICLE_EVENT_TYPE_ICONS,
} from '../types/VehicleEvent'
import { Screen } from '../components/ui/Screen'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { Button } from '../components/ui/Button'
import {
  formatLastRefuelSubtitle,
  formatLastRefuelLabel,
  formatActivityDate,
  isDateStringInMonth,
} from '../lib/relativeDate'
import { getTipOfTheDay } from '../lib/fuelSavingTips'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const integerFormatter = new Intl.NumberFormat('pt-BR')

const MONTHLY_LOOKBACK_SIZE = 50
const ACTIVITY_FEED_SIZE = 5

type ActivityItem = {
  id: string
  date: string
  icon: string
  title: string
  amount: number
}

function IconBadge({ icon }: { icon: string }) {
  return (
    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-base text-green-700">
      {icon}
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: string
}) {
  return (
    <Card>
      <IconBadge icon={icon} />
      <p className="text-sm text-gray-600">{label}</p>
      <p className="font-mono text-lg font-bold text-gray-900">{value}</p>
    </Card>
  )
}

function FuelMetricsCard({
  icon,
  title,
  metrics,
}: {
  icon: string
  title: string
  metrics: FuelMetrics
}) {
  return (
    <Card>
      <IconBadge icon={icon} />
      <p className="mb-2 text-sm font-bold text-gray-700">{title}</p>

      <p className="text-sm text-gray-600">Consumo médio</p>
      <p className="mb-2 font-mono font-bold text-gray-900">
        {metrics.averageConsumption.toFixed(2)} {metrics.consumptionUnit}
      </p>

      <p className="text-sm text-gray-600">Preço médio</p>
      <p className="mb-2 font-mono font-bold text-gray-900">
        {currencyFormatter.format(metrics.averagePrice)} {metrics.priceUnit}
      </p>

      <p className="text-sm text-gray-600">Total gasto</p>
      <p className="font-mono font-bold text-gray-900">
        {currencyFormatter.format(metrics.totalSpent)}
      </p>
    </Card>
  )
}

function VehicleHeader({
  name,
  subtitle,
  onPress,
}: {
  name: string
  subtitle: string
  onPress: () => void
}) {
  return (
    <button type="button" onClick={onPress} className="mb-3 block w-full text-left">
      <h1 className="text-xl font-bold text-gray-900">{name}</h1>
      <p className="text-sm text-gray-600">{subtitle}</p>
    </button>
  )
}

function SpendCarousel({
  page,
  onPageChange,
  monthlySpent,
  totalSpent,
}: {
  page: number
  onPageChange: (page: number) => void
  monthlySpent: number
  totalSpent: number
}) {
  const pages = [
    { label: 'Gasto do mês', value: monthlySpent },
    { label: 'Gasto total', value: totalSpent },
  ]

  return (
    <Card className="mt-3">
      <p className="text-sm text-gray-600">{pages[page].label}</p>
      <p className="font-mono text-3xl font-bold text-gray-900">
        {currencyFormatter.format(pages[page].value)}
      </p>

      <div className="mt-3 flex justify-center gap-2">
        {pages.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Página ${index + 1}`}
            onClick={() => onPageChange(index)}
            className={`h-2 w-2 rounded-full ${
              index === page ? 'bg-green-600' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </Card>
  )
}

function TipOfTheDayCard() {
  return (
    <Card className="mt-3">
      <p className="mb-1 text-sm font-bold text-gray-700">💡 Dica do dia</p>
      <p className="text-sm text-gray-600">{getTipOfTheDay()}</p>
    </Card>
  )
}

function LastRefuelDetailCard({ refuel }: { refuel: Refuel }) {
  const isElectric = refuel.refuelType === 'ELECTRIC'

  return (
    <Card className="mt-3">
      <p className="mb-2 text-sm font-bold text-gray-700">Último abastecimento</p>

      <p className="text-sm text-gray-600">Data</p>
      <p className="mb-2 font-bold text-gray-900">
        {new Date(refuel.refuelDate).toLocaleDateString('pt-BR')}
      </p>

      <p className="text-sm text-gray-600">{isElectric ? 'Energia' : 'Litros'}</p>
      <p className="mb-2 font-mono font-bold text-gray-900">
        {refuel.energyAmount.toFixed(2)} {isElectric ? 'kWh' : 'L'}
      </p>

      <p className="text-sm text-gray-600">Valor pago</p>
      <p className="mb-2 font-mono font-bold text-gray-900">
        {currencyFormatter.format(refuel.totalAmount)}
      </p>

      <p className="text-sm text-gray-600">Preço por litro</p>
      <p className="font-mono text-lg font-bold text-green-700">
        {currencyFormatter.format(refuel.pricePerUnit)}
        {isElectric ? '/kWh' : '/L'}
      </p>
    </Card>
  )
}

function RecentActivityCard({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="mt-3">
      <p className="mb-2 text-sm font-bold text-gray-700">Atividade recente</p>

      {items.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhuma atividade registrada ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-600">
                    {formatActivityDate(item.date)}
                  </p>
                </div>
              </div>
              <p className="font-mono text-sm font-bold text-gray-900">
                {currencyFormatter.format(item.amount)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function Home() {
  const navigate = useNavigate()
  const { activeVehicle } = useVehicle()

  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [refuels, setRefuels] = useState<Refuel[]>([])
  const [events, setEvents] = useState<VehicleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [spendPage, setSpendPage] = useState(0)

  useEffect(() => {
    loadHome()
  }, [activeVehicle?.id])

  async function loadHome() {
    if (!activeVehicle) return

    try {
      setLoading(true)
      setError(false)

      const [dashboardResponse, refuelsResponse, eventsResponse] = await Promise.all([
        authenticatedRequest(`/dashboard/vehicle/${activeVehicle.id}`),
        authenticatedRequest(
          `/refuels/vehicle/${activeVehicle.id}?page=0&size=${MONTHLY_LOOKBACK_SIZE}`
        ),
        authenticatedRequest(
          `/vehicle-events/vehicle/${activeVehicle.id}?page=0&size=${MONTHLY_LOOKBACK_SIZE}`
        ),
      ])

      setDashboard(dashboardResponse)
      setRefuels(refuelsResponse.content)
      setEvents(eventsResponse.content)
    } catch (err) {
      console.log(err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (!activeVehicle || loading) {
    return (
      <Screen centered>
        <Spinner />
      </Screen>
    )
  }

  if (error || !dashboard) {
    return (
      <Screen centered>
        <ErrorState message="Não foi possível carregar o dashboard" />
        <Button className="mt-5" onClick={loadHome}>
          Tentar novamente
        </Button>
      </Screen>
    )
  }

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const monthlySpent =
    refuels
      .filter((refuel) => isDateStringInMonth(refuel.refuelDate, currentYear, currentMonth))
      .reduce((sum, refuel) => sum + refuel.totalAmount, 0) +
    events
      .filter((event) => isDateStringInMonth(event.eventDate, currentYear, currentMonth))
      .reduce((sum, event) => sum + event.amount, 0)

  const recentActivity: ActivityItem[] = [
    ...refuels.slice(0, ACTIVITY_FEED_SIZE).map((refuel) => ({
      id: `refuel-${refuel.id}`,
      date: refuel.refuelDate,
      icon: refuel.refuelType === 'ELECTRIC' ? '🔌' : '⛽',
      title: 'Abastecimento',
      amount: refuel.totalAmount,
    })),
    ...events.slice(0, ACTIVITY_FEED_SIZE).map((event) => ({
      id: `event-${event.id}`,
      date: event.eventDate,
      icon: VEHICLE_EVENT_TYPE_ICONS[event.type],
      title: VEHICLE_EVENT_TYPE_LABELS[event.type],
      amount: event.amount,
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, ACTIVITY_FEED_SIZE)

  const lastRefuel = refuels[0] ?? null
  const isFirstUse = dashboard.totalRefuels === 0

  return (
    <Screen>
      <VehicleHeader
        name={`${activeVehicle.brand} ${activeVehicle.model}`}
        subtitle={formatLastRefuelSubtitle(dashboard.lastRefuelDate)}
        onPress={() => navigate('/select-vehicle')}
      />

      {isFirstUse ? (
        <Card className="text-center">
          <p className="mb-2 text-4xl">🚗</p>
          <p className="mb-1 text-lg font-bold text-gray-900">Pronto para começar</p>
          <p className="mb-4 text-sm text-gray-600">
            Registre seu primeiro abastecimento para ver o dashboard do seu veículo.
          </p>
          <Button onClick={() => navigate('/refuels/new')}>Registrar abastecimento</Button>
        </Card>
      ) : (
        <>
          <SpendCarousel
            page={spendPage}
            onPageChange={setSpendPage}
            monthlySpent={monthlySpent}
            totalSpent={dashboard.totalSpent}
          />

          <div className="mt-3 grid grid-cols-2 gap-3">
            {dashboard.energyType !== 'HYBRID' && dashboard.averageConsumption !== null && (
              <MetricCard
                icon="📊"
                label="Consumo médio"
                value={`${dashboard.averageConsumption.toFixed(2)} ${dashboard.consumptionUnit}`}
              />
            )}

            {dashboard.averagePrice !== null && (
              <MetricCard
                icon="💲"
                label="Preço médio"
                value={`${currencyFormatter.format(dashboard.averagePrice)} ${
                  dashboard.priceUnit ?? ''
                }`}
              />
            )}

            <MetricCard
              icon="🛣️"
              label="Odômetro"
              value={
                dashboard.lastOdometer !== null
                  ? `${integerFormatter.format(dashboard.lastOdometer)} km`
                  : '—'
              }
            />

            <MetricCard
              icon="📅"
              label="Último abastecimento"
              value={formatLastRefuelLabel(dashboard.lastRefuelDate)}
            />
          </div>

          {dashboard.energyType === 'HYBRID' && dashboard.breakdown && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <FuelMetricsCard icon="⛽" title="Combustível" metrics={dashboard.breakdown.fuel} />
              <FuelMetricsCard icon="🔌" title="Elétrico" metrics={dashboard.breakdown.electric} />
            </div>
          )}
        </>
      )}

      <TipOfTheDayCard />

      {!isFirstUse && lastRefuel && <LastRefuelDetailCard refuel={lastRefuel} />}

      {!isFirstUse && <RecentActivityCard items={recentActivity} />}

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

      <Button className="mt-5" onClick={() => navigate('/vehicle-events/new')}>
        Novo Evento
      </Button>

      <button
        type="button"
        onClick={() => navigate('/vehicle-events')}
        className="mt-3 block w-full text-center text-sm text-green-700"
      >
        Ver histórico de eventos
      </button>
    </Screen>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Home.tsx
git commit -m "feat: redesign Home screen with header, spend carousel, tips and recent activity"
```

---

### Task 6: Manual verification in the browser

**Files:** none — this is a manual verification pass, no code changes.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: Vite prints a local URL (e.g. `http://localhost:5173`).

- [ ] **Step 2: Log in and confirm the vehicle header**

Open the app, log in, ensure there's an active vehicle. Confirm the header shows `<marca> <modelo>` and a subtitle matching the vehicle's real `lastRefuelDate` state (e.g. "Abastecido hoje" if a refuel was made today).

- [ ] **Step 3: Confirm the spend carousel**

Click both dots under the spend card. Confirm page 1 shows a plausible "gasto do mês" value (sum of this month's refuels/events) and page 2 shows the same total as the old "Total gasto" card used to.

- [ ] **Step 4: Confirm the indicators grid**

Confirm 4 (or, for a `HYBRID` vehicle, 2) cards render: Consumo médio (skipped for `HYBRID`), Preço médio (skipped for `HYBRID`), Odômetro, Último abastecimento — and that `HYBRID` vehicles additionally show the Combustível/Elétrico breakdown cards below.

- [ ] **Step 5: Confirm tip of the day, last refuel detail, and recent activity**

Confirm the tip card always shows text. Confirm "Último abastecimento" detail card shows the same values as the vehicle's most recent refuel (cross-check against `/refuels` history page). Confirm "Atividade recente" shows up to 5 items combining refuels and vehicle events, most recent first.

- [ ] **Step 6: Confirm first-use empty state**

If possible, test with a vehicle that has zero refuels (or temporarily point `dashboard.totalRefuels` via devtools/network mock): confirm only the "Pronto para começar" card, tip-of-the-day card, and (if any events exist) recent activity show — no spend carousel, no indicators grid, no last-refuel card.

- [ ] **Step 7: Confirm the bottom action buttons**

Confirm "Novo Abastecimento" opens `/refuels/new`, "Ver histórico de abastecimentos" opens `/refuels`, "Novo Evento" opens `/vehicle-events/new`, and "Ver histórico de eventos" opens `/vehicle-events` — same behavior as before this plan, just placed below the new cards instead of the old grid.

- [ ] **Step 8: Confirm error state**

Simulate a network failure (devtools → offline, or block the `/dashboard` request) and reload Home. Confirm the full-screen error message and "Tentar novamente" button appear, and that clicking it retries once connectivity is restored.

---

## Self-Review Notes (for the implementer)

- `authenticatedRequest` has no generic return type (returns `Promise<any>` via `response.json()`), so `dashboardResponse`, `refuelsResponse.content` etc. are implicitly `any` — this matches the existing codebase convention (no casts anywhere else in `Home.tsx`, `Refuels.tsx`, `VehicleEvents.tsx`) and is intentional, not an oversight.
- `isDateStringInMonth`'s `month` parameter is 1-indexed; every call site in `Home.tsx` passes `now.getMonth() + 1`, not `now.getMonth()` — double check this if adding new call sites later.
- The monthly-spend calculation has a known limitation (documented in the design spec): if a vehicle has more than 50 refuels + vehicle-events combined in the current month, the sum will be incomplete, since `MONTHLY_LOOKBACK_SIZE = 50` is not re-paginated. Not fixed in this plan — accepted trade-off from the design spec.
- `recentActivity`'s sort (`a.date < b.date`) does plain string comparison across `LocalDate` (`"YYYY-MM-DD"`) and `LocalDateTime` (`"YYYY-MM-DDTHH:mm:ss"`) values — this is chronologically correct except for same-day ordering between a refuel and an event on the exact same date, where the date-only string sorts as "earlier" than the same-day datetime string. Accepted minor imprecision, not fixed in this plan.
- Navigation between screens (sidebar/drawer) is intentionally out of scope for this plan — it's owned by the separate `docs/superpowers/plans/` entry for `2026-07-26-responsive-app-shell-design.md`. Don't add a bottom nav or FAB here; the existing "Novo Abastecimento"/"Novo Evento" buttons at the end of `Home.tsx` stay as they are today.
- No test runner configured in this project — verification is `tsc -b` per task plus the manual pass in Task 6.
