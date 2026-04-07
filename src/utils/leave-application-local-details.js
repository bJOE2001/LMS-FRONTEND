const STORAGE_KEY = 'lms_leave_application_local_details_v1'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function getApplicationStorageKey(application) {
  const rawId =
    application?.id ??
    application?.application_id ??
    application?.leave_application_id ??
    null

  const normalizedId = String(rawId ?? '').trim()
  return normalizedId || ''
}

function readStoredOverrides() {
  if (!canUseStorage()) return {}

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY)
    if (!rawValue) return {}

    const parsedValue = JSON.parse(rawValue)
    return parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)
      ? parsedValue
      : {}
  } catch {
    return {}
  }
}

function writeStoredOverrides(overrides) {
  if (!canUseStorage()) return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    // Ignore storage quota and serialization issues.
  }
}

function buildStoredOverridePayload(application) {
  const details =
    application?.details && typeof application.details === 'object' && !Array.isArray(application.details)
      ? application.details
      : {}

  return {
    details: {
      ...details,
      vacation_detail: application?.vacation_detail ?? details?.vacation_detail ?? '',
      vacation_specify: application?.vacation_specify ?? details?.vacation_specify ?? '',
      sick_detail: application?.sick_detail ?? details?.sick_detail ?? '',
      sick_specify: application?.sick_specify ?? details?.sick_specify ?? '',
      women_specify: application?.women_specify ?? details?.women_specify ?? '',
      study_detail: application?.study_detail ?? details?.study_detail ?? '',
      other_purpose: application?.other_purpose ?? details?.other_purpose ?? '',
      leave_type_other: application?.leave_type_other ?? details?.leave_type_other ?? '',
    },
    vacation_detail: application?.vacation_detail ?? details?.vacation_detail ?? '',
    vacation_specify: application?.vacation_specify ?? details?.vacation_specify ?? '',
    sick_detail: application?.sick_detail ?? details?.sick_detail ?? '',
    sick_specify: application?.sick_specify ?? details?.sick_specify ?? '',
    women_specify: application?.women_specify ?? details?.women_specify ?? '',
    study_detail: application?.study_detail ?? details?.study_detail ?? '',
    other_purpose: application?.other_purpose ?? details?.other_purpose ?? '',
    leave_type_other: application?.leave_type_other ?? details?.leave_type_other ?? '',
  }
}

export function saveLocalLeaveApplicationDetails(application) {
  const storageKey = getApplicationStorageKey(application)
  if (!storageKey) return

  const overrides = readStoredOverrides()
  overrides[storageKey] = buildStoredOverridePayload(application)
  writeStoredOverrides(overrides)
}

export function mergeLocalLeaveApplicationDetails(application) {
  const storageKey = getApplicationStorageKey(application)
  if (!storageKey) return application

  const overrides = readStoredOverrides()
  const storedOverride = overrides[storageKey]
  if (!storedOverride || typeof storedOverride !== 'object') return application

  const currentDetails =
    application?.details && typeof application.details === 'object' && !Array.isArray(application.details)
      ? application.details
      : {}
  const overrideDetails =
    storedOverride?.details && typeof storedOverride.details === 'object' && !Array.isArray(storedOverride.details)
      ? storedOverride.details
      : {}

  return {
    ...application,
    ...storedOverride,
    details: {
      ...currentDetails,
      ...overrideDetails,
    },
  }
}
