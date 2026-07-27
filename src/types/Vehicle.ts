export interface Vehicle {
  id: number
  type: 'Carro' | 'Moto'
  energyType: 'COMBUSTION' | 'ELECTRIC' | 'HYBRID'
  fuelSubType: string | null
  currentKm: number
  capacity: number | null
  batteryCapacity: number | null
  brand: string
  model: string
  manufactureYear: number | null
  modelYear: number | null
  color: string | null
  licensePlate: string | null
  photo: string | null
  isActive: boolean
}

export interface VehicleShare {
  id: number
  vehicleId: number
  vehicleBrand: string
  vehicleModel: string
  ownerId: number
  ownerName: string
  guestId: number | null
  guestName: string | null
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REVOKED' | 'EXPIRED'
  createdAt: string
  respondedAt: string | null
  expiresAt: string | null
}
