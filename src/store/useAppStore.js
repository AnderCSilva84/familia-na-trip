import { create } from 'zustand'
import { listenAuthChanges } from '../services/authService'
import { ensureMembershipForTrip, getMembershipsForUser } from '../services/memberService'
import { ensureDefaultTripForUser, getTripById } from '../services/tripService'
import { ensureUserProfile } from '../services/userService'

let authUnsubscribe = null
let authBootTimeout = null

const useAppStore = create((set) => ({
  currentUser: null,
  userProfile: null,
  loadingAuth: true,
  isAuthenticated: false,
  authError: '',
  trip: null,
  pendingInvites: [],
  setCurrentUser: (currentUser) =>
    set({
      currentUser,
      isAuthenticated: Boolean(currentUser),
    }),
  setUserProfile: (userProfile) => set({ userProfile }),
  setTrip: (trip) => set({ trip: trip ?? null }),
  setPendingInvites: (pendingInvites) => set({ pendingInvites }),
  clearAuth: () =>
    set({
      currentUser: null,
      userProfile: null,
      loadingAuth: false,
      isAuthenticated: false,
      authError: '',
      trip: null,
      pendingInvites: [],
    }),
  initAuthListener: () => {
    if (authUnsubscribe) {
      return authUnsubscribe
    }

    set({ loadingAuth: true })

    if (authBootTimeout) {
      window.clearTimeout(authBootTimeout)
    }

    authBootTimeout = window.setTimeout(() => {
      set((state) => {
        if (!state.loadingAuth) {
          return state
        }

        return {
          loadingAuth: false,
          authError: state.authError || 'A inicializacao demorou mais do que o esperado. Voce ja pode entrar manualmente.',
        }
      })
    }, 4000)

    const unsubscribe = listenAuthChanges(async (user) => {
      if (authBootTimeout) {
        window.clearTimeout(authBootTimeout)
        authBootTimeout = null
      }

      if (!user) {
        set({
          currentUser: null,
          userProfile: null,
          loadingAuth: false,
          isAuthenticated: false,
          authError: '',
          trip: null,
          pendingInvites: [],
        })
        return
      }

      set({
        currentUser: user,
        isAuthenticated: true,
        loadingAuth: true,
        authError: '',
      })

      try {
        const userProfile = await ensureUserProfile(user)
        const memberships = await getMembershipsForUser(userProfile.uid, userProfile.email)

        const membershipTripId = memberships[0]?.tripId
        const trip = membershipTripId
          ? await getTripById(membershipTripId)
          : await ensureDefaultTripForUser(userProfile)

        if (trip?.id) {
          await ensureMembershipForTrip(trip, userProfile)
        }

        set({
          userProfile,
          trip,
          pendingInvites: [],
          loadingAuth: false,
        })
      } catch (error) {
        set({
          userProfile: null,
          loadingAuth: false,
          authError: error.message ?? 'Nao foi possivel iniciar a sessao.',
          trip: null,
        })
      }
    })

    authUnsubscribe = () => {
      if (authBootTimeout) {
        window.clearTimeout(authBootTimeout)
        authBootTimeout = null
      }

      unsubscribe()
      authUnsubscribe = null
    }

    return authUnsubscribe
  },
}))

export default useAppStore
