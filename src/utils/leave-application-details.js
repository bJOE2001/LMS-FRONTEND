function parseObjectCandidate(value) {
  if (!value) return null
  if (typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value !== 'string') return null

  const trimmedValue = value.trim()
  if (!trimmedValue) return null

  try {
    const parsedValue = JSON.parse(trimmedValue)
    return parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)
      ? parsedValue
      : null
  } catch {
    return null
  }
}

function normalizeVacationDetail(value) {
  const normalizedValue = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

  if (normalizedValue.includes('abroad')) return 'Abroad'
  if (normalizedValue.includes('within') && normalizedValue.includes('philippines')) {
    return 'Within the Philippines'
  }

  return ''
}

function getVacationDetailValue(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return ''

  return source.vacation_detail ?? source.vacationDetail ?? ''
}

export function resolveVacationLeaveDetail(application) {
  const detailsOfLeave = parseObjectCandidate(
    application?.details_of_leave ?? application?.detailsOfLeave,
  )
  const pendingUpdate = parseObjectCandidate(application?.pending_update)
  const latestUpdate = parseObjectCandidate(application?.latest_update_request_payload)
  const sources = [
    application,
    detailsOfLeave,
    parseObjectCandidate(application?.details),
    pendingUpdate,
    parseObjectCandidate(pendingUpdate?.details_of_leave ?? pendingUpdate?.detailsOfLeave),
    parseObjectCandidate(pendingUpdate?.details),
    latestUpdate,
    parseObjectCandidate(latestUpdate?.details_of_leave ?? latestUpdate?.detailsOfLeave),
    parseObjectCandidate(latestUpdate?.details),
  ]

  for (const source of sources) {
    const normalizedDetail = normalizeVacationDetail(getVacationDetailValue(source))
    if (normalizedDetail) return normalizedDetail
  }

  return normalizeVacationDetail(application?.details_of_leave ?? application?.detailsOfLeave)
}

export function isAbroadLeaveApplication(application) {
  return resolveVacationLeaveDetail(application) === 'Abroad'
}
