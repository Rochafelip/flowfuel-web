import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { activateVehicle } from '../services/vehicle'
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
  const { activeVehicle, loadActiveVehicle } = useVehicle()
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
      showToast(error instanceof Error ? error.message : 'Não foi possível carregar seus veículos')
    } finally {
      setLoading(false)
    }
  }

  async function activateSelectedVehicle(id: number) {
    try {
      await activateVehicle(id)

      await loadActiveVehicle()
      showToast('Veículo ativado.', 'success')
      navigate('/')
    } catch (error) {
      console.log(error)
      showToast(error instanceof Error ? error.message : 'Não foi possível ativar o veículo')
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
          <p className="text-gray-900 dark:text-gray-100">Nenhum veículo cadastrado</p>

          <Button onClick={() => navigate('/vehicles/new')} fullWidth={false}>
            Cadastrar Veículo
          </Button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen wide>
      <h1 className="mb-5 text-xl font-bold text-gray-900 dark:text-gray-100">Selecione um veículo</h1>

      <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
        {vehicles.map((item) => (
          <li key={item.id}>
            <button
              className="flex w-full items-center gap-3 rounded-xl bg-white dark:bg-gray-800 p-4 text-left shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-700"
              onClick={() => activateSelectedVehicle(item.id)}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40 text-base text-green-700 dark:text-green-400">
                🚗
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900 dark:text-gray-100">
                    {item.brand} {item.model}
                  </p>
                  {activeVehicle?.id === item.id && (
                    <span className="rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-xs font-bold text-green-700 dark:text-green-400">
                      Ativo
                    </span>
                  )}
                </div>
                <p className="text-gray-900 dark:text-gray-100">Placa: {item.licensePlate}</p>
                <p className="text-gray-900 dark:text-gray-100">Ano: {item.modelYear}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </Screen>
  )
}
