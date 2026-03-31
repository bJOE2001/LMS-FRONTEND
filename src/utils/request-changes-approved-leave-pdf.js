import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

const HEADER_BAR_COLOR = '#0f6b3a'
const VALIDATED_BY_NAME = 'WARREN JAMES D. NAVARRO, CPA'
const VALIDATED_BY_TITLE = 'Supervising Administrative Officer'
const NOTED_BY_NAME = 'JANLYLENE A. PALERMO, MM'
const NOTED_BY_TITLE = 'City Human Resource Mgt. Officer'

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
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

function parseSelectedDatesValue(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []

  const trimmed = value.trim()
  if (!trimmed) return []

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return []
    }
  }

  if (trimmed.includes(',')) {
    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return [trimmed]
}

function toIsoDateString(dateValue) {
  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) return ''

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeIsoDateList(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => toIsoDateString(value)).filter(Boolean))]
    .sort((left, right) => Date.parse(left) - Date.parse(right))
}

function enumerateInclusiveDateRange(startDateValue, endDateValue) {
  const startDate = new Date(startDateValue)
  const endDate = new Date(endDateValue)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return []

  const first = startDate <= endDate ? startDate : endDate
  const last = startDate <= endDate ? endDate : startDate

  const dates = []
  const cursor = new Date(first.getFullYear(), first.getMonth(), first.getDate())
  const limit = new Date(last.getFullYear(), last.getMonth(), last.getDate())

  while (cursor <= limit) {
    dates.push(toIsoDateString(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates.filter(Boolean)
}

function resolveDateSetFromSource(source) {
  if (!source || typeof source !== 'object') return []

  const selectedDates = normalizeIsoDateList(parseSelectedDatesValue(source?.selected_dates))
  if (selectedDates.length) return selectedDates

  const startDate = source?.start_date || source?.startDate || null
  const endDate = source?.end_date || source?.endDate || null
  if (!startDate && !endDate) return []

  return enumerateInclusiveDateRange(startDate || endDate, endDate || startDate)
}

function formatDate(value) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return normalizeText(value)

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getPendingUpdatePayload(app) {
  const candidates = [
    app?.pending_update,
    app?.pendingUpdate,
    app?.raw?.pending_update,
    app?.raw?.pendingUpdate,
    app?.latest_update_request_payload,
    app?.latestUpdateRequestPayload,
    app?.raw?.latest_update_request_payload,
    app?.raw?.latestUpdateRequestPayload,
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    if (candidate && typeof candidate === 'object') return candidate

    if (typeof candidate !== 'string') continue
    const trimmed = candidate.trim()
    if (!trimmed) continue

    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      // Ignore malformed payload.
    }
  }

  return null
}

function resolveDepartmentHeadName(source) {
  const departmentHead =
    source?.departmentHead ||
    source?.department_head ||
    source?.raw?.departmentHead ||
    source?.raw?.department_head ||
    null

  if (!departmentHead || typeof departmentHead !== 'object') return ''

  const directName = normalizeText(
    departmentHead?.full_name || departmentHead?.fullName || departmentHead?.name,
  )
  if (directName) return directName

  return [
    normalizeText(departmentHead?.firstname),
    normalizeText(departmentHead?.middlename),
    normalizeText(departmentHead?.surname),
  ]
    .filter(Boolean)
    .join(' ')
}

function formatRequestedDatesList(source) {
  const dateSet = resolveDateSetFromSource(source)
  if (!dateSet.length) return ''

  const grouped = new Map()
  const years = new Set()

  dateSet.forEach((dateValue) => {
    const parsed = new Date(`${dateValue}T12:00:00`)
    if (Number.isNaN(parsed.getTime())) return

    const month = parsed.toLocaleDateString('en-US', { month: 'short' })
    const day = parsed.getDate()
    const year = parsed.getFullYear()
    const key = `${year}-${String(parsed.getMonth() + 1).padStart(2, '0')}`

    years.add(year)
    if (!grouped.has(key)) {
      grouped.set(key, { month, year, days: [] })
    }

    grouped.get(key).days.push(day)
  })

  const groups = Array.from(grouped.values())
  if (!groups.length) return ''

  const hasSingleYear = years.size === 1
  if (hasSingleYear) {
    const year = String(groups[0].year)
    const monthChunks = groups.map((group) => `${group.month} ${group.days.join(', ')}`)
    return `${monthChunks.join(', ')}, ${year}`
  }

  return groups
    .map((group) => `${group.month} ${group.days.join(', ')}, ${group.year}`)
    .join(', ')
}

function resolveFromDateValue(source) {
  const dateSet = resolveDateSetFromSource(source)
  if (dateSet.length) return formatDate(dateSet[0])

  const fallbackDate = source?.start_date || source?.startDate || source?.end_date || source?.endDate || ''
  return fallbackDate ? formatDate(fallbackDate) : ''
}

function resolveRequestFormData(app) {
  const source = app?.raw && typeof app.raw === 'object' ? app.raw : app
  const payload = getPendingUpdatePayload(app)

  const requestDate =
    app?.latest_update_requested_at ||
    app?.latestUpdateRequestedAt ||
    app?.raw?.latest_update_requested_at ||
    app?.raw?.latestUpdateRequestedAt ||
    app?.updated_at ||
    app?.updatedAt ||
    app?.dateFiled ||
    ''

  const employeeName =
    app?.employeeName ||
      app?.employee_name ||
      source?.employee_name ||
      source?.filed_by ||
      'Employee'

  const fromValue = resolveFromDateValue(source)
  const toValue = formatRequestedDatesList(payload)

  const reason = normalizeText(
    app?.latest_update_request_reason ||
      app?.latestUpdateRequestReason ||
      app?.pending_update_reason ||
      app?.pendingUpdateReason ||
      app?.raw?.latest_update_request_reason ||
      app?.raw?.latestUpdateRequestReason ||
      payload?.reason ||
      payload?.reason_purpose ||
      payload?.update_reason ||
      payload?.edit_reason ||
      payload?.remarks,
  )

  const approvedBy = normalizeText(resolveDepartmentHeadName(app) || resolveDepartmentHeadName(source))

  return {
    requestDate,
    employeeName,
    fromValue,
    toValue,
    reason,
    approvedBy,
  }
}

function shortUnderline(value, options = {}) {
  const lineWidth = Number(options.lineWidth) || 220
  const fontSize = Number(options.fontSize) || 11

  return {
    width: lineWidth,
    stack: [
      {
        text: normalizeText(value) || ' ',
        fontSize,
        margin: [0, 0, 0, 2],
      },
      {
        canvas: [{
          type: 'line',
          x1: 0,
          y1: 0,
          x2: lineWidth,
          y2: 0,
          lineWidth: 0.8,
          lineColor: '#111111',
        }],
      },
    ],
  }
}

function buildHeader(logoBase64) {
  const headerBarHeight = 18
  const headerTextSize = 10
  const leftInset = 6

  return {
    columns: [
      {
        width: 28,
        margin: [0, 35, 8, 0],
        canvas: [{ type: 'rect', x: 0, y: 0, w: 22, h: headerBarHeight, color: HEADER_BAR_COLOR }],
      },
      logoBase64
        ? { width: 78, image: logoBase64, fit: [72, 72], margin: [0, 0, 8, 0] }
        : { width: 78, text: '' },
      {
        width: '*',
        stack: [
          { text: 'REPUBLIC OF THE PHILIPPINES', fontSize: 7, margin: [leftInset, 0, 0, 0] },
          { text: 'PROVINCE OF DAVAO DEL NORTE', fontSize: 7, margin: [leftInset, 0, 0, 0] },
          { text: 'CITY OF TAGUM', fontSize: 14, bold: true, margin: [leftInset, 0, 0, 0] },
          {
            table: {
              widths: ['*'],
              heights: [headerBarHeight],
              body: [[{
                text: 'CITY HUMAN RESOURCE MANAGEMENT OFFICE',
                color: '#ffffff',
                bold: true,
                alignment: 'left',
                fontSize: headerTextSize,
                fillColor: HEADER_BAR_COLOR,
                margin: [leftInset, 4, 4, 0],
              }]],
            },
            layout: 'noBorders',
            margin: [0, 2, 0, 0],
          },
        ],
      },
    ],
    columnGap: 0,
    margin: [0, 0, 0, 8],
  }
}

function shortFieldRow(label, value, options = {}) {
  const labelWidth = Number(options.labelWidth) || 174
  const lineWidth = Number(options.lineWidth) || 220

  return {
    columns: [
      { width: labelWidth, text: label, fontSize: 11, bold: true, margin: [0, 3, 0, 0] },
      { width: 10, text: ':', fontSize: 11, bold: true, alignment: 'center', margin: [0, 3, 0, 0] },
      shortUnderline(value, { lineWidth, fontSize: 11 }),
    ],
    columnGap: 0,
    margin: options.margin || [0, 2, 0, 0],
  }
}

function changesLabelRow() {
  return {
    columns: [
      { width: 174, text: 'CHANGES', fontSize: 11, bold: true, margin: [0, 3, 0, 0] },
      { width: 10, text: ':', fontSize: 11, bold: true, alignment: 'center', margin: [0, 3, 0, 0] },
      { width: 220, text: '' },
    ],
    columnGap: 0,
    margin: [0, 2, 0, 0],
  }
}

function fromToRow(fromValue, toValue) {
  return {
    columns: [
      { width: 184, text: '' },
      { width: 38, text: 'FROM', fontSize: 11, bold: true, margin: [0, 3, 0, 0] },
      { width: 8, text: ':', fontSize: 11, bold: true, alignment: 'center', margin: [0, 3, 0, 0] },
      shortUnderline(fromValue, { lineWidth: 110, fontSize: 10 }),
      { width: 12, text: '' },
      { width: 20, text: 'TO', fontSize: 11, bold: true, margin: [0, 3, 0, 0] },
      { width: 8, text: ':', fontSize: 11, bold: true, alignment: 'center', margin: [0, 3, 0, 0] },
      shortUnderline(toValue, { lineWidth: 110, fontSize: 10 }),
    ],
    columnGap: 0,
    margin: [0, 0, 0, 0],
  }
}

function signerBlock(label, name, title) {
  return {
    stack: [
      {
        columns: [
          { width: 92, text: label, fontSize: 11, bold: true },
          { width: 8, text: ':', fontSize: 11, bold: true, alignment: 'center' },
          { width: '*', text: '' },
        ],
        columnGap: 0,
      },
      { text: ' ', margin: [0, 6, 0, 0] },
      { text: name, bold: true, fontSize: 10 },
      { text: title, italics: true, fontSize: 9 },
    ],
  }
}

export async function generateRequestChangesApprovedLeavePdf(app = {}) {
  let logoBase64 = null
  try {
    logoBase64 = await toBase64('/images/CityOfTagumLogo.png')
  } catch {
    logoBase64 = null
  }

  const formData = resolveRequestFormData(app)

  const docDefinition = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [24, 20, 24, 24],
    content: [
      buildHeader(logoBase64),
      {
        text: 'REQUEST FOR CHANGES IN THE APPROVED LEAVE APPLICATION',
        alignment: 'center',
        bold: true,
        fontSize: 14,
        margin: [0, 6, 0, 14],
      },
      shortFieldRow('DATE OF REQUEST', formatDate(formData.requestDate)),
      shortFieldRow('NAME OF EMPLOYEE', formData.employeeName),
      changesLabelRow(),
      fromToRow(formData.fromValue, formData.toValue),
      shortFieldRow('REASON/S', formData.reason),
      shortFieldRow('SIGNATURE OF EMPLOYEE', ''),
      shortFieldRow('APPROVED BY', formData.approvedBy),
      {
        columns: [
          { width: 184, text: '' },
          {
            width: 220,
            text: 'Signature Over Printed Name\nHead of Office',
            alignment: 'center',
            fontSize: 8,
            italics: true,
          },
        ],
        margin: [0, 2, 0, 0],
      },
      {
        columns: [
          { width: 352, ...signerBlock('VALIDATED BY', VALIDATED_BY_NAME, VALIDATED_BY_TITLE) },
          { width: '*', ...signerBlock('NOTED BY', NOTED_BY_NAME, NOTED_BY_TITLE) },
        ],
        margin: [0, 18, 0, 0],
      },
      {
        text: '***Note: Kindly attach the approved leave form and justification letter',
        italics: true,
        fontSize: 9,
        margin: [0, 14, 0, 0],
      },
    ],
    defaultStyle: {
      font: 'Roboto',
    },
  }

  pdfMake.createPdf(docDefinition).open()
}
