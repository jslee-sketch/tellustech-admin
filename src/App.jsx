import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Rental from './pages/Rental'
import Inventory from './pages/Inventory'
import Calibration from './pages/Calibration'
import AS from './pages/AS'
import Master from './pages/Master'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="rental" element={<Rental />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="calibration" element={<Calibration />} />
        <Route path="as" element={<AS />} />
        <Route path="master" element={<Master />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
