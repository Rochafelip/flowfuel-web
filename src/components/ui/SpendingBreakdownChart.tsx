import type { SpendingCategory } from '../../types/Dashboard'
import {
  VEHICLE_EVENT_TYPE_ICONS,
  VEHICLE_EVENT_TYPE_LABELS,
  type VehicleEventType,
} from '../../types/VehicleEvent'

// Ordem fixa e validada contra daltonismo (ΔE ≥ 8 entre pares adjacentes):
// azul → laranja → água → amarelo → magenta. O backend já manda as até 5
// categorias de maior gasto ordenadas por valor desc + "OTHER" por último,
// então a cor é atribuída por posição no ranking, não por identidade da
// categoria (com só 5 tons pra até 8 categorias possíveis, a mesma categoria
// pode ocupar posições diferentes de um veículo pro outro). "OTHER" nunca
// entra nessa paleta: fica sempre em cinza neutro.
const RANK_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4']
const OTHER_COLOR = '#9ca3af'

function colorFor(category: string, rankIndex: number): string {
  if (category === 'OTHER') return OTHER_COLOR
  return RANK_COLORS[rankIndex] ?? OTHER_COLOR
}

function labelFor(category: string): string {
  return VEHICLE_EVENT_TYPE_LABELS[category as VehicleEventType] ?? category
}

function iconFor(category: string): string {
  return VEHICLE_EVENT_TYPE_ICONS[category as VehicleEventType] ?? '📦'
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const SIZE = 176
const STROKE_WIDTH = 28
const RADIUS = (SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 3

export function SpendingBreakdownChart({ data }: { data: SpendingCategory[] }) {
  const total = data.reduce((sum, d) => sum + d.amount, 0)

  if (data.length === 0 || total <= 0) {
    return null
  }

  let offset = 0
  const segments = data.map((d, index) => {
    const rawDash = (d.amount / total) * CIRCUMFERENCE
    const dash = Math.max(rawDash - GAP, 0)
    const segment = {
      category: d.category,
      color: colorFor(d.category, index),
      dasharray: `${dash} ${CIRCUMFERENCE - dash}`,
      dashoffset: -(offset + GAP / 2),
    }
    offset += rawDash
    return segment
  })

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={STROKE_WIDTH}
        />
        {segments.map((s) => (
          <circle
            key={s.category}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={s.color}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={s.dasharray}
            strokeDashoffset={s.dashoffset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        ))}
        <text
          x="50%"
          y="47%"
          textAnchor="middle"
          className="fill-gray-900 text-sm font-bold"
        >
          {currencyFormatter.format(total)}
        </text>
        <text
          x="50%"
          y="60%"
          textAnchor="middle"
          className="fill-gray-500 text-[11px]"
        >
          Total
        </text>
      </svg>

      <ul className="flex w-full flex-col gap-2">
        {data.map((d, index) => (
          <li key={d.category} className="flex items-center gap-2 text-sm">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: colorFor(d.category, index) }}
            />
            <span className="flex-1 text-gray-700">
              {iconFor(d.category)} {labelFor(d.category)}
            </span>
            <span className="font-mono font-semibold text-gray-900">
              {currencyFormatter.format(d.amount)}
            </span>
            <span className="w-12 text-right text-xs text-gray-500">
              {((d.amount / total) * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
