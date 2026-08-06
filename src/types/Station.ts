export type StationType = 'FUEL' | 'ELECTRIC'

export interface Station {
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

export const STATION_TYPE_LABELS: Record<StationType, string> = {
  FUEL: 'Combustível',
  ELECTRIC: 'Elétrico',
}

export const STATION_TYPE_ICONS: Record<StationType, string> = {
  FUEL: '⛽',
  ELECTRIC: '🔌',
}
