import { Navigate, Outlet } from 'react-router-dom'
import Loading from '../components/common/Loading'
import useAuth from '../hooks/useAuth'
import { isSuperAdmin } from '../utils/permissions'

function AdminRoute() {
  const { loadingAuth, userProfile } = useAuth()

  if (loadingAuth) {
    return <Loading />
  }

  if (!isSuperAdmin(userProfile)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default AdminRoute
