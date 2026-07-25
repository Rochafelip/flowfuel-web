import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'

const inputClass =
  'mb-4 h-12 w-full rounded-lg border border-gray-300 px-3 text-base'

export function VehicleNew() {
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [modelYear, setModelYear] = useState('')
  const [manufactureYear, setManufactureYear] = useState('')
  const [type, setType] = useState('Carro')
  const [energyType, setEnergyType] = useState('COMBUSTION')
  const [fuelSubType, setFuelSubType] = useState('Gasolina')
  const [capacity, setCapacity] = useState('')
  const [color, setColor] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [currentKm, setCurrentKm] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { loadActiveVehicle } = useVehicle()

  async function handleCreateVehicle(e: FormEvent) {
    e.preventDefault()

    if (
      !brand ||
      !model ||
      !modelYear ||
      !manufactureYear ||
      !licensePlate ||
      !currentKm ||
      !capacity
    ) {
      alert('Preencha todos os campos')
      return
    }

    try {
      setLoading(true)
      const response = await authenticatedRequest('/vehicles', {
        method: 'POST',
        body: JSON.stringify({
          type,
          energyType,
          fuelSubType,
          currentKm: parseInt(currentKm),
          capacity: parseInt(capacity),
          brand,
          model,
          manufactureYear: parseInt(manufactureYear),
          modelYear: parseInt(modelYear),
          color,
          licensePlate,
        }),
      })

      if (response) {
        await authenticatedRequest(`/vehicles/${response.id}/active`, {
          method: 'PUT',
        })

        await loadActiveVehicle()
        navigate('/')
      }
    } catch (error) {
      console.log(error)
      alert('Erro ao cadastrar veículo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-5">
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">
        Cadastrar Veículo
      </h1>

      <form onSubmit={handleCreateVehicle} className="mx-auto max-w-sm">
        <input
          className={inputClass}
          placeholder="Marca"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />

        <input
          className={inputClass}
          placeholder="Modelo"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />

        <input
          className={inputClass}
          placeholder="Ano"
          value={modelYear}
          onChange={(e) => setModelYear(e.target.value)}
          inputMode="numeric"
        />

        <input
          className={inputClass}
          placeholder="Ano de Fabricação"
          value={manufactureYear}
          onChange={(e) => setManufactureYear(e.target.value)}
          inputMode="numeric"
        />

        <input
          className={inputClass}
          placeholder="Tipo (ex: Carro)"
          value={type}
          onChange={(e) => setType(e.target.value)}
        />

        <select
          className={inputClass}
          value={energyType}
          onChange={(e) => setEnergyType(e.target.value)}
        >
          <option value="COMBUSTION">Combustão</option>
          <option value="ELECTRIC">Elétrico</option>
          <option value="HYBRID">Híbrido</option>
        </select>

        <input
          className={inputClass}
          placeholder="Subtipo de combustível (ex: Gasolina)"
          value={fuelSubType}
          onChange={(e) => setFuelSubType(e.target.value)}
        />

        <input
          className={inputClass}
          placeholder="Capacidade (L)"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          inputMode="numeric"
        />

        <input
          className={inputClass}
          placeholder="Cor"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />

        <input
          className={inputClass}
          placeholder="Placa"
          value={licensePlate}
          onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
        />

        <input
          className={inputClass}
          placeholder="Km Atual"
          value={currentKm}
          onChange={(e) => setCurrentKm(e.target.value)}
          inputMode="numeric"
        />

        <button
          type="submit"
          disabled={loading}
          className="mb-4 h-12 w-full rounded-lg bg-blue-600 text-base font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Cadastrando...' : 'Cadastrar'}
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
