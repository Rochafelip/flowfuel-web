import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { VehicleProvider } from './context/VehicleContext'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './context/ConfirmContext'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { ToastContainer } from './components/ui/ToastContainer'
import { ConfirmDialog } from './components/ui/ConfirmDialog'
import { Login } from './routes/Login'
import { Register } from './routes/Register'
import { SelectVehicle } from './routes/SelectVehicle'
import { VehicleNew } from './routes/VehicleNew'
import { Home } from './routes/Home'
import { Refuels } from './routes/Refuels'
import { RefuelForm } from './routes/RefuelForm'
import { VehicleEvents } from './routes/VehicleEvents'
import { VehicleEventForm } from './routes/VehicleEventForm'
import { Export } from './routes/Export'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <VehicleProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/select-vehicle" element={<SelectVehicle />} />
                    <Route path="/vehicles/new" element={<VehicleNew />} />
                    <Route path="/" element={<Home />} />
                    <Route path="/refuels" element={<Refuels />} />
                    <Route path="/refuels/new" element={<RefuelForm />} />
                    <Route path="/refuels/:id/edit" element={<RefuelForm />} />
                    <Route path="/vehicle-events" element={<VehicleEvents />} />
                    <Route path="/vehicle-events/new" element={<VehicleEventForm />} />
                    <Route path="/vehicle-events/:id/edit" element={<VehicleEventForm />} />
                    <Route path="/export" element={<Export />} />
                  </Route>
                </Route>
              </Routes>
              <ToastContainer />
              <ConfirmDialog />
            </VehicleProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
