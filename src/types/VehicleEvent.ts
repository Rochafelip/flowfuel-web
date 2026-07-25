export type VehicleEventType =
  | 'FUEL'
  | 'MAINTENANCE'
  | 'OIL_CHANGE'
  | 'CAR_WASH'
  | 'TIRES'
  | 'INSURANCE'
  | 'TAX'
  | 'DOCUMENTS'
  | 'OTHER'

export const VEHICLE_EVENT_TYPE_LABELS: Record<VehicleEventType, string> = {
  FUEL: 'Combustível',
  MAINTENANCE: 'Manutenção',
  OIL_CHANGE: 'Troca de óleo',
  CAR_WASH: 'Lavagem',
  TIRES: 'Pneus',
  INSURANCE: 'Seguro',
  TAX: 'Impostos/Taxas',
  DOCUMENTS: 'Documentos',
  OTHER: 'Outro',
}

export type VehicleEvent = {
  id: number
  vehicleId: number
  type: VehicleEventType
  amount: number
  eventDate: string
  odometer: number | null
  description: string | null
  createdAt: string
  updatedAt: string
}

export type VehicleEventRequest = {
  vehicleId: number
  type: VehicleEventType
  amount: number
  eventDate: string
  odometer: number | null
  description: string | null
}
