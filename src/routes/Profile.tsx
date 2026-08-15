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
import { useTheme } from '../context/ThemeContext'

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
      showToast(err instanceof Error ? err.message : 'Não foi possível enviar a foto')
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
      showToast(err instanceof Error ? err.message : 'Não foi possível remover a foto')
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
      showToast(err instanceof Error ? err.message : 'Não foi possível excluir a conta')
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
          <p className="text-gray-600 dark:text-gray-400">Não foi possível carregar seu perfil.</p>
          <Button onClick={load} className="w-auto px-4">
            Tentar novamente
          </Button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen wide>
      <h1 className="mb-6 text-center text-2xl font-bold text-gray-900 dark:text-gray-100 lg:text-left">Perfil</h1>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[220px_1fr] lg:items-start lg:gap-8">
        <div className="flex flex-col items-center gap-4">
          <label className="relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-gray-400 dark:text-gray-500">
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
              className="text-sm font-bold text-red-600 dark:text-red-400 disabled:opacity-60"
            >
              {isDeletingPhoto ? 'Removendo...' : 'Remover foto'}
            </button>
          )}

          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{profile.name ?? profile.email}</p>

          <div className="flex w-full justify-evenly">
            <StatItem count={stats?.vehiclesCount} label="Veículos" />
            <StatItem count={stats?.refuelsCount} label="Abastecimentos" />
            <StatItem count={stats?.eventsCount} label="Eventos" />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm">
            <InfoField label="Email" value={profile.email} />
            <InfoField label="Telefone" value={profile.phone ?? 'Não informado'} />
            {profile.createdAt && (
              <InfoField
                label="Membro desde"
                value={new Date(profile.createdAt).toLocaleDateString('pt-BR')}
              />
            )}
          </div>

          <AppearanceCard />

          <div className="flex flex-col overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-sm">
            <ActionRow label="Meus veículos" onClick={() => navigate('/vehicles')} />
            <div className="border-t border-gray-100 dark:border-gray-700" />
            <ActionRow label="Editar perfil" onClick={() => navigate('/profile/edit')} />
            <div className="border-t border-gray-100 dark:border-gray-700" />
            <ActionRow label="Trocar senha" onClick={() => navigate('/profile/change-password')} />
          </div>

          <Button onClick={handleLogout} fullWidth={false} className="lg:self-start">
            Sair
          </Button>

          <div className="flex flex-col gap-3 rounded-xl border border-red-200 dark:border-red-800 p-4">
            <p className="text-center text-sm font-bold text-red-600 dark:text-red-400 lg:text-left">Zona de Perigo</p>
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
      <p className="text-xl font-bold text-green-700 dark:text-green-400">{count ?? '–'}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-500">{label}</p>
      <p className="text-base text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  )
}

function ActionRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between px-4 py-3 text-left text-base text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
    >
      {label}
      <span className="text-gray-400 dark:text-gray-500">›</span>
    </button>
  )
}

function AppearanceCard() {
  const { theme, setTheme } = useTheme()
  const options: { value: 'light' | 'dark' | 'system'; label: string }[] = [
    { value: 'light', label: 'Claro' },
    { value: 'dark', label: 'Escuro' },
    { value: 'system', label: 'Sistema' },
  ]

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Aparência</p>
      <div className="flex rounded-lg border border-gray-300 p-1 dark:border-gray-600">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={`flex-1 rounded-md py-2 text-sm font-bold transition-colors ${
              theme === option.value
                ? 'bg-green-600 text-white'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
