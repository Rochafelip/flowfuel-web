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
        className="relative flex max-h-[80vh] w-full max-w-sm flex-col rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-bold text-gray-900 dark:text-gray-100">Escolher posto</p>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
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
            <p className="text-sm text-gray-600 dark:text-gray-400">
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
          <p className="py-8 text-center text-sm text-gray-600 dark:text-gray-400">
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
                  className="flex w-full items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-left transition-colors hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-gray-900 dark:text-gray-100">{station.name}</p>
                    <p className="truncate text-sm text-gray-600 dark:text-gray-400">
                      {formatStationAddress(station.street, station.houseNumber) ||
                        formatStationDistance(station.distanceMeters)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-gray-600 dark:text-gray-400">
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
