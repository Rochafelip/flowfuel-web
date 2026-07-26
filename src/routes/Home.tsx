import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import type { Dashboard, FuelMetrics } from '../types/Dashboard'
import { Screen } from '../components/ui/Screen'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { Button } from '../components/ui/Button'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const integerFormatter = new Intl.NumberFormat('pt-BR')

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
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
      <p className="text-lg font-bold text-gray-900">{value}</p>
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
      <p className="mb-2 font-bold text-gray-900">
        {metrics.averageConsumption.toFixed(2)} {metrics.consumptionUnit}
      </p>

      <p className="text-sm text-gray-600">Preço médio</p>
      <p className="mb-2 font-bold text-gray-900">
        {currencyFormatter.format(metrics.averagePrice)} {metrics.priceUnit}
      </p>

      <p className="text-sm text-gray-600">Total gasto</p>
      <p className="font-bold text-gray-900">
        {currencyFormatter.format(metrics.totalSpent)}
      </p>
    </Card>
  )
}

export function Home() {
  const navigate = useNavigate()
  const { activeVehicle } = useVehicle()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [activeVehicle?.id])

  async function loadDashboard() {
    if (!activeVehicle) return

    try {
      setLoading(true)
      setError(false)
      const response = await authenticatedRequest(
        `/dashboard/vehicle/${activeVehicle.id}`
      )
      setDashboard(response)
    } catch (err) {
      console.log(err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
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
      </Screen>
    )
  }

  return (
    <Screen>
      <h1 className="mb-5 text-xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon="💰"
          label="Total gasto"
          value={currencyFormatter.format(dashboard.totalSpent)}
        />

        <MetricCard
          icon="⛽"
          label="Custo por km"
          value={`${currencyFormatter.format(dashboard.costPerKm)}/km`}
        />

        <MetricCard
          icon="🧾"
          label="Total de abastecimentos"
          value={integerFormatter.format(dashboard.totalRefuels)}
        />

        <MetricCard
          icon="📅"
          label="Último abastecimento"
          value={
            dashboard.lastRefuelDate
              ? `${formatDate(dashboard.lastRefuelDate)} · ${integerFormatter.format(
                  dashboard.lastOdometer ?? 0
                )} km`
              : 'Nenhum abastecimento ainda'
          }
        />

        {dashboard.energyType !== 'HYBRID' &&
          dashboard.averageConsumption !== null && (
            <MetricCard
              icon="📊"
              label="Consumo médio"
              value={`${dashboard.averageConsumption.toFixed(2)} ${
                dashboard.consumptionUnit
              }`}
            />
          )}
      </div>

      {dashboard.energyType === 'HYBRID' && dashboard.breakdown && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <FuelMetricsCard icon="⛽" title="Combustível" metrics={dashboard.breakdown.fuel} />
          <FuelMetricsCard icon="🔌" title="Elétrico" metrics={dashboard.breakdown.electric} />
        </div>
      )}

      <Button className="mt-5" onClick={() => navigate('/refuels/new')}>
        Novo Abastecimento
      </Button>

      <button
        type="button"
        onClick={() => navigate('/refuels')}
        className="mt-3 block w-full text-center text-sm text-green-700"
      >
        Ver histórico de abastecimentos
      </button>
    </Screen>
  )
}
