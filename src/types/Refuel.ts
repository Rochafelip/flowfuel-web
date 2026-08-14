export type RefuelType = 'FUEL' | 'ELECTRIC'

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
