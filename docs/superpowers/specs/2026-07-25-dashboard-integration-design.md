# Dashboard Integration — Design

## Contexto

`src/routes/Home.tsx` é hoje um placeholder estático (`<p>FlowFuel</p>`), renderizado na rota protegida `/`. O backend já expõe um endpoint de dashboard por veículo:

```
GET /api/v1/dashboard/vehicle/{vehicleId}
Authorization: Bearer <token>
```

que retorna `DashboardDTO` (`flowfuel/src/main/java/com/devappmobile/flowfuel/dashboard/DashboardDTO.java`):

```java
{
  vehicleId: Long
  energyType: EnergyType        // COMBUSTION | ELECTRIC | HYBRID
  totalRefuels: Long
  totalSpent: BigDecimal
  costPerKm: BigDecimal
  totalEnergy: BigDecimal | null      // null quando HYBRID
  averagePrice: BigDecimal | null     // null quando HYBRID
  averageConsumption: Double | null   // null quando HYBRID
  energyUnit: String | null           // "litros" | "kWh"
  priceUnit: String | null            // "R$/litro" etc
  consumptionUnit: String | null      // "km/L" etc
  breakdown: HybridBreakdownDTO | null  // preenchido só quando HYBRID
  lastRefuelDate: LocalDate | null
  lastOdometer: Integer | null
}
```

`HybridBreakdownDTO` traz `fuel` e `electric`, cada um com `totalEnergy`, `totalSpent`, `averagePrice`, `averageConsumption`, `energyUnit`, `priceUnit`, `consumptionUnit`.

O tipo atual do frontend (`src/types/Dashboard.ts`) não corresponde a esse contrato (tem `monthlySpent` e um `lastRefuel` aninhado que não existem no DTO real) — foi escrito antes do backend existir e nunca foi corrigido.

O `ProtectedRoute` (`src/routes/ProtectedRoute.tsx:26-28`) já redireciona para `/select-vehicle` quando não há `activeVehicle`, então o `Home` só renderiza quando um veículo ativo já existe em `VehicleContext`. Não é necessário tratar o caso "sem veículo" dentro do próprio Home.

## Escopo

Substituir o placeholder do `Home.tsx` por cards de métricas simples (sem gráficos), buscando dados reais via `authenticatedRequest`. Fora de escopo: gráficos, header com dados do veículo, botão de trocar veículo, listagem de abastecimentos recentes.

## Mudanças

### 1. `src/types/Dashboard.ts`

Reescrever para refletir o `DashboardDTO` real:

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

### 2. `src/routes/Home.tsx`

- No mount, ler `activeVehicle` de `useVehicle()` (já não-nulo, garantido pelo `ProtectedRoute`) e chamar `authenticatedRequest(`/dashboard/vehicle/${activeVehicle.id}`)`.
- Estados: `loading` (spinner igual ao de `SelectVehicle.tsx`: `div` com `animate-spin`) e `dashboard: Dashboard | null`.
- Em erro: `console.log(error)` (padrão já usado em `SelectVehicle.tsx` e `VehicleContext.tsx`) e exibir mensagem inline não bloqueante (sem `alert`, pois não é o resultado de uma submissão de formulário).

**Cards sempre exibidos** (não dependem de `energyType`):
- Total gasto — `totalSpent` formatado como moeda BRL (`Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`).
- Custo por km — `costPerKm` formatado como moeda BRL + sufixo "/km".
- Total de abastecimentos — `totalRefuels`.
- Último abastecimento — `lastRefuelDate` formatada em `pt-BR` (`toLocaleDateString('pt-BR')`) + `lastOdometer` formatado com separador de milhar e sufixo "km"; se `lastRefuelDate` for `null`, mostrar "Nenhum abastecimento ainda".

**Card condicional por `energyType`:**
- `COMBUSTION` ou `ELECTRIC`: um card "Consumo médio" com `averageConsumption` (2 casas decimais) + `consumptionUnit`.
- `HYBRID`: em vez do card acima, dois mini-cards lado a lado, "Combustível" e "Elétrico", usando `breakdown.fuel` e `breakdown.electric` respectivamente — cada um mostrando consumo médio, preço médio e total gasto daquele tipo de energia.

## Testes

Não há suíte de testes automatizados configurada no frontend hoje (sem Jest/Vitest configurado). A verificação será manual: rodar `npm run dev`, logar, garantir veículo ativo, e conferir os cards para os três `energyType` (usando dados de teste no backend local, se disponível, ou inspecionando a resposta da API via devtools).

## Fora de escopo (não fazer agora)

- Tela de reset de senha (feature separada, já discutida).
- Header com dados do veículo / botão de trocar veículo.
- Gráficos ou séries históricas.
- Ajuste do fluxo de registro para refletir ativação de conta (`PENDING_ACTIVATION`) — notado durante a exploração do backend, mas fora do escopo deste dashboard.
