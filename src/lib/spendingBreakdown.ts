import type { SpendingCategory } from '../types/Dashboard'
import type { VehicleEventType } from '../types/VehicleEvent'

const TOP_CATEGORIES = 5

const RANKABLE_EVENT_TYPES: VehicleEventType[] = [
  'MAINTENANCE',
  'OIL_CHANGE',
  'CAR_WASH',
  'TIRES',
  'INSURANCE',
  'TAX',
  'DOCUMENTS',
]

/**
 * Espelha a lógica do backend (DashboardService.buildSpendingBreakdown):
 * combustível = refuelsTotal + eventos do tipo FUEL; as 5 maiores categorias
 * viram fatias próprias (ordenadas por valor desc); o resto — incluindo a
 * categoria nativa OTHER — vira uma fatia "OTHER" final.
 */
export function buildSpendingBreakdown(
  refuelsTotal: number,
  eventAmountsByType: Partial<Record<VehicleEventType, number>>
): SpendingCategory[] {
  const fuelAmount = refuelsTotal + (eventAmountsByType.FUEL ?? 0)

  const rankable: SpendingCategory[] = []
  if (fuelAmount > 0) {
    rankable.push({ category: 'FUEL', amount: fuelAmount })
  }
  for (const type of RANKABLE_EVENT_TYPES) {
    const amount = eventAmountsByType[type] ?? 0
    if (amount > 0) {
      rankable.push({ category: type, amount })
    }
  }
  rankable.sort((a, b) => b.amount - a.amount)

  const top = rankable.slice(0, TOP_CATEGORIES)
  const overflow =
    (eventAmountsByType.OTHER ?? 0) +
    rankable.slice(TOP_CATEGORIES).reduce((sum, c) => sum + c.amount, 0)

  const result = [...top]
  if (overflow > 0) {
    result.push({ category: 'OTHER', amount: overflow })
  }
  return result
}
