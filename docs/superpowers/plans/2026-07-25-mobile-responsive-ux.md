# Mobile Responsive UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Login, Register, Home (Dashboard), SelectVehicle and VehicleNew render well from ~320px phones up to tablets/desktop, by extracting shared UI primitives (`Screen`, `Button`, `TextField`, `Card`, `Spinner`, `ErrorState`) and refactoring those five screens to use them, without changing colors/typography or adding features.

**Architecture:** New presentational components live in `src/components/ui/`, each a single-purpose file. `Screen` owns safe-area padding and the `max-w-md` width cap; the other components replace duplicated Tailwind class strings. Screens are refactored one at a time behind `npm run build` (there is no test runner configured in this project — verification is TypeScript + Vite build, plus manual responsive checks in browser devtools).

**Tech Stack:** Vite, React 19, TypeScript, Tailwind CSS, react-router-dom. No Jest/Testing Library configured.

---

### Task 1: Global viewport + tap-highlight setup

**Files:**
- Modify: `index.html`
- Modify: `src/index.css`

- [ ] **Step 1: Add `viewport-fit=cover` to the viewport meta tag**

In `index.html`, change:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```
to:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

This is required for `env(safe-area-inset-*)` (used in Task 2) to resolve to non-zero values on notched iPhones instead of `0`.

- [ ] **Step 2: Neutralize the default mobile tap highlight**

In `src/index.css`, change:
```css
body {
  margin: 0;
}
```
to:
```css
body {
  margin: 0;
  -webkit-tap-highlight-color: transparent;
}
```

We're replacing the default gray tap flash with explicit `active:` states on `Button` (Task 3) and tappable cards (Task 8), so the browser default would just look like a glitch on top of those.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds (no TypeScript/Vite errors), same as before this change (these are non-TS files).

- [ ] **Step 4: Commit**

```bash
git add index.html src/index.css
git commit -m "feat: enable safe-area support and neutral tap highlight"
```

---

### Task 2: `Screen` component

**Files:**
- Create: `src/components/ui/Screen.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { ReactNode } from 'react'

const safeAreaPadding = {
  paddingLeft: 'max(1.25rem, env(safe-area-inset-left))',
  paddingRight: 'max(1.25rem, env(safe-area-inset-right))',
  paddingTop: '1.25rem',
  paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
}

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
        className={`flex min-h-screen items-center justify-center ${className}`}
        style={safeAreaPadding}
      >
        {children}
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${className}`} style={safeAreaPadding}>
      <div className="mx-auto max-w-md">{children}</div>
    </div>
  )
}
```

`centered` covers the Login/Register layout (form vertically centered, own `max-w-sm` card). The default (non-centered) path covers Home/SelectVehicle/VehicleNew (top-aligned content, capped at `max-w-md` so it doesn't stretch full-width on tablets/desktop).

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds (component isn't used anywhere yet, but must type-check standalone).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Screen.tsx
git commit -m "feat: add Screen layout primitive with safe-area and max-width"
```

---

### Task 3: `Button` component

**Files:**
- Create: `src/components/ui/Button.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { ButtonHTMLAttributes } from 'react'

export function Button({
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`h-12 w-full rounded-lg bg-blue-600 text-base font-bold text-white transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:active:bg-blue-600 ${className}`}
      {...props}
    />
  )
}
```

`hover:` keeps desktop mouse feedback; `active:` adds the tap feedback touchscreens need (hover never fires on tap). `disabled:active:bg-blue-600` stops the active color from flashing on a disabled button tap.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Button.tsx
git commit -m "feat: add Button primitive with touch active state"
```

---

### Task 4: `TextField` component

**Files:**
- Create: `src/components/ui/TextField.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { InputHTMLAttributes } from 'react'

export function TextField({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-12 w-full rounded-lg border border-gray-300 px-3 text-base ${className}`}
      {...props}
    />
  )
}
```

Note this has no `mb-*` margin (unlike the old `inputClass`) — screens using it will space fields with a `gap-4` flex/grid container instead, so spacing isn't baked into the input itself.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/TextField.tsx
git commit -m "feat: add TextField primitive"
```

---

### Task 5: `Card`, `Spinner`, `ErrorState` components

**Files:**
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Spinner.tsx`
- Create: `src/components/ui/ErrorState.tsx`

- [ ] **Step 1: Create `Card`**

```tsx
import type { ReactNode } from 'react'

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`rounded-lg bg-gray-100 p-4 ${className}`}>{children}</div>
}
```

- [ ] **Step 2: Create `Spinner`**

```tsx
export function Spinner() {
  return (
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
  )
}
```

- [ ] **Step 3: Create `ErrorState`**

```tsx
export function ErrorState({ message }: { message: string }) {
  return <p className="text-gray-600">{message}</p>
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Card.tsx src/components/ui/Spinner.tsx src/components/ui/ErrorState.tsx
git commit -m "feat: add Card, Spinner and ErrorState primitives"
```

---

### Task 6: Refactor `Login.tsx`

**Files:**
- Modify: `src/routes/Login.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loginRequest } from '../services/api'
import { Screen } from '../components/ui/Screen'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleLogin(e: FormEvent) {
    e.preventDefault()

    if (!email || !password) {
      alert('Por favor, preencha email e senha')
      return
    }

    try {
      const data = await loginRequest(email, password)
      await signIn(data.accessToken)
      navigate('/')
    } catch {
      alert('Email ou senha inválidos')
    }
  }

  return (
    <Screen centered className="bg-gray-50">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
      >
        <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">
          Entrar
        </h1>

        <div className="mb-4 flex flex-col gap-4">
          <TextField
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
          />

          <TextField
            placeholder="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button type="submit" className="mb-4">
          Entrar
        </Button>

        <Link to="/register" className="block text-center text-sm text-blue-600">
          Não tem conta? Criar conta
        </Link>
      </form>
    </Screen>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual check**

Run: `npm run dev`, open the dev URL, open browser devtools responsive mode, check `/login` at 320px, 375px, 428px and 900px widths: form stays centered and readable, no horizontal scroll, tapping the button shows a visible pressed state.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Login.tsx
git commit -m "refactor: use shared UI primitives on Login screen"
```

---

### Task 7: Refactor `Register.tsx`

**Files:**
- Modify: `src/routes/Register.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerRequest } from '../services/api'
import { Screen } from '../components/ui/Screen'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'

export function Register() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  async function handleRegister(e: FormEvent) {
    e.preventDefault()

    if (!name || !email || !password || !confirmPassword) {
      alert('Por favor, preencha todos os campos')
      return
    }

    if (password !== confirmPassword) {
      alert('As senhas não coincidem')
      return
    }

    if (password.length < 6) {
      alert('A senha deve ter no mínimo 6 caracteres')
      return
    }

    try {
      await registerRequest(name, email, password)

      alert('Conta criada! Verifique seu email para ativar antes de entrar.')
      navigate('/login')
    } catch (error) {
      alert('Erro ao criar conta. Tente novamente.')
      console.error(error)
    }
  }

  return (
    <Screen centered className="bg-gray-50">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
      >
        <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">
          Criar Conta
        </h1>

        <div className="mb-4 flex flex-col gap-4">
          <TextField
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <TextField
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
          />

          <TextField
            placeholder="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <TextField
            placeholder="Confirmar Senha"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <Button type="submit" className="mb-4">
          Criar Conta
        </Button>

        <Link to="/login" className="block text-center text-sm text-blue-600">
          Já tem conta? Entrar
        </Link>
      </form>
    </Screen>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual check**

Same as Task 6 but for `/register`.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Register.tsx
git commit -m "refactor: use shared UI primitives on Register screen"
```

---

### Task 8: Refactor `Home.tsx` (Dashboard)

**Files:**
- Modify: `src/routes/Home.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { useEffect, useState } from 'react'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import type { Dashboard, FuelMetrics } from '../types/Dashboard'
import { Screen } from '../components/ui/Screen'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const integerFormatter = new Intl.NumberFormat('pt-BR')

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </Card>
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
    <Card>
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
          label="Total gasto"
          value={currencyFormatter.format(dashboard.totalSpent)}
        />

        <MetricCard
          label="Custo por km"
          value={`${currencyFormatter.format(dashboard.costPerKm)}/km`}
        />

        <MetricCard
          label="Total de abastecimentos"
          value={integerFormatter.format(dashboard.totalRefuels)}
        />

        <MetricCard
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
    </Screen>
  )
}
```

Note: the local component previously named `Card` is renamed to `MetricCard` to avoid clashing with the imported shared `Card` primitive it now wraps. Secondary text color changed from `text-gray-500` to `text-gray-600` for contrast on the `bg-gray-100` card background. The 2-column grid is unchanged (kept at all widths, per the confirmed design).

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual check**

`/` (Dashboard) at 320px: confirm the 2-column grid doesn't wrap card text awkwardly or overflow horizontally. At 900px: confirm content is capped at `max-w-md` and centered, not stretched.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Home.tsx
git commit -m "refactor: use shared UI primitives on Dashboard screen"
```

---

### Task 9: Refactor `SelectVehicle.tsx`

**Files:**
- Modify: `src/routes/SelectVehicle.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
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

  useEffect(() => {
    loadVehicles()
  }, [])

  async function loadVehicles() {
    try {
      const response = await authenticatedRequest('/vehicles')
      setVehicles(response.content)
    } catch (error) {
      console.log(error)
    } finally {
      setLoading(false)
    }
  }

  async function activateVehicle(id: number) {
    try {
      await authenticatedRequest(`/vehicles/${id}/active`, {
        method: 'PUT',
      })

      await loadActiveVehicle()
      navigate('/')
    } catch (error) {
      console.log(error)
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
    <Screen>
      <h1 className="mb-5 text-xl font-bold">Selecione um veículo</h1>

      <ul className="flex flex-col gap-3">
        {vehicles.map((item) => (
          <li key={item.id}>
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
          </li>
        ))}
      </ul>
    </Screen>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual check**

`/select-vehicle` at 320px and 900px: list items stay full-width within the capped container, tapping a vehicle card shows a visible pressed state (`active:bg-gray-300`).

- [ ] **Step 4: Commit**

```bash
git add src/routes/SelectVehicle.tsx
git commit -m "refactor: use shared UI primitives on SelectVehicle screen"
```

---

### Task 10: Refactor `VehicleNew.tsx`

**Files:**
- Modify: `src/routes/VehicleNew.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import { Screen } from '../components/ui/Screen'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'

export function VehicleNew() {
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [modelYear, setModelYear] = useState('')
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
      !brand ||
      !model ||
      !modelYear ||
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
          brand,
          model,
          manufactureYear: parseInt(manufactureYear),
          modelYear: parseInt(modelYear),
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
        <TextField
          placeholder="Marca"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />

        <TextField
          placeholder="Modelo"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />

        <TextField
          placeholder="Ano"
          value={modelYear}
          onChange={(e) => setModelYear(e.target.value)}
          inputMode="numeric"
        />

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
          className="h-12 w-full rounded-lg border border-gray-300 px-3 text-base"
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
          className="block w-full text-center text-sm text-blue-600"
        >
          Voltar
        </button>
      </form>
    </Screen>
  )
}
```

Note: `<select>` keeps its own class string (matches the old `inputClass` styling) since `TextField` types as `InputHTMLAttributes<HTMLInputElement>` and isn't meant for `<select>` — introducing a generic form-control component for both would be a bigger abstraction than this task calls for.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual check**

`/vehicles/new` at 320px: all fields readable, no horizontal scroll, `Voltar` link tappable. At 900px: form capped at `max-w-md`, centered.

- [ ] **Step 4: Commit**

```bash
git add src/routes/VehicleNew.tsx
git commit -m "refactor: use shared UI primitives on VehicleNew screen"
```

---

### Task 11: Final full-app manual pass and push

**Files:** none (verification only)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: succeeds with no errors or warnings.

- [ ] **Step 2: Manual responsive pass**

Run: `npm run dev`. In browser devtools responsive mode, walk through Login → Register → (create/login a test account) → SelectVehicle → VehicleNew → Dashboard at three widths: 320px (iPhone SE), 390px (iPhone 14), and 1024px (tablet landscape/desktop). Confirm: no horizontal scrolling anywhere, all buttons/links reachable and tappable, content capped/centered at the wide width, dashboard grid stays 2 columns at 320px without text overflow.

- [ ] **Step 3: Push to GitHub**

```bash
git push
```

Expected: pushes all commits from Tasks 1–10 to `origin/main`.

---

### Task 12: Deploy to Render

**Files:** none (deployment only)

- [ ] **Step 1: Confirm the Render Blueprint is connected**

If the `flowfuel-web` Static Site was already created on Render from the existing `render.yaml` (see prior conversation), pushing to `main` in Task 11 triggers an automatic deploy — no further action needed. If the Blueprint was never applied on the Render dashboard, do that first: [render.com](https://render.com) → New + → Blueprint → select `Rochafelip/flowfuel-web` → Apply.

- [ ] **Step 2: Verify the deploy**

Check the Render dashboard for the `flowfuel-web` service — deploy should show "Live" with the latest commit SHA from Task 11. Open the service's `.onrender.com` URL on an actual phone (or browser devtools device mode) to confirm the responsive changes are live.
