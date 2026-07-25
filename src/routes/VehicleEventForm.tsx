import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import {
  VEHICLE_EVENT_TYPE_LABELS,
  type VehicleEvent,
  type VehicleEventRequest,
  type VehicleEventType,
} from '../types/VehicleEvent'
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

  const [type, setType] = useState<VehicleEventType>('MAINTENANCE')
  const [amount, setAmount] = useState('')
  const [eventDate, setEventDate] = useState(todayIsoDate())
  const [odometer, setOdometer] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)

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
      alert('Erro ao carregar evento')
      navigate('/vehicle-events')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!amount || !eventDate || !activeVehicle) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    if (eventDate > todayIsoDate()) {
      alert('A data do evento não pode ser futura')
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

      navigate('/vehicle-events')
    } catch (err) {
      console.log(err)
      alert('Erro ao salvar evento')
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
    <Screen>
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">
        {isEditing ? 'Editar Evento' : 'Novo Evento'}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <select
          className="h-12 w-full rounded-lg border border-gray-300 px-3 text-base"
          value={type}
          onChange={(e) => setType(e.target.value as VehicleEventType)}
        >
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {VEHICLE_EVENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        <TextField
          placeholder="Valor (R$)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
        />

        <TextField
          type="date"
          value={eventDate}
          max={todayIsoDate()}
          onChange={(e) => setEventDate(e.target.value)}
        />

        <TextField
          placeholder="Odômetro (km) - opcional"
          value={odometer}
          onChange={(e) => setOdometer(e.target.value)}
          inputMode="numeric"
        />

        <textarea
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="Descrição (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={4}
        />

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Salvar'}
        </Button>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="block w-full text-center text-sm text-green-700"
        >
          Voltar
        </button>
      </form>
    </Screen>
  )
}
