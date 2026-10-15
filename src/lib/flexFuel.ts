export type FuelWinner = 'ethanol' | 'gasoline' | 'tie'

const RATIO_THRESHOLD = 0.7

// Aceita vírgula ou ponto como separador decimal. Retorna null para vazio,
// não numérico, zero ou negativo.
export function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(',', '.')
  if (normalized === '') return null
  const value = Number(normalized)
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

export function ratioRule(ethanolPrice: number, gasolinePrice: number) {
  const ratio = ethanolPrice / gasolinePrice
  // Arredonda a 4 casas para que 70,00% exato não vire gasolina por erro de ponto flutuante.
  const rounded = Math.round(ratio * 10000) / 10000
  let winner: FuelWinner
  if (rounded < RATIO_THRESHOLD) winner = 'ethanol'
  else if (rounded > RATIO_THRESHOLD) winner = 'gasoline'
  else winner = 'tie'
  return { ratio, winner }
}

export function exactCost(input: {
  ethanolPrice: number
  gasolinePrice: number
  ethanolKmPerLiter: number
  gasolineKmPerLiter: number
}) {
  const ethanolCostPerKm = input.ethanolPrice / input.ethanolKmPerLiter
  const gasolineCostPerKm = input.gasolinePrice / input.gasolineKmPerLiter

  if (Math.abs(ethanolCostPerKm - gasolineCostPerKm) < 1e-9) {
    return { ethanolCostPerKm, gasolineCostPerKm, winner: 'tie' as FuelWinner, savingsPercent: 0 }
  }

  const winner: FuelWinner = ethanolCostPerKm < gasolineCostPerKm ? 'ethanol' : 'gasoline'
  const cheaper = Math.min(ethanolCostPerKm, gasolineCostPerKm)
  const dearer = Math.max(ethanolCostPerKm, gasolineCostPerKm)
  const savingsPercent = ((dearer - cheaper) / dearer) * 100

  return { ethanolCostPerKm, gasolineCostPerKm, winner, savingsPercent }
}
