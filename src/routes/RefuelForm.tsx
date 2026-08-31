import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { authenticatedRequest, ApiError } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import type { Refuel, RefuelRequest, RefuelType } from '../types/Refuel'
import type { Dashboard } from '../types/Dashboard'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { Spinner } from '../components/ui/Spinner'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'
import { SegmentedToggle } from '../components/ui/SegmentedToggle'
import { StationPickerDialog } from '../components/ui/StationPickerDialog'
import { formatStationAddress } from '../lib/stationDistanceBand'
import type { Station } from '../types/Station'

type DistanceMode = 'odometer' | 'trip'
type PriceMode = 'perUnit' | 'total'

export function RefuelForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const { activeVehicle } = useVehicle()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [distanceMode, setDistanceMode] = useState<DistanceMode>('odometer')
  const [odometer, setOdometer] = useState('')
  const [tripKm, setTripKm] = useState('')
  const [baseline, setBaseline] = useState<number | null>(null)

  const [priceMode, setPriceMode] = useState<PriceMode>('perUnit')
  const [energyAmount, setEnergyAmount] = useState('')
  const [pricePerUnit, setPricePerUnit] = useState('')
  const [totalValue, setTotalValue] = useState('')

  const [fullTank, setFullTank] = useState(false)
  const [refuelType, setRefuelType] = useState<RefuelType>('FUEL')
  const [station, setStation] = useState<Station | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const isHybrid = activeVehicle?.energyType === 'HYBRID'

  useEffect(() => {
    if (isEditing) {
      loadRefuel()
    } else {
      loadBaseline()
    }
  }, [id])

  async function loadRefuel() {
    try {
      const refuel: Refuel = await authenticatedRequest(`/refuels/${id}`)
      setOdometer(String(refuel.odometer))
      setEnergyAmount(String(refuel.energyAmount))
      setPricePerUnit(String(refuel.pricePerUnit))
      setFullTank(refuel.fullTank)
      setRefuelType(refuel.refuelType)
      if (refuel.stationName) {
        setStation({
          placeId: '',
          name: refuel.stationName,
          type: refuel.refuelType === 'ELECTRIC' ? 'ELECTRIC' : 'FUEL',
          distanceMeters: 0,
          rating: null,
          latitude: refuel.stationLatitude ?? 0,
          longitude: refuel.stationLongitude ?? 0,
          street: refuel.stationAddress,
          houseNumber: null,
        })
      }
    } catch (err) {
      console.log(err)
      showToast(err instanceof Error ? err.message : 'Erro ao carregar abastecimento')
      navigate('/refuels')
    } finally {
      setLoading(false)
    }
  }

  async function loadBaseline() {
    if (!activeVehicle) return

    try {
      const dashboard: Dashboard = await authenticatedRequest(
        `/dashboard/vehicle/${activeVehicle.id}`
      )
      setBaseline(dashboard.lastOdometer ?? activeVehicle.currentKm)
    } catch (err) {
      console.log(err)
      setBaseline(activeVehicle.currentKm)
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

    const finalOdometer =
      distanceMode === 'trip' && !isEditing
        ? (baseline ?? 0) + parseInt(tripKm || '0')
        : parseInt(odometer || '0')

    const finalPricePerUnit =
      priceMode === 'total'
        ? parseFloat(totalValue || '0') / parseFloat(energyAmount || '1')
        : parseFloat(pricePerUnit || '0')

    const distanceFilled =
      distanceMode === 'trip' && !isEditing ? Boolean(tripKm) : Boolean(odometer)
    const priceFilled =
      priceMode === 'total' ? Boolean(totalValue) : Boolean(pricePerUnit)

    if (!distanceFilled || !energyAmount || !priceFilled || !activeVehicle) {
      showToast('Preencha todos os campos')
      return
    }

    const body: RefuelRequest = {
      vehicleId: Number(activeVehicle.id),
      odometer: finalOdometer,
      energyAmount: parseFloat(energyAmount),
      pricePerUnit: finalPricePerUnit,
      fullTank,
      refuelType: isHybrid ? refuelType : null,
      stationName: station?.name ?? null,
      stationAddress: station ? formatStationAddress(station.street, station.houseNumber) : null,
      stationLatitude: station?.latitude ?? null,
      stationLongitude: station?.longitude ?? null,
    }

    try {
      setSubmitting(true)

      if (isEditing) {
        await authenticatedRequest(`/refuels/${id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
      } else {
        await authenticatedRequest('/refuels', {
          method: 'POST',
          body: JSON.stringify(body),
        })
      }

      showToast('Abastecimento salvo com sucesso.', 'success')
      navigate('/refuels')
    } catch (err) {
      console.log(err)
      if (err instanceof ApiError && err.fieldErrors.length > 0) {
        const next: Record<string, string> = {}
        for (const fe of err.fieldErrors) next[fe.field] = fe.message
        setFieldErrors(next)
        showToast(err.message)
      } else {
        showToast(err instanceof Error ? err.message : 'Erro ao salvar abastecimento')
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

  const computedPricePerUnit =
    priceMode === 'total' && totalValue && energyAmount
      ? (parseFloat(totalValue) / parseFloat(energyAmount)).toFixed(2)
      : null

  return (
    <Screen wide>
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
        {isEditing ? 'Editar Abastecimento' : 'Novo Abastecimento'}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isEditing && (
          <SegmentedToggle
            options={[
              { value: 'odometer', label: 'Odômetro' },
              { value: 'trip', label: 'Trip' },
            ]}
            value={distanceMode}
            onChange={setDistanceMode}
          />
        )}

        {distanceMode === 'trip' && !isEditing ? (
          <div>
            <TextField
              placeholder="Km rodados desde o último abastecimento"
              value={tripKm}
              onChange={(e) => {
                setTripKm(e.target.value)
                clearFieldError('odometer')
              }}
              inputMode="numeric"
            />
            {baseline !== null && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                A partir de {baseline.toLocaleString('pt-BR')} km
              </p>
            )}
            {fieldErrors.odometer && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.odometer}</p>
            )}
          </div>
        ) : (
          <div>
            <TextField
              placeholder="Odômetro (km)"
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
        )}

        <div>
          <TextField
            placeholder={
              isHybrid && refuelType === 'ELECTRIC'
                ? 'Quantidade (kWh)'
                : 'Quantidade (L)'
            }
            value={energyAmount}
            onChange={(e) => {
              setEnergyAmount(e.target.value)
              clearFieldError('energyAmount')
            }}
            inputMode="decimal"
          />
          {fieldErrors.energyAmount && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.energyAmount}</p>
          )}
        </div>

        <SegmentedToggle
          options={[
            { value: 'perUnit', label: 'Preço por litro' },
            { value: 'total', label: 'Valor total' },
          ]}
          value={priceMode}
          onChange={setPriceMode}
        />

        {priceMode === 'total' ? (
          <div>
            <TextField
              placeholder="Valor total pago"
              value={totalValue}
              onChange={(e) => {
                setTotalValue(e.target.value)
                clearFieldError('pricePerUnit')
              }}
              inputMode="decimal"
            />
            {computedPricePerUnit && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                R$ {computedPricePerUnit}
                {isHybrid && refuelType === 'ELECTRIC' ? '/kWh' : '/L'}
              </p>
            )}
            {fieldErrors.pricePerUnit && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.pricePerUnit}</p>
            )}
          </div>
        ) : (
          <div>
            <TextField
              placeholder="Preço por unidade"
              value={pricePerUnit}
              onChange={(e) => {
                setPricePerUnit(e.target.value)
                clearFieldError('pricePerUnit')
              }}
              inputMode="decimal"
            />
            {fieldErrors.pricePerUnit && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.pricePerUnit}</p>
            )}
          </div>
        )}

        {isHybrid && (
          <select
            className="h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            value={refuelType}
            onChange={(e) => setRefuelType(e.target.value as RefuelType)}
          >
            <option value="FUEL">Combustível</option>
            <option value="ELECTRIC">Elétrico</option>
          </select>
        )}

        {station ? (
          <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">📍 {station.name}</p>
              {station.street && (
                <p className="truncate text-xs text-gray-600 dark:text-gray-400">
                  {formatStationAddress(station.street, station.houseNumber)}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                fullWidth={false}
                onClick={() => setPickerOpen(true)}
              >
                Trocar
              </Button>
              <Button
                type="button"
                variant="ghost-danger"
                size="sm"
                fullWidth={false}
                onClick={() => setStation(null)}
              >
                Remover
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="ghost" fullWidth={false} onClick={() => setPickerOpen(true)}>
            📍 Adicionar posto
          </Button>
        )}

        {pickerOpen && (
          <StationPickerDialog
            type={isHybrid ? refuelType : activeVehicle?.energyType === 'ELECTRIC' ? 'ELECTRIC' : 'FUEL'}
            onSelect={(picked) => {
              setStation(picked)
              setPickerOpen(false)
            }}
            onDismiss={() => setPickerOpen(false)}
          />
        )}

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={fullTank}
            onChange={(e) => setFullTank(e.target.checked)}
          />
          Tanque cheio
        </label>

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
