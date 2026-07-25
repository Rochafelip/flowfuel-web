import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useVehicle } from '../context/VehicleContext'

function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
    </div>
  )
}

export function ProtectedRoute() {
  const { token, loading } = useAuth()
  const { activeVehicle, loadingVehicle } = useVehicle()
  const location = useLocation()

  if (loading || loadingVehicle) {
    return <Spinner />
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (!activeVehicle && location.pathname !== '/vehicles/new') {
    return <Navigate to="/select-vehicle" replace />
  }

  return <Outlet />
}
