import { useEffect, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { canUseMockFallback } from '../utils/runtimeMode'
import {
  addAgendaReviewComment,
  createOrUpdateAgendaReview,
  deleteAgendaReview,
  subscribeAgendaReviewsByTrip,
  toggleAgendaReviewLike,
} from '../services/agendaReviewService'

function useAgendaReviews() {
  const trip = useAppStore((state) => state.trip)
  const userProfile = useAppStore((state) => state.userProfile)
  const [reviews, setReviews] = useState([])
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

    return subscribeAgendaReviewsByTrip(
      trip.id,
      (data) => {
        setReviews(data)
        setLoading(false)
      },
      (loadError) => {
        setReviews([])
        setError(loadError.message ?? 'Nao foi possivel carregar as avaliacoes.')
        setLoading(false)
      },
    )
  }, [trip?.id, usingMockData])

  async function saveReview(event, data) {
    return createOrUpdateAgendaReview({
      tripId: trip.id,
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.date,
      eventImage: event.image ?? '',
      userId: userProfile.uid,
      userName: userProfile.name,
      userAvatar: userProfile.photoURL,
      actualCost: data.actualCost,
      rating: data.rating,
      note: data.note ?? '',
    })
  }

  async function toggleLike(reviewId) {
    return toggleAgendaReviewLike(reviewId, {
      uid: userProfile.uid,
    })
  }

  async function addComment(reviewId, text) {
    return addAgendaReviewComment(reviewId, {
      userId: userProfile.uid,
      userName: userProfile.name,
      userAvatar: userProfile.photoURL,
      text,
    })
  }

  async function removeReview(reviewId) {
    return deleteAgendaReview(reviewId)
  }

  return {
    reviews: usingMockData ? [] : reviews,
    loading: trip?.id && !usingMockData ? loading : false,
    error,
    usingMockData,
    saveReview,
    toggleLike,
    addComment,
    deleteReview: removeReview,
  }
}

export default useAgendaReviews
