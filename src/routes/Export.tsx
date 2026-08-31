import { useEffect, useState, type FormEvent } from 'react'
import { authenticatedRequest } from '../services/api'
import { downloadExport } from '../services/export'
import {
  VEHICLE_EVENT_TYPE_LABELS,
  type VehicleEventType,
} from '../types/VehicleEvent'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { Spinner } from '../components/ui/Spinner'
import { TextField } from '../components/ui/TextField'
import { SegmentedToggle } from '../components/ui/SegmentedToggle'
import { Button } from '../components/ui/Button'

interface VehicleListItem {
  id: number
  brand: string
  model: string
}

type DataType = 'REFUELS' | 'EVENTS'
type ExportFileFormat = 'csv' | 'pdf'

const EVENT_TYPES = Object.keys(VEHICLE_EVENT_TYPE_LABELS) as VehicleEventType[]

function validateDates(from: string, to: string): string | null {
  if ((from && !to) || (!from && to)) {
    return 'Informe as duas datas ou nenhuma'
  }
  if (from && to && from > to) {
    return 'Data inicial não pode ser depois da data final'
  }
  return null
}

export function Export() {
  const { showToast } = useToast()

  const [vehicles, setVehicles] = useState<VehicleListItem[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [vehicleId, setVehicleId] = useState('')

  const [dataType, setDataType] = useState<DataType>('REFUELS')
  const [eventType, setEventType] = useState<VehicleEventType | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dateError, setDateError] = useState<string | null>(null)
  const [format, setFormat] = useState<ExportFileFormat>('csv')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    loadVehicles()
  }, [])

  async function loadVehicles() {
    try {
      const response = await authenticatedRequest('/vehicles')
      setVehicles(response.content)
      if (response.content.length > 0) {
        setVehicleId(String(response.content[0].id))
      }
    } catch (err) {
      console.log(err)
      showToast(err instanceof Error ? err.message : 'Não foi possível carregar seus veículos')
    } finally {
      setLoadingVehicles(false)
    }
  }

  function handleStartDateChange(value: string) {
    setStartDate(value)
    setDateError(validateDates(value, endDate))
  }

  function handleEndDateChange(value: string) {
    setEndDate(value)
    setDateError(validateDates(startDate, value))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const validationError = validateDates(startDate, endDate)
    if (validationError) {
      setDateError(validationError)
      return
    }

    const params = new URLSearchParams()
    params.set('vehicleId', vehicleId)
    params.set('format', format)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)

    const basePath = dataType === 'REFUELS' ? '/exports/refuels' : '/exports/events'
    if (dataType === 'EVENTS' && eventType) {
      params.set('type', eventType)
    }

    try {
      setExporting(true)
      await downloadExport(`${basePath}?${params.toString()}`, `flowfuel-export.${format}`)
    } catch (err) {
      console.log(err)
      showToast(err instanceof Error ? err.message : 'Não foi possível exportar. Tente novamente.')
    } finally {
      setExporting(false)
    }
  }

  if (loadingVehicles) {
    return (
      <Screen centered>
        <Spinner />
      </Screen>
    )
  }

  if (vehicles.length === 0) {
    return (
      <Screen centered>
        <p className="text-gray-900 dark:text-gray-100">Nenhum veículo cadastrado</p>
      </Screen>
    )
  }

  return (
    <Screen wide>
      <h1 className="mb-5 text-xl font-bold text-gray-900 dark:text-gray-100">Exportar dados</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <select
          className="h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
        >
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.brand} {v.model}
            </option>
          ))}
        </select>

        <SegmentedToggle
          value={dataType}
          onChange={setDataType}
          options={[
            { value: 'REFUELS', label: 'Abastecimentos' },
            { value: 'EVENTS', label: 'Eventos' },
          ]}
        />

        {dataType === 'EVENTS' && (
          <select
            className="h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            value={eventType}
            onChange={(e) => setEventType(e.target.value as VehicleEventType | '')}
          >
            <option value="">Todas as categorias</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {VEHICLE_EVENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        )}

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">De</label>
            <TextField
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Até</label>
            <TextField
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
            />
          </div>
        </div>

        {dateError && <p className="text-sm text-red-600 dark:text-red-400">{dateError}</p>}

        <SegmentedToggle
          value={format}
          onChange={setFormat}
          options={[
            { value: 'csv', label: 'CSV' },
            { value: 'pdf', label: 'PDF' },
          ]}
        />

        <Button
          type="submit"
          disabled={exporting || Boolean(dateError)}
          className="lg:w-auto lg:self-end lg:px-10"
        >
          {exporting ? 'Exportando...' : 'Exportar'}
        </Button>
      </form>
    </Screen>
  )
}
