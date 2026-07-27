import { useEffect, useRef } from 'react'
import { useConfirmRequest } from '../../context/ConfirmContext'

export function ConfirmDialog() {
  const { request, resolveRequest } = useConfirmRequest()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const triggerElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!request) return

    triggerElementRef.current = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') resolveRequest(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      triggerElementRef.current?.focus()
    }
  }, [request, resolveRequest])

  if (!request) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => resolveRequest(false)}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={request.message}
        className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
      >
        <p className="mb-6 text-base text-gray-900">{request.message}</p>
        <div className="flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => resolveRequest(false)}
            className="rounded-lg px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => resolveRequest(true)}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
