import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

const HEADER_BAR_COLOR = '#0f6b3a'
const VALIDATED_BY_NAME = 'WARREN JAMES D. NAVARRO, CPA'
const VALIDATED_BY_TITLE = 'Supervising Administrative Officer'
const NOTED_BY_NAME = 'JANLYLENE A. PALERMO, MM'
const NOTED_BY_TITLE = 'City Human Resource Mgt. Officer'

const ACTION_TYPE_UPDATE = 'REQUEST_UPDATE'
const ACTION_TYPE_CANCEL = 'REQUEST_CANCEL'

function normalizeLeaveRequestActionTypeToken(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  if (!normalized) return ''

  if (
    normalized === ACTION_TYPE_CANCEL ||
    normalized === 'CANCEL_REQUEST' ||
    normalized === 'REQUEST_CANCELLATION' ||
    normalized === 'CANCELLATION_REQUEST' ||
    normalized === 'LEAVE_CANCELLATION_REQUEST'
  ) {
    return ACTION_TYPE_CANCEL
  }

  if (
    normalized === ACTION_TYPE_UPDATE ||
    normalized === 'UPDATE_REQUEST' ||
    normalized === 'EDIT_REQUEST' ||
    normalized === 'REQUEST_EDIT'
  ) {
    return ACTION_TYPE_UPDATE
  }

  return ''
}

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
  return [
    ...new Set(
      (Array.isArray(values) ? values : []).map((value) => toIsoDateString(value)).filter(Boolean),
    ),
  ].sort((left, right) => Date.parse(left) - Date.parse(right))
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
  const directName = normalizeText(
    source?.departmentHeadName ||
      source?.department_head_name ||
      source?.departmentHeadFullName ||
      source?.department_head_full_name ||
      source?.approved_by ||
      source?.approvedBy ||
      source?.approver_name ||
      source?.approverName ||
      source?.admin_action_by ||
      source?.adminActionBy ||
      source?.processed_by ||
      source?.processedBy ||
      source?.raw?.departmentHeadName ||
      source?.raw?.department_head_name ||
      source?.raw?.departmentHeadFullName ||
      source?.raw?.department_head_full_name ||
      source?.raw?.approved_by ||
      source?.raw?.approvedBy ||
      source?.raw?.approver_name ||
      source?.raw?.approverName ||
      source?.raw?.admin_action_by ||
      source?.raw?.adminActionBy ||
      source?.raw?.processed_by ||
      source?.raw?.processedBy,
  )
  if (directName) return directName

  const departmentHead =
    source?.departmentHead ||
    source?.department_head ||
    source?.raw?.departmentHead ||
    source?.raw?.department_head ||
    null

  if (!departmentHead) return ''
  if (typeof departmentHead === 'string') return normalizeText(departmentHead)
  if (typeof departmentHead !== 'object') return ''

  const departmentHeadObjectName = normalizeText(
    departmentHead?.full_name || departmentHead?.fullName || departmentHead?.name,
  )
  if (departmentHeadObjectName) return departmentHeadObjectName

  return [
    normalizeText(departmentHead?.firstname),
    normalizeText(departmentHead?.middlename),
    normalizeText(departmentHead?.surname),
  ]
    .filter(Boolean)
    .join(' ')
}

function formatGroupedInclusiveDateLines(dateValues, expandConsecutiveDays = false) {
  if (!Array.isArray(dateValues) || dateValues.length === 0) return []

  const groupedByMonthYear = new Map()
  const sortedDates = [...new Set(dateValues.filter(Boolean))].sort(
    (left, right) => Date.parse(left) - Date.parse(right),
  )

  for (const rawDate of sortedDates) {
    const isoDate = toIsoDateString(rawDate)
    const parsedDate = isoDate ? new Date(`${isoDate}T12:00:00`) : new Date(rawDate)
    if (Number.isNaN(parsedDate.getTime())) continue

    const monthName = parsedDate.toLocaleDateString('en-US', { month: 'short' })
    const year = parsedDate.getFullYear()
    const day = parsedDate.getDate()
    const groupKey = `${year}-${parsedDate.getMonth()}`

    if (!groupedByMonthYear.has(groupKey)) {
      groupedByMonthYear.set(groupKey, { monthName, year, days: [] })
    }

    groupedByMonthYear.get(groupKey).days.push(day)
  }

  return Array.from(groupedByMonthYear.values())
    .map((group) => {
      const uniqueDays = [...new Set(group.days)].sort((a, b) => a - b)
      if (!uniqueDays.length) return ''

      if (expandConsecutiveDays) {
        return `${group.monthName} ${uniqueDays.join(', ')}, ${group.year}`
      }

      const dayRanges = []
      let rangeStart = uniqueDays[0]
      let rangeEnd = uniqueDays[0]

      for (let index = 1; index < uniqueDays.length; index += 1) {
        const currentDay = uniqueDays[index]
        if (currentDay === rangeEnd + 1) {
          rangeEnd = currentDay
          continue
        }

        dayRanges.push([rangeStart, rangeEnd])
        rangeStart = currentDay
        rangeEnd = currentDay
      }

      dayRanges.push([rangeStart, rangeEnd])

      const rangeLabels = dayRanges.map(([startDay, endDay]) => {
        let dayLabel = String(startDay)
        if (endDay > startDay) {
          dayLabel = endDay === startDay + 1 ? `${startDay}, ${endDay}` : `${startDay}-${endDay}`
        }
        return `${group.monthName} ${dayLabel}`
      })

      const hasSingleDayOnly = dayRanges.length === 1 && dayRanges[0][0] === dayRanges[0][1]
      if (hasSingleDayOnly) {
        return `${group.monthName} ${dayRanges[0][0]}, ${group.year}`
      }

      return `${rangeLabels.join(', ')} ${group.year}`
    })
    .filter(Boolean)
}

function formatCoverageAwareInclusiveDateSummary(source, expandConsecutiveDays = false) {
  if (!source || typeof source !== 'object') return ''

  const dateSet = resolveDateSetFromSource(source)
  if (!dateSet.length) {
    const startDate = source?.start_date || source?.startDate || null
    const endDate = source?.end_date || source?.endDate || null
    if (startDate && endDate) {
      if (startDate === endDate) return formatDate(startDate)
      const rangeDates = enumerateInclusiveDateRange(startDate, endDate)
      if (rangeDates.length) {
        const formatted = formatGroupedInclusiveDateLines(rangeDates, expandConsecutiveDays)
        if (formatted.length) return formatted.join(', ')
      }
      return `${formatDate(startDate)} - ${formatDate(endDate)}`
    }
    if (startDate || endDate) return formatDate(startDate || endDate)
    return ''
  }

  const halfDayPortionMap =
    source?.selected_date_half_day_portion ||
    source?.selectedDateHalfDayPortion ||
    source?.half_day_portion ||
    source?.halfDayPortion ||
    {}

  const coverageMap =
    source?.selected_date_coverage ||
    source?.selectedDateCoverage ||
    source?.coverage ||
    {}

  const lines = []
  let wholeDayDateSet = []

  const appendWholeDayLines = () => {
    if (!wholeDayDateSet.length) return
    const groupedLines = formatGroupedInclusiveDateLines(
      wholeDayDateSet,
      expandConsecutiveDays,
    )
    lines.push(
      ...(groupedLines.length
        ? groupedLines
        : wholeDayDateSet.map((dateValue) => formatDate(dateValue))),
    )
    wholeDayDateSet = []
  }

  for (const dateValue of dateSet) {
    const portionRaw = String(halfDayPortionMap[dateValue] || '').trim().toUpperCase()
    const coverageRaw = String(coverageMap[dateValue] || '').trim().toUpperCase()
    const isHalfDay = portionRaw === 'AM' || portionRaw === 'PM' || coverageRaw.includes('HALF')

    if (!isHalfDay) {
      wholeDayDateSet.push(dateValue)
      continue
    }

    appendWholeDayLines()

    const formatted = formatDate(dateValue)
    const suffix =
      portionRaw === 'AM' || portionRaw === 'PM'
        ? ` (${portionRaw})`
        : ' (Half Day)'
    lines.push(`${formatted}${suffix}`)
  }

  appendWholeDayLines()

  return lines.join(', ')
}

function resolveFromDateValue(source) {
  const dateSet = resolveDateSetFromSource(source)
  if (dateSet.length) return formatDate(dateSet[0])

  const fallbackDate =
    source?.start_date || source?.startDate || source?.end_date || source?.endDate || ''
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

  // Extract fromValue (previous dates or original application dates)
  let fromValue = ''
  if (payload && typeof payload === 'object') {
    const previousDates = payload.previous_selected_dates || payload.previousSelectedDates
    if (Array.isArray(previousDates) && previousDates.length > 0) {
      const formatted = formatGroupedInclusiveDateLines(previousDates)
      if (formatted.length > 0) fromValue = formatted.join(', ')
    } else if (payload.previous_start_date || payload.previousStartDate) {
      const startDate = payload.previous_start_date || payload.previousStartDate
      const endDate = payload.previous_end_date || payload.previousEndDate || startDate
      const dates = enumerateInclusiveDateRange(startDate, endDate)
      if (dates.length > 0) {
        const formatted = formatGroupedInclusiveDateLines(dates)
        if (formatted.length > 0) fromValue = formatted.join(', ')
      }
    }
  }

  if (!fromValue) {
    const updateRequests = Array.isArray(app?.update_requests)
      ? app.update_requests
      : (Array.isArray(app?.updateRequests) ? app.updateRequests : [])
    for (const req of updateRequests) {
      const reqPayload = req?.requested_payload || req?.payload
      if (reqPayload && typeof reqPayload === 'object') {
        const pDates = reqPayload.previous_selected_dates || reqPayload.previousSelectedDates
        if (Array.isArray(pDates) && pDates.length > 0) {
          const formatted = formatGroupedInclusiveDateLines(pDates)
          if (formatted.length > 0) {
            fromValue = formatted.join(', ')
            break
          }
        }
      }
    }
  }

  if (!fromValue) {
    fromValue =
      formatCoverageAwareInclusiveDateSummary(source) ||
      resolveFromDateValue(source)
  }

  // Extract toValue (requested update dates or cancel)
  let toValue = ''
  if (payload && typeof payload === 'object') {
    toValue = formatCoverageAwareInclusiveDateSummary(payload)
  }

  if (!toValue) {
    const requestedDateSet = resolveDateSetFromSource(payload)
    toValue = requestedDateSet.length
      ? formatGroupedInclusiveDateLines(requestedDateSet).join(', ')
      : formatCoverageAwareInclusiveDateSummary(payload)
  }

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
      payload?.cancel_reason ||
      payload?.cancelReason ||
      payload?.remarks,
  )

  const resolvedActionTypeCandidates = [
    app?.pending_update_action_type,
    app?.pendingUpdateActionType,
    app?.latest_update_request_action_type,
    app?.latestUpdateRequestActionType,
    app?.raw?.pending_update_action_type,
    app?.raw?.pendingUpdateActionType,
    app?.raw?.latest_update_request_action_type,
    app?.raw?.latestUpdateRequestActionType,
    payload?.action_type,
    payload?.actionType,
    payload?.request_action_type,
    payload?.requestActionType,
  ]

  let actionType = ''
  for (const candidate of resolvedActionTypeCandidates) {
    const normalized = normalizeLeaveRequestActionTypeToken(candidate)
    if (!normalized) continue
    actionType = normalized
    break
  }

  if (!actionType) {
    const remarksToken = normalizeText(app?.remarks || source?.remarks || '').toLowerCase()
    if (remarksToken.includes('cancel request') || remarksToken.includes('cancellation request')) {
      actionType = ACTION_TYPE_CANCEL
    }
  }

  if (!actionType) actionType = ACTION_TYPE_UPDATE

  const approvedBy = normalizeText(
    resolveDepartmentHeadName(app) || resolveDepartmentHeadName(source),
  )

  return {
    requestDate,
    employeeName,
    fromValue,
    toValue,
    reason,
    approvedBy,
    actionType,
  }
}

function formUnderlineField(value, lineWidth = 270, fontSize = 10, alignment = 'left') {
  const textValue = normalizeText(value)
  return {
    width: lineWidth,
    stack: [
      {
        text: textValue || ' ',
        fontSize,
        bold: Boolean(textValue),
        alignment,
        margin: [4, 0, 4, 2],
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: lineWidth,
            y2: 0,
            lineWidth: 0.8,
            lineColor: '#111111',
          },
        ],
      },
    ],
  }
}

function shortFieldRow(label, value, options = {}) {
  const labelWidth = Number(options.labelWidth) || 155
  const lineWidth = Number(options.lineWidth) || 270
  const fontSize = Number(options.fontSize) || 10
  const alignment = options.alignment || 'left'

  return {
    columns: [
      { width: labelWidth, text: label, fontSize, bold: true, margin: [0, 3, 0, 0] },
      { width: 15, text: ':', fontSize, bold: true, alignment: 'left', margin: [0, 3, 0, 0] },
      formUnderlineField(value, lineWidth, fontSize, alignment),
    ],
    columnGap: 0,
    margin: options.margin || [0, 4, 0, 0],
  }
}

function buildHeader(logoBase64) {
  const headerBarHeight = 18
  const smallRectTopOffset = 34
  const headerTextSize = 10
  const leftInset = 6
  const officeBandPaddingTop = Math.max(0, Math.floor((headerBarHeight - headerTextSize) / 2))

  return {
    columns: [
      {
        width: 28,
        margin: [0, smallRectTopOffset, 8, 0],
        canvas: [{ type: 'rect', x: 0, y: 0, w: 22, h: headerBarHeight, color: HEADER_BAR_COLOR }],
      },
      logoBase64
        ? { width: 78, image: logoBase64, fit: [72, 72], margin: [0, 0, 8, 0] }
        : { width: 78, text: '' },
      {
        width: '*',
        stack: [
          {
            text: 'REPUBLIC OF THE PHILIPPINES',
            fontSize: 7.5,
            color: '#333333',
            margin: [leftInset, 0, 0, 0],
          },
          {
            text: 'PROVINCE OF DAVAO DEL NORTE',
            fontSize: 7.5,
            color: '#333333',
            margin: [leftInset, 0, 0, 0],
          },
          {
            text: 'CITY OF TAGUM',
            fontSize: 14,
            bold: true,
            color: HEADER_BAR_COLOR,
            margin: [leftInset, 0, 0, 0],
          },
          {
            table: {
              widths: ['*'],
              heights: [headerBarHeight],
              body: [
                [
                  {
                    text: 'CITY HUMAN RESOURCE MANAGEMENT OFFICE',
                    color: '#ffffff',
                    bold: true,
                    alignment: 'left',
                    fontSize: headerTextSize,
                    fillColor: HEADER_BAR_COLOR,
                    margin: [leftInset, officeBandPaddingTop, 4, 0],
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0,
              vLineWidth: () => 0,
              paddingLeft: () => 0,
              paddingRight: () => 0,
              paddingTop: () => 0,
              paddingBottom: () => 0,
            },
            margin: [0, 2, 0, 0],
          },
        ],
      },
    ],
    columnGap: 0,
    margin: [0, 0, 0, 8],
  }
}

function buildChangesSection(formData) {
  const fromText = normalizeText(formData.fromValue) || ' '
  const toText =
    normalizeText(
      formData.actionType === ACTION_TYPE_CANCEL ? 'Cancel Leave' : formData.toValue,
    ) || ' '

  return {
    stack: [
      {
        columns: [
          { width: 155, text: 'CHANGES', fontSize: 10, bold: true, margin: [0, 3, 0, 0] },
          { width: 15, text: ':', fontSize: 10, bold: true, alignment: 'left', margin: [0, 3, 0, 0] },
          { width: 145, text: 'FROM:', fontSize: 10, bold: true, margin: [0, 3, 0, 0] },
          { width: 10, text: '' },
          { width: 190, text: 'TO:', fontSize: 10, bold: true, margin: [0, 3, 0, 0] },
        ],
        columnGap: 0,
        margin: [0, 4, 0, 0],
      },
      {
        columns: [
          { width: 170, text: '' },
          {
            width: 145,
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    text: fromText,
                    fontSize: 9.5,
                    bold: Boolean(normalizeText(formData.fromValue)),
                    margin: [4, 4, 4, 4],
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.8,
              vLineWidth: () => 0.8,
              hLineColor: () => '#111111',
              vLineColor: () => '#111111',
              paddingLeft: () => 4,
              paddingRight: () => 4,
              paddingTop: () => 4,
              paddingBottom: () => 4,
            },
          },
          { width: 10, text: '' },
          {
            width: 190,
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    text: toText,
                    fontSize: 9.5,
                    bold: Boolean(normalizeText(toText)),
                    margin: [4, 4, 4, 4],
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.8,
              vLineWidth: () => 0.8,
              hLineColor: () => '#111111',
              vLineColor: () => '#111111',
              paddingLeft: () => 4,
              paddingRight: () => 4,
              paddingTop: () => 4,
              paddingBottom: () => 4,
            },
          },
        ],
        columnGap: 0,
        margin: [0, 2, 0, 2],
      },
    ],
  }
}

function approvedByRow(approvedByName) {
  const lineWidth = 270
  const textValue = normalizeText(approvedByName)
  return {
    columns: [
      { width: 155, text: 'APPROVED BY', fontSize: 10, bold: true, margin: [0, 3, 0, 0] },
      { width: 15, text: ':', fontSize: 10, bold: true, alignment: 'left', margin: [0, 3, 0, 0] },
      {
        width: lineWidth,
        stack: [
          {
            text: textValue || ' ',
            fontSize: 10,
            bold: true,
            alignment: 'center',
            margin: [0, 0, 0, 2],
          },
          {
            canvas: [
              {
                type: 'line',
                x1: 0,
                y1: 0,
                x2: lineWidth,
                y2: 0,
                lineWidth: 0.8,
                lineColor: '#111111',
              },
            ],
          },
          {
            text: 'Signature Over Printed Name',
            alignment: 'center',
            fontSize: 8,
            italics: true,
            margin: [0, 2, 0, 0],
          },
          {
            text: 'Head of Office',
            alignment: 'center',
            fontSize: 8,
            italics: true,
            margin: [0, 1, 0, 0],
          },
        ],
      },
    ],
    columnGap: 0,
    margin: [0, 6, 0, 0],
  }
}

function buildActionTakenSection() {
  const leftIndent = 16
  const fullLineWidth = 499
  const reasonLineWidth = 237

  return {
    stack: [
      { text: 'ACTION TAKEN', fontSize: 10.5, bold: true, margin: [0, 14, 0, 8] },
      {
        columns: [
          { width: leftIndent, text: '' },
          {
            width: 16,
            canvas: [
              {
                type: 'rect',
                x: 0,
                y: 1,
                w: 12,
                h: 12,
                lineWidth: 1,
                lineColor: '#111111',
              },
            ],
          },
          { width: 85, text: 'Considered', fontSize: 10, bold: true, margin: [0, 1, 0, 0] },
          {
            width: 16,
            canvas: [
              {
                type: 'rect',
                x: 0,
                y: 1,
                w: 12,
                h: 12,
                lineWidth: 1,
                lineColor: '#111111',
              },
            ],
          },
          {
            width: 145,
            text: 'Not Considered, Reason:',
            fontSize: 10,
            bold: true,
            margin: [0, 1, 0, 0],
          },
          {
            width: '*',
            canvas: [
              {
                type: 'line',
                x1: 0,
                y1: 11,
                x2: reasonLineWidth,
                y2: 11,
                lineWidth: 0.8,
                lineColor: '#111111',
              },
            ],
          },
        ],
        columnGap: 0,
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: fullLineWidth,
            y2: 0,
            lineWidth: 0.8,
            lineColor: '#111111',
          },
        ],
        margin: [leftIndent, 14, 0, 0],
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: fullLineWidth,
            y2: 0,
            lineWidth: 0.8,
            lineColor: '#111111',
          },
        ],
        margin: [leftIndent, 14, 0, 0],
      },
    ],
    margin: [0, 8, 0, 0],
  }
}

function buildSignatoriesSection() {
  const leftIndent = 16
  return {
    columns: [
      { width: leftIndent, text: '' },
      {
        width: 245,
        stack: [
          { text: 'Validated by:', fontSize: 10 },
          { text: ' ', margin: [0, 28, 0, 0] },
          { text: VALIDATED_BY_NAME, bold: true, fontSize: 10 },
          { text: VALIDATED_BY_TITLE, italics: true, fontSize: 9 },
        ],
      },
      {
        width: 254,
        stack: [
          { text: 'Noted by:', fontSize: 10 },
          { text: ' ', margin: [0, 28, 0, 0] },
          { text: NOTED_BY_NAME, bold: true, fontSize: 10 },
          { text: NOTED_BY_TITLE, italics: true, fontSize: 9 },
        ],
      },
    ],
    columnGap: 0,
    margin: [0, 24, 0, 0],
  }
}

function buildFooterNote() {
  return {
    text: [
      { text: '****', bold: true, italics: true, fontSize: 8.5 },
      {
        text: 'Note: Kindly attach the approved leave form and justification letter',
        italics: true,
        decoration: 'underline',
        fontSize: 8.5,
      },
    ],
    margin: [0, 20, 0, 0],
  }
}

function buildOuterFrame(innerContent) {
  return {
    table: {
      widths: ['*'],
      body: [
        [
          {
            stack: innerContent,
            margin: [0, 0, 0, 0],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => '#000000',
      vLineColor: () => '#000000',
      paddingLeft: () => 16,
      paddingRight: () => 16,
      paddingTop: () => 14,
      paddingBottom: () => 14,
    },
  }
}

function openPdfDocument(pdfDocument, options = {}) {
  const targetWindow =
    options?.targetWindow && !options.targetWindow.closed ? options.targetWindow : null
  const fileName =
    String(options?.fileName || 'request-amendment-approved-leave.pdf').trim() ||
    'request-amendment-approved-leave.pdf'

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

export async function generateRequestAmendmentApprovedLeavePdf(app = {}, options = {}) {
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
    pageMargins: [20, 20, 20, 20],
    content: [
      buildOuterFrame([
        buildHeader(logoBase64),
        {
          text: 'REQUEST FOR AMENDMENT OF APPROVED LEAVE APPLICATION',
          alignment: 'center',
          bold: true,
          fontSize: 12.5,
          margin: [0, 10, 0, 14],
        },
        shortFieldRow('DATE OF REQUEST', formatDate(formData.requestDate)),
        shortFieldRow('NAME OF EMPLOYEE', formData.employeeName),
        buildChangesSection(formData),
        shortFieldRow('REASON/S', formData.reason),
        shortFieldRow('SIGNATURE OF EMPLOYEE', ''),
        approvedByRow(formData.approvedBy),
        buildActionTakenSection(),
        buildSignatoriesSection(),
        buildFooterNote(),
      ]),
    ],
    defaultStyle: {
      font: 'Roboto',
    },
  }

  const pdfDocument = pdfMake.createPdf(docDefinition)
  return openPdfDocument(pdfDocument, options)
}

export const generateRequestChangesApprovedLeavePdf = generateRequestAmendmentApprovedLeavePdf
