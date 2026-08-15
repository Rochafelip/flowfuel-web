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
