import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { api } from 'src/boot/axios'
import { generateLeaveFormPdf } from 'src/utils/leave-form-pdf'
import { generateCocApplicationPdf, isReviewedCocApplicationPrintable } from 'src/utils/coc-form-pdf'
import { generateRequestChangesApprovedLeavePdf } from 'src/utils/request-changes-approved-leave-pdf'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'
import { printAdminApplicationsPdf } from 'src/utils/admin-applications-pdf'
import {
  getApplicationRequestedDayCount,
  getApplicationSelectedDates,
  normalizeIsoDate,
  parseInclusiveDateText,
} from 'src/utils/leave-date-locking'

const mobileApplicationColumnWidths = {
  employee: '180px',
  status: '134px',
  leaveType: '148px',
}

const REQUIRED_LEAVE_BALANCE_TYPES = [
  'Vacation Leave',
  'Sick Leave',
  'CTO Leave',
  'Mandatory / Forced Leave',
  'Special Privilege Leave',
  'Wellness Leave',
]

const EVENT_BASED_LEAVE_BALANCE_TYPES = [
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
const ctoStandardDayHours = 8
const queueGroupPriority = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
  RECALLED: 3,
  OTHER: 4,
}
const queueStagePriority = {
  PENDING_LATE_HR: 1,
  PENDING_HR_RECEIVE: 2,
  PENDING_HR_REVIEW: 3,
  PENDING_HR_CLASSIFICATION: 4,
  PENDING_ADMIN: 5,
  PENDING_ADMIN_REVIEW: 6,
  PENDING_RELEASE: 7,
  PENDING: 8,
}

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

export function useAdminApplicationsPage() {
  const $q = useQuasar()
  const route = useRoute()

  const columns = [
    { name: 'employee', label: 'Employee', align: 'left' },
    {
      name: 'leaveType',
      label: 'Leave Type',
      field: (row) => {
        const leaveTypeLabel = formatApplicationLeaveTypeLabel(row?.leaveType)
        return formatMonetizationLeaveTypeLabel(leaveTypeLabel, row?.is_monetization)
      },
      align: 'left',
    },
    {
      name: 'dateFiled',
      label: 'Date Filed',
      field: 'dateFiled',
      align: 'left',
    },
    {
      name: 'inclusiveDates',
      label: 'Inclusive Dates',
      field: (row) => row?.is_monetization ? 'N/A' : getApplicationDurationLabel(row),
      align: 'left',
    },
    {
      name: 'leaveBalance',
      label: 'Leave Balance',
      field: 'leave_balance',
      align: 'left',
    },
    {
      name: 'days',
      label: 'Duration',
      field: (row) => row?.is_monetization ? 'N/A' : getApplicationDurationDisplay(row),
      align: 'center',
    },
    {
      name: 'status',
      label: 'Status',
      field: 'status',
      align: 'left',
    },
    {
      name: 'actions',
      label: 'Actions',
      align: 'center',
      style: 'width: 228px',
      headerStyle: 'width: 228px',
    },
  ]

  const loading = ref(true)
  const actionLoading = ref(false)
  const applicationRows = ref([])
  const localSubmittedApplicationOverrides = ref([])
  const statusSearch = ref('')
  const applicationsPagination = ref({
    page: 1,
    rowsPerPage: 10,
  })
  const showApplyLeaveDialog = ref(false)
  const showDetailsDialog = ref(false)
  const showTimelineDialog = ref(false)
  const timelineLoading = ref(false)
  const showCalendarPreviewDialog = ref(false)
  const showDisapproveDialog = ref(false)
  const showConfirmActionDialog = ref(false)
  const showActionResultDialog = ref(false)
  const selectedApp = ref(null)
  const calendarPreviewApp = ref(null)
  const calendarPreviewModel = ref([])
  const calendarPreviewKey = ref(0)
  const calendarPreviewRef = ref(null)
  const calendarPreviewDateWarning = ref('')
  const calendarPreviewWarningDate = ref('')
  const calendarPreviewWarningStyle = ref({})
  const calendarPreviewView = ref({
    year: String(new Date().getFullYear()),
    month: String(new Date().getMonth() + 1).padStart(2, '0'),
  })
  const confirmActionType = ref('approve')
  const confirmActionTarget = ref(null)
  const disapproveId = ref('')
  const remarks = ref('')
  const rejectionMode = ref('disapprove')
  const disapproveTargetApp = ref(null)
  const actionResultType = ref('approved')
  const actionResultApp = ref(null)
  const actionResultIsEditRequestApproval = ref(false)

  const applicationTableColumns = computed(() => {
    if (!$q.screen.lt.sm) return columns

    return ['employee', 'status', 'leaveType']
      .map((name) => {
        const column = columns.find((entry) => entry.name === name)
        if (!column) return null

        const mobileWidth = mobileApplicationColumnWidths[name]
        if (!mobileWidth) return column

        return {
          ...column,
          style: `min-width: ${mobileWidth};`,
          headerStyle: `min-width: ${mobileWidth}; text-align: left;`,
        }
      })
      .filter(Boolean)
  })

  const applicationsForTable = computed(() => {
    const queryTokens = getSearchTokens(statusSearch.value)
    const visibleApplications = applicationRows.value.filter((app) => !isCancelledByUser(app))
    const filteredApplications = queryTokens.length
      ? visibleApplications.filter((app) => {
          const searchText = getApplicationSearchText(app)
          return queryTokens.every((token) => searchText.includes(token))
        })
      : visibleApplications

    return [...filteredApplications].sort(compareApplicationsForTable)
  })

  const leaveApplicationRows = computed(() =>
    (applicationRows.value ?? []).filter(
      (application) => !isCocApplication(application) && application?.application_row_variant !== 'recalled',
    ),
  )

  const latestLeaveBalanceEntriesByEmployee = computed(() => {
    const entriesByEmployee = new Map()
    const applications = [...(applicationRows.value ?? [])].sort(compareApplicationsByRecencyDesc)

    for (const app of applications) {
      const employeeKey = getEmployeeBalanceLookupKey(app)
      if (!employeeKey) continue

      const latestEntries = getLeaveBalanceEntriesFromSnapshot(app)
      if (!latestEntries.length) continue

      let employeeEntries = entriesByEmployee.get(employeeKey)
      if (!employeeEntries) {
        employeeEntries = new Map()
        entriesByEmployee.set(employeeKey, employeeEntries)
      }

      for (const entry of latestEntries) {
        const leaveTypeKey = getLeaveBalanceTypeKey(entry.label)
        if (!leaveTypeKey || employeeEntries.has(leaveTypeKey)) continue
        employeeEntries.set(leaveTypeKey, entry)
      }
    }

    return entriesByEmployee
  })

  const selectedAppTimeline = computed(() => buildApplicationTimeline(selectedApp.value))
  const calendarPreviewYearMonth = computed(
    () => `${calendarPreviewView.value.year}/${calendarPreviewView.value.month}`,
  )
  const calendarPreviewEmployeeName = computed(
    () => getApplicationEmployeeDisplayName(calendarPreviewApp.value) || 'Employee',
  )
  const calendarPreviewEmployeeApplications = computed(() => {
    const application = calendarPreviewApp.value
    if (!application) return []

    const applicationState = getApplicationCalendarState(application)
    const requestUpdateDates = getApplicationRequestUpdateCalendarDates(application)
    const applicationDates = getApplicationCalendarPreviewDates(application)
    if ((!applicationState && requestUpdateDates.length === 0) || applicationDates.length === 0) return []

    return [application]
  })
  const calendarPreviewDateStates = computed(() => {
    const dateStates = new Map()

    for (const application of calendarPreviewEmployeeApplications.value) {
      const applicationState = getApplicationCalendarState(application)
      const requestUpdateDates = getApplicationRequestUpdateCalendarDates(application)
      const showRequestUpdateOnly = requestUpdateDates.length > 0

      if (applicationState && !showRequestUpdateOnly) {
        for (const date of getApplicationCalendarDates(application)) {
          if (!date) continue

          const existingState = dateStates.get(date)
          if (!existingState || applicationState === 'pending') {
            dateStates.set(date, applicationState)
          }
        }
      }

      for (const requestedDate of requestUpdateDates) {
        if (!requestedDate) continue
        dateStates.set(requestedDate, 'request-update')
      }
    }

    return dateStates
  })
  const calendarPreviewStateCounts = computed(() => {
    const counts = {
      pending: 0,
      approved: 0,
      requestUpdate: 0,
    }

    for (const state of calendarPreviewDateStates.value.values()) {
      if (state === 'pending') counts.pending += 1
      if (state === 'approved') counts.approved += 1
      if (state === 'request-update') counts.requestUpdate += 1
    }

    return counts
  })
  const calendarPreviewWarningState = computed(
    () => calendarPreviewDateStates.value.get(calendarPreviewWarningDate.value) || 'pending',
  )
  const rejectionDialogTitle = computed(() =>
    rejectionMode.value === 'cancel' ? 'Cancel Application' : 'Disapprove Application',
  )
  const rejectionDialogLabel = computed(() =>
    rejectionMode.value === 'cancel' ? 'Reason for cancellation' : 'Reason for disapproval',
  )
  const canPrintRequestChangesActionResult = computed(
    () =>
      actionResultType.value === 'approved' &&
      actionResultIsEditRequestApproval.value &&
      Boolean(actionResultApp.value) &&
      !isCocApplication(actionResultApp.value),
  )

  watch(statusSearch, () => {
    applicationsPagination.value.page = 1
  })

  watch(showCalendarPreviewDialog, (isOpen) => {
    if (!isOpen) {
      clearCalendarPreviewWarning()
      return
    }
    syncCalendarPreviewDecorations()
  })

  watch(calendarPreviewDateStates, () => {
    if (!showCalendarPreviewDialog.value) return
    syncCalendarPreviewDecorations()
  })

  watch(
    () => route.query.search,
    (value) => {
      statusSearch.value = String(value || '')
    },
    { immediate: true },
  )

  onMounted(fetchApplications)

  function openApplyLeaveDialog() {
    showApplyLeaveDialog.value = true
  }

  function closeApplyLeaveDialog() {
    showApplyLeaveDialog.value = false
  }

  async function handleApplyLeaveSubmitted(submittedApplication = null) {
    if (submittedApplication && typeof submittedApplication === 'object') {
      upsertLocalSubmittedApplicationOverride(submittedApplication)
    }
    closeApplyLeaveDialog()
    await fetchApplications()
  }

  async function fetchWorkflowDetailSnapshotsForStageSensitiveRows(applications = []) {
    const stageSensitiveRows = (Array.isArray(applications) ? applications : []).filter((application) => {
      if (!application || typeof application !== 'object') return false
      if (isCocApplication(application)) return false
      if (!hasAdminEditRequestSignal(application)) return false

      const rawStatus = getApplicationRawStatus(application)
      if (rawStatus !== 'PENDING_HR' && rawStatus !== 'APPROVED') return false

      const id = String(
        application?.id ??
          application?.application_id ??
          application?.leave_application_id ??
          '',
      ).trim()

      return Boolean(id)
    })

    if (!stageSensitiveRows.length) return []

    const detailRequests = stageSensitiveRows.map(async (application) => {
      const id = String(
        application?.id ??
          application?.application_id ??
          application?.leave_application_id ??
          '',
      ).trim()
      if (!id) return null

      try {
        const response = await api.get(`/admin/leave-applications/${id}`)
        const detailedApplication = extractSingleApplicationFromPayload(response?.data)
        if (!detailedApplication || typeof detailedApplication !== 'object') return null
        return normalizeAdminApplicationForDisplay(detailedApplication)
      } catch {
        return null
      }
    })

    const detailRows = await Promise.all(detailRequests)
    return detailRows.filter((application) => application && typeof application === 'object')
  }

  async function fetchApplications() {
    loading.value = true
    try {
      const [dashboardResponse, leaveApplicationsResponse, cocApplicationsResponse] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/leave-applications').catch(() => null),
        api.get('/admin/coc-applications').catch(() => null),
      ])

      const mergedApplications = mergeApplications(
        extractApplicationsFromPayload(dashboardResponse?.data),
        extractApplicationsFromPayload(leaveApplicationsResponse?.data),
        extractApplicationsFromPayload(cocApplicationsResponse?.data),
        localSubmittedApplicationOverrides.value,
      )

      const normalizedMergedApplications = mergedApplications.map((application) =>
        normalizeAdminApplicationForDisplay(application),
      )

      const workflowDetailSnapshots = await fetchWorkflowDetailSnapshotsForStageSensitiveRows(
        normalizedMergedApplications,
      )

      const mergedApplicationsWithWorkflowSnapshots = workflowDetailSnapshots.length > 0
        ? mergeApplications(normalizedMergedApplications, workflowDetailSnapshots)
        : normalizedMergedApplications

      applicationRows.value = expandApplicationsForDisplay(
        mergedApplicationsWithWorkflowSnapshots.map((application) =>
          normalizeAdminApplicationForDisplay(application),
        ),
      )

      const selectedRowKey = getApplicationRowKey(selectedApp.value)
      const selectedId = Number(selectedApp.value?.id)
      const refreshedSelectedApp = selectedRowKey
        ? applicationRows.value.find((application) => getApplicationRowKey(application) === selectedRowKey)
        : Number.isFinite(selectedId)
          ? applicationRows.value.find((application) => Number(application?.id) === selectedId)
          : null
      if (refreshedSelectedApp) {
        selectedApp.value = refreshedSelectedApp
      }
    } catch (err) {
      const message = resolveApiErrorMessage(err, 'Unable to load applications right now.')
      $q.notify({ type: 'negative', message, position: 'top' })
      applicationRows.value = []
    } finally {
      loading.value = false
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return ''

    if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr).trim())) {
      return formatDate(dateStr)
    }

    const parsedDate = new Date(dateStr)
    if (Number.isNaN(parsedDate.getTime())) return ''

    return parsedDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  function formatDayValue(value) {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return '0'
    return Number.isInteger(numericValue) ? String(numericValue) : String(numericValue)
  }

  function normalizeDurationUnit(value) {
    const normalized = String(value || '').trim().toLowerCase()
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

  function resolveApplicationDuration(app) {
    const explicitUnit = normalizeDurationUnit(app?.duration_unit)
    const explicitValue = Number(app?.duration_value)
    if (explicitUnit && Number.isFinite(explicitValue)) {
      return { value: explicitValue, unit: explicitUnit }
    }

    if (isCocApplication(app)) {
      const hourValue = Number(app?.days ?? app?.total_days)
      if (Number.isFinite(hourValue)) return { value: hourValue, unit: 'hour' }

      const minutes = Number(app?.total_no_of_coc_applied_minutes)
      if (Number.isFinite(minutes)) return { value: minutes / 60, unit: 'hour' }

      return { value: 0, unit: 'hour' }
    }

    const actualDayValue = getActualRequestedDayCount(app)
    if (Number.isFinite(actualDayValue) && actualDayValue > 0) {
      return { value: actualDayValue, unit: 'day' }
    }

    const derivedDays = Number(getApplicationDayCount(app))
    if (Number.isFinite(derivedDays)) return { value: derivedDays, unit: 'day' }

    const dayValue = Number(app?.days ?? app?.total_days)
    if (Number.isFinite(dayValue)) return { value: dayValue, unit: 'day' }

    return { value: 0, unit: 'day' }
  }

  function getApplicationDurationDisplay(app) {
    if (isCocApplication(app)) {
      const creditedDisplay = getCocCreditedHoursDisplay(app)
      if (creditedDisplay && creditedDisplay !== 'Pending HR classification' && creditedDisplay !== 'N/A') {
        return creditedDisplay
      }

      return getCocBaseCreditableDisplay(app)
    }

    if (!isCocApplication(app) && !app?.is_monetization) {
      const storedRecallDateKeys = getStoredRecallDateKeys(app)
      const shouldUseVisibleDuration = storedRecallDateKeys.length > 0 || app?.application_row_variant === 'recalled'
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

    const resolved = resolveApplicationDuration(app)
    return formatDurationDisplay(resolved.value, resolved.unit)
  }

  function formatLeaveBalanceValue(value) {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return ''
    return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(2)
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

  function normalizeApplicationType(value) {
    const normalized = String(value || '').trim().toUpperCase()
    if (normalized === 'COC') return 'COC'
    if (normalized === 'LEAVE') return 'LEAVE'
    return ''
  }

  function getApplicationType(application) {
    const explicitType = normalizeApplicationType(
      application?.application_type ?? application?.applicationType ?? application?.type,
    )
    if (explicitType) return explicitType

    const leaveTypeName = normalizeEmployeeName(
      application?.leaveType ??
        application?.leave_type ??
        application?.leaveTypeName ??
        application?.leave_type_name,
    )

    if (leaveTypeName === 'coc application' || leaveTypeName === 'coc') return 'COC'
    return 'LEAVE'
  }

  function isCocApplication(application) {
    return getApplicationType(application) === 'COC'
  }

  function getApplicationExplicitId(application) {
    return (
      application?.id ??
      application?.application_id ??
      application?.leave_application_id ??
      application?.coc_application_id
    )
  }

  function getApplicationRowKey(application, index = 0) {
    const typeKey = getApplicationType(application)
    const explicitId = getApplicationExplicitId(application)

    if (explicitId !== undefined && explicitId !== null && String(explicitId).trim() !== '') {
      return `${typeKey}:${String(explicitId).trim()}`
    }

    return `${typeKey}:index:${index}`
  }

  function createRecalledCompanionRow(app, index = 0) {
    if (!app || typeof app !== 'object' || isCocApplication(app)) return null
    if (getApplicationRawStatus(app) !== 'APPROVED') return null

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
      selected_dates: recalledDateKeys,
      recall_selected_dates: recalledDateKeys,
      actual_total_days: recalledDays,
      applied_total_days: recalledDays,
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

  function normalizeLookupValue(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
  }

  function normalizeEmployeeName(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  }

  function getApplicationEmployeeDisplayName(application) {
    return (
      application?.employeeName ||
      application?.employee_name ||
      application?.employee?.full_name ||
      [
        application?.employee?.firstname,
        application?.employee?.middlename,
        application?.employee?.surname,
      ]
        .filter(Boolean)
        .join(' ') ||
      [application?.firstname, application?.middlename, application?.surname]
        .filter(Boolean)
        .join(' ')
    )
  }

  function getApplicationEmployeeLookupCandidates(application) {
    return [
      application?.employee_control_no,
      application?.employee?.control_no,
    ]
      .map((value) => normalizeLookupValue(value))
      .filter(Boolean)
  }

  function getApplicationMergeKey(application, index) {
    const typeKey = getApplicationType(application)
    const explicitId = getApplicationExplicitId(application)

    if (explicitId !== undefined && explicitId !== null && String(explicitId).trim() !== '') {
      return `id:${typeKey}:${String(explicitId).trim()}`
    }

    const employeeKey = getApplicationEmployeeLookupCandidates(application)[0]
    const employeeName = normalizeEmployeeName(getApplicationEmployeeDisplayName(application))
    const leaveTypeKey = normalizeEmployeeName(
      application?.leaveType ??
        application?.leave_type ??
        application?.leaveTypeName ??
        application?.leave_type_name,
    )
    const filedDateKey = normalizeLookupValue(
      application?.dateFiled ??
        application?.date_filed ??
        application?.filed_at ??
        application?.filedAt ??
        application?.created_at ??
        application?.createdAt,
    )
    const inclusiveDatesKey = normalizeEmployeeName(getApplicationDurationLabel(application))

    const fallbackKey = [employeeKey || employeeName, leaveTypeKey, filedDateKey, inclusiveDatesKey]
      .filter(Boolean)
      .join('|')

    return fallbackKey ? `fallback:${fallbackKey}` : `index:${index}`
  }

  function getApplicationCompletenessScore(application) {
    const candidates = [
      getApplicationEmployeeDisplayName(application),
      application?.employee_control_no,
      application?.leaveType,
      application?.leave_type_name,
      application?.dateFiled,
      application?.filed_at,
      application?.created_at,
      application?.status,
      application?.raw_status,
      application?.remarks,
      application?.selected_dates,
      application?.pending_update,
      application?.latest_update_request_status,
      application?.status_history,
      application?.startDate,
      application?.start_date,
      application?.endDate,
      application?.end_date,
    ]

    return candidates.filter((value) => {
      if (Array.isArray(value)) return value.length > 0
      return value !== undefined && value !== null && String(value).trim() !== ''
    }).length
  }

  function getApplicationTimestampValue(application) {
    const candidates = [
      application?.updated_at,
      application?.disapproved_at,
      application?.hr_action_at,
      application?.admin_action_at,
      application?.filed_at,
      application?.created_at,
    ]

    for (const candidate of candidates) {
      const timestamp = Date.parse(candidate)
      if (!Number.isNaN(timestamp)) return timestamp
    }

    return 0
  }

  function choosePreferredApplication(existingApplication, incomingApplication) {
    if (!existingApplication) return incomingApplication

    const incomingCompleteness = getApplicationCompletenessScore(incomingApplication)
    const existingCompleteness = getApplicationCompletenessScore(existingApplication)
    if (incomingCompleteness !== existingCompleteness) {
      return incomingCompleteness > existingCompleteness ? incomingApplication : existingApplication
    }

    const incomingTimestamp = getApplicationTimestampValue(incomingApplication)
    const existingTimestamp = getApplicationTimestampValue(existingApplication)
    if (incomingTimestamp !== existingTimestamp) {
      return incomingTimestamp > existingTimestamp ? incomingApplication : existingApplication
    }

    return incomingApplication
  }

  function mergeApplicationRecords(existingApplication, incomingApplication) {
    if (!existingApplication) return incomingApplication

    const preferredApplication = choosePreferredApplication(existingApplication, incomingApplication)
    if (preferredApplication === incomingApplication) {
      return {
        ...existingApplication,
        ...incomingApplication,
      }
    }

    return {
      ...incomingApplication,
      ...existingApplication,
    }
  }

  function mergeApplications(...sources) {
    const mergedApplications = new Map()

    sources.flat().forEach((application, index) => {
      const normalizedApplication = {
        ...application,
        application_type: getApplicationType(application),
        application_uid: getApplicationRowKey(application, index),
      }
      const key = getApplicationMergeKey(normalizedApplication, index)
      const existingApplication = mergedApplications.get(key)
      mergedApplications.set(key, mergeApplicationRecords(existingApplication, normalizedApplication))
    })

    return Array.from(mergedApplications.values())
  }

  function upsertLocalSubmittedApplicationOverride(application) {
    if (!application || typeof application !== 'object') return

    const normalizedApplication = {
      ...application,
      application_type: getApplicationType(application),
    }
    const overrideKey = getApplicationMergeKey(
      normalizedApplication,
      localSubmittedApplicationOverrides.value.length,
    )
    const existingIndex = localSubmittedApplicationOverrides.value.findIndex(
      (item, index) => getApplicationMergeKey(item, index) === overrideKey,
    )

    if (existingIndex === -1) {
      localSubmittedApplicationOverrides.value = [
        normalizedApplication,
        ...localSubmittedApplicationOverrides.value,
      ]
      return
    }

    localSubmittedApplicationOverrides.value = localSubmittedApplicationOverrides.value.map((item, index) =>
      index === existingIndex ? mergeApplicationRecords(item, normalizedApplication) : item,
    )
  }

  function isAdminEditUpdateRequest(app) {
    if (!app || typeof app !== 'object') return false

    const candidates = [app?.has_pending_update_request]

    if (
      candidates.some((value) => value === true || value === 'true' || value === 1 || value === '1')
    ) {
      return true
    }

    if (getAdminUpdateRequestActionType(app)) return true

    return Boolean(app?.pending_update)
  }

  function normalizeAdminUpdateRequestStatus(value) {
    const normalized = String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_')

    if (normalized === 'PENDING') return 'PENDING'
    if (normalized === 'APPROVED') return 'APPROVED'
    if (normalized === 'REJECTED') return 'REJECTED'
    return ''
  }

  function normalizeAdminUpdateRequestActionTypeToken(value) {
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

  function resolveAdminUpdateRequestActionTypeFromPayload(payload) {
    if (!payload || typeof payload !== 'object') return ''

    const candidates = [
      payload?.action_type,
      payload?.request_kind,
    ]

    for (const candidate of candidates) {
      const normalized = normalizeAdminUpdateRequestActionTypeToken(candidate)
      if (normalized) return normalized
    }

    return ''
  }

  function getAdminUpdateRequestActionType(app) {
    if (!app || typeof app !== 'object') return ''

    const explicitCandidates = [
      app?.pending_update_action_type,
      app?.latest_update_request_action_type,
    ]

    for (const candidate of explicitCandidates) {
      const normalized = normalizeAdminUpdateRequestActionTypeToken(candidate)
      if (normalized) return normalized
    }

    const payload = getPendingUpdatePayload(app)
    const payloadType = resolveAdminUpdateRequestActionTypeFromPayload(payload)
    if (payloadType) return payloadType

    const remarksToken = normalizeSearchText(app?.remarks || '')
    if (remarksToken.includes('cancel request') || remarksToken.includes('cancellation request')) {
      return REQUEST_ACTION_CANCEL
    }
    if (remarksToken.includes('edit request') || remarksToken.includes('request update')) {
      return REQUEST_ACTION_UPDATE
    }

    return ''
  }

  function isAdminCancellationRequest(app) {
    return getAdminUpdateRequestActionType(app) === REQUEST_ACTION_CANCEL
  }

  function getAdminEditRequestLabelPrefix(app) {
    return isAdminCancellationRequest(app) ? 'Cancel Request' : 'Edit Request'
  }

  function getAdminUpdateRequestReviewNoun(app) {
    return isAdminCancellationRequest(app) ? 'cancellation request' : 'edit request'
  }

  function getAdminLatestUpdateRequestStatus(app) {
    const explicitStatus = normalizeAdminUpdateRequestStatus(
      app?.latest_update_request_status ??
        '',
    )
    const historyDecisionStatus = resolveAdminUpdateRequestStatusFromHistory(app)

    if (explicitStatus === 'REJECTED' || historyDecisionStatus === 'REJECTED') {
      return 'REJECTED'
    }

    if (explicitStatus === 'APPROVED' || historyDecisionStatus === 'APPROVED') {
      return 'APPROVED'
    }

    if (explicitStatus || historyDecisionStatus) {
      return explicitStatus || historyDecisionStatus
    }

    return isAdminEditUpdateRequest(app) ? 'PENDING' : ''
  }

  function normalizeAdminStatusHistoryToken(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
  }

  function normalizeAdminStatusHistoryActionToken(value) {
    return String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_')
  }

  function resolveAdminUpdateRequestStatusFromHistory(app) {
    const hasUpdateRequestContext = Boolean(
      app?.latest_update_requested_at ||
        app?.latest_update_request_payload ||
        app?.pending_update ||
        app?.latest_update_request_action_type ||
        app?.pending_update_action_type,
    )
    const entries = getStatusHistoryEntries(app)
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index] || {}
      const actionToken = normalizeAdminStatusHistoryActionToken(entry?.action)
      const stageToken = normalizeAdminStatusHistoryToken(entry?.stage)
      const remarksToken = normalizeAdminStatusHistoryToken(entry?.remarks)

      if (
        [
          'EDIT_REQUEST_APPROVED',
          'UPDATE_REQUEST_APPROVED',
          'CANCELLATION_REQUEST_APPROVED',
          'CANCEL_REQUEST_APPROVED',
          'REQUEST_UPDATE_APPROVED',
          'REQUEST_CANCEL_APPROVED',
        ].includes(actionToken)
      ) {
        return 'APPROVED'
      }

      if (
        [
          'EDIT_REQUEST_REJECTED',
          'UPDATE_REQUEST_REJECTED',
          'CANCELLATION_REQUEST_REJECTED',
          'CANCEL_REQUEST_REJECTED',
          'REQUEST_UPDATE_REJECTED',
          'REQUEST_CANCEL_REJECTED',
        ].includes(actionToken)
      ) {
        return 'REJECTED'
      }

      if (
        ['ADMIN_REJECTED', 'HR_REJECTED'].includes(actionToken) &&
        (
          hasUpdateRequestContext ||
          stageToken.includes('edit request') ||
          stageToken.includes('request update') ||
          stageToken.includes('cancellation request') ||
          stageToken.includes('cancel request') ||
          remarksToken.includes('edit request') ||
          remarksToken.includes('request update') ||
          remarksToken.includes('cancellation request') ||
          remarksToken.includes('cancel request')
        )
      ) {
        return 'REJECTED'
      }

      if (
        [
          'REQUEST_UPDATE',
          'UPDATE_REQUESTED',
          'EDIT_REQUEST_SUBMITTED',
          'REQUESTED_UPDATE',
          'EDIT_REQUESTED',
          'REQUEST_CANCEL',
          'CANCEL_REQUESTED',
          'CANCELLATION_REQUEST_SUBMITTED',
          'REQUESTED_CANCELLATION',
          'REQUEST_CANCELLATION',
        ].includes(actionToken)
      ) {
        return 'PENDING'
      }

      if (
        stageToken.includes('edit request approved') ||
        stageToken.includes('cancellation request approved') ||
        stageToken.includes('cancel request approved') ||
        remarksToken.includes('edit request approved') ||
        remarksToken.includes('cancellation request approved') ||
        remarksToken.includes('cancel request approved')
      ) {
        return 'APPROVED'
      }

      if (
        stageToken.includes('edit request rejected') ||
        stageToken.includes('edit request disapproved') ||
        stageToken.includes('cancellation request rejected') ||
        stageToken.includes('cancellation request disapproved') ||
        stageToken.includes('cancel request rejected') ||
        remarksToken.includes('edit request rejected') ||
        remarksToken.includes('edit request disapproved') ||
        remarksToken.includes('cancellation request rejected') ||
        remarksToken.includes('cancellation request disapproved') ||
        remarksToken.includes('cancel request rejected')
      ) {
        return 'REJECTED'
      }

      if (
        stageToken.includes('edit request submitted') ||
        stageToken.includes('edit requested') ||
        stageToken.includes('pending edit review') ||
        stageToken.includes('cancellation request submitted') ||
        stageToken.includes('cancel request submitted') ||
        stageToken.includes('pending cancellation review') ||
        remarksToken.includes('edit request') ||
        remarksToken.includes('request update') ||
        remarksToken.includes('cancellation request') ||
        remarksToken.includes('cancel request')
      ) {
        return 'PENDING'
      }
    }

    return ''
  }

  function assignBackendAliasIfMissing(target, canonicalKey, aliasKey) {
    const canonicalValue = target?.[canonicalKey]
    const hasCanonicalValue =
      canonicalValue !== undefined &&
      canonicalValue !== null &&
      (!(typeof canonicalValue === 'string') || canonicalValue.trim() !== '')
    if (hasCanonicalValue) return

    const aliasValue = target?.[aliasKey]
    const hasAliasValue =
      aliasValue !== undefined &&
      aliasValue !== null &&
      (!(typeof aliasValue === 'string') || aliasValue.trim() !== '')
    if (!hasAliasValue) return

    target[canonicalKey] = aliasValue
  }

  function normalizeAdminWorkflowAliases(app) {
    if (!app || typeof app !== 'object') return app

    const normalized = { ...app }

    assignBackendAliasIfMissing(normalized, 'raw_status', 'rawStatus')
    assignBackendAliasIfMissing(normalized, 'employee_name', 'employeeName')
    assignBackendAliasIfMissing(normalized, 'filed_at', 'filedAt')
    assignBackendAliasIfMissing(normalized, 'filed_at', 'dateFiled')
    assignBackendAliasIfMissing(normalized, 'created_at', 'createdAt')
    assignBackendAliasIfMissing(normalized, 'filed_by', 'filedBy')
    assignBackendAliasIfMissing(normalized, 'admin_action_by', 'adminActionBy')
    assignBackendAliasIfMissing(normalized, 'hr_action_by', 'hrActionBy')
    assignBackendAliasIfMissing(normalized, 'recall_action_by', 'recallActionBy')
    assignBackendAliasIfMissing(normalized, 'disapproved_by', 'disapprovedBy')
    assignBackendAliasIfMissing(normalized, 'cancelled_by', 'cancelledBy')
    assignBackendAliasIfMissing(normalized, 'processed_by', 'processedBy')
    assignBackendAliasIfMissing(normalized, 'reviewed_at', 'reviewedAt')
    assignBackendAliasIfMissing(normalized, 'admin_action_at', 'adminActionAt')
    assignBackendAliasIfMissing(normalized, 'hr_action_at', 'hrActionAt')
    assignBackendAliasIfMissing(normalized, 'recall_action_at', 'recallActionAt')
    assignBackendAliasIfMissing(normalized, 'disapproved_at', 'disapprovedAt')
    assignBackendAliasIfMissing(normalized, 'cancelled_at', 'cancelledAt')
    assignBackendAliasIfMissing(normalized, 'received_by', 'receivedBy')
    assignBackendAliasIfMissing(normalized, 'released_by', 'releasedBy')
    assignBackendAliasIfMissing(normalized, 'received_at', 'receivedAt')
    assignBackendAliasIfMissing(normalized, 'released_at', 'releasedAt')
    assignBackendAliasIfMissing(normalized, 'has_hr_received', 'hasHrReceived')
    assignBackendAliasIfMissing(normalized, 'has_hr_released', 'hasHrReleased')
    assignBackendAliasIfMissing(normalized, 'queue_group_status', 'queueGroupStatus')
    assignBackendAliasIfMissing(normalized, 'queue_group_priority', 'queueGroupPriority')
    assignBackendAliasIfMissing(normalized, 'queue_stage_key', 'queueStageKey')
    assignBackendAliasIfMissing(normalized, 'queue_stage_priority', 'queueStagePriority')
    assignBackendAliasIfMissing(normalized, 'recall_selected_dates', 'recallSelectedDates')

    return normalized
  }

  function getApplicationRawStatus(app) {
    if (app?.application_row_variant === 'recalled') return 'RECALLED'

    const normalizeStatusToken = (value) =>
      String(value || '')
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_')

    const groupedStatus = normalizeStatusToken(app?.group_raw_status)
    if (groupedStatus === 'RECALLED') return 'RECALLED'

    const candidates = [app?.raw_status, app?.rawStatus, app?.status]
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

  function getApplicationGroupedRawStatus(app) {
    const grouped = String(app?.group_raw_status || '').trim().toUpperCase()
    if (grouped) return grouped
    return getApplicationRawStatus(app)
  }

  function normalizeAdminApplicationForDisplay(app) {
    if (!app || typeof app !== 'object') return app

    return normalizeAdminWorkflowAliases(app)
  }

  function prettifyLeaveBalanceLabel(value) {
    const label = String(value || '').trim()
    if (!label) return ''

    const normalized = label
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const lower = normalized.toLowerCase()
    if (lower === 'mandatory' || lower === 'forced' || lower === 'mandatory forced leave') {
      return 'Mandatory / Forced Leave'
    }
    if (lower === 'mandatory / forced leave') return 'Mandatory / Forced Leave'
    if (lower === 'mco6' || lower === 'mco6 leave' || lower === 'mc06' || lower === 'mo6 leave') return 'Special Privilege Leave'
  if (lower === 'cto' || lower === 'cto leave') return 'CTO Leave'
  if (lower === 'vacation') return 'Vacation Leave'
  if (lower === 'sick') return 'Sick Leave'
  if (lower === 'vacation leave') return 'Vacation Leave'
  if (lower === 'sick leave') return 'Sick Leave'
  if (lower === 'wellness' || lower === 'wellness leave') return 'Wellness Leave'

    return normalized.replace(/\b\w/g, (char) => char.toUpperCase())
  }

  function formatApplicationLeaveTypeLabel(value) {
    const label = prettifyLeaveBalanceLabel(value)
    if (!label) return ''
    if (label === 'Special Privilege Leave') return 'Special Privilege Leave(MC06)'
    return label
  }

  function formatMonetizationLeaveTypeLabel(value, isMonetization = false) {
    const rawLabel = String(value || '').trim()
    const prefixMatch = rawLabel.match(/^monetization\s*\((.*)\)\s*$/i)
    const suffixMatch = /\(monetization\)\s*$/i.test(rawLabel)

    const normalizedLeaveType = (prefixMatch ? prefixMatch[1] : rawLabel)
      .replace(/\s*\(monetization\)\s*$/i, '')
      .trim()

    if (!normalizedLeaveType) return 'N/A'
    if (isMonetization || prefixMatch || suffixMatch) return `Monetization(${normalizedLeaveType})`

    return normalizedLeaveType
  }

  function toLeaveBalanceAcronym(value) {
    const label = prettifyLeaveBalanceLabel(value)
    if (!label) return ''

  const lower = label.toLowerCase()
  if (lower === 'cto leave') return 'CTO'
  if (lower === 'mandatory / forced leave') return 'FL'
  if (lower === 'special privilege leave') return 'MC06'
  if (lower === 'sick leave') return 'SL'
  if (lower === 'vacation leave') return 'VL'
    if (lower === 'wellness leave') return 'WL'

    const normalized = label
      .replace(/[^A-Za-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map((part) => part.trim().toUpperCase())
      .filter((part) => part && !['AND', 'FOR', 'OF', 'THE'].includes(part))

    if (!normalized.length) return ''
    return normalized.map((part) => part[0]).join('')
  }

  function addLeaveBalanceEntry(entries, seen, label, value) {
    const formattedValue = formatLeaveBalanceValue(value)
    const formattedLabel = prettifyLeaveBalanceLabel(label)
    if (!formattedLabel || formattedValue === '') return

    const key = formattedLabel.toLowerCase()
    if (seen.has(key)) return

    seen.add(key)
    entries.push({ label: formattedLabel, value: formattedValue })
  }

  function getEmployeeBalanceLookupKey(app) {
    const explicitKey = app?.employee_control_no ?? app?.employee?.control_no
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

  function getLeaveBalanceTypeKey(value) {
    return prettifyLeaveBalanceLabel(value).trim().toLowerCase()
  }

  function isEventBasedLeaveBalanceType(value) {
    const typeKey = getLeaveBalanceTypeKey(value)
    return EVENT_BASED_LEAVE_BALANCE_TYPES.some(
      (label) => getLeaveBalanceTypeKey(label) === typeKey,
    )
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

  function shouldShowCurrentLeaveBalance(app) {
    if (!app) return false
    if (isCocApplication(app)) return true

    const leaveTypeCategory = resolveApplicationLeaveTypeCategory(app)
    if (leaveTypeCategory === 'EVENT') return false

    const leaveTypeLabel =
      app?.leaveType ??
      app?.leave_type ??
      app?.leaveTypeName ??
      app?.leave_type_name ??
      ''

    return !isEventBasedLeaveBalanceType(leaveTypeLabel)
  }

  function collectLeaveBalanceEntriesFromValue(entries, seen, source, fallbackLabel = '') {
    if (!source) return

    if (Array.isArray(source)) {
      for (const item of source) {
        if (item == null || typeof item !== 'object') continue

        addLeaveBalanceEntry(
          entries,
          seen,
          item.leave_type_name ||
            item.leave_type ||
            item.type_name ||
            item.type ||
            item.name ||
            item.label ||
            fallbackLabel,
          item.balance ??
            item.remaining_balance ??
            item.available_balance ??
            item.credits ??
            item.value,
        )
      }
      return
    }

    if (typeof source !== 'object') {
      addLeaveBalanceEntry(entries, seen, fallbackLabel, source)
      return
    }

    for (const [key, value] of Object.entries(source)) {
      if (value == null || key === 'as_of_date') continue

      if (typeof value === 'object' && !Array.isArray(value)) {
        addLeaveBalanceEntry(
          entries,
          seen,
          value.leave_type_name ||
            value.leave_type ||
            value.type_name ||
            value.type ||
            value.name ||
            value.label ||
            key,
          value.balance ??
            value.remaining_balance ??
            value.available_balance ??
            value.credits ??
            value.value,
        )
        continue
      }

      addLeaveBalanceEntry(entries, seen, key, value)
    }
  }

  function getLeaveBalanceEntriesFromSnapshot(app) {
    const entries = []
    const seen = new Set()

    collectLeaveBalanceEntriesFromValue(entries, seen, app?.certificationLeaveCredits)
    collectLeaveBalanceEntriesFromValue(entries, seen, app?.certification_leave_credits)
    collectLeaveBalanceEntriesFromValue(entries, seen, app?.leaveBalances)
    collectLeaveBalanceEntriesFromValue(entries, seen, app?.leave_balances)
    collectLeaveBalanceEntriesFromValue(entries, seen, app?.leaveCredits)
    collectLeaveBalanceEntriesFromValue(entries, seen, app?.leave_credits)
    collectLeaveBalanceEntriesFromValue(entries, seen, app?.balances)
    collectLeaveBalanceEntriesFromValue(entries, seen, app?.leave_balance)
    collectLeaveBalanceEntriesFromValue(entries, seen, app?.leave_balance_summary)
    collectLeaveBalanceEntriesFromValue(entries, seen, app?.employee_leave_balances)
    collectLeaveBalanceEntriesFromValue(entries, seen, app?.leaveBalance)

    if (!entries.length) {
      addLeaveBalanceEntry(
        entries,
        seen,
        app?.leaveType || 'Leave Balance',
        app?.balance ?? app?.leave_balance ?? app?.remaining_balance ?? app?.available_balance,
      )
    }

    return entries
  }

  function resolveLatestLeaveBalanceEntries(app) {
    const employeeKey = getEmployeeBalanceLookupKey(app)
    if (!employeeKey) return getLeaveBalanceEntriesFromSnapshot(app)

    const employeeEntries = latestLeaveBalanceEntriesByEmployee.value.get(employeeKey)
    if (!employeeEntries || employeeEntries.size === 0) {
      return getLeaveBalanceEntriesFromSnapshot(app)
    }

    return Array.from(employeeEntries.values())
  }

  function getLeaveBalanceEntries(app) {
    const resolvedEntries = resolveLatestLeaveBalanceEntries(app).filter(
      (entry) => !isEventBasedLeaveBalanceType(entry.label),
    )
    const requiredTypeKeys = new Set(
      REQUIRED_LEAVE_BALANCE_TYPES.map((label) => getLeaveBalanceTypeKey(label)),
    )
    const entriesByType = new Map(
      resolvedEntries.map((entry) => [getLeaveBalanceTypeKey(entry.label), entry]),
    )

    const orderedEntries = REQUIRED_LEAVE_BALANCE_TYPES.map((label) => {
      const existingEntry = entriesByType.get(getLeaveBalanceTypeKey(label))
      return existingEntry || { label, value: '0' }
    })

    for (const entry of resolvedEntries) {
      const leaveTypeKey = getLeaveBalanceTypeKey(entry.label)
      if (requiredTypeKeys.has(leaveTypeKey)) continue
      orderedEntries.push(entry)
    }

    return orderedEntries
  }

  function getLeaveBalanceLines(app) {
    return getLeaveBalanceEntries(app).map((entry) => {
      const acronym = toLeaveBalanceAcronym(entry.label)
      return `${acronym || entry.label}: ${entry.value}`
    })
  }

  function getLeaveBalanceTooltipText(entry) {
    const label = String(entry?.label || '').trim()
    if (!label) return ''

    if (getLeaveBalanceTypeKey(label) === getLeaveBalanceTypeKey('CTO Leave')) {
      const resolvedHours =
        roundCtoHours(entry?.balance_hours ?? entry?.balanceHours) ??
        resolveCtoHoursFromDays(entry?.value)

      if (resolvedHours !== null) {
        return `${label} • ${formatDayValue(resolvedHours)} hour(s)`
      }
    }

    return label
  }

  function getLeaveBalanceTextItems(app) {
    return getLeaveBalanceEntries(app).map((entry) => {
      const acronym = toLeaveBalanceAcronym(entry.label)
      return {
        label: `${acronym || entry.label}: ${entry.value}`,
        tooltip: getLeaveBalanceTooltipText(entry),
      }
    })
  }

  function getLeaveBalanceDisplay(app) {
    return getLeaveBalanceLines(app).join(', ')
  }

  function resolveCurrentLeaveBalanceEntry(app) {
    if (!app) return null

    const currentLeaveTypeLabel = String(app?.leaveType || '').trim()
    const currentLeaveTypeKey = getLeaveBalanceTypeKey(currentLeaveTypeLabel)
    const entries = getLeaveBalanceEntries(app)

    const keyCandidates = [currentLeaveTypeKey]

    if (currentLeaveTypeKey === getLeaveBalanceTypeKey('Mandatory / Forced Leave')) {
      keyCandidates.push(getLeaveBalanceTypeKey('Vacation Leave'))
    }

    if (isCocApplication(app)) {
      keyCandidates.push(getLeaveBalanceTypeKey('CTO Leave'))
    }

    for (const candidateKey of keyCandidates.filter(Boolean)) {
      const matchingEntry = entries.find(
        (entry) => getLeaveBalanceTypeKey(entry.label) === candidateKey,
      )
      if (matchingEntry) return matchingEntry
    }

    return entries[0] || null
  }

  function getCurrentLeaveBalanceDisplay(app) {
    const entry = resolveCurrentLeaveBalanceEntry(app)
    if (!entry) return 'N/A'

    const numericValue = Number(entry.value)
    if (!Number.isFinite(numericValue)) {
      return String(entry.value || 'N/A').trim() || 'N/A'
    }

    const displayValue = formatLeaveBalanceValue(numericValue)
    return `${displayValue} day(s)`
  }

  function isCtoLeaveApplication(app) {
    if (!app || isCocApplication(app)) return false
    return getLeaveBalanceTypeKey(app?.leaveType) === getLeaveBalanceTypeKey('CTO Leave')
  }

  function roundCtoHours(value) {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue) || numericValue < 0) return null
    return Math.round(numericValue * 100) / 100
  }

  function resolveCtoHoursFromDays(value) {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue) || numericValue < 0) return null
    return roundCtoHours(numericValue * 8)
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

    const entry = resolveCurrentLeaveBalanceEntry(app)
    const directHourCandidates = [
      entry?.balance_hours,
      entry?.balanceHours,
      app?.available_balance_hours,
      app?.availableBalanceHours,
      app?.balance_hours,
      app?.balanceHours,
    ]

    for (const candidate of directHourCandidates) {
      const resolvedHours = roundCtoHours(candidate)
      if (resolvedHours !== null) return resolvedHours
    }

    const directBalance = Number(entry?.value)
    if (Number.isFinite(directBalance)) {
      return resolveCtoHoursFromDays(directBalance)
    }

    return null
  }

  function getCurrentCtoAvailableHoursDisplay(app) {
    const availableHours = getCurrentCtoAvailableHoursValue(app)
    return availableHours !== null ? `${formatDayValue(availableHours)} hour(s)` : 'N/A'
  }

  function getCtoDeductedHoursDisplay(app) {
    if (!isCtoLeaveApplication(app)) return 'N/A'

    const rawStatus = getApplicationRawStatus(app)
    if (rawStatus !== 'APPROVED' && rawStatus !== 'RECALLED') {
      return 'Pending approval'
    }

    return getApplicationCtoRequiredHoursDisplay(app)
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

  function normalizeIsoDateList(dateValues) {
    if (!Array.isArray(dateValues)) return []

    return [
      ...new Set(
        dateValues
          .map((value) => toIsoDateString(value))
          .filter(Boolean),
      ),
    ].sort((left, right) => Date.parse(left) - Date.parse(right))
  }

  function resolveDateSetFromSource(source) {
    if (!source || typeof source !== 'object') return []

    const selectedDates = normalizeIsoDateList(parseSelectedDatesValue(source?.selected_dates))
    if (selectedDates.length > 0) return selectedDates

    const startDate = source?.startDate || source?.start_date || null
    const endDate = source?.endDate || source?.end_date || null
    if (!startDate && !endDate) return []

    const firstDate = startDate || endDate
    const lastDate = endDate || startDate
    return enumerateInclusiveDateRange(firstDate, lastDate)
  }

  function hasApprovedUpdateAppliedAfterRecall(source) {
    if (!source || typeof source !== 'object') return false

    const latestUpdateStatus = normalizeAdminUpdateRequestStatus(
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
      parseSelectedDatesValue(
        source?.recall_selected_dates ?? source?.recallSelectedDates,
      ),
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

    const rawStatus = getApplicationRawStatus(app)
    const isRecalledRow = app?.application_row_variant === 'recalled' || rawStatus === 'RECALLED'

    return isRecalledRow
      ? dateSet.filter((dateKey) => recalledDateSet.has(dateKey))
      : dateSet.filter((dateKey) => !recalledDateSet.has(dateKey))
  }

  function getPendingUpdatePayload(app) {
    const candidates = [
      app?.pending_update,
      app?.latest_update_request_payload,
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
        // Ignore malformed payload and continue scanning candidates.
      }
    }

    return null
  }

  function getDateSubsetTotalDays(app, dateKeys = []) {
    const normalizedDateKeys = [...new Set(
      (Array.isArray(dateKeys) ? dateKeys : [])
        .map((value) => toIsoDateString(value))
        .filter(Boolean),
    )]
    if (!normalizedDateKeys.length) return 0

    const coverageWeights = getSelectedDateCoverageWeights(app)
    const totalDays = normalizedDateKeys.reduce((sum, dateKey) => {
      const weight = Number(coverageWeights[dateKey] ?? 1)
      return sum + (Number.isFinite(weight) && weight > 0 ? weight : 1)
    }, 0)

    return Math.round((totalDays + Number.EPSILON) * 100) / 100
  }

  function normalizePayStatusCode(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return normalizePayStatusCode(
        value.pay_status ??
          value.payStatus ??
          value.status ??
          value.code ??
          value.value ??
          '',
      )
    }

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

  function resolveApplicationPayModeCode(app) {
    const rawPayMode = String(app?.pay_mode ?? '').trim()

    return normalizePayStatusCode(rawPayMode) === 'WOP' ? 'WOP' : 'WP'
  }

  function resolveApplicationTotalDays(app) {
    const candidates = [
      app?.total_days,
      app?.duration_value,
      app?.days,
    ]

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
      const coverage = (
        normalizedCoverageMap[key] ??
        normalizedCoverageMap[String(index)] ??
        normalizedCoverageMap[String(index + 1)] ??
        ''
      )

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

  function getSelectedDateIndicatorRows(app) {
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
      app?.application_row_variant === 'recalled' || getApplicationRawStatus(app) === 'RECALLED'

    return dateSet.map((dateValue, index) => {
      const isoDate = toIsoDateString(dateValue)
      const key = isoDate || String(dateValue)
      const payStatus = (
        normalizedStatusMap[key] ??
        normalizedStatusMap[String(index)] ??
        normalizedStatusMap[String(index + 1)] ??
        fallbackStatus
      )
      const coverageWeight = Number(coverageWeights[key] ?? 1)
      const halfDayPortion = (
        normalizedHalfDayPortionMap[key] ??
        normalizedHalfDayPortionMap[String(index)] ??
        normalizedHalfDayPortionMap[String(index + 1)] ??
        ''
      )

      return {
        dateKey: key,
        dateText: formatDate(key),
        coverageLabel: getDateCoverageLabel(coverageWeight, halfDayPortion),
        halfDayPortion: halfDayPortion === 'AM' || halfDayPortion === 'PM' ? halfDayPortion : '',
        payStatus: payStatus === 'WOP' ? 'WOP' : 'WP',
        recalled: shouldMarkRecalledDates && recalledDateSet.has(key),
      }
    })
  }

  function getPendingUpdateDateCoverageWeights(app) {
    const payload = getPendingUpdatePayload(app)
    if (!payload || typeof payload !== 'object') return {}

    const dateSet = resolveDateSetFromSource(payload)
    if (!dateSet.length) return {}

    const rawCoverageMap = toSelectedDateCoverageMap(payload?.selected_date_coverage)

    const normalizedCoverageMap = normalizeMapKeysWithIsoAlias(rawCoverageMap)

    const totalDays = (() => {
      const candidates = [
        payload?.total_days,
        payload?.duration_value,
        payload?.days,
      ]

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
      const halfMatch = Math.abs((dateCount * 0.5) - totalDays) < 0.00001
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
      const coverage = (
        normalizedCoverageMap[key] ??
        normalizedCoverageMap[String(index)] ??
        normalizedCoverageMap[String(index + 1)] ??
        ''
      )

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

  function getPendingUpdateDateIndicatorRows(app) {
    const payload = getPendingUpdatePayload(app)
    if (!payload || typeof payload !== 'object') return []
    if (isCocApplication(app)) return []

    const dateSet = resolveDateSetFromSource(payload)
    if (!dateSet.length) return []

    const rawStatusMap = toSelectedDatePayStatusMap(payload?.selected_date_pay_status)

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
      const payStatus = (
        normalizedStatusMap[key] ??
        normalizedStatusMap[String(index)] ??
        normalizedStatusMap[String(index + 1)] ??
        fallbackStatus
      )
      const coverageWeight = Number(coverageWeights[key] ?? 1)
      const halfDayPortion = (
        normalizedHalfDayPortionMap[key] ??
        normalizedHalfDayPortionMap[String(index)] ??
        normalizedHalfDayPortionMap[String(index + 1)] ??
        ''
      )

      return {
        dateKey: key,
        dateText: formatDate(key),
        coverageLabel: getDateCoverageLabel(coverageWeight, halfDayPortion),
        halfDayPortion: halfDayPortion === 'AM' || halfDayPortion === 'PM' ? halfDayPortion : '',
        payStatus: payStatus === 'WOP' ? 'WOP' : 'WP',
      }
    })
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

  function hasPendingDateUpdate(app) {
    const payload = getPendingUpdatePayload(app)
    if (!payload || typeof payload !== 'object' || payload.is_monetization) return false

    const currentIndicatorRows = getSelectedDateIndicatorRows(app)
    const requestedIndicatorRows = getPendingUpdateDateIndicatorRows(app)
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

  function getApplicationInclusiveDateLines(app) {
    if (!app) return ['N/A']

    if (app.is_monetization) {
      return ['N/A']
    }

    const indicatorRows = getSelectedDateIndicatorRows(app)
    if (indicatorRows.length && indicatorRows.some((entry) => entry?.coverageLabel?.startsWith('Half Day'))) {
      return indicatorRows.map((entry) => {
        const dateText = String(entry?.dateText || '').trim()
        const halfDayPortion = String(entry?.halfDayPortion || '').trim().toUpperCase()
        return halfDayPortion === 'AM' || halfDayPortion === 'PM'
          ? `${dateText} (${halfDayPortion})`
          : `${dateText} (Half Day)`
      })
    }

    if (Array.isArray(app.selected_dates) && app.selected_dates.length > 0) {
      const visibleDateSet = getVisibleDateSetForDisplay(app)
      const groupedSelectedDates = formatGroupedInclusiveDateLines(visibleDateSet)
      if (groupedSelectedDates.length > 0) return groupedSelectedDates
    }

    if (app.startDate || app.endDate) {
      const startDate = app.startDate || app.endDate
      const endDate = app.endDate || app.startDate
      const rangedDates = enumerateInclusiveDateRange(startDate, endDate)
      const groupedRangeDates = formatGroupedInclusiveDateLines(rangedDates)
      if (groupedRangeDates.length > 0) return groupedRangeDates
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

  function getApplicationDayCount(app) {
    if (!app) return '0'

    const actualDayValue = getActualRequestedDayCount(app)
    if (Number.isFinite(actualDayValue) && actualDayValue > 0) {
      return formatDayValue(actualDayValue)
    }

    const parsedDays = Number(app?.days)
    if (Number.isFinite(parsedDays) && parsedDays > 0) {
      return formatDayValue(parsedDays)
    }

    if (Array.isArray(app.selected_dates) && app.selected_dates.length > 0) {
      const uniqueSelectedDates = [...new Set(app.selected_dates.filter(Boolean))]
      if (uniqueSelectedDates.length > 0) return String(uniqueSelectedDates.length)
    }

    if (app.startDate || app.endDate) {
      const startDate = app.startDate || app.endDate
      const endDate = app.endDate || app.startDate
      const rangedDates = enumerateInclusiveDateRange(startDate, endDate)
      if (rangedDates.length > 0) return String(rangedDates.length)
    }

    return formatDayValue(app.days)
  }

  function getApplicationDurationLabel(app) {
    return getApplicationInclusiveDateLines(app).join(' ')
  }

  function getApplicationCalendarState(application) {
    if (!application) return ''
    if (isCancelledByUser(application)) return ''
    const rawStatus = getApplicationRawStatus(application)
    if (rawStatus === 'APPROVED') return 'approved'
    if (rawStatus === 'PENDING_ADMIN' || rawStatus === 'PENDING_HR') {
      return 'pending'
    }
    return ''
  }

  function getApplicationCalendarDates(application) {
    const inclusiveDateMatches = parseInclusiveDateText(getApplicationInclusiveDateLines(application))
    if (inclusiveDateMatches.length > 0) {
      return [...new Set(inclusiveDateMatches.map((date) => normalizeIsoDate(date)).filter(Boolean))]
    }

    return [
      ...new Set(
        getApplicationSelectedDates(application)
          .map((date) => normalizeIsoDate(date))
          .filter(Boolean),
      ),
    ]
  }

  function getApplicationRequestUpdateCalendarDates(application) {
    if (!application || isCocApplication(application)) return []
    if (!hasAdminEditRequestSignal(application)) return []
    if (isAdminCancellationRequest(application)) return []

    const pendingPayload = getPendingUpdatePayload(application)
    if (!pendingPayload || typeof pendingPayload !== 'object') return []

    return [
      ...new Set(
        resolveDateSetFromSource(pendingPayload)
          .map((date) => normalizeIsoDate(date))
          .filter(Boolean),
      ),
    ]
  }

  function getApplicationCalendarPreviewDates(application) {
    const requestUpdateDates = getApplicationRequestUpdateCalendarDates(application)
    if (requestUpdateDates.length > 0) {
      return [...requestUpdateDates].sort((left, right) => Date.parse(left) - Date.parse(right))
    }

    return [...getApplicationCalendarDates(application)].sort((left, right) => Date.parse(left) - Date.parse(right))
  }

  const CALENDAR_PREVIEW_WARNING_WIDTH = 220
  const CALENDAR_PREVIEW_WARNING_TIMEOUT_MS = 7000
  let calendarPreviewWarningTimeoutId = null
  let calendarPreviewWarningPressedDate = ''
  let calendarPreviewWarningPressedAt = 0
  let calendarPreviewWarningPressedMessage = ''

  function clearCalendarPreviewWarningTimeout() {
    if (calendarPreviewWarningTimeoutId) {
      window.clearTimeout(calendarPreviewWarningTimeoutId)
      calendarPreviewWarningTimeoutId = null
    }
  }

  function releaseCalendarPreviewWarningDismiss() {
    window.removeEventListener('pointerdown', handleCalendarPreviewDismissPointerDown, true)
  }

  function releaseCalendarPreviewPointer() {
    window.removeEventListener('pointerup', handleCalendarPreviewGlobalPointerUp, true)
    window.removeEventListener('pointercancel', handleCalendarPreviewGlobalPointerUp, true)
  }

  function clearCalendarPreviewWarning() {
    clearCalendarPreviewWarningTimeout()
    releaseCalendarPreviewWarningDismiss()
    releaseCalendarPreviewPointer()

    if (
      !calendarPreviewDateWarning.value &&
      !calendarPreviewWarningDate.value &&
      Object.keys(calendarPreviewWarningStyle.value).length === 0
    ) {
      return
    }

    calendarPreviewDateWarning.value = ''
    calendarPreviewWarningDate.value = ''
    calendarPreviewWarningStyle.value = {}
    syncCalendarPreviewDecorations()
  }

  function formatCalendarPreviewWarningDate(dateValue) {
    const normalizedDate = normalizeIsoDate(dateValue)
    if (!normalizedDate) return ''

    return new Date(`${normalizedDate}T12:00:00`).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function buildCalendarPreviewWarningMessage(dateValue) {
    const normalizedDate = normalizeIsoDate(dateValue)
    if (!normalizedDate) return ''

    const state = calendarPreviewDateStates.value.get(normalizedDate)
    if (!state) return ''

    const formattedDate = formatCalendarPreviewWarningDate(normalizedDate)
    if (!formattedDate) return ''

    if (state === 'request-update') {
      return `${formattedDate} is part of the requested update.`
    }

    if (state === 'approved') {
      return `${formattedDate} leave application is already approved.`
    }

    return `${formattedDate} leave application is still pending.`
  }

  function showCalendarPreviewWarning(dateValue, options = {}) {
    const { sticky = false, message = '' } = options
    const normalizedDate = normalizeIsoDate(dateValue)
    if (!normalizedDate) {
      clearCalendarPreviewWarning()
      return
    }

    const resolvedMessage = message || buildCalendarPreviewWarningMessage(normalizedDate)
    if (!resolvedMessage) {
      clearCalendarPreviewWarning()
      return
    }

    clearCalendarPreviewWarningTimeout()
    releaseCalendarPreviewWarningDismiss()

    calendarPreviewDateWarning.value = resolvedMessage
    calendarPreviewWarningDate.value = normalizedDate
    syncCalendarPreviewDecorations()
    window.addEventListener('pointerdown', handleCalendarPreviewDismissPointerDown, true)

    if (!sticky) {
      calendarPreviewWarningTimeoutId = window.setTimeout(() => {
        clearCalendarPreviewWarning()
      }, CALENDAR_PREVIEW_WARNING_TIMEOUT_MS)
    }
  }

  function resolveCalendarPreviewDateFromEvent(event) {
    const dayCell = event.target?.closest?.('.q-date__calendar-item')
    if (!dayCell || dayCell.classList.contains('q-date__calendar-item--fill')) return ''

    const day = Number.parseInt(String(dayCell.textContent || '').trim(), 10)
    if (!Number.isInteger(day) || day < 1 || day > 31) return ''

    return `${calendarPreviewView.value.year}-${calendarPreviewView.value.month}-${String(day).padStart(2, '0')}`
  }

  function handleCalendarPreviewModelUpdate() {
    if (
      (Array.isArray(calendarPreviewModel.value) && calendarPreviewModel.value.length > 0) ||
      (!Array.isArray(calendarPreviewModel.value) && calendarPreviewModel.value)
    ) {
      calendarPreviewModel.value = []
    }
  }

  function handleCalendarPreviewGlobalPointerUp() {
    if (!calendarPreviewWarningPressedDate) return

    const pressedDate = calendarPreviewWarningPressedDate
    const pressedDuration = Date.now() - calendarPreviewWarningPressedAt
    const pressedMessage = calendarPreviewWarningPressedMessage

    calendarPreviewWarningPressedDate = ''
    calendarPreviewWarningPressedAt = 0
    calendarPreviewWarningPressedMessage = ''
    releaseCalendarPreviewPointer()

    if (pressedDuration >= 250) {
      clearCalendarPreviewWarning()
      return
    }

    showCalendarPreviewWarning(pressedDate, { message: pressedMessage })
  }

  function handleCalendarPreviewDismissPointerDown() {
    clearCalendarPreviewWarning()
  }

  function handleCalendarPreviewSurfacePointerDown(event) {
    const clickedDate = resolveCalendarPreviewDateFromEvent(event)
    const warningMessage = clickedDate ? buildCalendarPreviewWarningMessage(clickedDate) : ''

    if (!clickedDate) {
      calendarPreviewWarningPressedDate = ''
      calendarPreviewWarningPressedAt = 0
      calendarPreviewWarningPressedMessage = ''
      releaseCalendarPreviewPointer()
      clearCalendarPreviewWarning()
      return
    }

    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation?.()

    if (!warningMessage) {
      calendarPreviewWarningPressedDate = ''
      calendarPreviewWarningPressedAt = 0
      calendarPreviewWarningPressedMessage = ''
      releaseCalendarPreviewPointer()
      clearCalendarPreviewWarning()
      return
    }

    calendarPreviewWarningPressedDate = clickedDate
    calendarPreviewWarningPressedAt = Date.now()
    calendarPreviewWarningPressedMessage = warningMessage
    showCalendarPreviewWarning(clickedDate, { sticky: true, message: warningMessage })
    releaseCalendarPreviewPointer()
    window.addEventListener('pointerup', handleCalendarPreviewGlobalPointerUp, true)
    window.addEventListener('pointercancel', handleCalendarPreviewGlobalPointerUp, true)
  }

  function handleCalendarPreviewSurfaceClick(event) {
    const clickedDate = resolveCalendarPreviewDateFromEvent(event)
    if (clickedDate) {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation?.()
    }

    const warningMessage = clickedDate ? buildCalendarPreviewWarningMessage(clickedDate) : ''
    if (!warningMessage) return
  }

  function isCancelledByUser(app) {
    const remarksText = String(app?.remarks || '').trim()
    return /^cancelled\b/i.test(remarksText)
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

  function getSearchTokens(value) {
    const normalized = normalizeSearchText(value)
    if (!normalized) return []

    return normalized
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => normalizeSearchToken(token))
  }

  function getCocReleaseStageStatus(app) {
    if (!app || !isCocApplication(app)) return ''

    const rawStatus = getApplicationRawStatus(app)
    if (rawStatus === 'PENDING_ADMIN') return 'Pending Admin'
    if (rawStatus === 'PENDING_HR') return 'Pending HR Review'
    if (rawStatus !== 'APPROVED') return ''

    if (isApplicationReleased(app)) {
      return 'Approved'
    }
    if (isApplicationReceivedByHr(app)) return 'Pending Release'
    return 'Pending HR Receive'
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
    if (!hasAdminEditRequestSignal(app)) return false
    return getAdminLatestUpdateRequestStatus(app) === 'PENDING'
  }

  function isApprovedUpdateWorkflowCycle(app) {
    if (!app || isCocApplication(app)) return false
    if (!hasAdminEditRequestSignal(app)) return false
    return getAdminLatestUpdateRequestStatus(app) === 'APPROVED'
  }

  function getLeaveWorkflowStageStatus(app) {
    if (!app || isCocApplication(app)) return ''

    const queueStageKey = getApplicationQueueStageKey(app)
    if (queueStageKey === 'PENDING_ADMIN') return 'Pending Admin'
    if (queueStageKey === 'PENDING_ADMIN_REVIEW') return 'Pending Update Admin Review'
    if (queueStageKey === 'PENDING_HR_RECEIVE') {
      return isPendingUpdateWorkflowCycle(app) ? 'Pending Update Receive' : 'Pending HR Receive'
    }
    if (queueStageKey === 'PENDING_HR_REVIEW') {
      return isPendingUpdateWorkflowCycle(app) ? 'Pending Update HR Review' : 'Pending HR Review'
    }
    if (queueStageKey === 'PENDING_RELEASE') {
      return isApprovedUpdateWorkflowCycle(app) ? 'Pending Update Release' : 'Pending Release'
    }

    const rawStatus = getApplicationRawStatus(app)
    if (rawStatus === 'PENDING_ADMIN') return 'Pending Admin'
    if (rawStatus === 'PENDING_HR') {
      if (isApplicationReceivedByHr(app)) {
        return isPendingUpdateWorkflowCycle(app) ? 'Pending Update HR Review' : 'Pending HR Review'
      }
      return isPendingUpdateWorkflowCycle(app) ? 'Pending Update Receive' : 'Pending HR Receive'
    }
    if (rawStatus === 'APPROVED') {
      if (isApplicationReleased(app)) return 'Approved'
      return isApprovedUpdateWorkflowCycle(app) ? 'Pending Update Release' : 'Pending Release'
    }

    return ''
  }

  function getApplicationStatusLabel(app) {
    if (isCancelledByUser(app)) return 'Cancelled'

    const cocReleaseStageStatus = getCocReleaseStageStatus(app)
    if (cocReleaseStageStatus) return cocReleaseStageStatus

    const rawStatus = getApplicationRawStatus(app)

    const leaveWorkflowStageStatus = getLeaveWorkflowStageStatus(app)
    if (leaveWorkflowStageStatus) return leaveWorkflowStageStatus

    if (rawStatus === 'RECALLED') return 'Recalled'
    if (rawStatus === 'REJECTED') return 'Disapproved'
    if (rawStatus === 'PENDING_ADMIN') return 'Pending Admin'
    if (rawStatus === 'PENDING_HR') return 'Pending HR'
    if (rawStatus === 'APPROVED') return 'Approved'

    if (app?.status) return app.status
    return 'Unknown'
  }

  function getApplicationStatusColor(app) {
    if (isCancelledByUser(app)) return 'grey-7'

    const cocReleaseStageStatus = getCocReleaseStageStatus(app)
    if (cocReleaseStageStatus === 'Approved' || cocReleaseStageStatus === 'Released') return 'positive'
    if (cocReleaseStageStatus === 'Pending Release') return 'indigo-6'
    if (cocReleaseStageStatus === 'Pending HR Receive') return 'teal-6'
    if (cocReleaseStageStatus === 'Pending HR Review') return 'blue-6'
    if (cocReleaseStageStatus === 'Pending Admin') return 'warning'

    const rawStatus = getApplicationRawStatus(app)
    const leaveWorkflowStageStatus = getLeaveWorkflowStageStatus(app)
    if (leaveWorkflowStageStatus === 'Pending Admin') return 'warning'
    if (leaveWorkflowStageStatus === 'Pending Update Admin Review') return 'warning'
    if (leaveWorkflowStageStatus === 'Pending Update Receive') return 'teal-6'
    if (leaveWorkflowStageStatus === 'Pending HR Receive') return 'teal-6'
    if (leaveWorkflowStageStatus === 'Pending Update HR Review') return 'blue-6'
    if (leaveWorkflowStageStatus === 'Pending HR Review') return 'blue-6'
    if (leaveWorkflowStageStatus === 'Pending Update Release') return 'indigo-6'
    if (leaveWorkflowStageStatus === 'Pending Release') return 'indigo-6'
    if (leaveWorkflowStageStatus === 'Approved') return 'green'

    if (rawStatus === 'PENDING_ADMIN') return 'warning'
    if (rawStatus === 'PENDING_HR') return 'blue-6'
    if (rawStatus === 'APPROVED') return 'green'
    if (rawStatus === 'RECALLED') return 'blue-grey-6'
    if (rawStatus === 'REJECTED') return 'negative'
    return 'grey-6'
  }

  function getEditRequestBadgeLabel(app) {
    const rawStatus = getApplicationRawStatus(app)
    if (
      isCancelledByUser(app) ||
      rawStatus === 'RECALLED' ||
      rawStatus === 'REJECTED' ||
      rawStatus === 'DISAPPROVED'
    ) {
      return ''
    }

    const status = getAdminEditRequestBadgeStatus(app)
    const labelPrefix = getAdminEditRequestLabelPrefix(app)
    const isCancelRequest = isAdminCancellationRequest(app)

    if (status === 'PENDING_ADMIN') {
      return isCancelRequest ? labelPrefix + ' Pending Admin' : 'Pending Update Admin Review'
    }
    if (status === 'PENDING_HR') {
      if (isCancelRequest) return labelPrefix + ' Pending HR'
      const stageStatus = getLeaveWorkflowStageStatus(app)
      if (stageStatus === 'Pending Update Receive' || stageStatus === 'Pending Update Release') {
        return stageStatus
      }
      return 'Pending Update HR Review'
    }
    if (status === 'PENDING') {
      return isCancelRequest ? labelPrefix + ' Pending' : 'Pending Update HR Review'
    }
    if (status === 'APPROVED') return labelPrefix + ' Approved'
    if (status === 'REJECTED') return labelPrefix + ' Disapproved'
    return ''
  }

  function getEditRequestBadgeColor(app) {
    const status = getAdminEditRequestBadgeStatus(app)
    if (status === 'PENDING_ADMIN') return 'warning'
    if (status === 'PENDING_HR') return 'blue-6'
    if (status === 'PENDING') return 'deep-purple-7'
    if (status === 'APPROVED') return 'positive'
    if (status === 'REJECTED') return 'negative'
    return 'grey-7'
  }

  function getAdminEditRequestBadgeStatus(app) {
    if (!hasAdminEditRequestSignal(app)) {
      return getAdminLatestUpdateRequestStatus(app)
    }

    const rawStatus = getApplicationRawStatus(app)
    if (rawStatus === 'PENDING_ADMIN') return 'PENDING_ADMIN'
    if (rawStatus === 'PENDING_HR') return 'PENDING_HR'

    const explicitStatus = getAdminLatestUpdateRequestStatus(app)

    if (explicitStatus === 'APPROVED' || explicitStatus === 'REJECTED') {
      return explicitStatus
    }

    if (explicitStatus === 'PENDING') {
      return 'PENDING'
    }

    if (rawStatus === 'APPROVED') {
      return 'APPROVED'
    }

    if (rawStatus === 'REJECTED') {
      return 'REJECTED'
    }

    return 'PENDING'
  }

  function canPrintApplication(app) {
    if (isCocApplication(app)) {
      const rawStatus = String(app?.rawStatus ?? app?.raw_status ?? '').trim().toUpperCase()
      return rawStatus === 'APPROVED' || getApplicationStatusLabel(app) === 'Approved'
    }

    return getApplicationStatusLabel(app) !== 'Pending Admin'
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

  function getApplicationSearchStatusLabel(app) {
    const updateRequestBadgeLabel = getEditRequestBadgeLabel(app)
    if (updateRequestBadgeLabel) return updateRequestBadgeLabel

    if (hasApplicationEditRequest(app)) {
      const editRequestStatusLabel = getApplicationEditRequestStatusLabel(app)
      if (editRequestStatusLabel && editRequestStatusLabel !== 'N/A') return editRequestStatusLabel
    }

    return app?.displayStatus || getApplicationStatusLabel(app)
  }

  function getApplicationSearchText(app) {
    const dateTerms = getDateSearchValues(app?.filed_at || app?.created_at)
    const inclusiveDateTerms = getApplicationInclusiveDateLines(app)
    const hasEditRequest = hasApplicationEditRequest(app)
    const searchStatusLabel = getApplicationSearchStatusLabel(app)

    const searchValues = [
      'application',
      app?.id,
      searchStatusLabel,
      hasEditRequest ? '' : getApplicationRawStatus(app),
      hasEditRequest ? '' : app?.status,
      isCancelledByUser(app) ? 'cancelled' : '',
      app?.leaveType,
      app?.employee_name,
      app?.firstname,
      app?.middlename,
      app?.surname,
      app?.employee_control_no,
      getApplicationDurationLabel(app),
      ...inclusiveDateTerms,
      getLeaveBalanceDisplay(app),
      getApplicationDayCount(app),
      getApplicationDurationDisplay(app),
      ...dateTerms,
    ]

    return searchValues
      .map((value) => normalizeSearchText(value))
      .filter(Boolean)
      .join(' ')
  }

  function hasAdminEditRequestSignal(app) {
    if (!app || typeof app !== 'object') return false
    if (getAdminLatestUpdateRequestStatus(app)) return true
    if (getAdminUpdateRequestActionType(app)) return true
    if (isAdminEditUpdateRequest(app)) return true
    if (getPendingUpdatePayload(app)) return true

    const explicitSignals = [
      app?.latest_update_requested_at,
      app?.latest_update_request_reason,
      app?.pending_update_reason,
      app?.latest_update_reviewed_at,
      app?.latest_update_request_payload,
      app?.pending_update_action_type,
    ]

    const hasExplicitSignal = explicitSignals.some((value) => {
      if (value === undefined || value === null) return false
      if (typeof value === 'object') return true
      return String(value).trim() !== ''
    })
    if (hasExplicitSignal) return true

    const remarksSignal = normalizeSearchText(app?.remarks || '')
    if (
      remarksSignal.includes('edit request') ||
      remarksSignal.includes('request update') ||
      remarksSignal.includes('cancel request') ||
      remarksSignal.includes('cancellation request')
    ) {
      return true
    }

    return getStatusHistoryEntries(app).some((entry) => {
      const actionToken = normalizeAdminStatusHistoryActionToken(entry?.action)
      const stageToken = normalizeAdminStatusHistoryToken(entry?.stage)
      const historyRemarksToken = normalizeAdminStatusHistoryToken(entry?.remarks)

      return (
        actionToken.includes('EDIT') ||
        actionToken.includes('UPDATE_REQUEST') ||
        actionToken.includes('REQUEST_UPDATE') ||
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

  function hasApplicationEditRequest(app) {
    if (!app || typeof app !== 'object') return false
    if (isCocApplication(app)) return false
    return hasAdminEditRequestSignal(app)
  }

  function getApplicationEditRequestStatusLabel(app) {
    if (!hasApplicationEditRequest(app)) return 'N/A'

    const badgeLabel = getEditRequestBadgeLabel(app)
    if (badgeLabel) return badgeLabel

    const status = getAdminEditRequestBadgeStatus(app)
    if (status === 'APPROVED') return 'Approved'
    if (status === 'REJECTED') return 'Disapproved'
    return 'Pending'
  }

  function isApplicationEditCancellationRequest(app) {
    if (!hasApplicationEditRequest(app)) return false
    return isAdminCancellationRequest(app)
  }

  function getApplicationEditRequestSectionTitle(app) {
    return isApplicationEditCancellationRequest(app)
      ? 'Cancellation Request Details'
      : 'Requested Changes'
  }

  function shouldShowApplicationEditRequestDateComparison(app) {
    return hasApplicationEditRequest(app) && !isApplicationEditCancellationRequest(app)
  }

  function getApplicationEditRequestStatusFieldLabel(app) {
    return isApplicationEditCancellationRequest(app)
      ? 'Cancellation Request Status'
      : 'Edit Request Status'
  }

  function getApplicationEditRequestApprovedBadgeLabel(app) {
    return isApplicationEditCancellationRequest(app)
      ? 'Cancellation Request Completed'
      : 'Updated Application Details'
  }

  function getApplicationEditRequestRequestedAt(app) {
    if (!hasApplicationEditRequest(app)) return 'N/A'

    const requestedAt =
      app?.latest_update_requested_at ||
      app?.updated_at ||
      null

    return formatDateTime(requestedAt) || 'N/A'
  }

  function getApplicationEditRequestRequestedBy(app) {
    if (!hasApplicationEditRequest(app)) return 'N/A'
    return String(app?.employee_name || resolveFiledByActor(app) || 'N/A').trim() || 'N/A'
  }

  function getApplicationEditRequestReason(app) {
    if (!hasApplicationEditRequest(app)) return 'N/A'

    const pendingPayload = getPendingUpdatePayload(app)
    const reason = String(
      app?.latest_update_request_reason ??
        app?.pending_update_reason ??
        pendingPayload?.cancel_reason ??
        pendingPayload?.reason ??
        '',
    ).trim()

    return reason || 'N/A'
  }

  function formatDateSetSummary(dateValues = []) {
    const normalizedDateSet = [
      ...new Set(
        (Array.isArray(dateValues) ? dateValues : [])
          .map((value) => toIsoDateString(value))
          .filter(Boolean),
      ),
    ]
    if (!normalizedDateSet.length) return 'N/A'

    const groupedLines = formatGroupedInclusiveDateLines(normalizedDateSet)
    if (groupedLines.length) return groupedLines.join(', ')

    return normalizedDateSet.map((dateValue) => formatDate(dateValue)).join(', ')
  }

  function resolveDurationFromCandidates(candidates = []) {
    for (const candidate of candidates) {
      const numericValue = Number(candidate)
      if (Number.isFinite(numericValue) && numericValue > 0) return numericValue
    }

    return 0
  }

  function getApplicationEditRequestFromDates(app) {
    if (!hasApplicationEditRequest(app)) return 'N/A'

    const inclusiveDateLines = getApplicationInclusiveDateLines(app)
    return inclusiveDateLines.length ? inclusiveDateLines.join(', ') : 'N/A'
  }

  function getApplicationEditRequestToDates(app) {
    if (!hasApplicationEditRequest(app)) return 'N/A'
    const pendingPayload = getPendingUpdatePayload(app)

    const requestedIndicatorRows = getPendingUpdateDateIndicatorRows(app)
    if (
      requestedIndicatorRows.length &&
      requestedIndicatorRows.some((entry) => String(entry?.coverageLabel || '').startsWith('Half Day'))
    ) {
      return requestedIndicatorRows
        .map((entry) => {
          const dateText = String(entry?.dateText || '').trim()
          const halfDayPortion = String(entry?.halfDayPortion || '').trim().toUpperCase()
          return halfDayPortion === 'AM' || halfDayPortion === 'PM'
            ? `${dateText} (${halfDayPortion})`
            : `${dateText} (Half Day)`
        })
        .join(', ')
    }

    return formatDateSetSummary(resolveDateSetFromSource(pendingPayload))
  }

  function getApplicationEditRequestCurrentDuration(app) {
    if (!hasApplicationEditRequest(app)) return 'N/A'

    return getApplicationDurationDisplay(app) || 'N/A'
  }

  function getApplicationEditRequestRequestedDuration(app) {
    if (!hasApplicationEditRequest(app)) return 'N/A'

    const pendingPayload = getPendingUpdatePayload(app)
    if (!pendingPayload || typeof pendingPayload !== 'object') return 'N/A'

    const requestedDurationValue = resolveDurationFromCandidates([
      pendingPayload?.total_days,
      pendingPayload?.duration_value,
      pendingPayload?.days,
    ])

    if (requestedDurationValue > 0) return formatDurationDisplay(requestedDurationValue, 'day')

    const requestedDateSet = resolveDateSetFromSource(pendingPayload)
    if (requestedDateSet.length) return formatDurationDisplay(requestedDateSet.length, 'day')

    return 'N/A'
  }

  function isApplicationEditRequestHrApproved(app) {
    return hasApplicationEditRequest(app) && getAdminLatestUpdateRequestStatus(app) === 'APPROVED'
  }

  function getApplicationEditRequestFinalInclusiveDates(app) {
    if (!isApplicationEditRequestHrApproved(app)) return 'N/A'
    const inclusiveDateLines = getApplicationInclusiveDateLines(app)
    return inclusiveDateLines.length ? inclusiveDateLines.join(', ') : 'N/A'
  }

  function getApplicationEditRequestFinalDuration(app) {
    if (!isApplicationEditRequestHrApproved(app)) return 'N/A'
    return getApplicationDurationDisplay(app) || 'N/A'
  }

  function shouldShowPendingDateComparisonInDetails(app) {
    return hasPendingDateUpdate(app) && !hasApplicationEditRequest(app)
  }

  function resolveAdminEditRequestSubmittedMeta(app) {
    const pendingPayload = getPendingUpdatePayload(app)

    const submittedAt =
      app?.latest_update_requested_at ||
      app?.updated_at ||
      null
    const submittedBy = String(app?.employee_name || resolveFiledByActor(app) || 'Unknown').trim() || 'Unknown'
    const submittedReason = String(
      app?.latest_update_request_reason ??
        app?.pending_update_reason ??
        pendingPayload?.cancel_reason ??
        pendingPayload?.reason ??
        '',
    ).trim()

    return {
      submittedAt,
      submittedBy,
      submittedReason,
    }
  }

  function resolveAdminEditRequestDecisionHistoryEntry(app, decision = 'APPROVED') {
    return findLatestStatusHistoryEntry(app, (entry) => {
      const actionToken = normalizeAdminStatusHistoryActionToken(entry?.action)
      const stageToken = normalizeAdminStatusHistoryToken(entry?.stage)
      const remarksToken = normalizeAdminStatusHistoryToken(entry?.remarks)
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

      const targetDecision = String(decision || '').toUpperCase()
      const explicitApprovedSignal =
        [
          'EDIT_REQUEST_APPROVED',
          'UPDATE_REQUEST_APPROVED',
          'CANCELLATION_REQUEST_APPROVED',
          'CANCEL_REQUEST_APPROVED',
        ].includes(actionToken) ||
        stageToken.includes('edit request approved') ||
        stageToken.includes('cancellation request approved') ||
        stageToken.includes('cancel request approved')
      const explicitRejectedSignal =
        [
          'EDIT_REQUEST_REJECTED',
          'UPDATE_REQUEST_REJECTED',
          'CANCELLATION_REQUEST_REJECTED',
          'CANCEL_REQUEST_REJECTED',
        ].includes(actionToken) ||
        stageToken.includes('edit request rejected') ||
        stageToken.includes('edit request disapproved') ||
        stageToken.includes('cancellation request rejected') ||
        stageToken.includes('cancellation request disapproved') ||
        stageToken.includes('cancel request rejected')

      if (targetDecision === 'APPROVED' && explicitApprovedSignal) return true
      if (targetDecision === 'REJECTED' && explicitRejectedSignal) return true

      const expectedDecisionActions = targetDecision === 'REJECTED'
        ? ['ADMIN_REJECTED', 'HR_REJECTED']
        : ['HR_APPROVED']
      if (!expectedDecisionActions.includes(actionToken)) return false

      if (updateRequestSignal || cancelRequestSignal) return true

      const cycleStart = resolveCurrentUpdateRequestCycleStartValue(app)
      if (!cycleStart) return true

      return isTimestampOnOrAfter(resolveStatusHistoryTimestamp(entry), cycleStart)
    })
  }

  function resolveAdminEditRequestReviewRole(decisionHistoryEntry) {
    const actionToken = normalizeAdminStatusHistoryActionToken(decisionHistoryEntry?.action)
    if (actionToken === 'ADMIN_REJECTED') return 'ADMIN'
    if (actionToken === 'HR_REJECTED' || actionToken === 'HR_APPROVED') return 'HR'

    const performerType = String(decisionHistoryEntry?.performed_by_type || '')
      .trim()
      .toUpperCase()
    if (performerType === 'ADMIN') return 'ADMIN'
    if (performerType === 'HR') return 'HR'

    return ''
  }

  function resolveAdminEditRequestApprovalMeta(app) {
    const latestStatus = getAdminLatestUpdateRequestStatus(app)
    if (latestStatus !== 'APPROVED') return null

    const decisionHistoryEntry = resolveAdminEditRequestDecisionHistoryEntry(app, 'APPROVED')
    const reviewedByRole = resolveAdminEditRequestReviewRole(decisionHistoryEntry)
    const reviewedAt = app?.latest_update_reviewed_at || null
    const reviewedBy = String(decisionHistoryEntry?.actor_name || '').trim()

    return {
      reviewedAt,
      reviewedBy,
      reviewedByRole,
    }
  }

  function resolveAdminEditRequestRejectionMeta(app) {
    const latestStatus = getAdminLatestUpdateRequestStatus(app)
    if (latestStatus !== 'REJECTED') return null

    const decisionHistoryEntry = resolveAdminEditRequestDecisionHistoryEntry(app, 'REJECTED')
    const reviewedByRole = resolveAdminEditRequestReviewRole(decisionHistoryEntry)
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

  function getAdminPreEditHrApprovalTimelineEntry(app) {
    if (!hasAdminEditRequestSignal(app)) return null

    const approvedAt = formatDateTime(resolveFinalApprovalDateValue(app))
    const approvedBy = resolveHrActor(app)
    if (!approvedAt && approvedBy === 'Unknown') return null

    return {
      title: 'Approved by HR',
      subtitle: approvedAt || 'Completed',
      description: 'Application was approved before the ' + getAdminUpdateRequestReviewNoun(app) + '.',
      icon: 'task_alt',
      color: 'positive',
      actor: approvedBy,
    }
  }

  function getAdminEditRequestTimelineTerminology(app) {
    const isCancelRequest = isAdminCancellationRequest(app)

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

  function getAdminEditRequestTimelineEntries(app) {
    if (!hasAdminEditRequestSignal(app)) return []

    const terminology = getAdminEditRequestTimelineTerminology(app)
    const entries = []
    const submittedMeta = resolveAdminEditRequestSubmittedMeta(app)
    const latestUpdateStatus = getAdminLatestUpdateRequestStatus(app)
    const approvalMeta = resolveAdminEditRequestApprovalMeta(app)
    const rejectionMeta = resolveAdminEditRequestRejectionMeta(app)
    const resolvedStatus = approvalMeta
      ? 'APPROVED'
      : rejectionMeta
        ? 'REJECTED'
        : latestUpdateStatus || 'PENDING'
    const rawStatus = getApplicationRawStatus(app)
    const isAdminReviewPending = resolvedStatus === 'PENDING' && rawStatus === 'PENDING_ADMIN'
    const isHrReviewPending = resolvedStatus === 'PENDING' && rawStatus === 'PENDING_HR'
    const isRejectedByAdmin =
      rejectionMeta && String(rejectionMeta.reviewedByRole || '').toUpperCase() === 'ADMIN'

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
    } else if (isRejectedByAdmin && rejectionMeta) {
      entries.push({
        title: terminology.adminRejectedTitle,
        subtitle: formatDateTime(rejectionMeta.reviewedAt) || 'Reviewed',
        description: rejectionMeta.reviewRemarks || terminology.adminRejectedDescription,
        icon: 'cancel',
        color: 'negative',
        actor: rejectionMeta.reviewedBy,
      })
      return entries
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

  function buildApplicationTimeline(app) {
    if (!app) return []

    const rawStatus = getApplicationRawStatus(app)
    const hasEditRequest = hasAdminEditRequestSignal(app)
    const preEditHrApprovalEntry = hasEditRequest ? getAdminPreEditHrApprovalTimelineEntry(app) : null
    const editRequestEntries = hasEditRequest ? getAdminEditRequestTimelineEntries(app) : []
    const entries = [
      {
        title: 'Application Filed',
        subtitle:
          formatDateTime(resolveFiledDateValue(app)) ||
          formatDate(app.filed_at || app.created_at) ||
          'Date unavailable',
        description: `${app.employee_name || 'Employee'} submitted this leave request.`,
        icon: 'check_circle',
        color: 'positive',
        actor: resolveFiledByActor(app),
      },
    ]

    if (isCancelledByUser(app) && !hasEditRequest) {
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
      return finalizeApplicationTimelineEntries(app, entries)
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
        return finalizeApplicationTimelineEntries(app, entries)
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
      return finalizeApplicationTimelineEntries(app, entries)
    }

    if (rawStatus === 'REJECTED') {
      const disapprovedAt = formatDateTime(resolveDisapprovedDateValue(app)) || 'Application closed'
      const disapprovedBy = resolveDisapprovalActor(app)
      const isApprovedCancellationRequest =
        isAdminCancellationRequest(app) && getAdminLatestUpdateRequestStatus(app) === 'APPROVED'

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
      return finalizeApplicationTimelineEntries(app, entries)
    }

    entries.push({
      title: 'Admin Review Completed',
      subtitle: formatDateTime(resolveDepartmentAdminActionDateValue(app)) || 'Completed',
      description: 'Application was reviewed and forwarded to HR.',
      icon: 'check_circle',
      color: 'positive',
      actor: resolveDepartmentAdminActor(app),
    })

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
        return finalizeApplicationTimelineEntries(app, entries)
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
      return finalizeApplicationTimelineEntries(app, entries)
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
        return finalizeApplicationTimelineEntries(app, entries)
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
      return finalizeApplicationTimelineEntries(app, entries)
    }

    if (rawStatus === 'RECALLED') {
      const approvedAt = formatDateTime(resolveFinalApprovalDateValue(app))
      const approvedBy = resolveHrActor(app)
      const recalledAt = formatDateTime(resolveRecallDateValue(app)) || 'Completed'
      const recalledBy = resolveRecallActor(app)

      if (hasEditRequest && preEditHrApprovalEntry) {
        entries.push(preEditHrApprovalEntry)
      } else if (approvedAt || approvedBy !== 'Unknown') {
        entries.push({
          title: 'Approved by HR',
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
      return finalizeApplicationTimelineEntries(app, entries)
    }

    entries.push({
      title: 'Current Status',
      subtitle: getApplicationStatusLabel(app),
      description: 'Latest application status.',
      icon: 'info',
      color: getApplicationStatusColor(app),
    })
    entries.push(...editRequestEntries)

    return finalizeApplicationTimelineEntries(app, entries)
  }

  function finalizeApplicationTimelineEntries(app, entries) {
    if (!Array.isArray(entries) || !entries.length) return []

    const existingReceivedEntry = entries.find((entry) => isReceivedTimelineEntryTitle(entry))
    const existingReleasedEntry = entries.find((entry) => isReleasedTimelineEntryTitle(entry))
    const existingClosedEntries = entries.filter((entry) =>
      isTimelineEntryTitle(entry, 'Application Closed'),
    )

    if (!existingClosedEntries.length && !existingReceivedEntry && !existingReleasedEntry) {
      return entries
    }

    const cleanedTimeline = entries.filter(
      (entry) =>
        !isReceivedTimelineEntryTitle(entry) &&
        !isReleasedTimelineEntryTitle(entry) &&
        !isTimelineEntryTitle(entry, 'Application Closed'),
    )

    const hasUpdateCycle = hasAdminEditRequestSignal(app)
    const cycleDisapprovedEntry = hasUpdateCycle
      ? getCurrentCycleDisapprovedTimelineEntry(cleanedTimeline)
      : null
    const isAdminDisapprovedUpdateCycle = hasUpdateCycle &&
      isAdminDisapprovedUpdateRequestTimelineEntry(cycleDisapprovedEntry)
    const historicalReceivedEntry = hasUpdateCycle
      ? buildHistoricalReceivedTimelineEntry(app, existingReceivedEntry)
      : null
    const historicalReleasedEntry = hasUpdateCycle
      ? buildHistoricalReleasedTimelineEntry(app, existingReleasedEntry)
      : null
    const shouldShowCurrentCycleReceivedEntry =
      !cycleDisapprovedEntry || isApplicationReceivedByHr(app)

    const cycleReceivedEntry = buildReceivedTimelineEntry(app, existingReceivedEntry)
    const cycleReleasedEntry = buildReleasedTimelineEntry(
      app,
      existingReleasedEntry,
      cycleDisapprovedEntry,
    )

    const receivedInsertEntry = historicalReceivedEntry ||
      (shouldShowCurrentCycleReceivedEntry ? cycleReceivedEntry : null)
    if (receivedInsertEntry) {
      const receivedInsertIndex = getReceivedTimelineInsertionIndex(app, cleanedTimeline)
      cleanedTimeline.splice(receivedInsertIndex, 0, receivedInsertEntry)
    }

    const finalizedEntries = [...cleanedTimeline]
    if (hasUpdateCycle) {
      if (historicalReleasedEntry) {
        const historicalReleaseInsertIndex =
          getHistoricalReleasedTimelineInsertionIndex(finalizedEntries)
        finalizedEntries.splice(historicalReleaseInsertIndex, 0, historicalReleasedEntry)
      }
      if (historicalReceivedEntry && shouldShowCurrentCycleReceivedEntry) {
        const updateReceivedInsertIndex =
          getUpdateReceivedTimelineInsertionIndex(finalizedEntries)
        finalizedEntries.splice(updateReceivedInsertIndex, 0, cycleReceivedEntry)
      }
      if (!isAdminDisapprovedUpdateCycle) {
        finalizedEntries.push(cycleReleasedEntry)
      }
    } else {
      finalizedEntries.push(cycleReleasedEntry)
    }

    const closedEntry = buildClosedTimelineEntry(
      existingClosedEntries[0] || null,
      isApplicationReleased(app),
      cycleDisapprovedEntry,
    )
    if (closedEntry) {
      finalizedEntries.push(closedEntry)
    }

    return finalizedEntries.map((entry) => adjustPendingHrTimelineEntryForReceive(app, entry))
  }

  function normalizeTimelineEntryTitle(entry) {
    return String(entry?.title || '')
      .trim()
      .toLowerCase()
  }

  function isTimelineEntryTitle(entry, title) {
    return normalizeTimelineEntryTitle(entry) === String(title || '').trim().toLowerCase()
  }

  function isReceivedTimelineEntryTitle(entry) {
    const normalizedTitle = normalizeTimelineEntryTitle(entry)
    return (
      normalizedTitle === 'received application' ||
      normalizedTitle === 'update received' ||
      normalizedTitle === 'cancellation form received'
    )
  }

  function isReleasedTimelineEntryTitle(entry) {
    const normalizedTitle = normalizeTimelineEntryTitle(entry)
    return (
      normalizedTitle === 'released application' ||
      normalizedTitle === 'update released' ||
      normalizedTitle === 'cancellation form released'
    )
  }

  function getRequestCycleDocumentLabel(app) {
    if (!hasAdminEditRequestSignal(app)) return ''
    return isAdminCancellationRequest(app) ? 'Cancellation Form' : 'Update'
  }

  function getReceivedTimelineTitle(app) {
    const cycleLabel = getRequestCycleDocumentLabel(app)
    return cycleLabel ? cycleLabel + ' Received' : 'Received Application'
  }

  function getReleasedTimelineTitle(app) {
    const cycleLabel = getRequestCycleDocumentLabel(app)
    return cycleLabel ? cycleLabel + ' Released' : 'Released Application'
  }

  function getDisapprovedDocumentTimelineTitle(app) {
    const cycleLabel = getRequestCycleDocumentLabel(app)
    return cycleLabel ? cycleLabel + ' Disapproved' : 'Application Disapproved'
  }

  function isHrPhaseTimelineEntry(entry) {
    const normalizedTitle = normalizeTimelineEntryTitle(entry)
    return (
      normalizedTitle.includes('pending hr review') ||
      normalizedTitle.includes('approved by hr') ||
      normalizedTitle.includes('application disapproved') ||
      normalizedTitle.includes('recalled by hr') ||
      normalizedTitle.includes('pending edit review (hr)') ||
      normalizedTitle.includes('pending cancellation review (hr)') ||
      normalizedTitle.includes('edit request approved') ||
      normalizedTitle.includes('edit request rejected') ||
      normalizedTitle.includes('edit request disapproved') ||
      normalizedTitle.includes('cancellation request approved') ||
      normalizedTitle.includes('cancellation request rejected') ||
      normalizedTitle.includes('cancellation request disapproved') ||
      normalizedTitle.includes('current status')
    )
  }

  function isUpdateRequestTimelineEntry(entry) {
    const normalizedTitle = normalizeTimelineEntryTitle(entry)
    return (
      normalizedTitle.includes('edit request submitted') ||
      normalizedTitle.includes('pending edit review') ||
      normalizedTitle.includes('edit request approved') ||
      normalizedTitle.includes('edit request rejected') ||
      normalizedTitle.includes('edit request disapproved') ||
      normalizedTitle.includes('cancellation request submitted') ||
      normalizedTitle.includes('pending cancellation review') ||
      normalizedTitle.includes('cancellation request approved') ||
      normalizedTitle.includes('cancellation request rejected') ||
      normalizedTitle.includes('cancellation request disapproved')
    )
  }

  function isDisapprovedUpdateRequestTimelineEntry(entry) {
    const normalizedTitle = normalizeTimelineEntryTitle(entry)
    return (
      normalizedTitle.includes('edit request rejected') ||
      normalizedTitle.includes('edit request disapproved') ||
      normalizedTitle.includes('cancellation request rejected') ||
      normalizedTitle.includes('cancellation request disapproved')
    )
  }

  function isAdminDisapprovedUpdateRequestTimelineEntry(entry) {
    if (!entry) return false
    if (!isDisapprovedUpdateRequestTimelineEntry(entry)) return false
    const normalizedTitle = normalizeTimelineEntryTitle(entry)
    return normalizedTitle.includes('by admin')
  }

  function getCurrentCycleDisapprovedTimelineEntry(entries) {
    if (!Array.isArray(entries)) return null
    return (
      [...entries]
        .reverse()
        .find((entry) => isDisapprovedUpdateRequestTimelineEntry(entry)) || null
    )
  }

  function getReceivedTimelineInsertionIndex(app, entries) {
    if (isCocApplication(app)) {
      const pendingHrReviewIndex = entries.findIndex((entry) =>
        isTimelineEntryTitle(entry, 'Pending HR Review') ||
        isTimelineEntryTitle(entry, 'Pending Edit Review (HR)') ||
        isTimelineEntryTitle(entry, 'Pending Cancellation Review (HR)'),
      )
      if (pendingHrReviewIndex >= 0) return pendingHrReviewIndex + 1

      const approvedByHrIndex = entries.findIndex((entry) =>
        isTimelineEntryTitle(entry, 'Approved by HR'),
      )
      if (approvedByHrIndex >= 0) return approvedByHrIndex + 1
    }

    const adminCompletedIndex = entries.findIndex((entry) =>
      isTimelineEntryTitle(entry, 'Admin Review Completed'),
    )
    if (adminCompletedIndex >= 0) return adminCompletedIndex + 1

    const adminPendingIndex = entries.findIndex((entry) =>
      isTimelineEntryTitle(entry, 'Department Admin Review Pending'),
    )
    if (adminPendingIndex >= 0) return adminPendingIndex + 1

    const hrPhaseIndex = entries.findIndex((entry) => isHrPhaseTimelineEntry(entry))
    if (hrPhaseIndex >= 0) return hrPhaseIndex

    return entries.length
  }

  function getHistoricalReleasedTimelineInsertionIndex(entries) {
    const approvedByHrIndex = entries.findIndex((entry) => isTimelineEntryTitle(entry, 'Approved by HR'))
    if (approvedByHrIndex >= 0) return approvedByHrIndex + 1

    const updateTimelineIndex = entries.findIndex((entry) => isUpdateRequestTimelineEntry(entry))
    if (updateTimelineIndex >= 0) return updateTimelineIndex

    const receivedIndex = entries.findIndex((entry) => isTimelineEntryTitle(entry, 'Received Application'))
    if (receivedIndex >= 0) return receivedIndex + 1

    return entries.length
  }

  function getUpdateReceivedTimelineInsertionIndex(entries) {
    const pendingAdminReviewIndex = entries.findIndex((entry) =>
      isTimelineEntryTitle(entry, 'Pending Edit Review (Admin)') ||
      isTimelineEntryTitle(entry, 'Pending Cancellation Review (Admin)'),
    )
    if (pendingAdminReviewIndex >= 0) return pendingAdminReviewIndex + 1

    const adminApprovedIndex = entries.findIndex((entry) =>
      isTimelineEntryTitle(entry, 'Edit Request Approved by Admin') ||
      isTimelineEntryTitle(entry, 'Cancellation Request Approved by Admin'),
    )
    if (adminApprovedIndex >= 0) return adminApprovedIndex + 1

    const pendingHrReviewIndex = entries.findIndex((entry) =>
      isTimelineEntryTitle(entry, 'Pending Edit Review (HR)') ||
      isTimelineEntryTitle(entry, 'Pending Cancellation Review (HR)'),
    )
    if (pendingHrReviewIndex >= 0) return pendingHrReviewIndex

    const requestSubmittedIndex = entries.findIndex((entry) =>
      isTimelineEntryTitle(entry, 'Edit Request Submitted') ||
      isTimelineEntryTitle(entry, 'Cancellation Request Submitted'),
    )
    if (requestSubmittedIndex >= 0) return requestSubmittedIndex + 1

    const updateTimelineIndex = entries.findIndex((entry) => isUpdateRequestTimelineEntry(entry))
    if (updateTimelineIndex >= 0) return updateTimelineIndex

    return entries.length
  }

  function shouldDeferPendingHrReviewUntilReceive(app) {
    if (!app || isCocApplication(app) || isCancelledByUser(app)) return false

    const rawStatus = getApplicationRawStatus(app)
    if (rawStatus !== 'PENDING_HR') return false

    return !isApplicationReceivedByHr(app)
  }

  function adjustPendingHrTimelineEntryForReceive(app, entry) {
    const isPendingHrReviewEntry = isTimelineEntryTitle(entry, 'Pending HR Review')
    const isPendingEditHrReviewEntry = isTimelineEntryTitle(entry, 'Pending Edit Review (HR)')
    const isPendingCancellationHrReviewEntry = isTimelineEntryTitle(entry, 'Pending Cancellation Review (HR)')
    if (!isPendingHrReviewEntry && !isPendingEditHrReviewEntry && !isPendingCancellationHrReviewEntry) return entry
    if (!shouldDeferPendingHrReviewUntilReceive(app)) return entry

    const pendingDescription = isPendingEditHrReviewEntry
      ? 'This stage starts after HR confirms receipt of the updated hard copy leave application form.'
      : isPendingCancellationHrReviewEntry
        ? 'This stage starts after HR confirms receipt of the cancellation form.'
        : 'This stage starts after HR confirms receipt of the hard copy leave application form.'

    return {
      ...entry,
      subtitle: 'Upcoming',
      description: pendingDescription,
      icon: 'radio_button_unchecked',
      color: 'grey-5',
      actor: undefined,
    }
  }

  function buildReceivedTimelineEntry(app, existingEntry = null) {
    const entryTitle = getReceivedTimelineTitle(app)
    const cycleDocumentLabel = getRequestCycleDocumentLabel(app)
    const isCoc = isCocApplication(app)
    const rawStatus = getApplicationRawStatus(app)
    const isCocAwaitingReceive = isCoc && rawStatus === 'APPROVED'

    if (!isApplicationReceivedByHr(app)) {
      return {
        title: entryTitle,
        subtitle: isCocAwaitingReceive ? 'Current stage' : 'Upcoming',
        description: isCocAwaitingReceive
          ? 'Waiting for HR to acknowledge this COC application.'
          : isCoc
            ? 'HR will acknowledge this COC application for review.'
          : cycleDocumentLabel
            ? cycleDocumentLabel === 'Cancellation Form'
              ? 'HR will confirm receipt of the cancellation form.'
              : 'HR will confirm receipt of the updated hard copy leave application form.'
            : 'HR will confirm receipt of the hard copy leave application form.',
        icon: isCocAwaitingReceive ? 'pending_actions' : 'radio_button_unchecked',
        color: isCocAwaitingReceive ? 'warning' : 'grey-5',
      }
    }

    const subtitle =
      formatDateTime(resolveReceivedDateValue(app)) ||
      String(existingEntry?.subtitle || '').trim() ||
      'Completed'
    const actor = resolveReceivedActor(app)

    return {
      title: entryTitle,
      subtitle,
      description:
        String(existingEntry?.description || '').trim() ||
        (isCoc
          ? 'HR acknowledged this COC application for review.'
          : cycleDocumentLabel
            ? cycleDocumentLabel === 'Cancellation Form'
              ? 'HR confirmed receipt of the cancellation form.'
              : 'HR confirmed receipt of the updated hard copy leave application form.'
            : 'HR confirmed receipt of the hard copy leave application form.'),
      icon: String(existingEntry?.icon || '').trim() || 'inventory_2',
      color: String(existingEntry?.color || '').trim() || 'positive',
      actor: actor !== 'Unknown' ? actor : undefined,
    }
  }

  function buildReleasedTimelineEntry(app, existingEntry = null, disapprovedEntry = null) {
    const entryTitle = getReleasedTimelineTitle(app)
    const cycleDocumentLabel = getRequestCycleDocumentLabel(app)
    const isCoc = isCocApplication(app)
    const isCocAwaitingRelease = isCoc && isApplicationReceivedByHr(app)

    if (disapprovedEntry) {
      return {
        title: getDisapprovedDocumentTimelineTitle(app),
        subtitle: String(disapprovedEntry?.subtitle || '').trim() || 'Reviewed',
        description:
          String(disapprovedEntry?.description || '').trim() ||
          (cycleDocumentLabel === 'Cancellation Form'
            ? 'Cancellation form release ended because the request was disapproved.'
            : 'Update release ended because the request was disapproved.'),
        icon: 'cancel',
        color: 'negative',
        actor: String(disapprovedEntry?.actor || '').trim() || undefined,
      }
    }

    if (!isApplicationReleased(app)) {
      return {
        title: entryTitle,
        subtitle: isCocAwaitingRelease ? 'Current stage' : 'Upcoming',
        description: isCocAwaitingRelease
          ? 'Waiting for HR to release this COC application.'
          : isCoc
            ? 'COC application release will follow final HR action.'
          : cycleDocumentLabel
            ? cycleDocumentLabel === 'Cancellation Form'
              ? 'Cancellation form will be released before final closure.'
              : 'Updated leave document will be released before final closure.'
            : 'Physical leave document will be released before final closure.',
        icon: isCocAwaitingRelease ? 'pending_actions' : 'radio_button_unchecked',
        color: isCocAwaitingRelease ? 'warning' : 'grey-5',
      }
    }

    const subtitle =
      formatDateTime(resolveReleasedDateValue(app)) ||
      String(existingEntry?.subtitle || '').trim() ||
      'Completed'
    const actor = resolveReleasedActor(app)

    return {
      title: entryTitle,
      subtitle,
      description:
        String(existingEntry?.description || '').trim() ||
        (isCoc
          ? 'COC application has been finalized and released.'
          : cycleDocumentLabel
            ? cycleDocumentLabel === 'Cancellation Form'
              ? 'Cancellation form has been released.'
              : 'Updated leave document has been released.'
            : 'Physical leave document has been released.'),
      icon: String(existingEntry?.icon || '').trim() || 'outbox',
      color: String(existingEntry?.color || '').trim() || 'positive',
      actor: actor !== 'Unknown' ? actor : undefined,
    }
  }

  function getDefaultClosedTimelineEntry() {
    return {
      title: 'Application Closed',
      subtitle: 'Upcoming',
      description: 'Application workflow is complete.',
      icon: 'radio_button_unchecked',
      color: 'grey-5',
    }
  }

  function buildHistoricalReceivedTimelineEntry(app, existingEntry = null) {
    const meta = resolveHistoricalReceivedBeforeCurrentUpdateMeta(app)
    if (!meta?.at) return null

    return {
      title: 'Received Application',
      subtitle: formatDateTime(meta.at) || 'Completed',
      description:
        String(existingEntry?.description || '').trim() ||
        'HR confirmed receipt of the hard copy leave application form.',
      icon: 'inventory_2',
      color: 'positive',
      actor: meta.actor && meta.actor !== 'Unknown' ? meta.actor : undefined,
    }
  }

  function buildHistoricalReleasedTimelineEntry(app, existingEntry = null) {
    const meta = resolveHistoricalReleasedBeforeCurrentUpdateMeta(app)
    if (!meta?.at) return null

    return {
      title: 'Released Application',
      subtitle: formatDateTime(meta.at) || 'Completed',
      description:
        String(existingEntry?.description || '').trim() ||
        'Physical leave document has been released.',
      icon: 'outbox',
      color: 'positive',
      actor: meta.actor && meta.actor !== 'Unknown' ? meta.actor : undefined,
    }
  }

  function buildClosedTimelineEntry(existingEntry = null, isReleasedState = false, disapprovedEntry = null) {
    const baseEntry = existingEntry ? { ...existingEntry } : getDefaultClosedTimelineEntry()
    if (disapprovedEntry) {
      return {
        ...baseEntry,
        subtitle: String(disapprovedEntry?.subtitle || '').trim() || 'Completed',
        description: 'Application workflow is complete.',
        icon: 'task_alt',
        color: 'positive',
        actor: String(disapprovedEntry?.actor || '').trim() || undefined,
      }
    }
    if (isReleasedState) return baseEntry

    return {
      ...baseEntry,
      subtitle: 'Upcoming',
      description: 'Application will be closed after document release.',
      icon: 'radio_button_unchecked',
      color: 'grey-5',
      actor: undefined,
    }
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

  function resolveStatusHistoryActor(entry) {
    return entry?.actor_name || entry?.action_by_name || entry?.action_by || null
  }

  function resolveStatusHistoryTimestamp(entry) {
    return entry?.created_at || null
  }

  function resolveReceivedActor(app) {
    const directActor = String(app?.received_by || '').trim()
    if (directActor) return directActor

    const historyActor = String(resolveStatusHistoryActor(resolveReceivedHistoryEntry(app)) || '').trim()
    return historyActor || 'Unknown'
  }

  function resolveReleasedActor(app) {
    const directActor = String(app?.released_by || '').trim()
    if (directActor) return directActor

    const historyActor = String(resolveStatusHistoryActor(resolveReleasedHistoryEntry(app)) || '').trim()
    return historyActor || 'Unknown'
  }

  function toComparableTimestamp(value) {
    const parsedDate = new Date(String(value || '').trim())
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

  function resolveCurrentUpdateRequestCycleStartValue(app) {
    if (!hasAdminEditRequestSignal(app)) return null
    const submittedMeta = resolveAdminEditRequestSubmittedMeta(app)
    return (
      app?.latest_update_requested_at ||
      submittedMeta?.submittedAt ||
      null
    )
  }

  function findLatestStatusHistoryEntryBefore(app, matcher, beforeValue) {
    const beforeTimestamp = toComparableTimestamp(beforeValue)
    if (Number.isNaN(beforeTimestamp)) return null

    const entries = getStatusHistoryEntries(app)
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const candidate = entries[index] || {}
      if (!matcher(candidate)) continue

      const candidateTimestamp = toComparableTimestamp(resolveStatusHistoryTimestamp(candidate))
      if (Number.isNaN(candidateTimestamp)) continue
      if (candidateTimestamp < beforeTimestamp) return candidate
    }

    return null
  }

  function resolveHistoricalReceivedBeforeCurrentUpdateMeta(app) {
    const cycleStart = resolveCurrentUpdateRequestCycleStartValue(app)
    if (!cycleStart) return null

    const historyEntry = findLatestStatusHistoryEntryBefore(app, (entry) => {
      const action = String(entry?.action || '')
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_')
      return action === 'HR_RECEIVED'
    }, cycleStart)

    if (!historyEntry) return null
    return {
      at: resolveStatusHistoryTimestamp(historyEntry),
      actor: String(resolveStatusHistoryActor(historyEntry) || '').trim() || 'Unknown',
    }
  }

  function resolveHistoricalReleasedBeforeCurrentUpdateMeta(app) {
    const cycleStart = resolveCurrentUpdateRequestCycleStartValue(app)
    if (!cycleStart) return null

    const historyEntry = findLatestStatusHistoryEntryBefore(app, (entry) => {
      const action = String(entry?.action || '')
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_')
      const stage = String(entry?.stage || '').trim().toLowerCase()
      return action === 'HR_RELEASED' || stage === 'hr released' || stage === 'released application'
    }, cycleStart)

    if (!historyEntry) return null
    return {
      at: resolveStatusHistoryTimestamp(historyEntry),
      actor: String(resolveStatusHistoryActor(historyEntry) || '').trim() || 'Unknown',
    }
  }

  function resolveReceivedDateValue(app) {
    return pickLatestTimestampValue(
      app?.received_at ||
        null,
      app?.hr_received_at || null,
      resolveStatusHistoryTimestamp(resolveReceivedHistoryEntry(app)) || null,
    )
  }

  function resolveReleasedDateValue(app) {
    return pickLatestTimestampValue(
      app?.released_at ||
        null,
      app?.hr_released_at || null,
      resolveStatusHistoryTimestamp(resolveReleasedHistoryEntry(app)) || null,
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

  function getTimelineEntryTone(entry) {
    const color = String(entry?.color || '').toLowerCase()
    const icon = String(entry?.icon || '').toLowerCase()

    if (color.includes('negative') || icon.includes('cancel')) return 'negative'
    if (color.includes('warning') || icon.includes('pending')) return 'warning'
    if (color.includes('grey') || icon.includes('radio_button_unchecked')) return 'neutral'
    return 'positive'
  }

  function getTimelineEntryIcon(entry) {
    const tone = getTimelineEntryTone(entry)
    if (tone === 'negative') return 'close'
    if (tone === 'warning') return 'schedule'
    if (tone === 'neutral') return 'radio_button_unchecked'
    return 'check'
  }

  function resolveFiledByActor(app) {
    if (isCocApplication(app)) {
      return app?.employee_name || 'Unknown'
    }
    return app?.filed_by || 'Unknown'
  }

  function resolveFiledDateValue(app) {
    return (
      app?.filed_at ||
      app?.created_at ||
      null
    )
  }

  function resolveDepartmentAdminActor(app) {
    return app?.admin_action_by || 'Unknown'
  }

  function resolveDepartmentAdminActionDateValue(app) {
    return app?.admin_action_at || null
  }

  function resolveHrActor(app) {
    return app?.hr_action_by || 'Unknown'
  }

  function resolveFinalApprovalDateValue(app) {
    return app?.hr_action_at || app?.reviewed_at || null
  }

  function getStatusHistoryEntries(app) {
    const entries = app?.status_history
    return Array.isArray(entries) ? entries : []
  }

  function findLatestStatusHistoryEntry(app, matcher) {
    const entries = getStatusHistoryEntries(app)
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const candidate = entries[index] || {}
      if (matcher(candidate)) return candidate
    }
    return null
  }

  function findStatusHistoryEntry(app, matcher) {
    return getStatusHistoryEntries(app).find((entry) => matcher(entry || {})) || null
  }

  function resolveRecallActor(app) {
    const historyEntry = findStatusHistoryEntry(app, (entry) => {
      const action = String(entry?.action || '').toUpperCase()
      const stage = String(entry?.stage || '').toLowerCase()
      return action === 'HR_RECALLED' || stage === 'hr recalled'
    })

    return (
      app?.recall_action_by ||
      historyEntry?.actor_name ||
      historyEntry?.action_by_name ||
      historyEntry?.action_by ||
      app?.hr_action_by ||
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
      historyEntry?.created_at ||
      app?.reviewed_at ||
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
      'Unknown'
    )
  }

  function resolveCancelledDateValue(app) {
    return (
      app?.cancelled_at ||
      null
    )
  }

  function resolveDisapprovalActor(app) {
    if (isCancelledByUser(app)) return resolveCancelledActor(app)
    return (
      app?.disapproved_by ||
      'Unknown'
    )
  }

  function resolveDisapprovedDateValue(app) {
    return (
      app?.disapproved_at ||
      null
    )
  }

  function resolveProcessedBy(app) {
    if (app?.processed_by) return app.processed_by
    if (isCancelledByUser(app)) return resolveCancelledActor(app)
    const rawStatus = getApplicationRawStatus(app)
    if (rawStatus === 'PENDING_HR') return resolveDepartmentAdminActor(app)
    if (rawStatus === 'APPROVED') return resolveHrActor(app)
    if (rawStatus === 'RECALLED') return resolveRecallActor(app)
    if (rawStatus === 'REJECTED') return resolveDisapprovalActor(app)
    return 'N/A'
  }

  function resolveReviewedDateValue(app) {
    const reviewedAt = app?.reviewed_at
    if (reviewedAt) return reviewedAt
    if (isCancelledByUser(app)) return app?.cancelled_at || app?.disapproved_at || null

    const rawStatus = getApplicationRawStatus(app)
    if (rawStatus === 'PENDING_HR') return app?.admin_action_at || null
    if (rawStatus === 'APPROVED') return app?.hr_action_at || app?.admin_action_at || null
    if (rawStatus === 'RECALLED') {
      return resolveRecallDateValue(app) || app?.hr_action_at || app?.admin_action_at || null
    }
    if (rawStatus === 'REJECTED') {
      return app?.disapproved_at || app?.hr_action_at || app?.admin_action_at || null
    }
    return null
  }

  function formatReviewedDate(app) {
    const reviewedDate = resolveReviewedDateValue(app)
    return reviewedDate ? formatDate(reviewedDate) : 'N/A'
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

  function getApplicationQueueGroupStatus(app) {
    if (!isCocApplication(app) && getAdminLatestUpdateRequestStatus(app) === 'REJECTED') {
      return 'REJECTED'
    }

    const explicitQueueGroupStatus = normalizeQueueGroupStatusToken(
      app?.queue_group_status ?? app?.queueGroupStatus,
    )
    if (explicitQueueGroupStatus) return explicitQueueGroupStatus

    const rawStatus = getApplicationRawStatus(app)
    if (rawStatus === 'RECALLED') return 'RECALLED'
    if (rawStatus === 'REJECTED' || rawStatus === 'DISAPPROVED') return 'REJECTED'
    if (rawStatus === 'APPROVED') return 'APPROVED'
    if (rawStatus.includes('PENDING')) return 'PENDING'

    const groupedRawStatus = getApplicationGroupedRawStatus(app)
    if (groupedRawStatus === 'RECALLED') return 'RECALLED'
    if (groupedRawStatus === 'REJECTED' || groupedRawStatus === 'DISAPPROVED') return 'REJECTED'
    if (groupedRawStatus === 'APPROVED') return 'APPROVED'
    if (groupedRawStatus.includes('PENDING')) return 'PENDING'

    const statusLabel = String(getApplicationStatusLabel(app) || '').toUpperCase()
    if (statusLabel.includes('RECALL')) return 'RECALLED'
    if (statusLabel.includes('REJECT') || statusLabel.includes('DISAPPROV')) return 'REJECTED'
    if (statusLabel.includes('APPROV')) return 'APPROVED'
    if (statusLabel.includes('PENDING')) return 'PENDING'

    return 'OTHER'
  }

  function resolvePendingQueueStagePriority(app) {
    const explicitPriority = Number(app?.queue_stage_priority ?? app?.queueStagePriority)
    if (Number.isFinite(explicitPriority) && explicitPriority > 0) {
      return explicitPriority
    }

    const queueStageKey = getApplicationQueueStageKey(app)
    if (queueStagePriority[queueStageKey] !== undefined) {
      return queueStagePriority[queueStageKey]
    }

    const rawStatus = getApplicationRawStatus(app)
    if (rawStatus === 'PENDING_LATE_HR') return queueStagePriority.PENDING_LATE_HR
    if (rawStatus === 'PENDING_ADMIN') {
      return isPendingUpdateWorkflowCycle(app)
        ? queueStagePriority.PENDING_ADMIN_REVIEW
        : queueStagePriority.PENDING_ADMIN
    }
    if (rawStatus === 'PENDING_HR') {
      return isApplicationReceivedByHr(app)
        ? queueStagePriority.PENDING_HR_REVIEW
        : queueStagePriority.PENDING_HR_RECEIVE
    }
    if (rawStatus === 'APPROVED' && !isApplicationReleased(app)) {
      return queueStagePriority.PENDING_RELEASE
    }
    if (rawStatus.includes('PENDING')) return queueStagePriority.PENDING

    return queueStagePriority.PENDING
  }

  function getApplicationQueueTimestamp(app) {
    const candidateDates = [
      app?.created_at,
      app?.filed_at,
      app?.dateFiled,
    ]

    for (const candidate of candidateDates) {
      const timestamp = Date.parse(String(candidate || '').trim())
      if (Number.isFinite(timestamp)) return timestamp
    }

    return Number.POSITIVE_INFINITY
  }

  function compareApplicationsForTable(a, b) {
    const groupPriorityDiff =
      (queueGroupPriority[getApplicationQueueGroupStatus(a)] ?? queueGroupPriority.OTHER) -
      (queueGroupPriority[getApplicationQueueGroupStatus(b)] ?? queueGroupPriority.OTHER)
    if (groupPriorityDiff !== 0) return groupPriorityDiff

    const groupA = getApplicationQueueGroupStatus(a)
    const groupB = getApplicationQueueGroupStatus(b)
    if (groupA === 'PENDING' && groupB === 'PENDING') {
      const stagePriorityDiff = resolvePendingQueueStagePriority(a) - resolvePendingQueueStagePriority(b)
      if (stagePriorityDiff !== 0) return stagePriorityDiff
    }

    const isLifoGroup =
      groupA === groupB &&
      (groupA === 'APPROVED' || groupA === 'REJECTED' || groupA === 'RECALLED')

    const dateA = getApplicationQueueTimestamp(a)
    const dateB = getApplicationQueueTimestamp(b)
    if (dateA !== dateB) return isLifoGroup ? dateB - dateA : dateA - dateB

    const idA = Number(a?.id)
    const idB = Number(b?.id)
    const normalizedIdA = Number.isFinite(idA) ? idA : Number.MAX_SAFE_INTEGER
    const normalizedIdB = Number.isFinite(idB) ? idB : Number.MAX_SAFE_INTEGER
    if (normalizedIdA !== normalizedIdB) {
      return isLifoGroup ? normalizedIdB - normalizedIdA : normalizedIdA - normalizedIdB
    }

    const variantA = a?.application_row_variant === 'recalled' ? 1 : 0
    const variantB = b?.application_row_variant === 'recalled' ? 1 : 0
    if (variantA !== variantB) return variantA - variantB

    return String(a?.application_uid || '').localeCompare(String(b?.application_uid || ''))
  }

  function getApplicationRecencyTimestamp(app) {
    const candidateDates = [
      app?.created_at,
      app?.filed_at,
    ]

    for (const candidate of candidateDates) {
      const timestamp = Date.parse(candidate || '')
      if (Number.isFinite(timestamp)) return timestamp
    }

    return 0
  }

  function compareApplicationsByRecencyDesc(a, b) {
    const timestampDiff = getApplicationRecencyTimestamp(b) - getApplicationRecencyTimestamp(a)
    if (timestampDiff !== 0) return timestampDiff

    const idDiff = (Number(b?.id) || 0) - (Number(a?.id) || 0)
    if (idDiff !== 0) return idDiff
    return 0
  }

  function formatRecentRemarks(app) {
    const remarksText = String(app?.remarks || '').trim()
    if (!remarksText) return ''
    return remarksText.replace(/^cancelled(?:\s+via\s+erms)?\b:?\s*/i, '').trim()
  }

  function isPendingAdminEditRequestApprovalTarget(target = confirmActionTarget.value) {
    const app = resolveApp(target)
    if (!app || isCocApplication(app)) return false

    return (
      getAdminLatestUpdateRequestStatus(app) === 'PENDING' &&
      hasAdminEditRequestSignal(app)
    )
  }

  function getConfirmActionTitle(type) {
    if (type === 'approve' && isPendingAdminEditRequestApprovalTarget()) {
      return isAdminCancellationRequest(resolveApp(confirmActionTarget.value))
        ? 'Confirm Cancellation Request'
        : 'Confirm Request Update'
    }
    if (type === 'approve') return 'Approve'
    if (type === 'cancel') return 'Cancel'
    return 'Disapprove'
  }

  function getConfirmActionMessage(type) {
    if (type === 'approve' && isPendingAdminEditRequestApprovalTarget()) {
      const targetApp = resolveApp(confirmActionTarget.value)
      if (isAdminCancellationRequest(targetApp)) {
        return 'This will confirm the cancellation request and forward it to HR for final review.'
      }

      return 'This will confirm the request update and forward it to HR for final edit review.'
    }
    if (type === 'approve') return 'This will forward the leave request to HR for final review.'
    if (type === 'cancel') return 'You will continue to the cancellation form.'
    return 'You will continue to the disapproval form.'
  }

  function getActionResultLabel(type) {
    if (type === 'approved') return 'Approved'
    if (type === 'cancelled') return 'Cancelled'
    return 'Disapproved'
  }

  function getActionResultVerb(type) {
    if (type === 'approved') return 'approved'
    if (type === 'cancelled') return 'cancelled'
    return 'disapproved'
  }

  function setCalendarPreviewMonth(dateValue) {
    const normalizedDate = normalizeIsoDate(dateValue || new Date())
    const [year, month] = (normalizedDate || normalizeIsoDate(new Date())).split('-')

    calendarPreviewView.value = {
      year,
      month,
    }
  }

  function syncCalendarPreviewDecorations() {
    nextTick(() => {
      requestAnimationFrame(() => {
        const calendarRoot = calendarPreviewRef.value
        if (!calendarRoot) return

        const calendarRect = calendarRoot.getBoundingClientRect()
        const calendarWidth = calendarRoot.clientWidth || calendarRect.width || 0
        let nextWarningStyle = {}

        const dayCells = calendarRoot.querySelectorAll('.q-date__calendar-item')
        dayCells.forEach((cell) => {
          cell.classList.remove('leave-date-calendar__day--locked')
          cell.classList.remove('leave-date-calendar__day--locked-pending')
          cell.classList.remove('leave-date-calendar__day--locked-approved')
          cell.classList.remove('leave-date-calendar__day--locked-request-update')
          cell.classList.remove('leave-date-calendar__day--warning')

          if (cell.classList.contains('q-date__calendar-item--fill')) return

          const dayMatch = String(cell.textContent || '').match(/\b([1-9]|[12]\d|3[01])\b/)
          const day = dayMatch ? Number.parseInt(dayMatch[1], 10) : NaN
          if (!Number.isInteger(day) || day < 1 || day > 31) return

          const date = `${calendarPreviewView.value.year}-${calendarPreviewView.value.month}-${String(day).padStart(2, '0')}`
          const lockedState = calendarPreviewDateStates.value.get(date)
          if (!lockedState) return

          cell.classList.add('leave-date-calendar__day--locked')
          cell.classList.add(`leave-date-calendar__day--locked-${lockedState}`)

          if (calendarPreviewWarningDate.value === date && calendarPreviewDateWarning.value) {
            cell.classList.add('leave-date-calendar__day--warning')

            const cellRect = cell.getBoundingClientRect()
            const popupWidth = Math.max(
              160,
              Math.min(CALENDAR_PREVIEW_WARNING_WIDTH, Math.max(calendarWidth - 16, 160)),
            )
            const cellCenter = (cellRect.left - calendarRect.left) + (cellRect.width / 2)
            const popupLeft = Math.max(
              8,
              Math.min(cellCenter - (popupWidth * 0.58), calendarWidth - popupWidth - 8),
            )
            const popupTop = Math.max(6, (cellRect.top - calendarRect.top) - 56)
            const arrowLeft = Math.max(
              16,
              Math.min(cellCenter - popupLeft - 6, popupWidth - 18),
            )

            nextWarningStyle = {
              width: `${popupWidth}px`,
              left: `${popupLeft}px`,
              top: `${popupTop}px`,
              '--leave-date-warning-arrow-left': `${arrowLeft}px`,
            }
          }
        })

        calendarPreviewWarningStyle.value = nextWarningStyle
      })
    })
  }

  function onCalendarPreviewNavigation({ year, month }) {
    calendarPreviewView.value = {
      year: String(year),
      month: String(month).padStart(2, '0'),
    }
    clearCalendarPreviewWarning()
    syncCalendarPreviewDecorations()
  }

  function openCalendarPreview(application) {
    const baseApplication = resolveApp(application) || application
    if (!baseApplication) return

    calendarPreviewApp.value = baseApplication
    showTimelineDialog.value = false
    showDetailsDialog.value = false

    const previewDates = getApplicationCalendarPreviewDates(baseApplication)
    const anchorDate =
      previewDates[0] || normalizeIsoDate(baseApplication?.filed_at || baseApplication?.created_at) || normalizeIsoDate(new Date())

    calendarPreviewModel.value = []
    clearCalendarPreviewWarning()
    setCalendarPreviewMonth(anchorDate)

    calendarPreviewKey.value += 1
    showCalendarPreviewDialog.value = true
  }

  async function hydrateSelectedApplicationForDialog(baseApplication, dialogType = 'details') {
    const id = baseApplication?.id ?? baseApplication?.application_id ?? baseApplication?.leave_application_id
    if (!id) return

    const endpoint = isCocApplication(baseApplication)
      ? `/admin/coc-applications/${id}`
      : `/admin/leave-applications/${id}`

    try {
      const response = await api.get(endpoint)
      const detailedApplication = extractSingleApplicationFromPayload(response?.data)
      if (!detailedApplication || typeof detailedApplication !== 'object') return

      const normalizedDetail = normalizeAdminApplicationForDisplay(detailedApplication)
      const normalizedBase = normalizeAdminApplicationForDisplay(baseApplication)
      const detailPayload = normalizedDetail && typeof normalizedDetail === 'object' ? normalizedDetail : {}
      const basePayload = normalizedBase && typeof normalizedBase === 'object' ? normalizedBase : {}
      const isRecalledVariant =
        String(basePayload?.application_row_variant || '').trim().toLowerCase() === 'recalled'
      const mergedPayload = isRecalledVariant
        ? { ...detailPayload, ...basePayload }
        : { ...basePayload, ...detailPayload }
      const normalizedMergedApplication = normalizeAdminApplicationForDisplay(mergedPayload)

      const activeDialogOpen = dialogType === 'timeline'
        ? showTimelineDialog.value
        : showDetailsDialog.value
      if (!activeDialogOpen) return

      const expectedKey = String(
        baseApplication?.application_uid || getApplicationRowKey(baseApplication),
      ).trim()
      const selectedKey = String(
        selectedApp.value?.application_uid || getApplicationRowKey(selectedApp.value),
      ).trim()
      if (selectedKey !== expectedKey) return

      selectedApp.value = normalizedMergedApplication
    } catch {
      // Keep existing row payload when detail endpoint fails.
    }
  }

  function openDetails(app) {
    const baseApplication = resolveApp(app) || app
    if (!baseApplication) return
    selectedApp.value = baseApplication
    showCalendarPreviewDialog.value = false
    showTimelineDialog.value = false
    showDetailsDialog.value = true

    void hydrateSelectedApplicationForDialog(baseApplication, 'details')
  }

  async function openTimeline(app) {
    const baseApplication = resolveApp(app) || app
    if (!baseApplication) return
    selectedApp.value = baseApplication
    showCalendarPreviewDialog.value = false
    showDetailsDialog.value = false
    showTimelineDialog.value = true
    timelineLoading.value = true

    try {
      await hydrateSelectedApplicationForDialog(baseApplication, 'timeline')
    } finally {
      timelineLoading.value = false
    }
  }

  function hasMobileApplicationActions(app) {
    const rawStatus = getApplicationRawStatus(app)
    return rawStatus === 'PENDING_ADMIN' || rawStatus === 'PENDING_HR'
  }

  function resolveApplicationAttachmentReference(app) {
    return String(app?.attachment_reference ?? '').trim()
  }

  function hasApplicationAttachment(app) {
    if (!app || typeof app !== 'object') return false
    if (resolveApplicationAttachmentReference(app)) return true

    const submittedFlag = app?.attachment_submitted
    return submittedFlag === true || submittedFlag === 1 || submittedFlag === '1' || submittedFlag === 'true'
  }

  async function viewApplicationAttachment(app = selectedApp.value) {
    const target = resolveApp(app)
    const id = target?.id

    if (!id) {
      $q.notify({ type: 'negative', message: 'Unable to identify this leave application attachment.', position: 'top' })
      return
    }

    try {
      const response = await api.get(`/admin/leave-applications/${id}/attachment`, {
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

        $q.notify({
          type: 'negative',
          message: parsedMessage || fallbackMessage,
          position: 'top',
        })
        return
      }

      const blob = response.data instanceof Blob
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
      $q.notify({ type: 'negative', message, position: 'top' })
    }
  }

  function handleApplicationRowClick(_event, row) {
    if (!row) return
    const eventTarget = _event?.target
    if (
      eventTarget &&
      typeof eventTarget.closest === 'function' &&
      eventTarget.closest(
        'button, [role="button"], a, .q-btn, .q-field, .q-checkbox, .q-toggle, .q-radio, .q-date',
      )
    ) {
      return
    }
    openTimeline(row)
  }

  function openActionConfirm(type, target) {
    const app = resolveApp(target) || target || null
    if (!app) return

    confirmActionType.value = type
    confirmActionTarget.value = app
    showCalendarPreviewDialog.value = false
    showTimelineDialog.value = false
    showDetailsDialog.value = false
    showConfirmActionDialog.value = true
  }

  function confirmPendingAction() {
    const target = confirmActionTarget.value
    const type = confirmActionType.value
    showConfirmActionDialog.value = false

    if (!target) {
      $q.notify({
        type: 'warning',
        message: 'Please select an application before continuing.',
        position: 'top',
      })
      return
    }

    if (type === 'approve') {
      handleApprove(target)
      return
    }

    openDisapprove(target, type === 'cancel' ? 'cancel' : 'disapprove')
  }

  async function printApplication(app) {
    if (!canPrintApplication(app)) return
    const cocApplication = isCocApplication(app)
    const cocPrintBlockedMessage =
      'COC form can be printed only after HR review and Regular/Special classification.'
    const pdfWindow = window.open('', '_blank')
    if (pdfWindow) {
      try {
        pdfWindow.document.title = 'Preparing PDF...'
        pdfWindow.document.body.innerHTML = '<div style="font-family: Arial, sans-serif; padding: 24px;">Preparing PDF...</div>'
      } catch {
        // Ignore interim window rendering issues.
      }
    }
    const targetApplicationId = String(
      app?.id ??
      app?.application_id ??
      app?.leave_application_id ??
      '',
    ).trim()

    const openApplicationPdf = async (application) => {
      if (cocApplication) {
        await generateCocApplicationPdf(application, { targetWindow: pdfWindow })
        return
      }

      await generateLeaveFormPdf(application, { targetWindow: pdfWindow })
    }

    try {
      const [dashboardResponse, leaveApplicationsResponse] = await Promise.all([
        api.get('/admin/dashboard'),
        cocApplication
          ? Promise.resolve(null)
          : targetApplicationId !== ''
            ? api.get(`/admin/leave-applications/${targetApplicationId}`).catch(() => null)
            : Promise.resolve(null),
      ])

      const dashboardPayload = dashboardResponse?.data
      const updatedApplications = mergeApplications(extractApplicationsFromPayload(dashboardPayload))
      const updated = updatedApplications.find(
        (item) => getApplicationRowKey(item) === getApplicationRowKey(app),
      )
      let printableApplication = updated || app

      if (!cocApplication && targetApplicationId !== '' && leaveApplicationsResponse?.data) {
        const detailedLeaveApplication = extractSingleApplicationFromPayload(leaveApplicationsResponse.data)

        if (detailedLeaveApplication && typeof detailedLeaveApplication === 'object') {
          printableApplication = {
            ...printableApplication,
            ...detailedLeaveApplication,
          }
        }
      }

      if (cocApplication) {
        const cocId =
          printableApplication?.id ??
          printableApplication?.coc_application_id ??
          app?.id ??
          app?.coc_application_id

        if (cocId !== undefined && cocId !== null && String(cocId).trim() !== '') {
          try {
            const cocResponse = await api.get(`/admin/coc-applications/${cocId}`)
            const detailedApplication = extractSingleApplicationFromPayload(cocResponse?.data)
            if (detailedApplication && typeof detailedApplication === 'object') {
              printableApplication = {
                ...printableApplication,
                ...detailedApplication,
              }
            }
          } catch {
            // Ignore detail endpoint failures and print with the best available data.
          }
        }
      }

      if (cocApplication && !isReviewedCocApplicationPrintable(printableApplication)) {
        if (pdfWindow && !pdfWindow.closed) pdfWindow.close()
        $q.notify({ type: 'warning', message: cocPrintBlockedMessage, position: 'top' })
        return
      }

      await openApplicationPdf(printableApplication)
    } catch (error) {
      if (cocApplication) {
        if (pdfWindow && !pdfWindow.closed) pdfWindow.close()
        const message = error instanceof Error && error.message
          ? error.message
          : cocPrintBlockedMessage
        $q.notify({ type: 'warning', message, position: 'top' })
        return
      }

      try {
        await openApplicationPdf(app)
      } catch (fallbackError) {
        if (pdfWindow && !pdfWindow.closed) pdfWindow.close()
        throw fallbackError
      }
    }
  }

  function printApplicationsPdf() {
    const rowsToPrint = applicationsForTable.value

    if (!rowsToPrint.length) {
      $q.notify({
        type: 'warning',
        message: 'No applications available to print.',
        position: 'top',
      })
      return
    }

    printAdminApplicationsPdf({
      rows: rowsToPrint,
      searchText: statusSearch.value,
      formatDate,
      getApplicationInclusiveDateLines,
      getApplicationDurationDisplay,
      getApplicationStatusLabel,
      resolveProcessedBy,
      formatReviewedDate,
    })
  }

  function resolveApp(target) {
    if (target && typeof target === 'object') return target

    const targetKey = String(target || '').trim()
    if (!targetKey) return null

    const keyedMatch = applicationRows.value.find(
      (app) => getApplicationRowKey(app) === targetKey || app?.application_uid === targetKey,
    )
    if (keyedMatch) return keyedMatch

    const id = Number(target)
    if (!id) return null
    return applicationRows.value.find((app) => Number(app.id) === id) || null
  }

  function mapStatusAfterAction(app, type) {
    if (!app) return null
    if (type === 'approved') {
      return {
        ...app,
        raw_status: 'PENDING_HR',
        status: 'Pending HR',
      }
    }
    if (type === 'cancelled') {
      return {
        ...app,
        raw_status: 'REJECTED',
        status: 'Cancelled',
        remarks: app.remarks || remarks.value,
      }
    }
    return {
      ...app,
      raw_status: 'REJECTED',
      status: 'Disapproved',
      remarks: app.remarks || remarks.value,
    }
  }

  function showPostActionDialog(type, id, fallbackApp = null, options = {}) {
    const { isEditRequestApproval = false } = options
    const fallbackKey = fallbackApp ? getApplicationRowKey(fallbackApp) : ''
    const updated = fallbackKey
      ? applicationRows.value.find((app) => getApplicationRowKey(app) === fallbackKey)
      : applicationRows.value.find((app) => Number(app.id) === Number(id))
    actionResultApp.value = updated || mapStatusAfterAction(fallbackApp, type)
    actionResultType.value = type
    actionResultIsEditRequestApproval.value = type === 'approved' && isEditRequestApproval
    showActionResultDialog.value = true
  }

  function printActionResult() {
    if (!actionResultApp.value) return
    printApplication(actionResultApp.value)
  }

  async function resolvePrintableLeaveApplicationForRequestChanges(target) {
    let printableApplication = resolveApp(target) || target

    const targetApplicationId = String(
      printableApplication?.id ??
      printableApplication?.application_id ??
      printableApplication?.leave_application_id ??
      '',
    ).trim()

    if (!targetApplicationId) return printableApplication

    try {
      const response = await api.get(`/admin/leave-applications/${targetApplicationId}`)
      const detailedApplication = extractSingleApplicationFromPayload(response?.data)

      if (detailedApplication && typeof detailedApplication === 'object') {
        printableApplication = {
          ...printableApplication,
          ...detailedApplication,
        }
      }
    } catch {
      // Ignore detail endpoint failures and print with the best available data.
    }

    try {
      const departmentHeadResponse = await api.get('/admin/department-head')
      const departmentHead =
        departmentHeadResponse?.data?.department_head ||
        departmentHeadResponse?.data?.departmentHead ||
        null

      if (departmentHead && typeof departmentHead === 'object') {
        const departmentHeadFullName = String(
          departmentHead?.full_name ||
            departmentHead?.fullName ||
            departmentHead?.name ||
            '',
        ).trim()

        printableApplication = {
          ...printableApplication,
          departmentHead,
          department_head: departmentHead,
          ...(departmentHeadFullName
            ? {
                departmentHeadName: departmentHeadFullName,
                department_head_name: departmentHeadFullName,
              }
            : {}),
        }
      }
    } catch {
      // Ignore department head endpoint failures and print with best available approver data.
    }

    return printableApplication
  }

  function canPrintRequestChangesApplication(app) {
    const target = resolveApp(app) || app
    return hasApplicationEditRequest(target)
  }

  async function printRequestChangesApplication(app, options = {}) {
    const forcePrint = Boolean(options?.force)
    const target = resolveApp(app) || app
    if (!target) return
    if (!forcePrint && !canPrintRequestChangesApplication(target)) return

    const pdfWindow = window.open('', '_blank')
    if (pdfWindow) {
      try {
        pdfWindow.document.title = 'Preparing PDF...'
        pdfWindow.document.body.innerHTML =
          '<div style="font-family: Arial, sans-serif; padding: 24px;">Preparing PDF...</div>'
      } catch {
        // Ignore interim window rendering issues.
      }
    }

    const printableApplication = await resolvePrintableLeaveApplicationForRequestChanges(target)

    try {
      await generateRequestChangesApprovedLeavePdf(printableApplication, {
        targetWindow: pdfWindow,
      })
    } catch (err) {
      if (pdfWindow && !pdfWindow.closed) pdfWindow.close()
      const message = resolveApiErrorMessage(err, 'Unable to print the request-change form right now.')
      $q.notify({ type: 'negative', message, position: 'top' })
    }
  }

  async function printRequestChangesActionResult() {
    if (!actionResultApp.value) return
    await printRequestChangesApplication(actionResultApp.value, { force: true })
  }

  async function handleApprove(target) {
    const app = resolveApp(target)
    const id = app?.id ?? target
    const isCoc = isCocApplication(app)
    const isEditRequestApproval = !isCoc && isPendingAdminEditRequestApprovalTarget(app)
    const isCancellationRequestApproval = isEditRequestApproval && isAdminCancellationRequest(app)
    const approvalEndpoint = isCoc
      ? `/admin/coc-applications/${id}/approve`
      : `/admin/leave-applications/${id}/approve`
    actionLoading.value = true
    try {
      await api.post(approvalEndpoint)
      $q.notify({
        type: 'positive',
        message: isCoc
          ? 'COC application approved and forwarded to HR!'
          : isEditRequestApproval
            ? isCancellationRequestApproval
              ? 'Leave cancellation request approved and forwarded to HR!'
              : 'Leave request update approved and forwarded to HR!'
            : 'Leave application approved and forwarded to HR!',
        position: 'top',
      })
      showDetailsDialog.value = false
      await fetchApplications()
      showPostActionDialog('approved', id, app, { isEditRequestApproval })
    } catch (err) {
      const message = resolveApiErrorMessage(err, 'Unable to approve this application right now.')
      $q.notify({ type: 'negative', message, position: 'top' })
    } finally {
      actionLoading.value = false
    }
  }

  function openDisapprove(target, mode = 'disapprove') {
    const app = resolveApp(target)
    disapproveId.value = app?.id ?? target
    disapproveTargetApp.value = app || null
    rejectionMode.value = mode
    remarks.value = ''
    showDisapproveDialog.value = true
  }

  async function confirmDisapprove() {
    if (!remarks.value.trim()) {
      const message =
        rejectionMode.value === 'cancel'
          ? 'Please provide a reason for cancellation'
          : 'Please provide a reason for disapproval'
      $q.notify({ type: 'warning', message, position: 'top' })
      return
    }

    actionLoading.value = true
    try {
      const targetApp = disapproveTargetApp.value || resolveApp(disapproveId.value)
      const isCoc = isCocApplication(targetApp)
      const actionType = rejectionMode.value === 'cancel' ? 'cancelled' : 'disapproved'
      const payloadRemarks =
        rejectionMode.value === 'cancel'
          ? `Cancelled by Department Admin: ${remarks.value.trim()}`
          : remarks.value

      const disapprovalEndpoint = isCoc
        ? `/admin/coc-applications/${disapproveId.value}/reject`
        : `/admin/leave-applications/${disapproveId.value}/reject`

      await api.post(disapprovalEndpoint, {
        remarks: payloadRemarks,
      })

      const successMessage =
        rejectionMode.value === 'cancel'
          ? isCoc
            ? 'COC application cancelled with remarks'
            : 'Leave application cancelled with remarks'
          : isCoc
            ? 'COC application disapproved with remarks'
            : 'Leave application disapproved with remarks'
      $q.notify({ type: 'info', message: successMessage, position: 'top' })
      showDisapproveDialog.value = false
      await fetchApplications()

      const fallback = disapproveTargetApp.value
        ? { ...disapproveTargetApp.value, remarks: payloadRemarks }
        : null
      showPostActionDialog(actionType, disapproveId.value, fallback)
    } catch (err) {
      const fallbackError =
        rejectionMode.value === 'cancel'
          ? 'Unable to cancel this application right now.'
          : 'Unable to reject this application right now.'
      const message = resolveApiErrorMessage(err, fallbackError)
      $q.notify({ type: 'negative', message, position: 'top' })
    } finally {
      actionLoading.value = false
    }
  }

  return {
    $q,
    loading,
    actionLoading,
    applicationRows,
    leaveApplicationRows,
    statusSearch,
    applicationsPagination,
    applicationTableColumns,
    applicationsForTable,
    showApplyLeaveDialog,
    showDetailsDialog,
    showTimelineDialog,
    timelineLoading,
    showCalendarPreviewDialog,
    showDisapproveDialog,
    showConfirmActionDialog,
    showActionResultDialog,
    selectedApp,
    selectedAppTimeline,
    calendarPreviewApp,
    calendarPreviewModel,
    calendarPreviewKey,
    calendarPreviewRef,
    calendarPreviewYearMonth,
    calendarPreviewEmployeeName,
    calendarPreviewStateCounts,
    calendarPreviewDateWarning,
    calendarPreviewWarningStyle,
    calendarPreviewWarningState,
    rejectionDialogTitle,
    rejectionDialogLabel,
    confirmActionType,
    rejectionMode,
    remarks,
    actionResultType,
    actionResultApp,
    actionResultIsEditRequestApproval,
    canPrintRequestChangesActionResult,
    openApplyLeaveDialog,
    closeApplyLeaveDialog,
    handleApplyLeaveSubmitted,
    printApplicationsPdf,
    handleApplicationRowClick,
    getLeaveBalanceTextItems,
    getCurrentLeaveBalanceDisplay,
    getCurrentCtoAvailableHoursDisplay,
    getApplicationCtoRequiredHoursDisplay,
    getCtoDeductedHoursDisplay,
    getApplicationDurationDisplay,
    getCocBaseCreditableDisplay,
    getCocRawOvertimeDisplay,
    getCocCreditedHoursDisplay,
    getApplicationInclusiveDateColumnLines,
    getApplicationInclusiveDateLines,
    getSelectedDateIndicatorRows,
    getPendingUpdateDateIndicatorRows,
    hasPendingDateUpdate,
    formatDate,
    getApplicationStatusColor,
    getApplicationStatusLabel,
    getEditRequestBadgeLabel,
    getEditRequestBadgeColor,
    hasApplicationEditRequest,
    getApplicationEditRequestStatusLabel,
    getApplicationEditRequestStatusFieldLabel,
    getApplicationEditRequestApprovedBadgeLabel,
    getApplicationEditRequestSectionTitle,
    shouldShowApplicationEditRequestDateComparison,
    isApplicationEditCancellationRequest,
    getApplicationEditRequestRequestedAt,
    getApplicationEditRequestRequestedBy,
    getApplicationEditRequestReason,
    getApplicationEditRequestFromDates,
    getApplicationEditRequestToDates,
    getApplicationEditRequestCurrentDuration,
    getApplicationEditRequestRequestedDuration,
    getApplicationEditRequestFinalInclusiveDates,
    getApplicationEditRequestFinalDuration,
    isApplicationEditRequestHrApproved,
    shouldShowPendingDateComparisonInDetails,
    openDetails,
    openCalendarPreview,
    onCalendarPreviewNavigation,
    handleCalendarPreviewModelUpdate,
    handleCalendarPreviewSurfacePointerDown,
    handleCalendarPreviewSurfaceClick,
    syncCalendarPreviewDecorations,
    isCocApplication,
    canPrintApplication,
    printApplication,
    hasMobileApplicationActions,
    hasApplicationAttachment,
    viewApplicationAttachment,
    isCtoLeaveApplication,
    openActionConfirm,
    getTimelineEntryTone,
    getTimelineEntryIcon,
    getConfirmActionTitle,
    getConfirmActionMessage,
    confirmPendingAction,
    confirmDisapprove,
    getActionResultLabel,
    getActionResultVerb,
    printActionResult,
    canPrintRequestChangesApplication,
    printRequestChangesApplication,
    formatApplicationLeaveTypeLabel,
    printRequestChangesActionResult,
    getAdminUpdateRequestActionType,
    shouldShowCurrentLeaveBalance,
  }
}
