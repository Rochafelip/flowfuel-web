# Dashboard Deduplication Design

## Problem

The dashboard (`src/routes/Home.tsx`) shows the same underlying figures in multiple cards, using different formatting or grouping each time. This forces the user to reconcile numbers that should read as one fact, and makes the screen longer than it needs to be. Four concrete duplications were identified:

1. **Last refuel recency/date** appears three times: `VehicleHeader` subtitle ("Há 3 dias sem abastecer"), the "Último abastecimento" `MetricCard` ("Há 3 dias"), and `LastRefuelDetailCard`'s "Data" field (exact date).
2. **Spend totals** (monthly / fuel / grand total) are shown once as a bare number in `SpendCarousel` and again, broken into categories, in `SpendingBreakdownCarousel` — two separate carousels presenting the same underlying totals.
3. **Average price** ("Preço médio") is shown as a blended top-level `MetricCard` *and* again per energy type in `FuelMetricsCard`, but only for hybrid vehicles. The equivalent "Consumo médio" card already excludes hybrids from the top-level metric — "Preço médio" is inconsistent with that existing rule.
4. **Last refuel amount** appears in both `LastRefuelDetailCard` (dedicated card) and as the top entry of `RecentActivityCard`'s feed, since the most recent refuel is always `refuels[0]`.

## Approach

Surgical fixes: keep the existing card structure and visual language, remove or merge only the pieces that duplicate another card's information. No new navigation, no new API calls — this is purely a matter of which already-available fields render where.

## Changes

### 1. Merge the two spend carousels into one

Replace `SpendCarousel` and `SpendingBreakdownCarousel` with a single carousel component. Three pages, one `spendPage` state (the existing `breakdownPage` state is removed):

| Page | Label | Value | Breakdown chart |
|---|---|---|---|
| 1 | Gasto do mês | `monthlySpent` | `monthlySpendingBreakdown` |
| 2 | Gasto de combustível | `dashboard.totalSpent` | none (single category, no chart) |
| 3 | Gastos totais | `dashboard.totalOverallSpent` | `dashboard.spendingBreakdown` |

Each page renders the number (as `SpendCarousel` does today) and, when breakdown data exists, the `SpendingBreakdownChart` beneath it (as `SpendingBreakdownCarousel` does today). Page 2 has no breakdown data and renders the number only.

### 2. Remove the "Último abastecimento" MetricCard

Drop this card from the 2×2 metric grid. The header subtitle (`formatLastRefuelSubtitle`) remains the single source for "how long since last refuel."

### 3. Hide "Preço médio" MetricCard for hybrid vehicles

Apply the same exclusion the "Consumo médio" card already has: render the top-level "Preço médio" `MetricCard` only when `dashboard.energyType !== 'HYBRID'`. For hybrids, the per-energy-type `FuelMetricsCard`s remain the only source of average price.

### 4. Exclude the last refuel from Recent Activity

`RecentActivityCard`'s feed is built from `refuels.slice(0, ACTIVITY_FEED_SIZE)` merged with events. Change this to `refuels.slice(1, 1 + ACTIVITY_FEED_SIZE)`, skipping the refuel already shown in `LastRefuelDetailCard` (`refuels[0]`). Events are unaffected — there's no dedicated "last event" card to deduplicate against.

## What stays as-is

- `VehicleHeader` subtitle — sole source of relative recency.
- `LastRefuelDetailCard` — sole source of the last refuel's exact date, amount, and price/unit.
- `FuelMetricsCard` — sole source of per-energy-type averages for hybrids.
- No changes to data fetching, types, or the `/dashboard/vehicle/:id` API contract.

## Testing

- Non-hybrid vehicle: verify "Preço médio" still renders in the metric grid, "Consumo médio" still excluded per existing rule.
- Hybrid vehicle: verify "Preço médio" is now hidden from the metric grid, still present in both `FuelMetricsCard`s.
- Verify the unified spend carousel cycles through all 3 pages correctly, with the breakdown chart present on pages 1 and 3 and absent on page 2.
- Verify Recent Activity no longer shows the same refuel as `LastRefuelDetailCard`, and correctly falls back to fewer/zero items when there are fewer than `ACTIVITY_FEED_SIZE + 1` refuels.
- Verify empty/first-use state (`isFirstUse`) is unaffected.
