import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import type { Refuel, RefuelRequest, RefuelType } from '../types/Refuel'
import type { Dashboard } from '../types/Dashboard'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { Spinner } from '../components/ui/Spinner'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'
import { SegmentedToggle } from '../components/ui/SegmentedToggle'

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
  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)

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
    } catch (err) {
      console.log(err)
      showToast('Erro ao carregar abastecimento')
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
      showToast('Erro ao salvar abastecimento')
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
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">
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
              onChange={(e) => setTripKm(e.target.value)}
              inputMode="numeric"
            />
            {baseline !== null && (
              <p className="mt-1 text-sm text-gray-600">
                A partir de {baseline.toLocaleString('pt-BR')} km
              </p>
            )}
          </div>
        ) : (
          <TextField
            placeholder="Odômetro (km)"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
            inputMode="numeric"
          />
        )}

        <TextField
          placeholder={
            isHybrid && refuelType === 'ELECTRIC'
              ? 'Quantidade (kWh)'
              : 'Quantidade (L)'
          }
          value={energyAmount}
          onChange={(e) => setEnergyAmount(e.target.value)}
          inputMode="decimal"
        />

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
              onChange={(e) => setTotalValue(e.target.value)}
              inputMode="decimal"
            />
            {computedPricePerUnit && (
              <p className="mt-1 text-sm text-gray-600">
                R$ {computedPricePerUnit}
                {isHybrid && refuelType === 'ELECTRIC' ? '/kWh' : '/L'}
              </p>
            )}
          </div>
        ) : (
          <TextField
            placeholder="Preço por unidade"
            value={pricePerUnit}
            onChange={(e) => setPricePerUnit(e.target.value)}
            inputMode="decimal"
          />
        )}

        {isHybrid && (
          <select
            className="h-12 w-full rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            value={refuelType}
            onChange={(e) => setRefuelType(e.target.value as RefuelType)}
          >
            <option value="FUEL">Combustível</option>
            <option value="ELECTRIC">Elétrico</option>
          </select>
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
          className="block w-full text-center text-sm text-green-700"
        >
          Voltar
        </button>
      </form>
    </Screen>
  )
}
