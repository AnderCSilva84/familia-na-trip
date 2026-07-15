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
          authError:
            state.authError ||
            (state.currentUser
              ? 'A viagem ainda esta sincronizando. Alguns dados podem aparecer em instantes.'
              : 'A inicializacao demorou mais do que o esperado. Voce ja pode entrar manualmente.'),
        }
      })
    }, 12000)

    const finishAuthBoot = () => {
      if (authBootTimeout) {
        window.clearTimeout(authBootTimeout)
        authBootTimeout = null
      }
    }

    const unsubscribe = listenAuthChanges(async (user) => {
      if (!user) {
        finishAuthBoot()
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

        set({
          userProfile,
          trip,
          pendingInvites: [],
          loadingAuth: false,
        })
        finishAuthBoot()

        if (trip?.id) {
          ensureMembershipForTrip(trip, userProfile).catch((membershipError) => {
            console.warn('A viagem foi carregada, mas o vinculo do usuario nao foi sincronizado.', membershipError)
          })
        }
      } catch (error) {
        finishAuthBoot()
        set({
          userProfile: null,
          loadingAuth: false,
          authError: error.message ?? 'Nao foi possivel iniciar a sessao.',
          trip: null,
        })
      }
    }, (error) => {
      finishAuthBoot()
      set({
        loadingAuth: false,
        authError: error.message ?? 'Nao foi possivel verificar a sessao atual.',
      })
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
