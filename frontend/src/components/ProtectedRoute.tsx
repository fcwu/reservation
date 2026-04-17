import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading, authenticated } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen">載入中...</div>
  if (!authenticated) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
