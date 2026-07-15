import { useMemo } from 'react'
import useAppStore from '../store/useAppStore'
import { loginWithEmail, logoutUser, registerWithEmail, requestPasswordReset } from '../services/authService'

function useAuth() {
  const currentUser = useAppStore((state) => state.currentUser)
  const storedUserProfile = useAppStore((state) => state.userProfile)
  const trip = useAppStore((state) => state.trip)
  const loadingAuth = useAppStore((state) => state.loadingAuth)
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)
  const authError = useAppStore((state) => state.authError)
  const pendingInvites = useAppStore((state) => state.pendingInvites)
  const clearAuth = useAppStore((state) => state.clearAuth)
  const setCurrentUser = useAppStore((state) => state.setCurrentUser)
  const userProfile = useMemo(
    () => ({
      uid: storedUserProfile?.uid ?? currentUser?.uid ?? '',
      name: storedUserProfile?.name ?? currentUser?.displayName ?? 'Usuario',
      email: storedUserProfile?.email ?? currentUser?.email ?? '',
      photoURL: storedUserProfile?.photoURL ?? currentUser?.photoURL ?? '',
      photoPath: storedUserProfile?.photoPath ?? '',
      role: storedUserProfile?.role ?? 'member',
      active: storedUserProfile?.active ?? true,
      createdAt: storedUserProfile?.createdAt ?? null,
      updatedAt: storedUserProfile?.updatedAt ?? null,
    }),
    [currentUser, storedUserProfile],
  )

  async function login(email, password) {
    const user = await loginWithEmail(email, password)
    setCurrentUser(user)
    return user
  }

  async function register(name, email, password) {
    const user = await registerWithEmail(email, password, name)
    setCurrentUser(user)
    return user
  }

  async function logout() {
    await logoutUser()
    clearAuth()
  }

  async function forgotPassword(email) {
    return requestPasswordReset(email)
  }

  return {
    currentUser,
    userProfile,
    trip,
    pendingInvites,
    loadingAuth,
    isAuthenticated,
    authError,
    login,
    register,
    forgotPassword,
    logout,
  }
}

export default useAuth
