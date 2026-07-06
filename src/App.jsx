import { useEffect } from 'react'
import AppRoutes from './routes/AppRoutes'
import useAppStore from './store/useAppStore'

function App() {
  const initAuthListener = useAppStore((state) => state.initAuthListener)

  useEffect(() => {
    const unsubscribe = initAuthListener()
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [initAuthListener])

  return <AppRoutes />
}

export default App
