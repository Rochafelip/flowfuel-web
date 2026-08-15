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
