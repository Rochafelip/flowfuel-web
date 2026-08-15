# Gráfico de gastos mensais no dashboard

## Contexto

O dashboard hoje responde "quanto gastei este mês / no total?" (via `SpendCarousel` e o gráfico de pizza `SpendingBreakdownChart`), mas não responde "meus gastos estão subindo ou caindo ao longo do tempo?". Não existe hoje nenhum dado agregado por mês vindo do backend — o frontend só carrega os últimos 50 refuels/events crus.

## Objetivo

Adicionar um gráfico de colunas com o gasto total dos últimos 6 meses (incluindo o mês atual), como um card fixo no dashboard, sem virar mais uma fonte de poluição visual.

## Backend (`flowfuel`)

### DTO

Novo record, ao lado de `SpendingCategoryDTO`:

```java
public record MonthlySpendingDTO(String month, BigDecimal amount) {}
```

- `month`: formato `"yyyy-MM"` (ex. `"2026-08"`), independente de locale.
- `amount`: soma de `Refuel.totalAmount` + `VehicleEvent.amount` daquele mês, para o veículo.

`DashboardDTO` ganha um novo campo:

```java
private List<MonthlySpendingDTO> monthlySpending;
```

Populado sempre (nunca `null`) — segue o mesmo padrão de `spendingBreakdown`, que já é embutido no DTO principal em vez de um endpoint separado. Evita um round-trip HTTP extra e mantém consistência com o padrão existente.

### Cálculo (`DashboardService`)

- Gera os últimos 6 meses corridos (incluindo o mês atual), do mais antigo para o mais recente — ex. em agosto/2026: `["2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"]`.
- Busca `refuels` e `vehicle_events` do veículo agregados por mês (mesma estratégia de projeção de repositório usada por `getTotalAmountByVehicleIdGroupedByType`, mas agrupando por ano/mês da data em vez de por tipo).
- Combina os dois totais por chave de mês.
- **Meses sem nenhum gasto entram com `amount = BigDecimal.ZERO`** — a série sempre tem exatamente 6 pontos, sem buracos, pra formar uma linha do tempo contínua.
- Não depende de `costPerKm`/`spendingBreakdown` nem os afeta.

### Autorização

Mesmo padrão do endpoint atual: dado que o campo vive dentro do `DashboardDTO` retornado por `GET /dashboard/vehicle/{vehicleId}`, a checagem de posse (`AuthorizationHelper.ensureOwnsVehicle`) já se aplica automaticamente — nenhuma mudança de segurança necessária.

### Testes

- `DashboardServiceTest`: cobrir agregação com dados em todos os 6 meses, com meses sem nenhum gasto (devem vir com `0`), com refuels e vehicle-events no mesmo mês (devem somar), e com veículo sem nenhum histórico (6 meses, todos zerados).
- `DashboardControllerIntegrationTest`: garantir que `monthlySpending` vem no payload de `GET /dashboard/vehicle/{vehicleId}` com 6 entradas.

## Frontend (`flowfuel-frontend`)

### Tipos

`src/types/Dashboard.ts` ganha:

```ts
export type MonthlySpending = {
  month: string // "yyyy-MM"
  amount: number
}
```

E `Dashboard.monthlySpending: MonthlySpending[]`.

### Componente `MonthlySpendingChart`

Novo arquivo `src/components/ui/MonthlySpendingChart.tsx`, seguindo o mesmo padrão de SVG feito à mão do `SpendingBreakdownChart` (sem lib de gráficos).

- Gráfico de colunas, uma barra por mês (6 barras).
- Espessura de barra ≤ 24px, topo arredondado em 4px, base reta (nasce da baseline).
- Cor única: `fill-green-600 dark:fill-green-500` (mesmo tom do dot ativo do `SpendCarousel` e dos ícones do dashboard) — série única, então sem legenda.
- Gap de 2px entre barras adjacentes.
- Sem eixo/gridlines (redundante num card pequeno).
- Rótulo de mês abaixo de cada barra (abreviação em pt-BR: "Mar", "Abr", ...), derivado do `"yyyy-MM"`.
- Valor em R$ só acima da última barra (mês atual) — as demais barras não têm número visível, mas cada `<rect>` tem um `<title>` (tooltip nativo do SVG) com o valor formatado, then o valor completo fica acessível sem poluir visualmente.
- Altura das barras proporcional ao maior valor da série (normalização local); se todos os 6 meses forem `0`, mostra um estado vazio simples ("Sem gastos nos últimos 6 meses") em vez de 6 barras de altura zero.

### Integração em `Home.tsx`

- Novo `Card` fixo, título "Gastos por mês", posicionado logo abaixo do `SpendCarousel` e antes da grade de métricas (`Consumo médio` / `Preço médio` / `Odômetro` / `Último abastecimento`).
- Renderiza apenas quando `!isFirstUse` (mesmo gate usado por `LastRefuelDetailCard` e `RecentActivityCard`).
- Recebe `dashboard.monthlySpending` diretamente — nenhuma nova chamada de API no frontend.

## Fora de escopo

- Detalhamento por categoria dentro do gráfico mensal (barras empilhadas) — decidido explicitamente como "só total por mês".
- Comparação percentual com o mês anterior nesse gráfico (isso é o item "custo do mês" já coberto por outra ideia, fora desta spec).
- Período configurável (3/12 meses) — fixo em 6 meses por enquanto.
- Qualquer mudança em `spendingBreakdown` ou `costPerKm`.

## Testes (frontend)

Sem infraestrutura de testes automatizados configurada no repo frontend hoje (confirmado durante a implementação do custo por km) — validação via `tsc -b` (typecheck) e verificação em produção após deploy, seguindo a preferência já registrada de checar via deploy em vez de servidor local.
