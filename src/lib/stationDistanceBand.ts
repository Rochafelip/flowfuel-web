export const STATION_RADIUS_PRESETS_METERS = [1_000, 3_000, 5_000, 10_000]
export const DEFAULT_STATION_RADIUS_METERS = 3_000

/** Query ceiling for the farthest preset, which has no next step to bound it. */
const FARTHEST_BAND_QUERY_RADIUS_METERS = 20_000

export interface StationDistanceBand {
  minMeters: number
  maxMeters: number
}

/**
 * Each preset represents an exclusive distance band, not a cumulative radius: selecting
 * "3 km" shows only stations between 3000m and the next preset's start (4999m) — it does not
 * repeat stations already shown by the "1 km" preset. Only the first preset starts at 0.
 */
export function stationDistanceBand(presetMeters: number): StationDistanceBand {
  const isFirstPreset = STATION_RADIUS_PRESETS_METERS[0] === presetMeters
  const minMeters = isFirstPreset ? 0 : presetMeters
  const nextPreset = STATION_RADIUS_PRESETS_METERS.find((preset) => preset > presetMeters)
  const maxMeters = nextPreset !== undefined ? nextPreset - 1 : FARTHEST_BAND_QUERY_RADIUS_METERS
  return { minMeters, maxMeters }
}

export function formatStationDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) return `${distanceMeters} m`
  return `${(distanceMeters / 1000).toFixed(1)} km`
}

export function formatRadiusLabel(radiusMeters: number): string {
  return `${radiusMeters / 1000} km`
}

export function formatRating(rating: number): string {
  return rating.toFixed(1)
}

export function formatStationAddress(street: string | null, houseNumber: string | null): string | null {
  if (!street) return null
  if (!houseNumber) return street
  return `${street}, ${houseNumber}`
}
