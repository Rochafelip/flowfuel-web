import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
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
      <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white p-4 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-lg font-bold text-green-700">⛽ FlowFuel</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-700 hover:bg-green-50"
          >
            ✕
          </button>
        </div>
        <NavLinks onNavigate={onClose} />
      </div>
    </div>
  )
}
