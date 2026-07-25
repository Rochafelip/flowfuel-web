import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import { Screen } from '../components/ui/Screen'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'

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
    <Screen>
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">
        Cadastrar Veículo
      </h1>

      <form onSubmit={handleCreateVehicle} className="flex flex-col gap-4">
        <TextField
          placeholder="Marca"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />

        <TextField
          placeholder="Modelo"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />

        <TextField
          placeholder="Ano"
          value={modelYear}
          onChange={(e) => setModelYear(e.target.value)}
          inputMode="numeric"
        />

        <TextField
          placeholder="Ano de Fabricação"
          value={manufactureYear}
          onChange={(e) => setManufactureYear(e.target.value)}
          inputMode="numeric"
        />

        <TextField
          placeholder="Tipo (ex: Carro)"
          value={type}
          onChange={(e) => setType(e.target.value)}
        />

        <select
          className="h-12 w-full rounded-lg border border-gray-300 px-3 text-base"
          value={energyType}
          onChange={(e) => setEnergyType(e.target.value)}
        >
          <option value="COMBUSTION">Combustão</option>
          <option value="ELECTRIC">Elétrico</option>
          <option value="HYBRID">Híbrido</option>
        </select>

        <TextField
          placeholder="Subtipo de combustível (ex: Gasolina)"
          value={fuelSubType}
          onChange={(e) => setFuelSubType(e.target.value)}
        />

        <TextField
          placeholder="Capacidade (L)"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          inputMode="numeric"
        />

        <TextField
          placeholder="Cor"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />

        <TextField
          placeholder="Placa"
          value={licensePlate}
          onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
        />

        <TextField
          placeholder="Km Atual"
          value={currentKm}
          onChange={(e) => setCurrentKm(e.target.value)}
          inputMode="numeric"
        />

        <Button type="submit" disabled={loading}>
          {loading ? 'Cadastrando...' : 'Cadastrar'}
        </Button>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="block w-full text-center text-sm text-blue-600"
        >
          Voltar
        </button>
      </form>
    </Screen>
  )
}
