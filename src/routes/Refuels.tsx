import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import { usePaginatedList } from '../hooks/usePaginatedList'
import type { Refuel } from '../types/Refuel'
import { Screen } from '../components/ui/Screen'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { Button } from '../components/ui/Button'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('pt-BR')
}

export function Refuels() {
  const { activeVehicle } = useVehicle()
  const navigate = useNavigate()
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const { items, loading, error, hasMore, loadMore, reload } =
    usePaginatedList<Refuel>(
      activeVehicle ? `/refuels/vehicle/${activeVehicle.id}` : null
    )

  async function handleDelete(id: number) {
    if (!confirm('Excluir este abastecimento?')) return

    try {
      setDeletingId(id)
      await authenticatedRequest(`/refuels/${id}`, { method: 'DELETE' })
      await reload()
    } catch (err) {
      console.log(err)
      alert('Erro ao excluir abastecimento')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading && items.length === 0) {
    return (
      <Screen centered>
        <Spinner />
      </Screen>
    )
  }

  return (
    <Screen wide>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold">Abastecimentos</h1>
        <Button
          className="w-auto px-4 text-sm"
          onClick={() => navigate('/refuels/new')}
        >
          Novo abastecimento
        </Button>
      </div>

      {error && <ErrorState message="Não foi possível carregar os abastecimentos." />}

      {items.length === 0 && !error && (
        <p className="text-gray-600">Nenhum abastecimento registrado</p>
      )}

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-bold">{formatDateTime(item.refuelDate)}</p>
                {item.fullTank && (
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
                    Tanque cheio
                  </span>
                )}
              </div>

              <p>Odômetro: {item.odometer} km</p>
              {item.kmSinceLastRefuel !== null && (
                <p>+{item.kmSinceLastRefuel} km desde o último</p>
              )}
              <p>
                Quantidade: {item.energyAmount}{' '}
                {item.refuelType === 'FUEL' ? 'L' : 'kWh'}
              </p>
              <p>
                Preço: {currencyFormatter.format(item.pricePerUnit)}
                {item.refuelType === 'FUEL' ? '/L' : '/kWh'}
              </p>
              <p className="font-bold">
                Total: {currencyFormatter.format(item.totalAmount)}
              </p>

              <div className="mt-3 flex gap-3">
                <Link
                  to={`/refuels/${item.id}/edit`}
                  className="text-sm font-bold text-green-700"
                >
                  Editar
                </Link>
                <button
                  className="text-sm font-bold text-red-600 disabled:opacity-50"
                  disabled={deletingId === item.id}
                  onClick={() => handleDelete(item.id)}
                >
                  Excluir
                </button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          className="mt-3 w-full rounded-lg bg-gray-200 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-300 disabled:opacity-50"
          onClick={loadMore}
          disabled={loading}
        >
          {loading ? 'Carregando...' : 'Carregar mais'}
        </button>
      )}
    </Screen>
  )
}
