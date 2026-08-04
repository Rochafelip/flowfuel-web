import { useServerStatus } from '../../services/serverStatus'

export function ServerStatusBanner() {
  const { visible, dismiss } = useServerStatus()

  if (!visible) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 bg-red-600 px-4 py-2 text-sm font-medium text-white"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      <p>Não foi possível conectar ao servidor. Tente novamente mais tarde.</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar aviso"
        className="text-lg leading-none text-white/80 hover:text-white"
      >
        ×
      </button>
    </div>
  )
}
