import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import type { Dashboard, FuelMetrics } from '../types/Dashboard'
import type { Refuel } from '../types/Refuel'
import type { VehicleEvent } from '../types/VehicleEvent'
import {
  VEHICLE_EVENT_TYPE_LABELS,
  VEHICLE_EVENT_TYPE_ICONS,
} from '../types/VehicleEvent'
import { Screen } from '../components/ui/Screen'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { Button } from '../components/ui/Button'
import {
  formatLastRefuelSubtitle,
  formatLastRefuelLabel,
  formatActivityDate,
  isDateStringInMonth,
} from '../lib/relativeDate'
import { getTipOfTheDay } from '../lib/fuelSavingTips'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const integerFormatter = new Intl.NumberFormat('pt-BR')

const MONTHLY_LOOKBACK_SIZE = 50
const ACTIVITY_FEED_SIZE = 5

type ActivityItem = {
  id: string
  date: string
  icon: string
  title: string
  amount: number
}

function IconBadge({ icon }: { icon: string }) {
  return (
    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-base text-green-700">
      {icon}
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: string
}) {
  return (
    <Card>
      <IconBadge icon={icon} />
      <p className="text-sm text-gray-600">{label}</p>
      <p className="font-mono text-lg font-bold text-gray-900">{value}</p>
    </Card>
  )
}

function FuelMetricsCard({
  icon,
  title,
  metrics,
}: {
  icon: string
  title: string
  metrics: FuelMetrics
}) {
  return (
    <Card>
      <IconBadge icon={icon} />
      <p className="mb-2 text-sm font-bold text-gray-700">{title}</p>

      <p className="text-sm text-gray-600">Consumo médio</p>
      <p className="mb-2 font-mono font-bold text-gray-900">
        {metrics.averageConsumption.toFixed(2)} {metrics.consumptionUnit}
      </p>

      <p className="text-sm text-gray-600">Preço médio</p>
      <p className="mb-2 font-mono font-bold text-gray-900">
        {currencyFormatter.format(metrics.averagePrice)} {metrics.priceUnit}
      </p>

      <p className="text-sm text-gray-600">Total gasto</p>
      <p className="font-mono font-bold text-gray-900">
        {currencyFormatter.format(metrics.totalSpent)}
      </p>
    </Card>
  )
}

function VehicleHeader({
  name,
  subtitle,
  onPress,
}: {
  name: string
  subtitle: string
  onPress: () => void
}) {
  return (
    <button type="button" onClick={onPress} className="mb-3 block w-full text-left">
      <h1 className="text-xl font-bold text-gray-900">{name}</h1>
      <p className="text-sm text-gray-600">{subtitle}</p>
    </button>
  )
}

function SpendCarousel({
  page,
  onPageChange,
  monthlySpent,
  totalSpent,
  totalOverallSpent,
}: {
  page: number
  onPageChange: (page: number) => void
  monthlySpent: number
  totalSpent: number
  totalOverallSpent: number
}) {
  const pages = [
    { label: 'Gasto do mês', value: monthlySpent },
    { label: 'Gasto de combustível', value: totalSpent },
    { label: 'Gastos totais', value: totalOverallSpent },
  ]

  function goToPage(index: number) {
    onPageChange((index + pages.length) % pages.length)
  }

  return (
    <Card className="mt-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label={`Ver ${pages[(page - 1 + pages.length) % pages.length].label}`}
          onClick={() => goToPage(page - 1)}
          className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          ‹
        </button>

        <div className="text-center">
          <p className="text-sm text-gray-600">{pages[page].label}</p>
          <p className="font-mono text-3xl font-bold text-gray-900">
            {currencyFormatter.format(pages[page].value)}
          </p>
        </div>

        <button
          type="button"
          aria-label={`Ver ${pages[(page + 1) % pages.length].label}`}
          onClick={() => goToPage(page + 1)}
          className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          ›
        </button>
      </div>

      <div className="mt-2 flex justify-center gap-2">
        {pages.map((p, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Ver ${p.label}`}
            onClick={() => goToPage(index)}
            className={`h-2.5 w-2.5 rounded-full ${
              index === page ? 'bg-green-600' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </Card>
  )
}

function TipOfTheDayCard() {
  return (
    <Card className="mt-6">
      <p className="mb-1 text-sm font-bold text-gray-700">💡 Dica do dia</p>
      <p className="text-sm text-gray-600">{getTipOfTheDay()}</p>
    </Card>
  )
}

function LastRefuelDetailCard({ refuel }: { refuel: Refuel }) {
  const isElectric = refuel.refuelType === 'ELECTRIC'

  return (
    <Card className="mt-6">
      <p className="mb-2 text-sm font-bold text-gray-700">Último abastecimento</p>

      <p className="text-sm text-gray-600">Data</p>
      <p className="mb-2 font-bold text-gray-900">
        {new Date(refuel.refuelDate).toLocaleDateString('pt-BR')}
      </p>

      <p className="text-sm text-gray-600">{isElectric ? 'Energia' : 'Litros'}</p>
      <p className="mb-2 font-mono font-bold text-gray-900">
        {refuel.energyAmount.toFixed(2)} {isElectric ? 'kWh' : 'L'}
      </p>

      <p className="text-sm text-gray-600">Valor pago</p>
      <p className="mb-2 font-mono font-bold text-gray-900">
        {currencyFormatter.format(refuel.totalAmount)}
      </p>

      <p className="text-sm text-gray-600">Preço por litro</p>
      <p className="font-mono text-lg font-bold text-green-700">
        {currencyFormatter.format(refuel.pricePerUnit)}
        {isElectric ? '/kWh' : '/L'}
      </p>
    </Card>
  )
}

function RecentActivityCard({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="mt-6">
      <p className="mb-2 text-sm font-bold text-gray-700">Atividade recente</p>

      {items.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhuma atividade registrada ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-600">
                    {formatActivityDate(item.date)}
                  </p>
                </div>
              </div>
              <p className="font-mono text-sm font-bold text-gray-900">
                {currencyFormatter.format(item.amount)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function Home() {
  const navigate = useNavigate()
  const { activeVehicle } = useVehicle()

  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [refuels, setRefuels] = useState<Refuel[]>([])
  const [events, setEvents] = useState<VehicleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [spendPage, setSpendPage] = useState(0)

  useEffect(() => {
    loadHome()
  }, [activeVehicle?.id])

  async function loadHome() {
    if (!activeVehicle) return

    try {
      setLoading(true)
      setError(false)

      const [dashboardResponse, refuelsResponse, eventsResponse] = await Promise.all([
        authenticatedRequest(`/dashboard/vehicle/${activeVehicle.id}`),
        authenticatedRequest(
          `/refuels/vehicle/${activeVehicle.id}?page=0&size=${MONTHLY_LOOKBACK_SIZE}`
        ),
        authenticatedRequest(
          `/vehicle-events/vehicle/${activeVehicle.id}?page=0&size=${MONTHLY_LOOKBACK_SIZE}`
        ),
      ])

      setDashboard(dashboardResponse)
      setRefuels(refuelsResponse.content)
      setEvents(eventsResponse.content)
    } catch (err) {
      console.log(err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (!activeVehicle || loading) {
    return (
      <Screen centered>
        <Spinner />
      </Screen>
    )
  }

  if (error || !dashboard) {
    return (
      <Screen centered>
        <ErrorState message="Não foi possível carregar o dashboard" />
        <Button fullWidth={false} className="mt-6" onClick={loadHome}>
          Tentar novamente
        </Button>
      </Screen>
    )
  }

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const monthlySpent =
    refuels
      .filter((refuel) => isDateStringInMonth(refuel.refuelDate, currentYear, currentMonth))
      .reduce((sum, refuel) => sum + refuel.totalAmount, 0) +
    events
      .filter((event) => isDateStringInMonth(event.eventDate, currentYear, currentMonth))
      .reduce((sum, event) => sum + event.amount, 0)

  const recentActivity: ActivityItem[] = [
    ...refuels.slice(0, ACTIVITY_FEED_SIZE).map((refuel) => ({
      id: `refuel-${refuel.id}`,
      date: refuel.refuelDate,
      icon: refuel.refuelType === 'ELECTRIC' ? '🔌' : '⛽',
      title: 'Abastecimento',
      amount: refuel.totalAmount,
    })),
    ...events.slice(0, ACTIVITY_FEED_SIZE).map((event) => ({
      id: `event-${event.id}`,
      date: event.eventDate,
      icon: VEHICLE_EVENT_TYPE_ICONS[event.type],
      title: VEHICLE_EVENT_TYPE_LABELS[event.type],
      amount: event.amount,
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, ACTIVITY_FEED_SIZE)

  const lastRefuel = refuels[0] ?? null
  const isFirstUse = dashboard.totalRefuels === 0

  return (
    <Screen wide>
      <VehicleHeader
        name={`${activeVehicle.brand} ${activeVehicle.model}`}
        subtitle={formatLastRefuelSubtitle(dashboard.lastRefuelDate)}
        onPress={() => navigate('/select-vehicle')}
      />

      {isFirstUse ? (
        <Card className="text-center">
          <p className="mb-2 text-4xl">🚗</p>
          <p className="mb-1 text-lg font-bold text-gray-900">Pronto para começar</p>
          <p className="mb-4 text-sm text-gray-600">
            Registre seu primeiro abastecimento para ver o dashboard do seu veículo.
          </p>
          <Button onClick={() => navigate('/refuels/new')}>Registrar abastecimento</Button>
        </Card>
      ) : (
        <>
          <SpendCarousel
            page={spendPage}
            onPageChange={setSpendPage}
            monthlySpent={monthlySpent}
            totalSpent={dashboard.totalSpent}
            totalOverallSpent={dashboard.totalOverallSpent}
          />

          <div className="mt-6 grid grid-cols-2 gap-3">
            {dashboard.energyType !== 'HYBRID' && dashboard.averageConsumption !== null && (
              <MetricCard
                icon="📊"
                label="Consumo médio"
                value={`${dashboard.averageConsumption.toFixed(2)} ${dashboard.consumptionUnit}`}
              />
            )}

            {dashboard.averagePrice !== null && (
              <MetricCard
                icon="💲"
                label="Preço médio"
                value={`${currencyFormatter.format(dashboard.averagePrice)} ${
                  dashboard.priceUnit ?? ''
                }`}
              />
            )}

            <MetricCard
              icon="🛣️"
              label="Odômetro"
              value={
                dashboard.lastOdometer !== null
                  ? `${integerFormatter.format(dashboard.lastOdometer)} km`
                  : '—'
              }
            />

            <MetricCard
              icon="📅"
              label="Último abastecimento"
              value={formatLastRefuelLabel(dashboard.lastRefuelDate)}
            />
          </div>

          {dashboard.energyType === 'HYBRID' && dashboard.breakdown && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              <FuelMetricsCard icon="⛽" title="Combustível" metrics={dashboard.breakdown.fuel} />
              <FuelMetricsCard icon="🔌" title="Elétrico" metrics={dashboard.breakdown.electric} />
            </div>
          )}
        </>
      )}

      <TipOfTheDayCard />

      {!isFirstUse && lastRefuel && <LastRefuelDetailCard refuel={lastRefuel} />}

      {!isFirstUse && <RecentActivityCard items={recentActivity} />}

      <Button className="mt-6" onClick={() => navigate('/refuels/new')}>
        Novo Abastecimento
      </Button>
    </Screen>
  )
}
