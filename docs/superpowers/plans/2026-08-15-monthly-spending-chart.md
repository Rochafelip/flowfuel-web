# Gráfico de Gastos Mensais Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar ao dashboard um gráfico de colunas mostrando o gasto total (combustível + eventos) dos últimos 6 meses, alimentado por um novo campo `monthlySpending` embutido no `DashboardDTO` já existente.

**Architecture:** Backend (`flowfuel`, Spring Boot) calcula os últimos 6 meses corridos somando `Refuel.totalAmount` e `VehicleEvent.amount` por mês, reaproveitando o método `RefuelRepository.getMonthlySpent` que já existe e adicionando o equivalente em `VehicleEventRepository`. O resultado (`List<MonthlySpendingDTO>`, sempre 6 entradas, meses sem gasto com `amount = 0`) entra no `DashboardDTO` que a rota `GET /dashboard/vehicle/{vehicleId}` já retorna — nenhum endpoint novo. Frontend (`flowfuel-frontend`, React) ganha um componente `MonthlySpendingChart` (barras em CSS/Tailwind, sem lib de gráficos) renderizado num novo `Card` fixo em `Home.tsx`, logo abaixo do `SpendCarousel`.

**Tech Stack:** Java 21 + Spring Boot + Spring Data JPA + JUnit 5 + Mockito + AssertJ (backend); React + TypeScript + Tailwind (frontend).

Spec: `docs/superpowers/specs/2026-08-15-monthly-spending-chart-design.md`

---

## Backend (`/home/rocha/Projetos/flowfuel`)

### Task 1: `MonthlySpendingDTO`

**Files:**
- Create: `/home/rocha/Projetos/flowfuel/src/main/java/com/devappmobile/flowfuel/dashboard/MonthlySpendingDTO.java`

- [ ] **Step 1: Create the DTO record**

```java
package com.devappmobile.flowfuel.dashboard;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

@Schema(description = "Gasto total (combustível + eventos) de um mês específico, usado no "
        + "gráfico de gastos mensais. `month` no formato ISO 'yyyy-MM' (ex. '2026-08').")
public record MonthlySpendingDTO(String month, BigDecimal amount) {}
```

- [ ] **Step 2: Compile to confirm no errors**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw compile -q`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel
git add src/main/java/com/devappmobile/flowfuel/dashboard/MonthlySpendingDTO.java
git commit -m "feat: add MonthlySpendingDTO record"
```

---

### Task 2: Add `monthlySpending` field to `DashboardDTO`

**Files:**
- Modify: `/home/rocha/Projetos/flowfuel/src/main/java/com/devappmobile/flowfuel/dashboard/DashboardDTO.java:37-42`

- [ ] **Step 1: Add the field, right after `spendingBreakdown`**

In `DashboardDTO.java`, replace:

```java
    @Schema(description = "Composição de gastos por categoria (top 5 + 'OTHER' agregando o resto), "
            + "histórico completo, usada no gráfico de rosca. Vazio se não houver nenhum gasto.")
    private List<SpendingCategoryDTO> spendingBreakdown;

    @Schema(description = "Custo médio por km rodado (R$/km), considerando todos os abastecimentos "
            + "(cheios ou parciais). Sempre presente, inclusive em HYBRID (combina combustível e elétrico).",
            example = "0.42")
    private BigDecimal costPerKm;
```

with:

```java
    @Schema(description = "Composição de gastos por categoria (top 5 + 'OTHER' agregando o resto), "
            + "histórico completo, usada no gráfico de rosca. Vazio se não houver nenhum gasto.")
    private List<SpendingCategoryDTO> spendingBreakdown;

    @Schema(description = "Gasto total (combustível + eventos) dos últimos 6 meses corridos, "
            + "incluindo o mês atual, usado no gráfico de gastos mensais. Sempre 6 entradas, "
            + "ordenadas do mês mais antigo para o mais recente; meses sem gasto vêm com amount 0.")
    private List<MonthlySpendingDTO> monthlySpending;

    @Schema(description = "Custo médio por km rodado (R$/km), considerando todos os abastecimentos "
            + "(cheios ou parciais). Sempre presente, inclusive em HYBRID (combina combustível e elétrico).",
            example = "0.42")
    private BigDecimal costPerKm;
```

- [ ] **Step 2: Compile to confirm no errors**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw compile -q`
Expected: no output, exit code 0. (The field is unpopulated so far — `builder.monthlySpending(...)` is never called yet, meaning `getMonthlySpending()` returns `null` at runtime for now. That's fixed in Task 4.)

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel
git add src/main/java/com/devappmobile/flowfuel/dashboard/DashboardDTO.java
git commit -m "feat: add monthlySpending field to DashboardDTO"
```

---

### Task 3: `VehicleEventRepository.getMonthlySpent`

**Files:**
- Modify: `/home/rocha/Projetos/flowfuel/src/main/java/com/devappmobile/flowfuel/vehicleevent/VehicleEventRepository.java`

- [ ] **Step 1: Add the query method**

In `VehicleEventRepository.java`, right after the `getTotalAmountByVehicleId` method (line 19), add:

```java
    @Query("""
                SELECT SUM(e.amount)
                FROM VehicleEvent e
                WHERE e.vehicle.id = :vehicleId
                AND MONTH(e.eventDate) = :month
                AND YEAR(e.eventDate) = :year
            """)
    Optional<BigDecimal> getMonthlySpent(
            @Param("vehicleId") Long vehicleId,
            @Param("month") int month,
            @Param("year") int year);
```

This mirrors `RefuelRepository.getMonthlySpent` (`RefuelRepository.java:75-85`), which already exists and does the same thing for refuels.

- [ ] **Step 2: Compile to confirm no errors**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw compile -q`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel
git add src/main/java/com/devappmobile/flowfuel/vehicleevent/VehicleEventRepository.java
git commit -m "feat: add getMonthlySpent query to VehicleEventRepository"
```

---

### Task 4: `DashboardService.buildMonthlySpending` (TDD)

**Files:**
- Modify: `/home/rocha/Projetos/flowfuel/src/main/java/com/devappmobile/flowfuel/dashboard/DashboardService.java`
- Modify: `/home/rocha/Projetos/flowfuel/src/test/java/com/devappmobile/flowfuel/dashboard/DashboardServiceTest.java`

- [ ] **Step 1: Add `import java.time.YearMonth;` to `DashboardServiceTest.java`**

In `DashboardServiceTest.java`, the import block currently has `import java.time.LocalDateTime;` (line 24). Add right after it:

```java
import java.time.YearMonth;
```

- [ ] **Step 2: Write the failing test**

Add this test method to `DashboardServiceTest.java`, after `getVehicleDashboard_comAbastecimentos_retornaTotaisCorretos` (after line 114):

```java
    @Test
    void getVehicleDashboard_retornaGastosMensaisDosUltimos6Meses() {
        when(vehicleRepository.findById(10L)).thenReturn(Optional.of(vehicle));
        when(refuelRepository.countByVehicleId(10L)).thenReturn(0L);
        when(refuelRepository.findTopByVehicleIdOrderByRefuelDateDesc(10L)).thenReturn(Optional.empty());
        when(refuelRepository.findFullTankRefuelsByVehicleId(10L)).thenReturn(List.of());

        YearMonth currentMonth = YearMonth.now();
        when(refuelRepository.getMonthlySpent(10L, currentMonth.getMonthValue(), currentMonth.getYear()))
                .thenReturn(Optional.of(BigDecimal.valueOf(303.30)));

        YearMonth previousMonth = currentMonth.minusMonths(1);
        when(vehicleEventRepository.getMonthlySpent(10L, previousMonth.getMonthValue(), previousMonth.getYear()))
                .thenReturn(Optional.of(BigDecimal.valueOf(150.00)));

        DashboardDTO body = dashboardService.getVehicleDashboard(owner, 10L);

        assertThat(body.getMonthlySpending()).hasSize(6);
        assertThat(body.getMonthlySpending().get(5).month()).isEqualTo(currentMonth.toString());
        assertThat(body.getMonthlySpending().get(5).amount()).isEqualByComparingTo(BigDecimal.valueOf(303.30));
        assertThat(body.getMonthlySpending().get(4).month()).isEqualTo(previousMonth.toString());
        assertThat(body.getMonthlySpending().get(4).amount()).isEqualByComparingTo(BigDecimal.valueOf(150.00));
        assertThat(body.getMonthlySpending().get(0).amount()).isEqualByComparingTo(BigDecimal.ZERO);
    }
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw test -Dtest=DashboardServiceTest#getVehicleDashboard_retornaGastosMensaisDosUltimos6Meses`
Expected: FAIL — `body.getMonthlySpending()` is `null` (NullPointerException from `.hasSize(6)`, or an AssertJ "expected not to be null" failure).

- [ ] **Step 4: Implement `buildMonthlySpending` and wire it in**

In `DashboardService.java`, add the import (next to the other `java.time` import):

```java
import java.time.YearMonth;
```

Add a constant next to `TOP_SPENDING_CATEGORIES` (line 37):

```java
    private static final int MONTHLY_SPENDING_MONTHS = 6;
```

In `buildDashboard` (line 46), right after the `spendingBreakdown` line (line 59: `List<SpendingCategoryDTO> spendingBreakdown = buildSpendingBreakdown(totalSpent, vehicleId);`), add:

```java
        List<MonthlySpendingDTO> monthlySpending = buildMonthlySpending(vehicleId);
```

Then in the builder chain (line 75-84), add `.monthlySpending(monthlySpending)` right after `.spendingBreakdown(spendingBreakdown)`:

```java
        DashboardDTO.DashboardDTOBuilder builder = DashboardDTO.builder()
                .vehicleId(vehicleId)
                .energyType(vehicle.getEnergyType())
                .totalRefuels(totalRefuels)
                .totalSpent(totalSpent)
                .totalOverallSpent(totalOverallSpent)
                .spendingBreakdown(spendingBreakdown)
                .monthlySpending(monthlySpending)
                .costPerKm(costPerKm)
                .lastRefuelDate(lastRefuelDate)
                .lastOdometer(lastOdometer);
```

Finally, add the new private method, right after `buildSpendingBreakdown` (after line 153, before `buildHybridBreakdown`):

```java
    /**
     * Gasto total (combustível + eventos) dos últimos {@value #MONTHLY_SPENDING_MONTHS}
     * meses corridos, incluindo o mês atual, do mais antigo para o mais recente.
     * Meses sem nenhum gasto entram com {@code BigDecimal.ZERO} — a série sempre
     * tem exatamente {@value #MONTHLY_SPENDING_MONTHS} pontos, sem buracos.
     */
    private List<MonthlySpendingDTO> buildMonthlySpending(Long vehicleId) {
        List<MonthlySpendingDTO> result = new ArrayList<>();
        YearMonth currentMonth = YearMonth.now();

        for (int i = MONTHLY_SPENDING_MONTHS - 1; i >= 0; i--) {
            YearMonth yearMonth = currentMonth.minusMonths(i);

            BigDecimal refuelsAmount = refuelRepository
                    .getMonthlySpent(vehicleId, yearMonth.getMonthValue(), yearMonth.getYear())
                    .orElse(BigDecimal.ZERO);
            BigDecimal eventsAmount = vehicleEventRepository
                    .getMonthlySpent(vehicleId, yearMonth.getMonthValue(), yearMonth.getYear())
                    .orElse(BigDecimal.ZERO);

            result.add(new MonthlySpendingDTO(yearMonth.toString(), refuelsAmount.add(eventsAmount)));
        }

        return result;
    }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw test -Dtest=DashboardServiceTest#getVehicleDashboard_retornaGastosMensaisDosUltimos6Meses`
Expected: PASS.

- [ ] **Step 6: Run the full `DashboardServiceTest` suite to check for regressions**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw test -Dtest=DashboardServiceTest`
Expected: all tests PASS (existing tests don't stub `getMonthlySpent`, so it returns `Optional.empty()` by Mockito's default `Optional` handling — meaning `amount` is `BigDecimal.ZERO` for every month in those tests. That doesn't break any existing assertion, since none of them assert on `monthlySpending`).

- [ ] **Step 7: Commit**

```bash
cd /home/rocha/Projetos/flowfuel
git add src/main/java/com/devappmobile/flowfuel/dashboard/DashboardService.java \
        src/test/java/com/devappmobile/flowfuel/dashboard/DashboardServiceTest.java
git commit -m "feat: compute monthlySpending in DashboardService"
```

---

### Task 5: Controller integration test

**Files:**
- Modify: `/home/rocha/Projetos/flowfuel/src/test/java/com/devappmobile/flowfuel/dashboard/DashboardControllerIntegrationTest.java`

- [ ] **Step 1: Write the test**

Add this test method to `DashboardControllerIntegrationTest.java`, after `getDashboard_veiculoDoProprioUsuario_retornaMetricas` (after line 104):

```java
    @Test
    void getDashboard_retornaGastosMensaisComSeisEntradas() throws Exception {
        String token = obterToken("monthly@test.com");
        long vehicleId = criarVeiculo(token);
        criarAbastecimento(token, vehicleId, 50500);

        mockMvc.perform(get("/api/v1/dashboard/vehicle/{id}", vehicleId)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.monthlySpending.length()").value(6))
                .andExpect(jsonPath("$.monthlySpending[5].amount").isNumber())
                .andExpect(jsonPath("$.monthlySpending[5].amount").value(org.hamcrest.Matchers.greaterThan(0.0)))
                .andExpect(jsonPath("$.monthlySpending[0].month").isString());
    }
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw test -Dtest=DashboardControllerIntegrationTest#getDashboard_retornaGastosMensaisComSeisEntradas`
Expected: PASS. (This exercises the real repository queries end-to-end, so it also validates the JPQL in Task 3/4 against the real schema — if there's a query syntax problem, it surfaces here even though the mocked service test in Task 4 already passed.)

- [ ] **Step 3: Run the full test suite for the `dashboard` package to check for regressions**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw test -Dtest=com.devappmobile.flowfuel.dashboard.*`
Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
cd /home/rocha/Projetos/flowfuel
git add src/test/java/com/devappmobile/flowfuel/dashboard/DashboardControllerIntegrationTest.java
git commit -m "test: assert monthlySpending in dashboard integration test"
```

---

## Frontend (`/home/rocha/Projetos/flowfuel-frontend`)

### Task 6: `MonthlySpending` type

**Files:**
- Modify: `src/types/Dashboard.ts`

- [ ] **Step 1: Add the type and field**

In `Dashboard.ts`, replace:

```ts
export type SpendingCategory = {
  category: string
  amount: number
}
```

with:

```ts
export type SpendingCategory = {
  category: string
  amount: number
}

export type MonthlySpending = {
  month: string
  amount: number
}
```

Then, in the `Dashboard` type, add the field right after `spendingBreakdown: SpendingCategory[]`:

```ts
  spendingBreakdown: SpendingCategory[]
  monthlySpending: MonthlySpending[]
```

- [ ] **Step 2: Commit**

```bash
git add src/types/Dashboard.ts
git commit -m "feat: add MonthlySpending type to Dashboard"
```

---

### Task 7: `MonthlySpendingChart` component

**Files:**
- Create: `src/components/ui/MonthlySpendingChart.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { MonthlySpending } from '../../types/Dashboard'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const MONTH_LABELS = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

function monthLabel(month: string): string {
  const monthNumber = Number(month.split('-')[1])
  return MONTH_LABELS[monthNumber - 1] ?? month
}

const BAR_AREA_HEIGHT = 96
const MIN_BAR_HEIGHT_PCT = 4

export function MonthlySpendingChart({ data }: { data: MonthlySpending[] }) {
  const hasSpending = data.some((entry) => entry.amount > 0)

  if (!hasSpending) {
    return (
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        Sem gastos nos últimos 6 meses.
      </p>
    )
  }

  const maxAmount = Math.max(...data.map((entry) => entry.amount))
  const lastIndex = data.length - 1

  return (
    <div className="flex items-end justify-between gap-2">
      {data.map((entry, index) => {
        const heightPct =
          entry.amount > 0 ? Math.max((entry.amount / maxAmount) * 100, MIN_BAR_HEIGHT_PCT) : 0

        return (
          <div key={entry.month} className="flex flex-1 flex-col items-center gap-1">
            <span
              className={`font-mono text-xs font-bold text-gray-900 dark:text-gray-100 ${
                index === lastIndex ? '' : 'invisible'
              }`}
            >
              {currencyFormatter.format(entry.amount)}
            </span>

            <div
              className="flex w-full items-end justify-center"
              style={{ height: BAR_AREA_HEIGHT }}
              title={currencyFormatter.format(entry.amount)}
            >
              <div
                className="w-full max-w-[24px] rounded-t bg-green-600 dark:bg-green-500"
                style={{ height: `${heightPct}%` }}
              />
            </div>

            <span className="text-xs text-gray-500 dark:text-gray-400">{monthLabel(entry.month)}</span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no output, exit code 0. (The component isn't imported anywhere yet, so this only confirms the file itself is valid — Task 8 wires it in.)

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/MonthlySpendingChart.tsx
git commit -m "feat: add MonthlySpendingChart component"
```

---

### Task 8: Integrate into `Home.tsx`

**Files:**
- Modify: `src/routes/Home.tsx`

- [ ] **Step 1: Import the chart component**

In `Home.tsx`, right after the `SpendingBreakdownChart` import (line 17):

```tsx
import { SpendingBreakdownChart } from '../components/ui/SpendingBreakdownChart'
import { MonthlySpendingChart } from '../components/ui/MonthlySpendingChart'
```

- [ ] **Step 2: Add the `MonthlySpendingCard` component**

Add this right after the `SpendCarousel` function closes (after line 194, before `LastRefuelDetailCard`):

```tsx
function MonthlySpendingCard({ data }: { data: MonthlySpending[] }) {
  return (
    <Card className="mt-6">
      <p className="mb-4 text-sm font-bold text-gray-700 dark:text-gray-300">Gastos por mês</p>
      <MonthlySpendingChart data={data} />
    </Card>
  )
}
```

Add `MonthlySpending` to the existing type import (line 5):

```tsx
import type { Dashboard, FuelMetrics, MonthlySpending, SpendingCategory } from '../types/Dashboard'
```

- [ ] **Step 3: Render it below the carousel**

In the `Home` component's return, right after the `SpendCarousel` element closes (after line 397, before the metrics grid `<div className="mt-6 grid grid-cols-2 gap-3">`), add:

```tsx
          <MonthlySpendingCard data={dashboard.monthlySpending} />

          <div className="mt-6 grid grid-cols-2 gap-3">
```

(Replacing just the opening of that `<div>` line — the rest of the grid block is unchanged.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc -b`
Expected: no output, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/routes/Home.tsx
git commit -m "feat: show monthly spending chart on dashboard"
```

---

### Task 9: Push

- [ ] **Step 1: Push frontend commits**

```bash
git push
```

- [ ] **Step 2: Push backend commits**

```bash
cd /home/rocha/Projetos/flowfuel && git push
```
