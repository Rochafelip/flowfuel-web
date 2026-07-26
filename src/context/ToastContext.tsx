import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

export type ToastVariant = 'success' | 'error'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
  leaving: boolean
}

interface ToastContextData {
  toasts: Toast[]
  showToast: (message: string, variant?: ToastVariant) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData)

const MAX_TOASTS = 3
const TOAST_DURATION_MS = 4000
const EXIT_DURATION_MS = 200

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const dismissToast = useCallback(
    (id: string) => {
      setToasts((current) =>
        current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast))
      )
      setTimeout(() => removeToast(id), EXIT_DURATION_MS)
    },
    [removeToast]
  )

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'error') => {
      const id = String(nextId.current++)
      setToasts((current) => {
        const next = [...current, { id, message, variant, leaving: false }]
        return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next
      })
      setTimeout(() => dismissToast(id), TOAST_DURATION_MS)
    },
    [dismissToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
