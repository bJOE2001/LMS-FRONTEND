import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { api } from 'src/boot/axios'
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { generateLeaveFormPdf } from 'src/utils/leave-form-pdf'
import { generateCocApplicationPdf } from 'src/utils/coc-form-pdf'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'
import {
  getApplicationRequestedDayCount,
  getApplicationSelectedDates,
  normalizeIsoDate,
  parseInclusiveDateText,
} from 'src/utils/leave-date-locking'

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

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
  'MCO6 Leave',
  'Wellness Leave',
]

const EVENT_BASED_LEAVE_BALANCE_TYPES = [
  'Maternity Leave',
  'Paternity Leave',
  'Special Privilege Leave',
  'Solo Parent Leave',
  'Study Leave',
  '10-Day VAWC Leave',
  'Rehabilitation Privilege',
  'Special Leave Benefits for Women',
  'Special Emergency (Calamity) Leave',
  'Adoption Leave',
]

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
      field: (row) => (row.is_monetization ? `${row.leaveType} (Monetization)` : row.leaveType),
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
  const statusSearch = ref('')
  const applicationsPagination = ref({
    page: 1,
    rowsPerPage: 10,
  })
  const showApplyLeaveDialog = ref(false)
  const showDetailsDialog = ref(false)
  const showTimelineDialog = ref(false)
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
    const filteredApplications = queryTokens.length
      ? applicationRows.value.filter((app) => {
          const searchText = getApplicationSearchText(app)
          return queryTokens.every((token) => searchText.includes(token))
        })
      : applicationRows.value

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
    const applicationDates = getApplicationCalendarDates(application)
    if (!applicationState || applicationDates.length === 0) return []

    return [application]
  })
  const calendarPreviewDateStates = computed(() => {
    const dateStates = new Map()

    for (const application of calendarPreviewEmployeeApplications.value) {
      const applicationState = getApplicationCalendarState(application)
      if (!applicationState) continue

      for (const date of getApplicationCalendarDates(application)) {
        if (!date) continue

        const existingState = dateStates.get(date)
        if (!existingState || applicationState === 'pending') {
          dateStates.set(date, applicationState)
        }
      }
    }

    return dateStates
  })
  const calendarPreviewStateCounts = computed(() => {
    const counts = {
      pending: 0,
      approved: 0,
    }

    for (const state of calendarPreviewDateStates.value.values()) {
      if (state === 'pending') counts.pending += 1
      if (state === 'approved') counts.approved += 1
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

  async function handleApplyLeaveSubmitted() {
    closeApplyLeaveDialog()
    await fetchApplications()
  }

  async function fetchApplications() {
    loading.value = true
    try {
      const [dashboardResponse, leaveApplicationsResponse, cocApplicationsResponse] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/leave-applications').catch(() => null),
        api.get('/admin/coc-applications').catch(() => null),
      ])

      applicationRows.value = expandApplicationsForDisplay(mergeApplications(
        extractApplicationsFromPayload(dashboardResponse?.data),
        extractApplicationsFromPayload(leaveApplicationsResponse?.data),
        extractApplicationsFromPayload(cocApplicationsResponse?.data),
      ))
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
      selected_dates: recalledDateKeys,
      selectedDates: recalledDateKeys,
      recall_selected_dates: recalledDateKeys,
      recallSelectedDates: recalledDateKeys,
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
      application?.employee?.name ||
      application?.employee?.full_name ||
      application?.employee?.employee_name ||
      application?.name ||
      application?.full_name ||
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
      application?.employeeControlNo,
      application?.control_no,
      application?.controlNo,
      application?.employee?.control_no,
      application?.employee?.controlNo,
      application?.employee?.employee_control_no,
      application?.employee?.employeeControlNo,
      application?.user?.control_no,
      application?.user?.controlNo,
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
      application?.employeeControlNo,
      application?.leaveType,
      application?.leave_type,
      application?.leaveTypeName,
      application?.dateFiled,
      application?.date_filed,
      application?.status,
      application?.rawStatus,
      application?.remarks,
      application?.updated_at,
      application?.updatedAt,
      application?.selected_dates,
      application?.selectedDates,
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
      application?.updatedAt,
      application?.disapprovedAt,
      application?.hrActionAt,
      application?.adminActionAt,
      application?.dateFiled,
      application?.date_filed,
      application?.filed_at,
      application?.filedAt,
      application?.created_at,
      application?.createdAt,
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
      mergedApplications.set(
        key,
        choosePreferredApplication(existingApplication, normalizedApplication),
      )
    })

    return Array.from(mergedApplications.values())
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
  if (lower === 'mco6' || lower === 'mco6 leave') return 'MCO6 Leave'
  if (lower === 'cto' || lower === 'cto leave') return 'CTO Leave'
  if (lower === 'vacation') return 'Vacation Leave'
  if (lower === 'sick') return 'Sick Leave'
  if (lower === 'vacation leave') return 'Vacation Leave'
  if (lower === 'sick leave') return 'Sick Leave'
  if (lower === 'wellness' || lower === 'wellness leave') return 'Wellness Leave'

    return normalized.replace(/\b\w/g, (char) => char.toUpperCase())
  }

  function toLeaveBalanceAcronym(value) {
    const label = prettifyLeaveBalanceLabel(value)
    if (!label) return ''

  const lower = label.toLowerCase()
  if (lower === 'cto leave') return 'CTO'
  if (lower === 'mandatory / forced leave') return 'FL'
  if (lower === 'mco6 leave') return 'MCO6'
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
    const explicitKey = app?.employee_control_no ?? app?.employeeControlNo ?? app?.control_no ?? app?.controlNo
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

  function getLeaveBalanceTypeKey(value) {
    return prettifyLeaveBalanceLabel(value).trim().toLowerCase()
  }

  function isEventBasedLeaveBalanceType(value) {
    const typeKey = getLeaveBalanceTypeKey(value)
    return EVENT_BASED_LEAVE_BALANCE_TYPES.some(
      (label) => getLeaveBalanceTypeKey(label) === typeKey,
    )
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

  function getLeaveBalanceTextItems(app) {
    return getLeaveBalanceEntries(app).map((entry) => {
      const acronym = toLeaveBalanceAcronym(entry.label)
      return {
        label: `${acronym || entry.label}: ${entry.value}`,
        tooltip: entry.label,
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

  function getStoredRecallDateKeys(source) {
    if (!source || typeof source !== 'object') return []

    const recalledDates = normalizeIsoDateList(
      parseSelectedDatesValue(
        source?.recall_selected_dates ??
          source?.recallSelectedDates ??
          source?.raw?.recall_selected_dates ??
          source?.raw?.recallSelectedDates,
      ),
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

    const rawStatus = String(app?.rawStatus || '').toUpperCase()
    const isRecalledRow = app?.application_row_variant === 'recalled' || rawStatus === 'RECALLED'

    return isRecalledRow
      ? dateSet.filter((dateKey) => recalledDateSet.has(dateKey))
      : dateSet.filter((dateKey) => !recalledDateSet.has(dateKey))
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

  function resolveApplicationPayModeCode(app) {
    const rawPayMode = String(
      app?.pay_mode ??
        app?.payMode ??
        app?.raw?.pay_mode ??
        app?.raw?.payMode ??
        '',
    ).trim()

    return normalizePayStatusCode(rawPayMode) === 'WOP' ? 'WOP' : 'WP'
  }

  function resolveApplicationTotalDays(app) {
    const candidates = [
      app?.total_days,
      app?.totalDays,
      app?.duration_value,
      app?.days,
      app?.raw?.total_days,
      app?.raw?.totalDays,
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
      app?.selected_date_coverage ??
        app?.selectedDateCoverage ??
        app?.raw?.selected_date_coverage ??
        app?.raw?.selectedDateCoverage,
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
      app?.selected_date_pay_status ??
        app?.selectedDatePayStatus ??
        app?.raw?.selected_date_pay_status ??
        app?.raw?.selectedDatePayStatus,
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
    const shouldMarkRecalledDates = app?.application_row_variant === 'recalled' || String(app?.rawStatus || '').toUpperCase() === 'RECALLED'

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

      return {
        dateKey: key,
        dateText: formatDate(key),
        coverageLabel: coverageWeight === 0.5 ? 'Half Day' : 'Whole Day',
        payStatus: payStatus === 'WOP' ? 'WOP' : 'WP',
        recalled: shouldMarkRecalledDates && recalledDateSet.has(key),
      }
    })
  }

  function getApplicationInclusiveDateLines(app) {
    if (!app) return ['N/A']

    if (app.is_monetization) {
      return ['N/A']
    }

    if (Array.isArray(app.selected_dates) && app.selected_dates.length > 0) {
      const recalledDateSet = new Set(getStoredRecallDateKeys(app))
      const visibleDateSet = getVisibleDateSetForDisplay(app)
      const shouldMarkRecalledDates = app?.application_row_variant === 'recalled' || String(app?.rawStatus || '').toUpperCase() === 'RECALLED'
      if (shouldMarkRecalledDates && recalledDateSet.size) {
        return visibleDateSet.map(
          (dateKey) => `${formatDate(dateKey)}${recalledDateSet.has(dateKey) ? ' (Recalled)' : ''}`,
        )
      }

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
    if (application?.rawStatus === 'APPROVED') return 'approved'
    if (application?.rawStatus === 'PENDING_ADMIN' || application?.rawStatus === 'PENDING_HR') {
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

  function getApplicationStatusLabel(app) {
    if (isCancelledByUser(app)) return 'Cancelled'
    if (app?.status) return app.status

    if (app?.rawStatus === 'PENDING_ADMIN') return 'Pending Admin'
    if (app?.rawStatus === 'PENDING_HR') return 'Pending HR'
    if (app?.rawStatus === 'APPROVED') return 'Approved'
    if (app?.rawStatus === 'RECALLED') return 'Recalled'
    if (app?.rawStatus === 'REJECTED') return 'Rejected'
    return 'Unknown'
  }

  function getApplicationStatusColor(app) {
    if (isCancelledByUser(app)) return 'grey-7'
    if (app?.rawStatus === 'PENDING_ADMIN') return 'warning'
    if (app?.rawStatus === 'PENDING_HR') return 'blue-6'
    if (app?.rawStatus === 'APPROVED') return 'green'
    if (app?.rawStatus === 'RECALLED') return 'blue-grey-6'
    if (app?.rawStatus === 'REJECTED') return 'negative'
    return 'grey-6'
  }

  function canPrintApplication(app) {
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

  function getApplicationSearchText(app) {
    const dateTerms = getDateSearchValues(app?.dateFiled)
    const inclusiveDateTerms = getApplicationInclusiveDateLines(app)

    const searchValues = [
      'application',
      app?.id,
      app?.rawStatus,
      app?.status,
      getApplicationStatusLabel(app),
      isCancelledByUser(app) ? 'cancelled' : '',
      app?.leaveType,
      app?.employeeName,
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

  function buildApplicationTimeline(app) {
    if (!app) return []

    const entries = [
      {
        title: 'Application Filed',
        subtitle:
          formatDateTime(resolveFiledDateValue(app)) ||
          formatDate(app.dateFiled) ||
          'Date unavailable',
        description: `${app.employeeName || 'Employee'} submitted this leave request.`,
        icon: 'check_circle',
        color: 'positive',
        actor: resolveFiledByActor(app),
      },
    ]

    if (isCancelledByUser(app)) {
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

    if (app.rawStatus === 'PENDING_ADMIN') {
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
      entries.push({
        title: 'Application Closed',
        subtitle: 'Upcoming',
        description: 'Application will be closed after final HR action.',
        icon: 'radio_button_unchecked',
        color: 'grey-5',
      })
      return entries
    }

    if (app.rawStatus === 'REJECTED') {
      const disapprovedAt = formatDateTime(resolveDisapprovedDateValue(app)) || 'Application closed'
      const disapprovedBy = resolveDisapprovalActor(app)

      if (resolveDepartmentAdminActionDateValue(app)) {
        entries.push({
          title: 'Department Admin Review Completed',
          subtitle: formatDateTime(resolveDepartmentAdminActionDateValue(app)) || 'Completed',
          description: 'Application was reviewed and forwarded to HR.',
          icon: 'check_circle',
          color: 'positive',
          actor: resolveDepartmentAdminActor(app),
        })
      }

      entries.push({
        title: 'Application Disapproved',
        subtitle: disapprovedAt,
        description: formatRecentRemarks(app) || 'Application was disapproved.',
        icon: 'cancel',
        color: 'negative',
        actor: disapprovedBy,
      })
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
      title: 'Department Admin Review Completed',
      subtitle: formatDateTime(resolveDepartmentAdminActionDateValue(app)) || 'Completed',
      description: 'Application was reviewed and forwarded to HR.',
      icon: 'check_circle',
      color: 'positive',
      actor: resolveDepartmentAdminActor(app),
    })

    if (app.rawStatus === 'PENDING_HR') {
      entries.push({
        title: 'Pending HR Review',
        subtitle: 'Current stage',
        description: 'Waiting for HR final evaluation and approval.',
        icon: 'pending_actions',
        color: 'warning',
      })
      entries.push({
        title: 'Application Closed',
        subtitle: 'Upcoming',
        description: 'Application will be closed after final HR action.',
        icon: 'radio_button_unchecked',
        color: 'grey-5',
      })
      return entries
    }

    if (app.rawStatus === 'APPROVED') {
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

    if (app.rawStatus === 'RECALLED') {
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

    return entries
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
    return app?.filedBy || app?.employeeName || 'Unknown'
  }

  function resolveFiledDateValue(app) {
    return (
      app?.filed_at ||
      app?.filedAt ||
      app?.created_at ||
      app?.createdAt ||
      app?.submitted_at ||
      app?.submittedAt ||
      app?.dateFiled ||
      app?.date_filed ||
      null
    )
  }

  function resolveDepartmentAdminActor(app) {
    return app?.adminActionBy || 'Unknown'
  }

  function resolveDepartmentAdminActionDateValue(app) {
    return app?.adminActionAt || app?.admin_action_at || null
  }

  function resolveHrActor(app) {
    return app?.hrActionBy || 'Unknown'
  }

  function resolveFinalApprovalDateValue(app) {
    return app?.hrActionAt || app?.hr_action_at || app?.reviewedAt || app?.reviewed_at || null
  }

  function getStatusHistoryEntries(app) {
    const entries = app?.statusHistory || app?.status_history
    return Array.isArray(entries) ? entries : []
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
      app?.recallActionBy ||
      app?.recall_action_by ||
      historyEntry?.actor_name ||
      historyEntry?.action_by_name ||
      historyEntry?.action_by ||
      app?.hrActionBy ||
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
      app?.recallActionAt ||
      app?.recall_action_at ||
      historyEntry?.created_at ||
      app?.reviewedAt ||
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
    return app?.cancelledBy || app?.employeeName || 'Unknown'
  }

  function resolveCancelledDateValue(app) {
    return (
      app?.cancelledAt ||
      app?.cancelled_at ||
      app?.disapprovedAt ||
      app?.disapproved_at ||
      null
    )
  }

  function resolveDisapprovalActor(app) {
    if (isCancelledByUser(app)) return resolveCancelledActor(app)
    return app?.disapprovedBy || app?.hrActionBy || app?.adminActionBy || 'Unknown'
  }

  function resolveDisapprovedDateValue(app) {
    return (
      app?.disapprovedAt ||
      app?.disapproved_at ||
      app?.hrActionAt ||
      app?.hr_action_at ||
      app?.adminActionAt ||
      app?.admin_action_at ||
      null
    )
  }

  function resolveProcessedBy(app) {
    if (app?.processedBy) return app.processedBy
    if (isCancelledByUser(app)) return resolveCancelledActor(app)
    if (app?.rawStatus === 'PENDING_HR') return resolveDepartmentAdminActor(app)
    if (app?.rawStatus === 'APPROVED') return resolveHrActor(app)
    if (app?.rawStatus === 'RECALLED') return resolveRecallActor(app)
    if (app?.rawStatus === 'REJECTED') return resolveDisapprovalActor(app)
    return 'N/A'
  }

  function resolveReviewedDateValue(app) {
    if (app?.reviewedAt) return app.reviewedAt
    if (isCancelledByUser(app)) return app?.cancelledAt || app?.disapprovedAt || null
    if (app?.rawStatus === 'PENDING_HR') return app?.adminActionAt || null
    if (app?.rawStatus === 'APPROVED') return app?.hrActionAt || app?.adminActionAt || null
    if (app?.rawStatus === 'RECALLED') {
      return resolveRecallDateValue(app) || app?.hrActionAt || app?.adminActionAt || null
    }
    if (app?.rawStatus === 'REJECTED') {
      return app?.disapprovedAt || app?.hrActionAt || app?.adminActionAt || null
    }
    return null
  }

  function formatReviewedDate(app) {
    const reviewedDate = resolveReviewedDateValue(app)
    return reviewedDate ? formatDate(reviewedDate) : 'N/A'
  }

  function getApplicationStatusPriority(app) {
    const groupedRawStatus = String(app?.group_raw_status || app?.groupRawStatus || app?.rawStatus || '').toUpperCase()
    if (groupedRawStatus === 'PENDING_ADMIN') return 0
    if (groupedRawStatus === 'PENDING_HR') return 1
    if (groupedRawStatus === 'APPROVED') return 2
    if (groupedRawStatus === 'REJECTED' && !isCancelledByUser(app)) return 3
    if (isCancelledByUser(app)) return 4
    return 5
  }

  function compareApplicationsForTable(a, b) {
    const statusPriorityDiff = getApplicationStatusPriority(a) - getApplicationStatusPriority(b)
    if (statusPriorityDiff !== 0) return statusPriorityDiff

    const dateA = getApplicationRecencyTimestamp(a)
    const dateB = getApplicationRecencyTimestamp(b)
    if (dateA !== dateB) return dateB - dateA

    const idA = Number(a?.id) || 0
    const idB = Number(b?.id) || 0
    if (idB !== idA) return idB - idA

    const variantA = a?.application_row_variant === 'recalled' ? 1 : 0
    const variantB = b?.application_row_variant === 'recalled' ? 1 : 0
    if (variantA !== variantB) return variantA - variantB

    return 0
  }

  function getApplicationRecencyTimestamp(app) {
    const candidateDates = [
      app?.created_at,
      app?.createdAt,
      app?.submitted_at,
      app?.submittedAt,
      app?.filed_at,
      app?.filedAt,
      app?.dateFiled,
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

  function getConfirmActionTitle(type) {
    if (type === 'approve') return 'Approve'
    if (type === 'cancel') return 'Cancel'
    return 'Disapprove'
  }

  function getConfirmActionMessage(type) {
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
    if (!application) return

    calendarPreviewApp.value = application

    const previewDates = getApplicationCalendarDates(application)
    const anchorDate = previewDates[0] || normalizeIsoDate(application?.dateFiled) || normalizeIsoDate(new Date())

    calendarPreviewModel.value = []
    clearCalendarPreviewWarning()
    setCalendarPreviewMonth(anchorDate)

    calendarPreviewKey.value += 1
    showCalendarPreviewDialog.value = true
  }

  function openDetails(app) {
    selectedApp.value = app
    showTimelineDialog.value = false
    showDetailsDialog.value = true
  }

  function openTimeline(app) {
    selectedApp.value = app
    showDetailsDialog.value = false
    showTimelineDialog.value = true
  }

  function hasMobileApplicationActions(app) {
    return app?.rawStatus === 'PENDING_ADMIN' || app?.rawStatus === 'PENDING_HR'
  }

  function resolveApplicationAttachmentReference(app) {
    const directReference = String(
      app?.attachment_reference ??
      app?.attachmentReference ??
      '',
    ).trim()

    if (directReference) return directReference

    const rawReference = String(
      app?.raw?.attachment_reference ??
      app?.raw?.attachmentReference ??
      '',
    ).trim()

    return rawReference || ''
  }

  function hasApplicationAttachment(app) {
    if (!app || typeof app !== 'object') return false
    if (resolveApplicationAttachmentReference(app)) return true

    const submittedFlag =
      app?.attachment_submitted ??
      app?.attachmentSubmitted
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
    openTimeline(row)
  }

  function openActionConfirm(type, target) {
    confirmActionType.value = type
    confirmActionTarget.value = target
    showConfirmActionDialog.value = true
  }

  function confirmPendingAction() {
    const target = confirmActionTarget.value
    const type = confirmActionType.value
    showConfirmActionDialog.value = false

    if (type === 'approve') {
      handleApprove(target)
      return
    }

    openDisapprove(target, type === 'cancel' ? 'cancel' : 'disapprove')
  }

  async function printApplication(app) {
    if (!canPrintApplication(app)) return
    const cocApplication = isCocApplication(app)
    const targetApplicationId = String(
      app?.id ??
      app?.application_id ??
      app?.leave_application_id ??
      '',
    ).trim()

    const openApplicationPdf = async (application) => {
      if (cocApplication) {
        await generateCocApplicationPdf(application)
        return
      }

      await generateLeaveFormPdf(application)
    }

    try {
      const [dashboardResponse, leaveApplicationsResponse] = await Promise.all([
        api.get('/admin/dashboard'),
        cocApplication ? Promise.resolve(null) : api.get('/admin/leave-applications').catch(() => null),
      ])

      const dashboardPayload = dashboardResponse?.data
      const updatedApplications = mergeApplications(extractApplicationsFromPayload(dashboardPayload))
      const updated = updatedApplications.find(
        (item) => getApplicationRowKey(item) === getApplicationRowKey(app),
      )
      let printableApplication = updated || app

      if (!cocApplication && targetApplicationId !== '' && leaveApplicationsResponse?.data) {
        const detailedLeaveApplications = extractApplicationsFromPayload(leaveApplicationsResponse.data)
        const detailedLeaveApplication = detailedLeaveApplications.find((item) => {
          const itemId = String(
            item?.id ??
            item?.application_id ??
            item?.leave_application_id ??
            '',
          ).trim()
          return itemId !== '' && itemId === targetApplicationId
        })

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

      await openApplicationPdf(printableApplication)
    } catch {
      await openApplicationPdf(app)
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

    const searchText = statusSearch.value.trim()
    const title = searchText
      ? `Applications Report (Filtered: ${searchText})`
      : 'Applications Report (All)'

    const printedAt = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })

    const tableBody = [
      [
        { text: 'Employee', style: 'tableHeader' },
        { text: 'Leave Type', style: 'tableHeader' },
        { text: 'Date Filed', style: 'tableHeader' },
        { text: 'Inclusive Dates', style: 'tableHeader' },
        { text: 'Duration', style: 'tableHeader' },
        { text: 'Status', style: 'tableHeader' },
        { text: 'Processed By', style: 'tableHeader' },
        { text: 'Reviewed Date', style: 'tableHeader' },
      ],
      ...rowsToPrint.map((app) => [
        `${app.employeeName || ''}${app.employee_control_no ? `\n${app.employee_control_no}` : ''}`,
        app.is_monetization ? `${app.leaveType || 'N/A'} (Monetization)` : app.leaveType || 'N/A',
        formatDate(app.dateFiled) || 'N/A',
        getApplicationInclusiveDateLines(app).join('\n'),
        getApplicationDurationDisplay(app),
        getApplicationStatusLabel(app),
        resolveProcessedBy(app),
        formatReviewedDate(app),
      ]),
    ]

    const docDefinition = {
      pageOrientation: 'landscape',
      pageSize: 'A4',
      pageMargins: [24, 24, 24, 24],
      content: [
        { text: title, style: 'title' },
        { text: `Printed: ${printedAt}`, style: 'meta' },
        {
          text: `Total Applications: ${rowsToPrint.length}`,
          style: 'meta',
          margin: [0, 0, 0, 10],
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*', 72, 125, 38, 68, 100, 82],
            body: tableBody,
          },
          layout: {
            fillColor: (rowIndex) => (rowIndex === 0 ? '#ECEFF1' : null),
            hLineColor: () => '#CFD8DC',
            vLineColor: () => '#CFD8DC',
          },
        },
      ],
      styles: {
        title: { fontSize: 15, bold: true, color: '#263238', margin: [0, 0, 0, 4] },
        meta: { fontSize: 10, color: '#455A64', margin: [0, 0, 0, 2] },
        tableHeader: { bold: true, color: '#263238', fontSize: 10 },
      },
      defaultStyle: {
        fontSize: 9,
      },
    }

    pdfMake.createPdf(docDefinition).open()
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
        rawStatus: 'PENDING_HR',
        status: 'Pending HR',
      }
    }
    if (type === 'cancelled') {
      return {
        ...app,
        rawStatus: 'REJECTED',
        status: 'Cancelled',
        remarks: app.remarks || remarks.value,
      }
    }
    return {
      ...app,
      rawStatus: 'REJECTED',
      status: 'Rejected',
      remarks: app.remarks || remarks.value,
    }
  }

  function showPostActionDialog(type, id, fallbackApp = null) {
    const fallbackKey = fallbackApp ? getApplicationRowKey(fallbackApp) : ''
    const updated = fallbackKey
      ? applicationRows.value.find((app) => getApplicationRowKey(app) === fallbackKey)
      : applicationRows.value.find((app) => Number(app.id) === Number(id))
    actionResultApp.value = updated || mapStatusAfterAction(fallbackApp, type)
    actionResultType.value = type
    showActionResultDialog.value = true
  }

  function printActionResult() {
    if (!actionResultApp.value) return
    printApplication(actionResultApp.value)
  }

  async function handleApprove(target) {
    const app = resolveApp(target)
    const id = app?.id ?? target
    const isCoc = isCocApplication(app)
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
          : 'Leave application approved and forwarded to HR!',
        position: 'top',
      })
      showDetailsDialog.value = false
      await fetchApplications()
      showPostActionDialog('approved', id, app)
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
            ? 'COC application rejected with remarks'
            : 'Leave application rejected with remarks'
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
    remarks,
    actionResultType,
    actionResultApp,
    openApplyLeaveDialog,
    closeApplyLeaveDialog,
    handleApplyLeaveSubmitted,
    printApplicationsPdf,
    handleApplicationRowClick,
    getLeaveBalanceTextItems,
    getCurrentLeaveBalanceDisplay,
    getApplicationDurationDisplay,
    getApplicationInclusiveDateColumnLines,
    getApplicationInclusiveDateLines,
    getSelectedDateIndicatorRows,
    formatDate,
    getApplicationStatusColor,
    getApplicationStatusLabel,
    openDetails,
    openCalendarPreview,
    onCalendarPreviewNavigation,
    handleCalendarPreviewModelUpdate,
    handleCalendarPreviewSurfacePointerDown,
    handleCalendarPreviewSurfaceClick,
    syncCalendarPreviewDecorations,
    canPrintApplication,
    printApplication,
    hasMobileApplicationActions,
    hasApplicationAttachment,
    viewApplicationAttachment,
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
  }
}


