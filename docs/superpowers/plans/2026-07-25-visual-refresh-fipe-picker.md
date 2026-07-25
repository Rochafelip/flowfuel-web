# Visual Refresh + FIPE Vehicle Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch the app's primary color from blue to green, restyle cards to white-with-shadow with emoji icon badges, and replace the free-text Marca/Modelo/Ano fields in "Cadastrar Veículo" with cascading FIPE-backed dropdowns.

**Architecture:** Color/card changes live entirely in the existing shared primitives (`Button`, `TextField`, `Card`, `Screen`), so they cascade to every screen automatically; only `Home.tsx` and `SelectVehicle.tsx` need direct edits for icon badges. The FIPE picker is a new `src/services/fipe.ts` (fetch wrapper, mirrors `src/services/api.ts`) plus a new `src/hooks/useFipeSelection.ts` (cascading state), consumed only by `VehicleNew.tsx`.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind CSS. No test runner configured — verification is `npm run build` plus manual checks in browser devtools.

---

### Task 1: Update `Button` and `TextField` to the green palette

**Files:**
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/ui/TextField.tsx`

- [ ] **Step 1: Update `Button`**

In `src/components/ui/Button.tsx`, change the class string from:
```tsx
`h-12 w-full rounded-lg bg-blue-600 text-base font-bold text-white transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:active:bg-blue-600 ${className}`
```
to:
```tsx
`h-12 w-full rounded-lg bg-green-600 text-base font-bold text-white transition-colors hover:bg-green-700 active:bg-green-800 disabled:opacity-60 disabled:active:bg-green-600 ${className}`
```

- [ ] **Step 2: Update `TextField` with a green focus ring**

In `src/components/ui/TextField.tsx`, change the class string from:
```tsx
`h-12 w-full rounded-lg border border-gray-300 px-3 text-base ${className}`
```
to:
```tsx
`h-12 w-full rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${className}`
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Button.tsx src/components/ui/TextField.tsx
git commit -m "feat: switch primary color to green"
```

---

### Task 2: Update `Card` to white-with-shadow

**Files:**
- Modify: `src/components/ui/Card.tsx`

- [ ] **Step 1: Update the class string**

In `src/components/ui/Card.tsx`, change:
```tsx
return <div className={`rounded-lg bg-gray-100 p-4 ${className}`}>{children}</div>
```
to:
```tsx
return <div className={`rounded-xl bg-white p-3 shadow-sm ${className}`}>{children}</div>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Card.tsx
git commit -m "feat: restyle Card as white with soft shadow"
```

---

### Task 3: Update `Screen` default background and drop the per-page override

**Files:**
- Modify: `src/components/ui/Screen.tsx`
- Modify: `src/routes/Login.tsx`
- Modify: `src/routes/Register.tsx`

- [ ] **Step 1: Give `Screen` a default `bg-green-50`**

In `src/components/ui/Screen.tsx`, both branches currently interpolate `className` directly onto the outer `div` with no default background. Update both branches so `bg-green-50` is always present and `className` can still add to it:

```tsx
export function Screen({
  children,
  centered = false,
  className = '',
}: {
  children: ReactNode
  centered?: boolean
  className?: string
}) {
  if (centered) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center bg-green-50 ${className}`}
        style={safeAreaPadding}
      >
        {children}
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-green-50 ${className}`} style={safeAreaPadding}>
      <div className="mx-auto max-w-md">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Drop the now-redundant `bg-gray-50` from Login and Register**

In `src/routes/Login.tsx`, change:
```tsx
<Screen centered className="bg-gray-50">
```
to:
```tsx
<Screen centered>
```

In `src/routes/Register.tsx`, make the same change.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Screen.tsx src/routes/Login.tsx src/routes/Register.tsx
git commit -m "feat: apply green-tinted background app-wide via Screen"
```

---

### Task 4: Update link colors on Login, Register, SelectVehicle

**Files:**
- Modify: `src/routes/Login.tsx`
- Modify: `src/routes/Register.tsx`
- Modify: `src/routes/SelectVehicle.tsx`
- Modify: `src/routes/VehicleNew.tsx`

- [ ] **Step 1: Login link**

In `src/routes/Login.tsx`, change:
```tsx
<Link to="/register" className="block text-center text-sm text-blue-600">
```
to:
```tsx
<Link to="/register" className="block text-center text-sm text-green-700">
```

- [ ] **Step 2: Register link**

In `src/routes/Register.tsx`, change:
```tsx
<Link to="/login" className="block text-center text-sm text-blue-600">
```
to:
```tsx
<Link to="/login" className="block text-center text-sm text-green-700">
```

- [ ] **Step 3: VehicleNew "Voltar" link**

In `src/routes/VehicleNew.tsx`, change:
```tsx
className="block w-full text-center text-sm text-blue-600"
```
to:
```tsx
className="block w-full text-center text-sm text-green-700"
```

(SelectVehicle has no blue text today — its empty-state button already goes green automatically via `Button` from Task 1. No change needed there in this task; its card restyle happens in Task 6.)

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/routes/Login.tsx src/routes/Register.tsx src/routes/VehicleNew.tsx
git commit -m "feat: update link colors to match green palette"
```

---

### Task 5: Add icon badges to Dashboard cards

**Files:**
- Modify: `src/routes/Home.tsx`

- [ ] **Step 1: Add an `IconBadge` helper and use it in `MetricCard`/`FuelMetricsCard`**

Read the current `src/routes/Home.tsx` first (it was last touched in the responsive-UX pass) to confirm line numbers, then replace the `MetricCard` and `FuelMetricsCard` functions and their call sites with:

```tsx
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
```

Update the JSX in `Home()` that renders these to pass an `icon` prop:

```tsx
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual check**

`npm run dev`, open `/`, confirm each card shows its icon badge above the label and the layout still looks right at 320px (badge + label + value shouldn't overflow the card).

- [ ] **Step 4: Commit**

```bash
git add src/routes/Home.tsx
git commit -m "feat: add icon badges to Dashboard cards"
```

---

### Task 6: Restyle SelectVehicle list items to match the new card look

**Files:**
- Modify: `src/routes/SelectVehicle.tsx`

- [ ] **Step 1: Replace the list item button styling**

Read the current file first, then change the vehicle list item from:
```tsx
            <button
              className="w-full rounded-lg bg-gray-100 p-4 text-left transition-colors hover:bg-gray-200 active:bg-gray-300"
              onClick={() => activateVehicle(item.id)}
            >
              <p className="font-bold">
                {item.brand} {item.model}
              </p>
              <p>Placa: {item.licensePlate}</p>
              <p>Ano: {item.modelYear}</p>
            </button>
```
to:
```tsx
            <button
              className="flex w-full items-center gap-3 rounded-xl bg-white p-4 text-left shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100"
              onClick={() => activateVehicle(item.id)}
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual check**

`/select-vehicle`: confirm the 🚗 badge sits left of the text, doesn't shrink oddly at 320px, and the tap feedback (`active:bg-gray-100`) is visible.

- [ ] **Step 4: Commit**

```bash
git add src/routes/SelectVehicle.tsx
git commit -m "feat: restyle SelectVehicle list items to match card look"
```

---

### Task 7: `src/services/fipe.ts`

**Files:**
- Create: `src/services/fipe.ts`

- [ ] **Step 1: Create the service**

```ts
const FIPE_BASE_URL = 'https://parallelum.com.br/fipe/api/v1'

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

export function fetchBrands(): Promise<FipeOption[]> {
  return fipeRequest<FipeOption[]>('/carros/marcas')
}

export function fetchModels(brandCode: string): Promise<FipeOption[]> {
  return fipeRequest<{ modelos: FipeOption[] }>(
    `/carros/marcas/${brandCode}/modelos`
  ).then((result) => result.modelos)
}

export function fetchYears(
  brandCode: string,
  modelCode: string
): Promise<FipeOption[]> {
  return fipeRequest<FipeOption[]>(
    `/carros/marcas/${brandCode}/modelos/${modelCode}/anos`
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/services/fipe.ts
git commit -m "feat: add FIPE API service"
```

---

### Task 8: `src/hooks/useFipeSelection.ts`

**Files:**
- Create: `src/hooks/useFipeSelection.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useEffect, useState } from 'react'
import { fetchBrands, fetchModels, fetchYears, type FipeOption } from '../services/fipe'

export function useFipeSelection() {
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
    fetchBrands()
      .then(setBrands)
      .catch(() => setBrandsError(true))
      .finally(() => setLoadingBrands(false))
  }

  useEffect(() => {
    loadBrands()
  }, [])

  function selectBrand(code: string) {
    setBrandCode(code)
    setModelCode('')
    setYearCode('')
    setModels([])
    setYears([])

    if (!code) return

    setLoadingModels(true)
    setModelsError(false)
    fetchModels(code)
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
    fetchYears(brandCode, code)
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

Note: `parseInt(yearCode, 10)` on a code like `"2011-3"` returns `2011` (parses leading digits, stops at `-`), matching the design spec.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useFipeSelection.ts
git commit -m "feat: add useFipeSelection hook for cascading vehicle picker"
```

---

### Task 9: Wire the FIPE picker into `VehicleNew.tsx`

**Files:**
- Modify: `src/routes/VehicleNew.tsx`

- [ ] **Step 1: Replace the file contents**

Read the current file first (it was last touched in the responsive-UX pass) to confirm it still matches, then replace it with:

```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import { useFipeSelection } from '../hooks/useFipeSelection'
import { Screen } from '../components/ui/Screen'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'

const selectClass =
  'h-12 w-full rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-60'

export function VehicleNew() {
  const fipe = useFipeSelection()

  const [manufactureYear, setManufactureYear] = useState('')
  const [type, setType] = useState('Carro')
  const [energyType, setEnergyType] = useState('COMBUSTION')
  const [fuelSubType, setFuelSubType] = useState('Gasolina')
  const [capacity, setCapacity] = useState('')
  const [color, setColor] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [currentKm, setCurrentKm] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { loadActiveVehicle } = useVehicle()

  async function handleCreateVehicle(e: FormEvent) {
    e.preventDefault()

    if (
      !fipe.brandName ||
      !fipe.modelName ||
      !fipe.modelYear ||
      !manufactureYear ||
      !licensePlate ||
      !currentKm ||
      !capacity
    ) {
      alert('Preencha todos os campos')
      return
    }

    try {
      setLoading(true)
      const response = await authenticatedRequest('/vehicles', {
        method: 'POST',
        body: JSON.stringify({
          type,
          energyType,
          fuelSubType,
          currentKm: parseInt(currentKm),
          capacity: parseInt(capacity),
          brand: fipe.brandName,
          model: fipe.modelName,
          manufactureYear: parseInt(manufactureYear),
          modelYear: fipe.modelYear,
          color,
          licensePlate,
        }),
      })

      if (response) {
        await authenticatedRequest(`/vehicles/${response.id}/active`, {
          method: 'PUT',
        })

        await loadActiveVehicle()
        navigate('/')
      }
    } catch (error) {
      console.log(error)
      alert('Erro ao cadastrar veículo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">
        Cadastrar Veículo
      </h1>

      <form onSubmit={handleCreateVehicle} className="flex flex-col gap-4">
        {fipe.brandsError ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-300 px-3 py-3 text-sm">
            <span>Não foi possível carregar as marcas.</span>
            <button
              type="button"
              onClick={fipe.retryBrands}
              className="font-bold text-green-700"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <select
            className={selectClass}
            value={fipe.brandCode}
            onChange={(e) => fipe.selectBrand(e.target.value)}
            disabled={fipe.loadingBrands}
          >
            <option value="">
              {fipe.loadingBrands ? 'Carregando marcas...' : 'Selecione a marca'}
            </option>
            {fipe.brands.map((brand) => (
              <option key={brand.codigo} value={String(brand.codigo)}>
                {brand.nome}
              </option>
            ))}
          </select>
        )}

        {fipe.modelsError ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-300 px-3 py-3 text-sm">
            <span>Não foi possível carregar os modelos.</span>
            <button
              type="button"
              onClick={fipe.retryModels}
              className="font-bold text-green-700"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <select
            className={selectClass}
            value={fipe.modelCode}
            onChange={(e) => fipe.selectModel(e.target.value)}
            disabled={!fipe.brandCode || fipe.loadingModels}
          >
            <option value="">
              {fipe.loadingModels ? 'Carregando modelos...' : 'Selecione o modelo'}
            </option>
            {fipe.models.map((model) => (
              <option key={model.codigo} value={String(model.codigo)}>
                {model.nome}
              </option>
            ))}
          </select>
        )}

        {fipe.yearsError ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-300 px-3 py-3 text-sm">
            <span>Não foi possível carregar os anos.</span>
            <button
              type="button"
              onClick={fipe.retryYears}
              className="font-bold text-green-700"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <select
            className={selectClass}
            value={fipe.yearCode}
            onChange={(e) => fipe.selectYear(e.target.value)}
            disabled={!fipe.modelCode || fipe.loadingYears}
          >
            <option value="">
              {fipe.loadingYears ? 'Carregando anos...' : 'Selecione o ano'}
            </option>
            {fipe.years.map((year) => (
              <option key={year.codigo} value={String(year.codigo)}>
                {year.nome}
              </option>
            ))}
          </select>
        )}

        <TextField
          placeholder="Ano de Fabricação"
          value={manufactureYear}
          onChange={(e) => setManufactureYear(e.target.value)}
          inputMode="numeric"
        />

        <TextField
          placeholder="Tipo (ex: Carro)"
          value={type}
          onChange={(e) => setType(e.target.value)}
        />

        <select
          className={selectClass}
          value={energyType}
          onChange={(e) => setEnergyType(e.target.value)}
        >
          <option value="COMBUSTION">Combustão</option>
          <option value="ELECTRIC">Elétrico</option>
          <option value="HYBRID">Híbrido</option>
        </select>

        <TextField
          placeholder="Subtipo de combustível (ex: Gasolina)"
          value={fuelSubType}
          onChange={(e) => setFuelSubType(e.target.value)}
        />

        <TextField
          placeholder="Capacidade (L)"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          inputMode="numeric"
        />

        <TextField
          placeholder="Cor"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />

        <TextField
          placeholder="Placa"
          value={licensePlate}
          onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
        />

        <TextField
          placeholder="Km Atual"
          value={currentKm}
          onChange={(e) => setCurrentKm(e.target.value)}
          inputMode="numeric"
        />

        <Button type="submit" disabled={loading}>
          {loading ? 'Cadastrando...' : 'Cadastrar'}
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

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual check**

`npm run dev`, open `/vehicles/new`:
- Marca select populates on load.
- Picking a brand enables and populates Modelo; picking a model enables and populates Ano.
- Changing the brand after a model/year was picked resets both.
- Submitting with a full valid form creates the vehicle and navigates to `/` (test against a real account/vehicle).
- Turn off network (devtools offline) and reload to confirm the brands error/retry state renders instead of a stuck "Carregando marcas...".

- [ ] **Step 4: Commit**

```bash
git add src/routes/VehicleNew.tsx
git commit -m "feat: replace free-text brand/model/year with FIPE cascading picker"
```

---

### Task 10: Final full-app manual pass, push, and deploy

**Files:** none (verification and deployment only)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: succeeds with no errors or warnings.

- [ ] **Step 2: Manual visual pass**

`npm run dev`, walk through Login → Register → SelectVehicle → VehicleNew (create a vehicle via the FIPE picker) → Dashboard at 320px and 900px. Confirm: green is the primary color everywhere (buttons, links, focus rings), cards are white with a visible soft shadow and icon badges, the FIPE cascade works end to end, nothing overflows or looks broken at either width.

- [ ] **Step 3: Push to GitHub**

```bash
git push
```

- [ ] **Step 4: Verify Render deploy**

Check the Render dashboard for `flowfuel-web` — deploy should pick up automatically from the push and show "Live" with the latest commit SHA. Open `https://flowfuel-web.onrender.com` on a real phone to confirm the visual refresh and vehicle picker.
