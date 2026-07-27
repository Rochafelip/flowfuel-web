import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useConfirm } from '../../context/ConfirmContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/refuels', label: 'Abastecimentos', icon: '⛽', end: false },
  { to: '/vehicle-events', label: 'Eventos', icon: '🔧', end: false },
  { to: '/export', label: 'Exportar', icon: '📤', end: false },
  { to: '/profile', label: 'Perfil', icon: '👤', end: false },
]

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut } = useAuth()
  const confirm = useConfirm()
  const navigate = useNavigate()

  async function handleLogout() {
    if (!(await confirm('Tem certeza que deseja sair?', 'Sair'))) return
    onNavigate?.()
    await signOut()
    navigate('/login')
  }

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:bg-green-50'
            }`
          }
        >
          <span className="text-base">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}

      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-green-50"
      >
        <span className="text-base">🚪</span>
        Sair
      </button>
    </nav>
  )
}
