# Localização do posto no abastecimento (frontend)

## Contexto

Feature validada com o usuário via brainstorm com mockups (companion visual): guardar em qual posto cada abastecimento foi feito. Decisões tomadas:

- O posto é escolhido a partir da busca de postos próximos já existente (`GET /stations/nearby`, consumida hoje só em `Stations.tsx`), não capturado automaticamente por GPS nem digitado como texto livre.
- Campo **opcional** — o usuário pode salvar o abastecimento sem escolher posto.
- Seleção via **diálogo modal** (mesmo padrão de `ConfirmDialog`/`ShareVehicleDialog`), não uma rota separada.
- Exibição do posto salvo só no card da lista de `Refuels.tsx` (não no Home, por decisão explícita do usuário).

O lado do backend (colunas em `Refuel`, DTOs, `RefuelService`) é um spec/plano separado no repo `flowfuel` (`docs/superpowers/specs/2026-08-14-refuel-station-location-design.md`), já aprovado. Este documento assume que a API `POST/PUT /refuels` passa a aceitar e devolver `stationName`, `stationAddress`, `stationLatitude`, `stationLongitude` (todos opcionais/nulos).

## Escopo

- `src/types/Refuel.ts` — novos campos opcionais.
- `src/hooks/useNearbyStations.ts` (novo) — extrai a máquina de estados de geolocalização + busca de postos hoje só dentro de `Stations.tsx`, para reuso no novo diálogo.
- `src/routes/Stations.tsx` — passa a consumir o hook extraído (sem mudança de comportamento visual).
- `src/components/ui/StationPickerDialog.tsx` (novo) — diálogo de seleção de posto.
- `src/routes/RefuelForm.tsx` — botão para abrir o diálogo, chip do posto selecionado, inclusão dos campos no request.
- `src/routes/Refuels.tsx` — exibição do posto salvo no card da lista.

Fora de escopo: exibição em `Home.tsx` (decisão explícita do usuário); qualquer mudança em como `/stations/nearby` é chamado (só reorganiza o código que já existe, não muda parâmetros/URL).

---

## 1. `Refuel.ts`

```ts
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

## 2. `useNearbyStations.ts` (novo hook, extraído de `Stations.tsx`)

Hoje `Stations.tsx` tem, inline: `location`, `radiusMeters`, `state` (`ViewState`), `fetchStations`, `requestLocation`. O hook extrai só a parte genérica — "pedir localização, buscar postos num raio, guardar loading/erro/sucesso" — e **não** sabe nada sobre tipo de posto nem sobre a lógica de "banda exclusiva de distância" dos presets da tela de Postos: essas duas coisas continuam sendo filtros derivados calculados por quem consome o hook (como já era: o `Stations.tsx` original busca os dois tipos juntos e filtra por `selectedType` só na renderização, sem refazer a chamada de rede — o hook preserva exatamente esse comportamento).

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

`radiusMeters` é só o valor usado na primeira busca (disparada pelo `useEffect` de montagem); trocas de raio depois disso passam por `refetchAtRadius`, que reusa a localização já obtida sem pedir permissão de novo.

## 3. `Stations.tsx` — passa a consumir o hook, banda de distância vira filtro derivado

Troca `location`/`state`/`fetchStations`/`requestLocation` pelo hook. A banda exclusiva de distância (hoje calculada dentro do `fetchStations` antigo) passa a ser aplicada como filtro derivado no render, junto do filtro por tipo que já existia:

```ts
const [radiusMeters, setRadiusMeters] = useState(DEFAULT_STATION_RADIUS_METERS)
const { state, retry, refetchAtRadius } = useNearbyStations(
  stationDistanceBand(DEFAULT_STATION_RADIUS_METERS).maxMeters
)

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

`handleRetry` do componente atual vira simplesmente `retry` do hook. Resultado visual idêntico ao atual — só reorganiza onde a lógica mora.

## 4. `StationPickerDialog.tsx` (novo)

Segue o padrão de `ShareVehicleDialog.tsx` (overlay + card `role="dialog"`), mas o conteúdo é a lista de postos:

```tsx
import { useNearbyStations } from '../../hooks/useNearbyStations'
import { DEFAULT_STATION_RADIUS_METERS, formatStationAddress, formatStationDistance } from '../../lib/stationDistanceBand'
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

## 5. `RefuelForm.tsx`

- Novo estado `const [station, setStation] = useState<Station | null>(null)` e `const [pickerOpen, setPickerOpen] = useState(false)`.
- No modo edição, ao carregar o abastecimento (`loadRefuel`), se `refuel.stationName` existir, inicializa `station` com um objeto `Station`-like reconstruído a partir dos 4 campos salvos (sem `placeId`/`rating`/`type` reais — só os campos usados pela UI: `name`, `street`/`houseNumber` a partir de `stationAddress` bruto, `latitude`, `longitude`, `distanceMeters: 0`). Como `formatStationAddress` espera `street`/`houseNumber` separados e o backend só guarda `stationAddress` já formatado, o chip no formulário mostra `stationAddress` direto como subtítulo, sem tentar decompor.
- Bloco de UI (entre o toggle de `refuelType` e o checkbox de "Tanque cheio"):

```tsx
{station ? (
  <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
    <div className="min-w-0">
      <p className="truncate text-sm font-bold text-gray-900">📍 {station.name}</p>
      {(station.street || station.houseNumber) && (
        <p className="truncate text-xs text-gray-600">
          {formatStationAddress(station.street, station.houseNumber)}
        </p>
      )}
    </div>
    <div className="flex shrink-0 gap-2">
      <Button variant="ghost" size="sm" fullWidth={false} onClick={() => setPickerOpen(true)}>
        Trocar
      </Button>
      <Button variant="ghost-danger" size="sm" fullWidth={false} onClick={() => setStation(null)}>
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
```

- No corpo do `RefuelRequest` montado em `handleSubmit`, adiciona:

```ts
stationName: station?.name ?? null,
stationAddress: station ? formatStationAddress(station.street, station.houseNumber) : null,
stationLatitude: station?.latitude ?? null,
stationLongitude: station?.longitude ?? null,
```

## 6. `Refuels.tsx` — exibição no card

Logo abaixo do bloco de `DataField`s (odômetro/quantidade/preço/total), antes dos botões de ação:

```tsx
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
```

## Fora de escopo / riscos aceitos

- Sem testes automatizados (não há framework de testes no projeto); verificação por `npx tsc -b`, `npm run build` e deploy.
- O hook `useNearbyStations` muda a estrutura interna de `Stations.tsx`, mas não seu comportamento visual — checar manualmente no deploy preview que a tela de Postos continua idêntica.
- O backend precisa estar deployado com os campos novos antes desta parte do frontend ir para produção (ou os campos chegam como `undefined`/ausentes na resposta e a UI trata isso como "sem posto", já que todo acesso é via `item.stationName &&`, que também é falsy para `undefined`).
