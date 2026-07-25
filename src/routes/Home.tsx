import { useEffect, useState } from 'react'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import type { Dashboard, FuelMetrics } from '../types/Dashboard'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const integerFormatter = new Intl.NumberFormat('pt-BR')

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-100 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  )
}

function FuelMetricsCard({
  title,
  metrics,
}: {
  title: string
  metrics: FuelMetrics
}) {
  return (
    <div className="rounded-lg bg-gray-100 p-4">
      <p className="mb-2 text-sm font-bold text-gray-700">{title}</p>

      <p className="text-sm text-gray-500">Consumo médio</p>
      <p className="mb-2 font-bold text-gray-900">
        {metrics.averageConsumption.toFixed(2)} {metrics.consumptionUnit}
      </p>

      <p className="text-sm text-gray-500">Preço médio</p>
      <p className="mb-2 font-bold text-gray-900">
        {currencyFormatter.format(metrics.averagePrice)} {metrics.priceUnit}
      </p>

      <p className="text-sm text-gray-500">Total gasto</p>
      <p className="font-bold text-gray-900">
        {currencyFormatter.format(metrics.totalSpent)}
      </p>
    </div>
  )
}

export function Home() {
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
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    )
  }

  if (error || !dashboard) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Não foi possível carregar o dashboard</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-5">
      <h1 className="mb-5 text-xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3">
        <Card
          label="Total gasto"
          value={currencyFormatter.format(dashboard.totalSpent)}
        />

        <Card
          label="Custo por km"
          value={`${currencyFormatter.format(dashboard.costPerKm)}/km`}
        />

        <Card
          label="Total de abastecimentos"
          value={integerFormatter.format(dashboard.totalRefuels)}
        />

        <Card
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
            <Card
              label="Consumo médio"
              value={`${dashboard.averageConsumption.toFixed(2)} ${
                dashboard.consumptionUnit
              }`}
            />
          )}
      </div>

      {dashboard.energyType === 'HYBRID' && dashboard.breakdown && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <FuelMetricsCard title="Combustível" metrics={dashboard.breakdown.fuel} />
          <FuelMetricsCard title="Elétrico" metrics={dashboard.breakdown.electric} />
        </div>
      )}
    </div>
  )
}
