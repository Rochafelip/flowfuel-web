import { useEffect, useState } from 'react'
import { useToast, type Toast } from '../../context/ToastContext'

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast
  onDismiss: (id: string) => void
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const shown = visible && !toast.leaving
  const isError = toast.variant === 'error'

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-white shadow-lg transition-all duration-200 motion-reduce:transition-none motion-reduce:duration-0 ${
        isError ? 'bg-red-600' : 'bg-green-600'
      } ${shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
    >
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Fechar notificação"
        className="text-lg leading-none text-white/80 hover:text-white"
      >
        ×
      </button>
    </div>
  )
}

export function ToastContainer() {
  const { toasts, dismissToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  )
}
