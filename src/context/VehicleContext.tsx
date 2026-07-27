import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authenticatedRequest } from '../services/api'
import { useAuth } from './AuthContext'
import type { Vehicle } from '../types/Vehicle'

interface VehicleContextData {
  activeVehicle: Vehicle | null
  loadingVehicle: boolean
  loadActiveVehicle: () => Promise<void>
  setActiveVehicle: (vehicle: Vehicle) => Promise<void>
  clearVehicle: () => Promise<void>
}

const VehicleContext = createContext<VehicleContextData>(
  {} as VehicleContextData
)

export function VehicleProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()

  const [activeVehicle, setActiveVehicleState] = useState<Vehicle | null>(null)
  const [loadingVehicle, setLoadingVehicle] = useState(true)

  useEffect(() => {
    if (token) {
      loadActiveVehicle()
    } else {
      clearVehicle()
    }
  }, [token])

  async function loadActiveVehicle() {
    try {
      setLoadingVehicle(true)

      const storedVehicle = localStorage.getItem('@active_vehicle')

      if (storedVehicle) {
        setActiveVehicleState(JSON.parse(storedVehicle))
      }

      const response = await authenticatedRequest('/vehicles/active')

      if (response) {
        setActiveVehicleState(response)
        localStorage.setItem('@active_vehicle', JSON.stringify(response))
      } else {
        await clearVehicle()
      }
    } catch (error) {
      console.log(error)
      await clearVehicle()
    } finally {
      setLoadingVehicle(false)
    }
  }

  async function setActiveVehicle(vehicle: Vehicle) {
    setActiveVehicleState(vehicle)
    localStorage.setItem('@active_vehicle', JSON.stringify(vehicle))
  }

  async function clearVehicle() {
    setActiveVehicleState(null)
    localStorage.removeItem('@active_vehicle')
    setLoadingVehicle(false)
  }

  return (
    <VehicleContext.Provider
      value={{
        activeVehicle,
        loadingVehicle,
        loadActiveVehicle,
        setActiveVehicle,
        clearVehicle,
      }}
    >
      {children}
    </VehicleContext.Provider>
  )
}

export function useVehicle() {
  return useContext(VehicleContext)
}
