import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import { Screen } from '../components/ui/Screen'
import { Spinner } from '../components/ui/Spinner'
import { Button } from '../components/ui/Button'

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
      <Screen centered>
        <Spinner />
      </Screen>
    )
  }

  if (vehicles.length === 0) {
    return (
      <Screen centered>
        <div className="flex flex-col items-center gap-4">
          <p>Nenhum veículo cadastrado</p>

          <Button onClick={() => navigate('/vehicles/new')} className="w-auto px-4">
            Cadastrar Veículo
          </Button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen>
      <h1 className="mb-5 text-xl font-bold">Selecione um veículo</h1>

      <ul className="flex flex-col gap-3">
        {vehicles.map((item) => (
          <li key={item.id}>
            <button
              className="w-full rounded-lg bg-gray-100 p-4 text-left transition-colors hover:bg-gray-200 active:bg-gray-300"
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
    </Screen>
  )
}
