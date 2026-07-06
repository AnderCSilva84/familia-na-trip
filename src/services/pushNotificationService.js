export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }

  return window.Notification.requestPermission()
}

export async function getDeviceToken() {
  return null
}

export async function saveDeviceToken(userId, token) {
  return {
    userId,
    token,
    saved: false,
  }
}
