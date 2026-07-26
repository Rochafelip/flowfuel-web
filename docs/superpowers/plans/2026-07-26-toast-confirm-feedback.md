# Toast e Confirmação estilizada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir todo `window.alert()`/`window.confirm()` do app por um sistema de toast (feedback não bloqueante, com sucesso e erro) e um diálogo de confirmação estilizado, fechando também o "loop de feedback" no caminho feliz (ações que hoje navegam em silêncio) e corrigindo dois gaps de acessibilidade/mobile (toasts sem `aria-live`, área de toque pequena em "Editar"/"Excluir").

**Architecture:** Dois pares Context+hook novos (`ToastContext`/`useToast`, `ConfirmContext`/`useConfirm`) registrados em `src/App.tsx`, envolvendo toda a árvore de rotas — inclusive `Login`/`Register`, que ficam fora do `AppLayout`. `ConfirmContext` expõe uma função `confirm(message): Promise<boolean>` pensada pra trocar `if (!confirm(msg)) return` por `if (!(await confirm(msg))) return` com o mínimo de mudança em cada call site. Os 8 arquivos de rota afetados trocam cada `alert`/`confirm` nativo por `showToast`/`await confirm`, e 6 deles ganham um `showToast(..., 'success')` novo antes de um `navigate(...)` que já existia.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, react-router-dom v7.6. Sem test runner configurado (mesma situação de todos os planos anteriores neste projeto) — verificação via `npx tsc -b` (não `--noEmit`, que falha com `TS6310` neste projeto composite) e verificação manual no navegador na última task.

**Reference spec:** `docs/superpowers/specs/2026-07-26-toast-confirm-feedback-design.md`

**Working directory for all steps below:** `/home/rocha/Projetos/flowfuel-frontend`

## Global Constraints

- Nenhuma lib nova (sem toast library, sem dialog library) — tudo em React + Tailwind puro, seguindo o padrão já usado em `MobileDrawer.tsx`.
- `variant` do toast é `'success' | 'error'`, default `'error'` (a maioria dos call sites de hoje são erro).
- Máximo 3 toasts visíveis simultaneamente — o mais antigo é removido ao adicionar um 4º.
- Toast some sozinho após 4000ms ou ao clicar no `×`.
- `ConfirmDialog`: foco inicial no botão "Cancelar" (nunca no destrutivo), Esc/clique no backdrop = cancelar, foco retorna ao elemento que abriu o diálogo ao fechar.
- z-index: `ToastContainer` = `z-40`, `ConfirmDialog` = `z-50` (acima de qualquer toast visível, acima do drawer mobile `z-20` e do topbar `z-10` do app shell).
- Transições respeitam `prefers-reduced-motion` via os variants `motion-safe:`/`motion-reduce:` do Tailwind (já disponíveis, sem mudar `tailwind.config.js`).
- `console.log(err)`/`console.error(error)` que já existem junto de cada `alert()` **permanecem** — são só depuração, não fazem parte do feedback ao usuário. Nenhum call site que hoje é silencioso ganha toast além dos explicitamente listados no spec (`SelectVehicle.tsx` → `loadVehicles`; `activateVehicle` continua com catch silencioso, não listado no spec).

---

## File Structure

```
Create: src/context/ToastContext.tsx
Create: src/components/ui/ToastContainer.tsx
Create: src/context/ConfirmContext.tsx
Create: src/components/ui/ConfirmDialog.tsx
Modify: src/App.tsx
Modify: src/routes/Login.tsx
Modify: src/routes/Register.tsx
Modify: src/routes/RefuelForm.tsx
Modify: src/routes/VehicleEventForm.tsx
Modify: src/routes/VehicleNew.tsx
Modify: src/routes/Refuels.tsx
Modify: src/routes/VehicleEvents.tsx
Modify: src/routes/SelectVehicle.tsx
```

---

### Task 1: Verify the type-check command works

**Files:** none (setup verification only).

- [ ] **Step 1: Confirm the type-check command**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no output, clean exit (code 0). Se `npx tsc` falhar com erro de permissão/PATH, use `node node_modules/typescript/bin/tsc -b` em todas as tasks seguintes.

---

### Task 2: Create `ToastContext` — estado e API do toast

**Files:**
- Create: `src/context/ToastContext.tsx`

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `ToastVariant = 'success' | 'error'`, `Toast = { id: string; message: string; variant: ToastVariant; leaving: boolean }`, `ToastProvider({ children })`, `useToast(): { toasts: Toast[]; showToast: (message: string, variant?: ToastVariant) => void; dismissToast: (id: string) => void }`. Consumido por `ToastContainer` (Task 3), `App.tsx` (Task 6) e todos os 8 arquivos de rota (Tasks 7-14).

- [ ] **Step 1: Criar o arquivo**

```tsx
// src/context/ToastContext.tsx
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

export type ToastVariant = 'success' | 'error'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
  leaving: boolean
}

interface ToastContextData {
  toasts: Toast[]
  showToast: (message: string, variant?: ToastVariant) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData)

const MAX_TOASTS = 3
const TOAST_DURATION_MS = 4000
const EXIT_DURATION_MS = 200

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const dismissToast = useCallback(
    (id: string) => {
      setToasts((current) =>
        current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast))
      )
      setTimeout(() => removeToast(id), EXIT_DURATION_MS)
    },
    [removeToast]
  )

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'error') => {
      const id = String(nextId.current++)
      setToasts((current) => {
        const next = [...current, { id, message, variant, leaving: false }]
        return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next
      })
      setTimeout(() => dismissToast(id), TOAST_DURATION_MS)
    },
    [dismissToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 3: Commit**

```bash
git add src/context/ToastContext.tsx
git commit -m "feat: add ToastContext for non-blocking success/error feedback"
```

---

### Task 3: Create `ToastContainer` — renderização visual do toast

**Files:**
- Create: `src/components/ui/ToastContainer.tsx`

**Interfaces:**
- Consumes: `useToast()` (Task 2).
- Produces: `ToastContainer()`, renderizado uma vez em `App.tsx` (Task 6).

- [ ] **Step 1: Criar o arquivo**

```tsx
// src/components/ui/ToastContainer.tsx
import { useEffect, useState } from 'react'
import { useToast, type Toast } from '../../context/ToastContext'

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast
  onDismiss: (id: string) => void
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const shown = visible && !toast.leaving
  const isError = toast.variant === 'error'

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-white shadow-lg transition-all duration-200 motion-reduce:transition-none motion-reduce:duration-0 ${
        isError ? 'bg-red-600' : 'bg-green-600'
      } ${shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
    >
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Fechar notificação"
        className="text-lg leading-none text-white/80 hover:text-white"
      >
        ×
      </button>
    </div>
  )
}

export function ToastContainer() {
  const { toasts, dismissToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/ToastContainer.tsx
git commit -m "feat: add ToastContainer with aria-live and reduced-motion support"
```

---

### Task 4: Create `ConfirmContext` — estado e API da confirmação

**Files:**
- Create: `src/context/ConfirmContext.tsx`

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `ConfirmProvider({ children })`, `useConfirm(): (message: string) => Promise<boolean>` (usado pelos 8 arquivos de rota que fazem exclusão — na prática só `Refuels.tsx`/`VehicleEvents.tsx`, Tasks 12-13), `useConfirmRequest(): { request: { message: string } | null; resolveRequest: (value: boolean) => void }` (usado só por `ConfirmDialog`, Task 5).

- [ ] **Step 1: Criar o arquivo**

```tsx
// src/context/ConfirmContext.tsx
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface ConfirmRequest {
  message: string
  resolve: (value: boolean) => void
}

interface ConfirmContextData {
  request: ConfirmRequest | null
  confirm: (message: string) => Promise<boolean>
  resolveRequest: (value: boolean) => void
}

const ConfirmContext = createContext<ConfirmContextData>({} as ConfirmContextData)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setRequest({ message, resolve })
    })
  }, [])

  const resolveRequest = useCallback(
    (value: boolean) => {
      request?.resolve(value)
      setRequest(null)
    },
    [request]
  )

  return (
    <ConfirmContext.Provider value={{ request, confirm, resolveRequest }}>
      {children}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const { confirm } = useContext(ConfirmContext)
  return confirm
}

export function useConfirmRequest() {
  const { request, resolveRequest } = useContext(ConfirmContext)
  return { request, resolveRequest }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 3: Commit**

```bash
git add src/context/ConfirmContext.tsx
git commit -m "feat: add ConfirmContext with promise-based confirm()"
```

---

### Task 5: Create `ConfirmDialog` — modal de confirmação

**Files:**
- Create: `src/components/ui/ConfirmDialog.tsx`

**Interfaces:**
- Consumes: `useConfirmRequest()` (Task 4).
- Produces: `ConfirmDialog()`, renderizado uma vez em `App.tsx` (Task 6).

- [ ] **Step 1: Criar o arquivo**

```tsx
// src/components/ui/ConfirmDialog.tsx
import { useEffect, useRef } from 'react'
import { useConfirmRequest } from '../../context/ConfirmContext'

export function ConfirmDialog() {
  const { request, resolveRequest } = useConfirmRequest()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const triggerElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!request) return

    triggerElementRef.current = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') resolveRequest(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      triggerElementRef.current?.focus()
    }
  }, [request, resolveRequest])

  if (!request) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => resolveRequest(false)}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={request.message}
        className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
      >
        <p className="mb-6 text-base text-gray-900">{request.message}</p>
        <div className="flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => resolveRequest(false)}
            className="rounded-lg px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => resolveRequest(true)}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/ConfirmDialog.tsx
git commit -m "feat: add ConfirmDialog with focus management and Esc/backdrop cancel"
```

---

### Task 6: Wire `ToastProvider`/`ConfirmProvider` into `src/App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `ToastProvider` (Task 2), `ToastContainer` (Task 3), `ConfirmProvider` (Task 4), `ConfirmDialog` (Task 5).

- [ ] **Step 1: Ler o arquivo atual**

Conteúdo esperado (confirmado nesta sessão, deve bater exatamente — se não bater, reler o arquivo real antes de aplicar o Step 2):

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { VehicleProvider } from './context/VehicleContext'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
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
              </Route>
            </Route>
          </Routes>
        </VehicleProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Adicionar os providers e os renderizadores**

Substituir o arquivo inteiro por:

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

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire ToastProvider and ConfirmProvider into the app"
```

---

### Task 7: Update `src/routes/Login.tsx`

**Files:**
- Modify: `src/routes/Login.tsx`

**Interfaces:**
- Consumes: `useToast` (Task 2).

- [ ] **Step 1: Adicionar o import e o hook**

Adicionar junto aos imports existentes (logo após o import de `loginRequest`):

```tsx
import { useToast } from '../context/ToastContext'
```

Dentro do componente `Login`, adicionar logo após `const navigate = useNavigate()`:

```tsx
  const { showToast } = useToast()
```

- [ ] **Step 2: Trocar os dois `alert()`**

```tsx
    if (!email || !password) {
      showToast('Por favor, preencha email e senha')
      return
    }

    try {
      const data = await loginRequest(email, password)
      await signIn(data.accessToken)
      navigate('/')
    } catch {
      showToast('Email ou senha inválidos')
    }
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Login.tsx
git commit -m "feat: replace alert() with toast in Login"
```

---

### Task 8: Update `src/routes/Register.tsx`

**Files:**
- Modify: `src/routes/Register.tsx`

**Interfaces:**
- Consumes: `useToast` (Task 2).

- [ ] **Step 1: Adicionar o import e o hook**

```tsx
import { useToast } from '../context/ToastContext'
```

Dentro do componente `Register`, logo após `const navigate = useNavigate()`:

```tsx
  const { showToast } = useToast()
```

- [ ] **Step 2: Trocar os cinco `alert()`**

```tsx
    if (!name || !email || !password || !confirmPassword) {
      showToast('Por favor, preencha todos os campos')
      return
    }

    if (password !== confirmPassword) {
      showToast('As senhas não coincidem')
      return
    }

    if (password.length < 6) {
      showToast('A senha deve ter no mínimo 6 caracteres')
      return
    }

    try {
      await registerRequest(name, email, password)

      showToast('Conta criada! Verifique seu email para ativar antes de entrar.', 'success')
      navigate('/login')
    } catch (error) {
      showToast('Erro ao criar conta. Tente novamente.')
      console.error(error)
    }
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Register.tsx
git commit -m "feat: replace alert() with toast in Register"
```

---

### Task 9: Update `src/routes/RefuelForm.tsx`

**Files:**
- Modify: `src/routes/RefuelForm.tsx`

**Interfaces:**
- Consumes: `useToast` (Task 2).

- [ ] **Step 1: Adicionar o import e o hook**

```tsx
import { useToast } from '../context/ToastContext'
```

Dentro do componente `RefuelForm`, logo após `const navigate = useNavigate()`:

```tsx
  const { showToast } = useToast()
```

- [ ] **Step 2: Trocar os três `alert()` e adicionar o toast de sucesso**

```tsx
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
      showToast('Erro ao carregar abastecimento')
      navigate('/refuels')
    } finally {
      setLoading(false)
    }
  }
```

```tsx
    if (!distanceFilled || !energyAmount || !priceFilled || !activeVehicle) {
      showToast('Preencha todos os campos')
      return
    }
```

```tsx
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

      showToast('Abastecimento salvo com sucesso.', 'success')
      navigate('/refuels')
    } catch (err) {
      console.log(err)
      showToast('Erro ao salvar abastecimento')
    } finally {
      setSubmitting(false)
    }
  }
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 4: Commit**

```bash
git add src/routes/RefuelForm.tsx
git commit -m "feat: replace alert() with toast in RefuelForm, add success toast"
```

---

### Task 10: Update `src/routes/VehicleEventForm.tsx`

**Files:**
- Modify: `src/routes/VehicleEventForm.tsx`

**Interfaces:**
- Consumes: `useToast` (Task 2).

- [ ] **Step 1: Adicionar o import e o hook**

```tsx
import { useToast } from '../context/ToastContext'
```

Dentro do componente `VehicleEventForm`, logo após `const navigate = useNavigate()`:

```tsx
  const { showToast } = useToast()
```

- [ ] **Step 2: Trocar os quatro `alert()` e adicionar o toast de sucesso**

```tsx
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
      showToast('Erro ao carregar evento')
      navigate('/vehicle-events')
    } finally {
      setLoading(false)
    }
  }
```

```tsx
    if (!amount || !eventDate || !activeVehicle) {
      showToast('Preencha todos os campos obrigatórios')
      return
    }

    if (eventDate > todayIsoDate()) {
      showToast('A data do evento não pode ser futura')
      return
    }
```

```tsx
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

      showToast('Evento salvo com sucesso.', 'success')
      navigate('/vehicle-events')
    } catch (err) {
      console.log(err)
      showToast('Erro ao salvar evento')
    } finally {
      setSubmitting(false)
    }
  }
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 4: Commit**

```bash
git add src/routes/VehicleEventForm.tsx
git commit -m "feat: replace alert() with toast in VehicleEventForm, add success toast"
```

---

### Task 11: Update `src/routes/VehicleNew.tsx`

**Files:**
- Modify: `src/routes/VehicleNew.tsx`

**Interfaces:**
- Consumes: `useToast` (Task 2).

- [ ] **Step 1: Adicionar o import e o hook**

```tsx
import { useToast } from '../context/ToastContext'
```

Dentro do componente `VehicleNew`, logo após `const { loadActiveVehicle } = useVehicle()`:

```tsx
  const { showToast } = useToast()
```

- [ ] **Step 2: Trocar os dois `alert()` e adicionar o toast de sucesso**

```tsx
    if (
      !fipe.brandName ||
      !fipe.modelName ||
      !fipe.modelYear ||
      !manufactureYear ||
      !licensePlate ||
      !currentKm ||
      !capacity
    ) {
      showToast('Preencha todos os campos')
      return
    }
```

```tsx
      if (response) {
        await authenticatedRequest(`/vehicles/${response.id}/active`, {
          method: 'PUT',
        })

        await loadActiveVehicle()
        showToast('Veículo cadastrado com sucesso.', 'success')
        navigate('/')
      }
    } catch (error) {
      console.log(error)
      showToast('Erro ao cadastrar veículo')
    } finally {
      setLoading(false)
    }
  }
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 4: Commit**

```bash
git add src/routes/VehicleNew.tsx
git commit -m "feat: replace alert() with toast in VehicleNew, add success toast"
```

---

### Task 12: Update `src/routes/Refuels.tsx`

**Files:**
- Modify: `src/routes/Refuels.tsx`

**Interfaces:**
- Consumes: `useToast` (Task 2), `useConfirm` (Task 4).

- [ ] **Step 1: Adicionar os imports e os hooks**

Adicionar junto aos imports existentes:

```tsx
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
```

Dentro do componente `Refuels`, logo após `const [deletingId, setDeletingId] = useState<number | null>(null)`:

```tsx
  const { showToast } = useToast()
  const confirm = useConfirm()
```

- [ ] **Step 2: Trocar `confirm()`/`alert()` e adicionar o toast de sucesso**

```tsx
  async function handleDelete(id: number) {
    if (!(await confirm('Excluir este abastecimento?'))) return

    try {
      setDeletingId(id)
      await authenticatedRequest(`/refuels/${id}`, { method: 'DELETE' })
      await reload()
      showToast('Abastecimento excluído.', 'success')
    } catch (err) {
      console.log(err)
      showToast('Erro ao excluir abastecimento')
    } finally {
      setDeletingId(null)
    }
  }
```

- [ ] **Step 3: Ampliar a área de toque de "Editar"/"Excluir"**

```tsx
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
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 5: Commit**

```bash
git add src/routes/Refuels.tsx
git commit -m "feat: replace confirm()/alert() with dialog/toast in Refuels, widen tap targets"
```

---

### Task 13: Update `src/routes/VehicleEvents.tsx`

**Files:**
- Modify: `src/routes/VehicleEvents.tsx`

**Interfaces:**
- Consumes: `useToast` (Task 2), `useConfirm` (Task 4).

- [ ] **Step 1: Adicionar os imports e os hooks**

```tsx
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
```

Dentro do componente `VehicleEvents`, logo após `const [deletingId, setDeletingId] = useState<number | null>(null)`:

```tsx
  const { showToast } = useToast()
  const confirm = useConfirm()
```

- [ ] **Step 2: Trocar `confirm()`/`alert()` e adicionar o toast de sucesso**

```tsx
  async function handleDelete(id: number) {
    if (!(await confirm('Excluir este evento?'))) return

    try {
      setDeletingId(id)
      await authenticatedRequest(`/vehicle-events/${id}`, { method: 'DELETE' })
      await reload()
      showToast('Evento excluído.', 'success')
    } catch (err) {
      console.log(err)
      showToast('Erro ao excluir evento')
    } finally {
      setDeletingId(null)
    }
  }
```

- [ ] **Step 3: Ampliar a área de toque de "Editar"/"Excluir"**

```tsx
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
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 5: Commit**

```bash
git add src/routes/VehicleEvents.tsx
git commit -m "feat: replace confirm()/alert() with dialog/toast in VehicleEvents, widen tap targets"
```

---

### Task 14: Update `src/routes/SelectVehicle.tsx`

**Files:**
- Modify: `src/routes/SelectVehicle.tsx`

**Interfaces:**
- Consumes: `useToast` (Task 2).

- [ ] **Step 1: Adicionar o import e o hook**

```tsx
import { useToast } from '../context/ToastContext'
```

Dentro do componente `SelectVehicle`, logo após `const { loadActiveVehicle } = useVehicle()`:

```tsx
  const { showToast } = useToast()
```

- [ ] **Step 2: Adicionar o toast de erro (falha silenciosa hoje) e o de sucesso na ativação**

```tsx
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

  async function activateVehicle(id: number) {
    try {
      await authenticatedRequest(`/vehicles/${id}/active`, {
        method: 'PUT',
      })

      await loadActiveVehicle()
      showToast('Veículo ativado.', 'success')
      navigate('/')
    } catch (error) {
      console.log(error)
    }
  }
```

Nota: o `catch` de `activateVehicle` **não** ganha toast — o spec só pede o
toast de sucesso nesse método; a falha na ativação continua silenciosa
(fora de escopo, não listada no spec).

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no output, clean exit.

- [ ] **Step 4: Commit**

```bash
git add src/routes/SelectVehicle.tsx
git commit -m "feat: add error/success toast in SelectVehicle"
```

---

### Task 15: Manual verification

**Files:** none (verification only).

- [ ] **Step 1: Build check**

Run: `npm run build`
Expected: `tsc -b && vite build` sem erros.

- [ ] **Step 2: Grep de confirmação — nenhum `alert(`/`confirm(` restante**

Run: `grep -rn 'alert(\|confirm(' src/routes/`
Expected: nenhuma ocorrência (saída vazia, exit code 1 do grep).

- [ ] **Step 3: Iniciar o dev server e logar**

Run: `npm run dev`, abrir no navegador, logar com uma conta de teste com veículo ativo.

- [ ] **Step 4: Exercitar os 21 pontos de erro/validação**

Login (campo vazio, senha errada), Register (campos vazios, senhas
diferentes, senha curta, erro genérico simulando falha de rede),
RefuelForm (campos vazios, erro ao salvar simulando falha de rede),
VehicleEventForm (campos obrigatórios vazios, data futura, erro ao
salvar), VehicleNew (campos vazios, erro ao cadastrar). Confirmar que cada
um mostra um toast vermelho no canto inferior, nunca um `alert()` nativo.

- [ ] **Step 5: Exercitar os 6 toasts de sucesso**

Salvar um abastecimento, salvar um evento, excluir um abastecimento,
excluir um evento, ativar um veículo diferente em `/select-vehicle`,
cadastrar um veículo novo. Confirmar toast verde em cada um, sem atraso
perceptível na navegação que já acontecia.

- [ ] **Step 6: Limite de 3 toasts e transição**

Disparar 4+ toasts em sequência rápida (ex. tentar salvar um formulário
vazio várias vezes seguidas) — confirmar que nunca mais de 3 toasts ficam
visíveis ao mesmo tempo, e que cada um aparece com uma transição sutil de
fade/slide (não aparece/some abruptamente). Emular
`prefers-reduced-motion: reduce` via devtools (Rendering → Emulate CSS
media feature) e confirmar que a transição some (aparecer/sumir direto).

- [ ] **Step 7: `ConfirmDialog`**

Em `/refuels` ou `/vehicle-events`, clicar em "Excluir": confirmar que o
foco visual (anel de foco) começa no botão "Cancelar"; apertar Tab alterna
entre "Cancelar"/"Excluir"; apertar Esc fecha sem excluir; clicar no
backdrop escuro fecha sem excluir; depois de fechar por qualquer via, o
próximo Tab a partir do link "Excluir" original se comporta normalmente
(foco restaurado nele). Clicar em "Excluir" de fato remove o item e mostra
o toast de sucesso.

- [ ] **Step 8: Área de toque**

Em `/refuels` e `/vehicle-events`, com o zoom do navegador em 100%, tocar
(ou clicar) um pouco acima/abaixo do texto "Editar"/"Excluir" (não só em
cima da palavra) e confirmar que o link/botão ainda ativa.

- [ ] **Step 9: Fora do `AppLayout`**

Confirmar que toast e diálogo de confirmação funcionam em `/login` e
`/register` (fora do `AppLayout`) e não só nas telas autenticadas.

- [ ] **Step 10: Deploy**

Após a verificação local passar, deploy no Render (`render.yaml`
existente, deploy automático no push pra `main`) e repetir pelo menos os
Steps 4, 5 e 7 em produção.

---

## Self-Review

**Cobertura do spec:** os 21 pontos de `alert()`/`confirm()`/falha
silenciosa da primeira tabela do spec → Tasks 7-14, um arquivo por task.
Os 6 toasts de sucesso da segunda tabela → mesmas tasks (cada um no
arquivo correspondente). Acessibilidade (`role`/`aria-live`) → Task 3.
Limite de 3 toasts → Task 2. Transição + `prefers-reduced-motion` → Task
3. z-index (`z-40` toast / `z-50` diálogo) → Tasks 3 e 5. Esc/backdrop +
foco no `ConfirmDialog` → Task 5. Área de toque → Tasks 12-13. Providers
disponíveis fora do `AppLayout` (Login/Register) → Task 6 (envolvem toda a
`<Routes>`, não só as rotas protegidas).

**Placeholder scan:** nenhum "TBD"/"TODO" — todo step tem código completo
ou comando exato.

**Consistência de tipos:** `useToast()` retorna `{ toasts, showToast,
dismissToast }` (Task 2) e todos os call sites (Tasks 7-14) usam só
`const { showToast } = useToast()`, mesma assinatura. `useConfirm()`
retorna diretamente a função `confirm` (Task 4) e os dois call sites
(Tasks 12-13) usam `const confirm = useConfirm()` + `await confirm(msg)`,
consistente. `showToast(message, variant?)` com `variant` default
`'error'` usado de forma consistente em todas as 14 tasks de call site
(chamadas de erro omitem o segundo argumento, chamadas de sucesso passam
`'success'` explicitamente).

**Nota sobre a Task 6:** o conteúdo "atual" de `App.tsx` mostrado no Step
1 foi confirmado nesta sessão (mesmo commit `5dd6c0e` em que este plano
foi escrito) — mas como esse arquivo já foi tocado por edição concorrente
de outra sessão uma vez neste projeto (durante o plano de app-shell), o
executor deve reconferir o conteúdo real antes de aplicar o Step 2 caso o
Step 1 não bata exatamente.
