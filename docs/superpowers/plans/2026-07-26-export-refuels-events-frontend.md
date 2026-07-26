# Exportação de Abastecimentos e Eventos (Frontend Web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar uma tela dedicada `/export` no `flowfuel-frontend` que permite ao usuário baixar abastecimentos ou eventos do veículo escolhido, em CSV ou XLSX, consumindo os endpoints já existentes `GET /exports/refuels` e `GET /exports/events` do backend.

**Architecture:** Um novo serviço isolado (`src/services/export.ts`) trata o download de arquivo binário (fetch → blob → link temporário), separado de `authenticatedRequest` (que sempre espera JSON). Uma nova rota/tela (`src/routes/Export.tsx`) monta o formulário (veículo, tipo de dado, filtros, formato) e delega o download a esse serviço. Sem estado global novo — tudo em `useState` local, seguindo o padrão de `VehicleEventForm.tsx`/`SelectVehicle.tsx`.

**Tech Stack:** Vite + React 19 + TypeScript (strict) + React Router 7 + Tailwind. Sem framework de testes automatizados instalado no repositório (nenhum `vitest`/`jest` em `package.json`, nenhum arquivo `*.test.*` existente).

## Global Constraints

- Sem PDF — apenas `format=csv|xlsx`, os dois únicos valores aceitos pelo backend.
- Sem suíte de testes automatizados neste repositório — cada task usa `npx tsc -b` (type-check, o mesmo `strict`/`noUnusedLocals`/`noUnusedParameters` do `tsconfig.json`) como verificação estática, e uma verificação manual pontual via `npm run dev` como verificação funcional, conforme já decidido na spec (seção "Testes / verificação manual").
- Seguir os componentes de UI existentes (`Screen`, `Card`, `Button`, `TextField`, `SegmentedToggle`) e o estilo inline de `<select>` já usado em `VehicleEventForm.tsx` — não criar um componente `Select` novo.
- `BASE_URL` do serviço de export deve replicar exatamente a constante de `src/services/api.ts` (`import.meta.env.VITE_API_URL ?? 'https://flowfuel-api.fly.dev'`).
- Sem toast de sucesso na exportação (o próprio download é o feedback) — apenas toast de erro, via `useToast()` (`showToast(mensagem)`, variante padrão `'error'`).

---

### Task 1: Serviço de download de exportação

**Files:**
- Create: `src/services/export.ts`

**Interfaces:**
- Produces: `downloadExport(endpoint: string, fallbackFileName: string): Promise<void>` — dispara o download do navegador; rejeita a Promise (`throw new Error('Erro ao exportar')`) se a resposta HTTP não for `ok`. `endpoint` é o path relativo já com query string (ex.: `/exports/refuels?vehicleId=42&format=csv`), sem o prefixo `/api/v1`.

- [ ] **Step 1: Criar `src/services/export.ts`**

```ts
const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://flowfuel-api.fly.dev'

export async function downloadExport(endpoint: string, fallbackFileName: string) {
  const token = localStorage.getItem('@token')

  const response = await fetch(`${BASE_URL}/api/v1${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Erro ao exportar')
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition')
  const match = disposition?.match(/filename="?([^"]+)"?/)
  const fileName = match?.[1] ?? fallbackFileName

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros (saída vazia, exit code 0).

- [ ] **Step 3: Commit**

```bash
git add src/services/export.ts
git commit -m "feat: add downloadExport service for binary file downloads"
```

---

### Task 2: Rota `/export` com seleção de veículo

**Files:**
- Create: `src/routes/Export.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/NavLinks.tsx`

**Interfaces:**
- Consumes: `authenticatedRequest(endpoint: string, options?: Partial<RequestInit>): Promise<any>` de `src/services/api.ts` (já existente); `useToast(): { showToast: (message: string, variant?: 'success'|'error') => void }` de `src/context/ToastContext.tsx` (já existente).
- Produces: componente `Export` exportado de `src/routes/Export.tsx`, montado na rota `/export`.

- [ ] **Step 1: Criar `src/routes/Export.tsx` (scaffold com seleção de veículo)**

```tsx
import { useEffect, useState } from 'react'
import { authenticatedRequest } from '../services/api'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { Spinner } from '../components/ui/Spinner'

interface VehicleListItem {
  id: number
  brand: string
  model: string
}

export function Export() {
  const { showToast } = useToast()

  const [vehicles, setVehicles] = useState<VehicleListItem[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [vehicleId, setVehicleId] = useState('')

  useEffect(() => {
    loadVehicles()
  }, [])

  async function loadVehicles() {
    try {
      const response = await authenticatedRequest('/vehicles')
      setVehicles(response.content)
      if (response.content.length > 0) {
        setVehicleId(String(response.content[0].id))
      }
    } catch (err) {
      console.log(err)
      showToast('Não foi possível carregar seus veículos')
    } finally {
      setLoadingVehicles(false)
    }
  }

  if (loadingVehicles) {
    return (
      <Screen centered>
        <Spinner />
      </Screen>
    )
  }

  if (vehicles.length === 0) {
    return (
      <Screen centered>
        <p>Nenhum veículo cadastrado</p>
      </Screen>
    )
  }

  return (
    <Screen wide>
      <h1 className="mb-5 text-xl font-bold">Exportar dados</h1>

      <form className="flex flex-col gap-4">
        <select
          className="h-12 w-full rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
        >
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.brand} {v.model}
            </option>
          ))}
        </select>
      </form>
    </Screen>
  )
}
```

- [ ] **Step 2: Registrar a rota em `src/App.tsx`**

Adicionar o import junto dos demais (após a linha do import de `VehicleEventForm`):

```tsx
import { Export } from './routes/Export'
```

Adicionar a rota dentro do grupo protegido, após `/vehicle-events/:id/edit`:

```tsx
                    <Route path="/vehicle-events/:id/edit" element={<VehicleEventForm />} />
                    <Route path="/export" element={<Export />} />
```

- [ ] **Step 3: Adicionar item de menu em `src/components/layout/NavLinks.tsx`**

Substituir o array `navItems` por:

```tsx
const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/refuels', label: 'Abastecimentos', icon: '⛽', end: false },
  { to: '/vehicle-events', label: 'Eventos', icon: '🔧', end: false },
  { to: '/export', label: 'Exportar', icon: '📤', end: false },
]
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 5: Verificação manual**

Run: `npm run dev`
- Abrir `http://localhost:5173/export` (logado com um usuário que tenha ao menos um veículo cadastrado).
- Confirmar: o link "Exportar" aparece no menu lateral, o `<select>` mostra os veículos do usuário, o primeiro vem pré-selecionado.
- (Opcional) Testar com um usuário sem veículos: deve aparecer "Nenhum veículo cadastrado" em vez do formulário.

- [ ] **Step 6: Commit**

```bash
git add src/routes/Export.tsx src/App.tsx src/components/layout/NavLinks.tsx
git commit -m "feat: add /export route with vehicle selector"
```

---

### Task 3: Filtros — tipo de dado, categoria e período

**Files:**
- Modify: `src/routes/Export.tsx`

**Interfaces:**
- Consumes: `VEHICLE_EVENT_TYPE_LABELS: Record<VehicleEventType, string>` e `type VehicleEventType` de `src/types/VehicleEvent.ts` (já existente); `SegmentedToggle<T extends string>({ options, value, onChange }): JSX.Element` de `src/components/ui/SegmentedToggle.tsx` (já existente); `TextField` de `src/components/ui/TextField.tsx` (já existente).
- Produces: estados internos `dataType`, `eventType`, `startDate`, `endDate`, `dateError` — consumidos pela Task 4 no mesmo arquivo.

- [ ] **Step 1: Substituir o conteúdo de `src/routes/Export.tsx` pelo seguinte**

```tsx
import { useEffect, useState } from 'react'
import { authenticatedRequest } from '../services/api'
import {
  VEHICLE_EVENT_TYPE_LABELS,
  type VehicleEventType,
} from '../types/VehicleEvent'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { Spinner } from '../components/ui/Spinner'
import { TextField } from '../components/ui/TextField'
import { SegmentedToggle } from '../components/ui/SegmentedToggle'

interface VehicleListItem {
  id: number
  brand: string
  model: string
}

type DataType = 'REFUELS' | 'EVENTS'

const EVENT_TYPES = Object.keys(VEHICLE_EVENT_TYPE_LABELS) as VehicleEventType[]

function validateDates(from: string, to: string): string | null {
  if ((from && !to) || (!from && to)) {
    return 'Informe as duas datas ou nenhuma'
  }
  if (from && to && from > to) {
    return 'Data inicial não pode ser depois da data final'
  }
  return null
}

export function Export() {
  const { showToast } = useToast()

  const [vehicles, setVehicles] = useState<VehicleListItem[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [vehicleId, setVehicleId] = useState('')

  const [dataType, setDataType] = useState<DataType>('REFUELS')
  const [eventType, setEventType] = useState<VehicleEventType | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dateError, setDateError] = useState<string | null>(null)

  useEffect(() => {
    loadVehicles()
  }, [])

  async function loadVehicles() {
    try {
      const response = await authenticatedRequest('/vehicles')
      setVehicles(response.content)
      if (response.content.length > 0) {
        setVehicleId(String(response.content[0].id))
      }
    } catch (err) {
      console.log(err)
      showToast('Não foi possível carregar seus veículos')
    } finally {
      setLoadingVehicles(false)
    }
  }

  function handleStartDateChange(value: string) {
    setStartDate(value)
    setDateError(validateDates(value, endDate))
  }

  function handleEndDateChange(value: string) {
    setEndDate(value)
    setDateError(validateDates(startDate, value))
  }

  if (loadingVehicles) {
    return (
      <Screen centered>
        <Spinner />
      </Screen>
    )
  }

  if (vehicles.length === 0) {
    return (
      <Screen centered>
        <p>Nenhum veículo cadastrado</p>
      </Screen>
    )
  }

  return (
    <Screen wide>
      <h1 className="mb-5 text-xl font-bold">Exportar dados</h1>

      <form className="flex flex-col gap-4">
        <select
          className="h-12 w-full rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
        >
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.brand} {v.model}
            </option>
          ))}
        </select>

        <SegmentedToggle
          value={dataType}
          onChange={setDataType}
          options={[
            { value: 'REFUELS', label: 'Abastecimentos' },
            { value: 'EVENTS', label: 'Eventos' },
          ]}
        />

        {dataType === 'EVENTS' && (
          <select
            className="h-12 w-full rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            value={eventType}
            onChange={(e) => setEventType(e.target.value as VehicleEventType | '')}
          >
            <option value="">Todas as categorias</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {VEHICLE_EVENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        )}

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm text-gray-600">De</label>
            <TextField
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm text-gray-600">Até</label>
            <TextField
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
            />
          </div>
        </div>

        {dateError && <p className="text-sm text-red-600">{dateError}</p>}
      </form>
    </Screen>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Verificação manual**

Run: `npm run dev` (se já estiver rodando, o Vite recarrega sozinho)
- Alternar entre "Abastecimentos" e "Eventos": o seletor de categoria só aparece em "Eventos".
- Preencher só a data "De": aparece "Informe as duas datas ou nenhuma".
- Preencher "De" com data depois de "Até": aparece "Data inicial não pode ser depois da data final".
- Corrigir as datas (De < Até, ou ambas vazias): a mensagem de erro some.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Export.tsx
git commit -m "feat: add data type, category and date range filters to export form"
```

---

### Task 4: Formato, download real e estado de exportação

**Files:**
- Modify: `src/routes/Export.tsx`

**Interfaces:**
- Consumes: `downloadExport(endpoint: string, fallbackFileName: string): Promise<void>` da Task 1 (`src/services/export.ts`); `Button` de `src/components/ui/Button.tsx` (já existente).
- Produces: formulário completo e funcional — não há mais nenhuma task depois desta.

- [ ] **Step 1: Substituir o conteúdo de `src/routes/Export.tsx` pelo seguinte**

```tsx
import { useEffect, useState, type FormEvent } from 'react'
import { authenticatedRequest } from '../services/api'
import { downloadExport } from '../services/export'
import {
  VEHICLE_EVENT_TYPE_LABELS,
  type VehicleEventType,
} from '../types/VehicleEvent'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { Spinner } from '../components/ui/Spinner'
import { TextField } from '../components/ui/TextField'
import { SegmentedToggle } from '../components/ui/SegmentedToggle'
import { Button } from '../components/ui/Button'

interface VehicleListItem {
  id: number
  brand: string
  model: string
}

type DataType = 'REFUELS' | 'EVENTS'
type ExportFileFormat = 'csv' | 'xlsx'

const EVENT_TYPES = Object.keys(VEHICLE_EVENT_TYPE_LABELS) as VehicleEventType[]

function validateDates(from: string, to: string): string | null {
  if ((from && !to) || (!from && to)) {
    return 'Informe as duas datas ou nenhuma'
  }
  if (from && to && from > to) {
    return 'Data inicial não pode ser depois da data final'
  }
  return null
}

export function Export() {
  const { showToast } = useToast()

  const [vehicles, setVehicles] = useState<VehicleListItem[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [vehicleId, setVehicleId] = useState('')

  const [dataType, setDataType] = useState<DataType>('REFUELS')
  const [eventType, setEventType] = useState<VehicleEventType | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dateError, setDateError] = useState<string | null>(null)
  const [format, setFormat] = useState<ExportFileFormat>('csv')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    loadVehicles()
  }, [])

  async function loadVehicles() {
    try {
      const response = await authenticatedRequest('/vehicles')
      setVehicles(response.content)
      if (response.content.length > 0) {
        setVehicleId(String(response.content[0].id))
      }
    } catch (err) {
      console.log(err)
      showToast('Não foi possível carregar seus veículos')
    } finally {
      setLoadingVehicles(false)
    }
  }

  function handleStartDateChange(value: string) {
    setStartDate(value)
    setDateError(validateDates(value, endDate))
  }

  function handleEndDateChange(value: string) {
    setEndDate(value)
    setDateError(validateDates(startDate, value))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const validationError = validateDates(startDate, endDate)
    if (validationError) {
      setDateError(validationError)
      return
    }

    const params = new URLSearchParams()
    params.set('vehicleId', vehicleId)
    params.set('format', format)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)

    const basePath = dataType === 'REFUELS' ? '/exports/refuels' : '/exports/events'
    if (dataType === 'EVENTS' && eventType) {
      params.set('type', eventType)
    }

    try {
      setExporting(true)
      await downloadExport(`${basePath}?${params.toString()}`, `flowfuel-export.${format}`)
    } catch (err) {
      console.log(err)
      showToast('Não foi possível exportar. Tente novamente.')
    } finally {
      setExporting(false)
    }
  }

  if (loadingVehicles) {
    return (
      <Screen centered>
        <Spinner />
      </Screen>
    )
  }

  if (vehicles.length === 0) {
    return (
      <Screen centered>
        <p>Nenhum veículo cadastrado</p>
      </Screen>
    )
  }

  return (
    <Screen wide>
      <h1 className="mb-5 text-xl font-bold">Exportar dados</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <select
          className="h-12 w-full rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
        >
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.brand} {v.model}
            </option>
          ))}
        </select>

        <SegmentedToggle
          value={dataType}
          onChange={setDataType}
          options={[
            { value: 'REFUELS', label: 'Abastecimentos' },
            { value: 'EVENTS', label: 'Eventos' },
          ]}
        />

        {dataType === 'EVENTS' && (
          <select
            className="h-12 w-full rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            value={eventType}
            onChange={(e) => setEventType(e.target.value as VehicleEventType | '')}
          >
            <option value="">Todas as categorias</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {VEHICLE_EVENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        )}

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm text-gray-600">De</label>
            <TextField
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm text-gray-600">Até</label>
            <TextField
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
            />
          </div>
        </div>

        {dateError && <p className="text-sm text-red-600">{dateError}</p>}

        <SegmentedToggle
          value={format}
          onChange={setFormat}
          options={[
            { value: 'csv', label: 'CSV' },
            { value: 'xlsx', label: 'Excel' },
          ]}
        />

        <Button type="submit" disabled={exporting || Boolean(dateError)}>
          {exporting ? 'Exportando...' : 'Exportar'}
        </Button>
      </form>
    </Screen>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Verificação manual completa (checklist da spec)**

Run: `npm run dev`, logado com um usuário que tenha abastecimentos e eventos cadastrados em ao menos um veículo. Confirmar cada item:

- [ ] Exportar abastecimentos em CSV, sem filtros — arquivo `.csv` baixa e abre com as colunas Data/Combustível/Litros-kWh/Preço/Total/Odômetro.
- [ ] Exportar abastecimentos em XLSX, sem filtros — arquivo `.xlsx` abre no Excel/LibreOffice com cabeçalho em negrito.
- [ ] Exportar eventos em CSV filtrando por categoria (ex.: Manutenção) — só linhas dessa categoria aparecem.
- [ ] Exportar eventos filtrando por período (De/Até dentro do histórico) — só linhas dentro do período aparecem.
- [ ] Preencher só uma data e tentar exportar — botão não deveria nem chegar a chamar a API (erro inline já visto na Task 3); confirmar que nenhuma requisição de rede é feita (aba Network do DevTools).
- [ ] Veículo sem nenhum registro — arquivo baixa só com a linha de cabeçalho.
- [ ] Desligar a rede (DevTools → Network → Offline) e tentar exportar — aparece o toast "Não foi possível exportar. Tente novamente."; o formulário permanece preenchido.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Export.tsx
git commit -m "feat: wire export format and submit to downloadExport"
```

---

## Self-Review Notes

- **Cobertura da spec:** veículo (Task 2), tipo de dado + categoria + período + validação client-side (Task 3), formato + download real + estados de erro/loading (Task 4), helper de download binário isolado (Task 1), rota e nav (Task 2). PDF e outras sub-specs do épico "Fase 5" ficaram de fora, conforme a seção "Fora de escopo" da spec.
- **Placeholders:** nenhum "TBD"/"implementar depois" — todo código é completo em cada step.
- **Consistência de tipos:** `ExportFileFormat`/`format` (`'csv' | 'xlsx'`) e `DataType`/`dataType` (`'REFUELS' | 'EVENTS'`) usados de forma idêntica da Task 3 à Task 4; `downloadExport(endpoint, fallbackFileName)` da Task 1 é chamado na Task 4 com a mesma assinatura.
