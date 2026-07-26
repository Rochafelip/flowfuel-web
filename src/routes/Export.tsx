import { useEffect, useState } from 'react'
import { authenticatedRequest } from '../services/api'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { Spinner } from '../components/ui/Spinner'

interface VehicleListItem {
  id: number
  brand: string
  model: string
}

export function Export() {
  const { showToast } = useToast()

  const [vehicles, setVehicles] = useState<VehicleListItem[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [vehicleId, setVehicleId] = useState('')

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
      showToast('Não foi possível carregar seus veículos')
    } finally {
      setLoadingVehicles(false)
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
        <p>Nenhum veículo cadastrado</p>
      </Screen>
    )
  }

  return (
    <Screen wide>
      <h1 className="mb-5 text-xl font-bold">Exportar dados</h1>

      <form className="flex flex-col gap-4">
        <select
          className="h-12 w-full rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
        >
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.brand} {v.model}
            </option>
          ))}
        </select>
      </form>
    </Screen>
  )
}
