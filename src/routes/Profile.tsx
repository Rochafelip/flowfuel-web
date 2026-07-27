import { useEffect, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import { useAuthenticatedImage } from '../hooks/useAuthenticatedImage'
import { decodeUserIdFromToken } from '../lib/jwt'
import {
  deleteAccountRequest,
  deleteProfilePictureRequest,
  getProfileRequest,
  getProfileStats,
  uploadProfilePictureRequest,
  type ProfileStats,
  type UserProfile,
} from '../services/profile'
import { Screen } from '../components/ui/Screen'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { DeleteAccountDialog } from '../components/ui/DeleteAccountDialog'

export function Profile() {
  const { token, signOut } = useAuth()
  const confirm = useConfirm()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const userId = token ? decodeUserIdFromToken(token) : null

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const avatarUrl = useAuthenticatedImage(profile?.profilePicture ?? null)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    if (!userId) {
      setError(true)
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(false)
      const data = await getProfileRequest(userId)
      setProfile(data)
    } catch (err) {
      console.log(err)
      setError(true)
    } finally {
      setLoading(false)
    }
    getProfileStats()
      .then(setStats)
      .catch((err) => console.log(err))
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setIsUploadingPhoto(true)
    try {
      await uploadProfilePictureRequest(userId, file)
      await load()
    } catch (err) {
      console.log(err)
      showToast('Não foi possível enviar a foto')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  async function handleDeletePhoto() {
    if (!userId) return
    if (!(await confirm('Remover foto do perfil?', 'Remover'))) return

    setIsDeletingPhoto(true)
    try {
      await deleteProfilePictureRequest(userId)
      await load()
    } catch (err) {
      console.log(err)
      showToast('Não foi possível remover a foto')
    } finally {
      setIsDeletingPhoto(false)
    }
  }

  async function handleLogout() {
    if (!(await confirm('Tem certeza que deseja sair?', 'Sair'))) return
    await signOut()
    navigate('/login')
  }

  async function handleDeleteAccountConfirmed() {
    if (!userId) return
    setShowDeleteDialog(false)
    setIsDeletingAccount(true)
    try {
      await deleteAccountRequest(userId)
      await signOut()
      navigate('/login')
    } catch (err) {
      console.log(err)
      showToast('Não foi possível excluir a conta')
      setIsDeletingAccount(false)
    }
  }

  if (loading) {
    return (
      <Screen centered>
        <Spinner />
      </Screen>
    )
  }

  if (error || !profile) {
    return (
      <Screen centered>
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-600">Não foi possível carregar seu perfil.</p>
          <Button onClick={load} className="w-auto px-4">
            Tentar novamente
          </Button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen wide>
      <h1 className="mb-6 text-center text-2xl font-bold text-gray-900 lg:text-left">Perfil</h1>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[220px_1fr] lg:items-start lg:gap-8">
        <div className="flex flex-col items-center gap-4">
          <label className="relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-gray-300 bg-gray-50">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-gray-400">
                {(profile.name ?? profile.email).charAt(0).toUpperCase()}
              </span>
            )}
            {isUploadingPhoto && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Spinner />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
              disabled={isUploadingPhoto || isDeletingPhoto}
            />
          </label>

          {profile.profilePicture && (
            <button
              type="button"
              onClick={handleDeletePhoto}
              disabled={isDeletingPhoto || isUploadingPhoto}
              className="text-sm font-bold text-red-600 disabled:opacity-60"
            >
              {isDeletingPhoto ? 'Removendo...' : 'Remover foto'}
            </button>
          )}

          <p className="text-lg font-bold text-gray-900">{profile.name ?? profile.email}</p>

          <div className="flex w-full justify-evenly">
            <StatItem count={stats?.vehiclesCount} label="Veículos" />
            <StatItem count={stats?.refuelsCount} label="Abastecimentos" />
            <StatItem count={stats?.eventsCount} label="Eventos" />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
            <InfoField label="Email" value={profile.email} />
            <InfoField label="Telefone" value={profile.phone ?? 'Não informado'} />
            {profile.createdAt && (
              <InfoField
                label="Membro desde"
                value={new Date(profile.createdAt).toLocaleDateString('pt-BR')}
              />
            )}
          </div>

          <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm">
            <ActionRow label="Editar perfil" onClick={() => navigate('/profile/edit')} />
            <div className="border-t border-gray-100" />
            <ActionRow label="Trocar senha" onClick={() => navigate('/profile/change-password')} />
          </div>

          <Button onClick={handleLogout} fullWidth={false} className="lg:self-start">
            Sair
          </Button>

          <div className="flex flex-col gap-3 rounded-xl border border-red-200 p-4">
            <p className="text-center text-sm font-bold text-red-600 lg:text-left">Zona de Perigo</p>
            <Button
              variant="danger"
              fullWidth={false}
              className="lg:self-start"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeletingAccount}
            >
              {isDeletingAccount ? 'Excluindo...' : 'Excluir conta permanentemente'}
            </Button>
          </div>
        </div>
      </div>

      {showDeleteDialog && (
        <DeleteAccountDialog
          onConfirm={handleDeleteAccountConfirmed}
          onDismiss={() => setShowDeleteDialog(false)}
        />
      )}
    </Screen>
  )
}

function StatItem({ count, label }: { count: number | undefined; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-xl font-bold text-green-700">{count ?? '–'}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-500">{label}</p>
      <p className="text-base text-gray-900">{value}</p>
    </div>
  )
}

function ActionRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between px-4 py-3 text-left text-base text-gray-900 hover:bg-gray-50"
    >
      {label}
      <span className="text-gray-400">›</span>
    </button>
  )
}
