export type Dashboard = {
  averageConsumption: number
  totalSpent: number
  monthlySpent: number
  totalRefuels: number
  lastRefuel: {
    refuelDate: string
    totalAmount: number
    litersRefueled: number
  } | null
}
