# Localização do posto no abastecimento (frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user pick a nearby station when logging a refuel (via a modal dialog, reusing the existing nearby-stations search) and see it on the refuel's card in the list.

**Architecture:** Extract the geolocation/fetch state machine currently inline in `Stations.tsx` into a reusable `useNearbyStations` hook (generic — no type filtering, no distance-band logic baked in, both stay as derived filters in each consumer, exactly like today). Build a new `StationPickerDialog` on top of it, wire it into `RefuelForm`, and add optional station fields to the `Refuel` type and the list card.

**Tech Stack:** React 19, TypeScript (strict), Tailwind CSS, React Router 7. No test framework in this repo — verification is `npx tsc -b` after each task and `npm run build` at the end. Depends on the backend plan (`docs/superpowers/plans/2026-08-14-refuel-station-location.md` in the `flowfuel` repo) being deployed first so `POST/PUT /refuels` accepts/returns the new fields.

---

## File Structure

- Modify `src/types/Refuel.ts` — 4 new optional fields on `Refuel` and `RefuelRequest`.
- Create `src/hooks/useNearbyStations.ts` — geolocation + fetch state machine, extracted from `Stations.tsx`.
- Modify `src/routes/Stations.tsx` — consumes the hook instead of its inline logic; band/type filtering becomes a derived value in the component (same behavior as today).
- Create `src/components/ui/StationPickerDialog.tsx` — modal for picking a station, used only by `RefuelForm`.
- Modify `src/routes/RefuelForm.tsx` — "Adicionar posto" button, selected-station chip, station fields in the submitted request.
- Modify `src/routes/Refuels.tsx` — shows the saved station (and a "Ver no mapa" link when coordinates exist) on each list card.

---

### Task 1: `Refuel.ts` — add station fields

**Files:**
- Modify: `src/types/Refuel.ts`

- [ ] **Step 1: Replace the file**

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
  stationName: string | null
  stationAddress: string | null
  stationLatitude: number | null
  stationLongitude: number | null
}

export type RefuelRequest = {
  vehicleId: number
  odometer: number
  energyAmount: number
  pricePerUnit: number
  fullTank: boolean
  refuelType: RefuelType | null
  stationName: string | null
  stationAddress: string | null
  stationLatitude: number | null
  stationLongitude: number | null
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc -b`
Expected: errors in `src/routes/RefuelForm.tsx` (the `RefuelRequest` object literal built in `handleSubmit` is now missing the 4 new required fields) — this is expected and gets fixed in Task 5. Confirm the errors are exactly there and nowhere else surprising.

- [ ] **Step 3: Commit**

```bash
git add src/types/Refuel.ts
git commit -m "feat(types): add station snapshot fields to Refuel"
```

---

### Task 2: `useNearbyStations.ts` — extract the geolocation/fetch hook

**Files:**
- Create: `src/hooks/useNearbyStations.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useCallback, useEffect, useState } from 'react'
import { getNearbyStations } from '../services/stations'
import type { Station } from '../types/Station'

interface Coordinates {
  lat: number
  lng: number
}

export type NearbyStationsState =
  | { status: 'loading' }
  | { status: 'success'; stations: Station[] }
  | { status: 'error' }
  | { status: 'permission-denied' }
  | { status: 'location-unavailable' }

export function useNearbyStations(radiusMeters: number) {
  const [state, setState] = useState<NearbyStationsState>({ status: 'loading' })
  const [location, setLocation] = useState<Coordinates | null>(null)

  const fetchStations = useCallback(async (coords: Coordinates, radius: number) => {
    setState({ status: 'loading' })
    try {
      const stations = await getNearbyStations(coords.lat, coords.lng, radius)
      setState({ status: 'success', stations })
    } catch (err) {
      console.log(err)
      setState({ status: 'error' })
    }
  }, [])

  const requestLocation = useCallback(() => {
    setState({ status: 'loading' })
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude }
        setLocation(coords)
        fetchStations(coords, radiusMeters)
      },
      (error) => {
        setState(
          error.code === error.PERMISSION_DENIED
            ? { status: 'permission-denied' }
            : { status: 'location-unavailable' }
        )
      },
      { timeout: 10_000 }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStations])

  useEffect(() => {
    requestLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function retry() {
    if (location) {
      fetchStations(location, radiusMeters)
    } else {
      requestLocation()
    }
  }

  function refetchAtRadius(radius: number) {
    if (location) fetchStations(location, radius)
  }

  return { state, retry, refetchAtRadius }
}
```

This hook is deliberately generic: it fetches every station type within a radius and does no distance-band filtering. `Stations.tsx` (Task 3) applies both filters itself as derived values, exactly reproducing its current behavior. `StationPickerDialog` (Task 4) applies its own simpler type filter with no band.

- [ ] **Step 2: Type check**

Run: `npx tsc -b`
Expected: same pre-existing errors from Task 1 in `RefuelForm.tsx`, nothing new from this file.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useNearbyStations.ts
git commit -m "feat(hooks): extract useNearbyStations from Stations.tsx"
```

---

### Task 3: `Stations.tsx` — consume the hook

**Files:**
- Modify: `src/routes/Stations.tsx`

- [ ] **Step 1: Replace the imports and component body up to the JSX return**

Find:

```tsx
import { useCallback, useEffect, useState } from 'react'
import { useVehicle } from '../context/VehicleContext'
import { getNearbyStations } from '../services/stations'
import {
  STATION_TYPE_ICONS,
  STATION_TYPE_LABELS,
  type Station,
  type StationType,
} from '../types/Station'
import {
  DEFAULT_STATION_RADIUS_METERS,
  STATION_RADIUS_PRESETS_METERS,
  formatRadiusLabel,
  formatRating,
  formatStationAddress,
  formatStationDistance,
  stationDistanceBand,
} from '../lib/stationDistanceBand'
import { Screen } from '../components/ui/Screen'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { Button } from '../components/ui/Button'
import { SegmentedToggle } from '../components/ui/SegmentedToggle'

interface Coordinates {
  lat: number
  lng: number
}

type ViewState =
  | { status: 'loading' }
  | { status: 'success'; stations: Station[] }
  | { status: 'error' }
  | { status: 'permission-denied' }
  | { status: 'location-unavailable' }

export function Stations() {
  const { activeVehicle } = useVehicle()
  const [location, setLocation] = useState<Coordinates | null>(null)
  const [radiusMeters, setRadiusMeters] = useState(DEFAULT_STATION_RADIUS_METERS)
  const [selectedType, setSelectedType] = useState<StationType>('FUEL')
  const [typePreselected, setTypePreselected] = useState(false)
  const [state, setState] = useState<ViewState>({ status: 'loading' })

  useEffect(() => {
    if (typePreselected || !activeVehicle) return
    setSelectedType(activeVehicle.energyType === 'ELECTRIC' ? 'ELECTRIC' : 'FUEL')
    setTypePreselected(true)
  }, [activeVehicle, typePreselected])

  const fetchStations = useCallback(async (coords: Coordinates, preset: number) => {
    setState({ status: 'loading' })
    try {
      const band = stationDistanceBand(preset)
      const stations = await getNearbyStations(coords.lat, coords.lng, band.maxMeters)
      const filtered = stations.filter((station) => station.distanceMeters >= band.minMeters)
      setState({ status: 'success', stations: filtered })
    } catch (err) {
      console.log(err)
      setState({ status: 'error' })
    }
  }, [])

  const requestLocation = useCallback(() => {
    setState({ status: 'loading' })
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude }
        setLocation(coords)
        fetchStations(coords, radiusMeters)
      },
      (error) => {
        setState(
          error.code === error.PERMISSION_DENIED
            ? { status: 'permission-denied' }
            : { status: 'location-unavailable' }
        )
      },
      { timeout: 10_000 }
    )
  }, [fetchStations, radiusMeters])

  useEffect(() => {
    requestLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleRadiusSelect(newRadius: number) {
    setRadiusMeters(newRadius)
    if (location) fetchStations(location, newRadius)
  }

  function handleRetry() {
    if (location) {
      fetchStations(location, radiusMeters)
    } else {
      requestLocation()
    }
  }

  const filteredStations =
    state.status === 'success' ? state.stations.filter((station) => station.type === selectedType) : []
```

Replace with:

```tsx
import { useEffect, useState } from 'react'
import { useVehicle } from '../context/VehicleContext'
import { useNearbyStations } from '../hooks/useNearbyStations'
import {
  STATION_TYPE_ICONS,
  STATION_TYPE_LABELS,
  type StationType,
} from '../types/Station'
import {
  DEFAULT_STATION_RADIUS_METERS,
  STATION_RADIUS_PRESETS_METERS,
  formatRadiusLabel,
  formatRating,
  formatStationAddress,
  formatStationDistance,
  stationDistanceBand,
} from '../lib/stationDistanceBand'
import { Screen } from '../components/ui/Screen'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { Button } from '../components/ui/Button'
import { SegmentedToggle } from '../components/ui/SegmentedToggle'

export function Stations() {
  const { activeVehicle } = useVehicle()
  const [radiusMeters, setRadiusMeters] = useState(DEFAULT_STATION_RADIUS_METERS)
  const [selectedType, setSelectedType] = useState<StationType>('FUEL')
  const [typePreselected, setTypePreselected] = useState(false)
  const { state, retry, refetchAtRadius } = useNearbyStations(
    stationDistanceBand(DEFAULT_STATION_RADIUS_METERS).maxMeters
  )

  useEffect(() => {
    if (typePreselected || !activeVehicle) return
    setSelectedType(activeVehicle.energyType === 'ELECTRIC' ? 'ELECTRIC' : 'FUEL')
    setTypePreselected(true)
  }, [activeVehicle, typePreselected])

  function handleRadiusSelect(newRadius: number) {
    setRadiusMeters(newRadius)
    refetchAtRadius(stationDistanceBand(newRadius).maxMeters)
  }

  const band = stationDistanceBand(radiusMeters)
  const filteredStations =
    state.status === 'success'
      ? state.stations.filter(
          (station) => station.type === selectedType && station.distanceMeters >= band.minMeters
        )
      : []
```

- [ ] **Step 2: Fix the two remaining `handleRetry` call sites**

Find (there are two occurrences — one in the error state block, one in the "no stations in this band" block):

```tsx
          <Button fullWidth={false} onClick={handleRetry}>
```

Replace **both** with:

```tsx
          <Button fullWidth={false} onClick={retry}>
```

- [ ] **Step 3: Type check**

Run: `npx tsc -b`
Expected: same pre-existing `RefuelForm.tsx` errors from Task 1, nothing from `Stations.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Stations.tsx
git commit -m "refactor(stations): consume useNearbyStations hook"
```

---

### Task 4: `StationPickerDialog.tsx` — new modal

**Files:**
- Create: `src/components/ui/StationPickerDialog.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useNearbyStations } from '../../hooks/useNearbyStations'
import {
  DEFAULT_STATION_RADIUS_METERS,
  formatStationAddress,
  formatStationDistance,
} from '../../lib/stationDistanceBand'
import type { Station, StationType } from '../../types/Station'
import { Button } from './Button'
import { Spinner } from './Spinner'

export function StationPickerDialog({
  type,
  onSelect,
  onDismiss,
}: {
  type: StationType
  onSelect: (station: Station) => void
  onDismiss: () => void
}) {
  const { state, retry } = useNearbyStations(DEFAULT_STATION_RADIUS_METERS)

  const stations =
    state.status === 'success'
      ? [...state.stations]
          .filter((station) => station.type === type)
          .sort((a, b) => a.distanceMeters - b.distanceMeters)
      : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onDismiss} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Escolher posto"
        className="relative flex max-h-[80vh] w-full max-w-sm flex-col rounded-xl bg-white p-6 shadow-lg"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-bold text-gray-900">Escolher posto</p>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-gray-700 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            ✕
          </button>
        </div>

        {state.status === 'loading' && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}

        {(state.status === 'error' ||
          state.status === 'permission-denied' ||
          state.status === 'location-unavailable') && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-gray-600">
              {state.status === 'permission-denied'
                ? 'Precisamos da sua localização para sugerir postos próximos.'
                : 'Não foi possível carregar os postos próximos.'}
            </p>
            <Button fullWidth={false} onClick={retry}>
              Tentar novamente
            </Button>
          </div>
        )}

        {state.status === 'success' && stations.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-600">
            Nenhum posto encontrado por perto.
          </p>
        )}

        {state.status === 'success' && stations.length > 0 && (
          <ul className="flex flex-col gap-2 overflow-y-auto">
            {stations.map((station) => (
              <li key={station.placeId}>
                <button
                  type="button"
                  onClick={() => onSelect(station)}
                  className="flex w-full items-center gap-2 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{station.name}</p>
                    <p className="truncate text-sm text-gray-600">
                      {formatStationAddress(station.street, station.houseNumber) ||
                        formatStationDistance(station.distanceMeters)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-gray-600">
                    {formatStationDistance(station.distanceMeters)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc -b`
Expected: same pre-existing `RefuelForm.tsx` errors from Task 1, nothing from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/StationPickerDialog.tsx
git commit -m "feat(ui): add StationPickerDialog"
```

---

### Task 5: `RefuelForm.tsx` — wire up the picker

**Files:**
- Modify: `src/routes/RefuelForm.tsx`

- [ ] **Step 1: Add imports**

Find:

```tsx
import { Screen } from '../components/ui/Screen'
import { Spinner } from '../components/ui/Spinner'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'
import { SegmentedToggle } from '../components/ui/SegmentedToggle'
```

Replace with:

```tsx
import { Screen } from '../components/ui/Screen'
import { Spinner } from '../components/ui/Spinner'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'
import { SegmentedToggle } from '../components/ui/SegmentedToggle'
import { StationPickerDialog } from '../components/ui/StationPickerDialog'
import { formatStationAddress } from '../lib/stationDistanceBand'
import type { Station } from '../types/Station'
```

- [ ] **Step 2: Add state**

Find:

```tsx
  const [fullTank, setFullTank] = useState(false)
  const [refuelType, setRefuelType] = useState<RefuelType>('FUEL')
  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)
```

Replace with:

```tsx
  const [fullTank, setFullTank] = useState(false)
  const [refuelType, setRefuelType] = useState<RefuelType>('FUEL')
  const [station, setStation] = useState<Station | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)
```

- [ ] **Step 3: Restore the station on edit**

Find:

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
```

Replace with:

```tsx
  async function loadRefuel() {
    try {
      const refuel: Refuel = await authenticatedRequest(`/refuels/${id}`)
      setOdometer(String(refuel.odometer))
      setEnergyAmount(String(refuel.energyAmount))
      setPricePerUnit(String(refuel.pricePerUnit))
      setFullTank(refuel.fullTank)
      setRefuelType(refuel.refuelType)
      if (refuel.stationName) {
        setStation({
          placeId: '',
          name: refuel.stationName,
          type: refuel.refuelType === 'ELECTRIC' ? 'ELECTRIC' : 'FUEL',
          distanceMeters: 0,
          rating: null,
          latitude: refuel.stationLatitude ?? 0,
          longitude: refuel.stationLongitude ?? 0,
          street: refuel.stationAddress,
          houseNumber: null,
        })
      }
    } catch (err) {
```

`street` is set to the already-formatted `stationAddress` (not decomposed into street/houseNumber, since the backend only stores one combined string) — the chip in Step 5 renders it via `station.street` directly, which works because `formatStationAddress` falls back to returning `street` as-is when `houseNumber` is falsy.

- [ ] **Step 4: Include station fields in the submitted body**

Find:

```tsx
    const body: RefuelRequest = {
      vehicleId: Number(activeVehicle.id),
      odometer: finalOdometer,
      energyAmount: parseFloat(energyAmount),
      pricePerUnit: finalPricePerUnit,
      fullTank,
      refuelType: isHybrid ? refuelType : null,
    }
```

Replace with:

```tsx
    const body: RefuelRequest = {
      vehicleId: Number(activeVehicle.id),
      odometer: finalOdometer,
      energyAmount: parseFloat(energyAmount),
      pricePerUnit: finalPricePerUnit,
      fullTank,
      refuelType: isHybrid ? refuelType : null,
      stationName: station?.name ?? null,
      stationAddress: station ? formatStationAddress(station.street, station.houseNumber) : null,
      stationLatitude: station?.latitude ?? null,
      stationLongitude: station?.longitude ?? null,
    }
```

- [ ] **Step 5: Add the picker UI to the form**

Find:

```tsx
        {isHybrid && (
          <select
            className="h-12 w-full rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            value={refuelType}
            onChange={(e) => setRefuelType(e.target.value as RefuelType)}
          >
            <option value="FUEL">Combustível</option>
            <option value="ELECTRIC">Elétrico</option>
          </select>
        )}

        <label className="flex items-center gap-2">
```

Replace with:

```tsx
        {isHybrid && (
          <select
            className="h-12 w-full rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            value={refuelType}
            onChange={(e) => setRefuelType(e.target.value as RefuelType)}
          >
            <option value="FUEL">Combustível</option>
            <option value="ELECTRIC">Elétrico</option>
          </select>
        )}

        {station ? (
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900">📍 {station.name}</p>
              {station.street && (
                <p className="truncate text-xs text-gray-600">
                  {formatStationAddress(station.street, station.houseNumber)}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="ghost" size="sm" fullWidth={false} onClick={() => setPickerOpen(true)}>
                Trocar
              </Button>
              <Button
                variant="ghost-danger"
                size="sm"
                fullWidth={false}
                onClick={() => setStation(null)}
              >
                Remover
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" fullWidth={false} onClick={() => setPickerOpen(true)}>
            📍 Adicionar posto
          </Button>
        )}

        {pickerOpen && (
          <StationPickerDialog
            type={isHybrid ? refuelType : activeVehicle?.energyType === 'ELECTRIC' ? 'ELECTRIC' : 'FUEL'}
            onSelect={(picked) => {
              setStation(picked)
              setPickerOpen(false)
            }}
            onDismiss={() => setPickerOpen(false)}
          />
        )}

        <label className="flex items-center gap-2">
```

- [ ] **Step 6: Type check**

Run: `npx tsc -b`
Expected: no errors (the errors from Tasks 1–4 are now fixed).

- [ ] **Step 7: Commit**

```bash
git add src/routes/RefuelForm.tsx
git commit -m "feat(refuel-form): add station picker, chip, and submit wiring"
```

---

### Task 6: `Refuels.tsx` — show the saved station on the card

**Files:**
- Modify: `src/routes/Refuels.tsx`

- [ ] **Step 1: Add the station line to the list card**

Find:

```tsx
                <DataField label="Total" value={currencyFormatter.format(item.totalAmount)} accent />
              </div>

              <div className="mt-3 flex items-center gap-2">
```

Replace with:

```tsx
                <DataField label="Total" value={currencyFormatter.format(item.totalAmount)} accent />
              </div>

              {item.stationName && (
                <p className="mt-2 truncate text-sm text-gray-600">
                  📍 {item.stationName}
                  {item.stationLatitude !== null && item.stationLongitude !== null && (
                    <>
                      {' · '}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${item.stationLatitude},${item.stationLongitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-green-700 hover:underline"
                      >
                        Ver no mapa
                      </a>
                    </>
                  )}
                </p>
              )}

              <div className="mt-3 flex items-center gap-2">
```

- [ ] **Step 2: Type check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Refuels.tsx
git commit -m "feat(refuels): show saved station on the list card"
```

---

### Task 7: Full build verification and push

**Files:** none (verification only)

- [ ] **Step 1: Run the full production build**

Run: `npm run build`
Expected: `tsc -b` passes with zero errors, then `vite build` completes.

- [ ] **Step 2: Push**

```bash
git push
```

Expected: deploy builds successfully. On the deployed preview: open "Postos" and confirm it behaves exactly as before (type toggle, radius presets, list). Open "Novo Abastecimento", tap "📍 Adicionar posto", allow location, pick a station from the dialog, confirm the chip appears with "Trocar"/"Remover", save the refuel, and confirm the station (with a working "Ver no mapa" link) shows up on its card in "Abastecimentos". This requires the backend plan already deployed — if the API doesn't yet accept/return the station fields, the request still succeeds (extra JSON fields are ignored by most JSON deserializers) but the station won't be persisted or shown; that's an expected gap until the backend is live, not a frontend bug.
