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
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Postos</h1>
        <Button type="button" variant="ghost" fullWidth={false} onClick={() => setSearchDialogOpen(true)}>
          🔍 Pesquisar postos
        </Button>
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
                    ? 'border-green-600 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                }`}
              >
                {formatRadiusLabel(preset)}
              </button>
            ))}
          </div>

          {selectedLocation && (
            <div className="flex items-center gap-2 self-start rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 text-sm font-bold text-blue-700 dark:text-blue-300">
              <span className="truncate">📍 {selectedLocation.displayName}</span>
              <button
                type="button"
                onClick={() => setSelectedLocation(null)}
                aria-label="Voltar para minha localização"
                className="text-blue-700 dark:text-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
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
          <p className="text-gray-600 dark:text-gray-400">Não foi possível obter sua localização.</p>
          <Button fullWidth={false} onClick={retry}>
            Tentar novamente
          </Button>
        </div>
      )}

      {state.status === 'permission-denied' && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-gray-600 dark:text-gray-400">
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
          <p className="text-gray-600 dark:text-gray-400">Nenhum posto encontrado nessa faixa de distância.</p>
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
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatStationDistance(station.distanceMeters)}
                    </p>
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    {address ? (
                      <p className="flex-1 truncate text-sm text-gray-600 dark:text-gray-400">{address}</p>
                    ) : (
                      <span className="flex-1" />
                    )}
                    {station.rating !== null && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">⭐ {formatRating(station.rating)}</p>
                    )}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md px-2 py-1 text-sm font-bold text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-gray-950"
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
