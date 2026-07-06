import { useEffect, useState } from 'react'
import { mockData } from '../data/mockData'
import useAppStore from '../store/useAppStore'
import { canUseMockFallback } from '../utils/runtimeMode'
import {
  createHotelReservation,
  deleteHotelReservation,
  getHotelsByTrip,
  subscribeHotelsByTrip,
  updateHotelReservation,
} from '../services/hotelService'

function mapMockHotel(hotel) {
  return {
    id: hotel.id,
    title: hotel.name,
    hotelName: hotel.name,
    address: hotel.room ?? '',
    checkIn: hotel.checkIn,
    checkOut: hotel.checkOut,
    estimatedValue: hotel.value ?? 0,
    finalValue: hotel.value ?? 0,
    link: hotel.link ?? '',
    image: hotel.image ?? '',
    status: String(hotel.status ?? 'pesquisando').toLowerCase().includes('confirm')
      ? 'reservado'
      : 'pesquisando',
    notes: '',
    createdBy: mockData.currentUser.id,
  }
}

function useHotels() {
  const trip = useAppStore((state) => state.trip)
  const userProfile = useAppStore((state) => state.userProfile)
  const [hotels, setHotels] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const usingMockData = canUseMockFallback()

  useEffect(() => {
    if (!trip?.id || usingMockData) {
      return () => {}
    }

    queueMicrotask(() => {
      setLoading(true)
      setError('')
    })

    const unsubscribe = subscribeHotelsByTrip(
      trip.id,
      (data) => {
        setHotels(data)
        setLoading(false)
      },
      (loadError) => {
        setError(loadError.message ?? 'Nao foi possivel carregar hospedagens.')
        setHotels([])
        setLoading(false)
      },
    )

    return unsubscribe
  }, [trip?.id, usingMockData])

  async function refreshHotels() {
    if (!trip?.id) {
      setHotels([])
      return
    }
    setHotels(await getHotelsByTrip(trip.id))
  }

  async function create(data) {
    await createHotelReservation({
      ...data,
      tripId: trip.id,
      createdBy: userProfile.uid,
    })
  }

  async function update(id, data) {
    await updateHotelReservation(id, data)
  }

  async function remove(id) {
    await deleteHotelReservation(id)
  }

  return {
    hotels: usingMockData ? mockData.hotels.map(mapMockHotel) : hotels,
    loading: trip?.id && !usingMockData ? loading : false,
    error,
    usingMockData,
    create,
    update,
    delete: remove,
    refresh: refreshHotels,
  }
}

export default useHotels
