import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { VehicleProvider } from './context/VehicleContext'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { Login } from './routes/Login'
import { Register } from './routes/Register'
import { SelectVehicle } from './routes/SelectVehicle'
import { VehicleNew } from './routes/VehicleNew'
import { Home } from './routes/Home'

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
            </Route>
          </Routes>
        </VehicleProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
