import { useEffect, useMemo, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { canUseMockFallback } from '../utils/runtimeMode'
import {
  deleteMemberLocation,
  shareMemberLocation,
  subscribeMemberLocationsByTrip,
} from '../services/memberLocationService'

const LOCATION_SHARE_INTERVAL_MS = 2 * 60 * 1000
const LOCATION_ACTIVE_WINDOW_MS = 15 * 60 * 1000

function normalizeDateValue(value) {
  if (!value) {
    return null
  }

  if (typeof value?.toDate === 'function') {
    const converted = value.toDate()
    return Number.isNaN(converted.getTime()) ? null : converted
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function isPermissionError(error) {
  const message = String(error?.message ?? '').toLowerCase()
  return message.includes('missing or insufficient permissions') || message.includes('permission-denied')
}

function getLocationErrorMessage(error, fallback) {
  if (isPermissionError(error)) {
    return 'O Firebase bloqueou a localizacao da familia. Publique no Firestore a regra de memberLocations para leitura e escrita.'
  }

  return error?.message ?? fallback
}

function useMemberLocations({ enabled = true } = {}) {
  const trip = useAppStore((state) => state.trip)
  const currentUser = useAppStore((state) => state.currentUser)
  const userProfile = useAppStore((state) => state.userProfile)
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sharingLocation, setSharingLocation] = useState(false)
  const [nowTs, setNowTs] = useState(() => Date.now())
  const usingMockData = canUseMockFallback()
  const userId = userProfile?.uid ?? currentUser?.uid ?? ''

  useEffect(() => {
    if (!enabled) {
      return () => {}
    }

    const intervalId = window.setInterval(() => {
      setNowTs(Date.now())
    }, 60000)

    return () => window.clearInterval(intervalId)
  }, [enabled])

  useEffect(() => {
    if (!enabled || !trip?.id || usingMockData) {
      return () => {}
    }

    queueMicrotask(() => {
      setLoading(true)
      setError('')
    })

    return subscribeMemberLocationsByTrip(
      trip.id,
      (nextLocations) => {
        setLocations(nextLocations)
        setLoading(false)
      },
      (loadError) => {
        setError(getLocationErrorMessage(loadError, 'Nao foi possivel carregar a localizacao da familia.'))
        setLocations([])
        setLoading(false)
      },
    )
  }, [enabled, trip?.id, usingMockData])

  const myLocation = useMemo(
    () => locations.find((location) => location.userId === userId) ?? null,
    [locations, userId],
  )
  const myLocationUpdatedAt = normalizeDateValue(myLocation?.updatedAt)
  const msSinceMyLastShare = myLocationUpdatedAt ? nowTs - myLocationUpdatedAt.getTime() : Number.POSITIVE_INFINITY
  const canRefreshNow = msSinceMyLastShare >= LOCATION_SHARE_INTERVAL_MS
  const nextRefreshInMs = Math.max(0, LOCATION_SHARE_INTERVAL_MS - msSinceMyLastShare)
  const activeLocations = useMemo(
    () =>
      locations.filter((location) => {
        const updatedAt = normalizeDateValue(location.updatedAt)

        if (!updatedAt) {
          return false
        }

        return nowTs - updatedAt.getTime() <= LOCATION_ACTIVE_WINDOW_MS
      }),
    [locations, nowTs],
  )

  async function shareCurrentLocation() {
    if (!trip?.id || !userId) {
      throw new Error('Entre no aplicativo para compartilhar sua localizacao.')
    }

    if (!navigator.geolocation) {
      throw new Error('A geolocalizacao nao esta disponivel neste dispositivo.')
    }

    if (myLocation && !canRefreshNow) {
      const remainingMinutes = Math.ceil(nextRefreshInMs / 60000)
      throw new Error(
        `Sua localizacao ja foi atualizada ha pouco. Tente novamente em ${remainingMinutes} min para economizar bateria e gravacoes.`,
      )
    }

    setSharingLocation(true)
    setError('')

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 120000,
        })
      })

      await shareMemberLocation({
        tripId: trip.id,
        userId,
        memberId: userId,
        name: userProfile?.name ?? currentUser?.displayName ?? 'Membro da familia',
        email: userProfile?.email ?? currentUser?.email ?? '',
        photoURL: userProfile?.photoURL ?? currentUser?.photoURL ?? '',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        source: 'device',
      })
    } catch (shareError) {
      const code = shareError?.code

      if (code === 1) {
        setError('Permita o acesso a localizacao do celular para compartilhar sua posicao.')
      } else if (code === 2) {
        setError('Nao conseguimos descobrir sua localizacao agora. Tente novamente em instantes.')
      } else if (code === 3) {
        setError('A busca pela localizacao demorou demais. Tente novamente em um local com melhor sinal.')
      } else {
        setError(getLocationErrorMessage(shareError, 'Nao foi possivel compartilhar sua localizacao.'))
      }

      throw shareError
    } finally {
      setSharingLocation(false)
    }
  }

  async function stopSharingCurrentLocation() {
    if (!userId) {
      return
    }

    setError('')
    await deleteMemberLocation(userId)
  }

  return {
    locations: enabled && trip?.id && !usingMockData ? locations : [],
    loading: enabled && trip?.id && !usingMockData ? loading : false,
    error,
    sharingLocation,
    myLocation,
    activeLocations,
    activeCount: activeLocations.length,
    isSharing: Boolean(myLocation),
    canRefreshNow,
    nextRefreshInMs,
    shareCurrentLocation,
    stopSharingCurrentLocation,
  }
}

export default useMemberLocations
