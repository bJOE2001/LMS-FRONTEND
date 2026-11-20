<template>
  <q-page class="q-pa-sm hr-dashboard-page">
    <div class="row justify-between items-center q-col-gutter-sm q-mb-sm">
      <div class="col-auto">
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-none">Dashboard</h1>
      </div>
      <div class="col-12 col-sm-auto">
        <HeaderDateRangePicker
          v-model:start-date="kpiStartDate"
          v-model:end-date="kpiEndDate"
          :clearable="false"
        />
      </div>
    </div>

    <KpiCardsSkeleton
      v-if="loading && !hasLoadedOnce"
      :count="5"
      variant="dashboard"
      :has-first-card-breakdown="true"
      row-class="row q-col-gutter-sm q-mb-sm stat-cards-row"
      col-class="col-12 col-sm-6 col-md stat-card-col"
    />

    <ApplicationKpiCards
      v-else
      :total-count="kpiCardMetrics.total_count"
      :breakdown-cards="totalApplicationBreakdownCards"
      :status-cards="statusKpiCards"
      :reloading="loading && hasLoadedOnce"
      @select="goToApplications"
    />

    <div class="row q-col-gutter-sm q-mb-sm">
      <div class="col-12 col-md-6 dashboard-panel-col">
        <HrManpowerPieChart
          class="compact-panel"
          :loading="loading"
          :current-date-label="manpowerCurrentDateLabel"
          :active-employee-count="activeEmployeeCount"
          :snapshot="manpowerCurrentSnapshot"
        />
      </div>
      <div class="col-12 col-md-6 dashboard-panel-col">
        <HrCalendarPanel class="compact-panel" />
      </div>
    </div>

    <div class="row q-col-gutter-sm q-mb-none">
      <div class="col-12 col-md-6">
        <HrLeaveTrendAreaChart
          class="compact-panel"
          :loading="loading"
          :applications="dashboardApplications"
          :analytics="dashboardData.analytics"
          :trend-year-label="trendYearLabel"
        />
      </div>

      <div class="col-12 col-md-6">
        <HrLeaveTypeLineChart
          class="compact-panel"
          :loading="loading"
          :applications="dashboardApplications"
          :analytics="dashboardData.analytics"
          :trend-year-label="trendYearLabel"
        />
      </div>
    </div>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useHrDashboardStore } from 'stores/hr-dashboard-store'
import { useAuthStore } from 'stores/auth-store'
import { useNotificationStore } from 'stores/notification-store'
import HrCalendarPanel from 'components/hr/HrCalendarPanel.vue'
import HeaderDateRangePicker from 'src/components/common/HeaderDateRangePicker.vue'
import ApplicationKpiCards from 'src/components/common/ApplicationKpiCards.vue'
import HrManpowerPieChart from 'components/charts/HrManpowerPieChart.vue'
import HrLeaveTrendAreaChart from 'components/charts/HrLeaveTrendAreaChart.vue'
import HrLeaveTypeLineChart from 'components/charts/HrLeaveTypeLineChart.vue'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const notifStore = useNotificationStore()
const hrDashboardStore = useHrDashboardStore()
const PENDING_REMINDER_SESSION_PREFIX = 'lms_pending_reminder_seen:'

function emptyEmploymentBreakdown() {
  return {
    elective: 0,
    co_terminous: 0,
    regular: 0,
    casual: 0,
  }
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

function normalizeEmploymentBreakdown(source) {
  const breakdown = emptyEmploymentBreakdown()

  for (const [key, value] of Object.entries(source ?? {})) {
    const normalizedKey = normalizeEmploymentTypeKey(key)
    if (!normalizedKey) continue
    breakdown[normalizedKey] = Number(value || 0)
  }

  return breakdown
}

function emptyDashboardAnalytics() {
  return {
    trend_year: new Date().getFullYear(),
    monthly_leave_trend: Array.from({ length: 12 }, () => 0),
    leave_type_monthly_trend: {},
  }
}

function normalizeTrendBuckets(value) {
  return Array.from({ length: 12 }, (_unused, index) => {
    const parsed = Number(value?.[index] ?? 0)
    if (!Number.isFinite(parsed) || parsed <= 0) return 0
    return Math.round(parsed)
  })
}

function normalizeLeaveTypeMonthlyTrend(value) {
  if (!value || typeof value !== 'object') return {}

  return Object.entries(value).reduce((result, [rawLeaveType, buckets]) => {
    const normalizedLeaveType = String(rawLeaveType || '').trim() || 'Unknown'
    result[normalizedLeaveType] = normalizeTrendBuckets(buckets)
    return result
  }, {})
}

function normalizeDashboardAnalytics(value) {
  if (!value || typeof value !== 'object') return emptyDashboardAnalytics()

  const trendYear = Number(value.trend_year)
  return {
    trend_year:
      Number.isFinite(trendYear) && trendYear >= 2000
        ? Math.round(trendYear)
        : new Date().getFullYear(),
    monthly_leave_trend: normalizeTrendBuckets(value.monthly_leave_trend),
    leave_type_monthly_trend: normalizeLeaveTypeMonthlyTrend(value.leave_type_monthly_trend),
  }
}

function getApplicationEmploymentTypeKey(application) {
  const candidates = [
    application?.employment_status,
    application?.employmentStatus,
    application?.appointment_status,
    application?.appointmentStatus,
    application?.employee_status,
    application?.employeeStatus,
    application?.status_type,
    application?.statusType,
    application?.employee?.status,
    application?.employee?.employment_status,
    application?.employee?.employmentStatus,
    application?.user?.status,
    application?.user?.employment_status,
    application?.user?.employmentStatus,
  ]

  for (const candidate of candidates) {
    const normalizedKey = normalizeEmploymentTypeKey(candidate)
    if (normalizedKey) return normalizedKey
  }

  return ''
}

function buildEmploymentBreakdown(applications) {
  const breakdown = emptyEmploymentBreakdown()

  for (const application of applications) {
    const normalizedKey = getApplicationEmploymentTypeKey(application)
    if (!normalizedKey) continue
    breakdown[normalizedKey] += 1
  }

  return breakdown
}

const loading = ref(!hrDashboardStore.dashboardLoaded)
const hasLoadedOnce = ref(hrDashboardStore.dashboardLoaded)
const kpiStartDate = ref('')
const kpiEndDate = ref('')
const dashboardData = ref({
  total_count: 0,
  pending_count: 0,
  approved_count: 0,
  rejected_count: 0,
  recalled_count: 0,
  analytics: null,
  kpi_breakdown: {
    total: emptyEmploymentBreakdown(),
  },
})
const dashboardApplications = ref([])
const activeEmployeeCount = ref(0)
const manpowerToday = ref(null)
const trendYearLabel = computed(() => {
  const parsed = Number(dashboardData.value.analytics?.trend_year)
  if (!Number.isFinite(parsed) || parsed < 2000) return new Date().getFullYear()
  return Math.round(parsed)
})

function pendingReminderNotificationId() {
  return `local-pending-reminder-hr:${authStore.user?.id ?? 'unknown'}`
}

function pendingReminderSessionKey() {
  return `${PENDING_REMINDER_SESSION_PREFIX}hr:${authStore.user?.id ?? 'unknown'}`
}

function hasSeenPendingReminderDialog() {
  if (typeof sessionStorage === 'undefined') return false
  return sessionStorage.getItem(pendingReminderSessionKey()) === '1'
}

function markPendingReminderDialogSeen() {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(pendingReminderSessionKey(), '1')
}

function showPendingReminderDialog(pendingCount) {
  const noun = pendingCount === 1 ? 'application' : 'applications'

  $q.dialog({
    class: 'pending-reminder-card',
    title: 'Pending Applications',
    message: `You have ${pendingCount} pending ${noun} that need review and approval.`,
    cancel: {
      label: 'Later',
      flat: true,
      color: 'grey-7',
      class: 'pending-reminder-card__button',
    },
    ok: {
      label: 'Review',
      unelevated: true,
      color: 'primary',
      class: 'pending-reminder-card__button',
    },
    persistent: true,
  })
    .onOk(() => {
      markPendingReminderDialogSeen()
      goToApplications('pending')
    })
    .onCancel(() => {
      markPendingReminderDialogSeen()
    })
}

function syncPendingReminderNotification(pendingCount) {
  const id = pendingReminderNotificationId()
  if (pendingCount <= 0) {
    notifStore.removeLocalNotification(id)
    return
  }

  const noun = pendingCount === 1 ? 'application' : 'applications'
  notifStore.upsertLocalNotification({
    id,
    type: 'reminder',
    title: 'Pending Applications',
    message: `You have ${pendingCount} pending ${noun} that need review and approval.`,
    action_route: {
      name: 'hr-applications',
      query: { status: 'pending' },
    },
  })
}

function mergeStatus(app) {
  if (isCancelledApplication(app)) return 'Cancelled'

  const raw = String(app.rawStatus || '').toUpperCase()
  const status = String(app.status || '').toUpperCase()

  if (raw.includes('PENDING') || status.includes('PENDING')) return 'Pending'
  if (raw.includes('APPROVED') || status.includes('APPROVED')) return 'Approved'
  if (raw.includes('RECALLED') || status.includes('RECALLED')) return 'Recalled'
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

function isCancelledApplication(app) {
  const explicitCancelled = app?.cancelled
  if (explicitCancelled === true || explicitCancelled === 1) return true
  if (typeof explicitCancelled === 'string') {
    const normalized = explicitCancelled.trim().toLowerCase()
    if (normalized === '1' || normalized === 'true' || normalized === 'yes') return true
  }

  if (app?.cancelled_at || app?.cancelled_by) return true

  const statusCandidates = [app?.status, app?.displayStatus]
  if (statusCandidates.some((value) => /\bcancelled\b/i.test(String(value || '').trim()))) {
    return true
  }

  const remarksCandidates = [app?.remarks, app?.cancellation_reason, app?.rejection_reason]
  return remarksCandidates.some((value) => /^cancelled\b/i.test(String(value || '').trim()))
}

function toIsoDate(value) {
  const rawValue = String(value || '').trim()
  if (!rawValue) return ''

  const matched = rawValue.match(/^(\d{4}-\d{2}-\d{2})/)
  if (matched) return matched[1]

  const parsedDate = new Date(rawValue)
  if (Number.isNaN(parsedDate.getTime())) return ''
  const year = parsedDate.getFullYear()
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
  const day = String(parsedDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getCurrentIsoDate() {
  return toIsoDate(new Date())
}

function resolveKpiDateRange(value) {
  if (typeof value === 'string') {
    const normalizedDate = toIsoDate(value)
    if (normalizedDate) return { from: normalizedDate, to: normalizedDate }
  }

  const fromDate = toIsoDate(value?.from ?? value?.to)
  const toDate = toIsoDate(value?.to ?? value?.from)
  const today = getCurrentIsoDate()
  const resolvedFrom = fromDate || toDate || today
  const resolvedTo = toDate || fromDate || today

  return resolvedFrom <= resolvedTo
    ? { from: resolvedFrom, to: resolvedTo }
    : { from: resolvedTo, to: resolvedFrom }
}

function getApplicationKpiDateIso(application) {
  const candidates = [
    application?.dateFiled,
    application?.date_filed,
    application?.filed_at,
    application?.filedAt,
    application?.submitted_at,
    application?.created_at,
    application?.createdAt,
    application?.startDate,
    application?.start_date,
  ]

  for (const candidate of candidates) {
    const normalizedDate = toIsoDate(candidate)
    if (normalizedDate) return normalizedDate
  }

  return ''
}

function enumerateDateRange(startDateValue, endDateValue) {
  const startDate = toIsoDate(startDateValue)
  const endDate = toIsoDate(endDateValue)
  if (!startDate || !endDate) return []

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return []

  const first = start <= end ? start : end
  const last = start <= end ? end : start
  const dates = []

  for (let cursor = new Date(first); cursor <= last; cursor.setDate(cursor.getDate() + 1)) {
    const year = cursor.getFullYear()
    const month = String(cursor.getMonth() + 1).padStart(2, '0')
    const day = String(cursor.getDate()).padStart(2, '0')
    dates.push(`${year}-${month}-${day}`)
  }

  return dates
}

function getApplicationLeaveDates(application) {
  if (application?.is_monetization) return []

  if (Array.isArray(application?.selected_dates) && application.selected_dates.length) {
    return [...new Set(application.selected_dates.map((date) => toIsoDate(date)).filter(Boolean))]
  }

  const startDate = application?.startDate ?? application?.start_date
  const endDate = application?.endDate ?? application?.end_date ?? startDate
  return enumerateDateRange(startDate, endDate)
}

function getEmployeeKey(application) {
  const key =
    application?.employee_control_no ??
    application?.employeeControlNo ??
    application?.user_id ??
    application?.employeeName
  return String(key || '').trim()
}

const normalizedKpiDateRange = computed(() =>
  resolveKpiDateRange({ from: kpiStartDate.value, to: kpiEndDate.value }),
)

const kpiFilteredApplications = computed(() => {
  const range = normalizedKpiDateRange.value

  return dashboardApplications.value.filter((application) => {
    const applicationDate = getApplicationKpiDateIso(application)
    if (!applicationDate) return false
    return applicationDate >= range.from && applicationDate <= range.to
  })
})

const kpiCardMetrics = computed(() => {
  const filteredApplications = kpiFilteredApplications.value.filter(
    (application) => !isCancelledApplication(application),
  )

  let pendingCount = 0
  let approvedCount = 0
  let rejectedCount = 0
  let recalledCount = 0

  for (const application of filteredApplications) {
    const mergedStatus = mergeStatus(application)
    if (mergedStatus === 'Pending') {
      pendingCount += 1
      continue
    }

    if (mergedStatus === 'Approved') {
      approvedCount += 1
      continue
    }

    if (mergedStatus === 'Disapproved') {
      rejectedCount += 1
      continue
    }

    if (mergedStatus === 'Recalled') {
      recalledCount += 1
    }
  }

  return {
    total_count: filteredApplications.length,
    pending_count: pendingCount,
    approved_count: approvedCount,
    rejected_count: rejectedCount,
    recalled_count: recalledCount,
  }
})

const manpowerCurrentDateIso = computed(() => {
  return getCurrentIsoDate()
})

const manpowerCurrentDateLabel = computed(() => {
  const parsedDate = new Date(`${manpowerCurrentDateIso.value}T00:00:00`)
  return parsedDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
})

const manpowerCurrentSnapshot = computed(() => {
  const apiManpower = manpowerToday.value
  if (apiManpower && typeof apiManpower === 'object') {
    const totalActive = Math.max(Number(apiManpower.total_active ?? activeEmployeeCount.value ?? 0), 0)
    const presentCount = Math.min(Math.max(Number(apiManpower.present_count || 0), 0), totalActive)
    const onLeaveCount = Math.min(
      Math.max(Number(apiManpower.on_leave_count || 0), 0),
      Math.max(totalActive - presentCount, 0),
    )
    const absentCount = Math.max(
      Number(apiManpower.absent_count ?? totalActive - presentCount - onLeaveCount),
      0,
    )
    const toPct = (count) => (totalActive ? Number(((count / totalActive) * 100).toFixed(2)) : 0)

    return {
      totalActive,
      presentCount,
      absentCount,
      onLeaveCount,
      presentPercentage: Number(apiManpower.present_percentage ?? toPct(presentCount)),
      absentPercentage: Number(apiManpower.absent_percentage ?? toPct(absentCount)),
      onLeavePercentage: Number(apiManpower.on_leave_percentage ?? toPct(onLeaveCount)),
    }
  }

  const todayIsoDate = manpowerCurrentDateIso.value
  const onLeaveEmployeeKeys = new Set()

  for (const application of dashboardApplications.value) {
    if (mergeStatus(application) !== 'Approved') continue

    const employeeKey = getEmployeeKey(application)
    if (!employeeKey) continue

    const leaveDates = getApplicationLeaveDates(application)
    if (leaveDates.includes(todayIsoDate)) onLeaveEmployeeKeys.add(employeeKey)
  }

  const totalActive = Math.max(Number(activeEmployeeCount.value || 0), 0)
  const presentCount = 0
  const onLeaveCount = Math.min(onLeaveEmployeeKeys.size, totalActive)
  const absentCount = Math.max(totalActive - presentCount - onLeaveCount, 0)
  const toPct = (count) => (totalActive ? Number(((count / totalActive) * 100).toFixed(2)) : 0)

  return {
    totalActive,
    presentCount,
    absentCount,
    onLeaveCount,
    presentPercentage: toPct(presentCount),
    absentPercentage: toPct(absentCount),
    onLeavePercentage: toPct(onLeaveCount),
  }
})

const totalApplicationsBreakdown = computed(() => {
  const filteredBreakdown = buildEmploymentBreakdown(kpiFilteredApplications.value)
  if (Object.values(filteredBreakdown).some((value) => value > 0)) return filteredBreakdown

  if (kpiCardMetrics.value.total_count === 0) {
    return emptyEmploymentBreakdown()
  }

  const apiBreakdown = normalizeEmploymentBreakdown(dashboardData.value.kpi_breakdown?.total)
  if (Object.values(apiBreakdown).some((value) => value > 0)) return apiBreakdown
  return filteredBreakdown
})

const EMPLOYMENT_TYPE_BREAKDOWN_CARDS = [
  { key: 'elective', label: 'Elective', accent: '#8e24aa', bg: '#f3e5f5' },
  { key: 'co_terminous', label: 'Co-term', accent: '#0277bd', bg: '#e1f5fe' },
  { key: 'regular', label: 'Regular', accent: '#2e7d32', bg: '#e8f5e9' },
  { key: 'casual', label: 'Casual', accent: '#e65100', bg: '#fff3e0' },
]

const totalApplicationBreakdownCards = computed(() =>
  EMPLOYMENT_TYPE_BREAKDOWN_CARDS.map((card) => ({
    ...card,
    value: totalApplicationsBreakdown.value[card.key] ?? 0,
  })),
)

const statusKpiCards = computed(() => {
  const total = Math.max(Number(kpiCardMetrics.value.total_count || 0), 0)
  const shareOfTotal = (count) => (total > 0 ? Math.round((count / total) * 100) : 0)

  return [
    {
      key: 'pending',
      routeStatus: 'pending',
      label: 'Pending Review',
      icon: 'schedule',
      value: kpiCardMetrics.value.pending_count,
      share: shareOfTotal(kpiCardMetrics.value.pending_count),
      hint: kpiCardMetrics.value.pending_count > 5 ? 'High queue' : 'Awaiting action',
      isUrgent: kpiCardMetrics.value.pending_count > 5,
      variant: 'amber',
    },
    {
      key: 'approved',
      routeStatus: 'approved',
      label: 'Approved',
      icon: 'check_circle',
      value: kpiCardMetrics.value.approved_count,
      share: shareOfTotal(kpiCardMetrics.value.approved_count),
      hint: 'Cleared & finalized',
      isUrgent: false,
      variant: 'green',
    },
    {
      key: 'rejected',
      routeStatus: 'rejected',
      label: 'Disapproved',
      icon: 'cancel',
      value: kpiCardMetrics.value.rejected_count,
      share: shareOfTotal(kpiCardMetrics.value.rejected_count),
      hint: 'Declined',
      isUrgent: false,
      variant: 'red',
    },
    {
      key: 'recalled',
      routeStatus: 'recalled',
      label: 'Recalled',
      icon: 'history',
      value: kpiCardMetrics.value.recalled_count,
      share: shareOfTotal(kpiCardMetrics.value.recalled_count),
      hint: 'Withdrawn / returned',
      isUrgent: false,
      variant: 'slate',
    },
  ]
})

function resetKpiDateRangeToToday() {
  const today = getCurrentIsoDate()
  kpiStartDate.value = today
  kpiEndDate.value = today
}

function applyDashboardData(data) {
  const applications = Array.isArray(data?.applications) ? data.applications : []
  const visibleApplications = applications.filter((application) => !isCancelledApplication(application))
  dashboardApplications.value = visibleApplications

  activeEmployeeCount.value = Number(data?.active_employees || 0)
  manpowerToday.value = data?.manpower_today ?? null

  const pendingFromApps = visibleApplications.filter((app) => mergeStatus(app) === 'Pending').length
  const approvedFromApps = visibleApplications.filter((app) => mergeStatus(app) === 'Approved').length
  const rejectedFromApps = visibleApplications.filter((app) => mergeStatus(app) === 'Disapproved').length
  const recalledFromApps = visibleApplications.filter((app) => mergeStatus(app) === 'Recalled').length

  dashboardData.value = {
    total_count: Number(data?.total_count ?? visibleApplications.length ?? 0),
    pending_count: Number(data?.pending_count ?? pendingFromApps),
    approved_count: Number(data?.approved_count ?? approvedFromApps),
    rejected_count: Number(data?.rejected_count ?? rejectedFromApps),
    recalled_count: Number(data?.recalled_count ?? recalledFromApps),
    analytics:
      data?.analytics && typeof data.analytics === 'object'
        ? normalizeDashboardAnalytics(data.analytics)
        : null,
    kpi_breakdown: data?.kpi_breakdown ?? {
      total: buildEmploymentBreakdown(visibleApplications),
    },
  }
}

async function fetchDashboard(force = false) {
  if (!force && hrDashboardStore.dashboardLoaded && hrDashboardStore.rawDashboardData !== null) {
    applyDashboardData(hrDashboardStore.rawDashboardData)
    hasLoadedOnce.value = true
    loading.value = false
    maybeShowPendingReminder()
    return
  }

  loading.value = true
  try {
    const data = await hrDashboardStore.fetchDashboard(force)
    applyDashboardData(data)
    maybeShowPendingReminder()
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load HR dashboard data right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    hasLoadedOnce.value = true
    loading.value = false
  }
}

function goToApplications(status, extraQuery = {}) {
  const query = { ...extraQuery }
  if (status && status !== 'total') {
    query.status = status
  }
  router.push({ path: '/hr/applications', query })
}

function maybeShowPendingReminder() {
  const pendingCount = Number(kpiCardMetrics.value.pending_count || 0)
  syncPendingReminderNotification(pendingCount)
  if (pendingCount <= 0) return
  if (hasSeenPendingReminderDialog()) return
  showPendingReminderDialog(pendingCount)
}

resetKpiDateRangeToToday()
if (hrDashboardStore.dashboardLoaded && hrDashboardStore.rawDashboardData !== null) {
  applyDashboardData(hrDashboardStore.rawDashboardData)
  hasLoadedOnce.value = true
  loading.value = false
}
onMounted(() => {
  void fetchDashboard()
})
</script>

<style scoped>
.hr-dashboard-page {
  min-height: auto !important;
  overflow-y: hidden;
}

.dashboard-panel-col {
  display: flex;
}

.dashboard-panel-col > * {
  width: 100%;
}

.compact-panel :deep(.q-card__section) {
  padding: 12px;
}

.pending-reminder-card {
  min-width: 360px;
  max-width: 480px;
  width: min(480px, calc(100vw - 32px));
  border-radius: 2px;
}

.pending-reminder-card__header {
  padding: 20px 24px 0;
}

.pending-reminder-card__title {
  font-weight: 700;
}

.pending-reminder-card__body {
  padding: 14px 24px 10px;
}

.pending-reminder-card__message {
  line-height: 1.5;
}

.pending-reminder-card__actions {
  gap: 10px;
  padding: 6px 24px 22px;
}

.pending-reminder-card__button {
  min-height: 44px;
  padding-inline: 18px;
}

@media (max-width: 599px) {
  .pending-reminder-card {
    min-width: 0;
    width: calc(100vw - 18px);
    max-width: calc(100vw - 18px);
    border-radius: 2px;
  }

  .pending-reminder-card__header {
    padding: 16px 18px 0;
  }

  .pending-reminder-card__icon {
    font-size: 22px !important;
  }

  .pending-reminder-card__title {
    font-size: 1rem;
    line-height: 1.2;
  }

  .pending-reminder-card__body {
    padding: 12px 18px 8px;
  }

  .pending-reminder-card__message {
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .pending-reminder-card__actions {
    gap: 8px;
    padding: 2px 18px 16px;
  }

  .pending-reminder-card__button {
    min-height: 40px;
    padding-inline: 14px;
    font-size: 0.88rem;
  }

}
</style>
