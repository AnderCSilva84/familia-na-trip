import { Navigate, Outlet } from 'react-router-dom'
import Loading from '../components/common/Loading'
import Button from '../components/common/Button'
import ErrorState from '../components/feedback/ErrorState'
import useAuth from '../hooks/useAuth'

function PrivateRoute() {
  const { loadingAuth, isAuthenticated, currentUser, trip, authError } = useAuth()

  if (loadingAuth) {
    return <Loading />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (currentUser && !trip) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <ErrorState
          title="A viagem ainda nao foi carregada"
          description={authError || 'Estamos sincronizando seus dados. Aguarde alguns instantes e tente novamente.'}
          action={<Button onClick={() => window.location.reload()}>Tentar novamente</Button>}
        />
      </div>
    )
  }

  return <Outlet />
}

export default PrivateRoute
