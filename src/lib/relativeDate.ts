function dateOnly(dateString: string): Date {
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

function todayDateOnly(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function daysSince(dateString: string): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round(
    (todayDateOnly().getTime() - dateOnly(dateString).getTime()) / msPerDay
  )
}

export function formatLastRefuelSubtitle(lastRefuelDate: string | null): string {
  if (!lastRefuelDate) return 'Pronto para rodar'
  const days = daysSince(lastRefuelDate)
  if (days <= 0) return 'Abastecido hoje'
  if (days === 1) return 'Abastecimento foi ontem'
  return `Há ${days} dias sem abastecer`
}

export function formatLastRefuelLabel(lastRefuelDate: string | null): string {
  if (!lastRefuelDate) return 'Nenhum abastecimento ainda'
  const days = daysSince(lastRefuelDate)
  if (days <= 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  return `Há ${days} dias`
}

export function isDateStringInMonth(
  dateString: string,
  year: number,
  month: number
): boolean {
  const [y, m] = dateString.slice(0, 7).split('-').map(Number)
  return y === year && m === month
}

export function formatActivityDate(dateString: string): string {
  if (dateString.includes('T')) {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }
  return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}
