import { useEffect, useState } from 'react'
import { mockData } from '../data/mockData'
import useAppStore from '../store/useAppStore'
import { canUseMockFallback } from '../utils/runtimeMode'
import {
  closePoll,
  createPoll,
  deletePoll,
  getPollsByTrip,
  reopenPoll,
  subscribePollsByTrip,
  votePoll,
} from '../services/pollService'

function mapMockPoll(poll) {
  const options = poll.options.map((option, index) => ({
    id: `option-${index + 1}`,
    text: option.label,
  }))
  const votes = options.reduce((acc, option, index) => {
    const optionVotes = poll.options[index]?.votes ?? 0
    acc[option.id] = Array.from({ length: optionVotes }).map((_, voteIndex) => `mock-${voteIndex}`)
    return acc
  }, {})
  return {
    id: poll.id,
    question: poll.question,
    options,
    votes,
    active: true,
    allowMultipleVotes: false,
    createdBy: mockData.currentUser.id,
  }
}

function usePolls() {
  const trip = useAppStore((state) => state.trip)
  const userProfile = useAppStore((state) => state.userProfile)
  const [polls, setPolls] = useState([])
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

    const unsubscribe = subscribePollsByTrip(
      trip.id,
      (data) => {
        setPolls(data)
        setLoading(false)
      },
      (loadError) => {
        setError(loadError.message ?? 'Nao foi possivel carregar enquetes.')
        setPolls([])
        setLoading(false)
      },
    )

    return unsubscribe
  }, [trip?.id, usingMockData])

  async function refresh() {
    if (!trip?.id) {
      setPolls([])
      return
    }
    setPolls(await getPollsByTrip(trip.id))
  }

  async function create(data) {
    await createPoll({ ...data, tripId: trip.id, createdBy: userProfile.uid })
  }
  async function vote(pollId, optionId) {
    await votePoll(pollId, optionId, userProfile.uid)
  }
  async function close(id) {
    await closePoll(id)
  }
  async function reopen(id) {
    await reopenPoll(id)
  }
  async function remove(id) {
    await deletePoll(id)
  }

  return {
    polls: usingMockData ? mockData.polls.map(mapMockPoll) : polls,
    loading: trip?.id && !usingMockData ? loading : false,
    error,
    usingMockData,
    create,
    vote,
    close,
    reopen,
    delete: remove,
    refresh,
  }
}

export default usePolls
