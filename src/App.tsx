import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { VehicleProvider } from './context/VehicleContext'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './context/ConfirmContext'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { ToastContainer } from './components/ui/ToastContainer'
import { ServerStatusBanner } from './components/ui/ServerStatusBanner'
import { ConfirmDialog } from './components/ui/ConfirmDialog'
import { Login } from './routes/Login'
import { Register } from './routes/Register'
import { Activate } from './routes/Activate'
import { SelectVehicle } from './routes/SelectVehicle'
import { VehicleNew } from './routes/VehicleNew'
import { Vehicles } from './routes/Vehicles'
import { VehicleEdit } from './routes/VehicleEdit'
import { Home } from './routes/Home'
import { Refuels } from './routes/Refuels'
import { RefuelForm } from './routes/RefuelForm'
import { VehicleEvents } from './routes/VehicleEvents'
import { VehicleEventForm } from './routes/VehicleEventForm'
import { Stations } from './routes/Stations'
import { Export } from './routes/Export'
import { Profile } from './routes/Profile'
import { ProfileEdit } from './routes/ProfileEdit'
import { ChangePassword } from './routes/ChangePassword'

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
                <Route path="/activate" element={<Activate />} />

                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/select-vehicle" element={<SelectVehicle />} />
                    <Route path="/vehicles/new" element={<VehicleNew />} />
                    <Route path="/vehicles" element={<Vehicles />} />
                    <Route path="/vehicles/:id/edit" element={<VehicleEdit />} />
                    <Route path="/" element={<Home />} />
                    <Route path="/refuels" element={<Refuels />} />
                    <Route path="/refuels/new" element={<RefuelForm />} />
                    <Route path="/refuels/:id/edit" element={<RefuelForm />} />
                    <Route path="/vehicle-events" element={<VehicleEvents />} />
                    <Route path="/vehicle-events/new" element={<VehicleEventForm />} />
                    <Route path="/vehicle-events/:id/edit" element={<VehicleEventForm />} />
                    <Route path="/stations" element={<Stations />} />
                    <Route path="/export" element={<Export />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/profile/edit" element={<ProfileEdit />} />
                    <Route path="/profile/change-password" element={<ChangePassword />} />
                  </Route>
                </Route>
              </Routes>
              <ServerStatusBanner />
              <ToastContainer />
              <ConfirmDialog />
            </VehicleProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
