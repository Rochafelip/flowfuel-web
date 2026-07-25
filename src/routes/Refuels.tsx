import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import { usePaginatedList } from '../hooks/usePaginatedList'
import type { Refuel } from '../types/Refuel'

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
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-5">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold">Abastecimentos</h1>
        <button
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          onClick={() => navigate('/refuels/new')}
        >
          Novo abastecimento
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600">
          Não foi possível carregar os abastecimentos.
        </p>
      )}

      {items.length === 0 && !error && (
        <p className="text-gray-500">Nenhum abastecimento registrado</p>
      )}

      <ul>
        {items.map((item) => (
          <li key={item.id} className="mb-3 rounded-lg bg-gray-100 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-bold">{formatDateTime(item.refuelDate)}</p>
              {item.fullTank && (
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">
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
                className="text-sm font-bold text-blue-600"
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
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          className="mt-2 w-full rounded-lg bg-gray-200 py-3 text-sm font-bold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
          onClick={loadMore}
          disabled={loading}
        >
          {loading ? 'Carregando...' : 'Carregar mais'}
        </button>
      )}
    </div>
  )
}
