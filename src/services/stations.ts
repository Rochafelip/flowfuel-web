import { authenticatedRequest } from './api'
import type { Station } from '../types/Station'

export function getNearbyStations(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<Station[]> {
  return authenticatedRequest(`/stations/nearby?lat=${lat}&lng=${lng}&radius=${radiusMeters}`)
}
