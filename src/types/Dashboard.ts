export type SpendingCategory = {
  category: string
  amount: number
}

export type MonthlySpending = {
  month: string
  amount: number
}

export type FuelMetrics = {
  totalEnergy: number
  totalSpent: number
  averagePrice: number
  averageConsumption: number
  energyUnit: string
  priceUnit: string
  consumptionUnit: string
}

export type Dashboard = {
  vehicleId: number
  energyType: 'COMBUSTION' | 'ELECTRIC' | 'HYBRID'
  totalRefuels: number
  totalSpent: number
  totalOverallSpent: number
  spendingBreakdown: SpendingCategory[]
  monthlySpending: MonthlySpending[]
  costPerKm: number
  totalEnergy: number | null
  averagePrice: number | null
  averageConsumption: number | null
  energyUnit: string | null
  priceUnit: string | null
  consumptionUnit: string | null
  breakdown: {
    fuel: FuelMetrics
    electric: FuelMetrics
  } | null
  lastRefuelDate: string | null
  lastOdometer: number | null
}
