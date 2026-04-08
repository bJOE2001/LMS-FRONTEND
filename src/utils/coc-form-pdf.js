import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { enrichAppWithDepartmentHead, getDepartmentHeadSignature } from './department-head-signature'

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

const COC_VISIBLE_ROW_COUNT = 15
const MAYOR_NAME = 'REY T. UY'
const MAYOR_TITLE = 'City Mayor'
const HEADER_BAR_HEIGHT = 26
const HEADER_BAR_TEXT_SIZE = 14
const HEADER_SMALL_BAR_TOP_OFFSET = 50
const HEADER_TEXT_LEFT_INSET = 8
const SIGNATURE_LINE_WIDTH = '82%'

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function toFiniteNumber(value) {
  if (value === undefined || value === null || value === '') return null
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

function tryParseDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function formatDateForRow(value) {
  const parsedDate = tryParseDate(value)
  if (!parsedDate) return normalizeText(value)
  return parsedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

function parseTimeToMinutesOfDay(value) {
  const rawValue = normalizeText(value)
  if (!rawValue) return null

  const meridiemMatch = rawValue.match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])$/)
  if (meridiemMatch) {
    const parsedHours = Number(meridiemMatch[1])
    const parsedMinutes = Number(meridiemMatch[2] || '0')
    if (parsedHours < 1 || parsedHours > 12 || parsedMinutes > 59) return null

    const isPm = meridiemMatch[3].toUpperCase() === 'PM'
    const hours24 = parsedHours % 12 + (isPm ? 12 : 0)
    return hours24 * 60 + parsedMinutes
  }

  const twentyFourHourMatch = rawValue.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/)
  if (twentyFourHourMatch) {
    const parsedHours = Number(twentyFourHourMatch[1])
    const parsedMinutes = Number(twentyFourHourMatch[2])
    return parsedHours * 60 + parsedMinutes
  }

  const parsedDate = tryParseDate(rawValue)
  if (!parsedDate) return null
  return parsedDate.getHours() * 60 + parsedDate.getMinutes()
}

function formatTimeForDisplay(value) {
  const rawValue = normalizeText(value)
  if (!rawValue) return ''

  const minuteOfDay = parseTimeToMinutesOfDay(rawValue)
  if (minuteOfDay === null) return rawValue

  const hours24 = Math.floor(minuteOfDay / 60) % 24
  const minutes = minuteOfDay % 60
  const period = hours24 >= 12 ? 'PM' : 'AM'
  const displayHour = hours24 % 12 || 12
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
}

function parseDurationTextToMinutes(value) {
  if (value === undefined || value === null || value === '') return null

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value))
  }

  const rawValue = normalizeText(value)
  if (!rawValue) return null

  const numericValue = Number(rawValue)
  if (Number.isFinite(numericValue)) return Math.max(0, Math.round(numericValue))

  const hhMmMatch = rawValue.match(/^(\d{1,2})\s*:\s*(\d{1,2})$/)
  if (hhMmMatch) {
    const hours = Number(hhMmMatch[1])
    const minutes = Number(hhMmMatch[2])
    if (minutes >= 60) return null
    return hours * 60 + minutes
  }

  const hoursMatch = rawValue.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i)
  const minutesMatch = rawValue.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/i)

  if (!hoursMatch && !minutesMatch) return null

  const parsedHours = hoursMatch ? Number(hoursMatch[1]) : 0
  const parsedMinutes = minutesMatch ? Number(minutesMatch[1]) : 0
  if (!Number.isFinite(parsedHours) || !Number.isFinite(parsedMinutes)) return null

  return Math.max(0, Math.round(parsedHours * 60 + parsedMinutes))
}

function formatMinutesAsHoursAndMinutes(totalMinutes) {
  if (!Number.isFinite(totalMinutes)) return ''
  const safeMinutes = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

function formatHoursAsHoursAndMinutes(hours) {
  const numericHours = Number(hours)
  if (!Number.isFinite(numericHours)) return ''

  const totalMinutes = Math.max(0, Math.round(numericHours * 60))
  return formatMinutesAsHoursAndMinutes(totalMinutes)
}

function openPdfDocument(pdfDocument, options = {}) {
  const targetWindow = options?.targetWindow && !options.targetWindow.closed
    ? options.targetWindow
    : null
  const fileName = String(options?.fileName || 'coc-application.pdf').trim() || 'coc-application.pdf'

  return pdfDocument.getBlob().then((blob) => {
    const objectUrl = URL.createObjectURL(blob)

    if (targetWindow) {
      targetWindow.location.replace(objectUrl)
    } else {
      const opened = window.open(objectUrl, '_blank')
      if (!opened) {
        const anchor = document.createElement('a')
        anchor.href = objectUrl
        anchor.download = fileName
        anchor.rel = 'noopener noreferrer'
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
      }
    }

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  })
}

// function unwrapArray(value) {
//   if (Array.isArray(value)) return value
//   if (!value || typeof value !== 'object') return []

//   const nestedCandidates = [value.rows, value.items, value.data, value.entries, value.details]
//   for (const candidate of nestedCandidates) {
//     if (Array.isArray(candidate)) return candidate
//   }

//   return []
// }

// function buildNameFromParts(source) {
//   if (!source || typeof source !== 'object') return ''

//   const parts = [
//     normalizeText(source.firstname),
//     normalizeText(source.middlename),
//     normalizeText(source.surname),
//   ].filter(Boolean)

//   return parts.join(' ').trim()
// }

function resolveEmployeeName(app) {
  return normalizeText(app?.employee_name) || normalizeText(app?.employeeName)
}

function resolveEmployeePosition(app) {
  return normalizeText(
    app?.userInfo?.position ||
      app?.user_info?.position ||
      app?.position ||
      app?.designation ||
      app?.job_title ||
      app?.jobTitle ||
      app?.employee?.position ||
      app?.employee?.designation ||
      app?.employee?.job_title ||
      app?.employee?.jobTitle ||
      app?.employee?.rank ||
      app?.employee_info?.position ||
      app?.employeeInfo?.position,
  )
}

function resolveEmployeeDepartment(app) {
  return normalizeText(app?.office || app?.department)
}

function normalizeCocEntry(entry) {
  if (entry && typeof entry === 'object') return entry
  return { date: entry }
}

function extractCocEntries(app) {
  if (Array.isArray(app?.rows)) return app.rows

  if (Array.isArray(app?.selected_dates)) {
    return app.selected_dates.map((dateValue) => ({ date: dateValue }))
  }

  const fallbackDate = app?.start_date || app?.startDate || app?.date_filed || app?.dateFiled || app?.created_at || app?.createdAt
  return fallbackDate ? [{ date: fallbackDate }] : []
}


function resolveEntryDate(entry) {
  return entry?.date || ''
}

function resolveEntryNature(entry) {
  return normalizeText(entry?.nature_of_overtime)
}


function resolveEntryFromTime(entry) {
  return entry?.time_from || ''
} 

function resolveEntryToTime(entry) {
  return entry?.time_to || ''
}

function resolveEntryMinutes(entry, fromTimeValue, toTimeValue) {
  const explicitMinutes = toFiniteNumber(entry?.total_no_of_coc_applied_minutes)
  if (explicitMinutes !== null) return Math.max(0, Math.round(explicitMinutes))

  const fromMinutes = parseTimeToMinutesOfDay(entry?.time_from || fromTimeValue)
  const toMinutes = parseTimeToMinutesOfDay(entry?.time_to || toTimeValue)

  if (fromMinutes === null || toMinutes === null) return null

  let difference = toMinutes - fromMinutes
  if (difference < 0) difference += 24 * 60

  return Math.max(0, difference)
}

function resolveTotalMinutesFromApplication(app, fallbackMinutes = null) {
  const explicitTotalCandidates = [
    app?.total_no_of_coc_applied_minutes,
    app?.totalNoOfCocAppliedMinutes,
    app?.total_minutes,
    app?.totalMinutes,
    app?.applied_minutes,
    app?.appliedMinutes,
  ]

  for (const candidate of explicitTotalCandidates) {
    const numericValue = toFiniteNumber(candidate)
    if (numericValue !== null) return Math.max(0, Math.round(numericValue))

    const parsedDuration = parseDurationTextToMinutes(candidate)
    if (parsedDuration !== null) return parsedDuration
  }

  const hourBasedCandidates = [app?.days, app?.total_days, app?.duration_value, app?.durationValue]
  for (const candidate of hourBasedCandidates) {
    const numericValue = toFiniteNumber(candidate)
    if (numericValue !== null) return Math.max(0, Math.round(numericValue * 60))
  }

  if (Number.isFinite(fallbackMinutes)) return Math.max(0, Math.round(fallbackMinutes))
  return null
}

function resolveEntryBreakMinutes(entry, rawMinutes) {
  const explicitCandidates = [
    entry?.break_minutes,
    entry?.breakMinutes,
  ]

  for (const candidate of explicitCandidates) {
    const numericValue = toFiniteNumber(candidate)
    if (numericValue !== null) return Math.max(0, Math.round(numericValue))
  }

  if (!Number.isFinite(rawMinutes)) return 0
  return rawMinutes >= 240 ? 60 : 0
}

function resolveEntryCreditCategory(entry) {
  const normalized = normalizeReviewedCocCreditCategory(
    entry?.credit_category ?? entry?.creditCategory,
  )

  if (normalized === 'REGULAR') return 'Regular'
  if (normalized === 'SPECIAL') return 'Special'
  return ''
}

function resolveEntryCreditMultiplier(entry) {
  const explicitCandidates = [
    entry?.credit_multiplier,
    entry?.creditMultiplier,
  ]

  for (const candidate of explicitCandidates) {
    const numericValue = toFiniteNumber(candidate)
    if (numericValue !== null) return numericValue
  }

  return resolveEntryCreditCategory(entry) === 'Special' ? 1.5 : 1.0
}

function calculateCreditableMinutes(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0

  const safeMinutes = Math.max(0, Math.round(minutes))
  const wholeHoursMinutes = Math.floor(safeMinutes / 60) * 60
  const excessMinutes = safeMinutes % 60
  const creditableExcessMinutes = excessMinutes >= 20 ? excessMinutes : 0

  return wholeHoursMinutes + creditableExcessMinutes
}

function resolveEntryCreditableMinutes(entry, netMinutes) {
  const explicitCandidates = [
    entry?.creditable_minutes,
    entry?.creditableMinutes,
  ]

  for (const candidate of explicitCandidates) {
    const numericValue = toFiniteNumber(candidate)
    if (numericValue !== null) return Math.max(0, Math.round(numericValue))
  }

  return calculateCreditableMinutes(netMinutes)
}

function resolveEntryCreditedHours(entry, creditableMinutes, creditMultiplier) {
  const explicitCandidates = [
    entry?.credited_hours,
    entry?.creditedHours,
  ]

  for (const candidate of explicitCandidates) {
    const numericValue = toFiniteNumber(candidate)
    if (numericValue !== null) return Math.max(0, numericValue)
  }

  return Math.round(((creditableMinutes / 60) * creditMultiplier) * 100) / 100
}

function normalizeReviewedCocCreditCategory(value) {
  const normalized = String(value || '').trim().toUpperCase()
  return normalized === 'REGULAR' || normalized === 'SPECIAL' ? normalized : ''
}

export function hasReviewedCocRows(app) {
  const rows = extractCocEntries(app)
  if (!rows.length) return false

  return rows.every((row) =>
    normalizeReviewedCocCreditCategory(row?.credit_category ?? row?.creditCategory),
  )
}

export function isReviewedCocApplicationPrintable(app) {
  const normalizedStatus = String(app?.rawStatus ?? app?.raw_status ?? app?.status ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')

  return normalizedStatus === 'APPROVED' && hasReviewedCocRows(app)
}

function mapCocRows(app) {
  const sourceEntries = extractCocEntries(app)

  const mappedRows = sourceEntries
    .map((sourceEntry) => {
      const entry = normalizeCocEntry(sourceEntry)
      const rawDate = resolveEntryDate(entry)
      const fromTimeValue = resolveEntryFromTime(entry)
      const toTimeValue = resolveEntryToTime(entry)
      const rawMinutes = resolveEntryMinutes(entry, fromTimeValue, toTimeValue)
      const breakMinutes = resolveEntryBreakMinutes(entry, rawMinutes)
      const netMinutes = Number.isFinite(rawMinutes)
        ? Math.max(0, rawMinutes - breakMinutes)
        : null
      const creditCategoryText = resolveEntryCreditCategory(entry)
      const creditMultiplier = resolveEntryCreditMultiplier(entry)
      const creditableMinutes = resolveEntryCreditableMinutes(entry, netMinutes)
      const creditedHours = resolveEntryCreditedHours(entry, creditableMinutes, creditMultiplier)

      return {
        rawDate,
        dateText: formatDateForRow(rawDate),
        natureText: resolveEntryNature(entry),
        fromText: formatTimeForDisplay(fromTimeValue),
        toText: formatTimeForDisplay(toTimeValue),
        rawMinutes,
        breakMinutes,
        netMinutes,
        creditCategoryText,
        creditableMinutes,
        creditedHours,
      }
    })
    .filter(
      (row) =>
        row.dateText ||
        row.natureText ||
        row.fromText ||
        row.toText ||
        Number.isFinite(row.rawMinutes),
    )

  const fallbackDate =
    app?.start_date ||
    app?.startDate ||
    app?.date_filed ||
    app?.dateFiled ||
    app?.created_at ||
    app?.createdAt

  const fallbackTotalMinutes = resolveTotalMinutesFromApplication(app, null)

  if (!mappedRows.length && (fallbackDate || Number.isFinite(fallbackTotalMinutes))) {
    mappedRows.push({
      rawDate: fallbackDate,
      dateText: formatDateForRow(fallbackDate),
      natureText: '',
      fromText: '',
      toText: '',
      rawMinutes: Number.isFinite(fallbackTotalMinutes) ? fallbackTotalMinutes : null,
      breakMinutes: 0,
      netMinutes: Number.isFinite(fallbackTotalMinutes) ? fallbackTotalMinutes : null,
      creditCategoryText: '',
      creditableMinutes: Number.isFinite(fallbackTotalMinutes) ? fallbackTotalMinutes : null,
      creditedHours: 0,
    })
  }

  const rowsWithComputedDisplay = mappedRows.map((row) => ({
    ...row,
    rawOvertimeText: Number.isFinite(row.rawMinutes)
      ? formatMinutesAsHoursAndMinutes(row.rawMinutes)
      : '',
    breakText: row.breakMinutes > 0
      ? formatMinutesAsHoursAndMinutes(row.breakMinutes)
      : '-',
    creditedText: Number.isFinite(row.creditedHours)
      ? formatHoursAsHoursAndMinutes(row.creditedHours)
      : '',
  }))

  const computedTotalMinutes = rowsWithComputedDisplay.reduce(
    (total, row) => total + (Number.isFinite(row.rawMinutes) ? row.rawMinutes : 0),
    0,
  )
  const computedTotalCreditedHours = rowsWithComputedDisplay.reduce(
    (total, row) => total + (Number.isFinite(row.creditedHours) ? row.creditedHours : 0),
    0,
  )

  let runningCreditedHours = 0
  const rowsWithRunningCreditedTotals = rowsWithComputedDisplay.map((row) => {
    if (Number.isFinite(row.creditedHours)) {
      runningCreditedHours += row.creditedHours
    }

    return {
      ...row,
      runningCreditedText: Number.isFinite(row.creditedHours)
        ? formatHoursAsHoursAndMinutes(runningCreditedHours)
        : '',
    }
  })

  return {
    rows: rowsWithRunningCreditedTotals,
    computedTotalMinutes: computedTotalMinutes > 0 ? computedTotalMinutes : null,
    computedTotalCreditedHours:
      computedTotalCreditedHours > 0 ? Math.round(computedTotalCreditedHours * 100) / 100 : null,
  }
}

function resolveForMonthLabel(app, rows) {
  const dateCandidates = [
    rows.map((row) => row.rawDate),
    app?.start_date,
    app?.startDate,
    app?.date_filed,
    app?.dateFiled,
    app?.created_at,
    app?.createdAt,
  ]

  for (const candidate of dateCandidates) {
    const parsedDate = tryParseDate(candidate)
    if (!parsedDate) continue

    return parsedDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
  }

  return ''
}

function toBase64(url) {
  return fetch(url)
    .then((response) => response.blob())
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        }),
    )
}

const signatureLineLayout = {
  hLineWidth: (index, node) => (index === node.table.body.length ? 0.7 : 0),
  vLineWidth: () => 0,
  hLineColor: () => '#000',
  paddingLeft: () => 0,
  paddingRight: () => 0,
  paddingTop: () => 0,
  paddingBottom: () => 0,
}

function createSignatureBlock(name, caption, options = {}) {
  const blockWidth = options.blockWidth || '100%'
  const captionAlignment = options.captionAlignment || 'center'

  return {
    columns: [
      {
        width: blockWidth,
        stack: [
          {
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    text: normalizeText(name) || ' ',
                    alignment: 'center',
                    bold: Boolean(options.nameBold),
                    fontSize: options.nameFontSize || 9.5,
                    margin: [0, 0, 0, 2],
                  },
                ],
              ],
            },
            layout: signatureLineLayout,
          },
          {
            text: caption,
            alignment: captionAlignment,
            italics: options.captionItalics !== false,
            fontSize: options.captionFontSize || 9,
            margin: [0, 3, 0, 0],
          },
        ],
      },
      {
        width: '*',
        text: '',
      },
    ],
  }
}

function createLeftAlignedSignatureBlock(name, caption, options = {}) {
  return createSignatureBlock(name, caption, {
    ...options,
    blockWidth: options.blockWidth || SIGNATURE_LINE_WIDTH,
    captionAlignment: options.captionAlignment || 'left',
  })
}

function createRightAlignedSignatureBlock(name, caption, options = {}) {
  const blockWidth = options.blockWidth || SIGNATURE_LINE_WIDTH
  const captionAlignment = options.captionAlignment || 'right'

  return {
    columns: [
      {
        width: '*',
        text: '',
      },
      {
        width: blockWidth,
        stack: [
          {
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    text: normalizeText(name) || ' ',
                    alignment: 'center',
                    bold: Boolean(options.nameBold),
                    fontSize: options.nameFontSize || 9.5,
                    margin: [0, 0, 0, 2],
                  },
                ],
              ],
            },
            layout: signatureLineLayout,
          },
          {
            text: caption,
            alignment: captionAlignment,
            italics: options.captionItalics !== false,
            fontSize: options.captionFontSize || 9,
            margin: [0, 3, 0, 0],
          },
        ],
      },
    ],
  }
}

export async function generateCocApplicationPdf(app, options = {}) {
  if (!app) return
  if (!isReviewedCocApplicationPrintable(app)) {
    throw new Error('COC form can be printed only after HR review and Regular/Special classification.')
  }

//  // ===== RAW APP DATA =====
//   // Employee
//   console.log('RAW employeeName:', app?.employeeName)
//   console.log('RAW employee_name:', app?.employee_name)
//   console.log('RAW full_name:', app?.full_name)
//   console.log('RAW name:', app?.name)
//   console.log('RAW firstname:', app?.firstname)
//   console.log('RAW middlename:', app?.middlename)
//   console.log('RAW surname:', app?.surname)
//   console.log('RAW employee object:', app?.employee)

//   // Position / department
//   console.log('RAW position:', app?.position)
//   console.log('RAW designation:', app?.designation)
//   console.log('RAW job_title:', app?.job_title)
//   console.log('RAW jobTitle:', app?.jobTitle)
//   console.log('RAW employee.position:', app?.employee?.position)
//   console.log('RAW employee.designation:', app?.employee?.designation)
//   console.log('RAW employee.job_title:', app?.employee?.job_title)
//   console.log('RAW employee.jobTitle:', app?.employee?.jobTitle)
//   console.log('RAW employee.rank:', app?.employee?.rank)

//   console.log('RAW office:', app?.office)
//   console.log('RAW department_name:', app?.department_name)
//   console.log('RAW departmentName:', app?.departmentName)
//   console.log('RAW department object:', app?.department)
//   console.log('RAW department.name:', app?.department?.name)

//   // Application totals / month
//   console.log('RAW total_no_of_coc_applied_minutes:', app?.total_no_of_coc_applied_minutes)
//   console.log('RAW totalNoOfCocAppliedMinutes:', app?.totalNoOfCocAppliedMinutes)
//   console.log('RAW total_minutes:', app?.total_minutes)
//   console.log('RAW totalMinutes:', app?.totalMinutes)
//   console.log('RAW applied_minutes:', app?.applied_minutes)
//   console.log('RAW appliedMinutes:', app?.appliedMinutes)
//   console.log('RAW days:', app?.days)
//   console.log('RAW total_days:', app?.total_days)
//   console.log('RAW duration_value:', app?.duration_value)
//   console.log('RAW durationValue:', app?.durationValue)

//   console.log('RAW for_the_month:', app?.for_the_month)
//   console.log('RAW forTheMonth:', app?.forTheMonth)
//   console.log('RAW month:', app?.month)
//   console.log('RAW month_label:', app?.month_label)
//   console.log('RAW monthLabel:', app?.monthLabel)
//   console.log('RAW coc_month:', app?.coc_month)
//   console.log('RAW cocMonth:', app?.cocMonth)
//   console.log('RAW overtime_month:', app?.overtime_month)
//   console.log('RAW overtimeMonth:', app?.overtimeMonth)

  // Dates
  // console.log('RAW startDate:', app?.startDate)
  // console.log('RAW start_date:', app?.start_date)
  // console.log('RAW dateFiled:', app?.dateFiled)
  // console.log('RAW date_filed:', app?.date_filed)
  // console.log('RAW created_at:', app?.created_at)
  // console.log('RAW createdAt:', app?.createdAt)

  // Candidate row collections
  // console.log('RAW rows:', app?.rows)
  // console.log('RAW coc_rows:', app?.coc_rows)
  // console.log('RAW cocRows:', app?.cocRows)
  // console.log('RAW overtime_rows:', app?.overtime_rows)
  // console.log('RAW overtimeRows:', app?.overtimeRows)
  // console.log('RAW overtime_details:', app?.overtime_details)
  // console.log('RAW overtimeDetails:', app?.overtimeDetails)
  // console.log('RAW overtime_entries:', app?.overtime_entries)
  // console.log('RAW overtimeEntries:', app?.overtimeEntries)
  // console.log('RAW coc_details:', app?.coc_details)
  // console.log('RAW cocDetails:', app?.cocDetails)
  // console.log('RAW details:', app?.details)
  // console.log('RAW entries:', app?.entries)
  // console.log('RAW line_items:', app?.line_items)
  // console.log('RAW lineItems:', app?.lineItems)
  // console.log('RAW application_details:', app?.application_details)
  // console.log('RAW applicationDetails:', app?.applicationDetails)
  // console.log('RAW overtime:', app?.overtime)

  // console.log('RAW selected_dates:', app?.selected_dates)
  // console.log('RAW selectedDates:', app?.selectedDates)

  const printableApp = await enrichAppWithDepartmentHead(app)
   // ===== ENRICHED / PRINTABLE APP DATA =====
  // console.log('Printable app:', printableApp)
  // console.log('Printable employeeName:', printableApp?.employeeName)
  // console.log('Printable employee_name:', printableApp?.employee_name)
  // console.log('Printable office:', printableApp?.office)
  // console.log('Printable department:', printableApp?.department)
  // console.log('Printable department_name:', printableApp?.department_name)
  // console.log('Printable departmentName:', printableApp?.departmentName)

  // console.log('Printable department head:', printableApp?.departmentHead)
  // console.log('Printable department_head:', printableApp?.department_head)

  // ===== RESOLVED VALUES =====
  // console.log('Resolved employee name:', resolveEmployeeName(printableApp))
  // console.log('Resolved employee position:', resolveEmployeePosition(printableApp))
  // console.log('Resolved employee department:', resolveEmployeeDepartment(printableApp))
  // console.log('Resolved total minutes:', resolveTotalMinutesFromApplication(printableApp))
  // console.log('Resolved extracted entries:', extractCocEntries(printableApp))

  // ===== FIRST ENTRY DEBUG =====
  // const debugEntries = extractCocEntries(printableApp)
  // console.log('First extracted entry:', debugEntries?.[0])
  // console.log('First entry date:', resolveEntryDate(debugEntries?.[0]))
  // console.log('First entry nature:', resolveEntryNature(debugEntries?.[0]))
  // console.log('First entry from time:', resolveEntryFromTime(debugEntries?.[0]))
  // console.log('First entry to time:', resolveEntryToTime(debugEntries?.[0]))
  // console.log(
  //   'First entry minutes:',
  //   resolveEntryMinutes(
  //     debugEntries?.[0],
  //     resolveEntryFromTime(debugEntries?.[0]),
  //     resolveEntryToTime(debugEntries?.[0]),
  //   ),
  // )
  // console.log('First entry running total minutes:', resolveEntryRunningTotalMinutes(debugEntries?.[0]))
  const departmentHeadSignature = getDepartmentHeadSignature(printableApp)
  const employeeName = resolveEmployeeName(printableApp)
  const employeePosition = resolveEmployeePosition(printableApp)
  const employeeDepartment = resolveEmployeeDepartment(printableApp)

  const { rows: overtimeRows, computedTotalCreditedHours } = mapCocRows(printableApp)
  const totalCreditedHours = toFiniteNumber(printableApp?.credited_hours ?? printableApp?.creditedHours)
  const totalCreditedText = formatHoursAsHoursAndMinutes(
    totalCreditedHours !== null ? totalCreditedHours : computedTotalCreditedHours,
  )
  const monthLabel = resolveForMonthLabel(printableApp, overtimeRows)

  const visibleRows = overtimeRows.slice(0, COC_VISIBLE_ROW_COUNT)
  const hiddenRowsCount = Math.max(0, overtimeRows.length - COC_VISIBLE_ROW_COUNT)
  const paddedRows = [...visibleRows]
  while (paddedRows.length < COC_VISIBLE_ROW_COUNT) {
    paddedRows.push({
      dateText: '',
      natureText: '',
      fromText: '',
      toText: '',
      durationText: '',
      runningTotalText: '',
    })
  }

  let logoBase64 = null
  try {
    logoBase64 = await toBase64('/images/CityOfTagumLogo.png')
  } catch {
    logoBase64 = null
  }

  const detailTableBody = [
    [
      { text: 'DATE', style: 'tableHeader', rowSpan: 2, alignment: 'center', margin: [0, 8, 0, 0] },
      {
        text: 'NATURE OF OVERTIME',
        style: 'tableHeader',
        rowSpan: 2,
        alignment: 'center',
        margin: [0, 8, 0, 0],
      },
      { text: 'TIME', style: 'tableHeader', colSpan: 2, alignment: 'center' },
      {},
      {
        text: 'NO. OF HOURS,\n& MINUTES',
        style: 'tableHeaderSmall',
        rowSpan: 2,
        alignment: 'center',
        margin: [0, 5, 0, 0],
      },
      {
        text: 'TOTAL NO. OF\nHOURS &\nMINUTES',
        style: 'tableHeaderSmall',
        rowSpan: 2,
        alignment: 'center',
        margin: [0, 1, 0, 0],
      },
    ],
    [
      {},
      {},
      { text: 'From', style: 'tableSubHeader', alignment: 'center' },
      { text: 'To', style: 'tableSubHeader', alignment: 'center' },
      {},
      {},
    ],
    ...paddedRows.map((row) => [
      { text: row.dateText || ' ', style: 'tableValueCenter' },
      { text: row.natureText || ' ', style: 'tableValueLeft' },
      { text: row.fromText || ' ', style: 'tableValueCenter' },
      { text: row.toText || ' ', style: 'tableValueCenter' },
      { text: row.creditedText || ' ', style: 'tableValueCenter' },
      { text: row.runningCreditedText || ' ', style: 'tableValueCenter' },
    ]),
    [
      {
        text: 'TOTAL NO. OF COC APPLIED',
        colSpan: 5,
        style: 'tableTotalLabel',
        margin: [8, 4, 0, 4],
      },
      {},
      {},
      {},
      {},
      { text: totalCreditedText || ' ', style: 'tableTotalValue' },
    ],
  ]

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [26, 20, 26, 22],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
    },
    content: [
      {
        columns: [
          {
            width: 40,
            margin: [0, HEADER_SMALL_BAR_TOP_OFFSET, 10, 0],
            canvas: [{ type: 'rect', x: 0, y: 0, w: 30, h: HEADER_BAR_HEIGHT, r: 0, color: '#0f6b3a' }],
          },
          {
            width: 122,
            ...(logoBase64
              ? { image: logoBase64, fit: [116, 116], alignment: 'left' }
              : { text: '' }),
            margin: [0, -4, 12, 0],
          },
          {
            width: '*',
            stack: [
              {
                text: 'REPUBLIC OF THE PHILIPPINES',
                style: 'governmentLine',
                margin: [HEADER_TEXT_LEFT_INSET, 0, 0, 0],
              },
              {
                text: 'PROVINCE OF DAVAO DEL NORTE',
                style: 'governmentLine',
                margin: [HEADER_TEXT_LEFT_INSET, 0, 0, 0],
              },
              {
                text: 'CITY OF TAGUM',
                style: 'cityLine',
                margin: [HEADER_TEXT_LEFT_INSET, 1, 0, 0],
              },
              {
                table: {
                  widths: ['*'],
                  heights: [HEADER_BAR_HEIGHT],
                  body: [
                    [
                      {
                        text: 'CITY HUMAN RESOURCE MANAGEMENT OFFICE',
                        style: 'officeBandText',
                        margin: [0, Math.floor((HEADER_BAR_HEIGHT - HEADER_BAR_TEXT_SIZE) / 2), 0, 0],
                      },
                    ],
                  ],
                },
                layout: {
                  hLineWidth: () => 0,
                  vLineWidth: () => 0,
                  paddingLeft: () => HEADER_TEXT_LEFT_INSET,
                  paddingRight: () => 8,
                  paddingTop: () => 0,
                  paddingBottom: () => 0,
                },
                margin: [0, 2, 0, 0],
              },
            ],
            margin: [0, 3, 0, 0],
          },
        ],
        columnGap: 0,
        margin: [0, 0, 0, 10],
      },
      { text: 'COC form 1', style: 'formLabel' },
      {
        text: 'APPLICATION FOR COMPENSATORY OVERTIME CREDITS\n(COC)',
        style: 'formTitle',
        margin: [0, 2, 0, 8],
      },
      {
        table: {
          widths: [148, '*'],
          body: [
            [{ text: 'NAME OF EMPLOYEE:', style: 'fieldLabel' }, { text: employeeName || ' ', style: 'fieldValue' }],
            [{ text: 'POSITION:', style: 'fieldLabel' }, { text: employeePosition || ' ', style: 'fieldValue' }],
            [{ text: 'DEPARTMENT:', style: 'fieldLabel' }, { text: employeeDepartment || ' ', style: 'fieldValue' }],
            [{ text: 'FOR THE MONTH:', style: 'fieldLabel' }, { text: monthLabel || ' ', style: 'fieldValue' }],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 6],
      },
      {
        table: {
          headerRows: 2,
          widths: [70, '*', 60, 60, 88, 95],
          body: detailTableBody,
        },
        layout: {
          hLineWidth: () => 0.75,
          vLineWidth: () => 0.75,
          hLineColor: () => '#000',
          vLineColor: () => '#000',
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
      },
      ...(hiddenRowsCount > 0
        ? [
            {
              text: `Note: ${hiddenRowsCount} additional overtime entr${
                hiddenRowsCount === 1 ? 'y is' : 'ies are'
              } not shown in this one-page format.`,
              style: 'smallNote',
              margin: [0, 4, 0, 0],
            },
          ]
        : []),
      {
        columns: [
          {
            width: '58%',
            ...createLeftAlignedSignatureBlock(
              employeeName || '',
              'Name and Signature of Employee',
              { captionItalics: true, nameBold: false, nameFontSize: 13 },
            ),
          },
          { width: '*', text: '' },
        ],
        margin: [0, 20, 0, 0],
      },
      {
        columns: [
          {
            width: '58%',
            stack: [
              { text: 'Noted by:', style: 'signatureLabel', margin: [0, 0, 0, 16] },
              createLeftAlignedSignatureBlock(
                departmentHeadSignature?.fullName || '',
                'Name and Signature of Department Head',
                {
                  captionItalics: true,
                  nameBold: true,
                  nameFontSize: 13,
                },
              ),
            ],
          },
          {
            width: '42%',
            stack: [
              { text: 'Approved by:', style: 'signatureLabelRight', margin: [0, 0, 0, 18] },
              createRightAlignedSignatureBlock(MAYOR_NAME, MAYOR_TITLE, {
                nameBold: true,
                nameFontSize: 13,
                captionItalics: true,
                captionFontSize: 9,
                captionAlignment: 'center',
              }),
            ],
          },
        ],
        columnGap: 0,
        margin: [0, 16, 0, 0],
      },
    ],
    styles: {
      governmentLine: {
        fontSize: 8.4,
        bold: false,
        color: '#111827',
        lineHeight: 1.05,
        alignment: 'left',
      },
      cityLine: {
        fontSize: 19.5,
        bold: true,
        margin: [0, 1, 0, 0],
        alignment: 'left',
      },
      officeBandText: {
        fontSize: HEADER_BAR_TEXT_SIZE,
        bold: true,
        color: '#ffffff',
        alignment: 'left',
        fillColor: '#0f6b3a',
      },
      formLabel: {
        fontSize: 11,
        italics: true,
      },
      formTitle: {
        fontSize: 17,
        bold: true,
        alignment: 'center',
        lineHeight: 1.2,
      },
      fieldLabel: {
        fontSize: 12.5,
        bold: true,
      },
      fieldValue: {
        fontSize: 12,
      },
      tableHeader: {
        fontSize: 11,
        bold: true,
      },
      tableHeaderSmall: {
        fontSize: 9.3,
        bold: true,
      },
      tableSubHeader: {
        fontSize: 10,
        bold: true,
      },
      tableValueLeft: {
        fontSize: 9.8,
        alignment: 'left',
      },
      tableValueCenter: {
        fontSize: 9.8,
        alignment: 'center',
      },
      tableTotalLabel: {
        fontSize: 12,
        bold: true,
      },
      tableTotalValue: {
        fontSize: 11,
        bold: true,
        alignment: 'center',
      },
      smallNote: {
        fontSize: 8.2,
        italics: true,
        color: '#4b5563',
      },
      signatureLabel: {
        fontSize: 12,
      },
      signatureLabelRight: {
        fontSize: 12,
        alignment: 'right',
      },
    },
  }

  await openPdfDocument(pdfMake.createPdf(docDefinition), options)
}
