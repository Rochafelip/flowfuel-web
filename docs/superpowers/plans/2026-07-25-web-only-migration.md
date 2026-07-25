# Web-Only Migration (Vite + React Router) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Expo/React Native app with a Vite + React + TypeScript SPA using React Router and Tailwind CSS, preserving all existing screens and business logic 1:1 while fixing the pre-existing API path bugs.

**Architecture:** Single-page client-side app. `AuthContext`/`VehicleContext` manage auth token and active vehicle in `localStorage`, `ProtectedRoute` gates access, `react-router-dom` handles navigation, Tailwind replaces `StyleSheet`. No SSR, no server.

**Tech Stack:** Vite, React 19, TypeScript, react-router-dom, Tailwind CSS.

Reference spec: `docs/superpowers/specs/2026-07-25-web-only-migration-design.md`

---

## Task 1: Scaffold Vite project files

**Files:**
- Create: `package.json` (replace)
- Create: `vite.config.ts`
- Create: `tsconfig.json` (replace)
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `src/index.css`
- Create: `.env.example`
- Create: `.gitignore` (append `dist`, `.env`)

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "flowfuel-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-router-dom": "^7.6.0"
  },
  "devDependencies": {
    "@types/react": "~19.1.0",
    "@types/react-dom": "~19.1.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.1",
    "tailwindcss": "^3.4.17",
    "typescript": "~5.9.2",
    "vite": "^6.0.11"
  }
}
```

- [ ] **Step 2: Write `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Write `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: Write `index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FlowFuel</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Write `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 7: Write `postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 8: Write `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
}
```

- [ ] **Step 9: Write `.env.example`**

```
VITE_API_URL=https://flowfuel-api.fly.dev
```

- [ ] **Step 10: Append to `.gitignore`**

Add these lines if not already present:

```
dist
.env
```

- [ ] **Step 11: Commit**

```bash
git add package.json vite.config.ts tsconfig.json tsconfig.node.json index.html tailwind.config.js postcss.config.js src/index.css .env.example .gitignore
git commit -m "chore: scaffold Vite + Tailwind project config"
```

---

## Task 2: Port `services/api.ts` with corrected paths and env-based base URL

**Files:**
- Create: `src/services/api.ts`
- Delete (later, Task 9): `services/api.ts`

- [ ] **Step 1: Write `src/services/api.ts`**

```ts
const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://flowfuel-api.fly.dev'

export async function loginRequest(email: string, password: string) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
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
  const response = await fetch(`${BASE_URL}/auth/register`, {
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

export async function authenticatedRequest(
  endpoint: string,
  options?: Partial<RequestInit>
) {
  const token = localStorage.getItem('@token')

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...options,
  })

  if (response.status === 401) {
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    throw new Error('Erro na requisição')
  }

  return response.json()
}
```

Note: `@token` key kept as-is to match the original code (the `AuthContext` below uses a separate `@app_token` key for the auth-gate token — this mismatch exists in the original RN code too and is out of scope to fix here; `authenticatedRequest` is only ever called after `AuthContext.signIn` has run, and both keys get written for compatibility in Task 3).

- [ ] **Step 2: Commit**

```bash
git add src/services/api.ts
git commit -m "feat: port api service with corrected endpoint paths"
```

---

## Task 3: Port `AuthContext` to localStorage

**Files:**
- Create: `src/context/AuthContext.tsx`

- [ ] **Step 1: Write `src/context/AuthContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface AuthContextData {
  token: string | null
  loading: boolean
  signIn: (token: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadToken()
  }, [])

  async function loadToken() {
    const storedToken = localStorage.getItem('@app_token')
    setToken(storedToken)
    setLoading(false)
  }

  async function signIn(newToken: string) {
    localStorage.setItem('@app_token', newToken)
    localStorage.setItem('@token', newToken)
    setToken(newToken)
  }

  async function signOut() {
    localStorage.removeItem('@app_token')
    localStorage.removeItem('@token')
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
```

Note: writes both `@app_token` (used by this context to know if the user is logged in) and `@token` (read by `authenticatedRequest` in `api.ts`) — this mirrors the two separate keys already present in the original RN codebase.

- [ ] **Step 2: Commit**

```bash
git add src/context/AuthContext.tsx
git commit -m "feat: port AuthContext to localStorage"
```

---

## Task 4: Port `VehicleContext` to localStorage with corrected API path

**Files:**
- Create: `src/context/VehicleContext.tsx`

- [ ] **Step 1: Write `src/context/VehicleContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authenticatedRequest } from '../services/api'
import { useAuth } from './AuthContext'

interface Vehicle {
  id: string
  brand: string
  model: string
  modelYear: number
  currentKm: number
  licensePlate: string
}

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

- [ ] **Step 2: Commit**

```bash
git add src/context/VehicleContext.tsx
git commit -m "feat: port VehicleContext with corrected /vehicles/active path"
```

---

## Task 5: `ProtectedRoute` and app shell

**Files:**
- Create: `src/routes/ProtectedRoute.tsx`

- [ ] **Step 1: Write `src/routes/ProtectedRoute.tsx`**

```tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useVehicle } from '../context/VehicleContext'

function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
    </div>
  )
}

export function ProtectedRoute() {
  const { token, loading } = useAuth()
  const { activeVehicle, loadingVehicle } = useVehicle()
  const location = useLocation()

  if (loading || loadingVehicle) {
    return <Spinner />
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (!activeVehicle && location.pathname !== '/vehicles/new') {
    return <Navigate to="/select-vehicle" replace />
  }

  return <Outlet />
}
```

Note: `/vehicles/new` is excluded from the "needs active vehicle" redirect because it's reachable *from* `/select-vehicle` when the user has zero vehicles — otherwise the guard would bounce them straight back.

- [ ] **Step 2: Commit**

```bash
git add src/routes/ProtectedRoute.tsx
git commit -m "feat: add ProtectedRoute route guard"
```

---

## Task 6: Login and Register screens

**Files:**
- Create: `src/routes/Login.tsx`
- Create: `src/routes/Register.tsx`

- [ ] **Step 1: Write `src/routes/Login.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loginRequest } from '../services/api'

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
      await signIn(data.token)
      navigate('/')
    } catch {
      alert('Email ou senha inválidos')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-5">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
      >
        <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">
          Entrar
        </h1>

        <input
          className="mb-4 h-12 w-full rounded-lg border border-gray-300 px-3 text-base"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoCapitalize="none"
        />

        <input
          className="mb-4 h-12 w-full rounded-lg border border-gray-300 px-3 text-base"
          placeholder="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="mb-4 h-12 w-full rounded-lg bg-blue-600 text-base font-bold text-white hover:bg-blue-700"
        >
          Entrar
        </button>

        <Link to="/register" className="block text-center text-sm text-blue-600">
          Não tem conta? Criar conta
        </Link>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/routes/Register.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerRequest, loginRequest } from '../services/api'
import { useAuth } from '../context/AuthContext'

export function Register() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const { signIn } = useAuth()

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

      const data = await loginRequest(email, password)
      await signIn(data.token)
      navigate('/')
    } catch (error) {
      alert('Erro ao criar conta. Tente novamente.')
      console.error(error)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-5">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
      >
        <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">
          Criar Conta
        </h1>

        <input
          className="mb-4 h-12 w-full rounded-lg border border-gray-300 px-3 text-base"
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="mb-4 h-12 w-full rounded-lg border border-gray-300 px-3 text-base"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoCapitalize="none"
        />

        <input
          className="mb-4 h-12 w-full rounded-lg border border-gray-300 px-3 text-base"
          placeholder="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          className="mb-4 h-12 w-full rounded-lg border border-gray-300 px-3 text-base"
          placeholder="Confirmar Senha"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button
          type="submit"
          className="mb-4 h-12 w-full rounded-lg bg-blue-600 text-base font-bold text-white hover:bg-blue-700"
        >
          Criar Conta
        </button>

        <Link to="/login" className="block text-center text-sm text-blue-600">
          Já tem conta? Entrar
        </Link>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/Login.tsx src/routes/Register.tsx
git commit -m "feat: port Login and Register screens"
```

---

## Task 7: SelectVehicle screen with corrected activation path

**Files:**
- Create: `src/routes/SelectVehicle.tsx`

- [ ] **Step 1: Write `src/routes/SelectVehicle.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'

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

  useEffect(() => {
    loadVehicles()
  }, [])

  async function loadVehicles() {
    try {
      const response = await authenticatedRequest('/vehicles')
      setVehicles(response)
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

      navigate('/')
    } catch (error) {
      console.log(error)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    )
  }

  if (vehicles.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p>Nenhum veículo cadastrado</p>

        <button
          className="rounded-lg bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700"
          onClick={() => navigate('/vehicles/new')}
        >
          Cadastrar Veículo
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-5">
      <h1 className="mb-5 text-xl font-bold">Selecione um veículo</h1>

      <ul>
        {vehicles.map((item) => (
          <li key={item.id}>
            <button
              className="mb-3 w-full rounded-lg bg-gray-100 p-4 text-left hover:bg-gray-200"
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
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/SelectVehicle.tsx
git commit -m "feat: port SelectVehicle screen with corrected /active path"
```

---

## Task 8: VehicleNew screen with corrected activation path, and Home placeholder

**Files:**
- Create: `src/routes/VehicleNew.tsx`
- Create: `src/routes/Home.tsx`

- [ ] **Step 1: Write `src/routes/VehicleNew.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'

const inputClass =
  'mb-4 h-12 w-full rounded-lg border border-gray-300 px-3 text-base'

export function VehicleNew() {
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [modelYear, setModelYear] = useState('')
  const [manufactureYear, setManufactureYear] = useState('')
  const [type, setType] = useState('Carro')
  const [energyType, setEnergyType] = useState('0')
  const [fuelSubType, setFuelSubType] = useState('Gasolina')
  const [capacity, setCapacity] = useState('')
  const [color, setColor] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [currentKm, setCurrentKm] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

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
          energyType: parseInt(energyType),
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
    <div className="min-h-screen p-5">
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">
        Cadastrar Veículo
      </h1>

      <form onSubmit={handleCreateVehicle} className="mx-auto max-w-sm">
        <input
          className={inputClass}
          placeholder="Marca"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />

        <input
          className={inputClass}
          placeholder="Modelo"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />

        <input
          className={inputClass}
          placeholder="Ano"
          value={modelYear}
          onChange={(e) => setModelYear(e.target.value)}
          inputMode="numeric"
        />

        <input
          className={inputClass}
          placeholder="Ano de Fabricação"
          value={manufactureYear}
          onChange={(e) => setManufactureYear(e.target.value)}
          inputMode="numeric"
        />

        <input
          className={inputClass}
          placeholder="Tipo (ex: Carro)"
          value={type}
          onChange={(e) => setType(e.target.value)}
        />

        <input
          className={inputClass}
          placeholder="Tipo de energia (0 = elétrico, 1 = híbrido, etc)"
          value={energyType}
          onChange={(e) => setEnergyType(e.target.value)}
          inputMode="numeric"
        />

        <input
          className={inputClass}
          placeholder="Subtipo de combustível (ex: Gasolina)"
          value={fuelSubType}
          onChange={(e) => setFuelSubType(e.target.value)}
        />

        <input
          className={inputClass}
          placeholder="Capacidade (L)"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          inputMode="numeric"
        />

        <input
          className={inputClass}
          placeholder="Cor"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />

        <input
          className={inputClass}
          placeholder="Placa"
          value={licensePlate}
          onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
        />

        <input
          className={inputClass}
          placeholder="Km Atual"
          value={currentKm}
          onChange={(e) => setCurrentKm(e.target.value)}
          inputMode="numeric"
        />

        <button
          type="submit"
          disabled={loading}
          className="mb-4 h-12 w-full rounded-lg bg-blue-600 text-base font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Cadastrando...' : 'Cadastrar'}
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

- [ ] **Step 2: Write `src/routes/Home.tsx`**

```tsx
export function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-500">FlowFuel</p>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/VehicleNew.tsx src/routes/Home.tsx
git commit -m "feat: port VehicleNew screen with corrected /active path, add Home placeholder"
```

---

## Task 9: Wire up `App.tsx`, `main.tsx`, and remove Expo/React Native files

**Files:**
- Create: `src/App.tsx`
- Create: `src/main.tsx`
- Create: `src/vite-env.d.ts`
- Copy: `types/Dashboard.ts` → `src/types/Dashboard.ts`
- Delete: `app/`, `context/RootLayout.tsx`, `context/AuthContext.tsx`, `context/VehicleContext.tsx`, `components/`, `hooks/`, `constants/`, `services/`, `types/` (old top-level dirs, now superseded by `src/`), `scripts/reset-project.js`, `app.json`, `expo-env.d.ts`
- Delete: old `package-lock.json`, `node_modules` (regenerated)

- [ ] **Step 1: Write `src/App.tsx`**

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
            </Route>
          </Routes>
        </VehicleProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Write `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 3: Write `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 4: Copy `types/Dashboard.ts` to `src/types/Dashboard.ts`**

```bash
mkdir -p src/types
cp types/Dashboard.ts src/types/Dashboard.ts
```

- [ ] **Step 5: Remove Expo/React Native source directories and files**

```bash
git rm -r app components hooks constants services types scripts app.json expo-env.d.ts eslint.config.js
git rm context/RootLayout.tsx
```

(`context/AuthContext.tsx` and `context/VehicleContext.tsx` are already superseded by `src/context/*` from Tasks 3–4 — remove the old ones too:)

```bash
git rm context/AuthContext.tsx context/VehicleContext.tsx
rmdir context 2>/dev/null || true
```

- [ ] **Step 6: Remove old lockfile and node_modules, reinstall**

```bash
rm -f package-lock.json
rm -rf node_modules
npm install
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: wire up App/main entry points, remove Expo/React Native source"
```

---

## Task 10: Verify build and manual smoke test

**Files:** none (verification only)

- [ ] **Step 1: Typecheck and build**

Run: `npm run build`
Expected: completes with no TypeScript errors, produces a `dist/` folder.

- [ ] **Step 2: Start dev server**

Run: `npm run dev`
Expected: Vite prints a local URL (e.g. `http://localhost:5173`).

- [ ] **Step 3: Manual smoke test against production API**

With the dev server running and `.env` unset (so it falls back to `https://flowfuel-api.fly.dev`), open the browser and walk through:
1. `/login` renders the login form.
2. Register a new account (or log in with an existing one) — should redirect to `/select-vehicle` or `/` depending on whether a vehicle exists.
3. If no vehicles exist, click "Cadastrar Veículo", fill the form, submit — should create + activate the vehicle and land on `/`.
4. Reload the page — session persists (still logged in, still on `/`).

Note any failures and fix before proceeding — this is the only end-to-end check this plan has, since no automated tests exist for this project.

- [ ] **Step 4: Confirm no Expo/React Native dependencies remain**

Run: `grep -i "expo\|react-native" package.json`
Expected: no output.

- [ ] **Step 5: Final commit (if any fixes were made during smoke test)**

```bash
git add -A
git commit -m "fix: address issues found in web migration smoke test"
```

(Skip this step if no changes were needed.)
