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
import { Button, ghostButtonClasses, ghostDangerButtonClasses } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'

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
      showToast(err instanceof Error ? err.message : 'Erro ao excluir evento')
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
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Eventos</h1>
        <Button fullWidth={false} className="text-sm" onClick={() => navigate('/vehicle-events/new')}>
          Novo evento
        </Button>
      </div>

      {error && <ErrorState message="Não foi possível carregar os eventos." />}

      {items.length === 0 && !error && (
        <EmptyState
          icon="🧾"
          title="Nenhum evento ainda"
          description="Registre manutenções, seguros e outros gastos do seu veículo."
          actionLabel="Novo evento"
          onAction={() => navigate('/vehicle-events/new')}
        />
      )}

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <Card interactive>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-bold">{VEHICLE_EVENT_TYPE_LABELS[item.type]}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(item.eventDate)}</p>
              </div>

              <p className="font-bold">{currencyFormatter.format(item.amount)}</p>
              {item.odometer !== null && <p className="text-gray-900 dark:text-gray-100">Odômetro: {item.odometer} km</p>}
              {item.description && <p className="text-gray-900 dark:text-gray-100">{truncate(item.description, 100)}</p>}

              <div className="mt-3 flex items-center gap-2">
                <Link to={`/vehicle-events/${item.id}/edit`} className={ghostButtonClasses}>
                  ✏️ Editar
                </Link>
                <button
                  type="button"
                  className={ghostDangerButtonClasses}
                  disabled={deletingId === item.id}
                  onClick={() => handleDelete(item.id)}
                >
                  🗑️ Excluir
                </button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          className="mx-auto mt-3 block w-auto rounded-lg bg-gray-200 dark:bg-gray-700 px-6 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          onClick={loadMore}
          disabled={loading}
        >
          {loading ? 'Carregando...' : 'Carregar mais'}
        </button>
      )}
    </Screen>
  )
}
