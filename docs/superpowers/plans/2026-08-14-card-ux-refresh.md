# Card UX Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every card in the app (Home/Dashboard, Refuels, VehicleEvents, Vehicles, Stations) a visible border + hover/focus states, replace plain-text action links with real buttons, deduplicate the label/value pattern into a shared `DataField` component, and give list screens a consistent illustrated empty state.

**Architecture:** Two new presentational components (`DataField`, `EmptyState`) plus targeted edits to `Card.tsx` and `Button.tsx` (new `interactive` prop, new `ghost`/`ghost-danger` variants, new `sm` size, focus-visible rings). All five route files then adopt these primitives — no data/logic changes, no new dependencies.

**Tech Stack:** React 19, TypeScript (strict, `noUnusedLocals`/`noUnusedParameters` on), Tailwind CSS. No test framework exists in this repo — verification is `npx tsc -b` (type check) after each task and `npm run build` at the end, per project convention.

---

## File Structure

- Modify `src/components/ui/Card.tsx` — add border + `interactive` hover prop.
- Modify `src/components/ui/Button.tsx` — add `ghost`/`ghost-danger` variants, `size` prop, focus-visible rings, and export `ghostButtonClasses`/`ghostDangerButtonClasses` string constants for use on `<Link>`.
- Create `src/components/ui/DataField.tsx` — shared label/value pair.
- Create `src/components/ui/EmptyState.tsx` — shared illustrated empty state (icon + title + description + optional CTA).
- Modify `src/routes/Home.tsx`, `src/routes/Refuels.tsx`, `src/routes/VehicleEvents.tsx`, `src/routes/Vehicles.tsx`, `src/routes/Stations.tsx` to use the above.

---

### Task 1: `Card.tsx` — border + interactive hover

**Files:**
- Modify: `src/components/ui/Card.tsx`

- [ ] **Step 1: Replace the component**

```tsx
import type { ReactNode } from 'react'

export function Card({
  children,
  className = '',
  interactive = false,
}: {
  children: ReactNode
  className?: string
  interactive?: boolean
}) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-shadow ${
        interactive ? 'hover:border-gray-300 hover:shadow-md' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc -b`
Expected: no errors (existing `<Card>` usages all still compile — `interactive` is optional).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Card.tsx
git commit -m "feat(ui): add border and interactive hover state to Card"
```

---

### Task 2: `Button.tsx` — ghost variants, sm size, focus-visible

**Files:**
- Modify: `src/components/ui/Button.tsx`

- [ ] **Step 1: Replace the file**

```tsx
import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'ghost-danger'
type ButtonSize = 'md' | 'sm'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 disabled:active:bg-green-600 focus-visible:outline-green-600',
  secondary:
    'bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400 disabled:active:bg-gray-200 focus-visible:outline-green-600',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:active:bg-red-600 focus-visible:outline-red-600',
  ghost:
    'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-green-600',
  'ghost-danger':
    'border border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50 active:bg-red-100 focus-visible:outline-red-600',
}

const sizeClasses: Record<ButtonSize, string> = {
  md: 'h-11 text-base',
  sm: 'h-9 text-sm',
}

export const ghostButtonClasses =
  'inline-flex h-9 w-auto items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-60'

export const ghostDangerButtonClasses =
  'inline-flex h-9 w-auto items-center justify-center gap-1 rounded-lg border border-red-200 bg-white px-3 text-sm font-bold text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 active:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-60'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  fullWidth?: boolean
  size?: ButtonSize
}

export function Button({
  className = '',
  variant = 'primary',
  fullWidth = true,
  size = 'md',
  ...props
}: ButtonProps) {
  const widthClasses = fullWidth
    ? 'w-full'
    : `inline-flex w-auto items-center justify-center ${size === 'sm' ? 'px-3' : 'px-6'}`

  return (
    <button
      className={`rounded-lg font-bold transition-colors disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${sizeClasses[size]} ${widthClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
}
```

This preserves the exact rendered output for every existing caller (default `variant="primary"`, `fullWidth=true`, `size="md"`): same `h-11`, same `w-full`, same color classes, plus the new focus-visible ring (additive, not a behavior change).

- [ ] **Step 2: Type check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Button.tsx
git commit -m "feat(ui): add ghost/ghost-danger Button variants, sm size, focus-visible ring"
```

---

### Task 3: `DataField.tsx` — shared label/value component

**Files:**
- Create: `src/components/ui/DataField.tsx`

- [ ] **Step 1: Create the component**

```tsx
export function DataField({
  label,
  value,
  mono = true,
  accent = false,
  size = 'md',
}: {
  label: string
  value: string
  mono?: boolean
  accent?: boolean
  size?: 'md' | 'lg'
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={`font-bold ${mono ? 'font-mono' : ''} ${size === 'lg' ? 'text-lg' : ''} ${
          accent ? 'text-green-700' : 'text-gray-900'
        }`}
      >
        {value}
      </p>
    </div>
  )
}
```

- `mono` defaults to `true` (most values are numeric/currency); set `mono={false}` for plain text values like formatted dates.
- `accent` highlights the value in green (used for totals/prices that should stand out).
- `size="lg"` is for the four dashboard metric tiles, which use a bigger value than the rest of the app.

- [ ] **Step 2: Type check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/DataField.tsx
git commit -m "feat(ui): add DataField component for label/value pairs"
```

---

### Task 4: `EmptyState.tsx` — shared illustrated empty state

**Files:**
- Create: `src/components/ui/EmptyState.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Button } from './Button'
import { Card } from './Card'

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: string
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <Card className="text-center">
      <p className="mb-2 text-4xl">{icon}</p>
      <p className="mb-1 text-lg font-bold text-gray-900">{title}</p>
      <p className={actionLabel && onAction ? 'mb-4 text-sm text-gray-600' : 'text-sm text-gray-600'}>
        {description}
      </p>
      {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
    </Card>
  )
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/EmptyState.tsx
git commit -m "feat(ui): add EmptyState component"
```

---

### Task 5: `Home.tsx` — adopt DataField and EmptyState

**Files:**
- Modify: `src/routes/Home.tsx`

- [ ] **Step 1: Add imports**

At the top of the file, alongside the other `components/ui` imports:

```tsx
import { DataField } from '../components/ui/DataField'
import { EmptyState } from '../components/ui/EmptyState'
```

- [ ] **Step 2: Replace `MetricCard`**

Find:

```tsx
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
```

Replace with:

```tsx
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
      <DataField label={label} value={value} size="lg" />
    </Card>
  )
}
```

- [ ] **Step 3: Replace `FuelMetricsCard`**

Find:

```tsx
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
```

Replace with:

```tsx
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

      <div className="mb-2">
        <DataField
          label="Consumo médio"
          value={`${metrics.averageConsumption.toFixed(2)} ${metrics.consumptionUnit}`}
        />
      </div>

      <div className="mb-2">
        <DataField
          label="Preço médio"
          value={`${currencyFormatter.format(metrics.averagePrice)} ${metrics.priceUnit}`}
        />
      </div>

      <DataField label="Total gasto" value={currencyFormatter.format(metrics.totalSpent)} />
    </Card>
  )
}
```

- [ ] **Step 4: Replace `LastRefuelDetailCard`**

Find:

```tsx
function LastRefuelDetailCard({ refuel }: { refuel: Refuel }) {
  const isElectric = refuel.refuelType === 'ELECTRIC'

  return (
    <Card className="mt-6">
      <p className="mb-2 text-sm font-bold text-gray-700">Último abastecimento</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-sm text-gray-600">Data</p>
          <p className="font-bold text-gray-900">
            {new Date(refuel.refuelDate).toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-600">{isElectric ? 'Energia' : 'Litros'}</p>
          <p className="font-mono font-bold text-gray-900">
            {refuel.energyAmount.toFixed(2)} {isElectric ? 'kWh' : 'L'}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Valor pago</p>
          <p className="font-mono font-bold text-gray-900">
            {currencyFormatter.format(refuel.totalAmount)}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Preço por litro</p>
          <p className="font-mono font-bold text-green-700">
            {currencyFormatter.format(refuel.pricePerUnit)}
            {isElectric ? '/kWh' : '/L'}
          </p>
        </div>
      </div>
    </Card>
  )
}
```

Replace with:

```tsx
function LastRefuelDetailCard({ refuel }: { refuel: Refuel }) {
  const isElectric = refuel.refuelType === 'ELECTRIC'

  return (
    <Card className="mt-6">
      <p className="mb-2 text-sm font-bold text-gray-700">Último abastecimento</p>

      <div className="grid grid-cols-2 gap-3">
        <DataField
          label="Data"
          value={new Date(refuel.refuelDate).toLocaleDateString('pt-BR')}
          mono={false}
        />

        <DataField
          label={isElectric ? 'Energia' : 'Litros'}
          value={`${refuel.energyAmount.toFixed(2)} ${isElectric ? 'kWh' : 'L'}`}
        />

        <DataField label="Valor pago" value={currencyFormatter.format(refuel.totalAmount)} />

        <DataField
          label="Preço por litro"
          value={`${currencyFormatter.format(refuel.pricePerUnit)}${isElectric ? '/kWh' : '/L'}`}
          accent
        />
      </div>
    </Card>
  )
}
```

- [ ] **Step 5: Add hover feedback to `RecentActivityCard` list items**

Find (inside `RecentActivityCard`):

```tsx
            <li key={item.id} className="flex items-center justify-between">
```

Replace with:

```tsx
            <li
              key={item.id}
              className="flex items-center justify-between rounded-lg px-1 py-1 transition-colors hover:bg-gray-50"
            >
```

- [ ] **Step 6: Replace the `isFirstUse` empty state**

Find:

```tsx
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
```

Replace with:

```tsx
      {isFirstUse ? (
        <EmptyState
          icon="🚗"
          title="Pronto para começar"
          description="Registre seu primeiro abastecimento para ver o dashboard do seu veículo."
          actionLabel="Registrar abastecimento"
          onAction={() => navigate('/refuels/new')}
        />
      ) : (
```

- [ ] **Step 7: Type check**

Run: `npx tsc -b`
Expected: no errors. If `Button` import becomes unused, TypeScript will fail with `noUnusedLocals` — check: `Button` is still used later in the file (`<Button className="mt-6" onClick={...}>Novo Abastecimento</Button>` and the error-state retry button), so the import stays.

- [ ] **Step 8: Commit**

```bash
git add src/routes/Home.tsx
git commit -m "refactor(home): adopt DataField and EmptyState components"
```

---

### Task 6: `Refuels.tsx` — interactive cards, DataField, ghost buttons, EmptyState

**Files:**
- Modify: `src/routes/Refuels.tsx`

- [ ] **Step 1: Add imports**

The header still renders `<Button fullWidth={false} ...>Novo abastecimento</Button>`, so `Button` stays imported alongside the new pieces. Replace:

```tsx
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { Button } from '../components/ui/Button'
```

With:

```tsx
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { Button, ghostButtonClasses, ghostDangerButtonClasses } from '../components/ui/Button'
import { DataField } from '../components/ui/DataField'
import { EmptyState } from '../components/ui/EmptyState'
```

(The existing `import { Screen } from '../components/ui/Screen'` line above this block is untouched.)

- [ ] **Step 2: Replace the empty-list message**

Find:

```tsx
      {items.length === 0 && !error && (
        <p className="text-gray-600">Nenhum abastecimento registrado</p>
      )}
```

Replace with:

```tsx
      {items.length === 0 && !error && (
        <EmptyState
          icon="⛽"
          title="Nenhum abastecimento ainda"
          description="Registre seu primeiro abastecimento para começar a acompanhar consumo e gastos."
          actionLabel="Registrar abastecimento"
          onAction={() => navigate('/refuels/new')}
        />
      )}
```

- [ ] **Step 3: Replace the list item card body**

Find:

```tsx
          <li key={item.id}>
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-bold">{formatDateTime(item.refuelDate)}</p>
                {item.fullTank && (
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
                    Tanque cheio
                  </span>
                )}
              </div>

              {item.kmSinceLastRefuel !== null && (
                <p className="mb-2 text-sm text-gray-600">
                  +{item.kmSinceLastRefuel} km desde o último
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-600">Odômetro</p>
                  <p className="font-mono font-bold text-gray-900">{item.odometer} km</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Quantidade</p>
                  <p className="font-mono font-bold text-gray-900">
                    {item.energyAmount} {item.refuelType === 'FUEL' ? 'L' : 'kWh'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Preço</p>
                  <p className="font-mono font-bold text-gray-900">
                    {currencyFormatter.format(item.pricePerUnit)}
                    {item.refuelType === 'FUEL' ? '/L' : '/kWh'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="font-mono font-bold text-green-700">
                    {currencyFormatter.format(item.totalAmount)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Link
                  to={`/refuels/${item.id}/edit`}
                  className="rounded-md px-2 py-3 text-sm font-bold text-green-700 active:bg-green-50"
                >
                  Editar
                </Link>
                <button
                  className="rounded-md px-2 py-3 text-sm font-bold text-red-600 disabled:opacity-50 active:bg-red-50"
                  disabled={deletingId === item.id}
                  onClick={() => handleDelete(item.id)}
                >
                  Excluir
                </button>
              </div>
            </Card>
          </li>
```

Replace with:

```tsx
          <li key={item.id}>
            <Card interactive>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-bold">{formatDateTime(item.refuelDate)}</p>
                {item.fullTank && (
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
                    Tanque cheio
                  </span>
                )}
              </div>

              {item.kmSinceLastRefuel !== null && (
                <p className="mb-2 text-sm text-gray-600">
                  +{item.kmSinceLastRefuel} km desde o último
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <DataField label="Odômetro" value={`${item.odometer} km`} />
                <DataField
                  label="Quantidade"
                  value={`${item.energyAmount} ${item.refuelType === 'FUEL' ? 'L' : 'kWh'}`}
                />
                <DataField
                  label="Preço"
                  value={`${currencyFormatter.format(item.pricePerUnit)}${
                    item.refuelType === 'FUEL' ? '/L' : '/kWh'
                  }`}
                />
                <DataField label="Total" value={currencyFormatter.format(item.totalAmount)} accent />
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Link to={`/refuels/${item.id}/edit`} className={ghostButtonClasses}>
                  ✏️ Editar
                </Link>
                <button
                  type="button"
                  className={ghostDangerButtonClasses}
                  disabled={deletingId === item.id}
                  onClick={() => handleDelete(item.id)}
                >
                  🗑️ Excluir
                </button>
              </div>
            </Card>
          </li>
```

- [ ] **Step 4: Type check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/routes/Refuels.tsx
git commit -m "refactor(refuels): interactive cards, DataField, ghost action buttons, EmptyState"
```

---

### Task 7: `VehicleEvents.tsx` — interactive cards, ghost buttons, EmptyState

**Files:**
- Modify: `src/routes/VehicleEvents.tsx`

- [ ] **Step 1: Update imports**

Replace:

```tsx
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { Button } from '../components/ui/Button'
```

With:

```tsx
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { Button, ghostButtonClasses, ghostDangerButtonClasses } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
```

- [ ] **Step 2: Replace the empty-list message**

Find:

```tsx
      {items.length === 0 && !error && (
        <p className="text-gray-600">Nenhum evento registrado</p>
      )}
```

Replace with:

```tsx
      {items.length === 0 && !error && (
        <EmptyState
          icon="🧾"
          title="Nenhum evento ainda"
          description="Registre manutenções, seguros e outros gastos do seu veículo."
          actionLabel="Novo evento"
          onAction={() => navigate('/vehicle-events/new')}
        />
      )}
```

- [ ] **Step 3: Replace the list item card body**

Find:

```tsx
          <li key={item.id}>
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-bold">{VEHICLE_EVENT_TYPE_LABELS[item.type]}</p>
                <p className="text-sm text-gray-600">{formatDate(item.eventDate)}</p>
              </div>

              <p className="font-bold">{currencyFormatter.format(item.amount)}</p>
              {item.odometer !== null && <p>Odômetro: {item.odometer} km</p>}
              {item.description && <p>{truncate(item.description, 100)}</p>}

              <div className="mt-3 flex items-center gap-2">
                <Link
                  to={`/vehicle-events/${item.id}/edit`}
                  className="rounded-md px-2 py-3 text-sm font-bold text-green-700 active:bg-green-50"
                >
                  Editar
                </Link>
                <button
                  className="rounded-md px-2 py-3 text-sm font-bold text-red-600 disabled:opacity-50 active:bg-red-50"
                  disabled={deletingId === item.id}
                  onClick={() => handleDelete(item.id)}
                >
                  Excluir
                </button>
              </div>
            </Card>
          </li>
```

Replace with:

```tsx
          <li key={item.id}>
            <Card interactive>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-bold">{VEHICLE_EVENT_TYPE_LABELS[item.type]}</p>
                <p className="text-sm text-gray-600">{formatDate(item.eventDate)}</p>
              </div>

              <p className="font-bold">{currencyFormatter.format(item.amount)}</p>
              {item.odometer !== null && <p>Odômetro: {item.odometer} km</p>}
              {item.description && <p>{truncate(item.description, 100)}</p>}

              <div className="mt-3 flex items-center gap-2">
                <Link to={`/vehicle-events/${item.id}/edit`} className={ghostButtonClasses}>
                  ✏️ Editar
                </Link>
                <button
                  type="button"
                  className={ghostDangerButtonClasses}
                  disabled={deletingId === item.id}
                  onClick={() => handleDelete(item.id)}
                >
                  🗑️ Excluir
                </button>
              </div>
            </Card>
          </li>
```

- [ ] **Step 4: Type check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/routes/VehicleEvents.tsx
git commit -m "refactor(vehicle-events): interactive cards, ghost action buttons, EmptyState"
```

---

### Task 8: `Vehicles.tsx` — interactive cards, ghost buttons everywhere, EmptyState

**Files:**
- Modify: `src/routes/Vehicles.tsx`

- [ ] **Step 1: Update imports**

Replace:

```tsx
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { Button } from '../components/ui/Button'
import { ShareVehicleDialog } from '../components/ui/ShareVehicleDialog'
```

With:

```tsx
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { Button } from '../components/ui/Button'
import { ShareVehicleDialog } from '../components/ui/ShareVehicleDialog'
import { EmptyState } from '../components/ui/EmptyState'
```

- [ ] **Step 2: Replace the empty vehicles message**

Find:

```tsx
      {vehicles.length === 0 ? (
        <p className="text-gray-600">Nenhum veículo cadastrado</p>
      ) : (
```

Replace with:

```tsx
      {vehicles.length === 0 ? (
        <EmptyState
          icon="🚗"
          title="Nenhum veículo cadastrado"
          description="Cadastre seu primeiro veículo para começar a acompanhar abastecimentos e gastos."
          actionLabel="Novo veículo"
          onAction={() => navigate('/vehicles/new')}
        />
      ) : (
```

- [ ] **Step 3: Replace the vehicle card body**

Find (the whole `<Card>` block inside the `vehicles.map` loop, from `<Card>` to its closing `</Card>`):

```tsx
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
                </Card>
```

Replace with:

```tsx
                <Card interactive>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        fullWidth={false}
                        disabled={isBusy}
                        onClick={() => handleActivate(vehicle.id)}
                      >
                        Definir como ativo
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      fullWidth={false}
                      disabled={isBusy}
                      onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost-danger"
                      size="sm"
                      fullWidth={false}
                      disabled={isBusy}
                      onClick={() => handleDelete(vehicle)}
                    >
                      Excluir
                    </Button>
                  </div>

                  {(() => {
                    const share = shareByVehicleId[vehicle.id]
                    const isShareBusy = shareBusyId === share?.id

                    if (!share) {
                      return (
                        <div className="mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            fullWidth={false}
                            onClick={() => setSharingVehicle(vehicle)}
                          >
                            Compartilhar
                          </Button>
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
                        <Button
                          variant="ghost-danger"
                          size="sm"
                          fullWidth={false}
                          disabled={isShareBusy}
                          onClick={() => handleRevoke(share)}
                        >
                          Revogar
                        </Button>
                      </div>
                    )
                  })()}
                </Card>
```

- [ ] **Step 4: Replace the pending-invite card actions**

Find:

```tsx
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
```

Replace with:

```tsx
                <li key={invite.id}>
                  <Card interactive>
                    <p className="font-bold">
                      {invite.vehicleBrand} {invite.vehicleModel}
                    </p>
                    <p>De: {invite.ownerName}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        fullWidth={false}
                        disabled={isInviteBusy}
                        onClick={() => handleAcceptInvite(invite)}
                      >
                        Aceitar
                      </Button>
                      <Button
                        variant="ghost-danger"
                        size="sm"
                        fullWidth={false}
                        disabled={isInviteBusy}
                        onClick={() => handleRejectInvite(invite)}
                      >
                        Rejeitar
                      </Button>
                    </div>
                  </Card>
                </li>
```

- [ ] **Step 5: Mark the shared-vehicles card as interactive**

Find:

```tsx
              <li key={share.id}>
                <Card>
                  <div className="mb-1 flex items-center justify-between">
```

Replace with:

```tsx
              <li key={share.id}>
                <Card interactive>
                  <div className="mb-1 flex items-center justify-between">
```

- [ ] **Step 6: Type check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/routes/Vehicles.tsx
git commit -m "refactor(vehicles): interactive cards, real ghost buttons for all actions, EmptyState"
```

---

### Task 9: `Stations.tsx` — interactive cards

**Files:**
- Modify: `src/routes/Stations.tsx`

- [ ] **Step 1: Mark the station card as interactive**

Find:

```tsx
              <li key={station.placeId}>
                <Card>
                  <div className="flex items-center gap-2">
```

Replace with:

```tsx
              <li key={station.placeId}>
                <Card interactive>
                  <div className="flex items-center gap-2">
```

- [ ] **Step 2: Type check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Stations.tsx
git commit -m "feat(stations): add hover state to station cards"
```

---

### Task 10: Full build verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full production build**

Run: `npm run build`
Expected: `tsc -b` passes with zero errors, then `vite build` completes and prints the `dist/` output summary. Any leftover unused import (e.g. `Card` in `Refuels.tsx`/`VehicleEvents.tsx` — it's still used by `EmptyState` internally but each route file also still renders its own `<Card>` for list items, so this should already be clean) will fail this step with a `TS6133` error; fix by removing the unused import and re-run.

- [ ] **Step 2: Push and let the deploy preview confirm visually**

Per established project workflow, verification of visual/UX changes happens via deploy rather than a local dev server:

```bash
git push
```

Expected: CI/deploy (render.yaml / Vercel, whichever is configured) builds successfully; open the deployed preview and check Home, Abastecimentos, Eventos, Veículos and Postos — cards should show a visible border, hover/focus states on desktop, and real buttons for Editar/Excluir/etc.
