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
  const [selectedLocation, setSelectedLocation] = useState<GeocodeResult | null>(null)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const { state, retry, refetchAtRadius } = useNearbyStations(
    stationDistanceBand(DEFAULT_STATION_RADIUS_METERS).maxMeters,
    selectedLocation ? { lat: selectedLocation.latitude, lng: selectedLocation.longitude } : null
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

  return (
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

      {state.status !== 'permission-denied' && (
        <div className="mb-5 flex flex-col gap-3">
          <SegmentedToggle
            options={[
              { value: 'FUEL', label: `${STATION_TYPE_ICONS.FUEL} ${STATION_TYPE_LABELS.FUEL}` },
              { value: 'ELECTRIC', label: `${STATION_TYPE_ICONS.ELECTRIC} ${STATION_TYPE_LABELS.ELECTRIC}` },
            ]}
            value={selectedType}
            onChange={setSelectedType}
          />

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

      {state.status === 'loading' && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {state.status === 'error' && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <ErrorState message="Não foi possível carregar os postos próximos." />
          <Button fullWidth={false} onClick={retry}>
            Tentar novamente
          </Button>
        </div>
      )}

      {state.status === 'location-unavailable' && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-gray-600">Não foi possível obter sua localização.</p>
          <Button fullWidth={false} onClick={retry}>
            Tentar novamente
          </Button>
        </div>
      )}

      {state.status === 'permission-denied' && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-gray-600">
            Precisamos da sua localização para mostrar postos e estações próximos. Se o
            navegador já negou o acesso, libere pelo ícone de cadeado ao lado do endereço do
            site.
          </p>
          <Button fullWidth={false} onClick={retry}>
            Permitir localização
          </Button>
        </div>
      )}

      {state.status === 'success' && filteredStations.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-gray-600">Nenhum posto encontrado nessa faixa de distância.</p>
          <Button fullWidth={false} onClick={retry}>
            Tentar novamente
          </Button>
        </div>
      )}

      {state.status === 'success' && filteredStations.length > 0 && (
        <ul className="flex flex-col gap-3">
          {filteredStations.map((station) => {
            const address = formatStationAddress(station.street, station.houseNumber)
            return (
              <li key={station.placeId}>
                <Card interactive>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{STATION_TYPE_ICONS[station.type]}</span>
                    <p className="flex-1 truncate font-bold">{station.name}</p>
                    <p className="text-sm text-gray-600">
                      {formatStationDistance(station.distanceMeters)}
                    </p>
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    {address ? (
                      <p className="flex-1 truncate text-sm text-gray-600">{address}</p>
                    ) : (
                      <span className="flex-1" />
                    )}
                    {station.rating !== null && (
                      <p className="text-sm text-gray-600">⭐ {formatRating(station.rating)}</p>
                    )}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md px-2 py-1 text-sm font-bold text-green-700 hover:bg-green-50"
                    >
                      Traçar rota
                    </a>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
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
