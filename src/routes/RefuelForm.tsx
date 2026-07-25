import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import type { Refuel, RefuelRequest, RefuelType } from '../types/Refuel'

const inputClass =
  'mb-4 h-12 w-full rounded-lg border border-gray-300 px-3 text-base'

export function RefuelForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const { activeVehicle } = useVehicle()
  const navigate = useNavigate()

  const [odometer, setOdometer] = useState('')
  const [energyAmount, setEnergyAmount] = useState('')
  const [pricePerUnit, setPricePerUnit] = useState('')
  const [fullTank, setFullTank] = useState(false)
  const [refuelType, setRefuelType] = useState<RefuelType>('FUEL')
  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)

  const isHybrid = activeVehicle?.energyType === 'HYBRID'

  useEffect(() => {
    if (isEditing) {
      loadRefuel()
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
      alert('Erro ao carregar abastecimento')
      navigate('/refuels')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!odometer || !energyAmount || !pricePerUnit || !activeVehicle) {
      alert('Preencha todos os campos')
      return
    }

    const body: RefuelRequest = {
      vehicleId: Number(activeVehicle.id),
      odometer: parseInt(odometer),
      energyAmount: parseFloat(energyAmount),
      pricePerUnit: parseFloat(pricePerUnit),
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

      navigate('/refuels')
    } catch (err) {
      console.log(err)
      alert('Erro ao salvar abastecimento')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-5">
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">
        {isEditing ? 'Editar Abastecimento' : 'Novo Abastecimento'}
      </h1>

      <form onSubmit={handleSubmit} className="mx-auto max-w-sm">
        <input
          className={inputClass}
          placeholder="Odômetro (km)"
          value={odometer}
          onChange={(e) => setOdometer(e.target.value)}
          inputMode="numeric"
        />

        <input
          className={inputClass}
          placeholder={
            isHybrid && refuelType === 'ELECTRIC'
              ? 'Quantidade (kWh)'
              : 'Quantidade (L)'
          }
          value={energyAmount}
          onChange={(e) => setEnergyAmount(e.target.value)}
          inputMode="decimal"
        />

        <input
          className={inputClass}
          placeholder="Preço por unidade"
          value={pricePerUnit}
          onChange={(e) => setPricePerUnit(e.target.value)}
          inputMode="decimal"
        />

        {isHybrid && (
          <select
            className={inputClass}
            value={refuelType}
            onChange={(e) => setRefuelType(e.target.value as RefuelType)}
          >
            <option value="FUEL">Combustível</option>
            <option value="ELECTRIC">Elétrico</option>
          </select>
        )}

        <label className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            checked={fullTank}
            onChange={(e) => setFullTank(e.target.checked)}
          />
          Tanque cheio
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="mb-4 h-12 w-full rounded-lg bg-blue-600 text-base font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? 'Salvando...' : 'Salvar'}
        </button>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="block w-full text-center text-sm text-blue-600"
        >
          Voltar
        </button>
      </form>
    </div>
  )
}
