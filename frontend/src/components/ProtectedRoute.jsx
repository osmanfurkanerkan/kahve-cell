import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, roles }) {
  const { loading, user } = useAuth()

  if (loading) {
    return <div className="page-state">Oturum kontrol ediliyor...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'shop_owner' ? '/owner/orders' : '/home'} replace />
  }

  return children
}
