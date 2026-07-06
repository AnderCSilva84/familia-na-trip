import { Navigate, Outlet } from 'react-router-dom'
import Loading from '../components/common/Loading'
import useAuth from '../hooks/useAuth'

function PrivateRoute() {
  const { loadingAuth, isAuthenticated } = useAuth()

  if (loadingAuth) {
    return <Loading />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default PrivateRoute
