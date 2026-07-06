import { onSnapshot } from 'firebase/firestore'

export function subscribeToQuery(queryRef, mapSnapshot, onData, onError) {
  return onSnapshot(
    queryRef,
    (snapshot) => {
      onData(mapSnapshot(snapshot))
    },
    (error) => {
      if (onError) {
        onError(error)
      }
    },
  )
}
