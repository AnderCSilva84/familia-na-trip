const DESIGNATED_SUPERADMIN_EMAIL = 'acs@acs.com'

export function isSuperAdmin(userProfile) {
  const normalizedEmail = String(userProfile?.email ?? '').trim().toLowerCase()
  return userProfile?.role === 'superadmin' || normalizedEmail === DESIGNATED_SUPERADMIN_EMAIL
}

export function isAdmin(userProfile) {
  return userProfile?.role === 'admin' && !isSuperAdmin(userProfile)
}

export function isMember(userProfile) {
  return userProfile?.role === 'member' && !isSuperAdmin(userProfile)
}

export function getUserRoleLabel(userProfile) {
  if (isSuperAdmin(userProfile)) {
    return 'superadmin'
  }

  if (isAdmin(userProfile)) {
    return 'admin'
  }

  return 'member'
}

export function canCreateUsers(userProfile) {
  return isSuperAdmin(userProfile)
}

export function canManageMembers(userProfile) {
  return isSuperAdmin(userProfile)
}

export function canDeleteMembers(userProfile) {
  return isSuperAdmin(userProfile)
}

export function canInviteMembers(userProfile) {
  return isSuperAdmin(userProfile) || isAdmin(userProfile)
}

export function canPromoteAdmins(userProfile) {
  return isSuperAdmin(userProfile)
}

export function canImportExpenses(userProfile) {
  return isSuperAdmin(userProfile)
}

export function canCreateContent(userProfile) {
  return Boolean(userProfile?.uid)
}

export function canEditOwnContent(userProfile, item) {
  return Boolean(userProfile?.uid) && item?.createdBy === userProfile.uid
}

export function canEditAnyContent(userProfile) {
  return isSuperAdmin(userProfile) || isAdmin(userProfile)
}

export function canDeleteOwnContent(userProfile, item) {
  return canEditOwnContent(userProfile, item)
}

export function canDeleteAnyContent(userProfile) {
  return isSuperAdmin(userProfile) || isAdmin(userProfile)
}
