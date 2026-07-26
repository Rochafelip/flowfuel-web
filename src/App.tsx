import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { VehicleProvider } from './context/VehicleContext'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { Login } from './routes/Login'
import { Register } from './routes/Register'
import { SelectVehicle } from './routes/SelectVehicle'
import { VehicleNew } from './routes/VehicleNew'
import { Home } from './routes/Home'
import { Refuels } from './routes/Refuels'
import { RefuelForm } from './routes/RefuelForm'
import { VehicleEvents } from './routes/VehicleEvents'
import { VehicleEventForm } from './routes/VehicleEventForm'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <VehicleProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/select-vehicle" element={<SelectVehicle />} />
              <Route path="/vehicles/new" element={<VehicleNew />} />
              <Route path="/" element={<Home />} />
              <Route path="/refuels" element={<Refuels />} />
              <Route path="/refuels/new" element={<RefuelForm />} />
              <Route path="/refuels/:id/edit" element={<RefuelForm />} />
              <Route path="/vehicle-events" element={<VehicleEvents />} />
              <Route path="/vehicle-events/new" element={<VehicleEventForm />} />
              <Route path="/vehicle-events/:id/edit" element={<VehicleEventForm />} />
            </Route>
          </Routes>
        </VehicleProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
