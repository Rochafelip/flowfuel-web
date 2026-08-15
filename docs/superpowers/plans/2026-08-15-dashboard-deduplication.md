# Dashboard Deduplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the four duplicated pieces of information on the home dashboard (`src/routes/Home.tsx`) without changing any API calls or data shapes.

**Architecture:** All changes are confined to `src/routes/Home.tsx`. The two spend carousels merge into one component with three pages, each optionally showing a breakdown chart. Two `MetricCard`s change their render conditions or are removed outright. The recent-activity feed skips the refuel already shown in the last-refuel detail card.

**Tech Stack:** React 19 + TypeScript, Vite. No test framework is configured in this project (`package.json` has no test script/dependency) — verification is via `npm run build` (`tsc -b && vite build`), which catches type errors and unused-import errors, plus a final deploy for the user to confirm visually in the running app.

**Design reference:** `docs/superpowers/specs/2026-08-15-dashboard-deduplication-design.md`

---

## Task 1: Merge the two spend carousels into one

**Files:**
- Modify: `src/routes/Home.tsx:121-259` (replaces `SpendCarousel` and `SpendingBreakdownCarousel` component definitions with a single merged component)
- Modify: `src/routes/Home.tsx` (state declarations and render call, see steps below)

- [ ] **Step 1: Replace the two carousel component definitions with one merged component**

Replace the entire block from the start of `SpendCarousel` (line 121) through the end of `SpendingBreakdownCarousel` (line 259) with:

```tsx
function SpendCarousel({
  page,
  onPageChange,
  monthlySpent,
  totalSpent,
  totalOverallSpent,
  monthlyBreakdown,
  totalBreakdown,
}: {
  page: number
  onPageChange: (page: number) => void
  monthlySpent: number
  totalSpent: number
  totalOverallSpent: number
  monthlyBreakdown: SpendingCategory[]
  totalBreakdown: SpendingCategory[]
}) {
  const pages: { label: string; value: number; breakdown?: SpendingCategory[] }[] = [
    { label: 'Gasto do mês', value: monthlySpent, breakdown: monthlyBreakdown },
    { label: 'Gasto de combustível', value: totalSpent },
    { label: 'Gastos totais', value: totalOverallSpent, breakdown: totalBreakdown },
  ]

  function goToPage(index: number) {
    onPageChange((index + pages.length) % pages.length)
  }

  const current = pages[page]

  return (
    <Card className="mt-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label={`Ver ${pages[(page - 1 + pages.length) % pages.length].label}`}
          onClick={() => goToPage(page - 1)}
          className="rounded-full p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-400"
        >
          ‹
        </button>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">{current.label}</p>
          <p className="font-mono text-3xl font-bold text-gray-900 dark:text-gray-100">
            {currencyFormatter.format(current.value)}
          </p>
        </div>

        <button
          type="button"
          aria-label={`Ver ${pages[(page + 1) % pages.length].label}`}
          onClick={() => goToPage(page + 1)}
          className="rounded-full p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-400"
        >
          ›
        </button>
      </div>

      {current.breakdown !== undefined && (
        <div className="mt-4">
          {current.breakdown.length === 0 ? (
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">Nenhum gasto neste período.</p>
          ) : (
            <SpendingBreakdownChart data={current.breakdown} />
          )}
        </div>
      )}

      <div className="mt-4 flex justify-center gap-2">
        {pages.map((p, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Ver ${p.label}`}
            onClick={() => goToPage(index)}
            className={`h-2.5 w-2.5 rounded-full ${
              index === page ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>
    </Card>
  )
}
```

- [ ] **Step 2: Remove the `breakdownPage` state**

In the `Home` component, find:

```tsx
  const [spendPage, setSpendPage] = useState(0)
  const [breakdownPage, setBreakdownPage] = useState(0)
```

Replace with:

```tsx
  const [spendPage, setSpendPage] = useState(0)
```

- [ ] **Step 3: Update the `SpendCarousel` render call and remove the standalone `SpendingBreakdownCarousel` render call**

Find:

```tsx
          <SpendCarousel
            page={spendPage}
            onPageChange={setSpendPage}
            monthlySpent={monthlySpent}
            totalSpent={dashboard.totalSpent}
            totalOverallSpent={dashboard.totalOverallSpent}
          />
```

Replace with:

```tsx
          <SpendCarousel
            page={spendPage}
            onPageChange={setSpendPage}
            monthlySpent={monthlySpent}
            totalSpent={dashboard.totalSpent}
            totalOverallSpent={dashboard.totalOverallSpent}
            monthlyBreakdown={monthlySpendingBreakdown}
            totalBreakdown={dashboard.spendingBreakdown}
          />
```

Then find and delete this block entirely (it currently appears after the metric grid / hybrid fuel cards, before `LastRefuelDetailCard`):

```tsx
      {!isFirstUse && (
        <SpendingBreakdownCarousel
          page={breakdownPage}
          onPageChange={setBreakdownPage}
          totalData={dashboard.spendingBreakdown}
          monthlyData={monthlySpendingBreakdown}
        />
      )}

```

- [ ] **Step 4: Run the build to verify**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors (no unused variables, no missing props — `SpendingCategory` is already imported at the top of the file).

- [ ] **Step 5: Commit**

```bash
git add src/routes/Home.tsx
git commit -m "$(cat <<'EOF'
refactor: merge dashboard spend carousels into one

The bare-number carousel and the category-breakdown carousel showed
the same totals twice. One carousel now shows both per page.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Remove the redundant "Último abastecimento" MetricCard

**Files:**
- Modify: `src/routes/Home.tsx` (metric grid + imports)

- [ ] **Step 1: Remove the MetricCard**

Find, inside the 2×2 metric grid:

```tsx
            <MetricCard
              icon="📅"
              label="Último abastecimento"
              value={formatLastRefuelLabel(dashboard.lastRefuelDate)}
            />
```

Delete this block. The `VehicleHeader` subtitle (already rendered above, using `formatLastRefuelSubtitle`) remains the single source for last-refuel recency.

- [ ] **Step 2: Remove the now-unused `formatLastRefuelLabel` import**

Find:

```tsx
import {
  formatLastRefuelSubtitle,
  formatLastRefuelLabel,
  formatActivityDate,
  isDateStringInMonth,
} from '../lib/relativeDate'
```

Replace with:

```tsx
import {
  formatLastRefuelSubtitle,
  formatActivityDate,
  isDateStringInMonth,
} from '../lib/relativeDate'
```

- [ ] **Step 3: Run the build to verify**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Home.tsx
git commit -m "$(cat <<'EOF'
refactor: remove redundant last-refuel metric card

The header subtitle already shows last-refuel recency; this card
repeated the same fact in a second format.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Hide the "Preço médio" MetricCard for hybrid vehicles

**Files:**
- Modify: `src/routes/Home.tsx` (metric grid condition)

- [ ] **Step 1: Add the hybrid exclusion**

Find:

```tsx
            {dashboard.averagePrice !== null && (
              <MetricCard
                icon="💲"
                label="Preço médio"
                value={`${currencyFormatter.format(dashboard.averagePrice)} ${
                  dashboard.priceUnit ?? ''
                }`}
              />
            )}
```

Replace with:

```tsx
            {dashboard.energyType !== 'HYBRID' && dashboard.averagePrice !== null && (
              <MetricCard
                icon="💲"
                label="Preço médio"
                value={`${currencyFormatter.format(dashboard.averagePrice)} ${
                  dashboard.priceUnit ?? ''
                }`}
              />
            )}
```

This mirrors the existing exclusion already applied to the "Consumo médio" card a few lines above it (`dashboard.energyType !== 'HYBRID' && dashboard.averageConsumption !== null`).

- [ ] **Step 2: Run the build to verify**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Home.tsx
git commit -m "$(cat <<'EOF'
fix: hide blended average-price card for hybrid vehicles

FuelMetricsCard already shows average price per energy type for
hybrids; the top-level MetricCard duplicated it. Mirrors the same
exclusion the average-consumption card already had.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Exclude the last refuel from Recent Activity

**Files:**
- Modify: `src/routes/Home.tsx` (recentActivity construction)

- [ ] **Step 1: Skip `refuels[0]` when building the activity feed**

Find:

```tsx
  const recentActivity: ActivityItem[] = [
    ...refuels.slice(0, ACTIVITY_FEED_SIZE).map((refuel) => ({
      id: `refuel-${refuel.id}`,
      date: refuel.refuelDate,
      icon: refuel.refuelType === 'ELECTRIC' ? '🔌' : '⛽',
      title: 'Abastecimento',
      amount: refuel.totalAmount,
    })),
```

Replace with:

```tsx
  const recentActivity: ActivityItem[] = [
    ...refuels.slice(1, 1 + ACTIVITY_FEED_SIZE).map((refuel) => ({
      id: `refuel-${refuel.id}`,
      date: refuel.refuelDate,
      icon: refuel.refuelType === 'ELECTRIC' ? '🔌' : '⛽',
      title: 'Abastecimento',
      amount: refuel.totalAmount,
    })),
```

`refuels[0]` is already shown in full detail by `LastRefuelDetailCard` (rendered right below this carousel); skipping it here avoids showing its amount/date twice. `events` is untouched — there's no separate "last event" card to deduplicate against.

- [ ] **Step 2: Run the build to verify**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Home.tsx
git commit -m "$(cat <<'EOF'
fix: exclude last refuel from recent-activity feed

The most recent refuel already has its own detail card; showing it
again as the top row of Recent Activity repeated its date and amount.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Deploy and confirm

**Files:** none (verification only)

- [ ] **Step 1: Push the branch**

```bash
git push
```

- [ ] **Step 2: Ask the user to confirm in the deployed app**

Once deployed, check on a non-hybrid vehicle:
- Metric grid shows "Consumo médio", "Preço médio", and "Odômetro" (3 cards, no "Último abastecimento").
- Spend carousel has exactly 3 pages, with a breakdown chart on "Gasto do mês" and "Gastos totais" but not on "Gasto de combustível".
- Recent Activity does not repeat the refuel shown in "Último abastecimento" detail card.

And on a hybrid vehicle (if the account has one):
- Metric grid shows only "Odômetro" (no "Consumo médio", no "Preço médio").
- Both `FuelMetricsCard`s (Combustível / Elétrico) still show their own "Preço médio" and "Consumo médio".
