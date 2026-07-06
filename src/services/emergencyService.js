import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, ensureFirebaseConfigured, storage } from '../firebase/config'
import { resolveMapMetadata } from '../utils/locationPresets'
import { subscribeToQuery } from './firestoreRealtime'
import { geocodeLocation } from './geocodeService'

function emergencyCollection() {
  ensureFirebaseConfigured()
  return collection(db, 'emergencyContacts')
}

function mapEmergency(id, data) {
  const mapMetadata = resolveMapMetadata(data)

  return {
    id,
    tripId: data.tripId ?? '',
    title: data.title ?? '',
    audience: data.audience ?? 'adulto',
    address: data.address ?? '',
    city: data.city ?? '',
    postalCode: data.postalCode ?? '',
    description: data.description ?? '',
    specialties: data.specialties ?? '',
    phone: data.phone ?? '',
    link: data.link ?? '',
    image: data.image ?? '',
    imagePath: data.imagePath ?? '',
    mapQuery: data.mapQuery ?? mapMetadata.mapQuery ?? '',
    latitude: Number(data.latitude ?? '') || '',
    longitude: Number(data.longitude ?? '') || '',
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

async function enrichEmergencyLocationData(contact) {
  const geocoded = await geocodeLocation(contact)

  return {
    mapQuery: geocoded.mapQuery || '',
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
  }
}

async function uploadEmergencyImage(tripId, contactId, file) {
  ensureFirebaseConfigured()

  if (!storage) {
    throw new Error('Firebase Storage indisponivel.')
  }

  const safeName = String(file?.name ?? 'hospital.jpg').replace(/\s+/g, '-')
  const imagePath = `trips/${tripId}/emergency/${contactId}/${Date.now()}-${safeName}`
  const imageRef = ref(storage, imagePath)

  await uploadBytes(imageRef, file)
  const image = await getDownloadURL(imageRef)

  return {
    image,
    imagePath,
  }
}

export function subscribeEmergencyByTrip(tripId, callback, onError) {
  const emergencyQuery = query(emergencyCollection(), where('tripId', '==', tripId))
  return subscribeToQuery(
    emergencyQuery,
    (snapshot) =>
      snapshot.docs
        .map((contactDoc) => mapEmergency(contactDoc.id, contactDoc.data()))
        .sort((left, right) => `${left.audience}|${left.title}`.localeCompare(`${right.audience}|${right.title}`)),
    callback,
    onError,
  )
}

export async function getEmergencyByTrip(tripId) {
  const snapshot = await getDocs(query(emergencyCollection(), where('tripId', '==', tripId)))
  return snapshot.docs.map((contactDoc) => mapEmergency(contactDoc.id, contactDoc.data()))
}

export async function createEmergencyContact(data) {
  const emergencyRef = doc(emergencyCollection())
  const imageFile = data.imageFile ?? null
  const locationData = await enrichEmergencyLocationData(data)
  const payload = {
    id: emergencyRef.id,
    tripId: data.tripId,
    title: data.title,
    audience: data.audience ?? 'adulto',
    address: data.address ?? '',
    city: data.city ?? '',
    postalCode: data.postalCode ?? '',
    description: data.description ?? '',
    specialties: data.specialties ?? '',
    phone: data.phone ?? '',
    link: data.link ?? '',
    image: data.image ?? '',
    imagePath: data.imagePath ?? '',
    mapQuery: locationData.mapQuery,
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    createdBy: data.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(emergencyRef, payload)

  if (imageFile) {
    const uploadedImage = await uploadEmergencyImage(data.tripId, emergencyRef.id, imageFile)

    await updateDoc(emergencyRef, {
      image: uploadedImage.image,
      imagePath: uploadedImage.imagePath,
      updatedAt: serverTimestamp(),
    })
  }
}

export async function updateEmergencyContact(id, data) {
  const imageFile = data.imageFile ?? null
  const currentImagePath = data.currentImagePath ?? ''
  const payload = { ...data }

  delete payload.imageFile
  delete payload.currentImagePath

  const locationData = await enrichEmergencyLocationData(data)

  if (imageFile && data.tripId) {
    const uploadedImage = await uploadEmergencyImage(data.tripId, id, imageFile)
    payload.image = uploadedImage.image
    payload.imagePath = uploadedImage.imagePath

    if (currentImagePath && storage) {
      await deleteObject(ref(storage, currentImagePath)).catch(() => null)
    }
  }

  await updateDoc(doc(emergencyCollection(), id), {
    ...payload,
    mapQuery: locationData.mapQuery,
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteEmergencyContact(id) {
  const contactRef = doc(emergencyCollection(), id)
  const snapshot = await getDoc(contactRef)
  const contactData = snapshot.exists() ? snapshot.data() : null

  if (contactData?.imagePath && storage) {
    await deleteObject(ref(storage, contactData.imagePath)).catch(() => null)
  }

  await deleteDoc(contactRef)
}
