import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { NavLinks } from './NavLinks'

export function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const location = useLocation()

  useEffect(() => {
    onClose()
  }, [location.pathname])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-20 lg:hidden">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-gray-800 p-4 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-lg font-bold text-green-700 dark:text-green-400 transition-colors hover:bg-green-50 dark:hover:bg-gray-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            ⛽ FlowFuel
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            ✕
          </button>
        </div>
        <NavLinks onNavigate={onClose} />
      </div>
    </div>
  )
}
