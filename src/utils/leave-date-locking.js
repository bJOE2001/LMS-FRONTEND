function padDatePart(value) {
  return String(value).padStart(2, '0')
}

const MONTH_NUMBER_BY_NAME = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
}

const GROUPED_INCLUSIVE_DATES_PATTERN =
  /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+([0-9,\s-]+?)\s+(\d{4})\b/gi

export function normalizeIsoDate(value) {
  if (!value) return ''

  const source = String(value).trim()
  const matched = source.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/)

  if (matched) {
    return `${matched[1]}-${matched[2]}-${matched[3]}`
  }

  const parsed = new Date(source)
  if (Number.isNaN(parsed.getTime())) return ''

  return `${parsed.getFullYear()}-${padDatePart(parsed.getMonth() + 1)}-${padDatePart(parsed.getDate())}`
}

export function enumerateInclusiveDates(startValue, endValue) {
  const startDate = normalizeIsoDate(startValue)
  const endDate = normalizeIsoDate(endValue || startValue)

  if (!startDate || !endDate) return []

  const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number)

  const cursor = new Date(startYear, startMonth - 1, startDay)
  const limit = new Date(endYear, endMonth - 1, endDay)

  if (Number.isNaN(cursor.getTime()) || Number.isNaN(limit.getTime()) || cursor > limit) {
    return []
  }

  const dates = []

  while (cursor <= limit) {
    dates.push(
      `${cursor.getFullYear()}-${padDatePart(cursor.getMonth() + 1)}-${padDatePart(cursor.getDate())}`,
    )
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates
}

export function offsetIsoDate(value, daysToAdd) {
  const normalized = normalizeIsoDate(value)
  if (!normalized) return ''

  const [year, month, day] = normalized.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  if (Number.isNaN(date.getTime())) return ''

  date.setDate(date.getDate() + Number(daysToAdd || 0))

  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`
}

function normalizeDateCollection(value) {
  if (Array.isArray(value)) return value

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        return Array.isArray(parsed) ? parsed : [trimmed]
      } catch {
        return [trimmed]
      }
    }

    return [trimmed]
  }

  return []
}

function expandDayToken(token, year, monthNumber) {
  const normalizedToken = String(token || '').trim()
  if (!normalizedToken) return []

  const rangeMatch = normalizedToken.match(/^(\d{1,2})-(\d{1,2})$/)
  if (rangeMatch) {
    const startDay = Number(rangeMatch[1])
    const endDay = Number(rangeMatch[2])
    if (!Number.isInteger(startDay) || !Number.isInteger(endDay) || startDay > endDay) return []

    const dates = []
    for (let day = startDay; day <= endDay; day += 1) {
      dates.push(`${year}-${monthNumber}-${padDatePart(day)}`)
    }
    return dates
  }

  const day = Number(normalizedToken)
  if (!Number.isInteger(day)) return []
  return [`${year}-${monthNumber}-${padDatePart(day)}`]
}

export function parseInclusiveDateText(value) {
  const source = normalizeDateCollection(value)
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
    .join('\n')

  if (!source) return []

  GROUPED_INCLUSIVE_DATES_PATTERN.lastIndex = 0
  const groupedDates = []
  let matchedGroupedDates = false
  let match

  while ((match = GROUPED_INCLUSIVE_DATES_PATTERN.exec(source)) !== null) {
    matchedGroupedDates = true
    const monthNumber = MONTH_NUMBER_BY_NAME[String(match[1] || '').trim().toLowerCase()]
    const year = String(match[3] || '').trim()
    if (!monthNumber || !year) continue

    const dayTokens = String(match[2] || '')
      .replace(/\s*-\s*/g, '-')
      .replace(/\s+/g, ',')
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean)

    dayTokens.forEach((token) => {
      expandDayToken(token, year, monthNumber).forEach((date) => {
        groupedDates.push(date)
      })
    })
  }

  if (matchedGroupedDates && groupedDates.length > 0) {
    return [...new Set(groupedDates.map((date) => normalizeIsoDate(date)).filter(Boolean))].sort()
  }

  return [...new Set(
    source
      .split(/[\n,]/)
      .map((entry) => normalizeIsoDate(entry))
      .filter(Boolean),
  )].sort()
}

export function getApplicationSelectedDates(application) {
  const explicitSelectedDates =
    normalizeDateCollection(application?.selected_dates).length > 0
      ? normalizeDateCollection(application?.selected_dates)
      : normalizeDateCollection(application?.selectedDates)

  if (explicitSelectedDates.length > 0) {
    const parsedSelectedDates = explicitSelectedDates.flatMap((dateValue) => parseInclusiveDateText(dateValue))
    if (parsedSelectedDates.length > 0) {
      return [...new Set(parsedSelectedDates.map((date) => normalizeIsoDate(date)).filter(Boolean))].sort()
    }
  }

  const groupedInclusiveDates = parseInclusiveDateText(
    application?.inclusive_dates ??
      application?.inclusiveDates ??
      application?.inclusive_date ??
      application?.inclusiveDate,
  )
  if (groupedInclusiveDates.length > 0) {
    return groupedInclusiveDates
  }

  const startDate = normalizeIsoDate(
    application?.startDate ?? application?.start_date ?? application?.from_date ?? application?.fromDate,
  )
  const endDate = normalizeIsoDate(
    application?.endDate ?? application?.end_date ?? application?.to_date ?? application?.toDate ?? startDate,
  )

  return enumerateInclusiveDates(startDate, endDate)
}

export function getBlockingLeaveApplicationState(application) {
  if (!application || application.is_monetization === true) return false

  const rawStatus = String(application?.rawStatus || application?.status || application?.displayStatus || '')
    .trim()
    .toUpperCase()

  if (rawStatus.includes('REJECTED') || rawStatus.includes('DISAPPROVED') || rawStatus.includes('CANCELLED')) {
    return false
  }

  const remarks = String(application?.remarks || '').trim().toLowerCase()
  if (remarks.includes('cancel')) return false

  if (rawStatus.includes('APPROVED')) return 'approved'
  return 'pending'
}

export function isBlockingLeaveApplication(application) {
  return Boolean(getBlockingLeaveApplicationState(application))
}
