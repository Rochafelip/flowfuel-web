# Station Location Search (web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user search a neighborhood/city on the "Postos" screen and browse stations around that place instead of their current GPS location, via `GET /stations/geocode` (already live in production — no backend changes).

**Architecture:** A new `GeocodeResult` type and `geocodeLocation` service call the existing endpoint. `useNearbyStations` gains an optional `override` coordinate parameter — when set, it fetches stations there instead of asking for GPS, while still remembering the last GPS fix so clearing the search reverts instantly. A new `LocationSearchDialog` (same modal pattern as `StationPickerDialog`) collects the query and lets the user pick a result. `Stations.tsx` wires a search icon, the dialog, and an active-location chip.

**Tech Stack:** React 19, TypeScript (strict), Tailwind CSS. No test framework in this repo — verification is `npx tsc -b` after each task and `npm run build` at the end.

---

## File Structure

- Modify `src/types/Station.ts` — add `GeocodeResult`.
- Modify `src/services/stations.ts` — add `geocodeLocation(query)`.
- Modify `src/hooks/useNearbyStations.ts` — add optional `override` coordinate param.
- Create `src/components/ui/LocationSearchDialog.tsx` — search modal.
- Modify `src/routes/Stations.tsx` — search icon, dialog wiring, active-location chip.

---

### Task 1: `Station.ts` — `GeocodeResult` type

**Files:**
- Modify: `src/types/Station.ts`

- [ ] **Step 1: Add the type**

Find:

```ts
export const STATION_TYPE_ICONS: Record<StationType, string> = {
  FUEL: '⛽',
  ELECTRIC: '🔌',
}
```

Replace with:

```ts
export const STATION_TYPE_ICONS: Record<StationType, string> = {
  FUEL: '⛽',
  ELECTRIC: '🔌',
}

export interface GeocodeResult {
  displayName: string
  latitude: number
  longitude: number
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/Station.ts
git commit -m "feat(types): add GeocodeResult"
```

---

### Task 2: `stations.ts` — `geocodeLocation` service

**Files:**
- Modify: `src/services/stations.ts`

- [ ] **Step 1: Replace the file**

```ts
import { authenticatedRequest } from './api'
import type { GeocodeResult, Station } from '../types/Station'

export function getNearbyStations(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<Station[]> {
  return authenticatedRequest(`/stations/nearby?lat=${lat}&lng=${lng}&radius=${radiusMeters}`)
}

export function geocodeLocation(query: string): Promise<GeocodeResult[]> {
  return authenticatedRequest(`/stations/geocode?query=${encodeURIComponent(query)}`)
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/stations.ts
git commit -m "feat(stations): add geocodeLocation service"
```

---

### Task 3: `useNearbyStations.ts` — optional location override

**Files:**
- Modify: `src/hooks/useNearbyStations.ts`

- [ ] **Step 1: Replace the file**

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

export function useNearbyStations(radiusMeters: number, override: Coordinates | null = null) {
  const [state, setState] = useState<NearbyStationsState>({ status: 'loading' })
  const [gpsLocation, setGpsLocation] = useState<Coordinates | null>(null)

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
        setGpsLocation(coords)
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
    if (override) {
      fetchStations(override, radiusMeters)
    } else if (gpsLocation) {
      fetchStations(gpsLocation, radiusMeters)
    } else {
      requestLocation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [override?.lat, override?.lng])

  function retry() {
    const coords = override ?? gpsLocation
    if (coords) {
      fetchStations(coords, radiusMeters)
    } else {
      requestLocation()
    }
  }

  function refetchAtRadius(radius: number) {
    const coords = override ?? gpsLocation
    if (coords) fetchStations(coords, radius)
  }

  return { state, retry, refetchAtRadius }
}
```

Behavior notes:
- Callers that don't pass `override` (or pass `null`) get **exactly today's behavior**: GPS on mount, `retry`/`refetchAtRadius` operate on the GPS fix. This covers `StationPickerDialog` and any other current caller — no changes needed there.
- When `override` is set (a searched location), the effect fetches stations there directly, with no geolocation permission prompt.
- When `override` goes from set back to `null` (user cleared the search), the effect re-runs (its dependency `override?.lat`/`override?.lng` changed) and finds `gpsLocation` already populated from the earlier GPS fetch — so it reuses it via `fetchStations(gpsLocation, radiusMeters)` instead of calling `requestLocation()` again. This is the "revert to GPS without re-asking permission" behavior from the spec.
- If the user clears the search *before* the initial GPS fetch ever completed (`gpsLocation` still `null`), it falls through to `requestLocation()` — same as a fresh mount.

- [ ] **Step 2: Type check**

Run: `npx tsc -b`
Expected: no errors. (`Stations.tsx`, `StationPickerDialog.tsx` both call `useNearbyStations` with just one argument today — still valid since `override` defaults to `null`.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useNearbyStations.ts
git commit -m "feat(hooks): add optional location override to useNearbyStations"
```

---

### Task 4: `LocationSearchDialog.tsx` — new search modal

**Files:**
- Create: `src/components/ui/LocationSearchDialog.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState, type FormEvent } from 'react'
import { geocodeLocation } from '../../services/stations'
import type { GeocodeResult } from '../../types/Station'
import { Button } from './Button'
import { Spinner } from './Spinner'

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; results: GeocodeResult[] }
  | { status: 'empty' }
  | { status: 'error' }

const MIN_QUERY_LENGTH = 3

export function LocationSearchDialog({
  onSelect,
  onDismiss,
}: {
  onSelect: (result: GeocodeResult) => void
  onDismiss: () => void
}) {
  const [query, setQuery] = useState('')
  const [state, setState] = useState<SearchState>({ status: 'idle' })

  async function runSearch(rawQuery: string) {
    const trimmed = rawQuery.trim()
    if (trimmed.length < MIN_QUERY_LENGTH) return

    setState({ status: 'loading' })
    try {
      const results = await geocodeLocation(trimmed)
      setState(results.length === 0 ? { status: 'empty' } : { status: 'success', results })
    } catch (err) {
      console.log(err)
      setState({ status: 'error' })
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    runSearch(query)
  }

  const canSearch = query.trim().length >= MIN_QUERY_LENGTH

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onDismiss} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar localidade"
        className="relative flex max-h-[80vh] w-full max-w-sm flex-col rounded-xl bg-white p-6 shadow-lg"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-bold text-gray-900">Buscar localidade</p>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-gray-700 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mb-3 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: Boa Viagem, Recife"
            className="h-10 flex-1 rounded-lg border border-gray-300 px-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <Button type="submit" fullWidth={false} disabled={!canSearch}>
            Buscar
          </Button>
        </form>

        {state.status === 'loading' && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}

        {state.status === 'error' && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-gray-600">Não foi possível buscar essa localidade.</p>
            <Button fullWidth={false} onClick={() => runSearch(query)}>
              Tentar novamente
            </Button>
          </div>
        )}

        {state.status === 'empty' && (
          <p className="py-8 text-center text-sm text-gray-600">
            Nenhum lugar encontrado. Tente um nome diferente ou mais específico.
          </p>
        )}

        {state.status === 'success' && (
          <ul className="flex flex-col gap-2 overflow-y-auto">
            {state.results.map((result, index) => (
              <li key={`${result.displayName}-${index}`}>
                <button
                  type="button"
                  onClick={() => onSelect(result)}
                  className="flex w-full items-center gap-2 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                >
                  <span className="text-gray-500">📍</span>
                  <span className="truncate text-sm font-bold text-gray-900">
                    {result.displayName}
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

`state.status === 'idle'` renders nothing below the search form — matches the mobile spec's `Idle -> Unit`.

- [ ] **Step 2: Type check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/LocationSearchDialog.tsx
git commit -m "feat(ui): add LocationSearchDialog"
```

---

### Task 5: `Stations.tsx` — wire up search icon, dialog, and active-location chip

**Files:**
- Modify: `src/routes/Stations.tsx`

- [ ] **Step 1: Add imports**

Find:

```tsx
import { useEffect, useState } from 'react'
import { useVehicle } from '../context/VehicleContext'
import { useNearbyStations } from '../hooks/useNearbyStations'
import {
  STATION_TYPE_ICONS,
  STATION_TYPE_LABELS,
  type StationType,
} from '../types/Station'
```

Replace with:

```tsx
import { useEffect, useState } from 'react'
import { useVehicle } from '../context/VehicleContext'
import { useNearbyStations } from '../hooks/useNearbyStations'
import {
  STATION_TYPE_ICONS,
  STATION_TYPE_LABELS,
  type GeocodeResult,
  type StationType,
} from '../types/Station'
import { LocationSearchDialog } from '../components/ui/LocationSearchDialog'
```

- [ ] **Step 2: Add state and pass the override to the hook**

Find:

```tsx
export function Stations() {
  const { activeVehicle } = useVehicle()
  const [radiusMeters, setRadiusMeters] = useState(DEFAULT_STATION_RADIUS_METERS)
  const [selectedType, setSelectedType] = useState<StationType>('FUEL')
  const [typePreselected, setTypePreselected] = useState(false)
  const { state, retry, refetchAtRadius } = useNearbyStations(
    stationDistanceBand(DEFAULT_STATION_RADIUS_METERS).maxMeters
  )
```

Replace with:

```tsx
export function Stations() {
  const { activeVehicle } = useVehicle()
  const [radiusMeters, setRadiusMeters] = useState(DEFAULT_STATION_RADIUS_METERS)
  const [selectedType, setSelectedType] = useState<StationType>('FUEL')
  const [typePreselected, setTypePreselected] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<GeocodeResult | null>(null)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const { state, retry, refetchAtRadius } = useNearbyStations(
    stationDistanceBand(DEFAULT_STATION_RADIUS_METERS).maxMeters,
    selectedLocation ? { lat: selectedLocation.latitude, lng: selectedLocation.longitude } : null
  )
```

- [ ] **Step 3: Add the search icon next to the title**

Find:

```tsx
    <Screen wide>
      <h1 className="mb-5 text-xl font-bold">Postos</h1>
```

Replace with:

```tsx
    <Screen wide>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold">Postos</h1>
        <button
          type="button"
          onClick={() => setSearchDialogOpen(true)}
          aria-label="Buscar localidade"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-base text-gray-700 hover:border-gray-300 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
        >
          🔍
        </button>
      </div>
```

- [ ] **Step 4: Add the active-location chip below the radius presets**

Find:

```tsx
          <div className="flex gap-2">
            {STATION_RADIUS_PRESETS_METERS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleRadiusSelect(preset)}
                className={`rounded-full border px-3 py-1.5 text-sm font-bold transition-colors ${
                  preset === radiusMeters
                    ? 'border-green-600 bg-green-100 text-green-700'
                    : 'border-gray-300 text-gray-600'
                }`}
              >
                {formatRadiusLabel(preset)}
              </button>
            ))}
          </div>
        </div>
      )}
```

Replace with:

```tsx
          <div className="flex gap-2">
            {STATION_RADIUS_PRESETS_METERS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleRadiusSelect(preset)}
                className={`rounded-full border px-3 py-1.5 text-sm font-bold transition-colors ${
                  preset === radiusMeters
                    ? 'border-green-600 bg-green-100 text-green-700'
                    : 'border-gray-300 text-gray-600'
                }`}
              >
                {formatRadiusLabel(preset)}
              </button>
            ))}
          </div>

          {selectedLocation && (
            <div className="flex items-center gap-2 self-start rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700">
              <span className="truncate">📍 {selectedLocation.displayName}</span>
              <button
                type="button"
                onClick={() => setSelectedLocation(null)}
                aria-label="Voltar para minha localização"
                className="text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 5: Render the dialog**

Find (end of the component, closing the `Screen`):

```tsx
      )}
    </Screen>
  )
}
```

Replace with:

```tsx
      )}

      {searchDialogOpen && (
        <LocationSearchDialog
          onSelect={(result) => {
            setSelectedLocation(result)
            setSearchDialogOpen(false)
          }}
          onDismiss={() => setSearchDialogOpen(false)}
        />
      )}
    </Screen>
  )
}
```

- [ ] **Step 6: Type check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/routes/Stations.tsx
git commit -m "feat(stations): add location search icon, dialog, and active-location chip"
```

---

### Task 6: Full build verification and push

**Files:** none (verification only)

- [ ] **Step 1: Run the full production build**

Run: `npm run build`
Expected: `tsc -b` passes with zero errors, then `vite build` completes.

- [ ] **Step 2: Push**

```bash
git push
```

Expected: deploy builds successfully. On the deployed preview, open "Postos": confirm the 🔍 icon opens the dialog; typing fewer than 3 characters keeps "Buscar" disabled; searching "Boa Viagem" (or another real neighborhood) and picking a result closes the dialog, reloads the station list around that place, and shows the blue chip; clicking the chip's ✕ reverts to GPS-based results without a new permission prompt; changing the type toggle or a radius preset while a searched location is active keeps browsing that location (doesn't silently revert to GPS); searching something with no matches (e.g. "zzzznaoexiste") shows the empty state, not the generic error.
