import { useEffect, useState } from 'react'
import { mockData } from '../data/mockData'
import useAppStore from '../store/useAppStore'
import { canUseMockFallback } from '../utils/runtimeMode'
import {
  createVehicleRental,
  deleteVehicleRental,
  getVehiclesByTrip,
  subscribeVehiclesByTrip,
  updateVehicleRental,
} from '../services/vehicleService'

function mapMockVehicle(vehicle) {
  return {
    id: vehicle.id,
    title: vehicle.model,
    rentalCompany: vehicle.company,
    vehicleModel: vehicle.model,
    pickupLocation: vehicle.location,
    returnLocation: vehicle.location,
    pickupDate: vehicle.pickup,
    returnDate: vehicle.dropoff,
    estimatedValue: vehicle.value ?? 0,
    finalValue: vehicle.value ?? 0,
    link: vehicle.link ?? '',
    image: vehicle.image ?? '',
    status: String(vehicle.status ?? 'pesquisando').toLowerCase().includes('reserv')
      ? 'reservado'
      : 'pesquisando',
    notes: '',
    createdBy: mockData.currentUser.id,
  }
}

function useVehicles() {
  const trip = useAppStore((state) => state.trip)
  const userProfile = useAppStore((state) => state.userProfile)
  const [vehicles, setVehicles] = useState([])
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

    const unsubscribe = subscribeVehiclesByTrip(
      trip.id,
      (data) => {
        setVehicles(data)
        setLoading(false)
      },
      (loadError) => {
        setError(loadError.message ?? 'Nao foi possivel carregar veiculos.')
        setVehicles([])
        setLoading(false)
      },
    )

    return unsubscribe
  }, [trip?.id, usingMockData])

  async function refresh() {
    if (!trip?.id) {
      setVehicles([])
      return
    }
    setVehicles(await getVehiclesByTrip(trip.id))
  }

  async function create(data) {
    await createVehicleRental({ ...data, tripId: trip.id, createdBy: userProfile.uid })
  }
  async function update(id, data) {
    await updateVehicleRental(id, data)
  }
  async function remove(id) {
    await deleteVehicleRental(id)
  }

  return {
    vehicles: usingMockData ? mockData.vehicles.map(mapMockVehicle) : vehicles,
    loading: trip?.id && !usingMockData ? loading : false,
    error,
    usingMockData,
    create,
    update,
    delete: remove,
    refresh,
  }
}

export default useVehicles
