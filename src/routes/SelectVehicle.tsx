import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'

interface VehicleListItem {
  id: number
  brand: string
  model: string
  modelYear: number
  licensePlate: string
}

export function SelectVehicle() {
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { loadActiveVehicle } = useVehicle()

  useEffect(() => {
    loadVehicles()
  }, [])

  async function loadVehicles() {
    try {
      const response = await authenticatedRequest('/vehicles')
      setVehicles(response.content)
    } catch (error) {
      console.log(error)
    } finally {
      setLoading(false)
    }
  }

  async function activateVehicle(id: number) {
    try {
      await authenticatedRequest(`/vehicles/${id}/active`, {
        method: 'PUT',
      })

      await loadActiveVehicle()
      navigate('/')
    } catch (error) {
      console.log(error)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    )
  }

  if (vehicles.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p>Nenhum veículo cadastrado</p>

        <button
          className="rounded-lg bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700"
          onClick={() => navigate('/vehicles/new')}
        >
          Cadastrar Veículo
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-5">
      <h1 className="mb-5 text-xl font-bold">Selecione um veículo</h1>

      <ul>
        {vehicles.map((item) => (
          <li key={item.id}>
            <button
              className="mb-3 w-full rounded-lg bg-gray-100 p-4 text-left hover:bg-gray-200"
              onClick={() => activateVehicle(item.id)}
            >
              <p className="font-bold">
                {item.brand} {item.model}
              </p>
              <p>Placa: {item.licensePlate}</p>
              <p>Ano: {item.modelYear}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
