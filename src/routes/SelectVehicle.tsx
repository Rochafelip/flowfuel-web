import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import { useToast } from '../context/ToastContext'
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
  const { showToast } = useToast()

  useEffect(() => {
    loadVehicles()
  }, [])

  async function loadVehicles() {
    try {
      const response = await authenticatedRequest('/vehicles')
      setVehicles(response.content)
    } catch (error) {
      console.log(error)
      showToast('Não foi possível carregar seus veículos')
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
      showToast('Veículo ativado.', 'success')
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
    <Screen wide>
      <h1 className="mb-5 text-xl font-bold">Selecione um veículo</h1>

      <ul className="flex flex-col gap-3">
        {vehicles.map((item) => (
          <li key={item.id}>
            <button
              className="flex w-full items-center gap-3 rounded-xl bg-white p-4 text-left shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100"
              onClick={() => activateVehicle(item.id)}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-base text-green-700">
                🚗
              </div>
              <div>
                <p className="font-bold">
                  {item.brand} {item.model}
                </p>
                <p>Placa: {item.licensePlate}</p>
                <p>Ano: {item.modelYear}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </Screen>
  )
}
