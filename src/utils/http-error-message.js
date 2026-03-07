function toSingleMessage(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : ''
  }

  return ''
}

function extractValidationMessage(errors) {
  if (!errors || typeof errors !== 'object') return ''

  for (const key of Object.keys(errors)) {
    const value = errors[key]
    if (Array.isArray(value) && value.length) {
      const first = toSingleMessage(value[0])
      if (first) return first
    }

    const message = toSingleMessage(value)
    if (message) return message
  }

  return ''
}

export function resolveApiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const response = err?.response
  const payload = response?.data

  const directMessage = toSingleMessage(payload?.message) || toSingleMessage(payload?.error)
  if (directMessage) return directMessage

  const validationMessage = extractValidationMessage(payload?.errors)
  if (validationMessage) return validationMessage

  if (err?.code === 'ERR_NETWORK') {
    return 'Cannot reach the server. Check your connection and API URL.'
  }

  if (err?.code === 'ECONNABORTED') {
    return 'The request timed out. Please try again.'
  }

  const status = Number(response?.status)
  if (status === 401) return 'Your session expired. Please sign in again.'
  if (status === 403) return 'You do not have permission to do this action.'
  if (status === 404) return 'Requested service was not found. Please check the API URL.'
  if (status === 422) return 'Some details are invalid. Please review and try again.'
  if (status === 429) return 'Too many requests. Please wait a minute and try again.'
  if (status >= 500) return 'Server error. Please try again in a moment.'

  const errorMessage = toSingleMessage(err?.message)
  if (errorMessage && errorMessage !== 'Network Error') {
    return errorMessage
  }

  return fallback
}
