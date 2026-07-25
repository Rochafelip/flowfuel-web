# Refuel and Vehicle Event Screens — Design

## Contexto

O backend já expõe CRUD completo para dois domínios que o frontend ainda não consome:

- **Refuel** (abastecimento) — `flowfuel/src/main/java/com/devappmobile/flowfuel/refuel/RefuelController.java`, mapeado em `/api/v1/refuels` (prefixo `/api/v1` aplicado globalmente por `WebMvcConfig`).
- **VehicleEvent** (evento do veículo — manutenção, seguro, etc.) — `flowfuel/src/main/java/com/devappmobile/flowfuel/vehicleevent/VehicleEventController.java`, mapeado em `/api/v1/vehicle-events`.

Nenhuma tela do frontend hoje cria, lista, edita ou exclui abastecimentos/eventos — o único uso de dados de refuel no frontend é indireto, via `Dashboard` (`totalRefuels`, `lastRefuelDate`).

## Contratos do backend

### Refuel

```
POST   /api/v1/refuels                          → RefuelResponseDTO
GET    /api/v1/refuels/vehicle/{vehicleId}       → PageResponseDTO<RefuelResponseDTO>
         query params: startDate?, endDate?, page, size (não usados nesta versão — sem filtro)
GET    /api/v1/refuels/{id}                      → RefuelResponseDTO
PUT    /api/v1/refuels/{id}                      → RefuelResponseDTO
DELETE /api/v1/refuels/{id}                      → 200, sem corpo
```

`RefuelRequestDTO` (body de POST/PUT):
```java
{
  vehicleId: Long        // @NotNull
  odometer: Integer       // @NotNull @Min(0)
  energyAmount: BigDecimal  // @NotNull @DecimalMin("0.01")
  pricePerUnit: BigDecimal  // @NotNull @DecimalMin("0.01")
  fullTank: Boolean = false
  refuelType: RefuelType | null  // "FUEL" | "ELECTRIC". Obrigatório apenas se o veículo é HYBRID;
                                  // inferido pelo backend para COMBUSTION (FUEL) e ELECTRIC (ELECTRIC).
}
```

**Não há campo de data em `RefuelRequestDTO`** — o backend define `refuelDate` como `now()` na criação; o formulário não deve ter campo de data.

`RefuelResponseDTO`:
```java
{
  id: Long
  vehicleId: Long
  refuelDate: LocalDateTime   // ISO string no JSON, ex: "2026-07-20T14:30:00"
  odometer: Integer
  kmSinceLastRefuel: Integer | null
  energyAmount: BigDecimal
  pricePerUnit: BigDecimal
  totalAmount: BigDecimal      // calculado pelo backend
  fullTank: Boolean
  refuelType: RefuelType       // "FUEL" | "ELECTRIC" (sempre presente na resposta)
}
```

### VehicleEvent

```
POST   /api/v1/vehicle-events                          → VehicleEventResponseDTO
GET    /api/v1/vehicle-events/vehicle/{vehicleId}       → PageResponseDTO<VehicleEventResponseDTO>
         query params: type?, startDate?, endDate?, page, size (não usados nesta versão — sem filtro)
GET    /api/v1/vehicle-events/{id}                      → VehicleEventResponseDTO
PUT    /api/v1/vehicle-events/{id}                      → VehicleEventResponseDTO
DELETE /api/v1/vehicle-events/{id}                      → 200, sem corpo
```

`VehicleEventRequestDTO` (body de POST/PUT):
```java
{
  vehicleId: Long          // @NotNull
  type: VehicleEventType    // @NotNull
  amount: BigDecimal        // @NotNull @DecimalMin("0.01"), até 2 casas decimais
  eventDate: LocalDate       // @NotNull @PastOrPresent (string "YYYY-MM-DD")
  odometer: Integer | null   // @PositiveOrZero, opcional
  description: String | null // opcional, até 2000 caracteres
}
```

`VehicleEventType` enum: `FUEL`, `MAINTENANCE`, `OIL_CHANGE`, `CAR_WASH`, `TIRES`, `INSURANCE`, `TAX`, `DOCUMENTS`, `OTHER`.

`VehicleEventResponseDTO`: mesmos campos do request + `id`, `createdAt`, `updatedAt` (`LocalDateTime`).

### PageResponseDTO (genérico, compartilhado pelas duas listas)

```java
{
  content: T[]
  page: int
  size: int
  totalElements: long
  totalPages: int
}
```

## Decisões de escopo (confirmadas com o usuário)

1. **CRUD completo** para os dois domínios (criar, listar, editar, excluir) — não é MVP reduzido.
2. **Navegação:** dois links/botões no `Home.tsx` ("Abastecimentos" e "Eventos"), sem criar uma nav bar/menu global.
3. **Paginação:** botão "Carregar mais" (não numeração de páginas).
4. **Sem filtros nesta versão** — as listas mostram tudo, sem UI de filtro por data/tipo, mesmo o backend aceitando esses parâmetros.

## Mudanças

### 1. `src/context/VehicleContext.tsx` (modificar)

O tipo `Vehicle` local não inclui `energyType`, que é necessário para decidir se o formulário de abastecimento mostra o campo `refuelType`. O backend já retorna esse campo em `GET /vehicles/active` (`VehicleResponseDTO.energyType`), só falta declará-lo no tipo do frontend:

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

Nenhuma outra mudança nesse arquivo.

### 2. `src/types/Page.ts` (criar)

```ts
export type PageResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
```

### 3. `src/types/Refuel.ts` (criar)

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

### 4. `src/types/VehicleEvent.ts` (criar)

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

### 5. `src/hooks/usePaginatedList.ts` (criar)

Hook compartilhado pelas duas telas de lista — evita duplicar a lógica de "buscar página, acumular itens, saber se há mais".

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

`endpoint` é `null` quando ainda não há `activeVehicle.id` disponível (evita fetch prematuro); a tela que usa o hook passa `` `/refuels/vehicle/${activeVehicle.id}` `` ou `null`.

### 6. `src/routes/Refuels.tsx` (criar) — lista de abastecimentos

- Usa `usePaginatedList<Refuel>(activeVehicle ? `/refuels/vehicle/${activeVehicle.id}` : null)`.
- Cada item mostra: `refuelDate` formatada (`toLocaleString('pt-BR')`, é `LocalDateTime`), `odometer` + "km", `kmSinceLastRefuel` (se não nulo, "+N km desde o último"), `energyAmount` + unidade (`refuelType === 'FUEL' ? 'L' : 'kWh'`), `pricePerUnit` formatado em moeda + unidade ("/L" ou "/kWh"), `totalAmount` em moeda, selo "Tanque cheio" se `fullTank`.
- Botão "Editar" por item → navega para `/refuels/${item.id}/edit`.
- Botão "Excluir" por item → `if (confirm('Excluir este abastecimento?'))`, chama `authenticatedRequest(`/refuels/${item.id}`, { method: 'DELETE' })`, depois `reload()`.
- Botão "Carregar mais" visível quando `hasMore`, chama `loadMore()`, desabilitado durante `loading`.
- Botão "Novo abastecimento" no topo → `/refuels/new`.
- Estado vazio (`items.length === 0 && !loading`): "Nenhum abastecimento registrado".

### 7. `src/routes/RefuelForm.tsx` (criar) — criar/editar abastecimento

- Rota dupla: `/refuels/new` (criar) e `/refuels/:id/edit` (editar) — usa `useParams<{ id?: string }>()` para saber o modo.
- Se `id` presente: no mount, `authenticatedRequest(`/refuels/${id}`)` pré-carrega os campos.
- Campos controlados: `odometer`, `energyAmount`, `pricePerUnit`, `fullTank` (checkbox), e `refuelType` (select) **somente renderizado se `activeVehicle?.energyType === 'HYBRID'`**.
- Submit: monta `RefuelRequest` com `vehicleId: activeVehicle.id` e `refuelType: activeVehicle.energyType === 'HYBRID' ? refuelType : null`; `POST /refuels` (criar) ou `PUT /refuels/${id}` (editar); em sucesso, `navigate('/refuels')`.
- Erros de validação (400): `alert('Erro ao salvar abastecimento')`, seguindo o padrão de `VehicleNew.tsx`.
- Botão "Voltar" (`navigate(-1)`), mesmo padrão de `VehicleNew.tsx`.

### 8. `src/routes/VehicleEvents.tsx` (criar) — lista de eventos

- Usa `usePaginatedList<VehicleEvent>(activeVehicle ? `/vehicle-events/vehicle/${activeVehicle.id}` : null)`.
- Cada item mostra: `VEHICLE_EVENT_TYPE_LABELS[item.type]`, `eventDate` formatada (`toLocaleDateString('pt-BR', { timeZone: 'UTC' })`, é `LocalDate`), `amount` em moeda, `odometer` + "km" se não nulo, `description` (se presente, truncada a ~100 caracteres com "...").
- Mesmos botões "Editar", "Excluir" (com `confirm`), "Carregar mais", "Novo evento" (→ `/vehicle-events/new`) do padrão de Refuels.
- Estado vazio: "Nenhum evento registrado".

### 9. `src/routes/VehicleEventForm.tsx` (criar) — criar/editar evento

- Rota dupla: `/vehicle-events/new` e `/vehicle-events/:id/edit`.
- Se `id` presente: pré-carrega via `GET /vehicle-events/{id}`.
- Campos: `type` (select com as 9 opções de `VEHICLE_EVENT_TYPE_LABELS`), `amount`, `eventDate` (`<input type="date">`, validado no front para não ser data futura, espelhando `@PastOrPresent`), `odometer` (opcional), `description` (`<textarea>`, opcional, `maxLength={2000}`).
- Submit: monta `VehicleEventRequest` com `vehicleId: activeVehicle.id`; `POST /vehicle-events` ou `PUT /vehicle-events/${id}`; em sucesso, `navigate('/vehicle-events')`.
- Erros de validação: `alert('Erro ao salvar evento')`.
- Botão "Voltar" (`navigate(-1)`).

### 10. `src/routes/Home.tsx` (modificar)

Adicionar, logo abaixo do `<h1>`, dois links de navegação:

```tsx
<div className="mb-5 flex gap-3">
  <Link to="/refuels" className="text-sm font-bold text-blue-600">
    Abastecimentos
  </Link>
  <Link to="/vehicle-events" className="text-sm font-bold text-blue-600">
    Eventos
  </Link>
</div>
```

(usando `Link` de `react-router-dom`, já uma dependência do projeto). Nenhuma outra mudança em `Home.tsx`.

### 11. `src/App.tsx` (modificar)

Adicionar dentro do bloco `<Route element={<ProtectedRoute />}>`:

```tsx
<Route path="/refuels" element={<Refuels />} />
<Route path="/refuels/new" element={<RefuelForm />} />
<Route path="/refuels/:id/edit" element={<RefuelForm />} />
<Route path="/vehicle-events" element={<VehicleEvents />} />
<Route path="/vehicle-events/new" element={<VehicleEventForm />} />
<Route path="/vehicle-events/:id/edit" element={<VehicleEventForm />} />
```

com os imports correspondentes no topo do arquivo.

## Testes

Sem suíte automatizada configurada (mesma situação do Dashboard). Verificação manual: `npm run dev`, logar, criar/editar/excluir abastecimentos e eventos para um veículo COMBUSTION, um ELECTRIC e um HYBRID (para checar o campo condicional `refuelType`), conferir "Carregar mais" com mais de 20 registros (ou reduzir `size` temporariamente para testar), e conferir os estados vazios.

## Fora de escopo (não fazer agora)

- Filtros de data/tipo nas listas (os parâmetros existem no backend, não expostos na UI).
- Nav bar/menu global — só os dois links no Dashboard.
- Paginação por números de página.
- Gráficos ou agregações dessas listas (isso é papel do Dashboard, já implementado).
