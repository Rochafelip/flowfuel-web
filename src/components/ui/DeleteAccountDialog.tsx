import { useState } from 'react'
import { TextField } from './TextField'

export function DeleteAccountDialog({
  onConfirm,
  onDismiss,
}: {
  onConfirm: () => void
  onDismiss: () => void
}) {
  const [input, setInput] = useState('')
  const canDelete = input === 'DELETE'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onDismiss} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Excluir conta permanentemente?"
        className="relative w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg"
      >
        <p className="mb-3 text-base font-bold text-gray-900 dark:text-gray-100">Excluir conta permanentemente?</p>
        <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
          Esta ação é irreversível. Ao excluir sua conta:
        </p>
        <ul className="mb-4 list-disc pl-5 text-sm text-gray-600 dark:text-gray-400">
          <li>Todos os seus dados serão removidos</li>
          <li>Seu histórico de abastecimentos será perdido</li>
          <li>Seus veículos cadastrados serão excluídos</li>
        </ul>
        <TextField
          placeholder="Digite DELETE para confirmar"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canDelete}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}
