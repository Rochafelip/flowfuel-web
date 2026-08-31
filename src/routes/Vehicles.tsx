import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  acceptVehicleShare,
  activateVehicle,
  deleteVehicle,
  getVehicleShare,
  listPendingShares,
  listSharedVehicles,
  listVehicles,
  rejectVehicleShare,
  revokeVehicleShare,
  shareVehicle,
} from '../services/vehicle'
import { ApiError } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import type { Vehicle, VehicleShare } from '../types/Vehicle'
import { Screen } from '../components/ui/Screen'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { Button } from '../components/ui/Button'
import { ShareVehicleDialog } from '../components/ui/ShareVehicleDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { VehiclePhoto } from '../components/ui/VehiclePhoto'

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
  const [shareByVehicleId, setShareByVehicleId] = useState<Record<number, VehicleShare | null>>({})
  const [pendingInvites, setPendingInvites] = useState<VehicleShare[]>([])
  const [sharingVehicle, setSharingVehicle] = useState<Vehicle | null>(null)
  const [shareSubmitting, setShareSubmitting] = useState(false)
  const [shareEmailError, setShareEmailError] = useState<string | null>(null)
  const [shareBusyId, setShareBusyId] = useState<number | null>(null)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    try {
      setLoading(true)
      setError(false)
      const [page, shared, pending] = await Promise.all([
        listVehicles(),
        listSharedVehicles().catch(() => []),
        listPendingShares().catch(() => []),
      ])
      setVehicles(page.content)
      setSharedVehicles(shared)
      setPendingInvites(pending)

      const shareEntries = await Promise.all(
        page.content.map(async (v) => {
          try {
            return [v.id, await getVehicleShare(v.id)] as const
          } catch {
            return [v.id, null] as const
          }
        })
      )
      setShareByVehicleId(Object.fromEntries(shareEntries))
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

  async function handleShareSubmit(vehicle: Vehicle, email: string, durationDays: number) {
    try {
      setShareSubmitting(true)
      setShareEmailError(null)
      await shareVehicle(vehicle.id, email, durationDays)
      setSharingVehicle(null)
      const share = await getVehicleShare(vehicle.id)
      setShareByVehicleId((current) => ({ ...current, [vehicle.id]: share }))
      showToast('Convite enviado.', 'success')
    } catch (err) {
      console.log(err)
      if (err instanceof ApiError && err.fieldErrors.length > 0) {
        const emailError = err.fieldErrors.find((fe) => fe.field === 'inviteeEmail')
        if (emailError) setShareEmailError(emailError.message)
        showToast(err.message)
      } else {
        showToast(err instanceof Error ? err.message : 'Não foi possível compartilhar o veículo')
      }
    } finally {
      setShareSubmitting(false)
    }
  }

  async function handleRevoke(share: VehicleShare) {
    const ok = await confirm(
      `Revogar o compartilhamento com "${share.guestName}"? Esta ação não pode ser desfeita.`
    )
    if (!ok) return

    try {
      setShareBusyId(share.id)
      await revokeVehicleShare(share.id)
      setShareByVehicleId((current) => ({ ...current, [share.vehicleId]: null }))
      showToast('Compartilhamento revogado.', 'success')
    } catch (err) {
      console.log(err)
      showToast(err instanceof Error ? err.message : 'Não foi possível revogar o compartilhamento')
    } finally {
      setShareBusyId(null)
    }
  }

  async function handleAcceptInvite(share: VehicleShare) {
    try {
      setShareBusyId(share.id)
      await acceptVehicleShare(share.id)
      await load()
      showToast('Convite aceito.', 'success')
    } catch (err) {
      console.log(err)
      showToast(err instanceof Error ? err.message : 'Não foi possível aceitar o convite')
    } finally {
      setShareBusyId(null)
    }
  }

  async function handleRejectInvite(share: VehicleShare) {
    try {
      setShareBusyId(share.id)
      await rejectVehicleShare(share.id)
      await load()
      showToast('Convite rejeitado.', 'success')
    } catch (err) {
      console.log(err)
      showToast(err instanceof Error ? err.message : 'Não foi possível rejeitar o convite')
    } finally {
      setShareBusyId(null)
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
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Meus veículos</h1>
        <Button fullWidth={false} className="text-sm" onClick={() => navigate('/vehicles/new')}>
          Novo veículo
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <EmptyState
          icon="🚗"
          title="Nenhum veículo cadastrado"
          description="Cadastre seu primeiro veículo para começar a acompanhar abastecimentos e gastos."
          actionLabel="Novo veículo"
          onAction={() => navigate('/vehicles/new')}
        />
      ) : (
        <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
          {vehicles.map((vehicle) => {
            const isActive = activeVehicle?.id === vehicle.id
            const isBusy = busyId === vehicle.id

            return (
              <li key={vehicle.id}>
                <Card interactive>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <VehiclePhoto path={vehicle.photo} size="lg" />
                      <p className="font-bold text-gray-900 dark:text-gray-100">
                        {vehicle.brand} {vehicle.model}
                      </p>
                    </div>
                    {isActive && (
                      <span className="rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-xs font-bold text-green-700 dark:text-green-400">
                        Ativo
                      </span>
                    )}
                  </div>

                  <p className="text-gray-900 dark:text-gray-100">Placa: {vehicle.licensePlate || '—'}</p>
                  <p className="text-gray-900 dark:text-gray-100">Odômetro: {formatKm(vehicle.currentKm)}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {!isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        fullWidth={false}
                        disabled={isBusy}
                        onClick={() => handleActivate(vehicle.id)}
                      >
                        Definir como ativo
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      fullWidth={false}
                      disabled={isBusy}
                      onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost-danger"
                      size="sm"
                      fullWidth={false}
                      disabled={isBusy}
                      onClick={() => handleDelete(vehicle)}
                    >
                      Excluir
                    </Button>
                  </div>

                  {(() => {
                    const share = shareByVehicleId[vehicle.id]
                    const isShareBusy = shareBusyId === share?.id

                    if (!share) {
                      return (
                        <div className="mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            fullWidth={false}
                            onClick={() => {
                              setShareEmailError(null)
                              setSharingVehicle(vehicle)
                            }}
                          >
                            Compartilhar
                          </Button>
                        </div>
                      )
                    }

                    return (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                          {share.status === 'PENDING'
                            ? `Convite enviado para ${share.guestName ?? 'convidado'}`
                            : `Compartilhado com ${share.guestName}`}
                        </span>
                        <Button
                          variant="ghost-danger"
                          size="sm"
                          fullWidth={false}
                          disabled={isShareBusy}
                          onClick={() => handleRevoke(share)}
                        >
                          Revogar
                        </Button>
                      </div>
                    )
                  })()}
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {pendingInvites.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-gray-100">Convites pendentes</h2>
          <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
            {pendingInvites.map((invite) => {
              const isInviteBusy = shareBusyId === invite.id

              return (
                <li key={invite.id}>
                  <Card interactive>
                    <p className="font-bold text-gray-900 dark:text-gray-100">
                      {invite.vehicleBrand} {invite.vehicleModel}
                    </p>
                    <p className="text-gray-900 dark:text-gray-100">De: {invite.ownerName}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        fullWidth={false}
                        disabled={isInviteBusy}
                        onClick={() => handleAcceptInvite(invite)}
                      >
                        Aceitar
                      </Button>
                      <Button
                        variant="ghost-danger"
                        size="sm"
                        fullWidth={false}
                        disabled={isInviteBusy}
                        onClick={() => handleRejectInvite(invite)}
                      >
                        Rejeitar
                      </Button>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {sharedVehicles.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-gray-100">Compartilhados comigo</h2>
          <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
            {sharedVehicles.map((share) => (
              <li key={share.id}>
                <Card interactive>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-bold text-gray-900 dark:text-gray-100">
                      {share.vehicleBrand} {share.vehicleModel}
                    </p>
                    <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                      Emprestado
                    </span>
                  </div>
                  <p className="text-gray-900 dark:text-gray-100">Compartilhado por: {share.ownerName}</p>
                  {share.expiresAt && <p className="text-gray-900 dark:text-gray-100">Até: {formatDate(share.expiresAt)}</p>}
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sharingVehicle && (
        <ShareVehicleDialog
          vehicle={sharingVehicle}
          submitting={shareSubmitting}
          emailError={shareEmailError}
          onConfirm={(email, durationDays) => handleShareSubmit(sharingVehicle, email, durationDays)}
          onDismiss={() => setSharingVehicle(null)}
        />
      )}
    </Screen>
  )
}
