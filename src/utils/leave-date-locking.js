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

function parseGroupedInclusiveDateSegments(source) {
  const text = String(source || '')
  if (!text.trim()) return []

  const monthTokens = []
  const monthPattern = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/gi
  let monthMatch

  while ((monthMatch = monthPattern.exec(text)) !== null) {
    monthTokens.push({
      index: monthMatch.index,
      endIndex: monthPattern.lastIndex,
      monthLabel: String(monthMatch[1] || '').trim(),
    })
  }

  if (!monthTokens.length) return []

  const discoveredYears = text.match(/\b\d{4}\b/g) || []
  const fallbackYear = discoveredYears.length ? String(discoveredYears[discoveredYears.length - 1]).trim() : ''
  const parsedDates = []

  monthTokens.forEach((token, index) => {
    const monthNumber = MONTH_NUMBER_BY_NAME[token.monthLabel.toLowerCase()]
    if (!monthNumber) return

    const nextToken = monthTokens[index + 1]
    const segmentEndIndex = nextToken ? nextToken.index : text.length
    const segment = text.slice(token.endIndex, segmentEndIndex)
    const segmentYearMatch = segment.match(/\b(\d{4})\b/)
    const segmentYear = segmentYearMatch ? String(segmentYearMatch[1]).trim() : fallbackYear
    if (!segmentYear) return

    const segmentWithoutYear = segment.replace(/\b\d{4}\b/g, ' ')
    const dayTokens = segmentWithoutYear.match(/\b\d{1,2}(?:\s*-\s*\d{1,2})?\b/g) || []
    dayTokens.forEach((dayToken) => {
      expandDayToken(dayToken, segmentYear, monthNumber).forEach((date) => {
        parsedDates.push(date)
      })
    })
  })

  return [...new Set(parsedDates.map((date) => normalizeIsoDate(date)).filter(Boolean))].sort()
}

function parseWrittenDateRangeSegments(source) {
  const text = String(source || '')
  if (!text.trim()) return []

  const dateRangePattern = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\s*(?:to|-)\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b/gi
  const matchedRanges = text.match(dateRangePattern) || []
  if (!matchedRanges.length) return []

  const expandedDates = []

  matchedRanges.forEach((rangeText) => {
    const normalizedRangeText = String(rangeText || '').replace(/\s*-\s*/g, ' to ')
    const splitRange = normalizedRangeText.split(/\s+to\s+/i).map((entry) => entry.trim()).filter(Boolean)
    if (splitRange.length !== 2) return

    const [startLabel, endLabel] = splitRange
    const startDate = normalizeIsoDate(startLabel)
    const endDate = normalizeIsoDate(endLabel)
    if (!startDate || !endDate) return

    enumerateInclusiveDates(startDate, endDate).forEach((date) => expandedDates.push(date))
  })

  return [...new Set(expandedDates.map((date) => normalizeIsoDate(date)).filter(Boolean))].sort()
}

export function parseInclusiveDateText(value) {
  const source = normalizeDateCollection(value)
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
    .join('\n')

  if (!source) return []

  const writtenRangeDates = parseWrittenDateRangeSegments(source)
  if (writtenRangeDates.length > 0) {
    return writtenRangeDates
  }

  const groupedSegmentDates = parseGroupedInclusiveDateSegments(source)
  if (groupedSegmentDates.length > 0) {
    return groupedSegmentDates
  }

  GROUPED_INCLUSIVE_DATES_PATTERN.lastIndex = 0
  const groupedDates = []
  let match

  while ((match = GROUPED_INCLUSIVE_DATES_PATTERN.exec(source)) !== null) {
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

  if (groupedDates.length > 0) {
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

function getApplicationRawStatus(application) {
  return String(application?.rawStatus || application?.status || application?.displayStatus || '')
    .trim()
    .toUpperCase()
}

export function getApplicationRecalledDates(application) {
  const explicitRecallDates =
    normalizeDateCollection(application?.recall_selected_dates).length > 0
      ? normalizeDateCollection(application?.recall_selected_dates)
      : normalizeDateCollection(application?.recallSelectedDates)

  if (explicitRecallDates.length > 0) {
    const parsedRecallDates = explicitRecallDates.flatMap((dateValue) => parseInclusiveDateText(dateValue))
    if (parsedRecallDates.length > 0) {
      return [...new Set(parsedRecallDates.map((date) => normalizeIsoDate(date)).filter(Boolean))].sort()
    }
  }

  if (!getApplicationRawStatus(application).includes('RECALLED')) {
    return []
  }

  const recallEffectiveDate = normalizeIsoDate(
    application?.recall_effective_date ?? application?.recallEffectiveDate,
  )
  if (!recallEffectiveDate) {
    return getApplicationSelectedDates(application)
  }

  return getApplicationSelectedDates(application).filter((date) => date >= recallEffectiveDate)
}

export function getApplicationBlockingDates(application) {
  if (!application || application.is_monetization === true) return []

  const rawStatus = getApplicationRawStatus(application)
  if (
    rawStatus.includes('REJECTED') ||
    rawStatus.includes('DISAPPROVED') ||
    rawStatus.includes('CANCELLED')
  ) {
    return []
  }

  const remarks = String(application?.remarks || '').trim().toLowerCase()
  if (remarks.includes('cancel')) return []

  const selectedDates = getApplicationSelectedDates(application)
  if (!rawStatus.includes('RECALLED')) {
    return selectedDates
  }

  const recalledDateSet = new Set(getApplicationRecalledDates(application))
  if (!recalledDateSet.size) {
    return []
  }

  return selectedDates.filter((date) => !recalledDateSet.has(date))
}

export function getApplicationInformationalDates(application) {
  if (!application || application.is_monetization === true) return []
  if (!getApplicationRawStatus(application).includes('RECALLED')) return []

  const recalledDates = getApplicationRecalledDates(application)
  return recalledDates.length > 0 ? recalledDates : getApplicationSelectedDates(application)
}

function normalizeSelectedDateDurations(value) {
  if (!value) return {}

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return {}

    try {
      const parsed = JSON.parse(trimmed)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }

  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function resolveSelectedDateDurations(application) {
  const legacyDurations = normalizeSelectedDateDurations(
    application?.selected_date_durations ?? application?.selectedDateDurations,
  )
  if (Object.keys(legacyDurations).length > 0) {
    return legacyDurations
  }

  const selectedDateCoverage = normalizeSelectedDateDurations(
    application?.selected_date_coverage ?? application?.selectedDateCoverage,
  )
  if (Object.keys(selectedDateCoverage).length === 0) {
    return {}
  }

  return Object.entries(selectedDateCoverage).reduce((acc, [date, rawCoverage]) => {
    const normalizedCoverage = String(rawCoverage || '').trim().toLowerCase()
    if (normalizedCoverage === 'half' || normalizedCoverage === 'half_day') {
      acc[date] = 'half_day'
      return acc
    }

    if (normalizedCoverage === 'whole' || normalizedCoverage === 'whole_day') {
      acc[date] = 'whole_day'
    }

    return acc
  }, {})
}

export function getApplicationRequestedDayCount(application) {
  if (!application) return 0

  const selectedDates = getApplicationSelectedDates(application)
  const selectedDateDurations = resolveSelectedDateDurations(application)

  if (selectedDates.length > 0) {
    const durationTotal = selectedDates.reduce((total, date) => (
      total + (selectedDateDurations[date] === 'half_day' ? 0.5 : 1)
    ), 0)

    if (durationTotal > 0) {
      return durationTotal
    }

    const explicitTotal = Number(
      application?.total_days ?? application?.totalDays ?? application?.days,
    )
    if (Number.isFinite(explicitTotal) && explicitTotal > 0) {
      return explicitTotal
    }

    return selectedDates.length
  }

  const explicitTotal = Number(
    application?.total_days ?? application?.totalDays ?? application?.days,
  )
  if (Number.isFinite(explicitTotal) && explicitTotal > 0) {
    return explicitTotal
  }

  const startDate = normalizeIsoDate(
    application?.startDate ?? application?.start_date ?? application?.from_date ?? application?.fromDate,
  )
  const endDate = normalizeIsoDate(
    application?.endDate ?? application?.end_date ?? application?.to_date ?? application?.toDate ?? startDate,
  )

  return enumerateInclusiveDates(startDate, endDate).length
}

export function getBlockingLeaveApplicationState(application) {
  if (!application || application.is_monetization === true) return false

  const rawStatus = getApplicationRawStatus(application)
  const blockingDates = getApplicationBlockingDates(application)

  if (
    rawStatus.includes('REJECTED') ||
    rawStatus.includes('DISAPPROVED') ||
    rawStatus.includes('CANCELLED')
  ) {
    return false
  }

  const remarks = String(application?.remarks || '').trim().toLowerCase()
  if (remarks.includes('cancel')) return false

  if (rawStatus.includes('RECALLED')) {
    return blockingDates.length > 0 ? 'approved' : false
  }

  if (rawStatus.includes('APPROVED')) return 'approved'
  return 'pending'
}

export function getInformationalLeaveApplicationState(application) {
  if (!application || application.is_monetization === true) return false

  const rawStatus = getApplicationRawStatus(application)

  if (rawStatus.includes('RECALLED') && getApplicationInformationalDates(application).length > 0) return 'recalled'
  return false
}

export function isBlockingLeaveApplication(application) {
  return Boolean(getBlockingLeaveApplicationState(application))
}
