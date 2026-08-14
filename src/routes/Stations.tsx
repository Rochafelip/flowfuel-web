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

  return (
    <Screen wide>
      <h1 className="mb-5 text-xl font-bold">Postos</h1>

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
          <Button fullWidth={false} onClick={handleRetry}>
            Tentar novamente
          </Button>
        </div>
      )}

      {state.status === 'location-unavailable' && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-gray-600">Não foi possível obter sua localização.</p>
          <Button fullWidth={false} onClick={requestLocation}>
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
          <Button fullWidth={false} onClick={requestLocation}>
            Permitir localização
          </Button>
        </div>
      )}

      {state.status === 'success' && filteredStations.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-gray-600">Nenhum posto encontrado nessa faixa de distância.</p>
          <Button fullWidth={false} onClick={handleRetry}>
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
    </Screen>
  )
}
