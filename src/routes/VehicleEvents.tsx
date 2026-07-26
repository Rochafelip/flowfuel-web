import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import { usePaginatedList } from '../hooks/usePaginatedList'
import {
  VEHICLE_EVENT_TYPE_LABELS,
  type VehicleEvent,
} from '../types/VehicleEvent'
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

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}...` : text
}

export function VehicleEvents() {
  const { activeVehicle } = useVehicle()
  const navigate = useNavigate()
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const { showToast } = useToast()
  const confirm = useConfirm()

  const { items, loading, error, hasMore, loadMore, reload } =
    usePaginatedList<VehicleEvent>(
      activeVehicle ? `/vehicle-events/vehicle/${activeVehicle.id}` : null
    )

  async function handleDelete(id: number) {
    if (!(await confirm('Excluir este evento?'))) return

    try {
      setDeletingId(id)
      await authenticatedRequest(`/vehicle-events/${id}`, { method: 'DELETE' })
      await reload()
      showToast('Evento excluído.', 'success')
    } catch (err) {
      console.log(err)
      showToast('Erro ao excluir evento')
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
        <h1 className="text-xl font-bold">Eventos</h1>
        <Button
          className="w-auto px-4 text-sm"
          onClick={() => navigate('/vehicle-events/new')}
        >
          Novo evento
        </Button>
      </div>

      {error && <ErrorState message="Não foi possível carregar os eventos." />}

      {items.length === 0 && !error && (
        <p className="text-gray-600">Nenhum evento registrado</p>
      )}

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-bold">{VEHICLE_EVENT_TYPE_LABELS[item.type]}</p>
                <p className="text-sm text-gray-600">{formatDate(item.eventDate)}</p>
              </div>

              <p className="font-bold">{currencyFormatter.format(item.amount)}</p>
              {item.odometer !== null && <p>Odômetro: {item.odometer} km</p>}
              {item.description && <p>{truncate(item.description, 100)}</p>}

              <div className="mt-3 flex items-center gap-2">
                <Link
                  to={`/vehicle-events/${item.id}/edit`}
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
