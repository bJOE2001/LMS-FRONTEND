import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { api } from 'src/boot/axios'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'
import { generateCocCertificatePdf } from 'src/utils/coc-certificate-pdf'
import { isAbroadLeaveApplication } from 'src/utils/leave-application-details'
import { getApplicationRequestedDayCount } from 'src/utils/leave-date-locking'
import { resolveOfficeAcronymLabel } from 'src/utils/office-acronym'

export function useHrApplicationsPanel(options = {}) {

const q = useQuasar()
const route = useRoute()
const router = useRouter()

const loading = ref(false)
const receiveLoading = ref(false)
const releaseLoading = ref(false)
const undoReceiveLoading = ref(false)
const undoReleaseLoading = ref(false)
const timelineLoading = ref(false)
const payStatusOverrideLoading = ref(false)
const applications = ref([])
const isServerPaginatedLeaveView = normalizeApplicationType(options?.applicationType) === 'LEAVE'
const tablePagination = ref({
  page: 1,
  rowsPerPage: 10,
  ...(isServerPaginatedLeaveView ? { rowsNumber: 0 } : {}),
})
const statusSearch = ref('')
const employmentTypeFilter = ref('')
const pendingReceiveFilter = ref(Boolean(options?.pendingReceive || false))
const pendingReleaseFilter = ref(Boolean(options?.pendingRelease || false))
const applicationTypeFilter = ref(normalizeApplicationType(options?.applicationType))
const applicationSourceFilter = String(options?.applicationSource || '')
  .trim()
  .toLowerCase()
let applicationsRequestSequence = 0
const searchableStatusValues = new Set([
  'pending',
  'approved',
  'released',
  'rejected',
  'disapproved',
  'recalled',
])
const queueGroupRenderOrder = ['PENDING', 'APPROVED', 'REJECTED', 'RECALLED', 'OTHER']
const EMPLOYMENT_TYPE_FILTER_LABELS = {
  elective: 'Elective',
  co_terminous: 'Co-term',
  regular: 'Regular',
  casual: 'Casual',
}
const ctoStandardDayHours = 8
const EVENT_BASED_LEAVE_TYPES = [
  'Maternity Leave',
  'Paternity Leave',
  'Solo Parent Leave',
  'Study Leave',
  '10-Day VAWC Leave',
  'Rehabilitation Privilege',
  'Special Leave Benefits for Women',
  'Special Emergency (Calamity) Leave',
  'Adoption Leave',
]

const REQUEST_ACTION_UPDATE = 'REQUEST_UPDATE'
const REQUEST_ACTION_CANCEL = 'REQUEST_CANCEL'
const REQUEST_ACTION_RECALL = 'REQUEST_RECALL'

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
  const leaveTypeKey = String(application?.leave_type_name || application?.leaveType || '')
    .trim()
    .toLowerCase()
  const dateKey = String(application?.date_filed || application?.dateFiled || '').trim()

  const fallback = [getApplicationType(application), employeeKey, leaveTypeKey, dateKey]
    .filter(Boolean)
    .join('|')

  return fallback ? `fallback:${fallback}` : `index:${index}`
}

function createRecalledCompanionRow(app, index = 0) {
  if (!app || typeof app !== 'object' || isCocApplication(app)) return null
  if (getApplicationRawStatusKey(app) !== 'APPROVED') return null

  const recalledDateKeys = getStoredRecallDateKeys(app)
  if (!recalledDateKeys.length) return null

  const recalledDays = getDateSubsetTotalDays(app, recalledDateKeys) || recalledDateKeys.length
  const baseKey = app?.application_uid || getApplicationRowKey(app, index)

  return {
    ...app,
    application_uid: `${baseKey}:recalled`,
    application_row_variant: 'recalled',
    group_raw_status: 'RECALLED',
    status: 'Recalled',
    rawStatus: 'RECALLED',
    raw_status: 'RECALLED',
    displayStatus: 'Recalled',
    selected_dates: recalledDateKeys,
    recall_selected_dates: recalledDateKeys,
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
  if (!payload) return []
  if (Array.isArray(payload)) return payload

  const candidates = [
    payload?.applications,
    payload?.coc_applications,
    payload?.leave_applications,
    payload?.cocApplications,
    payload?.leaveApplications,
    payload?.rows,
    payload?.items,
    payload?.data,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
    if (candidate && typeof candidate === 'object' && Array.isArray(candidate.data)) {
      return candidate.data
    }
  }

  return []
}

function extractSingleApplicationFromPayload(payload) {
  if (!payload) return null

  if (Array.isArray(payload)) {
    return payload.length ? payload[0] : null
  }

  const candidates = [
    payload?.application,
    payload?.coc_application,
    payload?.leave_application,
    payload?.cocApplication,
    payload?.leaveApplication,
    payload?.item,
    payload?.row,
    payload?.data,
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    if (Array.isArray(candidate)) return candidate.length ? candidate[0] : null
    if (candidate && typeof candidate === 'object') return candidate
  }

  return payload && typeof payload === 'object' ? payload : null
}

function isTruthyBackendFlag(value) {
  if (value === true || value === 1) return true
  if (typeof value !== 'string') return false

  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

function normalizeOptionalBackendFlag(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue
    if (typeof value === 'string' && value.trim() === '') continue
    return isTruthyBackendFlag(value)
  }
  return null
}

function trimText(value) {
  return String(value ?? '').trim()
}

function getMiddleInitial(value) {
  const normalized = trimText(value)
  if (!normalized) return ''

  const firstToken = normalized
    .split(/[\s.-]+/)
    .map((part) => part.trim())
    .find(Boolean)

  const firstCharacter = String(firstToken || normalized)
    .replace(/[^A-Za-z0-9]/g, '')
    .charAt(0)

  return firstCharacter ? `${firstCharacter.toUpperCase()}.` : ''
}

function formatEmployeeNameFromParts(surname, firstname, middlename = '') {
  const cleanSurname = trimText(surname)
  const cleanFirstname = trimText(firstname)
  if (!cleanSurname || !cleanFirstname) return ''

  const formattedName = `${cleanSurname}, ${cleanFirstname}`
  const middleInitial = getMiddleInitial(middlename)
  return middleInitial ? `${formattedName} ${middleInitial}` : formattedName
}

function formatEmployeeNameFromRaw(value) {
  const rawName = trimText(value)
  if (!rawName) return ''

  if (rawName.includes(',')) {
    const [rawSurname, ...rawGivenNames] = rawName.split(',')
    const surname = trimText(rawSurname)
    const givenTokens = rawGivenNames
      .join(' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)

    const firstname = givenTokens[0] || ''
    const middlename = givenTokens.slice(1).join(' ')

    return formatEmployeeNameFromParts(surname, firstname, middlename) || rawName
  }

  const tokens = rawName
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
  if (tokens.length < 2) return rawName

  const firstname = tokens[0]
  const surname = tokens[tokens.length - 1]
  const middlename = tokens.slice(1, -1).join(' ')

  return formatEmployeeNameFromParts(surname, firstname, middlename) || rawName
}

function formatApplicationEmployeeName(application) {
  const formattedFromParts = formatEmployeeNameFromParts(
    application?.surname ?? application?.last_name ?? application?.lastName,
    application?.firstname ?? application?.first_name ?? application?.firstName,
    application?.middlename ?? application?.middle_name ?? application?.middleName,
  )
  if (formattedFromParts) return formattedFromParts

  const formattedFromEmployeeObject = formatEmployeeNameFromParts(
    application?.employee?.surname ?? application?.employee?.last_name ?? application?.employee?.lastName,
    application?.employee?.firstname ?? application?.employee?.first_name ?? application?.employee?.firstName,
    application?.employee?.middlename ?? application?.employee?.middle_name ?? application?.employee?.middleName,
  )
  if (formattedFromEmployeeObject) return formattedFromEmployeeObject

  const fallbackRawName =
    application?.employee_name ??
    application?.employeeName ??
    application?.employee?.full_name ??
    application?.employee?.employee_name ??
    application?.employee?.name ??
    application?.name ??
    application?.full_name ??
    ''

  return formatEmployeeNameFromRaw(fallbackRawName)
}

function normalizeBackendApplicationShape(application, index = 0) {
  if (!application || typeof application !== 'object') return null

  const normalizedLeaveType = String(application?.leave_type_name ?? application?.leaveType ?? '').trim()
  const normalizedLeaveTypeName =
    normalizedLeaveType || 'Unknown'
  const normalizedEmployeeName = formatApplicationEmployeeName(application) || 'Unknown'
  const normalizedFiledAt = String(
    application?.filed_at ??
      application?.created_at ??
      application?.date_filed ??
      application?.dateFiled ??
      '',
  ).trim() || null
  const normalizedCreatedAt = String(
    application?.created_at ??
      normalizedFiledAt ??
      '',
  ).trim() || null
  const normalizedDateFiled = (() => {
    const directValue = String(
      application?.date_filed ??
        application?.dateFiled ??
        normalizedFiledAt ??
        normalizedCreatedAt ??
        '',
    ).trim()
    if (!directValue) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(directValue)) return directValue
    return toIsoDateString(directValue) || directValue
  })()
  const rawStatusKey = String(
    application?.raw_status ?? application?.rawStatus ?? application?.status ?? '',
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
    : Array.isArray(application?.recallSelectedDates)
      ? [...application.recallSelectedDates]
      : null
  const normalizedHasPendingUpdateRequest = normalizeOptionalBackendFlag(
    application?.has_pending_update_request,
  )
  const normalizedHasHrReceived = normalizeOptionalBackendFlag(
    application?.has_hr_received,
  )
  const normalizedHasHrReleased = normalizeOptionalBackendFlag(
    application?.has_hr_released,
  )
  const normalizedCancelled = normalizeOptionalBackendFlag(
    application?.cancelled,
  )
  const normalizedReceivedBy = pickFirstDefinedValue(
    application?.received_by,
  )
  const normalizedReleasedBy = pickFirstDefinedValue(
    application?.released_by,
  )
  const normalizedCmoCbmoReviewedBy = pickFirstDefinedValue(
    application?.cmo_cbmo_reviewed_by,
    application?.cmoCbmoReviewedBy,
  )
  const normalizedReceivedAt = pickFirstDefinedValue(
    application?.received_at,
    application?.hr_received_at,
  )
  const normalizedCmoCbmoReviewedAt = pickFirstDefinedValue(
    application?.cmo_cbmo_reviewed_at,
    application?.cmoCbmoReviewedAt,
  )
  const normalizedReleasedAt = pickFirstDefinedValue(
    application?.released_at,
    application?.hr_released_at,
  )

  const normalized = {
    ...application,
    application_type: normalizedApplicationType || 'LEAVE',
    employee_name: normalizedEmployeeName,
    employeeName: normalizedEmployeeName,
    filed_by: application?.filed_by ?? null,
    admin_action_by: application?.admin_action_by ?? null,
    hr_action_by: application?.hr_action_by ?? null,
    recall_action_by: application?.recall_action_by ?? null,
    disapproved_by: application?.disapproved_by ?? null,
    cancelled_by: application?.cancelled_by ?? null,
    ...(normalizedCancelled === null ? {} : { cancelled: normalizedCancelled }),
    cancellation_reason: application?.cancellation_reason ?? null,
    processed_by: application?.processed_by ?? null,
    reviewed_at: application?.reviewed_at ?? null,
    admin_action_at: application?.admin_action_at ?? null,
    hr_action_at: application?.hr_action_at ?? null,
    recall_action_at: application?.recall_action_at ?? null,
    disapproved_at: application?.disapproved_at ?? null,
    cancelled_at: application?.cancelled_at ?? null,
    leave_type_name: normalizedLeaveTypeName,
    leaveType: normalizedLeaveTypeName,
    start_date: application?.start_date ?? application?.startDate ?? null,
    end_date: application?.end_date ?? application?.endDate ?? null,
    startDate: application?.startDate ?? application?.start_date ?? null,
    endDate: application?.endDate ?? application?.end_date ?? null,
    date_filed: normalizedDateFiled,
    dateFiled: normalizedDateFiled,
    filed_at: normalizedFiledAt,
    created_at: normalizedCreatedAt,
    rawStatus: rawStatusKey,
    raw_status: application?.raw_status ?? rawStatusKey,
    group_raw_status: String(application?.group_raw_status ?? '').trim().toUpperCase() || rawStatusKey,
    leave_type_id: application?.leave_type_id ?? null,
    selected_dates: Array.isArray(application?.selected_dates) ? [...application.selected_dates] : null,
    selected_date_pay_status: application?.selected_date_pay_status ?? null,
    selected_date_coverage: application?.selected_date_coverage ?? null,
    pending_update: application?.pending_update ?? null,
    pending_update_reason: application?.pending_update_reason ?? '',
    pending_update_action_type: application?.pending_update_action_type ?? null,
    pending_update_previous_status: application?.pending_update_previous_status ?? null,
    ...(normalizedHasPendingUpdateRequest === null
      ? {}
      : { has_pending_update_request: normalizedHasPendingUpdateRequest }),
    latest_update_request_status: application?.latest_update_request_status ?? '',
    latest_update_request_action_type: application?.latest_update_request_action_type ?? null,
    latest_update_request_payload: application?.latest_update_request_payload ?? null,
    latest_update_request_reason: application?.latest_update_request_reason ?? '',
    latest_update_request_previous_status: application?.latest_update_request_previous_status ?? null,
    latest_update_requested_at: application?.latest_update_requested_at ?? null,
    latest_update_reviewed_at: application?.latest_update_reviewed_at ?? null,
    latest_update_review_remarks: application?.latest_update_review_remarks ?? '',
    recall_selected_dates: normalizedRecallSelectedDates,
    recallSelectedDates: normalizedRecallSelectedDates,
    leave_balances: normalizedLeaveBalances,
    leaveBalance: Number.isFinite(Number(application?.leaveBalance))
      ? Number(application.leaveBalance)
      : null,
    pay_mode: application?.pay_mode ?? null,
    ...(normalizedHasHrReceived === null ? {} : { has_hr_received: normalizedHasHrReceived }),
    ...(normalizedHasHrReleased === null ? {} : { has_hr_released: normalizedHasHrReleased }),
    ...(normalizedReceivedBy === null ? {} : { received_by: normalizedReceivedBy }),
    ...(normalizedReceivedAt === null ? {} : { received_at: normalizedReceivedAt }),
    ...(normalizedCmoCbmoReviewedBy === null
      ? {}
      : { cmo_cbmo_reviewed_by: normalizedCmoCbmoReviewedBy }),
    ...(normalizedCmoCbmoReviewedAt === null
      ? {}
      : { cmo_cbmo_reviewed_at: normalizedCmoCbmoReviewedAt }),
    ...(normalizeOptionalBackendFlag(application?.has_cmo_cbmo_reviewed) === null
      ? {}
      : { has_cmo_cbmo_reviewed: normalizeOptionalBackendFlag(application?.has_cmo_cbmo_reviewed) }),
    ...(normalizedReleasedBy === null ? {} : { released_by: normalizedReleasedBy }),
    ...(normalizedReleasedAt === null ? {} : { released_at: normalizedReleasedAt }),
    attachment_reference: application?.attachment_reference ?? null,
    attachment_submitted: isTruthyBackendFlag(application?.attachment_submitted),
    office: application?.office ?? null,
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

function getCocReleaseStageStatus(app) {
  if (!app || !isCocApplication(app)) return ''

  const rawStatus = getApplicationRawStatusKey(app)
  if (rawStatus === 'PENDING_LATE_HR') return 'Pending Late Filing'
  if (rawStatus === 'PENDING_ADMIN') return 'Department Recommendation'
  if (rawStatus === 'PENDING_HR') return 'CHRMO Certification'
  if (rawStatus !== 'APPROVED') return ''

  if (isApplicationReleased(app)) {
    return 'Approved'
  }
  if (isApplicationCmoCbmoReviewed(app)) return 'Pending Release'
  if (isApplicationReceivedByHr(app)) return 'CMO/CVMO Review'
  return 'CHRMO Certification'
}

function normalizeQueueStageKeyToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
}

function getApplicationQueueStageKey(app) {
  const candidates = [
    app?.queue_stage_key,
    app?.queueStageKey,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeQueueStageKeyToken(candidate)
    if (normalized) return normalized
  }

  return ''
}

function isPendingUpdateWorkflowCycle(app) {
  if (!app || isCocApplication(app)) return false
  if (!isEditUpdateRequest(app)) return false
  return getLatestUpdateRequestStatus(app) === 'PENDING'
}

function isApprovedUpdateWorkflowCycle(app) {
  if (!app || isCocApplication(app)) return false
  if (!isEditUpdateRequest(app)) return false
  return getLatestUpdateRequestStatus(app) === 'APPROVED'
}

function getLeaveWorkflowStageStatus(app) {
  if (!app || isCocApplication(app)) return ''

  const queueStageKey = getApplicationQueueStageKey(app)
  if (queueStageKey === 'PENDING_ADMIN') return 'Department Recommendation'
  if (queueStageKey === 'PENDING_ADMIN_REVIEW') return 'Department Recommendation'
  if (queueStageKey === 'PENDING_HR_RECEIVE') {
    if (isApplicationReceivedByHr(app)) {
      return isPendingUpdateWorkflowCycle(app) ? 'Pending Update Review' : 'CHRMO Certification'
    }
    return isPendingUpdateWorkflowCycle(app) ? 'Pending Update Receive' : 'Pending Receive'
  }
  if (queueStageKey === 'PENDING_HR_REVIEW') {
    return isPendingUpdateWorkflowCycle(app) ? 'Pending Update Review' : 'CHRMO Certification'
  }
  if (queueStageKey === 'PENDING_CMO_CBMO_REVIEW') {
    if (isApplicationCmoCbmoReviewed(app)) return 'Pending Release'
    return 'CMO/CVMO Review'
  }
  if (queueStageKey === 'PENDING_RELEASE') {
    return isApprovedUpdateWorkflowCycle(app) ? 'Pending Update Release' : 'Pending Release'
  }

  const rawStatus = getApplicationRawStatusKey(app)
  if (rawStatus === 'PENDING_ADMIN') return 'Department Recommendation'
  if (rawStatus === 'PENDING_HR') {
    if (isApplicationReceivedByHr(app)) {
      return isPendingUpdateWorkflowCycle(app) ? 'Pending Update Review' : 'CHRMO Certification'
    }
    return isPendingUpdateWorkflowCycle(app) ? 'Pending Update Receive' : 'Pending Receive'
  }
  if (rawStatus === 'APPROVED') {
    if (isApplicationReleased(app)) return 'Approved'
    if (isApprovedUpdateWorkflowCycle(app)) return 'Pending Update Release'
    return isApplicationCmoCbmoReviewed(app) ? 'Pending Release' : 'CMO/CVMO Review'
  }

  return ''
}

function mergeStatus(app) {
  const cocReleaseStageStatus = getCocReleaseStageStatus(app)
  if (cocReleaseStageStatus) return cocReleaseStageStatus

  if (isCancelledByUser(app)) return 'Cancelled'

  const raw = getApplicationRawStatusKey(app)
  const status = String(app.status || '').toUpperCase()
  const normalizedStatus = status.replace(/[_-]+/g, ' ')

  const leaveWorkflowStageStatus = getLeaveWorkflowStageStatus(app)
  if (leaveWorkflowStageStatus) return leaveWorkflowStageStatus

  if (raw === 'PENDING_ADMIN' || normalizedStatus.includes('PENDING ADMIN')) {
    return 'Department Recommendation'
  }
  if (raw === 'PENDING_HR' || normalizedStatus.includes('PENDING HR')) return 'CHRMO Certification'

  if (raw.includes('PENDING') || normalizedStatus.includes('PENDING')) return 'Pending'
  if (raw.includes('RECALLED') || normalizedStatus.includes('RECALLED')) {
    return 'Recalled'
  }
  if (raw.includes('APPROVED') || status.includes('APPROVED')) return 'Approved'
  if (
    raw.includes('REJECTED') ||
    raw.includes('DISAPPROVED') ||
    status.includes('REJECTED') ||
    status.includes('DISAPPROVED')
  ) {
    return 'Disapproved'
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
    normalized === REQUEST_ACTION_RECALL ||
    normalized === 'RECALL_REQUEST' ||
    normalized === 'LEAVE_RECALL_REQUEST'
  ) {
    return REQUEST_ACTION_RECALL
  }

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
    payload?.request_kind,
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
      actionToken.includes('REQUEST_RECALL') ||
      actionToken.includes('RECALL_REQUEST') ||
      stageToken.includes('recall request') ||
      remarksToken.includes('recall request')
    ) {
      return REQUEST_ACTION_RECALL
    }

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
    app?.latest_update_request_action_type,
  ]

  for (const candidate of explicitCandidates) {
    const normalized = normalizeLeaveRequestActionTypeToken(candidate)
    if (normalized) return normalized
  }

  const payload = getPendingUpdatePayload(app)
  const payloadType = resolveLeaveRequestActionTypeFromPayload(payload)
  if (payloadType) return payloadType

  const workflowRemarks = normalizeStatusHistoryToken(app?.remarks || '')
  if (workflowRemarks.includes('recall request')) {
    return REQUEST_ACTION_RECALL
  }
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

function isRecallRequestAction(app) {
  return getLeaveRequestActionType(app) === REQUEST_ACTION_RECALL
}

function getEditRequestLabelPrefix(app) {
  if (isRecallRequestAction(app)) return 'Recall Request'
  return isCancellationRequestAction(app) ? 'Cancel Request' : 'Edit Request'
}

function getEditRequestStatusFieldLabel(app) {
  if (isRecallRequestAction(app)) return 'Recall Request Status'
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
    app?.latest_update_request_status ?? '',
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
  const rawStatus = getApplicationRawStatusKey(app)
  if (
    isCancelledByUser(app) ||
    rawStatus === 'RECALLED' ||
    rawStatus === 'REJECTED' ||
    rawStatus === 'DISAPPROVED'
  ) {
    return ''
  }

  const status = getLatestUpdateRequestStatus(app)
  const labelPrefix = getEditRequestLabelPrefix(app)
  const stageStatus = getLeaveWorkflowStageStatus(app)
  if (status === 'PENDING') {
    if (isRecallRequestAction(app)) {
      if (rawStatus === 'PENDING_ADMIN') return 'Department Recommendation'
      if (stageStatus === 'Pending Update Receive') return labelPrefix + ' Pending Receive'
      if (stageStatus === 'Pending Update Release') return labelPrefix + ' Pending Release'
      if (stageStatus === 'Pending Update Review') return labelPrefix + ' Pending HR'
      return 'Recall Request Pending HR'
    }

    if (isCancellationRequestAction(app)) {
      if (rawStatus === 'PENDING_ADMIN') return labelPrefix + ' Pending Admin'
      if (stageStatus === 'Pending Update Receive') return labelPrefix + ' Pending Receive'
      if (stageStatus === 'Pending Update Release') return labelPrefix + ' Pending Release'
      if (stageStatus === 'Pending Update Review') return labelPrefix + ' Pending HR'
      return labelPrefix + ' Pending'
    }
    if (!isCancellationRequestAction(app)) {
      if (rawStatus === 'PENDING_ADMIN') return 'Department Recommendation'
      if (stageStatus === 'Pending Update Receive') return labelPrefix + ' Pending Receive'
      if (stageStatus === 'Pending Update Release') return labelPrefix + ' Pending Release'
      if (stageStatus === 'Pending Update Review') return labelPrefix + ' Pending HR'
      return 'CHRMO Certification'
    }
  }
  if (status === 'APPROVED') {
    if (isCancellationRequestAction(app) && stageStatus === 'Pending Update Release') {
      return labelPrefix + ' Pending Release'
    }
    return labelPrefix + ' Approved'
  }
  if (status === 'REJECTED') return ''
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
  const badgeLabel = getEditRequestBadgeLabel(app)
  if (badgeLabel) return badgeLabel

  const status = getLatestUpdateRequestStatus(app)
  if (status === 'PENDING') {
    const rawStatus = getApplicationRawStatusKey(app)
    if (rawStatus === 'PENDING_HR') {
      const stageStatus = getLeaveWorkflowStageStatus(app)
      if (stageStatus === 'Pending Update Receive') return 'Edit Request Pending Receive'
      if (stageStatus === 'Pending Update Release') return 'Edit Request Pending Release'
      if (stageStatus === 'Pending Update Review') return 'Edit Request Pending HR'
      return 'CHRMO Certification'
    }
    if (rawStatus === 'PENDING_ADMIN') return 'Department Recommendation'
    return 'Pending Review'
  }
  if (status === 'APPROVED') return 'Approved'
  if (status === 'REJECTED') return 'Disapproved'
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

function formatBalanceValue(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return '0.000'
  return numericValue.toFixed(3)
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

function formatHoursAndMinutesDisplay(hoursValue) {
  const numericValue = Number(hoursValue)
  if (!Number.isFinite(numericValue) || numericValue <= 0) return '0h 00m'

  const totalMinutes = Math.max(0, Math.round(numericValue * 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

function calculateCocCreditableMinutes(minutesValue, breakMinutesValue = 0) {
  const rawMinutes = Number(minutesValue)
  if (!Number.isFinite(rawMinutes) || rawMinutes <= 0) return 0

  const breakMinutes = Number.isFinite(Number(breakMinutesValue))
    ? Math.max(0, Math.round(Number(breakMinutesValue)))
    : 0

  const netMinutes = Math.max(0, Math.round(rawMinutes) - breakMinutes)
  const wholeHoursMinutes = Math.floor(netMinutes / 60) * 60
  const excessMinutes = netMinutes % 60
  return Math.min(ctoStandardDayHours * 60, wholeHoursMinutes + (excessMinutes >= 20 ? excessMinutes : 0))
}

function getCocBaseCreditableDisplay(app) {
  if (!isCocApplication(app)) return getApplicationDurationDisplay(app)

  const rows = Array.isArray(app?.rows) ? app.rows : []
  if (rows.length) {
    const totalCreditableMinutes = rows.reduce((total, row) => {
      const explicitCreditableMinutes = Number(
        row?.creditable_minutes ?? row?.creditableMinutes,
      )

      if (Number.isFinite(explicitCreditableMinutes) && explicitCreditableMinutes >= 0) {
        return total + Math.round(explicitCreditableMinutes)
      }

      const rawMinutes = Number(
        row?.no_of_hours_and_minutes ??
        row?.minutes ??
        row?.total_no_of_coc_applied_minutes ??
        row?.totalNoOfCocAppliedMinutes,
      )
      const breakMinutes = Number(row?.break_minutes ?? row?.breakMinutes ?? 0)

      return total + calculateCocCreditableMinutes(rawMinutes, breakMinutes)
    }, 0)

    return formatHoursAndMinutesDisplay(totalCreditableMinutes / 60)
  }

  const rawMinutes = Number(
    app?.total_no_of_coc_applied_minutes ??
    app?.totalNoOfCocAppliedMinutes ??
    app?.total_minutes ??
    app?.totalMinutes,
  )

  if (Number.isFinite(rawMinutes) && rawMinutes >= 0) {
    const breakMinutes = rawMinutes >= 240 ? 60 : 0
    return formatHoursAndMinutesDisplay(
      calculateCocCreditableMinutes(rawMinutes, breakMinutes) / 60,
    )
  }

  return '0h 00m'
}

function getCocRawOvertimeDisplay(app) {
  if (!isCocApplication(app)) return getApplicationDurationDisplay(app)

  const rawMinutes = Number(
    app?.total_no_of_coc_applied_minutes ??
    app?.totalNoOfCocAppliedMinutes ??
    app?.total_minutes ??
    app?.totalMinutes,
  )

  if (Number.isFinite(rawMinutes) && rawMinutes >= 0) {
    return formatHoursAndMinutesDisplay(rawMinutes / 60)
  }

  const rawHours = Number(app?.days ?? app?.total_days)
  if (Number.isFinite(rawHours) && rawHours >= 0) {
    return formatHoursAndMinutesDisplay(rawHours)
  }

  return '0h 00m'
}

function getCocCreditedHoursDisplay(app) {
  if (!isCocApplication(app)) return ''

  const creditedHours = Number(app?.credited_hours ?? app?.creditedHours)
  if (Number.isFinite(creditedHours) && creditedHours >= 0) {
    return formatHoursAndMinutesDisplay(creditedHours)
  }

  const rawStatus = String(app?.rawStatus ?? app?.raw_status ?? '').trim().toUpperCase()
  if (rawStatus === 'PENDING_HR' || rawStatus === 'PENDING_ADMIN') {
    return 'Pending HR classification'
  }

  return 'N/A'
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

  if (isCocApplication(app)) {
    const creditedDisplay = getCocCreditedHoursDisplay(app)
    if (creditedDisplay && creditedDisplay !== 'Pending HR classification' && creditedDisplay !== 'N/A') {
      return creditedDisplay
    }

    return getCocBaseCreditableDisplay(app)
  }

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

function formatGroupedInclusiveDateLines(dateValues, expandConsecutiveDays = false) {
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
        dayLabel = endDay === startDay + 1
          ? `${startDay}, ${endDay}`
          : `${startDay}-${endDay}`
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

function formatCoverageAwareInclusiveDateLines(indicatorRows, expandConsecutiveDays = false) {
  if (!Array.isArray(indicatorRows) || indicatorRows.length === 0) return []

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

  for (const entry of indicatorRows) {
    const coverageLabel = String(entry?.coverageLabel || '').trim()
    if (!coverageLabel.startsWith('Half Day')) {
      wholeDayDateSet.push(entry?.dateKey)
      continue
    }

    appendWholeDayLines()

    const dateText = String(entry?.dateText || '').trim()
    const halfDayPortion = String(entry?.halfDayPortion || '').trim().toUpperCase()
    lines.push(
      halfDayPortion === 'AM' || halfDayPortion === 'PM'
        ? `${dateText} (${halfDayPortion})`
        : `${dateText} (Half Day)`,
    )
  }

  appendWholeDayLines()

  return lines
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

function extractIsoDateKeysFromMap(valueMap = {}) {
  if (!valueMap || typeof valueMap !== 'object') return []

  const dateKeys = []
  for (const rawKey of Object.keys(valueMap)) {
    const key = String(rawKey || '').trim()
    if (!key || /^\d+$/.test(key)) continue

    const isoKey = toIsoDateString(key)
    if (isoKey) dateKeys.push(isoKey)
  }

  return normalizeIsoDateList(dateKeys)
}

function resolveDateSetFromSource(source) {
  if (!source || typeof source !== 'object') return []

  const selectedDates = normalizeIsoDateList(parseSelectedDatesValue(source?.selected_dates))
  if (selectedDates.length > 0) return selectedDates

  const payStatusDateKeys = extractIsoDateKeysFromMap(
    toSelectedDatePayStatusMap(source?.selected_date_pay_status ?? source?.selectedDatePayStatus),
  )
  const coverageDateKeys = extractIsoDateKeysFromMap(
    toSelectedDateCoverageMap(source?.selected_date_coverage ?? source?.selectedDateCoverage),
  )
  const halfDayPortionDateKeys = extractIsoDateKeysFromMap(
    toSelectedDateHalfDayPortionMap(
      source?.selected_date_half_day_portion ??
        source?.selectedDateHalfDayPortion ??
        source?.selected_date_half_day_period ??
        source?.selectedDateHalfDayPeriod ??
        source?.selected_date_halfday_period,
    ),
  )

  const mappedDateKeys = normalizeIsoDateList([
    ...payStatusDateKeys,
    ...coverageDateKeys,
    ...halfDayPortionDateKeys,
  ])
  if (mappedDateKeys.length > 0) return mappedDateKeys

  const startDate = source?.startDate ?? source?.start_date ?? null
  const endDate = source?.endDate ?? source?.end_date ?? null
  if (!startDate && !endDate) return []

  const firstDate = startDate || endDate
  const lastDate = endDate || startDate
  return enumerateInclusiveDateRange(firstDate, lastDate)
}

function hasApprovedUpdateAppliedAfterRecall(source) {
  if (!source || typeof source !== 'object') return false

  const latestUpdateStatus = normalizeUpdateRequestStatus(
    source?.latest_update_request_status ?? source?.latestUpdateRequestStatus,
  )
  if (latestUpdateStatus !== 'APPROVED') return false

  const recallTimestamp = toComparableTimestamp(
    source?.recall_action_at ?? source?.recallActionAt,
  )
  const latestUpdateReviewedTimestamp = toComparableTimestamp(
    source?.latest_update_reviewed_at ??
      source?.latestUpdateReviewedAt ??
      source?.latest_update_requested_at ??
      source?.latestUpdateRequestedAt,
  )

  if (Number.isNaN(recallTimestamp) || Number.isNaN(latestUpdateReviewedTimestamp)) return false

  return latestUpdateReviewedTimestamp > recallTimestamp
}

function getStoredRecallDateKeys(source) {
  if (!source || typeof source !== 'object') return []

  let recalledDates = normalizeIsoDateList(
    parseSelectedDatesValue(source?.recall_selected_dates ?? source?.recallSelectedDates),
  )

  if (!recalledDates.length) return []

  const selectedDates = resolveDateSetFromSource(source)
  if (selectedDates.length && hasApprovedUpdateAppliedAfterRecall(source)) {
    const selectedDateSet = new Set(selectedDates)
    recalledDates = recalledDates.filter((dateKey) => !selectedDateSet.has(dateKey))
  }

  if (!recalledDates.length) return []
  if (!selectedDates.length) return recalledDates

  const selectedDateSet = new Set(selectedDates)
  const intersectedDates = recalledDates.filter((dateKey) => selectedDateSet.has(dateKey))
  return intersectedDates.length > 0 ? intersectedDates : recalledDates
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
    app?.latest_update_request_reason,
    pendingPayload?.cancel_reason,
    pendingPayload?.reason,
  ]

  for (const candidate of candidates) {
    const normalized = String(candidate || '').trim()
    if (!normalized) continue
    return normalized
  }

  return ''
}

function hasApplicationEditRequest(app) {
  if (!app || typeof app !== 'object') return false
  if (isCocApplication(app)) return false
  return hasEditRequestSignal(app)
}

function isApplicationEditCancellationRequest(app) {
  if (!hasApplicationEditRequest(app)) return false
  return isCancellationRequestAction(app)
}

function getApplicationEditRequestSectionTitle(app) {
  return isApplicationEditCancellationRequest(app)
    ? 'Cancellation Request Details'
    : 'Requested Changes'
}

function shouldShowApplicationEditRequestDateComparison(app) {
  return hasApplicationEditRequest(app) && !isApplicationEditCancellationRequest(app)
}

function shouldShowApplicationEditRequestSection(app) {
  if (!hasApplicationEditRequest(app)) return false
  return true
}

function getApplicationEditRequestFromDates(app) {
  if (!hasApplicationEditRequest(app)) return 'N/A'

  const indicatorRows = getSelectedDatePayStatusRows(app)
  if (
    indicatorRows.length &&
    indicatorRows.some((entry) => String(entry?.coverageLabel || '').startsWith('Half Day'))
  ) {
    return formatCoverageAwareInclusiveDateLines(
      indicatorRows,
      isAbroadLeaveApplication(app),
    ).join(', ')
  }

  const payload = getPendingUpdatePayload(app)
  if (payload && typeof payload === 'object') {
    const previousDates = payload.previous_selected_dates || payload.previousSelectedDates
    if (Array.isArray(previousDates) && previousDates.length > 0) {
      const expandConsecutiveDays = isAbroadLeaveApplication(app)
      const formatted = formatGroupedInclusiveDateLines(previousDates, expandConsecutiveDays)
      if (formatted.length > 0) return formatted.join(', ')
    }
    if (payload.previous_start_date || payload.previousStartDate) {
      const startDate = payload.previous_start_date || payload.previousStartDate
      const endDate = payload.previous_end_date || payload.previousEndDate || startDate
      const dates = enumerateInclusiveDateRange(startDate, endDate)
      if (dates.length > 0) {
        const expandConsecutiveDays = isAbroadLeaveApplication(app)
        const formatted = formatGroupedInclusiveDateLines(dates, expandConsecutiveDays)
        if (formatted.length > 0) return formatted.join(', ')
      }
    }
  }

  const updateRequests = Array.isArray(app?.update_requests)
    ? app.update_requests
    : (Array.isArray(app?.updateRequests) ? app.updateRequests : [])
  for (const req of updateRequests) {
    const reqPayload = req?.requested_payload || req?.payload
    if (reqPayload && typeof reqPayload === 'object') {
      const pDates = reqPayload.previous_selected_dates || reqPayload.previousSelectedDates
      if (Array.isArray(pDates) && pDates.length > 0) {
        const expandConsecutiveDays = isAbroadLeaveApplication(app)
        const formatted = formatGroupedInclusiveDateLines(pDates, expandConsecutiveDays)
        if (formatted.length > 0) return formatted.join(', ')
      }
    }
  }

  const inclusiveDateLines = getApplicationInclusiveDateLines(app)
  return inclusiveDateLines.length ? inclusiveDateLines.join(', ') : 'N/A'
}

function getApplicationEditRequestToDates(app) {
  if (!hasApplicationEditRequest(app)) return 'N/A'

  const requestedDateLines = getPendingUpdateInclusiveDateLines(app)
  return requestedDateLines.length ? requestedDateLines.join(', ') : 'N/A'
}

function getApplicationEditRequestCurrentDuration(app) {
  if (!hasApplicationEditRequest(app)) return 'N/A'

  const payload = getPendingUpdatePayload(app)
  if (payload && typeof payload === 'object') {
    const previousDays = payload.previous_total_days ?? payload.previousTotalDays
    if (Number.isFinite(Number(previousDays)) && Number(previousDays) > 0) {
      return `${formatDayValue(previousDays)} day(s)`
    }
  }

  const updateRequests = Array.isArray(app?.update_requests)
    ? app.update_requests
    : (Array.isArray(app?.updateRequests) ? app.updateRequests : [])
  for (const req of updateRequests) {
    const reqPayload = req?.requested_payload || req?.payload
    if (reqPayload && typeof reqPayload === 'object') {
      const pDays = reqPayload.previous_total_days ?? reqPayload.previousTotalDays
      if (Number.isFinite(Number(pDays)) && Number(pDays) > 0) {
        return `${formatDayValue(pDays)} day(s)`
      }
    }
  }

  return getApplicationDurationDisplay(app) || 'N/A'
}

function getApplicationEditRequestRequestedDuration(app) {
  if (!hasApplicationEditRequest(app)) return 'N/A'
  return getRequestedDurationDisplay(app) || 'N/A'
}

function getApplicationEditRequestRequestedAt(app) {
  if (!hasApplicationEditRequest(app)) return 'N/A'

  const requestedAt = app?.latest_update_requested_at || app?.updated_at || null
  return formatDateTime(requestedAt) || 'N/A'
}

function getApplicationEditRequestReason(app) {
  if (!hasApplicationEditRequest(app)) return 'N/A'

  const reason = String(getPendingUpdateReason(app) || '').trim()
  return reason || 'N/A'
}

function getDetailsRemarksRows(app) {
  if (!app || typeof app !== 'object') return []
  if (!shouldShowDetailsRemarks(app)) return []

  const rows = []
  const pendingUpdateReason = getPendingUpdateReason(app)
  if (pendingUpdateReason) {
    const requestLabel = isRecallRequestAction(app)
      ? 'Recall Request'
      : isCancellationRequestAction(app)
        ? 'Cancellation Request'
        : 'Update Request'

    rows.push({
      label: requestLabel,
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

function shouldShowDetailsRemarks(app) {
  if (!app || typeof app !== 'object' || isCocApplication(app)) return false
  if (isCancelledByUser(app)) return true

  const rawStatus = getApplicationRawStatusKey(app)
  return rawStatus === 'REJECTED' || rawStatus === 'DISAPPROVED' || rawStatus === 'RECALLED'
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

function resolveApplicationLeaveTypeCategory(app) {
  const categoryCandidates = [
    app?.leave_type_category,
    app?.leaveTypeCategory,
    app?.category,
    app?.leave_type?.category,
    app?.leaveType?.category,
    app?.leave_type_detail?.category,
    app?.leaveTypeDetail?.category,
    app?.leave_type_info?.category,
    app?.leaveTypeInfo?.category,
    app?.leave_type_definition?.category,
    app?.leaveTypeDefinition?.category,
  ]

  for (const candidate of categoryCandidates) {
    const normalizedCategory = String(candidate || '').trim().toUpperCase()
    if (normalizedCategory) return normalizedCategory
  }

  return ''
}

function isEventBasedLeaveType(value) {
  const typeKey = normalizeLeaveBalanceLookupKey(value)
  if (!typeKey) return false
  return EVENT_BASED_LEAVE_TYPES.some(
    (label) => normalizeLeaveBalanceLookupKey(label) === typeKey,
  )
}

function getEmployeeBalanceLookupKey(app) {
  const explicitKey = app?.employee_control_no
  if (explicitKey !== undefined && explicitKey !== null && String(explicitKey).trim() !== '') {
    return String(explicitKey).trim().toLowerCase()
  }

  const nameKey = [app?.surname, app?.firstname, app?.middlename, app?.employee_name]
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
    const dateA = Date.parse(a?.filed_at || a?.created_at || '') || 0
    const dateB = Date.parse(b?.filed_at || b?.created_at || '') || 0
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

  const directBalanceCandidates = [app?.leaveBalance]

  for (const candidate of directBalanceCandidates) {
    const directBalance = Number(candidate)
    if (Number.isFinite(directBalance)) return directBalance
  }

  return null
}

function getCurrentLeaveBalanceDisplay(app) {
  const value = getCurrentLeaveBalanceValue(app)
  return value !== null ? `${formatBalanceValue(value)} day(s)` : 'N/A (non-credit)'
}

function getCurrentLeaveBalanceClass(app) {
  const balance = getCurrentLeaveBalanceValue(app)
  const requiredDays = Number(app?.days)
  if (balance === null || !Number.isFinite(requiredDays) || requiredDays <= 0) return 'text-green-8'
  return balance < requiredDays ? 'text-negative' : 'text-green-8'
}

function shouldShowCurrentLeaveBalance(app) {
  if (!app) return false
  if (isCocApplication(app)) return true

  const leaveTypeCategory = resolveApplicationLeaveTypeCategory(app)
  if (leaveTypeCategory === 'EVENT') return false

  const leaveTypeLabel =
    getCurrentLeaveTypeLabel(app) ||
    app?.leaveType ||
    app?.leave_type_name ||
    ''

  return !isEventBasedLeaveType(leaveTypeLabel)
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

  const directCandidates = [app?.cto_deducted_hours]

  for (const candidate of directCandidates) {
    const resolvedHours = roundCtoHours(candidate)
    if (resolvedHours !== null) return resolvedHours
  }

  const dayCandidates = [
    app?.deductible_days,
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

  const balanceValue = getCurrentLeaveBalanceValue(app)
  return resolveCtoHoursFromDays(balanceValue)
}

function getCurrentCtoAvailableHoursDisplay(app) {
  const availableHours = getCurrentCtoAvailableHoursValue(app)
  return availableHours !== null ? `${formatBalanceValue(availableHours)} hour(s)` : 'N/A'
}

function getCtoDeductedHoursDisplay(app) {
  if (!isCtoLeaveApplication(app)) return 'N/A'

  const rawStatus = getApplicationRawStatusKey(app)
  if (rawStatus !== 'APPROVED' && rawStatus !== 'RECALLED') {
    return 'Pending approval'
  }

  return getApplicationCtoRequiredHoursDisplay(app)
}

function getPendingUpdateInclusiveDateLines(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || payload.is_monetization) return []

  const requestedIndicatorRows = getPendingUpdateDatePayStatusRows(app)
  if (
    requestedIndicatorRows.length &&
    requestedIndicatorRows.some((entry) => String(entry?.coverageLabel || '').startsWith('Half Day'))
  ) {
    return formatCoverageAwareInclusiveDateLines(requestedIndicatorRows)
  }

  const requestedDateSet = resolveDateSetFromSource(payload)
  if (!requestedDateSet.length) return []

  const groupedRequestedDates = formatGroupedInclusiveDateLines(requestedDateSet)
  return groupedRequestedDates.length ? groupedRequestedDates : requestedDateSet
}

function hasPendingDateUpdate(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || typeof payload !== 'object' || payload.is_monetization) return false

  const requestedIndicatorRows = getPendingUpdateDatePayStatusRows(app)
  if (requestedIndicatorRows.length) return true

  const requestedDateSet = resolveDateSetFromSource(payload)
  return requestedDateSet.length > 0
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
  return String(payload?.reason ?? '').trim()
}

function normalizeReasonForCompare(value) {
  return String(value || '').trim()
}

function getCurrentReasonDisplay(app) {
  const currentReason = normalizeReasonForCompare(app?.reason)
  return currentReason || 'N/A'
}

function getCocNatureOfOvertimeLines(app) {
  if (!isCocApplication(app)) return []

  const rows = Array.isArray(app?.rows) ? app.rows : []
  const lines = rows
    .map((row) => String(row?.nature_of_overtime ?? row?.natureOfOvertime ?? '').trim())
    .filter(Boolean)

  return [...new Set(lines)]
}

function getRequestedReasonDisplay(app) {
  const requestedReason = normalizeReasonForCompare(getRequestedReasonValue(app))
  return requestedReason || 'N/A'
}

function hasPendingReasonUpdate(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || typeof payload !== 'object') return false

  const hasReasonField = Object.prototype.hasOwnProperty.call(payload, 'reason')
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

  const indicatorRows = getSelectedDatePayStatusRows(app)
  if (
    indicatorRows.length &&
    indicatorRows.some((entry) => String(entry?.coverageLabel || '').startsWith('Half Day'))
  ) {
    return formatCoverageAwareInclusiveDateLines(
      indicatorRows,
      isAbroadLeaveApplication(app),
    )
  }

  const dateSet = getVisibleDateSetForDisplay(app)
  if (dateSet.length > 0) {
    const groupedDates = formatGroupedInclusiveDateLines(dateSet, isAbroadLeaveApplication(app))
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

function hasLeaveWorkflowReleaseSignals(app) {
  if (!app || typeof app !== 'object') return false

  const signalKeys = [
    'has_hr_received',
    'has_hr_released',
    'received_at',
    'released_at',
    'hr_received_at',
    'hr_released_at',
    'status_history',
  ]

  return signalKeys.some((key) => {
    if (!Object.prototype.hasOwnProperty.call(app, key)) return false
    const value = app?.[key]
    if (value === null || value === undefined) return false
    if (typeof value === 'string' && value.trim() === '') return false
    if (Array.isArray(value) && value.length === 0) return false
    return true
  })
}

async function fetchWorkflowDetailSnapshotsForApprovedLeaveRows(applications = []) {
  const stageSensitiveLeaveRows = (Array.isArray(applications) ? applications : []).filter((application) => {
    if (!application || typeof application !== 'object') return false
    if (isCocApplication(application)) return false
    const rawStatus = getApplicationRawStatusKey(application)
    if (rawStatus !== 'APPROVED' && rawStatus !== 'PENDING_HR') return false
    if (hasLeaveWorkflowReleaseSignals(application)) return false
    return true
  })

  if (!stageSensitiveLeaveRows.length) return []

  const detailRequests = stageSensitiveLeaveRows.map(async (application) => {
    const id = String(getApplicationId(application) ?? '').trim()
    if (!id) return null

    try {
      const response = await api.get('/hr/leave-applications/' + id)
      return normalizeBackendApplicationShape(
        extractSingleApplicationFromPayload(response?.data),
      )
    } catch {
      return null
    }
  })

  const detailRows = await Promise.all(detailRequests)
  return detailRows.filter((application) => application && typeof application === 'object')
}

function getApplicationStatusLabel(app) {
  if (isCancelledByUser(app)) return 'Cancelled'

  const cocReleaseStageStatus = getCocReleaseStageStatus(app)
  if (cocReleaseStageStatus) return cocReleaseStageStatus

  if (app?.displayStatus) return app.displayStatus
  const mergedStatus = mergeStatus(app)
  if (mergedStatus) return mergedStatus
  if (app?.status) return app.status
  return ''
}

function normalizeQueueGroupStatusToken(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  if (normalized === 'PENDING') return 'PENDING'
  if (normalized === 'APPROVED') return 'APPROVED'
  if (normalized === 'REJECTED' || normalized === 'DISAPPROVED') return 'REJECTED'
  if (normalized === 'RECALLED') return 'RECALLED'
  return ''
}

function resolveQueueGroupStatusForDisplay(app) {
  if (!isCocApplication(app) && getLatestUpdateRequestStatus(app) === 'REJECTED') {
    return 'REJECTED'
  }

  const explicitQueueGroupStatus = normalizeQueueGroupStatusToken(
    app?.queue_group_status ?? app?.queueGroupStatus,
  )
  if (explicitQueueGroupStatus) return explicitQueueGroupStatus

  const rawStatus = getApplicationRawStatusKey(app)
  if (rawStatus === 'RECALLED') return 'RECALLED'
  if (rawStatus === 'REJECTED' || rawStatus === 'DISAPPROVED') return 'REJECTED'
  if (rawStatus === 'APPROVED') return isApplicationReleased(app) ? 'APPROVED' : 'PENDING'
  if (rawStatus.includes('PENDING')) return 'PENDING'

  const mergedStatus = String(getApplicationStatusLabel(app) || '').toUpperCase()
  if (mergedStatus.includes('RECALL')) return 'RECALLED'
  if (mergedStatus.includes('REJECT') || mergedStatus.includes('DISAPPROV')) return 'REJECTED'
  if (mergedStatus.includes('APPROV')) return 'APPROVED'
  if (mergedStatus.includes('PENDING')) return 'PENDING'

  return 'OTHER'
}

function resolveQueueStagePriorityForDisplay(app) {
  const explicitStagePriority = Number(app?.queue_stage_priority ?? app?.queueStagePriority)
  if (Number.isFinite(explicitStagePriority) && explicitStagePriority > 0) {
    return explicitStagePriority
  }

  const queueStagePriorityMap = {
    PENDING_LATE_HR: 1,
    PENDING_HR_RECEIVE: 2,
    PENDING_HR_REVIEW: 3,
    PENDING_HR_CLASSIFICATION: 4,
    PENDING_ADMIN: 5,
    PENDING_ADMIN_REVIEW: 6,
    PENDING_CMO_CBMO_REVIEW: 7,
    PENDING_RELEASE: 8,
    PENDING: 9,
  }

  const queueStageKey = normalizeQueueStageKeyToken(app?.queue_stage_key ?? app?.queueStageKey)
  if (queueStagePriorityMap[queueStageKey] !== undefined) {
    return queueStagePriorityMap[queueStageKey]
  }

  const rawStatus = getApplicationRawStatusKey(app)
  if (rawStatus === 'PENDING_LATE_HR') return queueStagePriorityMap.PENDING_LATE_HR
  if (rawStatus === 'PENDING_ADMIN') {
    return isPendingEditRequest(app)
      ? queueStagePriorityMap.PENDING_ADMIN_REVIEW
      : queueStagePriorityMap.PENDING_ADMIN
  }
  if (rawStatus === 'PENDING_HR') {
    return isApplicationReceivedByHr(app)
      ? queueStagePriorityMap.PENDING_HR_REVIEW
      : queueStagePriorityMap.PENDING_HR_RECEIVE
  }
  if (rawStatus === 'APPROVED' && !isApplicationReleased(app)) {
    return isApplicationCmoCbmoReviewed(app)
      ? queueStagePriorityMap.PENDING_RELEASE
      : queueStagePriorityMap.PENDING_CMO_CBMO_REVIEW
  }
  if (rawStatus.includes('PENDING')) return queueStagePriorityMap.PENDING

  return queueStagePriorityMap.PENDING
}

function resolveQueueTimestampForDisplay(app) {
  const candidates = [app?.created_at, app?.filed_at, app?.dateFiled, app?.date_filed]
  for (const candidate of candidates) {
    const timestamp = Date.parse(String(candidate || '').trim())
    if (Number.isFinite(timestamp)) return timestamp
  }
  return Number.POSITIVE_INFINITY
}

function compareApplicationsByTimestampAsc(a, b) {
  const timestampDiff = resolveQueueTimestampForDisplay(a) - resolveQueueTimestampForDisplay(b)
  if (timestampDiff !== 0) return timestampDiff

  const idA = Number(a?.id)
  const idB = Number(b?.id)
  const normalizedIdA = Number.isFinite(idA) ? idA : Number.MAX_SAFE_INTEGER
  const normalizedIdB = Number.isFinite(idB) ? idB : Number.MAX_SAFE_INTEGER
  if (normalizedIdA !== normalizedIdB) return normalizedIdA - normalizedIdB

  return String(a?.application_uid || '').localeCompare(String(b?.application_uid || ''))
}

function compareApplicationsByTimestampDesc(a, b) {
  const timestampDiff = resolveQueueTimestampForDisplay(b) - resolveQueueTimestampForDisplay(a)
  if (timestampDiff !== 0) return timestampDiff

  const idA = Number(a?.id)
  const idB = Number(b?.id)
  const normalizedIdA = Number.isFinite(idA) ? idA : Number.MIN_SAFE_INTEGER
  const normalizedIdB = Number.isFinite(idB) ? idB : Number.MIN_SAFE_INTEGER
  if (normalizedIdA !== normalizedIdB) return normalizedIdB - normalizedIdA

  return String(b?.application_uid || '').localeCompare(String(a?.application_uid || ''))
}

function comparePendingApplicationsForQueue(a, b) {
  const stagePriorityDiff = resolveQueueStagePriorityForDisplay(a) - resolveQueueStagePriorityForDisplay(b)
  if (stagePriorityDiff !== 0) return stagePriorityDiff

  return compareApplicationsByTimestampAsc(a, b)
}

function groupApplicationsForDisplay(rows = []) {
  const groupedRows = {
    PENDING: [],
    APPROVED: [],
    REJECTED: [],
    RECALLED: [],
    OTHER: [],
  }

  ;(Array.isArray(rows) ? rows : []).forEach((row) => {
    const groupStatus = resolveQueueGroupStatusForDisplay(row)
    if (!groupedRows[groupStatus]) {
      groupedRows.OTHER.push(row)
      return
    }
    groupedRows[groupStatus].push(row)
  })

  groupedRows.PENDING.sort(comparePendingApplicationsForQueue)
  groupedRows.APPROVED.sort(compareApplicationsByTimestampDesc)
  groupedRows.REJECTED.sort(compareApplicationsByTimestampDesc)
  groupedRows.RECALLED.sort(compareApplicationsByTimestampDesc)

  return queueGroupRenderOrder.flatMap((groupStatus) => groupedRows[groupStatus] || [])
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

function normalizeDisapprovedStatusLabel(statusValue) {
  return String(statusValue || '').trim().replace(/rejected/gi, 'Disapproved')
}

function getApplicationSearchStatusLabel(app) {
  const updateRequestBadgeLabel = getEditRequestBadgeLabel(app)
  if (updateRequestBadgeLabel) {
    return normalizeDisapprovedStatusLabel(updateRequestBadgeLabel)
  }

  return normalizeDisapprovedStatusLabel(
    getApplicationStatusLabel(app) || app?.displayStatus,
  )
}

function getApplicationSearchTokenSet(app) {
  const dateTerms = getDateSearchValues(app?.filed_at || app?.created_at)
  const inclusiveDateTerms = getApplicationInclusiveDateLines(app)
  const hasEditRequest = hasApplicationEditRequest(app)
  const searchStatusLabel = getApplicationSearchStatusLabel(app)

  const searchValues = [
    'application',
    app?.id,
    searchStatusLabel,
    hasEditRequest ? '' : getApplicationRawStatusKey(app),
    hasEditRequest ? '' : app?.status,
    isCancelledByUser(app) ? 'cancelled' : '',
    app?.leaveType,
    app?.employee_name,
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
  const queryTokens = isServerPaginatedLeaveView ? [] : getSearchTokens(statusSearch.value)
  const rows = applications.value.filter((app) => {
    if (isCancelledByUser(app)) return false
    if (applicationTypeFilter.value && getApplicationType(app) !== applicationTypeFilter.value) {
      return false
    }
    if (pendingReceiveFilter.value && !canReceiveApplication(app)) {
      return false
    }
    if (pendingReleaseFilter.value && !canReleaseApplication(app)) {
      return false
    }
    if (!pendingReleaseFilter.value && !pendingReceiveFilter.value && canReleaseApplication(app)) {
      return false
    }
    const rawStatus = getApplicationRawStatusKey(app)
    const shouldHidePendingAdmin =
      rawStatus === 'PENDING_ADMIN' &&
      !isPendingEditRequest(app) &&
      !(applicationTypeFilter.value === 'COC' && getApplicationType(app) === 'COC')
    if (shouldHidePendingAdmin) return false
    return isServerPaginatedLeaveView || matchesEmploymentTypeFilter(app)
  })
  if (!queryTokens.length) return groupApplicationsForDisplay(rows)

  const filteredRows = rows.filter((app) => {
    const searchText = getApplicationSearchTokenSet(app)
    return queryTokens.every((token) => searchText.includes(token))
  })

  return groupApplicationsForDisplay(filteredRows)
})

const employeeColumn = { name: 'employee', label: 'Employee', align: 'left' }
const officeColumn = {
  name: 'office',
  label: 'Office',
  field: (row) => row.officeShort || row.office,
  align: 'left',
}
const leaveTypeColumn = {
  name: 'leaveType',
  label: 'Leave Type',
  field: (row) => {
    const rawLabel = String(row?.leaveType || '').trim()
    if (!rawLabel) return 'N/A'

    const prefixMatch = rawLabel.match(/^monetization\s*\((.*)\)\s*$/i)
    const suffixMatch = /\(monetization\)\s*$/i.test(rawLabel)
    const normalizedLeaveType = (prefixMatch ? prefixMatch[1] : rawLabel)
      .replace(/\s*\(monetization\)\s*$/i, '')
      .trim()

    if (!normalizedLeaveType) return 'N/A'
    if (row?.is_monetization || prefixMatch || suffixMatch) return `Monetization(${normalizedLeaveType})`

    return normalizedLeaveType
  },
  align: 'left',
}
const dateFiledColumn = {
  name: 'dateFiled',
  label: 'Date Filed',
  field: (row) => (row.dateFiled ? formatDate(row.dateFiled) : 'N/A'),
  align: 'left',
}
const lateDeadlineColumn = {
  name: 'lateDeadline',
  label: 'Late Filing Deadline',
  field: (row) => (row?.late_filing_deadline ? formatDate(row.late_filing_deadline) : 'N/A'),
  align: 'left',
}
const inclusiveDatesColumn = {
  name: 'inclusiveDates',
  label: 'Inclusive Dates',
  field: (row) => (row?.is_monetization ? 'N/A' : getApplicationDurationLabel(row)),
  align: 'left',
}
const durationColumn = {
  name: 'days',
  label: 'Duration',
  field: (row) => (row?.is_monetization ? 'N/A' : getApplicationDurationDisplay(row)),
  align: 'left',
}
const statusColumn = { name: 'status', label: 'Status', align: 'left' }
const actionsColumn = { name: 'actions', label: 'Actions', align: 'center' }
const cocEmployeeColumn = {
  ...employeeColumn,
  style: 'width: 27%',
  headerStyle: 'width: 27%',
}
const cocOfficeColumn = {
  ...officeColumn,
  style: 'width: 8%',
  headerStyle: 'width: 8%',
}
const cocLeaveTypeColumn = {
  ...leaveTypeColumn,
  style: 'width: 11%',
  headerStyle: 'width: 11%',
}
const cocDateFiledColumn = {
  ...dateFiledColumn,
  style: 'width: 10%',
  headerStyle: 'width: 10%',
}
const cocLateDeadlineColumn = {
  ...lateDeadlineColumn,
  style: 'width: 10%',
  headerStyle: 'width: 10%',
}
const cocInclusiveDatesColumn = {
  ...inclusiveDatesColumn,
  style: 'width: 11%',
  headerStyle: 'width: 11%',
}
const cocDurationColumn = {
  ...durationColumn,
  style: 'width: 8%',
  headerStyle: 'width: 8%',
}
const cocStatusColumn = {
  ...statusColumn,
  style: 'width: 11%',
  headerStyle: 'width: 11%',
}
const cocActionsColumn = {
  ...actionsColumn,
  style: 'width: 9%',
  headerStyle: 'width: 9%',
}

const columns = [
  employeeColumn,
  officeColumn,
  leaveTypeColumn,
  dateFiledColumn,
  inclusiveDatesColumn,
  durationColumn,
  statusColumn,
  actionsColumn,
]
const cocLateColumns = [
  cocEmployeeColumn,
  cocOfficeColumn,
  cocLeaveTypeColumn,
  cocDateFiledColumn,
  cocLateDeadlineColumn,
  cocInclusiveDatesColumn,
  cocDurationColumn,
  cocStatusColumn,
  cocActionsColumn,
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
  dateFiled: {
    style: 'min-width: 130px',
    headerStyle: 'min-width: 130px',
  },
}
const applicationTableColumns = computed(() => {
  const desktopColumns = applicationTypeFilter.value === 'COC' ? cocLateColumns : columns
  if (!q.screen.lt.sm) return desktopColumns

  const mobileColumnNames = applicationTypeFilter.value === 'COC'
    ? ['employee', 'status', 'office', 'dateFiled']
    : ['employee', 'status', 'office', 'leaveType']

  return mobileColumnNames
    .map((name) => {
      const column =
        desktopColumns.find((candidate) => candidate.name === name)
        || columns.find((candidate) => candidate.name === name)
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
const showApplicationEditAction = true
const recallDialogApplication = computed(() => recallTargetApp.value || selectedApp.value)

function canEditApplication(app) {
  if (!app || isCocApplication(app)) return false

  const editableStatuses = new Set(['PENDING_HR', 'APPROVED'])
  return editableStatuses.has(getApplicationRawStatusKey(app))
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
  return false
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

function mapApplicationsForPanel(applicationsForDisplay = []) {
  return normalizeBackendApplications(applicationsForDisplay).map((app, index) => {
    const normalized = normalizeBackendApplicationShape(app, index) || app
    return {
      ...normalized,
      application_type: getApplicationType(normalized),
      application_uid: normalized?.application_uid || getApplicationRowKey(normalized, index),
      employeeName: normalized?.employeeName || 'Unknown',
      officeShort: resolveOfficeAcronymLabel(normalized),
      displayStatus: mergeStatus(normalized),
    }
  })
}

function applyLeaveServerPagination(payload, requestedPage, requestedRowsPerPage) {
  const pagination = payload?.pagination && typeof payload.pagination === 'object'
    ? payload.pagination
    : {}

  tablePagination.value = {
    ...tablePagination.value,
    page: Number(pagination.current_page) || requestedPage,
    rowsPerPage: Number(pagination.per_page) || requestedRowsPerPage,
    rowsNumber: Math.max(Number(pagination.total) || 0, 0),
  }
}

async function fetchApplications(options = {}) {
  const requestSequence = ++applicationsRequestSequence
  const requestedPage = Math.max(Number(options?.page ?? tablePagination.value.page) || 1, 1)
  const requestedRowsPerPage = Math.max(
    Number(options?.rowsPerPage ?? tablePagination.value.rowsPerPage) || 10,
    1,
  )
  loading.value = true
  try {
    if (applicationTypeFilter.value === 'COC') {
      const [cocApplicationsResponse, cocLateResponse] = await Promise.all([
        applicationSourceFilter === 'late_filing'
          ? Promise.resolve(null)
          : api.get('/hr/coc-applications').catch(() => null),
        !applicationSourceFilter || applicationSourceFilter === 'late_filing'
          ? api.get('/hr/coc-applications/late-filings').catch(() => null)
          : Promise.resolve(null),
      ])

      const mergedCocApplications = mergeApplications(
        normalizeBackendApplications(extractApplicationsFromPayload(cocApplicationsResponse?.data)),
        normalizeBackendApplications(extractApplicationsFromPayload(cocLateResponse?.data)),
      )

      applications.value = mapApplicationsForPanel(mergedCocApplications)
      return
    }

    if (applicationTypeFilter.value === 'LEAVE') {
      const leaveApplicationsResponse = await api.get('/hr/leave-applications', {
        params: {
          page: requestedPage,
          per_page: requestedRowsPerPage,
          search: String(statusSearch.value || '').trim() || undefined,
          employment_type: employmentTypeFilter.value || undefined,
          pending_receive: pendingReceiveFilter.value ? 1 : undefined,
          pending_release: pendingReleaseFilter.value ? 1 : undefined,
        },
      })
      if (requestSequence !== applicationsRequestSequence) return

      const leaveApplications = normalizeBackendApplications(
        extractApplicationsFromPayload(leaveApplicationsResponse?.data),
      )
      const detailWorkflowSnapshots = await fetchWorkflowDetailSnapshotsForApprovedLeaveRows(
        leaveApplications,
      )
      const applicationsForDisplay = expandApplicationsForDisplay(
        detailWorkflowSnapshots.length > 0
          ? mergeApplications(leaveApplications, detailWorkflowSnapshots)
          : leaveApplications,
      )

      applications.value = mapApplicationsForPanel(applicationsForDisplay)
      applyLeaveServerPagination(
        leaveApplicationsResponse?.data,
        requestedPage,
        requestedRowsPerPage,
      )
      return
    }

    const [leaveApplicationsResponse, cocApplicationsResponse] =
      await Promise.all([
        api.get('/hr/leave-applications').catch(() => null),
        api.get('/hr/coc-applications').catch(() => null),
      ])

    const mergedApplications = mergeApplications(
      normalizeBackendApplications(extractApplicationsFromPayload(leaveApplicationsResponse?.data)),
      normalizeBackendApplications(extractApplicationsFromPayload(cocApplicationsResponse?.data)),
    )

    const detailWorkflowSnapshots = await fetchWorkflowDetailSnapshotsForApprovedLeaveRows(
      mergedApplications,
    )
    const mergedApplicationsWithWorkflowSnapshots = detailWorkflowSnapshots.length > 0
      ? mergeApplications(mergedApplications, detailWorkflowSnapshots)
      : mergedApplications
    const applicationsForDisplay = expandApplicationsForDisplay(
      mergedApplicationsWithWorkflowSnapshots,
    )

    applications.value = mapApplicationsForPanel(applicationsForDisplay)
  } catch (err) {
    if (requestSequence !== applicationsRequestSequence) return

    const msg = resolveApiErrorMessage(err, 'Unable to load applications right now.')
    q.notify({
      type: 'negative',
      message: msg,
      position: 'top',
    })
  } finally {
    if (requestSequence === applicationsRequestSequence) {
      loading.value = false
    }
  }
}

function handleTableRequest({ pagination } = {}) {
  if (!isServerPaginatedLeaveView) return

  return fetchApplications({
    page: pagination?.page,
    rowsPerPage: pagination?.rowsPerPage,
  })
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

  if (isServerPaginatedLeaveView) {
    fetchApplications({ page: 1 })
  }
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
  if (!app || typeof app !== 'object') return false

  const explicitCancelled = normalizeOptionalBackendFlag(app?.cancelled)
  if (explicitCancelled === true) return true

  if (app?.cancelled_at || app?.cancelled_by) return true

  const statusCandidates = [app?.status, app?.displayStatus]
  if (
    statusCandidates.some((value) => /\bcancelled\b/i.test(String(value || '').trim()))
  ) {
    return true
  }

  const remarksCandidates = [
    app?.remarks,
    app?.cancellation_reason,
    app?.rejection_reason,
  ]

  return remarksCandidates.some((value) => /^cancelled\b/i.test(String(value || '').trim()))
}

function getApplicationRawStatusKey(app) {
  if (app?.application_row_variant === 'recalled') {
    return 'RECALLED'
  }

  const normalizeStatusToken = (value) =>
    String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_')

  const groupedStatus = normalizeStatusToken(app?.group_raw_status)
  if (groupedStatus === 'RECALLED') return 'RECALLED'

  const candidates = [app?.rawStatus, app?.raw_status, app?.status]

  for (const candidate of candidates) {
    const normalized = normalizeStatusToken(candidate)
    if (!normalized) continue

    if (normalized === 'RECALLED' || normalized.includes('RECALL')) return 'RECALLED'
    if (
      normalized === 'REJECTED' ||
      normalized === 'DISAPPROVED' ||
      normalized.includes('DISAPPROV') ||
      normalized.includes('REJECT')
    ) {
      return 'REJECTED'
    }
    if (normalized.startsWith('PENDING')) return normalized
    if (normalized === 'APPROVED' || normalized.includes('APPROV')) return 'APPROVED'

    return normalized
  }

  return groupedStatus
}

function getApplicationStatusColor(app) {
  const cocReleaseStageStatus = getCocReleaseStageStatus(app)
  if (cocReleaseStageStatus === 'Approved' || cocReleaseStageStatus === 'Released') return 'positive'
  if (cocReleaseStageStatus === 'Pending Release' || cocReleaseStageStatus === 'Release') {
    return 'indigo-6'
  }
  if (cocReleaseStageStatus === 'CMO/CVMO Review') return 'deep-purple-6'
  if (cocReleaseStageStatus === 'CHRMO Certification') return 'blue-6'
  if (
    cocReleaseStageStatus === 'Department Recommendation' ||
    cocReleaseStageStatus === 'Admin Recommendation'
  ) {
    return 'warning'
  }

  const leaveWorkflowStageStatus = getLeaveWorkflowStageStatus(app)
  if (
    leaveWorkflowStageStatus === 'Department Recommendation' ||
    leaveWorkflowStageStatus === 'Admin Recommendation'
  ) {
    return 'warning'
  }
  if (leaveWorkflowStageStatus === 'Pending Update Receive') return 'teal-6'
  if (leaveWorkflowStageStatus === 'Pending Receive') return 'teal-6'
  if (leaveWorkflowStageStatus === 'Pending Update Review') return 'blue-6'
  if (leaveWorkflowStageStatus === 'CHRMO Certification') return 'blue-6'
  if (leaveWorkflowStageStatus === 'CMO/CVMO Review') return 'deep-purple-6'
  if (leaveWorkflowStageStatus === 'Pending Update Release') return 'indigo-6'
  if (leaveWorkflowStageStatus === 'Pending Release' || leaveWorkflowStageStatus === 'Release') {
    return 'indigo-6'
  }
  if (leaveWorkflowStageStatus === 'Approved') return 'green'

  const rawStatus = getApplicationRawStatusKey(app)
  if (isCancelledByUser(app)) return 'grey-7'
  if (rawStatus === 'PENDING_ADMIN') return 'warning'
  if (rawStatus === 'PENDING_HR') return 'blue-6'
  if (rawStatus === 'APPROVED') return 'green'
  if (rawStatus === 'RECALLED') return 'blue-grey-6'
  if (rawStatus === 'REJECTED' || rawStatus === 'DISAPPROVED') return 'negative'
  return 'grey-6'
}

function resolveFiledByActor(app) {
  return app?.filed_by || app?.employee_name || 'Unknown'
}

function resolveFiledDateValue(app) {
  return (
    app?.filed_at ||
    app?.created_at ||
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
    remarksSignal.includes('recall request') ||
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
      actionToken.includes('REQUEST_RECALL') ||
      actionToken.includes('RECALL_REQUEST') ||
      actionToken.includes('REQUEST_CANCEL') ||
      actionToken.includes('CANCELLATION_REQUEST') ||
      stageToken.includes('edit request') ||
      stageToken.includes('request update') ||
      stageToken.includes('recall request') ||
      stageToken.includes('cancel request') ||
      stageToken.includes('cancellation request') ||
      historyRemarksToken.includes('edit request') ||
      historyRemarksToken.includes('request update') ||
      historyRemarksToken.includes('recall request') ||
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
    const recallSubmittedActions = [
      'REQUEST_RECALL',
      'RECALL_REQUESTED',
      'RECALL_REQUEST_SUBMITTED',
      'REQUESTED_RECALL',
    ]
    const cancelSubmittedActions = [
      'REQUEST_CANCEL',
      'CANCEL_REQUESTED',
      'CANCELLATION_REQUEST_SUBMITTED',
      'REQUESTED_CANCELLATION',
      'REQUEST_CANCELLATION',
    ]

    if (requestActionType === REQUEST_ACTION_RECALL && recallSubmittedActions.includes(actionToken)) {
      return true
    }

    if (requestActionType === REQUEST_ACTION_CANCEL && cancelSubmittedActions.includes(actionToken)) {
      return true
    }

    if (
      requestActionType !== REQUEST_ACTION_CANCEL &&
      requestActionType !== REQUEST_ACTION_RECALL &&
      updateSubmittedActions.includes(actionToken)
    ) {
      return true
    }

    if (
      stageToken.includes('edit request submitted') ||
      stageToken.includes('edit requested') ||
      stageToken.includes('recall request submitted') ||
      stageToken.includes('recall requested') ||
      stageToken.includes('cancel request submitted') ||
      stageToken.includes('cancellation request submitted') ||
      stageToken.includes('cancellation requested')
    ) {
      return true
    }

    const hasUpdateKeyword =
      remarksToken.includes('edit request') || remarksToken.includes('request update')
    const hasRecallKeyword = remarksToken.includes('recall request')
    const hasCancelKeyword =
      remarksToken.includes('cancel request') || remarksToken.includes('cancellation request')

    if (requestActionType === REQUEST_ACTION_RECALL && !hasRecallKeyword) {
      return false
    }

    if (requestActionType === REQUEST_ACTION_CANCEL && !hasCancelKeyword) {
      return false
    }

    if (
      requestActionType !== REQUEST_ACTION_CANCEL &&
      requestActionType !== REQUEST_ACTION_RECALL &&
      !hasUpdateKeyword &&
      !hasCancelKeyword
    ) {
      return false
    }

    return (
      actionToken === '' ||
      actionToken.includes('REQUEST') ||
      actionToken.includes('SUBMIT') ||
      actionToken.includes('EDIT') ||
      actionToken.includes('RECALL') ||
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
    const updateRequestSignal =
      stageToken.includes('edit request') ||
      stageToken.includes('request update') ||
      remarksToken.includes('edit request') ||
      remarksToken.includes('request update')
    const recallRequestSignal =
      stageToken.includes('recall request') ||
      remarksToken.includes('recall request')
    const cancelRequestSignal =
      stageToken.includes('cancel request') ||
      stageToken.includes('cancellation request') ||
      remarksToken.includes('cancel request') ||
      remarksToken.includes('cancellation request')

    const targetDecision = String(decision || '').toUpperCase()
    const explicitApprovedSignal =
      [
        'EDIT_REQUEST_APPROVED',
        'UPDATE_REQUEST_APPROVED',
        'RECALL_REQUEST_APPROVED',
        'REQUEST_RECALL_APPROVED',
        'CANCELLATION_REQUEST_APPROVED',
        'CANCEL_REQUEST_APPROVED',
      ]
        .includes(actionToken) ||
      stageToken.includes('edit request approved') ||
      stageToken.includes('recall request approved') ||
      stageToken.includes('cancellation request approved') ||
      stageToken.includes('cancel request approved')
    const explicitRejectedSignal =
      [
        'EDIT_REQUEST_REJECTED',
        'UPDATE_REQUEST_REJECTED',
        'RECALL_REQUEST_REJECTED',
        'REQUEST_RECALL_REJECTED',
        'CANCELLATION_REQUEST_REJECTED',
        'CANCEL_REQUEST_REJECTED',
      ]
        .includes(actionToken) ||
      stageToken.includes('edit request rejected') ||
      stageToken.includes('edit request disapproved') ||
      stageToken.includes('recall request rejected') ||
      stageToken.includes('recall request disapproved') ||
      stageToken.includes('cancellation request rejected') ||
      stageToken.includes('cancellation request disapproved') ||
      stageToken.includes('cancel request rejected')

    if (targetDecision === 'APPROVED' && explicitApprovedSignal) return true
    if (targetDecision === 'REJECTED' && explicitRejectedSignal) return true

    const expectedDecisionActions = targetDecision === 'REJECTED'
      ? ['ADMIN_REJECTED', 'HR_REJECTED']
      : ['HR_APPROVED']
    if (!expectedDecisionActions.includes(actionToken)) return false

    if (requestActionType === REQUEST_ACTION_RECALL && recallRequestSignal) return true
    if (requestActionType === REQUEST_ACTION_CANCEL && cancelRequestSignal) return true
    if (
      requestActionType !== REQUEST_ACTION_CANCEL &&
      requestActionType !== REQUEST_ACTION_RECALL &&
      (updateRequestSignal || cancelRequestSignal)
    ) {
      return true
    }

    const cycleStart = resolveCurrentUpdateRequestCycleStartValue(app)
    if (!cycleStart) return true

    return isTimestampOnOrAfter(resolveStatusHistoryTimestamp(entry), cycleStart)
  })
}

function resolveEditRequestReviewRole(decisionHistoryEntry) {
  const actionToken = normalizeStatusHistoryActionToken(decisionHistoryEntry?.action)
  if (actionToken === 'ADMIN_REJECTED') return 'ADMIN'
  if (actionToken === 'HR_REJECTED' || actionToken === 'HR_APPROVED') return 'HR'

  const performerType = String(decisionHistoryEntry?.performed_by_type || '')
    .trim()
    .toUpperCase()
  if (performerType === 'ADMIN') return 'ADMIN'
  if (performerType === 'HR') return 'HR'

  return ''
}

function resolveEditRequestSubmittedMeta(app) {
  const submittedHistoryEntry = resolveEditRequestSubmittedHistoryEntry(app)
  const pendingPayload = getPendingUpdatePayload(app)

  const submittedAt = pickFirstDefinedValue(
    app?.latest_update_requested_at,
    resolveStatusHistoryTimestamp(submittedHistoryEntry),
  )
  const submittedHistoryActor = String(resolveStatusHistoryActor(submittedHistoryEntry) || '').trim()
  const departmentAdminActor = String(resolveDepartmentAdminActor(app) || '').trim()
  const defaultSubmitter = String(resolveFiledByActor(app) || 'Unknown').trim() || 'Unknown'
  const submittedBy = isRecallRequestAction(app)
    ? submittedHistoryActor || (departmentAdminActor && departmentAdminActor !== 'Unknown'
      ? departmentAdminActor
      : 'Unknown')
    : submittedHistoryActor || defaultSubmitter

  const submittedReason = String(
    pickFirstDefinedValue(
      app?.latest_update_request_reason,
      getPendingUpdateReason(app),
      pendingPayload?.recall_reason,
      pendingPayload?.cancel_reason,
      pendingPayload?.reason,
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
  const reviewedByRole = resolveEditRequestReviewRole(decisionHistoryEntry)

  const reviewedAt = app?.latest_update_reviewed_at || null
  const reviewedBy = String(decisionHistoryEntry?.actor_name || '').trim()

  return {
    reviewedAt,
    reviewedBy,
    reviewedByRole,
  }
}

function resolveEditRequestRejectionMeta(app) {
  const latestStatus = getLatestUpdateRequestStatus(app)
  if (latestStatus !== 'REJECTED') return null

  const decisionHistoryEntry = resolveEditRequestDecisionHistoryEntry(app, 'REJECTED')
  const reviewedByRole = resolveEditRequestReviewRole(decisionHistoryEntry)

  const reviewedAt = app?.latest_update_reviewed_at || null
  const reviewedBy = String(decisionHistoryEntry?.actor_name || '').trim()
  const reviewRemarks = String(app?.latest_update_review_remarks || '').trim()

  return {
    reviewedAt,
    reviewedBy,
    reviewRemarks,
    reviewedByRole,
  }
}

function getPreEditHrApprovalTimelineEntry(app) {
  if (!hasEditRequestSignal(app)) return null

  const approvedAt = formatDateTime(resolveFinalApprovalDateValue(app))
  const approvedBy = resolveHrActor(app)
  if (!approvedAt && approvedBy === 'Unknown') return null

  const requestLabel = isRecallRequestAction(app)
    ? 'recall request'
    : isCancellationRequestAction(app)
      ? 'cancellation request'
      : 'edit request'

  return {
    title: 'CHRMO Certification Completed',
    subtitle: approvedAt || 'Completed',
    description: 'Application was approved before the ' + requestLabel + '.',
    icon: 'task_alt',
    color: 'positive',
    actor: approvedBy,
  }
}

function getEditRequestTimelineTerminology(app) {
  const isRecallRequest = isRecallRequestAction(app)
  const isCancelRequest = isCancellationRequestAction(app)

  if (isRecallRequest) {
    return {
      submittedTitle: 'Recall Request Submitted',
      pendingAdminTitle: 'Recall Request Submitted',
      adminApprovedTitle: 'Recall Request Submitted',
      adminRejectedTitle: 'Recall Request Disapproved by Admin',
      approvedTitle: 'Recall Request Approved',
      rejectedTitle: 'Recall Request Disapproved',
      pendingHrTitle: 'Pending Recall Review (HR)',
      submittedFallback: 'Department admin requested recall for this approved application.',
      pendingAdminDescription: 'Waiting for HR final review of the recall request.',
      adminApprovedDescription: 'Recall request was submitted by department admin to HR.',
      adminRejectedDescription: 'Department admin disapproved the recall request.',
      approvedDescription: 'Recall request was reviewed and approved.',
      rejectedDescription: 'Recall request was reviewed and disapproved.',
      pendingHrDescription: 'Waiting for HR final review of the recall request.',
      submittedIcon: 'undo',
    }
  }

  return {
    submittedTitle: isCancelRequest ? 'Cancellation Request Submitted' : 'Edit Request Submitted',
    pendingAdminTitle: isCancelRequest
      ? 'Pending Cancellation Review (Admin)'
      : 'Pending Edit Review (Admin)',
    adminApprovedTitle: isCancelRequest
      ? 'Cancellation Request Approved by Admin'
      : 'Edit Request Approved by Admin',
    adminRejectedTitle: isCancelRequest
      ? 'Cancellation Request Disapproved by Admin'
      : 'Edit Request Disapproved by Admin',
    approvedTitle: isCancelRequest ? 'Cancellation Request Approved' : 'Edit Request Approved',
    rejectedTitle: isCancelRequest ? 'Cancellation Request Disapproved' : 'Edit Request Disapproved',
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
    adminRejectedDescription: isCancelRequest
      ? 'Department admin disapproved the cancellation request.'
      : 'Department admin disapproved the edit request.',
    approvedDescription: isCancelRequest
      ? 'Requested cancellation was reviewed and approved.'
      : 'Requested edits were reviewed and approved.',
    rejectedDescription: isCancelRequest
      ? 'Requested cancellation was reviewed and disapproved.'
      : 'Requested edits were reviewed and disapproved.',
    pendingHrDescription: isCancelRequest
      ? 'Waiting for HR final review of the cancellation request.'
      : 'Waiting for HR final review of the edit request.',
    submittedIcon: isCancelRequest ? 'event_busy' : 'edit_note',
  }
}

function getEditRequestTimelineEntries(app) {
  if (!hasEditRequestSignal(app)) return []

  const terminology = getEditRequestTimelineTerminology(app)
  const isRecallRequest = isRecallRequestAction(app)
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
  const isRejectedByAdmin =
    rejectionMeta &&
    (String(rejectionMeta.reviewedByRole || '').toUpperCase() === 'ADMIN' ||
      resolvedStatus === 'REJECTED' ||
      getLatestUpdateRequestStatus(app) === 'REJECTED')

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
      subtitle: 'On Process',
      description: terminology.pendingAdminDescription,
      icon: 'pending_actions',
      color: 'warning',
    })
  } else if (rejectionMeta || resolvedStatus === 'REJECTED') {
    const actorName = rejectionMeta?.reviewedBy || resolveDepartmentAdminActor(app)
    const reviewRemarks = rejectionMeta?.reviewRemarks
    entries.push({
      title: isRejectedByAdmin ? terminology.adminRejectedTitle : terminology.rejectedTitle,
      subtitle: formatDateTime(rejectionMeta?.reviewedAt) || 'Reviewed',
      description: reviewRemarks || (isRejectedByAdmin ? terminology.adminRejectedDescription : terminology.rejectedDescription),
      icon: 'cancel',
      color: 'negative',
      actor: actorName,
    })
    return entries
  } else if (!isRecallRequest && (approvalMeta || isHrReviewPending || rawStatus === 'PENDING_HR' || rawStatus === 'APPROVED')) {
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
      subtitle: 'On Process',
      description: terminology.pendingHrDescription,
      icon: 'pending_actions',
      color: 'warning',
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
  const directActor = String(app?.received_by || '').trim()
  if (directActor) return directActor

  const historyActor = String(resolveStatusHistoryActor(resolveReceivedHistoryEntry(app)) || '').trim()
  return historyActor || 'Unknown'
}

function resolveReceivedDateValue(app) {
  return pickLatestTimestampValue(
    app?.received_at || null,
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

  return Boolean(app?.has_hr_received || resolveReceivedHistoryEntry(app) || receivedAt)
}

function canReceiveApplication(app) {
  if (!app) return false
  if (isApplicationReceivedByHr(app)) return false
  if (isCancelledByUser(app)) return false
  if (isRecallRequestAction(app)) return false

  const rawStatus = getApplicationRawStatusKey(app)
  if (isCocApplication(app)) return rawStatus === 'APPROVED'
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
  if (isCocApplication(app)) return 'COC application already acknowledged by HR.'
  return 'Application already received by HR.'
}

function getReceivedApplicationTimelineEntry(app) {
  if (!isApplicationReceivedByHr(app)) return null

  const receivedAt = formatDateTime(resolveReceivedDateValue(app)) || 'Completed'
  const receivedBy = resolveReceivedActor(app)
  const description = isCocApplication(app)
    ? 'HR acknowledged this COC application for review.'
    : 'HR confirmed receipt of the hard copy leave application form.'

  return {
    title: 'Received Application',
    subtitle: receivedAt,
    description,
    icon: 'inventory_2',
    color: 'teal-6',
    actor: receivedBy,
  }
}

function getReleasedApplicationTimelineEntry(app) {
  if (!isApplicationReleased(app)) return null

  const releasedAt = formatDateTime(resolveReleasedDateValue(app)) || 'Completed'
  const releasedBy = resolveReleasedActor(app)
  const cycleDocumentLabel = hasEditRequestSignal(app)
    ? (isCancellationRequestAction(app) ? 'Cancellation Form' : 'Update')
    : ''
  const description = isCocApplication(app)
    ? 'COC application has been finalized and released.'
    : cycleDocumentLabel
      ? cycleDocumentLabel === 'Cancellation Form'
        ? 'Cancellation form has been released.'
        : 'Updated leave document has been released.'
      : 'Physical leave document has been released.'

  return {
    title: cycleDocumentLabel ? `${cycleDocumentLabel} Released` : 'Released Application',
    subtitle: releasedAt,
    description,
    icon: 'outbox',
    color: 'positive',
    actor: releasedBy,
  }
}

function resolveCmoCbmoReviewHistoryEntry(app) {
  return findLatestStatusHistoryEntry(app, (entry) => {
    const action = String(entry?.action || '')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_')
    const stage = String(entry?.stage || '').trim().toLowerCase()
    return action === 'CMO_CBMO_REVIEWED' || stage === 'CMO/CVMO Reviewed'
  })
}

function resolveCmoCbmoReviewActor(app) {
  const directActor = String(app?.cmo_cbmo_reviewed_by || app?.cmoCbmoReviewedBy || '').trim()
  if (directActor) return directActor

  const historyActor = String(resolveStatusHistoryActor(resolveCmoCbmoReviewHistoryEntry(app)) || '').trim()
  return historyActor || 'Unknown'
}

function resolveCmoCbmoReviewDateValue(app) {
  return pickLatestTimestampValue(
    app?.cmo_cbmo_reviewed_at || null,
    app?.cmoCbmoReviewedAt || null,
    resolveStatusHistoryTimestamp(resolveCmoCbmoReviewHistoryEntry(app)) || null,
  )
}

function isApplicationCmoCbmoReviewed(app) {
  if (!app) return false
  if (isApplicationReleased(app)) return true

  const reviewedAt = resolveCmoCbmoReviewDateValue(app)
  return Boolean(app?.has_cmo_cbmo_reviewed || app?.hasCmoCbmoReviewed || resolveCmoCbmoReviewHistoryEntry(app) || reviewedAt)
}

function canCmoCbmoReviewApplication(app) {
  if (!app) return false
  if (isApplicationCmoCbmoReviewed(app)) return false
  if (isApplicationReleased(app)) return false
  if (isCancelledByUser(app)) return false
  if (getLatestUpdateRequestStatus(app) === 'REJECTED') return false

  const rawStatus = getApplicationRawStatusKey(app)
  if (rawStatus !== 'APPROVED') return false
  return isApplicationReceivedByHr(app)
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
  const directActor = String(app?.released_by || '').trim()
  if (directActor) return directActor

  const historyActor = String(resolveStatusHistoryActor(resolveReleasedHistoryEntry(app)) || '').trim()
  return historyActor || 'Unknown'
}

function resolveReleasedDateValue(app) {
  return pickLatestTimestampValue(
    app?.released_at || null,
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

  return Boolean(app?.has_hr_released || resolveReleasedHistoryEntry(app) || releasedAt)
}

function canReleaseApplication(app) {
  if (!app) return false
  if (isApplicationReleased(app)) return false
  if (getLatestUpdateRequestStatus(app) === 'REJECTED') return false

  const rawStatus = getApplicationRawStatusKey(app)
  if (isCocApplication(app)) {
    if (rawStatus !== 'APPROVED') return false
    return isApplicationReceivedByHr(app) && isApplicationCmoCbmoReviewed(app)
  }

  const isCancellationRequestApproved =
    isCancellationRequestAction(app) &&
    getLatestUpdateRequestStatus(app) === 'APPROVED' &&
    rawStatus === 'REJECTED'

  if (isCancelledByUser(app) && !isCancellationRequestApproved) return false

  if (rawStatus === 'APPROVED') return isApplicationCmoCbmoReviewed(app)
  if (isCancellationRequestApproved) return isApplicationReceivedByHr(app)
  return false
}

function shouldUseUpdateReceiveEndpoint(app) {
  if (!app || isCocApplication(app)) return false
  if (getApplicationRawStatusKey(app) !== 'PENDING_HR') return false
  if (getLatestUpdateRequestStatus(app) !== 'PENDING') return false

  const previousStatus = String(
    app?.pending_update_previous_status ??
      app?.latest_update_request_previous_status ??
      '',
  )
    .trim()
    .toUpperCase()

  const isPendingApprovedUpdate =
    isTruthyBackendFlag(app?.has_pending_update_request) || previousStatus === 'APPROVED'

  if (!isPendingApprovedUpdate) return false

  return Boolean(resolveCurrentUpdateRequestCycleStartValue(app))
}

function getReceiveConfirmationCopy(app) {
  if (isCocApplication(app)) {
    return {
      title: 'Receive COC Application',
      message: 'This will confirm that HR received this COC application.',
    }
  }

  if (shouldUseUpdateReceiveEndpoint(app)) {
    if (isCancellationRequestAction(app)) {
      return {
        title: 'Receive Cancellation Form',
        message: 'This will confirm that HR received the hard-copy cancellation form.',
      }
    }

    return {
      title: 'Receive Updated Application',
      message: 'This will confirm that HR received the updated hard-copy leave application form.',
    }
  }

  return {
    title: 'Receive Application',
    message: 'This will confirm that HR received the hard-copy leave application form.',
  }
}

function confirmApplicationReceive(target = selectedApp.value) {
  const application = resolveApplication(target) || target
  if (!canReceiveApplication(application)) return false

  const confirmationCopy = getReceiveConfirmationCopy(application)
  q.dialog({
    class: 'hr-receive-required-dialog',
    title: confirmationCopy.title,
    message: confirmationCopy.message,
    cancel: {
      label: 'Cancel',
      flat: true,
      color: 'grey-7',
      class: 'hr-receive-required-dialog__button',
    },
    ok: {
      label: 'Receive',
      color: 'primary',
      unelevated: true,
      class: 'hr-receive-required-dialog__button',
    },
    persistent: true,
  }).onOk(async () => {
    await markApplicationReceived(application)
  })

  return true
}

function confirmApplicationCmoCbmoReview(target = selectedApp.value) {
  const application = resolveApplication(target) || target
  if (!canCmoCbmoReviewApplication(application)) return false

  q.dialog({
    class: 'hr-receive-required-dialog',
    title: 'Confirm CMO/CVMO Review',
    message: 'This will confirm CMO/CVMO Review and move the application to Pending Release.',
    cancel: {
      label: 'Cancel',
      flat: true,
      color: 'grey-7',
      class: 'hr-receive-required-dialog__button',
    },
    ok: {
      label: 'Confirm',
      color: 'deep-purple-6',
      unelevated: true,
      class: 'hr-receive-required-dialog__button',
    },
    persistent: true,
  }).onOk(async () => {
    await markApplicationCmoCbmoReviewed(application)
  })

  return true
}

function getReleaseConfirmationCopy(app) {
  if (isCocApplication(app)) {
    return {
      title: 'Release COC Application',
      message: 'This will confirm that HR released this COC application.',
    }
  }

  if (shouldUseUpdateReleaseEndpoint(app)) {
    if (isCancellationRequestAction(app)) {
      return {
        title: 'Release Cancellation Form',
        message: 'This will confirm that HR released the cancellation form.',
      }
    }

    return {
      title: 'Release Updated Application',
      message: 'This will confirm that HR released the updated hard-copy leave application form.',
    }
  }

  return {
    title: 'Release Application',
    message: 'This will confirm that HR released the hard-copy leave application form.',
  }
}

function confirmApplicationRelease(target = selectedApp.value) {
  const application = resolveApplication(target) || target
  if (!canReleaseApplication(application)) return false

  const confirmationCopy = getReleaseConfirmationCopy(application)
  q.dialog({
    class: 'hr-receive-required-dialog',
    title: confirmationCopy.title,
    message: confirmationCopy.message,
    cancel: {
      label: 'Cancel',
      flat: true,
      color: 'grey-7',
      class: 'hr-receive-required-dialog__button',
    },
    ok: {
      label: 'Release',
      color: 'secondary',
      unelevated: true,
      class: 'hr-receive-required-dialog__button',
    },
    persistent: true,
  }).onOk(async () => {
    await markApplicationReleased(application)
  })

  return true
}

function getUndoReceiveConfirmationCopy(app) {
  if (isCocApplication(app)) {
    return {
      title: 'Undo Receive COC Application',
      message: 'This will undo HR receipt for this COC application.',
    }
  }

  if (isCancellationRequestAction(app)) {
    return {
      title: 'Undo Receive Cancellation Form',
      message: 'This will move the cancellation form back before HR receipt.',
    }
  }

  if (hasEditRequestSignal(app)) {
    return {
      title: 'Undo Receive Updated Application',
      message: 'This will move the updated hard-copy application back before HR receipt.',
    }
  }

  return {
    title: 'Undo Receive Application',
    message: 'This will undo HR receipt for the hard-copy leave application.',
  }
}

function confirmApplicationReceiveUndo(target = selectedApp.value) {
  const application = resolveApplication(target) || target
  if (!isApplicationReceivedByHr(application)) return false

  const confirmationCopy = getUndoReceiveConfirmationCopy(application)
  q.dialog({
    class: 'hr-receive-required-dialog',
    title: confirmationCopy.title,
    message: confirmationCopy.message,
    cancel: {
      label: 'Cancel',
      flat: true,
      color: 'grey-7',
      class: 'hr-receive-required-dialog__button',
    },
    ok: {
      label: 'Undo',
      color: 'warning',
      unelevated: true,
      class: 'hr-receive-required-dialog__button',
    },
    persistent: true,
  }).onOk(async () => {
    await undoApplicationReceive(application)
  })

  return true
}

function getUndoReleaseConfirmationCopy(app) {
  if (isCocApplication(app)) {
    return {
      title: 'Undo Release COC Application',
      message: 'This will undo HR release for this COC application.',
    }
  }

  if (isCancellationRequestAction(app)) {
    return {
      title: 'Undo Release Cancellation Form',
      message: 'This will move the cancellation form back before HR release.',
    }
  }

  if (hasEditRequestSignal(app)) {
    return {
      title: 'Undo Release Updated Application',
      message: 'This will move the updated hard-copy application back before HR release.',
    }
  }

  return {
    title: 'Undo Release Application',
    message: 'This will undo HR release for the hard-copy leave application.',
  }
}

function confirmApplicationReleaseUndo(target = selectedApp.value) {
  const application = resolveApplication(target) || target
  if (!isApplicationReleased(application)) return false

  const confirmationCopy = getUndoReleaseConfirmationCopy(application)
  q.dialog({
    class: 'hr-receive-required-dialog',
    title: confirmationCopy.title,
    message: confirmationCopy.message,
    cancel: {
      label: 'Cancel',
      flat: true,
      color: 'grey-7',
      class: 'hr-receive-required-dialog__button',
    },
    ok: {
      label: 'Undo',
      color: 'warning',
      unelevated: true,
      class: 'hr-receive-required-dialog__button',
    },
    persistent: true,
  }).onOk(async () => {
    await undoApplicationRelease(application)
  })

  return true
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

function isLateCocWorkflowApplication(app) {
  if (!isCocApplication(app)) return false

  const rawStatus = getApplicationRawStatusKey(app)
  if (rawStatus === 'PENDING_LATE_HR') return true

  return Boolean(app?.is_late_filed || app?.isLateFiled || app?.late_filing_status)
}

function getLateCocHrEvaluationTimelineEntry(app) {
  if (!isLateCocWorkflowApplication(app)) return null

  const rawStatus = getApplicationRawStatusKey(app)
  if (rawStatus === 'PENDING_LATE_HR') {
    return {
      title: 'Under HR Evaluation',
      subtitle: 'On Process',
      description: 'Waiting for HR evaluation of this late COC application.',
      icon: 'pending_actions',
      color: 'warning',
    }
  }

  const completedStatuses = new Set([
    'PENDING_ADMIN',
    'PENDING_HR',
    'APPROVED',
    'REJECTED',
    'RECALLED',
  ])
  if (!completedStatuses.has(rawStatus)) return null

  const evaluatedAt = formatDateTime(
    pickLatestTimestampValue(
      resolveFinalApprovalDateValue(app),
      resolveDisapprovedDateValue(app),
      resolveDepartmentAdminActionDateValue(app),
    ),
  ) || 'Completed'

  const hrActor = resolveHrActor(app)
  const actor = hrActor && hrActor !== 'Unknown' ? hrActor : undefined

  return {
    title: 'Under HR Evaluation',
    subtitle: evaluatedAt,
    description: 'HR evaluation for this late COC application is complete.',
    icon: 'task_alt',
    color: 'positive',
    ...(actor ? { actor } : {}),
  }
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
        formatDate(app?.filed_at || app?.created_at) ||
        'Date unavailable',
      description: `${resolveFiledByActor(app) || 'Employee'} submitted this leave request.`,
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

  const lateCocEvaluationEntry = getLateCocHrEvaluationTimelineEntry(app)
  if (lateCocEvaluationEntry) {
    entries.push(lateCocEvaluationEntry)
  }

  if (rawStatus === 'PENDING_LATE_HR') {
    entries.push({
      title: 'Department Recommendation',
      subtitle: 'On Process',
      description: 'This stage starts after HR approves the late COC application.',
      icon: 'radio_button_unchecked',
      color: 'grey-5',
    })
    entries.push({
      title: 'CHRMO Certification',
      subtitle: 'On Process',
      description: 'This stage starts after department admin approval.',
      icon: 'radio_button_unchecked',
      color: 'grey-5',
    })
    entries.push(...editRequestEntries)
    entries.push({
      title: 'Application Closed',
      subtitle: 'On Process',
      description: 'Application will be closed after final HR action.',
      icon: 'radio_button_unchecked',
      color: 'grey-5',
    })
    return entries
  }

  if (rawStatus === 'PENDING_ADMIN') {
    if (hasEditRequest) {
      entries.push({
        title: 'Department Recommendation Completed',
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
        subtitle: 'On Process',
        description: 'Application will be closed after final HR action.',
        icon: 'radio_button_unchecked',
        color: 'grey-5',
      })
      return entries
    }

    entries.push({
      title: 'Department Recommendation',
      subtitle: 'On Process',
      description: 'Waiting for department admin approval or disapproval.',
      icon: 'pending_actions',
      color: 'warning',
    })
    entries.push({
      title: 'CHRMO Certification',
      subtitle: 'On Process',
      description: 'This stage starts after department admin approval.',
      icon: 'radio_button_unchecked',
      color: 'grey-5',
    })
    entries.push(...editRequestEntries)
    entries.push({
      title: 'Application Closed',
      subtitle: 'On Process',
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
        title: 'Department Recommendation Completed',
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
      title: isApprovedCancellationRequest ? 'Application Cancelled' : 'Application Not Certified',
      subtitle: disapprovedAt,
      description: isApprovedCancellationRequest
        ? formatRecentRemarks(app) || 'Application was cancelled through the approved cancellation request.'
        : formatRecentRemarks(app) || 'Application was not certified.',
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
    title: 'Department Recommendation Completed',
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
        subtitle: 'On Process',
        description: 'Application will be closed after final HR action.',
        icon: 'radio_button_unchecked',
        color: 'grey-5',
      })
      return entries
    }

    entries.push({
      title: 'CHRMO Certification',
      subtitle: 'On Process',
      description: 'Waiting for HR evaluation.',
      icon: 'pending_actions',
      color: 'warning',
    })
    entries.push(...editRequestEntries)
    entries.push({
      title: 'Application Closed',
      subtitle: 'On Process',
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
          return (
            title.includes('request approved') ||
            title.includes('request rejected') ||
            title.includes('request disapproved')
          )
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
      title: 'CHRMO Certification Completed',
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
    const releasedTimelineEntry = getReleasedApplicationTimelineEntry(app)

    if (hasEditRequest && preEditHrApprovalEntry) {
      entries.push(preEditHrApprovalEntry)
    } else if (approvedAt || approvedBy !== 'Unknown') {
      entries.push({
        title: 'CHRMO Certification Completed',
        subtitle: approvedAt || 'Completed',
        description: 'Application was fully approved before recall.',
        icon: 'task_alt',
        color: 'positive',
        actor: approvedBy,
      })
    }

    if (hasEditRequest) {
      entries.push(...editRequestEntries)
    }

    if (releasedTimelineEntry) {
      entries.push(releasedTimelineEntry)
    }

    entries.push({
      title: 'Recalled by HR',
      subtitle: recalledAt,
      description: formatRecallRemarks(app) || 'Application was recalled by HR.',
      icon: 'undo',
      color: 'warning',
      actor: recalledBy,
    })
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
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return normalizeCoverageCode(
      value.coverage ??
        value.coverage_type ??
        value.coverageType ??
        value.type ??
        value.value ??
        '',
    )
  }

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

function normalizeHalfDayPortionCode(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return normalizeHalfDayPortionCode(
      value.half_day_portion ??
        value.half_day_period ??
        value.halfDayPortion ??
        value.halfDayPeriod ??
        value.period ??
        value.value ??
        '',
    )
  }

  const normalizedValue = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s_.-]+/g, '')

  if (normalizedValue === 'AM') return 'AM'
  if (normalizedValue === 'PM') return 'PM'
  return ''
}

function toSelectedDateHalfDayPortionMap(value) {
  if (!value) return {}

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return {}
    try {
      const parsed = JSON.parse(trimmed)
      return toSelectedDateHalfDayPortionMap(parsed)
    } catch {
      return {}
    }
  }

  if (Array.isArray(value)) {
    return value.reduce((acc, entry, index) => {
      const normalized = normalizeHalfDayPortionCode(entry)
      if (normalized) acc[String(index)] = normalized
      return acc
    }, {})
  }

  if (typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, entry]) => {
      const normalized = normalizeHalfDayPortionCode(entry)
      if (normalized) acc[String(key)] = normalized
      return acc
    }, {})
  }

  return {}
}

function normalizeMapKeysWithIsoAlias(valueMap = {}) {
  const normalizedMap = {}
  Object.entries(valueMap).forEach(([rawKey, value]) => {
    const key = String(rawKey || '').trim()
    if (!key || !value) return

    normalizedMap[key] = value

    const isoKey = toIsoDateString(key)
    if (isoKey) {
      normalizedMap[isoKey] = value
    }
  })

  return normalizedMap
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

  const normalizedStatusMap = normalizeMapKeysWithIsoAlias(rawStatusMap)
  const normalizedHalfDayPortionMap = normalizeMapKeysWithIsoAlias(
    toSelectedDateHalfDayPortionMap(
      app?.selected_date_half_day_portion ??
        app?.selectedDateHalfDayPortion ??
        app?.selected_date_half_day_period ??
        app?.selectedDateHalfDayPeriod ??
        app?.selected_date_halfday_period,
    ),
  )

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
    const halfDayPortion =
      normalizedHalfDayPortionMap[key] ??
      normalizedHalfDayPortionMap[String(index)] ??
      normalizedHalfDayPortionMap[String(index + 1)] ??
      ''

    return {
      dateKey: key,
      dateText: formatDate(key),
      coverageLabel: getDateCoverageLabel(coverageWeights[key] ?? 1, halfDayPortion),
      halfDayPortion: halfDayPortion === 'AM' || halfDayPortion === 'PM' ? halfDayPortion : '',
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

  const normalizedCoverageMap = normalizeMapKeysWithIsoAlias(rawCoverageMap)

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

function getDateCoverageLabel(weight, halfDayPortion = '') {
  if (Number(weight) !== 0.5) return 'Whole Day'

  const normalizedPortion = String(halfDayPortion || '')
    .trim()
    .toUpperCase()
  if (normalizedPortion === 'AM' || normalizedPortion === 'PM') {
    return `Half Day (${normalizedPortion})`
  }
  return 'Half Day'
}

function getPendingUpdateDateCoverageWeights(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || typeof payload !== 'object') return {}

  const dateSet = resolveDateSetFromSource(payload)
  if (!dateSet.length) return {}

  const rawCoverageMap = toSelectedDateCoverageMap(
    payload?.selected_date_coverage,
  )

  const normalizedCoverageMap = normalizeMapKeysWithIsoAlias(rawCoverageMap)

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

function isPreviouslyApprovedUpdateWorkflow(app) {
  if (!app || isCocApplication(app)) return false

  const previousStatusCandidates = [
    app?.pending_update_previous_status,
    app?.latest_update_request_previous_status,
  ]

  return previousStatusCandidates.some(
    (status) => String(status || '').trim().toUpperCase() === 'APPROVED',
  )
}

function canOverrideApplicationPayStatus(app) {
  if (!app || typeof app !== 'object') return false
  if (isCocApplication(app)) return false
  if (app?.is_monetization === true) return false
  if (getApplicationRawStatusKey(app) !== 'PENDING_HR') return false
  if (isPendingUpdateWorkflowCycle(app) || isPreviouslyApprovedUpdateWorkflow(app)) return false
  if (isCtoLeaveApplication(app)) return false

  const leaveTypeLabel =
    getCurrentLeaveTypeLabel(app) ||
    app?.leaveType ||
    app?.leave_type_name ||
    ''
  if (resolveApplicationLeaveTypeCategory(app) === 'EVENT' || isEventBasedLeaveType(leaveTypeLabel)) {
    return false
  }

  return getSelectedDatePayStatusRows(app).length > 0
}

function buildPayStatusOverrideSelectedDatePayStatusMap(app, targetEntry = {}) {
  const rows = getSelectedDatePayStatusRows(app)
  const targetDateKey = String(targetEntry?.dateKey || '').trim()
  const nextPayStatus = normalizePayStatusCode(targetEntry?.nextPayStatus) === 'WOP' ? 'WOP' : 'WP'

  const selectedDatePayStatus = rows.reduce((acc, row) => {
    const dateKey = String(row?.dateKey || '').trim()
    if (!dateKey) return acc

    acc[dateKey] = row?.payStatus === 'WOP' ? 'WOP' : 'WP'
    return acc
  }, {})

  if (targetDateKey) {
    selectedDatePayStatus[targetDateKey] = nextPayStatus
  }

  return selectedDatePayStatus
}

function buildPayStatusOverridePayload(app, targetEntry = {}) {
  const selectedDatePayStatus = buildPayStatusOverrideSelectedDatePayStatusMap(app, targetEntry)

  const payStatuses = Object.values(selectedDatePayStatus)
  const hasWithPay = payStatuses.some((status) => status === 'WP')
  const hasWithoutPay = payStatuses.some((status) => status === 'WOP')

  return {
    pay_mode: hasWithoutPay && !hasWithPay ? 'WOP' : 'WP',
    selected_date_pay_status: selectedDatePayStatus,
    allow_sl_vl_cross_deduction: shouldAllowPayStatusOverrideSlVlCrossDeduction(app, targetEntry),
  }
}

function resolvePayStatusOverrideSlVlCrossDeductionContext(app) {
  if (!app || typeof app !== 'object') return null

  const leaveTypeKey = normalizeLeaveBalanceLookupKey(
    getCurrentLeaveTypeLabel(app) || app?.leaveType || app?.leave_type_name || '',
  )
  const primaryAvailableBalance = getCurrentLeaveBalanceValue(app)
  if (!Number.isFinite(primaryAvailableBalance)) return null

  if (leaveTypeKey === normalizeLeaveBalanceLookupKey('Sick Leave')) {
    const alternateAvailableBalance = getLeaveBalanceValueByTypeLabel(app, 'Vacation Leave')
    if (!Number.isFinite(alternateAvailableBalance)) return null

    return {
      alternateAvailableBalance,
      alternateLeaveTypeLabel: 'Vacation Leave',
      primaryAvailableBalance,
    }
  }

  if (leaveTypeKey === normalizeLeaveBalanceLookupKey('Vacation Leave')) {
    const alternateAvailableBalance = getLeaveBalanceValueByTypeLabel(app, 'Sick Leave')
    if (!Number.isFinite(alternateAvailableBalance)) return null

    return {
      alternateAvailableBalance,
      alternateLeaveTypeLabel: 'Sick Leave',
      primaryAvailableBalance,
    }
  }

  return null
}

function getLeaveBalanceValueByTypeLabel(app, leaveTypeLabel = '') {
  const entry = findLeaveBalanceEntry(app, null, leaveTypeLabel)
  if (!entry || !Number.isFinite(Number(entry.balance))) return null

  return Number(entry.balance)
}

function resolvePayStatusOverrideSelectedDateStatusMap(app, targetEntry = null) {
  if (targetEntry && typeof targetEntry === 'object') {
    return normalizeMapKeysWithIsoAlias(
      toSelectedDatePayStatusMap(buildPayStatusOverrideSelectedDatePayStatusMap(app, targetEntry)),
    )
  }

  return normalizeMapKeysWithIsoAlias(
    toSelectedDatePayStatusMap(app?.selected_date_pay_status),
  )
}

function resolvePayStatusOverrideAlternateDeductionDays(app, selectedDateStatusMap = null) {
  const context = resolvePayStatusOverrideSlVlCrossDeductionContext(app)
  if (!context) return null

  const rows = getSelectedDatePayStatusRows(app)
  if (!rows.length) return null

  const coverageWeights = getSelectedDateCoverageWeights(app)
  let remainingPrimaryBalance = Math.max(context.primaryAvailableBalance, 0)
  let alternateDeductionDays = 0

  rows.forEach((row) => {
    const dateKey = String(row?.dateKey || '').trim()
    if (!dateKey) return

    const payStatus =
      normalizePayStatusCode(selectedDateStatusMap?.[dateKey] ?? row?.payStatus) === 'WOP'
        ? 'WOP'
        : 'WP'
    if (payStatus === 'WOP') return

    const rawWeight = Number(coverageWeights[dateKey])
    const dateWeight =
      Number.isFinite(rawWeight) && rawWeight > 0
        ? rawWeight
        : String(row?.coverageLabel || '').toLowerCase().startsWith('half')
          ? 0.5
          : 1

    if (remainingPrimaryBalance + 1e-9 >= dateWeight) {
      remainingPrimaryBalance = Math.max(remainingPrimaryBalance - dateWeight, 0)
      return
    }

    alternateDeductionDays += dateWeight
  })

  return Math.round(alternateDeductionDays * 1000) / 1000
}

function resolvePayStatusOverrideProjectedCrossDeduction(app, targetEntry = null) {
  const context = resolvePayStatusOverrideSlVlCrossDeductionContext(app)
  if (!context) return null

  const projectedAlternateDeductionDays = resolvePayStatusOverrideAlternateDeductionDays(
    app,
    resolvePayStatusOverrideSelectedDateStatusMap(app, targetEntry),
  )

  if (
    !Number.isFinite(projectedAlternateDeductionDays)
    || projectedAlternateDeductionDays <= 1e-9
    || projectedAlternateDeductionDays > context.alternateAvailableBalance + 1e-9
  ) {
    return null
  }

  return {
    ...context,
    projectedAlternateDeductionDays,
  }
}

function shouldAllowPayStatusOverrideSlVlCrossDeduction(app, targetEntry = null) {
  return resolvePayStatusOverrideProjectedCrossDeduction(app, targetEntry) !== null
}

function getPayStatusOverrideDateLabel(entry = {}) {
  const rawDate = String(entry?.dateKey || entry?.dateText || '').trim()
  if (!rawDate) return 'This date'

  return formatDate(rawDate) || rawDate
}

function getPayStatusOverrideConfirmationCopy(app, entry = {}) {
  const currentPayStatus = normalizePayStatusCode(entry?.payStatus) === 'WOP' ? 'WOP' : 'WP'
  const nextPayStatus = normalizePayStatusCode(entry?.nextPayStatus) === 'WOP' ? 'WOP' : 'WP'
  const dateLabel = getPayStatusOverrideDateLabel(entry)
  const crossDeductionPreview = resolvePayStatusOverrideProjectedCrossDeduction(app, entry)

  if (currentPayStatus === nextPayStatus) {
    return {
      title: 'Override Pay Status',
      message: `No pay-status change is needed for ${dateLabel}.`,
      color: 'primary',
      okLabel: 'Continue',
      cancelLabel: 'Cancel',
    }
  }

  if (nextPayStatus === 'WOP') {
    return {
      title: 'Set date to WOP?',
      message: `${dateLabel} will be marked as without pay. Do you want to continue?`,
      color: 'negative',
      okLabel: 'Yes, set WOP',
      cancelLabel: 'Cancel',
    }
  }

  if (crossDeductionPreview) {
    return {
      title: 'Keep This Leave With Pay?',
      message: `${formatDayValue(crossDeductionPreview.projectedAlternateDeductionDays)} day(s) will be deducted from ${crossDeductionPreview.alternateLeaveTypeLabel} to keep this leave with pay. Continue?`,
      color: 'primary',
      okLabel: 'Continue',
      cancelLabel: 'Cancel',
    }
  }

  return {
    title: 'Set date to WP?',
    message: `${dateLabel} will be marked as with pay. Do you want to continue?`,
    color: 'primary',
    okLabel: 'Yes, set WP',
    cancelLabel: 'Cancel',
  }
}

async function updateApplicationPayStatus(application, id, entry = {}) {
  payStatusOverrideLoading.value = true
  try {
    const response = await api.post(
      `/hr/leave-applications/${id}/pay-status/update`,
      buildPayStatusOverridePayload(application, entry),
    )
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
      await fetchLatestHrLeaveApplication(mergedApplication)
    }

    q.notify({
      type: 'positive',
      message: responseMessage || 'Application pay status updated.',
      position: 'top',
    })
    return true
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to update this application pay status.')
    q.notify({ type: 'negative', message: msg, position: 'top' })
    return false
  } finally {
    payStatusOverrideLoading.value = false
  }
}

async function overrideApplicationPayStatus(target, entry = {}) {
  const application = resolveApplication(target) || target
  if (!canOverrideApplicationPayStatus(application)) {
    q.notify({
      type: 'negative',
      message: 'WOP/WP can only be changed during CHRMO Certification before final approval.',
      position: 'top',
    })
    return false
  }

  const id = getApplicationId(application)
  if (!id) {
    q.notify({
      type: 'negative',
      message: 'Unable to identify this leave application.',
      position: 'top',
    })
    return false
  }

  const confirmationCopy = getPayStatusOverrideConfirmationCopy(application, entry)

  return new Promise((resolve) => {
    q.dialog({
      class: 'hr-receive-required-dialog',
      title: confirmationCopy.title,
      message: confirmationCopy.message,
      cancel: {
        label: confirmationCopy.cancelLabel,
        flat: true,
        color: 'grey-7',
        class: 'hr-receive-required-dialog__button',
      },
      ok: {
        label: confirmationCopy.okLabel,
        color: confirmationCopy.color,
        unelevated: true,
        class: 'hr-receive-required-dialog__button',
      },
      persistent: true,
    })
      .onOk(async () => {
        resolve(await updateApplicationPayStatus(application, id, entry))
      })
      .onCancel(() => {
        resolve(false)
      })
  })
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

  const normalizedStatusMap = normalizeMapKeysWithIsoAlias(rawStatusMap)
  const normalizedHalfDayPortionMap = normalizeMapKeysWithIsoAlias(
    toSelectedDateHalfDayPortionMap(
      payload?.selected_date_half_day_portion ??
        payload?.selectedDateHalfDayPortion ??
        payload?.selected_date_half_day_period ??
        payload?.selectedDateHalfDayPeriod ??
        payload?.selected_date_halfday_period,
    ),
  )

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
    const halfDayPortion =
      normalizedHalfDayPortionMap[key] ??
      normalizedHalfDayPortionMap[String(index)] ??
      normalizedHalfDayPortionMap[String(index + 1)] ??
      ''

    return {
      dateKey: key,
      dateText: formatDate(key),
      coverageLabel: getDateCoverageLabel(coverageWeights[key] ?? 1, halfDayPortion),
      halfDayPortion: halfDayPortion === 'AM' || halfDayPortion === 'PM' ? halfDayPortion : '',
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
  timelineLoading.value = true

  const id = getApplicationId(baseApplication)
  if (!id) {
    timelineLoading.value = false
    return
  }

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
  } finally {
    timelineLoading.value = false
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

function promptCocCertificateAfterReceive(app) {
  const targetApp = resolveApplication(app) || app
  if (!targetApp || !isCocApplication(targetApp)) return false
  if (!isApplicationReceivedByHr(targetApp)) return false
  if (!canPrintCocCertificate(targetApp)) return false

  q.dialog({
    title: 'Print COC certificate?',
    message: 'COC application received by HR. Do you want to print the certificate now?',
    cancel: {
      label: 'Later',
      flat: true,
      color: 'grey-7',
    },
    ok: {
      label: 'Print',
      unelevated: true,
      color: 'primary',
    },
    persistent: true,
  }).onOk(async () => {
    await printCocCertificate(targetApp)
  })

  return true
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
      officeShort: resolveOfficeAcronymLabel({ ...row, ...mergedRow }),
      displayStatus: mergeStatus(mergedRow),
    }
  })
}

function applyCocApplicationUpdate(updatedApplication) {
  const normalizedUpdatedApplication = normalizeBackendApplicationShape(updatedApplication)
  if (!normalizedUpdatedApplication || !isCocApplication(normalizedUpdatedApplication)) return

  const updatedId = String(getApplicationId(normalizedUpdatedApplication) ?? '').trim()
  if (!updatedId) return

  const selectedId = String(getApplicationId(selectedApp.value) ?? '').trim()
  if (
    selectedId === updatedId &&
    getApplicationType(selectedApp.value || {}) === 'COC'
  ) {
    const normalizedSelectedApplication = normalizeBackendApplicationShape({
      ...(selectedApp.value && typeof selectedApp.value === 'object' ? selectedApp.value : {}),
      ...normalizedUpdatedApplication,
    }) || {
      ...(selectedApp.value && typeof selectedApp.value === 'object' ? selectedApp.value : {}),
      ...normalizedUpdatedApplication,
    }

    selectedApp.value = {
      ...normalizedSelectedApplication,
      application_type: getApplicationType(normalizedSelectedApplication),
      application_uid:
        selectedApp.value?.application_uid ||
        normalizedSelectedApplication?.application_uid ||
        getApplicationRowKey(normalizedSelectedApplication),
      employeeName:
        normalizedSelectedApplication?.employeeName || selectedApp.value?.employeeName || 'Unknown',
      officeShort: resolveOfficeAcronymLabel({
        ...(selectedApp.value && typeof selectedApp.value === 'object' ? selectedApp.value : {}),
        ...normalizedSelectedApplication,
      }),
      displayStatus: mergeStatus(normalizedSelectedApplication),
    }
  }

  applications.value = applications.value.map((row) => {
    if (!row || typeof row !== 'object') return row
    if (row?.application_row_variant === 'recalled') return row
    if (getApplicationType(row) !== 'COC') return row

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
      officeShort: resolveOfficeAcronymLabel({ ...row, ...mergedRow }),
      displayStatus: mergeStatus(mergedRow),
    }
  })
}

async function fetchLatestHrLeaveApplication(target = selectedApp.value) {
  const application = resolveApplication(target) || target
  if (!application || typeof application !== 'object' || isCocApplication(application)) {
    return application || null
  }

  const id = getApplicationId(application)
  if (!id) return application

  try {
    const response = await api.get('/hr/leave-applications/' + id)
    const detailedApplication = normalizeBackendApplicationShape(
      extractSingleApplicationFromPayload(response?.data),
    )
    if (!detailedApplication || typeof detailedApplication !== 'object') return application

    const mergedApplication =
      normalizeBackendApplicationShape({
        ...application,
        ...detailedApplication,
      }) ||
      ({
        ...application,
        ...detailedApplication,
      })

    const selectedId = String(getApplicationId(selectedApp.value) ?? '').trim()
    if (selectedId === String(id).trim()) {
      selectedApp.value = mergedApplication
    }

    applyLeaveApplicationUpdate(mergedApplication)
    return mergedApplication
  } catch {
    return application
  }
}

async function fetchLatestHrCocApplication(target = selectedApp.value) {
  const application = resolveApplication(target) || target
  if (!application || typeof application !== 'object' || !isCocApplication(application)) {
    return application || null
  }

  const id = getApplicationId(application)
  if (!id) return application

  try {
    const response = await api.get('/hr/coc-applications/' + id)
    const detailedApplication = normalizeBackendApplicationShape(
      extractSingleApplicationFromPayload(response?.data),
    )
    if (!detailedApplication || typeof detailedApplication !== 'object') return application

    const mergedApplication =
      normalizeBackendApplicationShape({
        ...application,
        ...detailedApplication,
      }) ||
      ({
        ...application,
        ...detailedApplication,
      })

    const selectedId = String(getApplicationId(selectedApp.value) ?? '').trim()
    if (selectedId === String(id).trim()) {
      selectedApp.value = mergedApplication
    }

    applyCocApplicationUpdate(mergedApplication)
    return mergedApplication
  } catch {
    return application
  }
}

async function markApplicationReceived(target = selectedApp.value) {
  const application = resolveApplication(target) || target
  if (!canReceiveApplication(application)) return false

  if (isCocApplication(application)) {
    const resolvedId = String(getApplicationId(application) ?? '').trim()
    if (!resolvedId) {
      q.notify({
        type: 'negative',
        message: 'Unable to identify this COC application.',
        position: 'top',
      })
      return false
    }

    receiveLoading.value = true
    try {
      const response = await api.post('/hr/coc-applications/' + resolvedId + '/receive')
      const responseMessage = String(response?.data?.message || '').trim()
      const updatedApplication = normalizeBackendApplicationShape(
        extractSingleApplicationFromPayload(response?.data),
      )

      let nextApplication = application
      if (updatedApplication && typeof updatedApplication === 'object') {
        applyCocApplicationUpdate(updatedApplication)
        nextApplication =
          normalizeBackendApplicationShape({
            ...(application && typeof application === 'object' ? application : {}),
            ...updatedApplication,
          }) ||
          ({
            ...(application && typeof application === 'object' ? application : {}),
            ...updatedApplication,
          })
      }

      const refreshedCocApplication = await fetchLatestHrCocApplication(nextApplication)
      const promptTargetApplication =
        resolveApplication(`COC:${resolvedId}`) ||
        resolveApplication(resolvedId) ||
        refreshedCocApplication ||
        nextApplication

      promptCocCertificateAfterReceive(promptTargetApplication)

      q.notify({
        type: 'positive',
        message: responseMessage || 'COC application marked as received by HR.',
        position: 'top',
      })
      return true
    } catch (err) {
      const msg = resolveApiErrorMessage(
        err,
        'Unable to mark this COC application as received right now.',
      )
      q.notify({ type: 'negative', message: msg, position: 'top' })
      return false
    } finally {
      receiveLoading.value = false
    }
  }

  const id = getApplicationId(application)
  if (!id) {
    q.notify({
      type: 'negative',
      message: 'Unable to identify this leave application.',
      position: 'top',
    })
    return false
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
      await fetchLatestHrLeaveApplication(mergedApplication)
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
    return true
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
    return false
  } finally {
    receiveLoading.value = false
  }
}

async function markApplicationReleased(target = selectedApp.value) {
  const application = resolveApplication(target) || target
  if (!canReleaseApplication(application)) return

  if (isCocApplication(application)) {
    const resolvedId = String(getApplicationId(application) ?? '').trim()
    if (!resolvedId) {
      q.notify({
        type: 'negative',
        message: 'Unable to identify this COC application.',
        position: 'top',
      })
      return
    }

    releaseLoading.value = true
    try {
      const response = await api.post('/hr/coc-applications/' + resolvedId + '/release')
      const responseMessage = String(response?.data?.message || '').trim()
      const updatedApplication = normalizeBackendApplicationShape(
        extractSingleApplicationFromPayload(response?.data),
      )

      let nextApplication = application
      if (updatedApplication && typeof updatedApplication === 'object') {
        applyCocApplicationUpdate(updatedApplication)
        nextApplication =
          normalizeBackendApplicationShape({
            ...(application && typeof application === 'object' ? application : {}),
            ...updatedApplication,
          }) ||
          ({
            ...(application && typeof application === 'object' ? application : {}),
            ...updatedApplication,
          })
      }

      await fetchLatestHrCocApplication(nextApplication)

      q.notify({
        type: 'positive',
        message: responseMessage || 'COC application release confirmed.',
        position: 'top',
      })
      return
    } catch (err) {
      const msg = resolveApiErrorMessage(
        err,
        'Unable to mark this COC application as released right now.',
      )
      q.notify({ type: 'negative', message: msg, position: 'top' })
      return
    } finally {
      releaseLoading.value = false
    }
  }

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

async function undoApplicationReceive(target = selectedApp.value) {
  const application = resolveApplication(target) || target
  if (!isApplicationReceivedByHr(application)) return false

  const id = getApplicationId(application)
  if (!id) {
    q.notify({
      type: 'negative',
      message: 'Unable to identify this application.',
      position: 'top',
    })
    return false
  }

  undoReceiveLoading.value = true
  try {
    const endpoint = isCocApplication(application)
      ? '/hr/coc-applications/' + id + '/undo-receive'
      : '/hr/leave-applications/' + id + '/undo-receive'
    const response = await api.post(endpoint)
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

      if (isCocApplication(mergedApplication)) {
        applyCocApplicationUpdate(mergedApplication)
        await fetchLatestHrCocApplication(mergedApplication)
      } else {
        applyLeaveApplicationUpdate(mergedApplication)
        await fetchLatestHrLeaveApplication(mergedApplication)
      }
    }

    q.notify({
      type: 'positive',
      message: responseMessage || 'HR receipt was undone.',
      position: 'top',
    })
    return true
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to undo HR receipt right now.')
    q.notify({ type: 'negative', message: msg, position: 'top' })
    return false
  } finally {
    undoReceiveLoading.value = false
  }
}

async function undoApplicationRelease(target = selectedApp.value) {
  const application = resolveApplication(target) || target
  if (!isApplicationReleased(application)) return false

  const id = getApplicationId(application)
  if (!id) {
    q.notify({
      type: 'negative',
      message: 'Unable to identify this application.',
      position: 'top',
    })
    return false
  }

  undoReleaseLoading.value = true
  try {
    const endpoint = isCocApplication(application)
      ? '/hr/coc-applications/' + id + '/undo-release'
      : '/hr/leave-applications/' + id + '/undo-release'
    const response = await api.post(endpoint)
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

      if (isCocApplication(mergedApplication)) {
        applyCocApplicationUpdate(mergedApplication)
        await fetchLatestHrCocApplication(mergedApplication)
      } else {
        applyLeaveApplicationUpdate(mergedApplication)
        await fetchLatestHrLeaveApplication(mergedApplication)
      }
    }

    q.notify({
      type: 'positive',
      message: responseMessage || 'HR release was undone.',
      position: 'top',
    })
    return true
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to undo HR release right now.')
    q.notify({ type: 'negative', message: msg, position: 'top' })
    return false
  } finally {
    undoReleaseLoading.value = false
  }
}

async function markApplicationCmoCbmoReviewed(target = selectedApp.value) {
  const application = resolveApplication(target) || target
  if (!canCmoCbmoReviewApplication(application)) return false

  const id = getApplicationId(application)
  if (!id) {
    q.notify({
      type: 'negative',
      message: 'Unable to identify this application.',
      position: 'top',
    })
    return false
  }

  releaseLoading.value = true
  try {
    const endpoint = isCocApplication(application)
      ? '/hr/coc-applications/' + id + '/cmo-cbmo-review'
      : '/hr/leave-applications/' + id + '/cmo-cbmo-review'
    const response = await api.post(endpoint)
    const responseMessage = String(response?.data?.message || '').trim()
    const updatedApplication = normalizeBackendApplicationShape(
      extractSingleApplicationFromPayload(response?.data),
    )
    const reviewedAt = new Date().toISOString()
    const fallbackApplication =
      normalizeBackendApplicationShape({
        ...(application && typeof application === 'object' ? application : {}),
        has_cmo_cbmo_reviewed: true,
        hasCmoCbmoReviewed: true,
        cmo_cbmo_reviewed_at: reviewedAt,
        cmoCbmoReviewedAt: reviewedAt,
      }) ||
      ({
        ...(application && typeof application === 'object' ? application : {}),
        has_cmo_cbmo_reviewed: true,
        hasCmoCbmoReviewed: true,
        cmo_cbmo_reviewed_at: reviewedAt,
        cmoCbmoReviewedAt: reviewedAt,
      })
    const mergedApplication =
      updatedApplication && typeof updatedApplication === 'object'
        ? normalizeBackendApplicationShape({
            ...(application && typeof application === 'object' ? application : {}),
            ...updatedApplication,
          }) ||
          ({
            ...(application && typeof application === 'object' ? application : {}),
            ...updatedApplication,
          })
        : fallbackApplication

    if (isCocApplication(mergedApplication)) {
      applyCocApplicationUpdate(mergedApplication)
      await fetchLatestHrCocApplication(mergedApplication)
    } else {
      const selectedId = String(getApplicationId(selectedApp.value) ?? '').trim()
      if (selectedId === String(id).trim()) {
        selectedApp.value = mergedApplication
      }
      applyLeaveApplicationUpdate(mergedApplication)
      await fetchLatestHrLeaveApplication(mergedApplication)
    }

    q.notify({
      type: 'positive',
      message: responseMessage || 'Application marked for CMO/CVMO Review.',
      position: 'top',
    })
    return true
  } catch (err) {
    const msg = resolveApiErrorMessage(
      err,
      'Unable to mark this application for CMO/CVMO Review right now.',
    )
    q.notify({ type: 'negative', message: msg, position: 'top' })
    return false
  } finally {
    releaseLoading.value = false
  }
}

async function openActionConfirm(type, target) {
  const resolvedType = String(type || '').trim().toLowerCase()
  let application = resolveApplication(target) || target || null
  if (!application) return

  const isApproveAction = resolvedType === 'approve'
  if (
    isApproveAction &&
    !isCocApplication(application) &&
    getApplicationRawStatusKey(application) === 'PENDING_HR'
  ) {
    application = await fetchLatestHrLeaveApplication(application)
  }

  const needsReceiveBeforeApprove =
    isApproveAction &&
    !isCocApplication(application) &&
    getApplicationRawStatusKey(application) === 'PENDING_HR' &&
    !isRecallRequestAction(application) &&
    !isApplicationReceivedByHr(application)

  if (needsReceiveBeforeApprove) {
    q.dialog({
      class: 'hr-receive-required-dialog',
      title: 'Receive Required',
      message: 'This application needs to be received by HR first before approving.',
      cancel: {
        label: 'Cancel',
        flat: true,
        color: 'grey-7',
        class: 'hr-receive-required-dialog__button',
      },
      ok: {
        label: 'Receive',
        color: 'primary',
        unelevated: true,
        class: 'hr-receive-required-dialog__button',
      },
      persistent: true,
    }).onOk(async () => {
      const didReceive = await markApplicationReceived(application)
      if (!didReceive) return

      await fetchLatestHrLeaveApplication(application)
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

function isLateCocSourceView() {
  return applicationTypeFilter.value === 'COC' && applicationSourceFilter === 'late_filing'
}

function getLateCocMutationFallbackPatch(actionType) {
  const normalizedActionType = String(actionType || '').trim().toLowerCase()

  if (normalizedActionType === 'approve') {
    return {
      raw_status: 'PENDING_ADMIN',
      rawStatus: 'PENDING_ADMIN',
      group_raw_status: 'PENDING_ADMIN',
      status: 'Department Recommendation',
    }
  }

  if (normalizedActionType === 'reject' || normalizedActionType === 'disapprove') {
    return {
      raw_status: 'REJECTED',
      rawStatus: 'REJECTED',
      group_raw_status: 'REJECTED',
      status: 'Disapproved',
    }
  }

  return {}
}

async function handleDialogMutationSuccess(payload = {}) {
  const mutationActionType = String(payload?.actionType || '').trim().toLowerCase()
  const payloadApplication =
    payload?.application && typeof payload.application === 'object' ? payload.application : null
  const applicationId = String(payload?.applicationId ?? payload?.id ?? '').trim()
  const applicationKey = String(
    payload?.applicationKey ||
      (payloadApplication ? getApplicationIdentityKey(payloadApplication) : '') ||
      applicationId,
  ).trim()
  showDetailsDialog.value = false

  const initialApplication =
    (applicationKey ? resolveApplication(applicationKey) : null) ||
    (applicationId ? resolveApplication(applicationId) : null)

  if (isLateCocSourceView()) {
    const fallbackPatch = getLateCocMutationFallbackPatch(mutationActionType)
    const lateCocBaseApplication =
      (initialApplication && typeof initialApplication === 'object' && initialApplication) ||
      (payloadApplication && typeof payloadApplication === 'object' && payloadApplication) ||
      (applicationId ? { id: applicationId, application_type: 'COC' } : null)

    if (lateCocBaseApplication) {
      const lateCocNextApplication =
        normalizeBackendApplicationShape({
          ...lateCocBaseApplication,
          ...(payloadApplication || {}),
          ...fallbackPatch,
        }) ||
        ({
          ...lateCocBaseApplication,
          ...(payloadApplication || {}),
          ...fallbackPatch,
        })

      applyCocApplicationUpdate(lateCocNextApplication)
      await fetchLatestHrCocApplication(lateCocNextApplication)
    }

    const refreshedLateCocApplication =
      (applicationKey ? resolveApplication(applicationKey) : null) ||
      (applicationId ? resolveApplication(applicationId) : null)

    if (refreshedLateCocApplication) {
      selectedApp.value = refreshedLateCocApplication
    }
    return
  }

  await fetchApplications()

  const refreshedApplication =
    (applicationKey ? resolveApplication(applicationKey) : null) ||
    (applicationId ? resolveApplication(applicationId) : null)

  if (refreshedApplication) {
    selectedApp.value = refreshedApplication
  }

  const shouldPromptReleaseAfterApproval = mutationActionType === 'approve'
  if (!shouldPromptReleaseAfterApproval) return
  if (!refreshedApplication || isCocApplication(refreshedApplication)) return
  if (!canReleaseApplication(refreshedApplication)) return

  q.dialog({
    title: 'Ready to release application?',
    message: 'This leave application is approved. Do you want to release it now?',
    cancel: {
      label: 'Later',
      flat: true,
      color: 'grey-7',
    },
    ok: {
      label: 'Yes',
      unelevated: true,
      color: 'secondary',
    },
    persistent: true,
  }).onOk(async () => {
    await markApplicationReleased(refreshedApplication)
  })
}

  return {
    EMPLOYMENT_TYPE_FILTER_LABELS,
    applicationTableColumns,
    applications,
    applicationsForTable,
    applyLeaveApplicationUpdate,
    buildApplicationTimeline,
    canEditApplication,
    canOverrideApplicationPayStatus,
    canPrintCocCertificate,
    canRecallApplication,
    canCmoCbmoReviewApplication,
    canReceiveApplication,
    canReleaseApplication,
    clearEmploymentTypeFilter,
    columns,
    confirmApplicationCmoCbmoReview,
    confirmApplicationReceive,
    confirmApplicationReceiveUndo,
    confirmApplicationRelease,
    confirmApplicationReleaseUndo,
    confirmActionTarget,
    confirmActionType,
    createRecalledCompanionRow,
    editTargetApp,
    employmentTypeFilter,
    employmentTypeFilterLabel,
    pendingReceiveFilter,
    pendingReleaseFilter,
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
    getApplicationEditRequestCurrentDuration,
    getApplicationEditRequestFromDates,
    getApplicationEditRequestReason,
    getApplicationEditRequestRequestedAt,
    getApplicationEditRequestRequestedDuration,
    getApplicationEditRequestSectionTitle,
    getApplicationEditRequestToDates,
    getCocBaseCreditableDisplay,
    getCocRawOvertimeDisplay,
    getCocCreditedHoursDisplay,
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
    getApplicationType,
    getApplicationCtoRequiredHoursDisplay,
    getApplicationCtoRequiredHoursValue,
    getCtoDeductedHoursDisplay,
    getCurrentCtoAvailableHoursDisplay,
    getCurrentCtoAvailableHoursValue,
    getCurrentLeaveBalanceClass,
    getCurrentLeaveBalanceDisplay,
    getCurrentLeaveBalanceValue,
    shouldShowCurrentLeaveBalance,
    shouldShowApplicationEditRequestSection,
    shouldShowApplicationEditRequestDateComparison,
    getCurrentLeaveTypeId,
    getCurrentLeaveTypeLabel,
    getCocNatureOfOvertimeLines,
    getCurrentReasonDisplay,
    getDateCoverageLabel,
    getDateSearchValues,
    getDateSubsetTotalDays,
    getDetailsRemarksRows,
    shouldShowDetailsRemarks,
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
    handleTableRequest,
    handleConfirmRequestReject,
    handleDialogMutationSuccess,
    hasApplicationAttachment,
    hasApplicationEditRequest,
    hasEditRequestSignal,
    hasExplicitTimeComponent,
    hasMobileApplicationActions,
    hasPendingDateUpdate,
    hasPendingDurationUpdate,
    isCtoLeaveApplication,
    hasPendingLeaveTypeUpdate,
    hasPendingReasonUpdate,
    isApplicationReceivedByHr,
    isApplicationCmoCbmoReviewed,
    isApplicationReleased,
    isApplicationEditCancellationRequest,
    isCancelledByUser,
    isCocApplication,
    isServerPaginatedLeaveView,
    isCancellationRequestAction,
    isRecallRequestAction,
    isEditUpdateRequest,
    isPendingEditRequest,
    isRecallableLeaveApplication,
    isTruthyBackendFlag,
    latestLeaveBalanceEntriesByEmployee,
    loading,
    markApplicationReceived,
    markApplicationCmoCbmoReviewed,
    markApplicationReleased,
    undoApplicationReceive,
    undoApplicationRelease,
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
    overrideApplicationPayStatus,
    openRecall,
    openReject,
    openTimeline,
    parseDateTimeValue,
    parseSelectedDatesValue,
    payStatusOverrideLoading,
    pickFirstDefinedValue,
    printCocCertificate,
    recallDialogApplication,
    recallTargetApp,
    receiveLoading,
    rejectTargetApp,
    releaseLoading,
    undoReceiveLoading,
    undoReleaseLoading,
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
    resolveCmoCbmoReviewActor,
    resolveCmoCbmoReviewDateValue,
    resolveCmoCbmoReviewHistoryEntry,
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
    timelineLoading,
    statusSearch,
    tablePagination,
    toIsoDate,
    toIsoDateString,
    toSelectedDateCoverageMap,
    toSelectedDatePayStatusMap,
    tokenizeSearchValue,
    viewApplicationAttachment,
  }
}
