import { useState } from 'react'
import { TextField } from './TextField'
import type { Vehicle } from '../../types/Vehicle'

const DEFAULT_DURATION_DAYS = 30
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ShareVehicleDialog({
  vehicle,
  submitting,
  onConfirm,
  onDismiss,
}: {
  vehicle: Vehicle
  submitting: boolean
  onConfirm: (email: string, durationDays: number) => void
  onDismiss: () => void
}) {
  const [email, setEmail] = useState('')
  const [durationDays, setDurationDays] = useState(DEFAULT_DURATION_DAYS)

  const isEmailValid = EMAIL_PATTERN.test(email)
  const isDurationValid = durationDays >= 1 && durationDays <= 365
  const canSubmit = isEmailValid && isDurationValid && !submitting

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onDismiss} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Compartilhar ${vehicle.brand} ${vehicle.model}`}
        className="relative w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg"
      >
        <p className="mb-3 text-base font-bold text-gray-900 dark:text-gray-100">
          Compartilhar {vehicle.brand} {vehicle.model}
        </p>
        <p className="mb-1 text-sm font-bold text-gray-700 dark:text-gray-300">E-mail do convidado</p>
        <TextField
          type="email"
          placeholder="nome@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="mt-3 mb-1 text-sm font-bold text-gray-700 dark:text-gray-300">Validade (dias)</p>
        <TextField
          type="number"
          min={1}
          max={365}
          value={durationDays}
          onChange={(e) => setDurationDays(Number(e.target.value))}
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
            onClick={() => onConfirm(email, durationDays)}
            disabled={!canSubmit}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-40"
          >
            Compartilhar
          </button>
        </div>
      </div>
    </div>
  )
}
