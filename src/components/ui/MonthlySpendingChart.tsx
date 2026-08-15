import type { MonthlySpending } from '../../types/Dashboard'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const compactAmountFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
})

const MONTH_LABELS = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

function monthLabel(month: string): string {
  const monthNumber = Number(month.split('-')[1])
  return MONTH_LABELS[monthNumber - 1] ?? month
}

const BAR_AREA_HEIGHT = 96
const MIN_BAR_HEIGHT_PCT = 4

export function MonthlySpendingChart({ data }: { data: MonthlySpending[] }) {
  const hasSpending = data.some((entry) => entry.amount > 0)

  if (!hasSpending) {
    return (
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        Sem gastos nos últimos 6 meses.
      </p>
    )
  }

  const maxAmount = Math.max(...data.map((entry) => entry.amount))
  const lastIndex = data.length - 1

  return (
    <div>
      <div className="flex items-end justify-between gap-1">
        {data.map((entry, index) => {
          const heightPct =
            entry.amount > 0 ? Math.max((entry.amount / maxAmount) * 100, MIN_BAR_HEIGHT_PCT) : 0

          return (
            <div key={entry.month} className="flex flex-1 flex-col items-center gap-1">
              <span
                className={`font-mono text-[10px] leading-none ${
                  index === lastIndex
                    ? 'font-bold text-green-700 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {compactAmountFormatter.format(entry.amount)}
              </span>

              <div
                className="flex w-full items-end justify-center"
                style={{ height: BAR_AREA_HEIGHT }}
                title={currencyFormatter.format(entry.amount)}
              >
                <div
                  className="w-full max-w-[24px] rounded-t bg-green-600 dark:bg-green-500"
                  style={{ height: `${heightPct}%` }}
                />
              </div>

              <span className="text-xs text-gray-500 dark:text-gray-400">{monthLabel(entry.month)}</span>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-center text-[10px] text-gray-500 dark:text-gray-400">Valores em R$</p>
    </div>
  )
}
