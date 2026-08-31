import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { authenticatedRequest, ApiError } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import {
  VEHICLE_EVENT_TYPE_LABELS,
  type VehicleEvent,
  type VehicleEventRequest,
  type VehicleEventType,
} from '../types/VehicleEvent'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { Spinner } from '../components/ui/Spinner'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'

const EVENT_TYPES = Object.keys(VEHICLE_EVENT_TYPE_LABELS) as VehicleEventType[]

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

export function VehicleEventForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const { activeVehicle } = useVehicle()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [type, setType] = useState<VehicleEventType>('MAINTENANCE')
  const [amount, setAmount] = useState('')
  const [eventDate, setEventDate] = useState(todayIsoDate())
  const [odometer, setOdometer] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isEditing) {
      loadEvent()
    }
  }, [id])

  async function loadEvent() {
    try {
      const event: VehicleEvent = await authenticatedRequest(
        `/vehicle-events/${id}`
      )
      setType(event.type)
      setAmount(String(event.amount))
      setEventDate(event.eventDate)
      setOdometer(event.odometer !== null ? String(event.odometer) : '')
      setDescription(event.description ?? '')
    } catch (err) {
      console.log(err)
      showToast(err instanceof Error ? err.message : 'Erro ao carregar evento')
      navigate('/vehicle-events')
    } finally {
      setLoading(false)
    }
  }

  function clearFieldError(field: string) {
    setFieldErrors((current) => {
      if (!(field in current)) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!amount || !eventDate || !activeVehicle) {
      showToast('Preencha todos os campos obrigatórios')
      return
    }

    if (eventDate > todayIsoDate()) {
      showToast('A data do evento não pode ser futura')
      return
    }

    const body: VehicleEventRequest = {
      vehicleId: Number(activeVehicle.id),
      type,
      amount: parseFloat(amount),
      eventDate,
      odometer: odometer ? parseInt(odometer) : null,
      description: description || null,
    }

    try {
      setSubmitting(true)

      if (isEditing) {
        await authenticatedRequest(`/vehicle-events/${id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
      } else {
        await authenticatedRequest('/vehicle-events', {
          method: 'POST',
          body: JSON.stringify(body),
        })
      }

      showToast('Evento salvo com sucesso.', 'success')
      navigate('/vehicle-events')
    } catch (err) {
      console.log(err)
      if (err instanceof ApiError && err.fieldErrors.length > 0) {
        const next: Record<string, string> = {}
        for (const fe of err.fieldErrors) next[fe.field] = fe.message
        setFieldErrors(next)
        showToast(err.message)
      } else {
        showToast(err instanceof Error ? err.message : 'Erro ao salvar evento')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Screen centered>
        <Spinner />
      </Screen>
    )
  }

  return (
    <Screen wide>
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
        {isEditing ? 'Editar Evento' : 'Novo Evento'}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <select
          className="h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          value={type}
          onChange={(e) => setType(e.target.value as VehicleEventType)}
        >
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {VEHICLE_EVENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        <div>
          <TextField
            placeholder="Valor (R$)"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              clearFieldError('amount')
            }}
            inputMode="decimal"
          />
          {fieldErrors.amount && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.amount}</p>
          )}
        </div>

        <div>
          <TextField
            type="date"
            value={eventDate}
            max={todayIsoDate()}
            onChange={(e) => {
              setEventDate(e.target.value)
              clearFieldError('eventDate')
            }}
          />
          {fieldErrors.eventDate && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.eventDate}</p>
          )}
        </div>

        <div>
          <TextField
            placeholder="Odômetro (km) - opcional"
            value={odometer}
            onChange={(e) => {
              setOdometer(e.target.value)
              clearFieldError('odometer')
            }}
            inputMode="numeric"
          />
          {fieldErrors.odometer && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.odometer}</p>
          )}
        </div>

        <div>
          <textarea
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            placeholder="Descrição (opcional)"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              clearFieldError('description')
            }}
            maxLength={2000}
            rows={4}
          />
          {fieldErrors.description && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.description}</p>
          )}
        </div>

        <Button type="submit" disabled={submitting} className="lg:w-auto lg:self-end lg:px-10">
          {submitting ? 'Salvando...' : 'Salvar'}
        </Button>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="block w-full text-center text-sm text-green-700 dark:text-green-400"
        >
          Voltar
        </button>
      </form>
    </Screen>
  )
}
