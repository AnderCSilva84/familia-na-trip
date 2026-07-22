import { create } from 'zustand'
import { listenAuthChanges } from '../services/authService'
import { ensureMembershipForTrip, getMembershipsForUser } from '../services/memberService'
import { ensureDefaultTripForUser, getAllTrips, getTripsByIds } from '../services/tripService'
import { isSuperAdmin } from '../utils/permissions'
import { ensureUserProfile } from '../services/userService'
import { getAgendaByTrips } from '../services/agendaService'

let authUnsubscribe = null
let authBootTimeout = null

function prepareTrips(trips, agenda) {
  const eventCountByTrip = agenda.reduce((counts, item) => {
    counts.set(item.tripId, (counts.get(item.tripId) ?? 0) + 1)
    return counts
  }, new Map())
  const uniqueTrips = new Map()

  for (const trip of trips) {
    const key = `${String(trip.name).trim().toLowerCase()}|${String(trip.destination).trim().toLowerCase()}`
    const current = uniqueTrips.get(key)
    const currentEventCount = eventCountByTrip.get(current?.id) ?? 0
    const candidateEventCount = eventCountByTrip.get(trip.id) ?? 0

    if (!current || candidateEventCount > currentEventCount) {
      uniqueTrips.set(key, trip)
    }
  }

  return [...uniqueTrips.values()].map((trip) => {
    const eventDates = agenda
      .filter((item) => item.tripId === trip.id)
      .map((item) => String(item.date ?? '').slice(0, 10))
      .filter(Boolean)
      .sort()

    return {
      ...trip,
      effectiveStartDate: eventDates[0] || trip.startDate,
      effectiveEndDate: eventDates.at(-1) || trip.endDate,
    }
  })
}

const useAppStore = create((set) => ({
  currentUser: null,
  userProfile: null,
  loadingAuth: true,
  isAuthenticated: false,
  authError: '',
  trip: null,
  trips: [],
  pendingInvites: [],
  setCurrentUser: (currentUser) =>
    set({
      currentUser,
      isAuthenticated: Boolean(currentUser),
    }),
  setUserProfile: (userProfile) => set({ userProfile }),
  setTrip: (trip) => {
    if (trip?.id) window.localStorage.setItem('familia-na-trip:selectedTripId', trip.id)
    set({ trip: trip ?? null })
  },
  setTrips: (trips) => set({ trips: trips ?? [] }),
  setPendingInvites: (pendingInvites) => set({ pendingInvites }),
  clearAuth: () =>
    set({
      currentUser: null,
      userProfile: null,
      loadingAuth: false,
      isAuthenticated: false,
      authError: '',
      trip: null,
      trips: [],
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
          trips: [],
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

        let trips = isSuperAdmin(userProfile)
          ? await getAllTrips()
          : await getTripsByIds(memberships.map((membership) => membership.tripId))

        if (trips.length === 0) {
          const defaultTrip = await ensureDefaultTripForUser(userProfile)
          trips = defaultTrip ? [defaultTrip] : []
        }

        const allAgenda = await getAgendaByTrips(trips.map((item) => item.id))
        trips = prepareTrips(trips, allAgenda)

        const selectedTripId = window.localStorage.getItem('familia-na-trip:selectedTripId')
        const trip = trips.find((item) => item.id === selectedTripId) ?? trips[0] ?? null

        set({
          userProfile,
          trip,
          trips,
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
