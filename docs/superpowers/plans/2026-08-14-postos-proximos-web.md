# Postos Próximos (web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/stations` screen to the web app that lists fuel/electric stations near the user's current location, mirroring the mobile app's card-list model (no map).

**Architecture:** New route `Stations.tsx` composed from a geolocation hook (`useGeolocation`), a service call to the existing `GET /stations/nearby` backend endpoint, a pure distance-band util (`stationDistanceBand`) that turns a selected distance preset into a request radius + client-side floor filter, and a new `StationDistanceFilter` chip component alongside the existing `SegmentedToggle` for fuel/electric filtering.

**Tech Stack:** React + TypeScript + React Router + Tailwind (existing stack, no new dependencies).

**Assumptions / open questions for the engineer:**
- This repo has **no test runner configured** (no vitest/jest, no `.test.ts` files anywhere). This plan does **not** introduce one — it follows the existing repo convention of no automated tests, and per project preference, verification is done by building (`tsc -b`), a manual pass in the browser, and deploying (commit + push) rather than local test suites. If the team wants automated coverage for the new pure functions (`stationDistanceBand`, `formatStationDistance`), that's a good candidate for a follow-up plan that first sets up Vitest.
- **`stationDistanceBand` exact formula is a best-effort interpretation of the spec text**, not ported from a source file — the Android mobile source was not available to this session (only the FlowFuel backend Java repo was reachable, which has no client-side distance-band logic). The spec says: *"selecting preset N searches with radius = (next preset − 1) and filters client-side by distanceMeters >= N, except the first preset, which starts at 0."* Task 3 below implements that literally: for presets `[1000, 3000, 5000, 10000]`, selecting preset `P` at index `i` uses `radius = presets[i+1] - 1` (or `P` itself if there is no next preset) and `minDistanceMeters = i === 0 ? 0 : P`. If this doesn't match the Android app's actual behavior, the engineer should adjust Task 3 before relying on it — the rest of the plan is unaffected by the exact numbers, since everything routes through the single `stationDistanceBand` function.

---

## File Structure

- Create `src/types/Station.ts` — mirrors backend `StationResponseDTO`.
- Create `src/services/stations.ts` — `getNearbyStations(lat, lng, radius)`, follows `src/services/profile.ts` pattern (`authenticatedRequest`).
- Create `src/utils/stationDistanceBand.ts` — pure function, distance presets + band math.
- Create `src/utils/formatStationDistance.ts` — pure function, `"850 m"` / `"3.4 km"` formatting.
- Create `src/hooks/useGeolocation.ts` — wraps `navigator.geolocation.getCurrentPosition`, exposes a `LocationResult`-shaped state.
- Create `src/components/ui/StationDistanceFilter.tsx` — chip row for the 4 distance presets, styled like `SegmentedToggle`.
- Create `src/routes/Stations.tsx` — the screen itself, composes everything above.
- Modify `src/App.tsx` — register `/stations` route inside the existing `ProtectedRoute` + `AppLayout` block.
- Modify `src/components/layout/NavLinks.tsx` — add "Postos" nav entry between "Eventos" and "Exportar".

---

### Task 1: Station type

**Files:**
- Create: `src/types/Station.ts`

- [ ] **Step 1: Create the type file**

```ts
export type StationType = 'FUEL' | 'ELECTRIC'

export type Station = {
  placeId: string
  name: string
  type: StationType
  distanceMeters: number
  rating: number | null
  latitude: number
  longitude: number
  street: string | null
  houseNumber: string | null
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors related to `Station.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/types/Station.ts
git commit -m "feat(types): add Station type"
```

---

### Task 2: Stations service

**Files:**
- Create: `src/services/stations.ts`

- [ ] **Step 1: Create the service file**

```ts
import { authenticatedRequest } from './api'
import type { Station } from '../types/Station'

export function getNearbyStations(
  lat: number,
  lng: number,
  radius: number
): Promise<Station[]> {
  return authenticatedRequest(`/stations/nearby?lat=${lat}&lng=${lng}&radius=${radius}`)
}
```

This calls the existing backend endpoint `GET /stations/nearby?lat&lng&radius` (`StationController.java`, no backend changes needed). `authenticatedRequest` (in `src/services/api.ts`) already prefixes the base URL + `/api/v1`, injects the `Authorization` header, and redirects to `/login` on a 401.

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors related to `stations.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/services/stations.ts
git commit -m "feat(services): add getNearbyStations"
```

---

### Task 3: Distance band util

**Files:**
- Create: `src/utils/stationDistanceBand.ts`

- [ ] **Step 1: Create the pure function**

```ts
export const STATION_DISTANCE_PRESETS = [1000, 3000, 5000, 10000] as const

export type StationDistancePreset = (typeof STATION_DISTANCE_PRESETS)[number]

export type StationDistanceBand = {
  radius: number
  minDistanceMeters: number
}

export function stationDistanceBand(presetMeters: StationDistancePreset): StationDistanceBand {
  const index = STATION_DISTANCE_PRESETS.indexOf(presetMeters)
  const nextPreset = STATION_DISTANCE_PRESETS[index + 1]

  return {
    radius: nextPreset !== undefined ? nextPreset - 1 : presetMeters,
    minDistanceMeters: index === 0 ? 0 : presetMeters,
  }
}
```

- [ ] **Step 2: Manually verify the four cases in a scratch REPL (no test runner in this repo)**

Run: `npx tsx -e "
import { stationDistanceBand } from './src/utils/stationDistanceBand'
console.log(stationDistanceBand(1000))
console.log(stationDistanceBand(3000))
console.log(stationDistanceBand(5000))
console.log(stationDistanceBand(10000))
"`

Expected output:
```
{ radius: 2999, minDistanceMeters: 0 }
{ radius: 4999, minDistanceMeters: 3000 }
{ radius: 9999, minDistanceMeters: 5000 }
{ radius: 10000, minDistanceMeters: 10000 }
```

If `npx tsx` isn't available, temporarily add a `console.log(stationDistanceBand(...))` call inside `Stations.tsx` during Task 8 and check the browser console instead, then remove it.

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors related to `stationDistanceBand.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/utils/stationDistanceBand.ts
git commit -m "feat(utils): add stationDistanceBand"
```

---

### Task 4: Distance formatting util

**Files:**
- Create: `src/utils/formatStationDistance.ts`

- [ ] **Step 1: Create the pure function**

```ts
export function formatStationDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`
  }

  const km = Number((distanceMeters / 1000).toFixed(1))
  return `${km} km`
}
```

- [ ] **Step 2: Manually verify**

Run: `npx tsx -e "
import { formatStationDistance } from './src/utils/formatStationDistance'
console.log(formatStationDistance(850))
console.log(formatStationDistance(3420))
console.log(formatStationDistance(10000))
"`

Expected output:
```
850 m
3.4 km
10 km
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors related to `formatStationDistance.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/utils/formatStationDistance.ts
git commit -m "feat(utils): add formatStationDistance"
```

---

### Task 5: Geolocation hook

**Files:**
- Create: `src/hooks/useGeolocation.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useCallback, useEffect, useState } from 'react'

export type LocationResult =
  | { status: 'loading' }
  | { status: 'available'; latitude: number; longitude: number }
  | { status: 'permission-denied' }
  | { status: 'unavailable' }

export function useGeolocation() {
  const [location, setLocation] = useState<LocationResult>({ status: 'loading' })

  const requestLocation = useCallback(() => {
    setLocation({ status: 'loading' })

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          status: 'available',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocation({ status: 'permission-denied' })
        } else {
          setLocation({ status: 'unavailable' })
        }
      },
      { timeout: 10000 }
    )
  }, [])

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  return { location, requestLocation }
}
```

This mirrors the mobile `LocationResult` states (`Available` / `PermissionDenied` / `Unavailable`) plus an explicit `loading` state for the initial screen spinner. There is intentionally no "last known location" fallback (matches spec — the browser Geolocation API has no direct equivalent without extra permissions).

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors related to `useGeolocation.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGeolocation.ts
git commit -m "feat(hooks): add useGeolocation"
```

---

### Task 6: StationDistanceFilter component

**Files:**
- Create: `src/components/ui/StationDistanceFilter.tsx`

- [ ] **Step 1: Create the component**

Styled like the existing `SegmentedToggle` (`src/components/ui/SegmentedToggle.tsx`): selected state `bg-green-600 text-white`, unselected `text-gray-600`, container border `border-gray-300`.

```tsx
import { STATION_DISTANCE_PRESETS, type StationDistancePreset } from '../../utils/stationDistanceBand'

const PRESET_LABELS: Record<StationDistancePreset, string> = {
  1000: '1 km',
  3000: '3 km',
  5000: '5 km',
  10000: '10 km',
}

export function StationDistanceFilter({
  value,
  onChange,
}: {
  value: StationDistancePreset
  onChange: (value: StationDistancePreset) => void
}) {
  return (
    <div className="flex gap-2">
      {STATION_DISTANCE_PRESETS.map((preset) => (
        <button
          key={preset}
          type="button"
          onClick={() => onChange(preset)}
          className={`flex-1 rounded-md border py-2 text-sm font-bold transition-colors ${
            value === preset
              ? 'border-green-600 bg-green-600 text-white'
              : 'border-gray-300 text-gray-600'
          }`}
        >
          {PRESET_LABELS[preset]}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors related to `StationDistanceFilter.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/StationDistanceFilter.tsx
git commit -m "feat(ui): add StationDistanceFilter"
```

---

### Task 7: Stations screen

**Files:**
- Create: `src/routes/Stations.tsx`

- [ ] **Step 1: Create the screen**

Follows the loading/error/empty pattern from `src/routes/VehicleEvents.tsx` and `src/routes/Refuels.tsx`, plus the location-specific states from the spec.

```tsx
import { useEffect, useState } from 'react'
import { useVehicle } from '../context/VehicleContext'
import { useGeolocation } from '../hooks/useGeolocation'
import { getNearbyStations } from '../services/stations'
import { stationDistanceBand, STATION_DISTANCE_PRESETS, type StationDistancePreset } from '../utils/stationDistanceBand'
import { formatStationDistance } from '../utils/formatStationDistance'
import type { Station, StationType } from '../types/Station'
import { Screen } from '../components/ui/Screen'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { Button } from '../components/ui/Button'
import { SegmentedToggle } from '../components/ui/SegmentedToggle'
import { StationDistanceFilter } from '../components/ui/StationDistanceFilter'

function defaultStationType(energyType: string | undefined): StationType {
  return energyType === 'ELECTRIC' ? 'ELECTRIC' : 'FUEL'
}

export function Stations() {
  const { activeVehicle } = useVehicle()
  const { location, requestLocation } = useGeolocation()

  const [stationType, setStationType] = useState<StationType>(
    defaultStationType(activeVehicle?.energyType)
  )
  const [distancePreset, setDistancePreset] = useState<StationDistancePreset>(
    STATION_DISTANCE_PRESETS[0]
  )
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (activeVehicle) {
      setStationType(defaultStationType(activeVehicle.energyType))
    }
  }, [activeVehicle])

  async function fetchStations(lat: number, lng: number) {
    setLoading(true)
    setError(false)
    try {
      const { radius, minDistanceMeters } = stationDistanceBand(distancePreset)
      const result = await getNearbyStations(lat, lng, radius)
      setStations(result.filter((station) => station.distanceMeters >= minDistanceMeters))
    } catch (err) {
      console.log(err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (location.status === 'available') {
      fetchStations(location.latitude, location.longitude)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, distancePreset])

  const filteredStations = stations.filter((station) => station.type === stationType)

  if (location.status === 'loading') {
    return (
      <Screen centered>
        <Spinner />
      </Screen>
    )
  }

  if (location.status === 'permission-denied') {
    return (
      <Screen centered>
        <div className="text-center">
          <p className="mb-3 text-gray-600">
            Esta funcionalidade precisa da sua localização para encontrar postos próximos.
          </p>
          <p className="mb-4 text-sm text-gray-500">
            Se você já negou o acesso, pode ser necessário liberar a localização pelo ícone de
            cadeado ao lado do endereço na barra do navegador.
          </p>
          <Button fullWidth={false} onClick={requestLocation}>
            Permitir localização
          </Button>
        </div>
      </Screen>
    )
  }

  if (location.status === 'unavailable') {
    return (
      <Screen centered>
        <div className="text-center">
          <p className="mb-4 text-gray-600">Não foi possível obter sua localização.</p>
          <Button fullWidth={false} onClick={requestLocation}>
            Tentar novamente
          </Button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen wide>
      <h1 className="mb-5 text-xl font-bold">Postos</h1>

      <div className="mb-4 flex flex-col gap-3">
        <SegmentedToggle
          value={stationType}
          onChange={setStationType}
          options={[
            { value: 'FUEL', label: 'Combustível' },
            { value: 'ELECTRIC', label: 'Elétrico' },
          ]}
        />
        <StationDistanceFilter value={distancePreset} onChange={setDistancePreset} />
      </div>

      {loading && stations.length === 0 && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {error && (
        <div className="mb-4 flex flex-col items-center gap-3">
          <ErrorState message="Não foi possível carregar os postos." />
          <Button
            fullWidth={false}
            onClick={() =>
              location.status === 'available' &&
              fetchStations(location.latitude, location.longitude)
            }
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {!loading && !error && filteredStations.length === 0 && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-gray-600">Nenhum posto encontrado nessa faixa de distância</p>
          <Button
            fullWidth={false}
            onClick={() =>
              location.status === 'available' &&
              fetchStations(location.latitude, location.longitude)
            }
          >
            Tentar novamente
          </Button>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {filteredStations.map((station) => (
          <li key={station.placeId}>
            <Card>
              <div className="mb-1 flex items-center justify-between">
                <p className="font-bold">
                  {station.type === 'FUEL' ? '⛽' : '🔌'} {station.name}
                </p>
                <p className="text-sm text-gray-600">
                  {formatStationDistance(station.distanceMeters)}
                </p>
              </div>

              {station.street && (
                <p className="text-sm text-gray-600">
                  {station.street}
                  {station.houseNumber ? `, ${station.houseNumber}` : ''}
                </p>
              )}

              {station.rating !== null && (
                <p className="text-sm text-gray-600">⭐ {station.rating}</p>
              )}

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-md px-2 py-3 text-sm font-bold text-green-700 active:bg-green-50"
              >
                Traçar rota
              </a>
            </Card>
          </li>
        ))}
      </ul>
    </Screen>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors related to `Stations.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Stations.tsx
git commit -m "feat(routes): add Stations screen"
```

---

### Task 8: Wire up route

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import the screen**

Add near the other route imports (after `VehicleEventForm`):

```tsx
import { Stations } from './routes/Stations'
```

- [ ] **Step 2: Register the route**

Inside the `AppLayout` route block, right after `/vehicle-events/:id/edit`:

```tsx
<Route path="/vehicle-events/:id/edit" element={<VehicleEventForm />} />
<Route path="/stations" element={<Stations />} />
<Route path="/export" element={<Export />} />
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(routes): register /stations route"
```

---

### Task 9: Add nav item

**Files:**
- Modify: `src/components/layout/NavLinks.tsx`

- [ ] **Step 1: Add the entry to `navItems`**

`/refuels` already uses `⛽`, so use `📍` for "Postos" to avoid duplicating an icon in the nav. Insert between "Eventos" and "Exportar":

```tsx
const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/refuels', label: 'Abastecimentos', icon: '⛽', end: false },
  { to: '/vehicle-events', label: 'Eventos', icon: '🔧', end: false },
  { to: '/stations', label: 'Postos', icon: '📍', end: false },
  { to: '/export', label: 'Exportar', icon: '📤', end: false },
  { to: '/profile', label: 'Perfil', icon: '👤', end: false },
]
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/NavLinks.tsx
git commit -m "feat(nav): add Postos link"
```

---

### Task 10: Build, deploy, and manually verify

**Files:** none (verification only)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 2: Push to trigger deploy**

Per project preference, verification happens via deploy rather than a local dev server.

```bash
git push
```

- [ ] **Step 3: Manually verify on the deployed app**

- Open `/stations` from the sidebar/drawer nav ("Postos" with 📍).
- Allow location access when prompted — confirm the list loads, ordered by distance, with the correct default filter (Fuel/Electric) based on the active vehicle's `energyType`.
- Switch the Fuel/Electric toggle — confirm it filters client-side without a new network request (check the Network tab).
- Switch distance presets (1/3/5/10 km) — confirm each triggers a new request and the list updates.
- Deny location access (or test in a fresh profile/incognito) — confirm the "permission denied" message + "Permitir localização" button appear.
- Click "Traçar rota" on a card — confirm it opens Google Maps directions in a new tab with the station's coordinates.
- With no results in a very tight radius, confirm the empty-state message + "Tentar novamente" button appear.

---

## Self-Review Notes

- **Spec coverage:** route+nav (Task 8, 9), types+service (Task 1, 2), geolocation states (Task 5, screen states in Task 7), type filter default from `VehicleContext` (Task 7), distance filter + exclusive bands (Task 3, 6), card UI + "Traçar rota" (Task 7), all screen states — loading, empty, API error, permission denied, unavailable (Task 7) — all covered. Out-of-scope items (map, geocoding, price, cache/TTL) intentionally have no tasks.
- **No placeholders:** every step has complete, runnable code.
- **Type consistency:** `Station`/`StationType` (Task 1) flow unchanged into `stations.ts` (Task 2), `Stations.tsx` (Task 7). `StationDistancePreset`/`STATION_DISTANCE_PRESETS`/`stationDistanceBand` (Task 3) are the single source of truth reused by `StationDistanceFilter` (Task 6) and `Stations.tsx` (Task 7) — no duplicate preset lists.
