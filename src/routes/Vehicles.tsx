import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  activateVehicle,
  deleteVehicle,
  listSharedVehicles,
  listVehicles,
} from '../services/vehicle'
import { useVehicle } from '../context/VehicleContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import type { Vehicle, VehicleShare } from '../types/Vehicle'
import { Screen } from '../components/ui/Screen'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { Button } from '../components/ui/Button'

function formatKm(km: number) {
  return `${km.toLocaleString('pt-BR')} km`
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

export function Vehicles() {
  const navigate = useNavigate()
  const { activeVehicle, loadActiveVehicle } = useVehicle()
  const { showToast } = useToast()
  const confirm = useConfirm()

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [sharedVehicles, setSharedVehicles] = useState<VehicleShare[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    try {
      setLoading(true)
      setError(false)
      const [page, shared] = await Promise.all([
        listVehicles(),
        listSharedVehicles().catch(() => []),
      ])
      setVehicles(page.content)
      setSharedVehicles(shared)
    } catch (err) {
      console.log(err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleActivate(id: number) {
    try {
      setBusyId(id)
      await activateVehicle(id)
      await loadActiveVehicle()
      showToast('Veículo ativado.', 'success')
    } catch (err) {
      console.log(err)
      showToast(err instanceof Error ? err.message : 'Não foi possível ativar o veículo')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(vehicle: Vehicle) {
    const ok = await confirm(
      `Excluir "${vehicle.brand} ${vehicle.model}"? Esta ação não pode ser desfeita.`
    )
    if (!ok) return

    try {
      setBusyId(vehicle.id)
      await deleteVehicle(vehicle.id)
      await load()
      if (activeVehicle?.id === vehicle.id) {
        await loadActiveVehicle()
      }
      showToast('Veículo excluído.', 'success')
    } catch (err) {
      console.log(err)
      showToast(err instanceof Error ? err.message : 'Não foi possível excluir o veículo')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <Screen centered>
        <Spinner />
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen centered>
        <div className="flex flex-col items-center gap-4">
          <ErrorState message="Não foi possível carregar seus veículos." />
          <Button fullWidth={false} onClick={load}>
            Tentar novamente
          </Button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen wide>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold">Meus veículos</h1>
        <Button fullWidth={false} className="text-sm" onClick={() => navigate('/vehicles/new')}>
          Novo veículo
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <p className="text-gray-600">Nenhum veículo cadastrado</p>
      ) : (
        <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
          {vehicles.map((vehicle) => {
            const isActive = activeVehicle?.id === vehicle.id
            const isBusy = busyId === vehicle.id

            return (
              <li key={vehicle.id}>
                <Card>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-bold">
                      {vehicle.brand} {vehicle.model}
                    </p>
                    {isActive && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                        Ativo
                      </span>
                    )}
                  </div>

                  <p>Placa: {vehicle.licensePlate || '—'}</p>
                  <p>Odômetro: {formatKm(vehicle.currentKm)}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {!isActive && (
                      <button
                        className="rounded-md px-2 py-3 text-sm font-bold text-green-700 disabled:opacity-50 active:bg-green-50"
                        disabled={isBusy}
                        onClick={() => handleActivate(vehicle.id)}
                      >
                        Definir como ativo
                      </button>
                    )}
                    <button
                      className="rounded-md px-2 py-3 text-sm font-bold text-green-700 disabled:opacity-50 active:bg-green-50"
                      disabled={isBusy}
                      onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
                    >
                      Editar
                    </button>
                    <button
                      className="rounded-md px-2 py-3 text-sm font-bold text-red-600 disabled:opacity-50 active:bg-red-50"
                      disabled={isBusy}
                      onClick={() => handleDelete(vehicle)}
                    >
                      Excluir
                    </button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {sharedVehicles.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-bold">Compartilhados comigo</h2>
          <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
            {sharedVehicles.map((share) => (
              <li key={share.id}>
                <Card>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-bold">
                      {share.vehicleBrand} {share.vehicleModel}
                    </p>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                      Emprestado
                    </span>
                  </div>
                  <p>Compartilhado por: {share.ownerName}</p>
                  {share.expiresAt && <p>Até: {formatDate(share.expiresAt)}</p>}
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Screen>
  )
}
