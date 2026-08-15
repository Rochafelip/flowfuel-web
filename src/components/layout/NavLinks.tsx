import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useConfirm } from '../../context/ConfirmContext'
import { decodeUserIdFromToken } from '../../lib/jwt'
import { getProfileRequest } from '../../services/profile'
import { UserAvatar } from '../ui/UserAvatar'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/refuels', label: 'Abastecimentos', icon: '⛽', end: false },
  { to: '/vehicle-events', label: 'Eventos', icon: '🔧', end: false },
  { to: '/stations', label: 'Postos', icon: '📍', end: false },
  { to: '/export', label: 'Exportar', icon: '📤', end: false },
  { to: '/profile', label: 'Perfil', icon: '👤', end: false },
]

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { token, signOut } = useAuth()
  const confirm = useConfirm()
  const navigate = useNavigate()

  const [userName, setUserName] = useState<string | null>(null)
  const [userPhoto, setUserPhoto] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    const userId = decodeUserIdFromToken(token)
    if (!userId) return

    getProfileRequest(userId)
      .then((profile) => {
        setUserName(profile.name ?? profile.email)
        setUserPhoto(profile.profilePicture)
      })
      .catch((err) => console.log(err))
  }, [token])

  async function handleLogout() {
    if (!(await confirm('Tem certeza que deseja sair?', 'Sair'))) return
    onNavigate?.()
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 ${
                isActive
                  ? 'border-green-600 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-gray-950'
              }`
            }
          >
            {item.to === '/profile' ? (
              <UserAvatar path={userPhoto} name={userName ?? '?'} size="sm" />
            ) : (
              <span className="text-base">{item.icon}</span>
            )}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-gray-100 dark:border-gray-700 pt-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          <span className="text-base">🚪</span>
          Sair
        </button>
      </div>
    </div>
  )
}
