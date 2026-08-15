import { Link } from 'react-router-dom'
import { useVehicle } from '../../context/VehicleContext'

export function VehicleSwitcherLink() {
  const { activeVehicle } = useVehicle()

  if (!activeVehicle) {
    return <span className="text-sm font-bold text-green-700 dark:text-green-400">⛽ FlowFuel</span>
  }

  return (
    <Link
      to="/select-vehicle"
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-950"
    >
      {activeVehicle.brand} {activeVehicle.model}
      <span aria-hidden="true">▾</span>
    </Link>
  )
}
