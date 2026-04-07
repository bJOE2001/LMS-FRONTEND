import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { api } from 'src/boot/axios'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'
import { generateCocCertificatePdf } from 'src/utils/coc-certificate-pdf'
import { getApplicationRequestedDayCount } from 'src/utils/leave-date-locking'

export function useHrApplicationsPanel() {

const q = useQuasar()
const route = useRoute()
const router = useRouter()

const loading = ref(false)
const receiveLoading = ref(false)
const releaseLoading = ref(false)
const applications = ref([])
const tablePagination = ref({
  page: 1,
  rowsPerPage: 10,
})
const statusSearch = ref('')
const employmentTypeFilter = ref('')
const searchableStatusValues = new Set(['pending', 'approved', 'rejected', 'recalled'])
const DEPARTMENT_STOP_WORDS = new Set([
  'A',
  'AN',
  'AND',
  'FOR',
  'IN',
  'OF',
  'OFFICE',
  'ON',
  'THE',
  'TO',
])
const EMPLOYMENT_TYPE_FILTER_LABELS = {
  elective: 'Elective',
  co_terminous: 'Co-term',
  regular: 'Regular',
  casual: 'Casual',
}
const ctoStandardDayHours = 8

const REQUEST_ACTION_UPDATE = 'REQUEST_UPDATE'
const REQUEST_ACTION_CANCEL = 'REQUEST_CANCEL'

function getActualRequestedDayCount(app) {
  const explicitCandidates = [
    app?.actual_total_days,
    app?.applied_total_days,
    app?.requested_total_days,
    app?.display_total_days,
  ]

  for (const candidate of explicitCandidates) {
    const numericValue = Number(candidate)
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue
    }
  }

  const requestedDayCount = Number(getApplicationRequestedDayCount(app))
  if (Number.isFinite(requestedDayCount) && requestedDayCount > 0) {
    return requestedDayCount
  }

  return null
}
const employmentTypeFilterLabel = computed(
  () => EMPLOYMENT_TYPE_FILTER_LABELS[employmentTypeFilter.value] || '',
)

function normalizeApplicationType(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
  if (normalized === 'COC') return 'COC'
  if (normalized === 'LEAVE') return 'LEAVE'
  return ''
}

function getApplicationType(application) {
  const explicitType = normalizeApplicationType(application?.application_type)
  if (explicitType) return explicitType

  const leaveTypeName = String(application?.leaveType || '')
    .trim()
    .toLowerCase()

  if (leaveTypeName === 'coc application' || leaveTypeName === 'coc') return 'COC'
  return 'LEAVE'
}

function isCocApplication(application) {
  return getApplicationType(application) === 'COC'
}

function getApplicationExplicitId(application) {
  return application?.id
}

function getApplicationRowKey(application, index = 0) {
  const typeKey = getApplicationType(application)
  const explicitId = getApplicationExplicitId(application)
  if (explicitId !== undefined && explicitId !== null && String(explicitId).trim() !== '') {
    return `${typeKey}:${String(explicitId).trim()}`
  }
  return `${typeKey}:index:${index}`
}

function getApplicationMergeKey(application, index) {
  const rowKey = getApplicationRowKey(application, index)
  if (!rowKey.includes(':index:')) return `id:${rowKey}`

  const employeeKey = String(application?.employee_control_no || '').trim()
  const leaveTypeKey = String(application?.leaveType || '')
    .trim()
    .toLowerCase()
  const dateKey = String(application?.dateFiled || '').trim()

  const fallback = [getApplicationType(application), employeeKey, leaveTypeKey, dateKey]
    .filter(Boolean)
    .join('|')

  return fallback ? `fallback:${fallback}` : `index:${index}`
}

function createRecalledCompanionRow(app, index = 0) {
  if (!app || typeof app !== 'object' || isCocApplication(app)) return null
  if (String(app?.rawStatus || '').toUpperCase() !== 'APPROVED') return null

  const recalledDateKeys = getStoredRecallDateKeys(app)
  if (!recalledDateKeys.length) return null

  const recalledDays = getDateSubsetTotalDays(app, recalledDateKeys) || recalledDateKeys.length
  const baseKey = app?.application_uid || getApplicationRowKey(app, index)

  return {
    ...app,
    application_uid: `${baseKey}:recalled`,
    application_row_variant: 'recalled',
    group_raw_status: app?.rawStatus || 'APPROVED',
    status: 'Recalled',
    rawStatus: 'RECALLED',
    displayStatus: 'Recalled',
    selected_dates: recalledDateKeys,
    selectedDates: recalledDateKeys,
    recall_selected_dates: recalledDateKeys,
    recallSelectedDates: recalledDateKeys,
    actual_total_days: recalledDays,
    requested_total_days: recalledDays,
    display_total_days: recalledDays,
    total_days: recalledDays,
    days: recalledDays,
    duration_value: recalledDays,
    duration_label: formatDurationDisplay(recalledDays, 'day'),
    remarks: 'Recalled by HR.',
  }
}

function expandApplicationsForDisplay(applications) {
  const rows = []

  applications.forEach((app, index) => {
    if (!app || typeof app !== 'object') return
    rows.push(app)

    const recalledCompanionRow = createRecalledCompanionRow(app, index)
    if (recalledCompanionRow) {
      rows.push(recalledCompanionRow)
    }
  })

  return rows
}

function extractApplicationsFromPayload(payload) {
  if (payload && typeof payload === 'object' && Array.isArray(payload.applications)) {
    return payload.applications
  }
  return []
}

function extractSingleApplicationFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return null
  if (payload.application && typeof payload.application === 'object') return payload.application
  if (payload.id !== undefined && payload.id !== null) return payload
  return null
}

function isTruthyBackendFlag(value) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

function normalizeBackendApplicationShape(application, index = 0) {
  if (!application || typeof application !== 'object') return null

  const normalizedLeaveType = String(application?.leaveType ?? '').trim()
  const normalizedLeaveTypeName =
    normalizedLeaveType || String(application?.leave_type_name ?? '').trim()
  const rawStatusKey = String(
    application?.rawStatus ?? application?.raw_status ?? application?.status ?? '',
  )
    .trim()
    .toUpperCase()
  const normalizedApplicationType = normalizeApplicationType(
    application?.application_type ??
      (normalizedLeaveType.toLowerCase() === 'coc application' ? 'COC' : 'LEAVE'),
  )
  const normalizedLeaveBalances = Array.isArray(application?.leaveBalances)
    ? [...application.leaveBalances]
    : null
  const normalizedRecallSelectedDates = Array.isArray(application?.recall_selected_dates)
    ? [...application.recall_selected_dates]
    : null

  const normalized = {
    ...application,
    application_type: normalizedApplicationType || 'LEAVE',
    employeeName: String(application?.employeeName ?? application?.employee_name ?? '').trim() || 'Unknown',
    leaveType: normalizedLeaveTypeName,
    startDate: application?.startDate ?? null,
    endDate: application?.endDate ?? null,
    dateFiled: application?.dateFiled ?? '',
    filed_at: application?.filed_at ?? application?.created_at ?? null,
    rawStatus: rawStatusKey,
    raw_status: application?.raw_status ?? rawStatusKey,
    group_raw_status: String(application?.group_raw_status ?? '').trim().toUpperCase() || rawStatusKey,
    leave_type_id: application?.leave_type_id ?? null,
    selected_dates: Array.isArray(application?.selected_dates) ? [...application.selected_dates] : null,
    selected_date_pay_status: application?.selected_date_pay_status ?? null,
    selected_date_coverage: application?.selected_date_coverage ?? null,
    pending_update: application?.pending_update ?? null,
    pending_update_reason: application?.pending_update_reason ?? '',
    pending_update_action_type:
      application?.pending_update_action_type ?? application?.pendingUpdateActionType ?? null,
    has_pending_update_request: isTruthyBackendFlag(application?.has_pending_update_request),
    latest_update_request_status: application?.latest_update_request_status ?? '',
    latest_update_request_action_type:
      application?.latest_update_request_action_type ?? application?.latestUpdateRequestActionType ?? null,
    latest_update_request_payload: application?.latest_update_request_payload ?? null,
    latest_update_requested_at: application?.latest_update_requested_at ?? null,
    latest_update_reviewed_at: application?.latest_update_reviewed_at ?? null,
    latest_update_review_remarks: application?.latest_update_review_remarks ?? '',
    recall_selected_dates: normalizedRecallSelectedDates,
    leave_balances: normalizedLeaveBalances,
    leaveBalance: Number.isFinite(Number(application?.leaveBalance))
      ? Number(application.leaveBalance)
      : null,
    pay_mode: application?.pay_mode ?? null,
    has_hr_received: isTruthyBackendFlag(application?.has_hr_received ?? application?.hasHrReceived),
    has_hr_released: isTruthyBackendFlag(application?.has_hr_released ?? application?.hasHrReleased),
    received_by: application?.received_by ?? application?.receivedBy ?? application?.hr_received_by ?? null,
    received_at: application?.received_at ?? application?.receivedAt ?? application?.hr_received_at ?? null,
    released_by: application?.released_by ?? application?.releasedBy ?? application?.hr_released_by ?? null,
    released_at: application?.released_at ?? application?.releasedAt ?? application?.hr_released_at ?? null,
    attachment_reference: application?.attachment_reference ?? null,
    attachment_submitted: isTruthyBackendFlag(application?.attachment_submitted),
    office: application?.office ?? application?.department ?? null,
  }

  normalized.application_uid =
    application?.application_uid || getApplicationRowKey(normalized, index)

  return normalized
}

function normalizeBackendApplications(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((application, index) => normalizeBackendApplicationShape(application, index))
    .filter(Boolean)
}

function mergeApplications(...sources) {
  const merged = new Map()

  sources.flat().forEach((application, index) => {
    const normalizedApplication = normalizeBackendApplicationShape(application, index)
    if (!normalizedApplication) return

    const normalized = {
      ...normalizedApplication,
      application_type: getApplicationType(normalizedApplication),
      application_uid:
        normalizedApplication?.application_uid || getApplicationRowKey(normalizedApplication, index),
    }

    const key = getApplicationMergeKey(normalized, index)
    const existing = merged.get(key)
    merged.set(key, existing ? { ...existing, ...normalized } : normalized)
  })

  return Array.from(merged.values())
}

function mergeStatus(app) {
  const raw = String(app.rawStatus || '').toUpperCase()
  const status = String(app.status || '').toUpperCase()
  const normalizedStatus = status.replace(/[_-]+/g, ' ')
  const latestUpdateRequestStatus = getLatestUpdateRequestStatus(app)

  if (
    latestUpdateRequestStatus === 'PENDING' &&
    (raw === 'PENDING_ADMIN' || raw === 'PENDING_HR')
  ) {
    return 'Approved'
  }

  if (raw === 'PENDING_ADMIN' || normalizedStatus.includes('PENDING ADMIN')) return 'Pending Admin'
  if (raw === 'PENDING_HR' || normalizedStatus.includes('PENDING HR')) return 'Pending HR'

  if (raw.includes('PENDING') || normalizedStatus.includes('PENDING')) return 'Pending'
  if (raw.includes('APPROVED') || status.includes('APPROVED')) return 'Approved'
  if (
    raw.includes('REJECTED') ||
    raw.includes('DISAPPROVED') ||
    status.includes('REJECTED') ||
    status.includes('DISAPPROVED')
  ) {
    return 'Rejected'
  }

  if (raw.includes('RECALLED') || normalizedStatus.includes('RECALLED')) {
    return 'Recalled'
  }

  return app.status || ''
}

function isEditUpdateRequest(app) {
  if (!app || typeof app !== 'object') return false
  if (isTruthyBackendFlag(app?.has_pending_update_request)) return true
  if (getLeaveRequestActionType(app)) return true
  return Boolean(app?.pending_update || app?.latest_update_request_payload)
}

function normalizeUpdateRequestStatus(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  if (normalized === 'PENDING') return 'PENDING'
  if (normalized === 'APPROVED') return 'APPROVED'
  if (normalized === 'REJECTED') return 'REJECTED'
  return ''
}

function normalizeLeaveRequestActionTypeToken(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  if (!normalized) return ''

  if (
    normalized === REQUEST_ACTION_CANCEL ||
    normalized === 'CANCEL_REQUEST' ||
    normalized === 'REQUEST_CANCELLATION' ||
    normalized === 'CANCELLATION_REQUEST' ||
    normalized === 'LEAVE_CANCELLATION_REQUEST'
  ) {
    return REQUEST_ACTION_CANCEL
  }

  if (
    normalized === REQUEST_ACTION_UPDATE ||
    normalized === 'UPDATE_REQUEST' ||
    normalized === 'EDIT_REQUEST' ||
    normalized === 'REQUEST_EDIT'
  ) {
    return REQUEST_ACTION_UPDATE
  }

  return ''
}

function resolveLeaveRequestActionTypeFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return ''

  const candidates = [
    payload?.action_type,
    payload?.actionType,
    payload?.request_action_type,
    payload?.requestActionType,
    payload?.type,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeLeaveRequestActionTypeToken(candidate)
    if (normalized) return normalized
  }

  return ''
}

function resolveLeaveRequestActionTypeFromStatusHistory(app) {
  return getStatusHistoryEntries(app).reduce((resolved, entry = {}) => {
    if (resolved) return resolved

    const actionToken = normalizeStatusHistoryActionToken(entry?.action)
    const stageToken = normalizeStatusHistoryToken(entry?.stage)
    const remarksToken = normalizeStatusHistoryToken(entry?.remarks)

    if (
      actionToken.includes('REQUEST_CANCEL') ||
      stageToken.includes('cancel request') ||
      stageToken.includes('cancellation request') ||
      remarksToken.includes('cancel request') ||
      remarksToken.includes('cancellation request')
    ) {
      return REQUEST_ACTION_CANCEL
    }

    if (
      actionToken.includes('REQUEST_UPDATE') ||
      actionToken.includes('EDIT_REQUEST') ||
      stageToken.includes('edit request') ||
      stageToken.includes('request update') ||
      remarksToken.includes('edit request') ||
      remarksToken.includes('request update')
    ) {
      return REQUEST_ACTION_UPDATE
    }

    return ''
  }, '')
}

function getLeaveRequestActionType(app) {
  if (!app || typeof app !== 'object') return ''

  const explicitCandidates = [
    app?.pending_update_action_type,
    app?.pendingUpdateActionType,
    app?.latest_update_request_action_type,
    app?.latestUpdateRequestActionType,
    app?.raw?.pending_update_action_type,
    app?.raw?.pendingUpdateActionType,
    app?.raw?.latest_update_request_action_type,
    app?.raw?.latestUpdateRequestActionType,
  ]

  for (const candidate of explicitCandidates) {
    const normalized = normalizeLeaveRequestActionTypeToken(candidate)
    if (normalized) return normalized
  }

  const payload = getPendingUpdatePayload(app)
  const payloadType = resolveLeaveRequestActionTypeFromPayload(payload)
  if (payloadType) return payloadType

  const workflowRemarks = normalizeStatusHistoryToken(app?.remarks || '')
  if (workflowRemarks.includes('cancel request') || workflowRemarks.includes('cancellation request')) {
    return REQUEST_ACTION_CANCEL
  }
  if (workflowRemarks.includes('edit request') || workflowRemarks.includes('request update')) {
    return REQUEST_ACTION_UPDATE
  }

  return resolveLeaveRequestActionTypeFromStatusHistory(app)
}

function isCancellationRequestAction(app) {
  return getLeaveRequestActionType(app) === REQUEST_ACTION_CANCEL
}

function getEditRequestLabelPrefix(app) {
  return isCancellationRequestAction(app) ? 'Cancel Request' : 'Edit Request'
}

function getEditRequestStatusFieldLabel(app) {
  return isCancellationRequestAction(app)
    ? 'Cancellation Request Status'
    : 'Edit Request Status'
}

function shouldExposeEditRequestStatusToHr(app, status) {
  if (status !== 'PENDING') return true

  const rawStatus = getApplicationRawStatusKey(app)

  if (rawStatus === 'PENDING_HR') return true
  if (rawStatus !== 'PENDING_ADMIN') return false

  return Boolean(
    isEditUpdateRequest(app) ||
      getLeaveRequestActionType(app) ||
      getPendingUpdatePayload(app) ||
      app?.latest_update_requested_at,
  )
}

function getLatestUpdateRequestStatus(app) {
  const explicitStatus = normalizeUpdateRequestStatus(
    app?.latest_update_request_status ??
      app?.latestUpdateRequestStatus ??
      app?.latest_update_status ??
      app?.latestUpdateStatus ??
      app?.raw?.latest_update_request_status ??
      app?.raw?.latestUpdateRequestStatus ??
      app?.raw?.latest_update_status ??
      app?.raw?.latestUpdateStatus ??
      '',
  )
  if (explicitStatus && shouldExposeEditRequestStatusToHr(app, explicitStatus)) {
    return explicitStatus
  }

  const fallbackStatus = isEditUpdateRequest(app) ? 'PENDING' : ''
  if (shouldExposeEditRequestStatusToHr(app, fallbackStatus)) {
    return fallbackStatus
  }

  return ''
}

function getEditRequestBadgeLabel(app) {
  const status = getLatestUpdateRequestStatus(app)
  const labelPrefix = getEditRequestLabelPrefix(app)
  if (status === 'PENDING') return labelPrefix + ' Pending'
  if (status === 'APPROVED') return labelPrefix + ' Approved'
  if (status === 'REJECTED') return labelPrefix + ' Rejected'
  return ''
}

function getEditRequestBadgeColor(app) {
  const status = getLatestUpdateRequestStatus(app)
  if (status === 'PENDING') return 'deep-purple-7'
  if (status === 'APPROVED') return 'positive'
  if (status === 'REJECTED') return 'negative'
  return 'grey-7'
}

function getEditRequestStatusLabel(app) {
  const status = getLatestUpdateRequestStatus(app)
  if (status === 'PENDING') {
    const rawStatus = getApplicationRawStatusKey(app)
    if (rawStatus === 'PENDING_HR') return 'Pending HR Review'
    if (rawStatus === 'PENDING_ADMIN') return 'Pending Admin Review'
    return 'Pending Review'
  }
  if (status === 'APPROVED') return 'Approved'
  if (status === 'REJECTED') return 'Rejected'
  return ''
}

function isPendingEditRequest(app) {
  return getLatestUpdateRequestStatus(app) === 'PENDING'
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizeSearchToken(token) {
  if (!token) return ''
  if (/^\d+$/.test(token)) return String(Number(token))
  return token
}

function toDepartmentCode(value) {
  const source = String(value || '').trim()
  if (!source) return ''

  // Keep existing compact uppercase codes (e.g., CICTMO) unchanged.
  if (!/\s/.test(source) && source === source.toUpperCase()) {
    return source
  }

  const words = source
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim().toUpperCase())
    .filter(Boolean)

  if (!words.length) return source

  const acronymWords = words.filter(
    (word) => !DEPARTMENT_STOP_WORDS.has(word) && !/^\d+$/.test(word),
  )
  const selectedWords = acronymWords.length ? acronymWords : words
  const acronym = selectedWords.map((word) => word[0]).join('')

  return acronym || source
}

function tokenizeSearchValue(value) {
  const normalized = normalizeSearchText(value)
  if (!normalized) return []

  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => normalizeSearchToken(token))
}

function getSearchTokens(value) {
  return tokenizeSearchValue(value)
}

function normalizeEmploymentTypeKey(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[_\s]+/g, '-')

  if (!normalized) return ''
  if (normalized.includes('ELECTIVE')) return 'elective'
  if (
    normalized.includes('CO-TER') ||
    normalized.includes('CO-TERM') ||
    normalized.includes('COTER')
  )
    return 'co_terminous'
  if (normalized.includes('REGULAR')) return 'regular'
  if (normalized.includes('CASUAL')) return 'casual'
  return ''
}

function getApplicationEmploymentTypeKey(application) {
  return normalizeEmploymentTypeKey(application?.employment_status)
}

function matchesEmploymentTypeFilter(application) {
  if (!employmentTypeFilter.value) return true
  return getApplicationEmploymentTypeKey(application) === employmentTypeFilter.value
}

function formatDayValue(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return '0'
  return Number.isInteger(numericValue) ? String(numericValue) : String(numericValue)
}

function normalizeDurationUnit(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  if (normalized.startsWith('hour')) return 'hour'
  if (normalized.startsWith('day')) return 'day'
  return ''
}

function formatDurationDisplay(value, unit) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return unit === 'hour' ? '0 h' : '0 days'

  const displayValue = formatDayValue(numericValue)
  if (unit === 'hour') return `${displayValue} h`
  return `${displayValue} ${numericValue === 1 ? 'day' : 'days'}`
}

function getDateSubsetTotalDays(app, dateKeys = []) {
  const normalizedDateKeys = [
    ...new Set(
      (Array.isArray(dateKeys) ? dateKeys : [])
        .map((value) => toIsoDateString(value))
        .filter(Boolean),
    ),
  ]
  if (!normalizedDateKeys.length) return 0

  const coverageWeights = getSelectedDateCoverageWeights(app)
  const totalDays = normalizedDateKeys.reduce((sum, dateKey) => {
    const weight = Number(coverageWeights[dateKey] ?? 1)
    return sum + (Number.isFinite(weight) && weight > 0 ? weight : 1)
  }, 0)

  return Math.round((totalDays + Number.EPSILON) * 100) / 100
}

function getApplicationDurationDisplay(app) {
  if (!app) return '0 days'

  if (!isCocApplication(app) && !app?.is_monetization) {
    const storedRecallDateKeys = getStoredRecallDateKeys(app)
    const shouldUseVisibleDuration =
      storedRecallDateKeys.length > 0 || app?.application_row_variant === 'recalled'
    const visibleDateSet = getVisibleDateSetForDisplay(app)
    if (shouldUseVisibleDuration && visibleDateSet.length) {
      const visibleDays = getDateSubsetTotalDays(app, visibleDateSet)
      if (Number.isFinite(visibleDays) && visibleDays > 0) {
        return formatDurationDisplay(visibleDays, 'day')
      }
    }
  }

  const explicitLabel = String(app?.duration_label || '').trim()
  if (explicitLabel) return explicitLabel

  const explicitUnit = normalizeDurationUnit(app?.duration_unit)
  const explicitValue = Number(app?.duration_value)
  if (explicitUnit && Number.isFinite(explicitValue)) {
    return formatDurationDisplay(explicitValue, explicitUnit)
  }

  if (isCocApplication(app)) {
    const hourValue = Number(app?.days ?? app?.total_days)
    if (Number.isFinite(hourValue)) return formatDurationDisplay(hourValue, 'hour')

    const minutes = Number(app?.total_no_of_coc_applied_minutes)
    if (Number.isFinite(minutes)) return formatDurationDisplay(minutes / 60, 'hour')

    return '0 h'
  }

  const actualDayValue = getActualRequestedDayCount(app)
  if (Number.isFinite(actualDayValue) && actualDayValue > 0) {
    return formatDurationDisplay(actualDayValue, 'day')
  }

  const dayValue = Number(app?.days ?? app?.total_days)
  if (Number.isFinite(dayValue)) return formatDurationDisplay(dayValue, 'day')

  return '0 days'
}

function toIsoDateString(dateValue) {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function enumerateInclusiveDateRange(startDateValue, endDateValue) {
  const startDate = new Date(startDateValue)
  const endDate = new Date(endDateValue)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return []

  const firstDate = new Date(startDate)
  const lastDate = new Date(endDate)
  if (firstDate > lastDate) {
    const tempDate = new Date(firstDate)
    firstDate.setTime(lastDate.getTime())
    lastDate.setTime(tempDate.getTime())
  }

  const dates = []
  const cursor = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate())
  const last = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate())

  while (cursor <= last) {
    dates.push(toIsoDateString(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates.filter(Boolean)
}

function formatGroupedInclusiveDateLines(dateValues) {
  if (!Array.isArray(dateValues) || dateValues.length === 0) return []

  const groupedByMonthYear = new Map()
  const sortedDates = [...new Set(dateValues.filter(Boolean))].sort(
    (left, right) => Date.parse(left) - Date.parse(right),
  )

  for (const rawDate of sortedDates) {
    const parsedDate = new Date(rawDate)
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

  return Array.from(groupedByMonthYear.values()).map((group) => {
    const uniqueDays = [...new Set(group.days)].sort((a, b) => a - b)
    return `${group.monthName} ${uniqueDays.join(',')} ${group.year}`
  })
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
      // Ignore malformed selected_dates JSON and fall back to token parsing.
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

function normalizeIsoDateList(dateValues) {
  if (!Array.isArray(dateValues)) return []
  return [...new Set(dateValues.map((value) => toIsoDateString(value)).filter(Boolean))].sort(
    (left, right) => Date.parse(left) - Date.parse(right),
  )
}

function resolveDateSetFromSource(source) {
  if (!source || typeof source !== 'object') return []

  const selectedDates = normalizeIsoDateList(parseSelectedDatesValue(source?.selected_dates))
  if (selectedDates.length > 0) return selectedDates

  const startDate = source?.startDate ?? source?.start_date ?? null
  const endDate = source?.endDate ?? source?.end_date ?? null
  if (!startDate && !endDate) return []

  const firstDate = startDate || endDate
  const lastDate = endDate || startDate
  return enumerateInclusiveDateRange(firstDate, lastDate)
}

function getStoredRecallDateKeys(source) {
  if (!source || typeof source !== 'object') return []

  const recalledDates = normalizeIsoDateList(
    parseSelectedDatesValue(source?.recall_selected_dates),
  )

  if (!recalledDates.length) return []

  const selectedDates = resolveDateSetFromSource(source)
  if (!selectedDates.length) return recalledDates

  const selectedDateSet = new Set(selectedDates)
  return recalledDates.filter((dateKey) => selectedDateSet.has(dateKey))
}

function getVisibleDateSetForDisplay(app) {
  const dateSet = resolveDateSetFromSource(app)
  if (!dateSet.length) return []

  const recalledDateSet = new Set(getStoredRecallDateKeys(app))
  if (!recalledDateSet.size) return dateSet

  const rawStatus = getApplicationRawStatusKey(app)
  const isRecalledRow = app?.application_row_variant === 'recalled' || rawStatus === 'RECALLED'

  return isRecalledRow
    ? dateSet.filter((dateKey) => recalledDateSet.has(dateKey))
    : dateSet.filter((dateKey) => !recalledDateSet.has(dateKey))
}

function getRemainingRecallableDateKeys(app) {
  const selectedDates = resolveDateSetFromSource(app)
  if (!selectedDates.length) return []

  const recalledDateSet = new Set(getStoredRecallDateKeys(app))
  return selectedDates.filter((dateKey) => !recalledDateSet.has(dateKey))
}

function getPendingUpdatePayload(app) {
  const candidates = [app?.pending_update, app?.latest_update_request_payload]

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
      // Ignore malformed payload and continue scanning candidates.
    }
  }

  return null
}

function getCurrentLeaveTypeId(app) {
  const rawValue = app?.leave_type_id
  const leaveTypeId = Number(rawValue)
  return Number.isFinite(leaveTypeId) && leaveTypeId > 0 ? leaveTypeId : null
}

function getRequestedLeaveTypeId(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || typeof payload !== 'object') return null
  const leaveTypeId = Number(payload.leave_type_id)
  return Number.isFinite(leaveTypeId) && leaveTypeId > 0 ? leaveTypeId : null
}

function getCurrentLeaveTypeLabel(app) {
  const leaveTypeName = String(app?.leaveType || '').trim()

  let resolvedName = leaveTypeName || 'Unknown Leave Type'
  const resolvedNameKey = resolvedName.toLowerCase()
  if (
    resolvedNameKey === 'special privilege leave' ||
    resolvedNameKey === 'mco6 leave' ||
    resolvedNameKey === 'mc06 leave' ||
    resolvedNameKey === 'mc06' ||
    resolvedNameKey === 'mo6 leave'
  ) {
    resolvedName = 'Special Privilege Leave(MC06)'
  }
  return app?.is_monetization ? `${resolvedName} (Monetization)` : resolvedName
}

function getRequestedLeaveTypeLabel(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || typeof payload !== 'object') return ''

  const requestedName = String(payload?.leave_type_name || '').trim()

  const fallbackId = getRequestedLeaveTypeId(app)
  let resolvedName = requestedName || (fallbackId ? `Leave Type #${fallbackId}` : '')
  const resolvedNameKey = resolvedName.toLowerCase()
  if (
    resolvedNameKey === 'special privilege leave' ||
    resolvedNameKey === 'mco6 leave' ||
    resolvedNameKey === 'mc06 leave' ||
    resolvedNameKey === 'mc06' ||
    resolvedNameKey === 'mo6 leave'
  ) {
    resolvedName = 'Special Privilege Leave(MC06)'
  }
  if (!resolvedName) return ''

  const isMonetization = payload?.is_monetization === true || app?.is_monetization === true
  return isMonetization ? `${resolvedName} (Monetization)` : resolvedName
}

function hasPendingLeaveTypeUpdate(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || typeof payload !== 'object') return false

  const requestedLeaveTypeId = getRequestedLeaveTypeId(app)
  const currentLeaveTypeId = getCurrentLeaveTypeId(app)
  if (requestedLeaveTypeId && currentLeaveTypeId) {
    return requestedLeaveTypeId !== currentLeaveTypeId
  }

  const currentName = String(getCurrentLeaveTypeLabel(app) || '')
    .trim()
    .toLowerCase()
  const requestedName = String(getRequestedLeaveTypeLabel(app) || '')
    .trim()
    .toLowerCase()
  if (!requestedName) return false
  if (!currentName) return true
  return requestedName !== currentName
}

function getPendingUpdateReason(app) {
  const pendingPayload = getPendingUpdatePayload(app)

  const candidates = [
    app?.pending_update_reason,
    app?.pendingUpdateReason,
    app?.latest_update_request_reason,
    app?.latestUpdateRequestReason,
    app?.raw?.pending_update_reason,
    app?.raw?.pendingUpdateReason,
    app?.raw?.latest_update_request_reason,
    app?.raw?.latestUpdateRequestReason,
    pendingPayload?.reason,
    pendingPayload?.reason_purpose,
    pendingPayload?.update_reason,
    pendingPayload?.edit_reason,
    pendingPayload?.cancel_reason,
    pendingPayload?.cancelReason,
    pendingPayload?.remarks,
  ]

  for (const candidate of candidates) {
    const normalized = String(candidate || '').trim()
    if (!normalized) continue
    return normalized
  }

  return ''
}

function getDetailsRemarksRows(app) {
  if (!app || typeof app !== 'object') return []

  const rows = []
  const pendingUpdateReason = getPendingUpdateReason(app)
  if (pendingUpdateReason) {
    rows.push({
      label: isCancellationRequestAction(app) ? 'Cancellation Request' : 'Update Request',
      text: pendingUpdateReason,
    })
  }

  const workflowRemarks = formatWorkflowRemarksDisplay(
    String(app?.remarks ?? '').trim(),
  )
  if (!pendingUpdateReason && workflowRemarks) {
    rows.push({ label: '', text: workflowRemarks })
  }

  return rows
}

function formatWorkflowRemarksDisplay(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const cancelRequestMatch = raw.match(/^(?:cancel(?:lation)? request(?:ed)? via erms|cancellation requested via erms)\s*:?\s*(.*)$/i)
  if (cancelRequestMatch) {
    const trailingReason = String(cancelRequestMatch[1] || '').trim()
    return trailingReason
      ? 'Cancellation request submitted by employee. Reason: ' + trailingReason
      : 'Cancellation request submitted by employee.'
  }

  const editRequestMatch = raw.match(/^edit requested via erms\s*:?\s*(.*)$/i)
  if (editRequestMatch) {
    const trailingReason = String(editRequestMatch[1] || '').trim()
    return trailingReason
      ? 'Edit request submitted by employee. Reason: ' + trailingReason
      : 'Edit request submitted by employee.'
  }

  return raw
}

function normalizeLeaveBalanceEntries(source) {
  if (Array.isArray(source)) {
    return source
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        leaveTypeId: Number(item.leave_type_id ?? 0) || null,
        leaveTypeName: String(item.leave_type_name ?? item.leave_type ?? '').trim(),
        balance: Number(item.balance),
      }))
      .filter((item) => Number.isFinite(item.balance))
  }

  return []
}

function normalizeLeaveBalanceLookupKey(value) {
  const normalizedValue = String(value || '')
    .replace(/\s*\(monetization\)\s*$/i, '')
    .replace(/\s*\(mc06\)\s*$/i, '')
    .trim()
    .toLowerCase()

  if (!normalizedValue) return ''

  if (
    normalizedValue === 'special privilege leave' ||
    normalizedValue === 'special privilege' ||
    normalizedValue === 'mco6 leave' ||
    normalizedValue === 'mc06 leave' ||
    normalizedValue === 'mc06' ||
    normalizedValue === 'mo6 leave'
  ) {
    return 'special privilege leave'
  }

  return normalizedValue
}

function getEmployeeBalanceLookupKey(app) {
  const explicitKey = app?.employee_control_no
  if (explicitKey !== undefined && explicitKey !== null && String(explicitKey).trim() !== '') {
    return String(explicitKey).trim().toLowerCase()
  }

  const nameKey = [app?.surname, app?.firstname, app?.middlename, app?.employeeName]
    .map((value) =>
      String(value || '')
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean)
    .join('|')

  return nameKey || ''
}

function getRawLeaveBalanceEntriesFromApplication(app) {
  const sources = [app?.leave_balances]

  const entries = []
  const seen = new Set()

  for (const source of sources) {
    const normalizedEntries = normalizeLeaveBalanceEntries(source)
    for (const entry of normalizedEntries) {
      const entryKey = `${entry.leaveTypeId ?? ''}:${normalizeLeaveBalanceLookupKey(entry.leaveTypeName)}`
      if (seen.has(entryKey)) continue
      seen.add(entryKey)
      entries.push(entry)
    }
  }

  return entries
}

const latestLeaveBalanceEntriesByEmployee = computed(() => {
  const entriesByEmployee = new Map()
  const sortedApplications = [...(applications.value ?? [])].sort((a, b) => {
    const dateA = Date.parse(a?.dateFiled || a?.filed_at || a?.created_at || '') || 0
    const dateB = Date.parse(b?.dateFiled || b?.filed_at || b?.created_at || '') || 0
    if (dateA !== dateB) return dateB - dateA

    const idA = Number(a?.id) || 0
    const idB = Number(b?.id) || 0
    return idB - idA
  })

  for (const app of sortedApplications) {
    const employeeKey = getEmployeeBalanceLookupKey(app)
    if (!employeeKey) continue

    const latestEntries = getRawLeaveBalanceEntriesFromApplication(app)
    if (!latestEntries.length) continue

    let employeeEntries = entriesByEmployee.get(employeeKey)
    if (!employeeEntries) {
      employeeEntries = new Map()
      entriesByEmployee.set(employeeKey, employeeEntries)
    }

    for (const entry of latestEntries) {
      const entryKey = `${entry.leaveTypeId ?? ''}:${normalizeLeaveBalanceLookupKey(entry.leaveTypeName)}`
      if (!entryKey || employeeEntries.has(entryKey)) continue
      employeeEntries.set(entryKey, entry)
    }
  }

  return entriesByEmployee
})

function getLeaveBalanceEntriesForApplication(app) {
  const directEntries = getRawLeaveBalanceEntriesFromApplication(app)
  if (directEntries.length > 0) return directEntries

  const employeeKey = getEmployeeBalanceLookupKey(app)
  if (!employeeKey) return []

  const employeeEntries = latestLeaveBalanceEntriesByEmployee.value.get(employeeKey)
  if (!employeeEntries || employeeEntries.size === 0) return []

  return Array.from(employeeEntries.values())
}

function findLeaveBalanceEntry(app, leaveTypeId, leaveTypeLabel = '') {
  const entries = getLeaveBalanceEntriesForApplication(app)
  if (entries.length === 0) return null

  if (Number.isFinite(leaveTypeId) && leaveTypeId > 0) {
    const matchById = entries.find((entry) => Number(entry.leaveTypeId) === Number(leaveTypeId))
    if (matchById) return matchById
  }

  const normalizedLabel = normalizeLeaveBalanceLookupKey(leaveTypeLabel)
  if (normalizedLabel) {
    const matchByName = entries.find(
      (entry) => normalizeLeaveBalanceLookupKey(entry.leaveTypeName) === normalizedLabel,
    )
    if (matchByName) return matchByName
  }

  return null
}

function getCurrentLeaveBalanceValue(app) {
  const currentLeaveTypeId = getCurrentLeaveTypeId(app)
  const currentLeaveTypeLabel = getCurrentLeaveTypeLabel(app)
  const entry =
    findLeaveBalanceEntry(app, currentLeaveTypeId, currentLeaveTypeLabel) ||
    (isCocApplication(app) ? findLeaveBalanceEntry(app, null, 'CTO Leave') : null)
  if (entry && Number.isFinite(entry.balance)) return Number(entry.balance)

  const directBalanceCandidates = [
    app?.leaveBalance,
    app?.balance,
    app?.remaining_balance,
    app?.available_balance,
  ]

  for (const candidate of directBalanceCandidates) {
    const directBalance = Number(candidate)
    if (Number.isFinite(directBalance)) return directBalance
  }

  return null
}

function getCurrentLeaveBalanceDisplay(app) {
  const value = getCurrentLeaveBalanceValue(app)
  return value !== null ? `${formatDayValue(value)} day(s)` : 'N/A (non-credit)'
}

function getCurrentLeaveBalanceClass(app) {
  const balance = getCurrentLeaveBalanceValue(app)
  const requiredDays = Number(app?.days)
  if (balance === null || !Number.isFinite(requiredDays) || requiredDays <= 0) return 'text-green-8'
  return balance < requiredDays ? 'text-negative' : 'text-green-8'
}

function isCtoLeaveApplication(app) {
  if (!app || isCocApplication(app)) return false

  const normalizedLabel = normalizeLeaveBalanceLookupKey(
    getCurrentLeaveTypeLabel(app) || app?.leaveType || app?.leave_type_name || '',
  )

  return normalizedLabel === normalizeLeaveBalanceLookupKey('CTO Leave')
}

function roundCtoHours(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue) || numericValue < 0) return null
  return Math.round(numericValue * 100) / 100
}

function resolveCtoHoursFromDays(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue) || numericValue < 0) return null
  return roundCtoHours(numericValue * ctoStandardDayHours)
}

function getApplicationCtoRequiredHoursValue(app) {
  if (!isCtoLeaveApplication(app)) return null

  const directCandidates = [
    app?.cto_deducted_hours,
    app?.ctoDeductedHours,
    app?.required_cto_balance_hours,
    app?.requiredCtoBalanceHours,
  ]

  for (const candidate of directCandidates) {
    const resolvedHours = roundCtoHours(candidate)
    if (resolvedHours !== null) return resolvedHours
  }

  const dayCandidates = [
    app?.deductible_days,
    app?.deductibleDays,
    app?.requested_total_days,
    app?.actual_total_days,
    app?.display_total_days,
    app?.days,
    app?.total_days,
  ]

  for (const candidate of dayCandidates) {
    const resolvedHours = resolveCtoHoursFromDays(candidate)
    if (resolvedHours !== null) return resolvedHours
  }

  return null
}

function getApplicationCtoRequiredHoursDisplay(app) {
  const requiredHours = getApplicationCtoRequiredHoursValue(app)
  return requiredHours !== null ? `${formatDayValue(requiredHours)} hour(s)` : 'N/A'
}

function getCurrentCtoAvailableHoursValue(app) {
  if (!isCtoLeaveApplication(app)) return null

  const entry =
    findLeaveBalanceEntry(app, getCurrentLeaveTypeId(app), getCurrentLeaveTypeLabel(app)) ||
    findLeaveBalanceEntry(app, null, 'CTO Leave')

  const directHourCandidates = [
    entry?.balanceHours,
    entry?.balance_hours,
    app?.available_balance_hours,
    app?.availableBalanceHours,
    app?.balance_hours,
    app?.balanceHours,
  ]

  for (const candidate of directHourCandidates) {
    const resolvedHours = roundCtoHours(candidate)
    if (resolvedHours !== null) return resolvedHours
  }

  const balanceValue = getCurrentLeaveBalanceValue(app)
  return resolveCtoHoursFromDays(balanceValue)
}

function getCurrentCtoAvailableHoursDisplay(app) {
  const availableHours = getCurrentCtoAvailableHoursValue(app)
  return availableHours !== null ? `${formatDayValue(availableHours)} hour(s)` : 'N/A'
}

function getCtoDeductedHoursDisplay(app) {
  if (!isCtoLeaveApplication(app)) return 'N/A'

  const rawStatus = String(app?.rawStatus || app?.raw_status || '').trim().toUpperCase()
  if (rawStatus !== 'APPROVED' && rawStatus !== 'RECALLED') {
    return 'Pending approval'
  }

  return getApplicationCtoRequiredHoursDisplay(app)
}

function getPendingUpdateInclusiveDateLines(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || payload.is_monetization) return []

  const requestedDateSet = resolveDateSetFromSource(payload)
  if (!requestedDateSet.length) return []

  const groupedRequestedDates = formatGroupedInclusiveDateLines(requestedDateSet)
  return groupedRequestedDates.length ? groupedRequestedDates : requestedDateSet
}

function hasPendingDateUpdate(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || typeof payload !== 'object' || payload.is_monetization) return false

  const currentIndicatorRows = getSelectedDatePayStatusRows(app)
  const requestedIndicatorRows = getPendingUpdateDatePayStatusRows(app)
  if (requestedIndicatorRows.length) {
    if (currentIndicatorRows.length !== requestedIndicatorRows.length) return true

    return requestedIndicatorRows.some((requestedRow, index) => {
      const currentRow = currentIndicatorRows[index]
      if (!currentRow) return true

      return (
        requestedRow.dateKey !== currentRow.dateKey ||
        requestedRow.coverageLabel !== currentRow.coverageLabel ||
        requestedRow.payStatus !== currentRow.payStatus
      )
    })
  }

  const currentDateSet = resolveDateSetFromSource(app)
  const requestedDateSet = resolveDateSetFromSource(payload)
  if (!requestedDateSet.length) return false
  if (!currentDateSet.length) return true
  if (currentDateSet.length !== requestedDateSet.length) return true

  return requestedDateSet.some((date, index) => date !== currentDateSet[index])
}

function resolveRequestedDurationSnapshot(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || typeof payload !== 'object') return null

  const explicitUnit = normalizeDurationUnit(payload?.duration_unit)
  const explicitValue = Number(payload?.duration_value)
  if (explicitUnit && Number.isFinite(explicitValue)) {
    return { value: explicitValue, unit: explicitUnit }
  }

  const fallbackUnit = normalizeDurationUnit(app?.duration_unit) || (isCocApplication(app) ? 'hour' : 'day')
  const rawValue = Number(payload?.total_days ?? payload?.days)
  if (Number.isFinite(rawValue)) {
    return { value: rawValue, unit: fallbackUnit }
  }

  if (!payload?.is_monetization) {
    const dateSet = resolveDateSetFromSource(payload)
    if (dateSet.length > 0) return { value: dateSet.length, unit: 'day' }
  }

  return null
}

function getRequestedDurationDisplay(app) {
  const snapshot = resolveRequestedDurationSnapshot(app)
  if (!snapshot) return getApplicationDurationDisplay(app)
  return formatDurationDisplay(snapshot.value, snapshot.unit)
}

function hasPendingDurationUpdate(app) {
  const snapshot = resolveRequestedDurationSnapshot(app)
  if (!snapshot) return false
  return getRequestedDurationDisplay(app) !== getApplicationDurationDisplay(app)
}


function getRequestedReasonValue(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || typeof payload !== 'object') return ''
  return String(payload?.reason ?? payload?.reason_purpose ?? '').trim()
}

function normalizeReasonForCompare(value) {
  return String(value || '').trim()
}

function getCurrentReasonDisplay(app) {
  const currentReason = normalizeReasonForCompare(app?.reason)
  return currentReason || 'N/A'
}

function getRequestedReasonDisplay(app) {
  const requestedReason = normalizeReasonForCompare(getRequestedReasonValue(app))
  return requestedReason || 'N/A'
}

function hasPendingReasonUpdate(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || typeof payload !== 'object') return false

  const hasReasonField =
    Object.prototype.hasOwnProperty.call(payload, 'reason') ||
    Object.prototype.hasOwnProperty.call(payload, 'reason_purpose')
  if (!hasReasonField) return false

  const currentReason = normalizeReasonForCompare(app?.reason)
  const requestedReason = normalizeReasonForCompare(getRequestedReasonValue(app))
  return currentReason !== requestedReason
}

function getApplicationInclusiveDateLines(app) {
  if (!app) return ['N/A']

  if (app.is_monetization) {
    return [`${formatDayValue(app.days)} day(s)`]
  }

  const dateSet = getVisibleDateSetForDisplay(app)
  if (dateSet.length > 0) {
    const groupedDates = formatGroupedInclusiveDateLines(dateSet)
    if (groupedDates.length > 0) return groupedDates
  }

  const start = app.startDate ? formatDate(app.startDate) : 'N/A'
  const end = app.endDate ? formatDate(app.endDate) : 'N/A'
  return [`${start} - ${end}`]
}

function getApplicationInclusiveDateColumnLines(app) {
  return getApplicationInclusiveDateLines(app).map((line) =>
    String(line || '').replace(/\s+\(Recalled\)/gi, ''),
  )
}

function getApplicationDurationLabel(app) {
  return getApplicationInclusiveDateLines(app).join(' ')
}

function getApplicationStatusLabel(app) {
  if (app?.displayStatus) return app.displayStatus
  if (app?.status) return app.status
  return mergeStatus(app)
}

function getApplicationStatusPriority(app) {
  const groupedRawStatus = String(
    app?.group_raw_status || app?.rawStatus || app?.raw_status || '',
  ).toUpperCase()
  if (groupedRawStatus === 'PENDING_ADMIN' && isPendingEditRequest(app)) return 1
  if (groupedRawStatus === 'PENDING_ADMIN' || groupedRawStatus === 'PENDING_HR') return 0
  if (groupedRawStatus === 'APPROVED') return 1
  if (groupedRawStatus === 'RECALLED') return 2
  if (groupedRawStatus === 'REJECTED') return 3

  const status = String(getApplicationStatusLabel(app) || '').toLowerCase()
  if (status.includes('pending')) return 0
  if (status.includes('approved')) return 1
  if (status.includes('recalled')) return 2
  if (status.includes('rejected') || status.includes('disapproved')) return 3
  return 4
}

function compareApplicationsForTable(a, b) {
  const statusPriorityDiff = getApplicationStatusPriority(a) - getApplicationStatusPriority(b)
  if (statusPriorityDiff !== 0) return statusPriorityDiff

  const dateA = Date.parse(a?.dateFiled || '') || 0
  const dateB = Date.parse(b?.dateFiled || '') || 0
  if (dateA !== dateB) return dateB - dateA

  const idA = Number(a?.id) || 0
  const idB = Number(b?.id) || 0
  if (idB !== idA) return idB - idA

  const variantA = a?.application_row_variant === 'recalled' ? 1 : 0
  const variantB = b?.application_row_variant === 'recalled' ? 1 : 0
  if (variantA !== variantB) return variantA - variantB

  const keyA = String(a?.application_uid || '')
  const keyB = String(b?.application_uid || '')
  return keyB.localeCompare(keyA)
}

function getDateSearchValues(dateValue) {
  if (!dateValue) return []
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return [String(dateValue)]

  const monthLong = date.toLocaleDateString('en-US', { month: 'long' })
  const monthShort = date.toLocaleDateString('en-US', { month: 'short' })
  const day = date.getDate()
  const year = date.getFullYear()

  return [
    monthLong,
    monthShort,
    `${monthLong} ${day}`,
    `${monthLong} ${day} ${year}`,
    `${monthShort} ${day}`,
    `${monthShort} ${day} ${year}`,
    `day ${day}`,
    String(day),
    String(year),
  ]
}

function getApplicationSearchTokenSet(app) {
  const dateTerms = getDateSearchValues(app?.dateFiled)
  const inclusiveDateTerms = getApplicationInclusiveDateLines(app)

  const searchValues = [
    'application',
    app?.id,
    app?.rawStatus,
    app?.status,
    getApplicationStatusLabel(app),
    app?.leaveType,
    app?.employeeName,
    app?.firstname,
    app?.middlename,
    app?.surname,
    app?.employee_control_no,
    app?.office,
    app?.officeShort,
    app?.days,
    formatDayValue(app?.days),
    getApplicationDurationDisplay(app),
    ...inclusiveDateTerms,
    ...dateTerms,
  ]

  return searchValues
    .map((value) => normalizeSearchText(value))
    .filter(Boolean)
    .join(' ')
}

const applicationsForTable = computed(() => {
  const queryTokens = getSearchTokens(statusSearch.value)
  const rows = applications.value.filter((app) => {
    const rawStatus = getApplicationRawStatusKey(app)
    const shouldHidePendingAdmin = rawStatus === 'PENDING_ADMIN' && !isPendingEditRequest(app)
    if (shouldHidePendingAdmin) return false
    return matchesEmploymentTypeFilter(app)
  })
  if (!queryTokens.length) return [...rows].sort(compareApplicationsForTable)

  const filteredRows = rows.filter((app) => {
    const searchText = getApplicationSearchTokenSet(app)
    return queryTokens.every((token) => searchText.includes(token))
  })

  return filteredRows.sort(compareApplicationsForTable)
})

const columns = [
  { name: 'employee', label: 'Employee', align: 'left' },
  {
    name: 'office',
    label: 'Department',
    field: (row) => row.officeShort || row.office,
    align: 'left',
  },
  {
    name: 'leaveType',
    label: 'Leave Type',
    field: (row) => (row.is_monetization ? `${row.leaveType} (Monetization)` : row.leaveType),
    align: 'left',
  },
  {
    name: 'dateFiled',
    label: 'Date Filed',
    field: (row) => (row.dateFiled ? formatDate(row.dateFiled) : 'N/A'),
    align: 'left',
  },
  {
    name: 'inclusiveDates',
    label: 'Inclusive Dates',
    field: (row) => (row?.is_monetization ? 'N/A' : getApplicationDurationLabel(row)),
    align: 'left',
  },
  {
    name: 'days',
    label: 'Duration',
    field: (row) => (row?.is_monetization ? 'N/A' : getApplicationDurationDisplay(row)),
    align: 'left',
  },
  { name: 'status', label: 'Status', align: 'left' },
  { name: 'actions', label: 'Actions', align: 'center' },
]
const mobileApplicationColumnWidths = {
  employee: {
    style: 'min-width: 230px',
    headerStyle: 'min-width: 230px',
  },
  status: {
    style: 'min-width: 120px',
    headerStyle: 'min-width: 120px',
  },
  office: {
    style: 'min-width: 120px',
    headerStyle: 'min-width: 120px',
  },
  leaveType: {
    style: 'min-width: 145px',
    headerStyle: 'min-width: 145px',
  },
}
const applicationTableColumns = computed(() => {
  if (!q.screen.lt.sm) return columns

  return ['employee', 'status', 'office', 'leaveType']
    .map((name) => {
      const column = columns.find((candidate) => candidate.name === name)
      if (!column) return null

      const mobileWidth = mobileApplicationColumnWidths[name]
      return mobileWidth ? { ...column, ...mobileWidth } : column
    })
    .filter(Boolean)
})

const showTimelineDialog = ref(false)
const showDetailsDialog = ref(false)
const showEditDialog = ref(false)
const showRejectDialog = ref(false)
const showRecallDialog = ref(false)
const showConfirmActionDialog = ref(false)
const selectedApp = ref(null)
const editTargetApp = ref(null)
const rejectTargetApp = ref(null)
const recallTargetApp = ref(null)
const confirmActionType = ref('approve')
const confirmActionTarget = ref(null)
const showApplicationEditAction = false
const recallDialogApplication = computed(() => recallTargetApp.value || selectedApp.value)

function canEditApplication(app) {
  return getApplicationRawStatusKey(app) === 'PENDING_HR' && !isCocApplication(app)
}

function getApplicationLeaveTypeName(app) {
  return String(app?.leaveType || '')
    .trim()
    .toLowerCase()
}

function isRecallableLeaveApplication(app) {
  if (!app) return false
  if (app?.is_monetization === true) return false

  const leaveTypeName = getApplicationLeaveTypeName(app)

  return leaveTypeName === 'mandatory / forced leave' || leaveTypeName === 'vacation leave'
}

function canRecallApplication(app) {
  if (!app || isCocApplication(app)) return false
  return (
    getApplicationRawStatusKey(app) === 'APPROVED' &&
    getRemainingRecallableDateKeys(app).length > 0 &&
    isRecallableLeaveApplication(app)
  )
}

function getRecallDateOptions(app) {
  return [...new Set(getRemainingRecallableDateKeys(app))].sort()
}

function toIsoDate(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const normalized = raw.replace(/\//g, '-')
  const isoMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoMatch) return isoMatch[1]

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function fetchApplications() {
  loading.value = true
  try {
    const [dashboardResponse, leaveApplicationsResponse, cocApplicationsResponse] =
      await Promise.all([
        api.get('/hr/dashboard'),
        api.get('/hr/leave-applications').catch(() => null),
        api.get('/hr/coc-applications').catch(() => null),
      ])

    const dashboardData = dashboardResponse?.data ?? {}
    const mergedApplications = expandApplicationsForDisplay(
      mergeApplications(
        normalizeBackendApplications(extractApplicationsFromPayload(dashboardData)),
        normalizeBackendApplications(extractApplicationsFromPayload(leaveApplicationsResponse?.data)),
        normalizeBackendApplications(extractApplicationsFromPayload(cocApplicationsResponse?.data)),
      ),
    )

    applications.value = normalizeBackendApplications(mergedApplications).map((app, index) => {
      const normalized = normalizeBackendApplicationShape(app, index) || app
      return {
        ...normalized,
        application_type: getApplicationType(normalized),
        application_uid: normalized?.application_uid || getApplicationRowKey(normalized, index),
        employeeName: normalized?.employeeName || 'Unknown',
        officeShort: toDepartmentCode(normalized?.office),
        displayStatus: mergeStatus(normalized),
      }
    })
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load applications right now.')
    q.notify({
      type: 'negative',
      message: msg,
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}

onMounted(fetchApplications)

watch(
  () => route.query.status,
  (value) => {
    const normalized = String(value || '').toLowerCase()
    statusSearch.value = searchableStatusValues.has(normalized) ? normalized : ''
  },
  { immediate: true },
)

watch(
  () => route.query.employment_type,
  (value) => {
    employmentTypeFilter.value = normalizeEmploymentTypeKey(value)
  },
  { immediate: true },
)

watch([statusSearch, employmentTypeFilter], () => {
  tablePagination.value.page = 1
})

watch(showEditDialog, (isOpen) => {
  if (isOpen) return
  editTargetApp.value = null
})

watch(showRejectDialog, (isOpen) => {
  if (isOpen) return
  rejectTargetApp.value = null
})

watch(showRecallDialog, (isOpen) => {
  if (isOpen) return
  recallTargetApp.value = null
})

watch(showConfirmActionDialog, (isOpen) => {
  if (isOpen) return
  confirmActionType.value = 'approve'
  confirmActionTarget.value = null
})

function clearEmploymentTypeFilter() {
  const nextQuery = { ...route.query }
  delete nextQuery.employment_type
  router.replace({ query: nextQuery })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatRecallDateLabel(dateStr) {
  const isoDate = toIsoDate(dateStr)
  const parsedDate = isoDate ? new Date(`${isoDate}T00:00:00`) : new Date(dateStr)
  if (Number.isNaN(parsedDate.getTime())) return String(dateStr || '')

  return parsedDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
function formatDateTime(dateStr) {
  if (!dateStr) return ''

  const rawValue = String(dateStr).trim()
  if (!rawValue) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return formatDate(rawValue)
  }

  const parsedDate = parseDateTimeValue(rawValue)
  if (Number.isNaN(parsedDate.getTime())) return ''

  if (!hasExplicitTimeComponent(rawValue)) {
    return parsedDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return parsedDate.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function parseDateTimeValue(value) {
  if (value instanceof Date) return value

  const rawValue = String(value || '').trim()
  if (!rawValue) return new Date('')

  const candidates = [
    rawValue,
    rawValue.replace(' ', 'T'),
    rawValue.replace(/\//g, '-'),
    rawValue.replace(/\//g, '-').replace(' ', 'T'),
  ]

  for (const candidate of candidates) {
    const parsed = new Date(candidate)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }

  return new Date('')
}

function toComparableTimestamp(value) {
  const parsedDate = parseDateTimeValue(value)
  const timestamp = parsedDate.getTime()
  return Number.isNaN(timestamp) ? Number.NaN : timestamp
}

function isTimestampOnOrAfter(value, reference) {
  if (!value) return false
  if (!reference) return true

  const valueTimestamp = toComparableTimestamp(value)
  const referenceTimestamp = toComparableTimestamp(reference)
  if (Number.isNaN(valueTimestamp) || Number.isNaN(referenceTimestamp)) return false
  return valueTimestamp >= referenceTimestamp
}

function pickLatestTimestampValue(...values) {
  let latestValue = null
  let latestTimestamp = Number.NEGATIVE_INFINITY
  let firstNonEmptyValue = null

  values.forEach((value) => {
    if (value === null || value === undefined) return
    const normalized = String(value).trim()
    if (!normalized) return

    if (!firstNonEmptyValue) firstNonEmptyValue = value

    const timestamp = toComparableTimestamp(value)
    if (Number.isNaN(timestamp)) return
    if (timestamp <= latestTimestamp) return

    latestTimestamp = timestamp
    latestValue = value
  })

  return latestValue ?? firstNonEmptyValue
}

function hasExplicitTimeComponent(value) {
  return /\d{1,2}:\d{2}/.test(String(value || ''))
}

function isCancelledByUser(app) {
  const remarksText = String(app?.remarks || '').trim()
  return /^cancelled\b/i.test(remarksText)
}

function getApplicationRawStatusKey(app) {
  const candidates = [app?.group_raw_status, app?.rawStatus, app?.raw_status]

  for (const candidate of candidates) {
    const normalized = String(candidate || '')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_')

    if (normalized) return normalized
  }

  return ''
}

function getApplicationStatusColor(app) {
  const rawStatus = getApplicationRawStatusKey(app)
  if (isCancelledByUser(app)) return 'grey-7'
  if (rawStatus === 'PENDING_ADMIN') return 'warning'
  if (rawStatus === 'PENDING_HR') return 'blue-6'
  if (rawStatus === 'APPROVED') return 'green'
  if (rawStatus === 'RECALLED') return 'blue-grey-6'
  if (rawStatus === 'REJECTED') return 'negative'
  return 'grey-6'
}

function resolveFiledByActor(app) {
  return app?.filed_by || app?.employeeName || 'Unknown'
}

function resolveFiledDateValue(app) {
  return (
    app?.filed_at ||
    app?.created_at ||
    app?.submitted_at ||
    app?.dateFiled ||
    null
  )
}

function resolveDepartmentAdminActor(app) {
  const historyEntry = resolveDepartmentAdminHistoryEntry(app)
  return (
    app?.admin_action_by ||
    resolveStatusHistoryActor(historyEntry) ||
    'Unknown'
  )
}

function resolveDepartmentAdminActionDateValue(app) {
  const directValue = app?.admin_action_at
  if (directValue) return directValue

  const historyEntry = resolveDepartmentAdminHistoryEntry(app)
  return resolveStatusHistoryTimestamp(historyEntry)
}

function resolveHrActor(app) {
  const historyEntry = resolveHrApprovalHistoryEntry(app)
  return (
    app?.hr_action_by ||
    resolveStatusHistoryActor(historyEntry) ||
    'Unknown'
  )
}

function resolveFinalApprovalDateValue(app) {
  const directValue =
    app?.hr_action_at ||
    app?.reviewed_at
  if (directValue) return directValue

  const historyEntry = resolveHrApprovalHistoryEntry(app)
  return resolveStatusHistoryTimestamp(historyEntry)
}

function getStatusHistoryEntries(app) {
  const candidates = [app?.status_history]

  for (const candidate of candidates) {
    if (!candidate) continue
    if (Array.isArray(candidate)) return candidate

    if (typeof candidate === 'string') {
      const trimmed = candidate.trim()
      if (!trimmed) continue
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) return parsed
      } catch {
        // no-op
      }
    }
  }

  return []
}

function normalizeStatusHistoryToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function normalizeStatusHistoryActionToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
}

function pickFirstDefinedValue(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue
    if (typeof value === 'string' && value.trim() === '') continue
    return value
  }
  return null
}

function resolveStatusHistoryActor(entry) {
  if (!entry || typeof entry !== 'object') return ''
  return (
    entry?.actor_name ||
    entry?.action_by_name ||
    entry?.action_by ||
    ''
  )
}

function resolveStatusHistoryTimestamp(entry) {
  if (!entry || typeof entry !== 'object') return null
  return (
    entry?.created_at ||
    entry?.updated_at ||
    null
  )
}

function findStatusHistoryEntry(app, matcher) {
  return getStatusHistoryEntries(app).find((entry) => matcher(entry || {})) || null
}

function findLatestStatusHistoryEntry(app, matcher) {
  const entries = getStatusHistoryEntries(app)
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index] || {}
    if (matcher(entry)) return entry
  }
  return null
}

function hasEditRequestSignal(app) {
  if (!app || typeof app !== 'object') return false
  if (getLatestUpdateRequestStatus(app)) return true
  if (getLeaveRequestActionType(app)) return true
  if (isEditUpdateRequest(app)) return true
  if (getPendingUpdatePayload(app)) return true

  const remarksSignal = normalizeStatusHistoryToken(app?.remarks || '')
  if (
    remarksSignal.includes('edit request') ||
    remarksSignal.includes('request update') ||
    remarksSignal.includes('cancel request') ||
    remarksSignal.includes('cancellation request')
  ) {
    return true
  }

  return getStatusHistoryEntries(app).some((entry) => {
    const actionToken = normalizeStatusHistoryActionToken(entry?.action)
    const stageToken = normalizeStatusHistoryToken(entry?.stage)
    const historyRemarksToken = normalizeStatusHistoryToken(entry?.remarks)

    return (
      actionToken.includes('EDIT') ||
      actionToken.includes('UPDATE_REQUEST') ||
      actionToken.includes('REQUEST_CANCEL') ||
      actionToken.includes('CANCELLATION_REQUEST') ||
      stageToken.includes('edit request') ||
      stageToken.includes('request update') ||
      stageToken.includes('cancel request') ||
      stageToken.includes('cancellation request') ||
      historyRemarksToken.includes('edit request') ||
      historyRemarksToken.includes('request update') ||
      historyRemarksToken.includes('cancel request') ||
      historyRemarksToken.includes('cancellation request')
    )
  })
}

function resolveEditRequestSubmittedHistoryEntry(app) {
  const requestActionType = getLeaveRequestActionType(app)

  return findLatestStatusHistoryEntry(app, (entry) => {
    const actionToken = normalizeStatusHistoryActionToken(entry?.action)
    const stageToken = normalizeStatusHistoryToken(entry?.stage)
    const remarksToken = normalizeStatusHistoryToken(entry?.remarks)

    const updateSubmittedActions = [
      'REQUEST_UPDATE',
      'UPDATE_REQUESTED',
      'EDIT_REQUEST_SUBMITTED',
      'REQUESTED_UPDATE',
      'EDIT_REQUESTED',
    ]
    const cancelSubmittedActions = [
      'REQUEST_CANCEL',
      'CANCEL_REQUESTED',
      'CANCELLATION_REQUEST_SUBMITTED',
      'REQUESTED_CANCELLATION',
      'REQUEST_CANCELLATION',
    ]

    if (requestActionType === REQUEST_ACTION_CANCEL && cancelSubmittedActions.includes(actionToken)) {
      return true
    }

    if (requestActionType !== REQUEST_ACTION_CANCEL && updateSubmittedActions.includes(actionToken)) {
      return true
    }

    if (
      stageToken.includes('edit request submitted') ||
      stageToken.includes('edit requested') ||
      stageToken.includes('cancel request submitted') ||
      stageToken.includes('cancellation request submitted') ||
      stageToken.includes('cancellation requested')
    ) {
      return true
    }

    const hasUpdateKeyword =
      remarksToken.includes('edit request') || remarksToken.includes('request update')
    const hasCancelKeyword =
      remarksToken.includes('cancel request') || remarksToken.includes('cancellation request')

    if (requestActionType === REQUEST_ACTION_CANCEL && !hasCancelKeyword) {
      return false
    }

    if (requestActionType !== REQUEST_ACTION_CANCEL && !hasUpdateKeyword && !hasCancelKeyword) {
      return false
    }

    return (
      actionToken === '' ||
      actionToken.includes('REQUEST') ||
      actionToken.includes('SUBMIT') ||
      actionToken.includes('EDIT') ||
      actionToken.includes('CANCEL')
    )
  })
}

function resolveEditRequestDecisionHistoryEntry(app, decision = 'APPROVED') {
  const requestActionType = getLeaveRequestActionType(app)

  return findLatestStatusHistoryEntry(app, (entry) => {
    const actionToken = normalizeStatusHistoryActionToken(entry?.action)
    const stageToken = normalizeStatusHistoryToken(entry?.stage)
    const remarksToken = normalizeStatusHistoryToken(entry?.remarks)

    const targetDecision = String(decision || '').toUpperCase()
    const explicitApprovedSignal =
      ['EDIT_REQUEST_APPROVED', 'UPDATE_REQUEST_APPROVED', 'CANCELLATION_REQUEST_APPROVED', 'CANCEL_REQUEST_APPROVED']
        .includes(actionToken) ||
      stageToken.includes('edit request approved') ||
      stageToken.includes('cancellation request approved') ||
      stageToken.includes('cancel request approved')
    const explicitRejectedSignal =
      ['EDIT_REQUEST_REJECTED', 'UPDATE_REQUEST_REJECTED', 'CANCELLATION_REQUEST_REJECTED', 'CANCEL_REQUEST_REJECTED']
        .includes(actionToken) ||
      stageToken.includes('edit request rejected') ||
      stageToken.includes('cancellation request rejected') ||
      stageToken.includes('cancel request rejected')

    if (targetDecision === 'APPROVED' && explicitApprovedSignal) return true
    if (targetDecision === 'REJECTED' && explicitRejectedSignal) return true

    const expectedHrAction = targetDecision === 'REJECTED' ? 'HR_REJECTED' : 'HR_APPROVED'
    if (actionToken !== expectedHrAction) return false

    const updateRequestSignal =
      stageToken.includes('edit request') ||
      stageToken.includes('request update') ||
      remarksToken.includes('edit request') ||
      remarksToken.includes('request update')
    const cancelRequestSignal =
      stageToken.includes('cancel request') ||
      stageToken.includes('cancellation request') ||
      remarksToken.includes('cancel request') ||
      remarksToken.includes('cancellation request')

    if (requestActionType === REQUEST_ACTION_CANCEL) return cancelRequestSignal
    return updateRequestSignal || cancelRequestSignal
  })
}

function resolveEditRequestSubmittedMeta(app) {
  const submittedHistoryEntry = resolveEditRequestSubmittedHistoryEntry(app)
  const pendingPayload = getPendingUpdatePayload(app)

  const submittedAt = pickFirstDefinedValue(
    app?.latest_update_requested_at,
    resolveStatusHistoryTimestamp(submittedHistoryEntry),
  )
  const submittedBy = String(resolveFiledByActor(app) || 'Unknown').trim() || 'Unknown'

  const submittedReason = String(
    pickFirstDefinedValue(
      app?.latest_update_request_reason,
      getPendingUpdateReason(app),
      pendingPayload?.edit_reason,
      pendingPayload?.update_reason,
      pendingPayload?.reason_purpose,
      pendingPayload?.reason,
      pendingPayload?.remarks,
      submittedHistoryEntry?.remarks,
      '',
    ) || '',
  ).trim()

  return {
    submittedAt,
    submittedBy,
    submittedReason,
  }
}

function resolveEditRequestApprovalMeta(app) {
  const latestStatus = getLatestUpdateRequestStatus(app)
  if (latestStatus !== 'APPROVED') return null

  const decisionHistoryEntry = resolveEditRequestDecisionHistoryEntry(app, 'APPROVED')

  const reviewedAt = pickFirstDefinedValue(
    app?.latest_update_reviewed_at,
    resolveStatusHistoryTimestamp(decisionHistoryEntry),
    resolveFinalApprovalDateValue(app),
  )
  const reviewedBy = String(
    pickFirstDefinedValue(
      app?.latest_update_reviewed_by,
      resolveStatusHistoryActor(decisionHistoryEntry),
      resolveHrActor(app),
      'Unknown',
    ) || 'Unknown',
  ).trim() || 'Unknown'

  return {
    reviewedAt,
    reviewedBy,
  }
}

function resolveEditRequestRejectionMeta(app) {
  const latestStatus = getLatestUpdateRequestStatus(app)
  if (latestStatus !== 'REJECTED') return null

  const decisionHistoryEntry = resolveEditRequestDecisionHistoryEntry(app, 'REJECTED')

  const reviewedAt = pickFirstDefinedValue(
    app?.latest_update_reviewed_at,
    resolveStatusHistoryTimestamp(decisionHistoryEntry),
    resolveDisapprovedDateValue(app),
  )
  const reviewedBy = String(
    pickFirstDefinedValue(
      app?.latest_update_reviewed_by,
      resolveStatusHistoryActor(decisionHistoryEntry),
      resolveDisapprovalActor(app),
      'Unknown',
    ) || 'Unknown',
  ).trim() || 'Unknown'
  const reviewRemarks = String(
    pickFirstDefinedValue(
      app?.latest_update_review_remarks,
      decisionHistoryEntry?.remarks,
      app?.remarks,
      '',
    ) || '',
  ).trim()

  return {
    reviewedAt,
    reviewedBy,
    reviewRemarks,
  }
}

function getPreEditHrApprovalTimelineEntry(app) {
  if (!hasEditRequestSignal(app)) return null

  const approvedAt = formatDateTime(resolveFinalApprovalDateValue(app))
  const approvedBy = resolveHrActor(app)
  if (!approvedAt && approvedBy === 'Unknown') return null

  const requestLabel = isCancellationRequestAction(app) ? 'cancellation request' : 'edit request'

  return {
    title: 'Approved by HR',
    subtitle: approvedAt || 'Completed',
    description: 'Application was approved before the ' + requestLabel + '.',
    icon: 'task_alt',
    color: 'positive',
    actor: approvedBy,
  }
}

function getEditRequestTimelineTerminology(app) {
  const isCancelRequest = isCancellationRequestAction(app)

  return {
    submittedTitle: isCancelRequest ? 'Cancellation Request Submitted' : 'Edit Request Submitted',
    pendingAdminTitle: isCancelRequest
      ? 'Pending Cancellation Review (Admin)'
      : 'Pending Edit Review (Admin)',
    adminApprovedTitle: isCancelRequest
      ? 'Cancellation Request Approved by Admin'
      : 'Edit Request Approved by Admin',
    approvedTitle: isCancelRequest ? 'Cancellation Request Approved' : 'Edit Request Approved',
    rejectedTitle: isCancelRequest ? 'Cancellation Request Rejected' : 'Edit Request Rejected',
    pendingHrTitle: isCancelRequest
      ? 'Pending Cancellation Review (HR)'
      : 'Pending Edit Review (HR)',
    submittedFallback: isCancelRequest
      ? 'Employee requested cancellation for this approved application.'
      : 'Employee requested edits to this application.',
    pendingAdminDescription: isCancelRequest
      ? 'Waiting for department admin review of the cancellation request.'
      : 'Waiting for department admin review of the edit request.',
    adminApprovedDescription: isCancelRequest
      ? 'Department admin completed the cancellation-request review.'
      : 'Department admin completed the edit-request review.',
    approvedDescription: isCancelRequest
      ? 'Requested cancellation was reviewed and approved.'
      : 'Requested edits were reviewed and approved.',
    rejectedDescription: isCancelRequest
      ? 'Requested cancellation was reviewed and rejected.'
      : 'Requested edits were reviewed and rejected.',
    pendingHrDescription: isCancelRequest
      ? 'Waiting for HR final review of the cancellation request.'
      : 'Waiting for HR final review of the edit request.',
    submittedIcon: isCancelRequest ? 'event_busy' : 'edit_note',
  }
}

function getEditRequestTimelineEntries(app) {
  if (!hasEditRequestSignal(app)) return []

  const terminology = getEditRequestTimelineTerminology(app)
  const entries = []
  const submittedMeta = resolveEditRequestSubmittedMeta(app)
  const latestUpdateStatus = getLatestUpdateRequestStatus(app)
  const approvalMeta = resolveEditRequestApprovalMeta(app)
  const rejectionMeta = resolveEditRequestRejectionMeta(app)
  const resolvedStatus = approvalMeta
    ? 'APPROVED'
    : rejectionMeta
      ? 'REJECTED'
      : latestUpdateStatus || 'PENDING'
  const rawStatus = getApplicationRawStatusKey(app)
  const isAdminReviewPending = resolvedStatus === 'PENDING' && rawStatus === 'PENDING_ADMIN'
  const isHrReviewPending = resolvedStatus === 'PENDING' && rawStatus === 'PENDING_HR'

  entries.push({
    title: terminology.submittedTitle,
    subtitle: formatDateTime(submittedMeta.submittedAt) || 'Submitted',
    description: submittedMeta.submittedReason
      ? 'Reason: ' + submittedMeta.submittedReason
      : terminology.submittedFallback,
    icon: terminology.submittedIcon,
    color: 'positive',
    actor: submittedMeta.submittedBy,
  })

  if (isAdminReviewPending) {
    entries.push({
      title: terminology.pendingAdminTitle,
      subtitle: 'Current stage',
      description: terminology.pendingAdminDescription,
      icon: 'pending_actions',
      color: 'warning',
    })
  } else {
    entries.push({
      title: terminology.adminApprovedTitle,
      subtitle: formatDateTime(resolveDepartmentAdminActionDateValue(app)) || 'Completed',
      description: terminology.adminApprovedDescription,
      icon: 'check_circle',
      color: 'positive',
      actor: resolveDepartmentAdminActor(app),
    })
  }

  if (approvalMeta) {
    entries.push({
      title: terminology.approvedTitle,
      subtitle: formatDateTime(approvalMeta.reviewedAt) || 'Reviewed',
      description: terminology.approvedDescription,
      icon: 'task_alt',
      color: 'positive',
      actor: approvalMeta.reviewedBy,
    })
  } else if (rejectionMeta) {
    entries.push({
      title: terminology.rejectedTitle,
      subtitle: formatDateTime(rejectionMeta.reviewedAt) || 'Reviewed',
      description: rejectionMeta.reviewRemarks || terminology.rejectedDescription,
      icon: 'cancel',
      color: 'negative',
      actor: rejectionMeta.reviewedBy,
    })
  } else if (isHrReviewPending) {
    entries.push({
      title: terminology.pendingHrTitle,
      subtitle: 'Current stage',
      description: terminology.pendingHrDescription,
      icon: 'pending_actions',
      color: 'warning',
    })
  } else {
    entries.push({
      title: terminology.pendingHrTitle,
      subtitle: 'Upcoming',
      description: 'This stage starts after department admin review.',
      icon: 'radio_button_unchecked',
      color: 'grey-5',
    })
  }

  return entries
}

function resolveDepartmentAdminHistoryEntry(app) {
  return findLatestStatusHistoryEntry(app, (entry) => {
    const action = normalizeStatusHistoryToken(entry?.action)
    const stage = normalizeStatusHistoryToken(entry?.stage)
    return (
      action.includes('department approved') ||
      action.includes('admin approved') ||
      action.includes('forwarded to hr') ||
      action.includes('pending hr') ||
      stage.includes('department admin review completed') ||
      stage.includes('department approved') ||
      stage.includes('forwarded to hr') ||
      stage.includes('pending hr') ||
      (stage.includes('admin') && stage.includes('approved'))
    )
  })
}

function resolveHrApprovalHistoryEntry(app) {
  return findLatestStatusHistoryEntry(app, (entry) => {
    const action = normalizeStatusHistoryToken(entry?.action)
    const stage = normalizeStatusHistoryToken(entry?.stage)
    return (
      action.includes('hr approved') ||
      action.includes('approved by hr') ||
      action.includes('application approved') ||
      stage.includes('approved by hr') ||
      stage === 'approved' ||
      stage.includes('application approved') ||
      (stage.includes('approved') && stage.includes('hr'))
    )
  })
}

function resolveReceivedHistoryEntry(app) {
  return findLatestStatusHistoryEntry(app, (entry) => {
    const action = String(entry?.action || '')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_')
    return action === 'HR_RECEIVED'
  })
}

function resolveReceivedActor(app) {
  const directActor = String(app?.received_by || app?.receivedBy || app?.hr_received_by || '').trim()
  if (directActor) return directActor

  const historyActor = String(resolveStatusHistoryActor(resolveReceivedHistoryEntry(app)) || '').trim()
  return historyActor || 'Unknown'
}

function resolveReceivedDateValue(app) {
  return pickLatestTimestampValue(
    app?.received_at ||
      null,
    app?.receivedAt || null,
    app?.hr_received_at || null,
    resolveStatusHistoryTimestamp(resolveReceivedHistoryEntry(app)) || null,
  )
}

function resolveCurrentUpdateRequestCycleStartValue(app) {
  if (!hasEditRequestSignal(app)) return null
  const submittedMeta = resolveEditRequestSubmittedMeta(app)
  return pickFirstDefinedValue(
    app?.latest_update_requested_at,
    submittedMeta?.submittedAt,
  )
}

function isApplicationReceivedByHr(app) {
  if (!app) return false

  const receivedAt = resolveReceivedDateValue(app)
  const cycleStart = resolveCurrentUpdateRequestCycleStartValue(app)

  if (cycleStart) {
    if (!receivedAt) return false
    if (!isTimestampOnOrAfter(receivedAt, cycleStart)) return false
  }

  return Boolean(app?.has_hr_received || app?.hasHrReceived || resolveReceivedHistoryEntry(app) || receivedAt)
}

function canReceiveApplication(app) {
  if (!app || isCocApplication(app)) return false
  if (isApplicationReceivedByHr(app)) return false
  if (isCancelledByUser(app)) return false

  const rawStatus = getApplicationRawStatusKey(app)
  return rawStatus === 'PENDING_HR'
}

function getReceivedByHrSummary(app) {
  if (!isApplicationReceivedByHr(app)) return ''

  const receivedBy = String(resolveReceivedActor(app) || '').trim()
  const receivedAt = formatDateTime(resolveReceivedDateValue(app))
  if (receivedBy && receivedBy !== 'Unknown' && receivedAt) {
    return `Received by ${receivedBy} on ${receivedAt}`
  }
  if (receivedAt) return `Received on ${receivedAt}`
  if (receivedBy && receivedBy !== 'Unknown') return `Received by ${receivedBy}`
  return 'Application already received by HR.'
}

function getReceivedApplicationTimelineEntry(app) {
  if (!isApplicationReceivedByHr(app)) return null

  const receivedAt = formatDateTime(resolveReceivedDateValue(app)) || 'Completed'
  const receivedBy = resolveReceivedActor(app)

  return {
    title: 'Received Application',
    subtitle: receivedAt,
    description: 'HR confirmed receipt of the hard copy leave application form.',
    icon: 'inventory_2',
    color: 'positive',
    actor: receivedBy,
  }
}

function resolveReleasedHistoryEntry(app) {
  return findLatestStatusHistoryEntry(app, (entry) => {
    const action = String(entry?.action || '')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_')
    const stage = String(entry?.stage || '').trim().toLowerCase()
    return action === 'HR_RELEASED' || stage === 'hr released' || stage === 'released application'
  })
}

function resolveReleasedActor(app) {
  const directActor = String(app?.released_by || app?.releasedBy || app?.hr_released_by || '').trim()
  if (directActor) return directActor

  const historyActor = String(resolveStatusHistoryActor(resolveReleasedHistoryEntry(app)) || '').trim()
  return historyActor || 'Unknown'
}

function resolveReleasedDateValue(app) {
  return pickLatestTimestampValue(
    app?.released_at ||
      null,
    app?.releasedAt || null,
    app?.hr_released_at || null,
    resolveStatusHistoryTimestamp(resolveReleasedHistoryEntry(app)) || null,
  )
}

function isApplicationReleased(app) {
  if (!app) return false

  const releasedAt = resolveReleasedDateValue(app)
  const cycleStart = resolveCurrentUpdateRequestCycleStartValue(app)

  if (cycleStart) {
    if (!releasedAt) return false
    if (!isTimestampOnOrAfter(releasedAt, cycleStart)) return false
  }

  return Boolean(app?.has_hr_released || app?.hasHrReleased || resolveReleasedHistoryEntry(app) || releasedAt)
}

function canReleaseApplication(app) {
  if (!app || isCocApplication(app)) return false
  if (isApplicationReleased(app)) return false

  const rawStatus = getApplicationRawStatusKey(app)
  const isCancellationRequestApproved =
    isCancellationRequestAction(app) &&
    getLatestUpdateRequestStatus(app) === 'APPROVED' &&
    rawStatus === 'REJECTED'

  if (isCancelledByUser(app) && !isCancellationRequestApproved) return false

  if (rawStatus === 'APPROVED') return true
  if (isCancellationRequestApproved) return isApplicationReceivedByHr(app)
  return false
}

function shouldUseUpdateReceiveEndpoint(app) {
  if (!app || isCocApplication(app)) return false
  if (getApplicationRawStatusKey(app) !== 'PENDING_HR') return false
  if (getLatestUpdateRequestStatus(app) !== 'PENDING') return false
  return Boolean(resolveCurrentUpdateRequestCycleStartValue(app))
}

function shouldUseUpdateReleaseEndpoint(app) {
  if (!app || isCocApplication(app)) return false
  if (getLatestUpdateRequestStatus(app) !== 'APPROVED') return false

  const rawStatus = getApplicationRawStatusKey(app)
  const allowsRelease =
    rawStatus === 'APPROVED' ||
    (isCancellationRequestAction(app) && rawStatus === 'REJECTED')

  if (!allowsRelease) return false
  return Boolean(resolveCurrentUpdateRequestCycleStartValue(app))
}

function getReleasedByHrSummary(app) {
  if (!isApplicationReleased(app)) return ''

  const releasedBy = String(resolveReleasedActor(app) || '').trim()
  const releasedAt = formatDateTime(resolveReleasedDateValue(app))
  if (releasedBy && releasedBy !== 'Unknown' && releasedAt) {
    return `Released by ${releasedBy} on ${releasedAt}`
  }
  if (releasedAt) return `Released on ${releasedAt}`
  if (releasedBy && releasedBy !== 'Unknown') return `Released by ${releasedBy}`
  return 'Application document already released by HR.'
}

function resolveRecallActor(app) {
  const historyEntry = findStatusHistoryEntry(app, (entry) => {
    const action = String(entry?.action || '').toUpperCase()
    const stage = String(entry?.stage || '').toLowerCase()
    return action === 'HR_RECALLED' || stage === 'hr recalled'
  })

  return (
    app?.recall_action_by ||
    app?.processed_by ||
    historyEntry?.actor_name ||
    historyEntry?.action_by_name ||
    historyEntry?.action_by ||
    'Unknown'
  )
}

function resolveRecallDateValue(app) {
  const historyEntry = findStatusHistoryEntry(app, (entry) => {
    const action = String(entry?.action || '').toUpperCase()
    const stage = String(entry?.stage || '').toLowerCase()
    return action === 'HR_RECALLED' || stage === 'hr recalled'
  })

  return (
    app?.recall_action_at ||
    app?.reviewed_at ||
    resolveStatusHistoryTimestamp(historyEntry) ||
    null
  )
}

function formatRecallRemarks(app) {
  const remarksText = String(app?.remarks || '').trim()
  if (!remarksText) return ''
  return remarksText.replace(/^recalled by hr\b:?\s*/i, '').trim()
}

function resolveCancelledActor(app) {
  return (
    app?.cancelled_by ||
    app?.employeeName ||
    app?.employee_name ||
    'Unknown'
  )
}

function resolveCancelledDateValue(app) {
  return app?.cancelled_at || app?.disapproved_at || null
}

function resolveDisapprovalActor(app) {
  if (isCancelledByUser(app)) return resolveCancelledActor(app)
  return (
    app?.disapproved_by ||
    app?.processed_by ||
    'Unknown'
  )
}

function resolveDisapprovedDateValue(app) {
  return (
    app?.disapproved_at ||
    app?.reviewed_at ||
    null
  )
}

function formatRecentRemarks(app) {
  const remarksText = String(app?.remarks || '').trim()
  if (!remarksText) return ''
  return remarksText.replace(/^cancelled(?:\s+via\s+erms)?\b:?\s*/i, '').trim()
}

function buildApplicationTimeline(app) {
  if (!app) return []

  const rawStatus = getApplicationRawStatusKey(app)
  const hasEditRequest = hasEditRequestSignal(app)
  const preEditHrApprovalEntry = hasEditRequest ? getPreEditHrApprovalTimelineEntry(app) : null
  const editRequestEntries = hasEditRequest ? getEditRequestTimelineEntries(app) : []
  const receivedTimelineEntry = getReceivedApplicationTimelineEntry(app)
  const entries = [
    {
      title: 'Application Filed',
      subtitle:
        formatDateTime(resolveFiledDateValue(app)) ||
        formatDate(app?.dateFiled) ||
        'Date unavailable',
      description: `${app?.employeeName || 'Employee'} submitted this leave request.`,
      icon: 'check_circle',
      color: 'positive',
      actor: resolveFiledByActor(app),
    },
  ]

  if (isCancelledByUser(app)) {
    if (receivedTimelineEntry) {
      entries.push(receivedTimelineEntry)
    }
    entries.push({
      title: 'Application Cancelled',
      subtitle: formatDateTime(resolveCancelledDateValue(app)) || 'Application closed',
      description: formatRecentRemarks(app) || 'Application was cancelled by the requester.',
      icon: 'cancel',
      color: 'negative',
      actor: resolveCancelledActor(app),
    })
    entries.push({
      title: 'Application Closed',
      subtitle: formatDateTime(resolveCancelledDateValue(app)) || 'Completed',
      description: 'Application workflow is complete.',
      icon: 'task_alt',
      color: 'positive',
      actor: resolveCancelledActor(app),
    })
    return entries
  }

  if (rawStatus === 'PENDING_ADMIN') {
    if (hasEditRequest) {
      entries.push({
        title: 'Admin Review Completed',
        subtitle: formatDateTime(resolveDepartmentAdminActionDateValue(app)) || 'Completed',
        description: 'Application was reviewed and forwarded to HR.',
        icon: 'check_circle',
        color: 'positive',
        actor: resolveDepartmentAdminActor(app),
      })
      if (receivedTimelineEntry) {
        entries.push(receivedTimelineEntry)
      }
      if (preEditHrApprovalEntry) {
        entries.push(preEditHrApprovalEntry)
      }
      entries.push(...editRequestEntries)
      entries.push({
        title: 'Application Closed',
        subtitle: 'Upcoming',
        description: 'Application will be closed after final HR action.',
        icon: 'radio_button_unchecked',
        color: 'grey-5',
      })
      return entries
    }

    entries.push({
      title: 'Department Admin Review Pending',
      subtitle: 'Current stage',
      description: 'Waiting for department admin approval or disapproval.',
      icon: 'pending_actions',
      color: 'warning',
    })
    entries.push({
      title: 'Pending HR Review',
      subtitle: 'Upcoming',
      description: 'This stage starts after department admin approval.',
      icon: 'radio_button_unchecked',
      color: 'grey-5',
    })
    entries.push(...editRequestEntries)
    entries.push({
      title: 'Application Closed',
      subtitle: 'Upcoming',
      description: 'Application will be closed after final HR action.',
      icon: 'radio_button_unchecked',
      color: 'grey-5',
    })
    return entries
  }

  if (rawStatus === 'REJECTED') {
    const disapprovedAt = formatDateTime(resolveDisapprovedDateValue(app)) || 'Application closed'
    const disapprovedBy = resolveDisapprovalActor(app)
    const isApprovedCancellationRequest =
      isCancellationRequestAction(app) && getLatestUpdateRequestStatus(app) === 'APPROVED'

    if (resolveDepartmentAdminActionDateValue(app)) {
      entries.push({
        title: 'Admin Review Completed',
        subtitle: formatDateTime(resolveDepartmentAdminActionDateValue(app)) || 'Completed',
        description: 'Application was reviewed and forwarded to HR.',
        icon: 'check_circle',
        color: 'positive',
        actor: resolveDepartmentAdminActor(app),
      })
    }
    if (receivedTimelineEntry) {
      entries.push(receivedTimelineEntry)
    }

    entries.push({
      title: isApprovedCancellationRequest ? 'Application Cancelled' : 'Application Disapproved',
      subtitle: disapprovedAt,
      description: isApprovedCancellationRequest
        ? formatRecentRemarks(app) || 'Application was cancelled through the approved cancellation request.'
        : formatRecentRemarks(app) || 'Application was disapproved.',
      icon: isApprovedCancellationRequest ? 'event_busy' : 'cancel',
      color: 'negative',
      actor: disapprovedBy,
    })
    entries.push(...editRequestEntries)
    entries.push({
      title: 'Application Closed',
      subtitle: disapprovedAt,
      description: 'Application workflow is complete.',
      icon: 'task_alt',
      color: 'positive',
      actor: disapprovedBy,
    })
    return entries
  }

  entries.push({
    title: 'Admin Review Completed',
    subtitle: formatDateTime(resolveDepartmentAdminActionDateValue(app)) || 'Completed',
    description: 'Application was reviewed and forwarded to HR.',
    icon: 'check_circle',
    color: 'positive',
    actor: resolveDepartmentAdminActor(app),
  })
  if (receivedTimelineEntry) {
    entries.push(receivedTimelineEntry)
  }

  if (rawStatus === 'PENDING_HR') {
    if (hasEditRequest) {
      if (preEditHrApprovalEntry) {
        entries.push(preEditHrApprovalEntry)
      }
      entries.push(...editRequestEntries)
      entries.push({
        title: 'Application Closed',
        subtitle: 'Upcoming',
        description: 'Application will be closed after final HR action.',
        icon: 'radio_button_unchecked',
        color: 'grey-5',
      })
      return entries
    }

    entries.push({
      title: 'Pending HR Review',
      subtitle: 'Current stage',
      description: 'Waiting for HR final evaluation and approval.',
      icon: 'pending_actions',
      color: 'warning',
    })
    entries.push(...editRequestEntries)
    entries.push({
      title: 'Application Closed',
      subtitle: 'Upcoming',
      description: 'Application will be closed after final HR action.',
      icon: 'radio_button_unchecked',
      color: 'grey-5',
    })
    return entries
  }

  if (rawStatus === 'APPROVED') {
    if (hasEditRequest) {
      if (preEditHrApprovalEntry) {
        entries.push(preEditHrApprovalEntry)
      }
      entries.push(...editRequestEntries)

      const lastCompletedEditEntry = [...editRequestEntries]
        .reverse()
        .find((entry) => {
          const title = String(entry?.title || '').toLowerCase()
          return title.includes('request approved') || title.includes('request rejected')
        })
      const closedSubtitle = lastCompletedEditEntry?.subtitle || preEditHrApprovalEntry?.subtitle || 'Completed'
      const closedActor = lastCompletedEditEntry?.actor || preEditHrApprovalEntry?.actor || resolveHrActor(app)

      entries.push({
        title: 'Application Closed',
        subtitle: closedSubtitle,
        description: 'Application workflow is complete.',
        icon: 'task_alt',
        color: 'positive',
        actor: closedActor,
      })
      return entries
    }

    const approvedAt = formatDateTime(resolveFinalApprovalDateValue(app)) || 'Completed'
    const approvedBy = resolveHrActor(app)

    entries.push({
      title: 'Approved by HR',
      subtitle: approvedAt,
      description: 'Application is fully approved.',
      icon: 'task_alt',
      color: 'positive',
      actor: approvedBy,
    })
    entries.push(...editRequestEntries)
    entries.push({
      title: 'Application Closed',
      subtitle: approvedAt,
      description: 'Application workflow is complete.',
      icon: 'task_alt',
      color: 'positive',
      actor: approvedBy,
    })
    return entries
  }

  if (rawStatus === 'RECALLED') {
    const approvedAt = formatDateTime(resolveFinalApprovalDateValue(app))
    const approvedBy = resolveHrActor(app)
    const recalledAt = formatDateTime(resolveRecallDateValue(app)) || 'Completed'
    const recalledBy = resolveRecallActor(app)

    if (approvedAt || approvedBy !== 'Unknown') {
      entries.push({
        title: 'Approved by HR',
        subtitle: approvedAt || 'Completed',
        description: 'Application was fully approved before recall.',
        icon: 'task_alt',
        color: 'positive',
        actor: approvedBy,
      })
    }

    entries.push({
      title: 'Recalled by HR',
      subtitle: recalledAt,
      description: formatRecallRemarks(app) || 'Application was recalled by HR.',
      icon: 'undo',
      color: 'warning',
      actor: recalledBy,
    })
    entries.push(...editRequestEntries)
    entries.push({
      title: 'Application Closed',
      subtitle: recalledAt,
      description: 'Application workflow is complete.',
      icon: 'task_alt',
      color: 'positive',
      actor: recalledBy,
    })
    return entries
  }

  entries.push({
    title: 'Current Status',
    subtitle: getApplicationStatusLabel(app),
    description: 'Latest application status.',
    icon: 'info',
    color: getApplicationStatusColor(app),
  })
  entries.push(...editRequestEntries)

  return entries
}
function getSelectedDateColumns(dates, columnCount = 3) {
  const formattedDates = Array.isArray(dates)
    ? [...dates]
        .sort()
        .map((date) => formatDate(date))
        .filter(Boolean)
    : []

  if (!formattedDates.length) return []

  const itemsPerColumn = Math.ceil(formattedDates.length / columnCount)
  const columns = []
  for (let index = 0; index < columnCount; index += 1) {
    const start = index * itemsPerColumn
    const end = start + itemsPerColumn
    columns.push(formattedDates.slice(start, end))
  }

  return columns
}

function normalizePayStatusCode(value) {
  const normalizedValue = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, '')

  if (normalizedValue === 'WP' || normalizedValue === 'WITHPAY') return 'WP'
  if (normalizedValue === 'WOP' || normalizedValue === 'WITHOUTPAY') return 'WOP'
  return ''
}

function normalizeCoverageCode(value) {
  const normalizedValue = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')

  if (normalizedValue === 'half' || normalizedValue === 'halfday') return 'half'
  if (normalizedValue === 'whole' || normalizedValue === 'wholeday') return 'whole'
  return ''
}

function toSelectedDatePayStatusMap(value) {
  if (!value) return {}

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return {}
    try {
      const parsed = JSON.parse(trimmed)
      return toSelectedDatePayStatusMap(parsed)
    } catch {
      return {}
    }
  }

  if (Array.isArray(value)) {
    return value.reduce((acc, entry, index) => {
      const normalized = normalizePayStatusCode(entry)
      if (normalized) acc[String(index)] = normalized
      return acc
    }, {})
  }

  if (typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, entry]) => {
      const normalized = normalizePayStatusCode(entry)
      if (normalized) acc[String(key)] = normalized
      return acc
    }, {})
  }

  return {}
}

function toSelectedDateCoverageMap(value) {
  if (!value) return {}

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return {}
    try {
      const parsed = JSON.parse(trimmed)
      return toSelectedDateCoverageMap(parsed)
    } catch {
      return {}
    }
  }

  if (Array.isArray(value)) {
    return value.reduce((acc, entry, index) => {
      const normalized = normalizeCoverageCode(entry)
      if (normalized) acc[String(index)] = normalized
      return acc
    }, {})
  }

  if (typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, entry]) => {
      const normalized = normalizeCoverageCode(entry)
      if (normalized) acc[String(key)] = normalized
      return acc
    }, {})
  }

  return {}
}

function resolveApplicationPayModeCode(app) {
  const rawPayMode = String(app?.pay_mode ?? '').trim()

  return normalizePayStatusCode(rawPayMode) === 'WOP' ? 'WOP' : 'WP'
}

function getSelectedDatePayStatusRows(app) {
  if (!app || typeof app !== 'object') return []
  if (isCocApplication(app)) return []

  const dateSet = getVisibleDateSetForDisplay(app)
  if (!dateSet.length) return []

  const rawStatusMap = toSelectedDatePayStatusMap(
    app?.selected_date_pay_status,
  )

  const normalizedStatusMap = {}
  Object.entries(rawStatusMap).forEach(([rawKey, status]) => {
    const key = String(rawKey || '').trim()
    if (!key || !status) return

    normalizedStatusMap[key] = status

    const isoKey = toIsoDateString(key)
    if (isoKey) {
      normalizedStatusMap[isoKey] = status
    }
  })

  const fallbackStatus = resolveApplicationPayModeCode(app)
  const coverageWeights = getSelectedDateCoverageWeights(app)
  const recalledDateSet = new Set(getStoredRecallDateKeys(app))
  const shouldMarkRecalledDates =
    app?.application_row_variant === 'recalled' ||
    getApplicationRawStatusKey(app) === 'RECALLED'

  return dateSet.map((dateValue, index) => {
    const isoDate = toIsoDateString(dateValue)
    const key = isoDate || String(dateValue)
    const payStatus =
      normalizedStatusMap[key] ??
      normalizedStatusMap[String(index)] ??
      normalizedStatusMap[String(index + 1)] ??
      fallbackStatus

    return {
      dateKey: key,
      dateText: formatDate(key),
      coverageLabel: getDateCoverageLabel(coverageWeights[key] ?? 1),
      payStatus: payStatus === 'WOP' ? 'WOP' : 'WP',
      recalled: shouldMarkRecalledDates && recalledDateSet.has(key),
    }
  })
}

function resolveApplicationTotalDays(app) {
  const candidates = [app?.total_days, app?.duration_value, app?.days]

  for (const candidate of candidates) {
    const numericValue = Number(candidate)
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue
    }
  }

  return 0
}

function getSelectedDateCoverageWeights(app) {
  if (!app || typeof app !== 'object') return {}

  const dateSet = resolveDateSetFromSource(app)
  if (!dateSet.length) return {}

  const rawCoverageMap = toSelectedDateCoverageMap(
    app?.selected_date_coverage,
  )

  const normalizedCoverageMap = {}
  Object.entries(rawCoverageMap).forEach(([rawKey, coverage]) => {
    const key = String(rawKey || '').trim()
    if (!key || !coverage) return

    normalizedCoverageMap[key] = coverage

    const isoKey = toIsoDateString(key)
    if (isoKey) {
      normalizedCoverageMap[isoKey] = coverage
    }
  })

  const totalDays = resolveApplicationTotalDays(app)
  const hasCoverageOverrides = Object.keys(normalizedCoverageMap).length > 0

  let defaultCoverageWeight = 1
  const dateCount = dateSet.length
  if (dateCount > 0 && totalDays > 0) {
    const halfMatch = Math.abs(dateCount * 0.5 - totalDays) < 0.00001
    const wholeMatch = Math.abs(dateCount - totalDays) < 0.00001
    if (halfMatch) {
      defaultCoverageWeight = 0.5
    } else if (!wholeMatch) {
      defaultCoverageWeight = Math.max(Math.min(totalDays / dateCount, 1), 0.5)
    }
  }

  return dateSet.reduce((acc, dateValue, index) => {
    const isoDate = toIsoDateString(dateValue)
    const key = isoDate || String(dateValue)
    const coverage =
      normalizedCoverageMap[key] ??
      normalizedCoverageMap[String(index)] ??
      normalizedCoverageMap[String(index + 1)] ??
      ''

    if (coverage === 'half') {
      acc[key] = 0.5
    } else if (coverage === 'whole') {
      acc[key] = 1
    } else if (hasCoverageOverrides) {
      acc[key] = 1
    } else {
      acc[key] = defaultCoverageWeight
    }

    return acc
  }, {})
}

function getDateCoverageLabel(weight) {
  return Number(weight) === 0.5 ? 'Half Day' : 'Whole Day'
}

function getPendingUpdateDateCoverageWeights(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || typeof payload !== 'object') return {}

  const dateSet = resolveDateSetFromSource(payload)
  if (!dateSet.length) return {}

  const rawCoverageMap = toSelectedDateCoverageMap(
    payload?.selected_date_coverage,
  )

  const normalizedCoverageMap = {}
  Object.entries(rawCoverageMap).forEach(([rawKey, coverage]) => {
    const key = String(rawKey || '').trim()
    if (!key || !coverage) return

    normalizedCoverageMap[key] = coverage

    const isoKey = toIsoDateString(key)
    if (isoKey) {
      normalizedCoverageMap[isoKey] = coverage
    }
  })

  const totalDays = (() => {
    const candidates = [payload?.total_days, payload?.duration_value, payload?.days]

    for (const candidate of candidates) {
      const numericValue = Number(candidate)
      if (Number.isFinite(numericValue) && numericValue > 0) {
        return numericValue
      }
    }

    return 0
  })()

  const hasCoverageOverrides = Object.keys(normalizedCoverageMap).length > 0
  let defaultCoverageWeight = 1
  const dateCount = dateSet.length
  if (dateCount > 0 && totalDays > 0) {
    const halfMatch = Math.abs(dateCount * 0.5 - totalDays) < 0.00001
    const wholeMatch = Math.abs(dateCount - totalDays) < 0.00001
    if (halfMatch) {
      defaultCoverageWeight = 0.5
    } else if (!wholeMatch) {
      defaultCoverageWeight = Math.max(Math.min(totalDays / dateCount, 1), 0.5)
    }
  }

  return dateSet.reduce((acc, dateValue, index) => {
    const isoDate = toIsoDateString(dateValue)
    const key = isoDate || String(dateValue)
    const coverage =
      normalizedCoverageMap[key] ??
      normalizedCoverageMap[String(index)] ??
      normalizedCoverageMap[String(index + 1)] ??
      ''

    if (coverage === 'half') {
      acc[key] = 0.5
    } else if (coverage === 'whole') {
      acc[key] = 1
    } else if (hasCoverageOverrides) {
      acc[key] = 1
    } else {
      acc[key] = defaultCoverageWeight
    }

    return acc
  }, {})
}
function getSelectedDatePayStatusColumns(app, columnCount = 3) {
  const rows = getSelectedDatePayStatusRows(app)
  if (!rows.length) return []

  const itemsPerColumn = Math.ceil(rows.length / columnCount)
  const columns = []
  for (let index = 0; index < columnCount; index += 1) {
    const start = index * itemsPerColumn
    const end = start + itemsPerColumn
    columns.push(rows.slice(start, end))
  }

  return columns
}

function getPendingUpdateDatePayStatusRows(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || typeof payload !== 'object') return []
  if (isCocApplication(app)) return []

  const dateSet = resolveDateSetFromSource(payload)
  if (!dateSet.length) return []

  const rawStatusMap = toSelectedDatePayStatusMap(
    payload?.selected_date_pay_status,
  )

  const normalizedStatusMap = {}
  Object.entries(rawStatusMap).forEach(([rawKey, status]) => {
    const key = String(rawKey || '').trim()
    if (!key || !status) return

    normalizedStatusMap[key] = status

    const isoKey = toIsoDateString(key)
    if (isoKey) {
      normalizedStatusMap[isoKey] = status
    }
  })

  const fallbackStatus = normalizePayStatusCode(payload?.pay_mode) === 'WOP' ? 'WOP' : 'WP'
  const coverageWeights = getPendingUpdateDateCoverageWeights(app)

  return dateSet.map((dateValue, index) => {
    const isoDate = toIsoDateString(dateValue)
    const key = isoDate || String(dateValue)
    const payStatus =
      normalizedStatusMap[key] ??
      normalizedStatusMap[String(index)] ??
      normalizedStatusMap[String(index + 1)] ??
      fallbackStatus

    return {
      dateKey: key,
      dateText: formatDate(key),
      coverageLabel: getDateCoverageLabel(coverageWeights[key] ?? 1),
      payStatus: payStatus === 'WOP' ? 'WOP' : 'WP',
    }
  })
}

function getPendingUpdateDatePayStatusColumns(app, columnCount = 3) {
  const rows = getPendingUpdateDatePayStatusRows(app)
  if (!rows.length) return []

  const itemsPerColumn = Math.ceil(rows.length / columnCount)
  const columns = []
  for (let index = 0; index < columnCount; index += 1) {
    const start = index * itemsPerColumn
    const end = start + itemsPerColumn
    columns.push(rows.slice(start, end))
  }

  return columns
}

async function openDetails(app) {
  const baseApplication = resolveApplication(app) || app
  selectedApp.value = baseApplication
  showTimelineDialog.value = false
  showDetailsDialog.value = true

  const id = getApplicationId(baseApplication)
  if (!id) return

  const endpoint = isCocApplication(baseApplication)
    ? `/hr/coc-applications/${id}`
    : `/hr/leave-applications/${id}`

  try {
    const response = await api.get(endpoint)
    const detailedApplication = extractSingleApplicationFromPayload(response?.data)
    if (!detailedApplication || typeof detailedApplication !== 'object') return

    const normalizedDetail = normalizeBackendApplicationShape(detailedApplication)
    const normalizedBase = normalizeBackendApplicationShape(baseApplication)
    const detailPayload = normalizedDetail && typeof normalizedDetail === 'object' ? normalizedDetail : {}
    const basePayload = normalizedBase && typeof normalizedBase === 'object' ? normalizedBase : {}
    const isRecalledVariant =
      String(basePayload?.application_row_variant || '').trim().toLowerCase() === 'recalled'
    const mergedPayload = isRecalledVariant
      ? { ...detailPayload, ...basePayload }
      : { ...basePayload, ...detailPayload }
    const mergedApplication =
      normalizeBackendApplicationShape({
        ...mergedPayload,
        leaveBalance: detailPayload.leaveBalance ?? basePayload.leaveBalance ?? null,
        leave_balances:
          detailPayload.leave_balances ??
          basePayload.leave_balances ??
          null,
      }) || normalizedBase

    if (!showDetailsDialog.value) return

    const expectedKey =
      getApplicationIdentityKey(baseApplication) || `${getApplicationType(baseApplication)}:${String(id).trim()}`
    const selectedKey = getApplicationIdentityKey(selectedApp.value)
    if (selectedKey !== expectedKey) return

    selectedApp.value = mergedApplication
  } catch {
    // Keep existing row payload when detail endpoint fails.
  }
}

async function openTimeline(app) {
  const baseApplication = resolveApplication(app) || app
  selectedApp.value = baseApplication
  showDetailsDialog.value = false
  showTimelineDialog.value = true

  const id = getApplicationId(baseApplication)
  if (!id) return

  const endpoint = isCocApplication(baseApplication)
    ? `/hr/coc-applications/${id}`
    : `/hr/leave-applications/${id}`

  try {
    const response = await api.get(endpoint)
    const detailedApplication = extractSingleApplicationFromPayload(response?.data)
    if (!detailedApplication || typeof detailedApplication !== 'object') return

    const normalizedDetail = normalizeBackendApplicationShape(detailedApplication)
    const normalizedBase = normalizeBackendApplicationShape(baseApplication)
    const detailPayload = normalizedDetail && typeof normalizedDetail === 'object' ? normalizedDetail : {}
    const basePayload = normalizedBase && typeof normalizedBase === 'object' ? normalizedBase : {}
    const isRecalledVariant =
      String(basePayload?.application_row_variant || '').trim().toLowerCase() === 'recalled'
    // Preserve recalled companion-row overrides while keeping fresh API detail for normal rows.
    const mergedPayload = isRecalledVariant
      ? { ...detailPayload, ...basePayload }
      : { ...basePayload, ...detailPayload }
    const mergedApplication =
      normalizeBackendApplicationShape(mergedPayload) || normalizedBase

    if (!showTimelineDialog.value) return

    const expectedKey =
      getApplicationIdentityKey(baseApplication) || `${getApplicationType(baseApplication)}:${String(id).trim()}`
    const selectedKey = getApplicationIdentityKey(selectedApp.value)
    if (selectedKey !== expectedKey) return

    selectedApp.value = mergedApplication
  } catch {
    // Keep existing row payload when detail endpoint fails.
  }
}

function resolveApplicationAttachmentReference(app) {
  return String(app?.attachment_reference ?? '').trim()
}

function hasApplicationAttachment(app) {
  if (!app || typeof app !== 'object') return false
  if (resolveApplicationAttachmentReference(app)) return true

  return isTruthyBackendFlag(app?.attachment_submitted)
}

async function viewApplicationAttachment(app = selectedApp.value) {
  const target = resolveApplication(app)
  const id = getApplicationId(target)

  if (!id) {
    q.notify({
      type: 'negative',
      message: 'Unable to identify this leave application attachment.',
      position: 'top',
    })
    return
  }

  try {
    const response = await api.get(`/hr/leave-applications/${id}/attachment`, {
      responseType: 'blob',
    })

    const contentType = String(response?.headers?.['content-type'] || '').toLowerCase()
    if (contentType.includes('application/json')) {
      const fallbackMessage = 'Unable to open the attachment right now.'
      const textPayload = await response.data.text()
      let parsedMessage = ''
      try {
        parsedMessage = JSON.parse(textPayload || '{}')?.message || ''
      } catch {
        parsedMessage = ''
      }

      q.notify({
        type: 'negative',
        message: parsedMessage || fallbackMessage,
        position: 'top',
      })
      return
    }

    const blob =
      response.data instanceof Blob
        ? response.data
        : new Blob([response.data], {
            type: response?.headers?.['content-type'] || 'application/octet-stream',
          })
    const objectUrl = URL.createObjectURL(blob)

    const opened = window.open(objectUrl, '_blank', 'noopener,noreferrer')
    if (!opened) {
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.target = '_blank'
      anchor.rel = 'noopener noreferrer'
      anchor.click()
    }

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  } catch (err) {
    const message = resolveApiErrorMessage(err, 'Unable to open the attachment right now.')
    q.notify({ type: 'negative', message, position: 'top' })
  }
}

function hasMobileApplicationActions(app) {
  const rawStatus = getApplicationRawStatusKey(app)
  return rawStatus === 'PENDING_HR' || canRecallApplication(app)
}

function canPrintCocCertificate(app) {
  if (!app || !isCocApplication(app)) return false

  const rawStatus = getApplicationRawStatusKey(app)
  if (rawStatus.includes('APPROVED')) return true

  const mergedStatus = String(getApplicationStatusLabel(app) || '').toLowerCase()
  return mergedStatus.includes('approved')
}

async function printCocCertificate(app = selectedApp.value) {
  const targetApp = resolveApplication(app) || app
  if (!canPrintCocCertificate(targetApp)) return

  let printableApp = targetApp
  const id = getApplicationId(targetApp)

  if (id !== undefined && id !== null && String(id).trim() !== '') {
    try {
      const response = await api.get(`/hr/coc-applications/${id}`)
      const detailedApplication = normalizeBackendApplicationShape(
        extractSingleApplicationFromPayload(response?.data),
      )
      if (detailedApplication && typeof detailedApplication === 'object') {
        printableApp = {
          ...printableApp,
          ...detailedApplication,
        }
      }
    } catch {
      // Keep the selected application payload when detail endpoint is unavailable.
    }
  }

  await generateCocCertificatePdf(printableApp)
}

function handleApplicationRowClick(_evt, row) {
  if (!row) return
  openTimeline(row)
}

function getApplicationId(target) {
  return target?.id ?? target
}

function getApplicationIdentityKey(target) {
  if (!target || typeof target !== 'object') return ''

  const id = String(getApplicationId(target) ?? '').trim()
  if (!id) return ''

  return `${getApplicationType(target)}:${id}`
}

function resolveApplication(target) {
  if (target && typeof target === 'object') return target

  const rawTarget = String(target ?? '').trim()
  if (!rawTarget) return null

  let requestedType = ''
  let requestedId = rawTarget
  const typedIdMatch = rawTarget.match(/^(COC|LEAVE):(.+)$/i)
  if (typedIdMatch) {
    requestedType = typedIdMatch[1].toUpperCase()
    requestedId = String(typedIdMatch[2] || '').trim()
  }

  if (!requestedId) return null

  const matches = applications.value.filter(
    (application) => String(getApplicationId(application) ?? '').trim() === requestedId,
  )
  if (!matches.length) return null

  if (!requestedType) return matches[0]
  return matches.find((application) => getApplicationType(application) === requestedType) || matches[0]
}

function applyLeaveApplicationUpdate(updatedApplication) {
  const normalizedUpdatedApplication = normalizeBackendApplicationShape(updatedApplication)
  if (!normalizedUpdatedApplication || isCocApplication(normalizedUpdatedApplication)) return

  const updatedId = String(getApplicationId(normalizedUpdatedApplication) ?? '').trim()
  if (!updatedId) return

  applications.value = applications.value.map((row) => {
    if (!row || typeof row !== 'object') return row
    if (isCocApplication(row) || row?.application_row_variant === 'recalled') return row

    const rowId = String(getApplicationId(row) ?? '').trim()
    if (rowId !== updatedId) return row

    const mergedRow =
      normalizeBackendApplicationShape({
        ...row,
        ...normalizedUpdatedApplication,
      }) ||
      ({
        ...row,
        ...normalizedUpdatedApplication,
      })

    return {
      ...mergedRow,
      application_type: getApplicationType(mergedRow),
      application_uid:
        row?.application_uid || mergedRow?.application_uid || getApplicationRowKey(mergedRow),
      employeeName: mergedRow?.employeeName || row?.employeeName || 'Unknown',
      officeShort: toDepartmentCode(mergedRow?.office || row?.office),
      displayStatus: mergeStatus(mergedRow),
    }
  })
}

async function markApplicationReceived(target = selectedApp.value) {
  const application = resolveApplication(target) || target
  if (!canReceiveApplication(application)) return

  const id = getApplicationId(application)
  if (!id) {
    q.notify({
      type: 'negative',
      message: 'Unable to identify this leave application.',
      position: 'top',
    })
    return
  }

  receiveLoading.value = true
  try {
    const useUpdateReceiveEndpoint = shouldUseUpdateReceiveEndpoint(application)
    const isCancellationRequest = isCancellationRequestAction(application)

    const receiveEndpoint = useUpdateReceiveEndpoint
      ? '/hr/leave-applications/' + id + '/update-receive'
      : '/hr/leave-applications/' + id + '/receive'
    const response = await api.post(receiveEndpoint)
    const responseMessage = String(response?.data?.message || '').trim()
    const updatedApplication = normalizeBackendApplicationShape(
      extractSingleApplicationFromPayload(response?.data),
    )

    if (updatedApplication && typeof updatedApplication === 'object') {
      const mergedApplication =
        normalizeBackendApplicationShape({
          ...(application && typeof application === 'object' ? application : {}),
          ...updatedApplication,
        }) ||
        ({
          ...(application && typeof application === 'object' ? application : {}),
          ...updatedApplication,
        })

      const selectedId = String(getApplicationId(selectedApp.value) ?? '').trim()
      if (selectedId === String(id).trim()) {
        selectedApp.value = mergedApplication
      }

      applyLeaveApplicationUpdate(mergedApplication)
    }

    q.notify({
      type: 'positive',
      message: responseMessage || (
        useUpdateReceiveEndpoint
          ? isCancellationRequest
            ? 'Cancellation form receipt confirmed.'
            : 'Updated hard-copy receipt confirmed.'
          : 'Application marked as received by HR.'
      ),
      position: 'top',
    })
  } catch (err) {
    const useUpdateReceiveEndpoint = shouldUseUpdateReceiveEndpoint(application)
    const isCancellationRequest = isCancellationRequestAction(application)

    const msg = resolveApiErrorMessage(
      err,
      useUpdateReceiveEndpoint
        ? isCancellationRequest
          ? 'Unable to mark this cancellation form as received right now.'
          : 'Unable to mark this updated application as received right now.'
        : 'Unable to mark this application as received right now.',
    )
    q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    receiveLoading.value = false
  }
}

async function markApplicationReleased(target = selectedApp.value) {
  const application = resolveApplication(target) || target
  if (!canReleaseApplication(application)) return

  const id = getApplicationId(application)
  if (!id) {
    q.notify({
      type: 'negative',
      message: 'Unable to identify this leave application.',
      position: 'top',
    })
    return
  }

  releaseLoading.value = true
  try {
    const useUpdateReleaseEndpoint = shouldUseUpdateReleaseEndpoint(application)
    const isCancellationRequest = isCancellationRequestAction(application)

    const releaseEndpoint = useUpdateReleaseEndpoint
      ? '/hr/leave-applications/' + id + '/update-release'
      : '/hr/leave-applications/' + id + '/release'
    const response = await api.post(releaseEndpoint)
    const responseMessage = String(response?.data?.message || '').trim()
    const updatedApplication = normalizeBackendApplicationShape(
      extractSingleApplicationFromPayload(response?.data),
    )

    if (updatedApplication && typeof updatedApplication === 'object') {
      const mergedApplication =
        normalizeBackendApplicationShape({
          ...(application && typeof application === 'object' ? application : {}),
          ...updatedApplication,
        }) ||
        ({
          ...(application && typeof application === 'object' ? application : {}),
          ...updatedApplication,
        })

      const selectedId = String(getApplicationId(selectedApp.value) ?? '').trim()
      if (selectedId === String(id).trim()) {
        selectedApp.value = mergedApplication
      }

      applyLeaveApplicationUpdate(mergedApplication)
    }

    q.notify({
      type: 'positive',
      message: responseMessage || (
        useUpdateReleaseEndpoint
          ? isCancellationRequest
            ? 'Cancellation form release confirmed.'
            : 'Updated hard-copy release confirmed.'
          : 'Application marked as released by HR.'
      ),
      position: 'top',
    })
  } catch (err) {
    const useUpdateReleaseEndpoint = shouldUseUpdateReleaseEndpoint(application)
    const isCancellationRequest = isCancellationRequestAction(application)

    const msg = resolveApiErrorMessage(
      err,
      useUpdateReleaseEndpoint
        ? isCancellationRequest
          ? 'Unable to mark this cancellation form as released right now.'
          : 'Unable to mark this updated application as released right now.'
        : 'Unable to mark this application as released right now.',
    )
    q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    releaseLoading.value = false
  }
}

function openActionConfirm(type, target) {
  const resolvedType = String(type || '').trim().toLowerCase()
  const application = resolveApplication(target) || target || null
  if (!application) return

  const isApproveAction = resolvedType === 'approve'
  const needsReceiveBeforeApprove =
    isApproveAction &&
    !isCocApplication(application) &&
    getApplicationRawStatusKey(application) === 'PENDING_HR' &&
    !isApplicationReceivedByHr(application)

  if (needsReceiveBeforeApprove) {
    q.dialog({
      title: 'Receive Required',
      message: 'This application needs to be received by HR first before approving.',
      ok: {
        label: 'OK',
        color: 'primary',
        unelevated: true,
      },
      persistent: true,
    })
    return
  }

  confirmActionType.value = resolvedType || 'approve'
  confirmActionTarget.value = application
  showConfirmActionDialog.value = true
}

function handleConfirmRequestReject(target) {
  openReject(target)
}

function openEdit(app) {
  const application = resolveApplication(app) || app || null
  if (!application) return
  editTargetApp.value = application
  showDetailsDialog.value = false
  showEditDialog.value = true
}

function openReject(target) {
  const application = resolveApplication(target) || target || null
  if (!application) return
  rejectTargetApp.value = application
  showRejectDialog.value = true
}

function openRecall(target) {
  const application = resolveApplication(target) || target || null
  if (!canRecallApplication(application)) return
  recallTargetApp.value = application
  showRecallDialog.value = true
}

async function handleDialogMutationSuccess(payload = {}) {
  const payloadApplication =
    payload?.application && typeof payload.application === 'object' ? payload.application : null
  const applicationId = String(payload?.applicationId ?? payload?.id ?? '').trim()
  const applicationKey = String(
    payload?.applicationKey ||
      (payloadApplication ? getApplicationIdentityKey(payloadApplication) : '') ||
      applicationId,
  ).trim()
  showDetailsDialog.value = false
  await fetchApplications()

  if (!applicationKey) return
  selectedApp.value = resolveApplication(applicationKey)
}

  return {
    DEPARTMENT_STOP_WORDS,
    EMPLOYMENT_TYPE_FILTER_LABELS,
    applicationTableColumns,
    applications,
    applicationsForTable,
    applyLeaveApplicationUpdate,
    buildApplicationTimeline,
    canEditApplication,
    canPrintCocCertificate,
    canRecallApplication,
    canReceiveApplication,
    canReleaseApplication,
    clearEmploymentTypeFilter,
    columns,
    compareApplicationsForTable,
    confirmActionTarget,
    confirmActionType,
    createRecalledCompanionRow,
    editTargetApp,
    employmentTypeFilter,
    employmentTypeFilterLabel,
    enumerateInclusiveDateRange,
    expandApplicationsForDisplay,
    extractApplicationsFromPayload,
    extractSingleApplicationFromPayload,
    fetchApplications,
    findLatestStatusHistoryEntry,
    findLeaveBalanceEntry,
    findStatusHistoryEntry,
    formatDate,
    formatDateTime,
    formatDayValue,
    formatDurationDisplay,
    formatGroupedInclusiveDateLines,
    formatRecallDateLabel,
    formatRecallRemarks,
    formatRecentRemarks,
    formatWorkflowRemarksDisplay,
    getActualRequestedDayCount,
    getApplicationDurationDisplay,
    getApplicationDurationLabel,
    getApplicationEmploymentTypeKey,
    getApplicationExplicitId,
    getApplicationId,
    getApplicationIdentityKey,
    getApplicationInclusiveDateColumnLines,
    getApplicationInclusiveDateLines,
    getApplicationLeaveTypeName,
    getApplicationMergeKey,
    getApplicationRawStatusKey,
    getApplicationRowKey,
    getApplicationSearchTokenSet,
    getApplicationStatusColor,
    getApplicationStatusLabel,
    getApplicationStatusPriority,
    getApplicationType,
    getApplicationCtoRequiredHoursDisplay,
    getApplicationCtoRequiredHoursValue,
    getCtoDeductedHoursDisplay,
    getCurrentCtoAvailableHoursDisplay,
    getCurrentCtoAvailableHoursValue,
    getCurrentLeaveBalanceClass,
    getCurrentLeaveBalanceDisplay,
    getCurrentLeaveBalanceValue,
    getCurrentLeaveTypeId,
    getCurrentLeaveTypeLabel,
    getCurrentReasonDisplay,
    getDateCoverageLabel,
    getDateSearchValues,
    getDateSubsetTotalDays,
    getDetailsRemarksRows,
    getEditRequestBadgeColor,
    getEditRequestBadgeLabel,
    getEditRequestStatusFieldLabel,
    getEditRequestStatusLabel,
    getEditRequestTimelineEntries,
    getEmployeeBalanceLookupKey,
    getLatestUpdateRequestStatus,
    getLeaveBalanceEntriesForApplication,
    getPendingUpdateDateCoverageWeights,
    getPendingUpdateDatePayStatusColumns,
    getPendingUpdateDatePayStatusRows,
    getPendingUpdateInclusiveDateLines,
    getPendingUpdatePayload,
    getPendingUpdateReason,
    getPreEditHrApprovalTimelineEntry,
    getRawLeaveBalanceEntriesFromApplication,
    getRecallDateOptions,
    getReceivedApplicationTimelineEntry,
    getReceivedByHrSummary,
    getReleasedByHrSummary,
    getRemainingRecallableDateKeys,
    getRequestedDurationDisplay,
    getRequestedLeaveTypeId,
    getRequestedLeaveTypeLabel,
    getRequestedReasonDisplay,
    getRequestedReasonValue,
    getSearchTokens,
    getSelectedDateColumns,
    getSelectedDateCoverageWeights,
    getSelectedDatePayStatusColumns,
    getSelectedDatePayStatusRows,
    getStatusHistoryEntries,
    getStoredRecallDateKeys,
    getVisibleDateSetForDisplay,
    handleApplicationRowClick,
    handleConfirmRequestReject,
    handleDialogMutationSuccess,
    hasApplicationAttachment,
    hasEditRequestSignal,
    hasExplicitTimeComponent,
    hasMobileApplicationActions,
    hasPendingDateUpdate,
    hasPendingDurationUpdate,
    isCtoLeaveApplication,
    hasPendingLeaveTypeUpdate,
    hasPendingReasonUpdate,
    isApplicationReceivedByHr,
    isApplicationReleased,
    isCancelledByUser,
    isCocApplication,
    isCancellationRequestAction,
    isEditUpdateRequest,
    isPendingEditRequest,
    isRecallableLeaveApplication,
    isTruthyBackendFlag,
    latestLeaveBalanceEntriesByEmployee,
    loading,
    markApplicationReceived,
    markApplicationReleased,
    matchesEmploymentTypeFilter,
    mergeApplications,
    mergeStatus,
    mobileApplicationColumnWidths,
    normalizeApplicationType,
    normalizeBackendApplicationShape,
    normalizeBackendApplications,
    normalizeCoverageCode,
    normalizeDurationUnit,
    normalizeEmploymentTypeKey,
    normalizeIsoDateList,
    normalizeLeaveBalanceEntries,
    normalizeLeaveBalanceLookupKey,
    normalizeLeaveRequestActionTypeToken,
    normalizePayStatusCode,
    normalizeReasonForCompare,
    normalizeSearchText,
    normalizeSearchToken,
    normalizeStatusHistoryActionToken,
    normalizeStatusHistoryToken,
    normalizeUpdateRequestStatus,
    openActionConfirm,
    openDetails,
    openEdit,
    openRecall,
    openReject,
    openTimeline,
    parseDateTimeValue,
    parseSelectedDatesValue,
    pickFirstDefinedValue,
    printCocCertificate,
    recallDialogApplication,
    recallTargetApp,
    receiveLoading,
    rejectTargetApp,
    releaseLoading,
    resolveApplication,
    resolveApplicationAttachmentReference,
    resolveApplicationPayModeCode,
    resolveApplicationTotalDays,
    resolveCancelledActor,
    resolveCancelledDateValue,
    resolveDateSetFromSource,
    resolveDepartmentAdminActionDateValue,
    resolveLeaveRequestActionTypeFromPayload,
    resolveLeaveRequestActionTypeFromStatusHistory,
    resolveDepartmentAdminActor,
    resolveDepartmentAdminHistoryEntry,
    resolveDisapprovalActor,
    resolveDisapprovedDateValue,
    resolveEditRequestApprovalMeta,
    resolveEditRequestDecisionHistoryEntry,
    resolveEditRequestRejectionMeta,
    resolveEditRequestSubmittedHistoryEntry,
    resolveEditRequestSubmittedMeta,
    resolveFiledByActor,
    resolveFiledDateValue,
    resolveFinalApprovalDateValue,
    resolveHrActor,
    resolveHrApprovalHistoryEntry,
    resolveRecallActor,
    resolveRecallDateValue,
    resolveReceivedActor,
    resolveReceivedDateValue,
    resolveReceivedHistoryEntry,
    resolveReleasedActor,
    resolveReleasedDateValue,
    resolveReleasedHistoryEntry,
    resolveRequestedDurationSnapshot,
    resolveStatusHistoryActor,
    resolveStatusHistoryTimestamp,
    route,
    router,
    searchableStatusValues,
    selectedApp,
    shouldExposeEditRequestStatusToHr,
    showApplicationEditAction,
    getLeaveRequestActionType,
    showConfirmActionDialog,
    showDetailsDialog,
    showEditDialog,
    showRecallDialog,
    showRejectDialog,
    showTimelineDialog,
    statusSearch,
    tablePagination,
    toDepartmentCode,
    toIsoDate,
    toIsoDateString,
    toSelectedDateCoverageMap,
    toSelectedDatePayStatusMap,
    tokenizeSearchValue,
    viewApplicationAttachment,
  }
}
