import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import { usePaginatedList } from '../hooks/usePaginatedList'
import type { Refuel } from '../types/Refuel'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
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
  const { showToast } = useToast()
  const confirm = useConfirm()

  const { items, loading, error, hasMore, loadMore, reload } =
    usePaginatedList<Refuel>(
      activeVehicle ? `/refuels/vehicle/${activeVehicle.id}` : null
    )

  async function handleDelete(id: number) {
    if (!(await confirm('Excluir este abastecimento?'))) return

    try {
      setDeletingId(id)
      await authenticatedRequest(`/refuels/${id}`, { method: 'DELETE' })
      await reload()
      showToast('Abastecimento excluído.', 'success')
    } catch (err) {
      console.log(err)
      showToast(err instanceof Error ? err.message : 'Erro ao excluir abastecimento')
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
        <Button fullWidth={false} className="text-sm" onClick={() => navigate('/refuels/new')}>
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

              {item.kmSinceLastRefuel !== null && (
                <p className="mb-2 text-sm text-gray-600">
                  +{item.kmSinceLastRefuel} km desde o último
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-600">Odômetro</p>
                  <p className="font-mono font-bold text-gray-900">{item.odometer} km</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Quantidade</p>
                  <p className="font-mono font-bold text-gray-900">
                    {item.energyAmount} {item.refuelType === 'FUEL' ? 'L' : 'kWh'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Preço</p>
                  <p className="font-mono font-bold text-gray-900">
                    {currencyFormatter.format(item.pricePerUnit)}
                    {item.refuelType === 'FUEL' ? '/L' : '/kWh'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="font-mono font-bold text-green-700">
                    {currencyFormatter.format(item.totalAmount)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Link
                  to={`/refuels/${item.id}/edit`}
                  className="rounded-md px-2 py-3 text-sm font-bold text-green-700 active:bg-green-50"
                >
                  Editar
                </Link>
                <button
                  className="rounded-md px-2 py-3 text-sm font-bold text-red-600 disabled:opacity-50 active:bg-red-50"
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
          className="mx-auto mt-3 block w-auto rounded-lg bg-gray-200 px-6 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-300 disabled:opacity-50"
          onClick={loadMore}
          disabled={loading}
        >
          {loading ? 'Carregando...' : 'Carregar mais'}
        </button>
      )}
    </Screen>
  )
}
