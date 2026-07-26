# Refuel Flow — Design

## Goal

Make the already-built Refuel screens (`Refuels.tsx`, `RefuelForm.tsx`) reachable from the app, and improve `RefuelForm` with two input-mode toggles: Odômetro/Trip (distance) and Preço por litro/Valor total (price), so users can enter data the way they naturally think about it instead of always doing the math themselves.

## Scope

In scope:
- `src/App.tsx` — wire `/refuels`, `/refuels/new`, `/refuels/:id/edit` routes (components already exist and already use the shared green UI primitives, per an earlier commit — no visual retrofit needed there).
- `src/routes/Home.tsx` — add a "Novo Abastecimento" button and a "Ver histórico" link.
- `src/routes/RefuelForm.tsx` — add the two toggles.
- New: `src/components/ui/SegmentedToggle.tsx` (shared two-option toggle, used by both).

Out of scope:
- `VehicleEvents.tsx` / `VehicleEventForm.tsx` — already have routes-less same situation, but not part of this request.
- Backend changes — `RefuelRequestDTO` (confirmed by reading the backend source) only accepts absolute `odometer` (Integer) and `pricePerUnit` (BigDecimal); both toggles are purely frontend conveniences that compute the values the existing contract already expects. No backend or API-shape changes.

## 1. Routing + Dashboard entry points

`App.tsx`: add inside the existing `<Route element={<ProtectedRoute />}>` block:
```tsx
<Route path="/refuels" element={<Refuels />} />
<Route path="/refuels/new" element={<RefuelForm />} />
<Route path="/refuels/:id/edit" element={<RefuelForm />} />
```

`Home.tsx`: after the existing dashboard cards (and the hybrid breakdown, if present), add:
- `Button` "Novo Abastecimento" → `navigate('/refuels/new')`
- A secondary text link "Ver histórico de abastecimentos" (`text-green-700`, same style as other secondary links) → `navigate('/refuels')`

## 2. `SegmentedToggle` component

`src/components/ui/SegmentedToggle.tsx` — generic two-option pill toggle:
```tsx
function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
})
```
Renders a `flex` row of buttons inside a bordered container; the active option gets `bg-green-600 text-white`, inactive gets `text-gray-600`. Used twice in `RefuelForm` (distance mode, price mode).

## 3. Distance toggle (Odômetro / Trip)

Only shown when creating a new refuel (`!isEditing`) — editing an existing refuel keeps the plain absolute-odometer field, since recomputing a trip baseline that excludes the refuel being edited adds real complexity for a rare edit-time case; direct odometer entry is simpler and already correct there.

**Baseline:** on mount (new-refuel only), fetch `GET /dashboard/vehicle/{activeVehicle.id}` and read `lastOdometer`. If the request fails or `lastOdometer` is `null` (no refuels yet), fall back to `activeVehicle.currentKm` (always present — required at vehicle creation). This fetch has no visible error state: it degrades silently to the vehicle's registered km, which is always a valid baseline.

**UI:**
- Toggle: "Odômetro" (default) / "Trip"
- Odômetro mode: existing numeric field, unchanged (labelled "Odômetro (km)").
- Trip mode: numeric field "Km rodados desde o último abastecimento", with helper text under it showing the baseline, e.g. "A partir de 32.450 km".

**On submit:** `odometer = distanceMode === 'trip' ? baseline + parseInt(tripKm) : parseInt(odometer)`.

## 4. Price toggle (Preço por litro / Valor total)

Available in both create and edit (no baseline dependency, so no reason to restrict it).

**UI:**
- Toggle: "Preço por litro" (default) / "Valor total"
- Preço por litro mode: existing field, unchanged.
- Valor total mode: numeric field "Valor total pago", with helper text showing the computed price/unit once `energyAmount` is also filled, e.g. "R$ 5,89/L".

**On submit:** `pricePerUnit = priceMode === 'total' ? parseFloat(totalValue) / parseFloat(energyAmount) : parseFloat(pricePerUnit)`.

When editing an existing refuel, `RefuelForm` loads the stored `pricePerUnit` — the price toggle defaults to "Preço por litro" pre-filled with that value (no reverse-computation into a total on load; the user can switch to "Valor total" and retype if they prefer, same as any fresh entry).

## Testing

- `npm run build` after each file change.
- Manual: from a fresh account with a vehicle and no refuels, click "Novo Abastecimento" from the Dashboard, confirm Trip mode shows the vehicle's registered km as baseline (no refuels yet), submit, confirm it appears correctly in `/refuels` and updates the Dashboard. Create a second refuel using Trip mode and confirm the baseline is now the first refuel's odometer. Test the price toggle with "Valor total" and confirm the created refuel's stored `pricePerUnit` matches `total / liters`. Test editing an existing refuel.
- Redeploy to Render (existing pipeline) for on-device verification.
