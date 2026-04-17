import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/AdminLayout'
import AdminLogin from './pages/admin/Login'
import AdminReservations from './pages/admin/Reservations'
import AdminServices from './pages/admin/Services'
import AdminSlots from './pages/admin/Slots'
import BookingPage from './pages/BookingPage'
import MyBookings from './pages/MyBookings'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<BookingPage />} />
      <Route path="/my-bookings" element={<MyBookings />} />

      {/* Admin */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminReservations />} />
        <Route path="services" element={<AdminServices />} />
        <Route path="slots" element={<AdminSlots />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
