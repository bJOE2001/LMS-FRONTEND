<template>
  <q-page class="q-pa-sm hr-dashboard-page">
    <div class="row justify-between items-center q-mb-sm">
      <div>
        <h1 class="text-h5 text-weight-bold q-mt-none q-mb-none">HR Dashboard</h1>
      </div>
    </div>

    <q-dialog v-model="showPendingReminderDialog" persistent class="pending-reminder-dialog">
      <q-card class="pending-reminder-card">
        <q-card-section class="row items-center q-pb-none pending-reminder-card__header">
          <q-icon
            name="pending_actions"
            color="warning"
            size="28px"
            class="q-mr-sm pending-reminder-card__icon"
          />
          <div class="text-h6 pending-reminder-card__title">Pending Applications</div>
        </q-card-section>
        <q-card-section class="pending-reminder-card__body">
          <div class="text-body2 text-grey-8 pending-reminder-card__message">
            You have
            <span class="text-weight-bold">{{ dashboardData.pending_count }}</span>
            pending application(s) that need review and approval.
          </div>
        </q-card-section>
        <q-card-actions align="right" class="pending-reminder-card__actions">
          <q-btn
            flat
            color="grey-7"
            label="Later"
            class="pending-reminder-card__button"
            v-close-popup
          />
          <q-btn
            unelevated
            color="warning"
            label="Review Now"
            class="pending-reminder-card__button"
            @click="reviewPendingApplications"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <div class="row q-col-gutter-sm q-mb-sm stat-cards-row">
      <div class="col-12 col-sm-6 col-md stat-card-col">
        <q-card class="stat-card stat-card--applications bg-white rounded-borders" flat elevation="1" @click="goToApplications('total')">
          <q-card-section class="stat-card-content">
            <div class="stat-card-main">
              <div class="stat-card-left">
                <div class="row items-center no-wrap q-gutter-xs">
                  <q-icon name="description" size="28px" color="grey" class="stat-card-icon" />
                </div>
                <div class="text-caption text-weight-medium q-mt-sm">Applications</div>
              </div>
              <div class="stat-value text-primary">
                <q-spinner v-if="loading" size="32px" color="primary" />
                <template v-else>{{ dashboardData.total_count }}</template>
              </div>
            </div>
            <div class="stat-breakdown">
              <div
                v-for="card in totalApplicationBreakdownCards"
                :key="card.key"
                class="stat-mini-card"
                :style="getEmploymentTypeCardStyle(card)"
              >
                <span class="stat-mini-label">{{ card.label }}</span>
                <span class="stat-mini-value">{{ loading ? '-' : card.value }}</span>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md stat-card-col">
        <q-card class="stat-card stat-card--compact bg-white rounded-borders" flat elevation="1" @click="goToApplications('pending')">
          <q-card-section class="stat-card-content">
            <div class="stat-card-main">
              <div class="stat-card-left">
                <div class="row items-center no-wrap q-gutter-xs">
                  <q-icon name="schedule" size="28px" color="warning" class="stat-card-icon" />
                  <q-icon v-if="dashboardData.pending_count > 5" name="warning" size="18px" color="warning" class="stat-card-alert-icon" />
                </div>
                <div class="text-caption text-weight-medium q-mt-sm">Pending Applications</div>
              </div>
              <div class="stat-value text-warning">
                <q-spinner v-if="loading" size="32px" color="warning" />
                <template v-else>{{ dashboardData.pending_count }}</template>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md stat-card-col">
        <q-card class="stat-card stat-card--compact bg-white rounded-borders" flat elevation="1" @click="goToApplications('approved')">
          <q-card-section class="stat-card-content">
            <div class="stat-card-main">
              <div class="stat-card-left">
                <div class="row items-center no-wrap q-gutter-xs">
                  <q-icon name="check_circle" size="28px" color="primary" class="stat-card-icon" />
                </div>
                <div class="text-caption text-weight-medium q-mt-sm">Total Approved</div>
              </div>
              <div class="stat-value text-primary">
                <q-spinner v-if="loading" size="32px" color="primary" />
                <template v-else>{{ dashboardData.approved_count }}</template>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md stat-card-col">
        <q-card class="stat-card stat-card--compact bg-white rounded-borders" flat elevation="1" @click="goToApplications('rejected')">
          <q-card-section class="stat-card-content">
            <div class="stat-card-main">
              <div class="stat-card-left">
                <div class="row items-center no-wrap q-gutter-xs">
                  <q-icon name="cancel" size="28px" color="negative" class="stat-card-icon" />
                </div>
                <div class="text-caption text-weight-medium q-mt-sm">Rejected Applications</div>
              </div>
              <div class="stat-value text-negative">
                <q-spinner v-if="loading" size="32px" color="negative" />
                <template v-else>{{ dashboardData.rejected_count }}</template>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md stat-card-col">
        <q-card class="stat-card stat-card--compact bg-white rounded-borders" flat elevation="1" @click="goToApplications('recalled')">
          <q-card-section class="stat-card-content">
            <div class="stat-card-main">
              <div class="stat-card-left">
                <div class="row items-center no-wrap q-gutter-xs">
                  <q-icon name="history" size="28px" color="blue-grey-7" class="stat-card-icon" />
                </div>
                <div class="text-caption text-weight-medium q-mt-sm">Recalled Applications</div>
              </div>
              <div class="stat-value text-blue-grey-7">
                <q-spinner v-if="loading" size="32px" color="blue-grey-7" />
                <template v-else>{{ dashboardData.recalled_count }}</template>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

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

    <div class="row q-col-gutter-sm q-mt-sm">
      <div class="col-12 dashboard-panel-col">
        <DepartmentStatistics class="compact-panel full-width department-stats-panel" />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { api } from 'src/boot/axios'
import { useAuthStore } from 'stores/auth-store'
import { useNotificationStore } from 'stores/notification-store'
import HrCalendarPanel from 'components/hr/HrCalendarPanel.vue'
import HrManpowerPieChart from 'components/charts/HrManpowerPieChart.vue'
import HrLeaveTrendAreaChart from 'components/charts/HrLeaveTrendAreaChart.vue'
import HrLeaveTypeLineChart from 'components/charts/HrLeaveTypeLineChart.vue'
import DepartmentStatistics from 'components/charts/departmentStatistics.vue'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const notifStore = useNotificationStore()

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
  if (normalized.includes('CO-TER') || normalized.includes('CO-TERM') || normalized.includes('COTER')) return 'co_terminous'
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

const loading = ref(true)
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
const showPendingReminderDialog = ref(false)
const trendYearLabel = computed(() => {
  const parsed = Number(dashboardData.value.analytics?.trend_year)
  if (!Number.isFinite(parsed) || parsed < 2000) return new Date().getFullYear()
  return Math.round(parsed)
})

function pendingReminderSeenSessionKey() {
  return `lms_pending_reminder_seen:hr:${authStore.user?.id ?? 'unknown'}`
}

function pendingReminderNotificationId() {
  return `local-pending-reminder-hr:${authStore.user?.id ?? 'unknown'}`
}

function hasSeenPendingReminderThisLogin() {
  if (typeof sessionStorage === 'undefined') return false
  const token = authStore.getToken?.()
  if (!token) return false
  return sessionStorage.getItem(pendingReminderSeenSessionKey()) === token
}

function markPendingReminderSeenThisLogin() {
  if (typeof sessionStorage === 'undefined') return
  const token = authStore.getToken?.()
  if (!token) return
  sessionStorage.setItem(pendingReminderSeenSessionKey(), token)
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
  })
}

function mergeStatus(app) {
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
    return 'Rejected'
  }

  return app.status || ''
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
  const key = application?.employee_control_no ?? application?.employeeControlNo ?? application?.user_id ?? application?.employeeName
  return String(key || '').trim()
}

const manpowerCurrentDateIso = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
  const onLeaveCount = Math.min(onLeaveEmployeeKeys.size, totalActive)
  const availableCount = Math.max(totalActive - onLeaveCount, 0)
  const availablePercentage = totalActive ? Number(((availableCount / totalActive) * 100).toFixed(2)) : 0
  const onLeavePercentage = totalActive ? Number(((onLeaveCount / totalActive) * 100).toFixed(2)) : 0

  return {
    totalActive,
    availableCount,
    onLeaveCount,
    availablePercentage,
    onLeavePercentage,
  }
})

const totalApplicationsBreakdown = computed(() => {
  const apiBreakdown = normalizeEmploymentBreakdown(dashboardData.value.kpi_breakdown?.total)
  if (Object.values(apiBreakdown).some((value) => value > 0)) return apiBreakdown
  return buildEmploymentBreakdown(dashboardApplications.value)
})

const EMPLOYMENT_TYPE_BREAKDOWN_CARDS = [
  { key: 'elective', label: 'Elective', accent: '#8e24aa', bg: '#f3e5f5' },
  { key: 'co_terminous', label: 'Co-term', accent: '#0277bd', bg: '#e1f5fe' },
  { key: 'regular', label: 'Regular', accent: '#2e7d32', bg: '#e8f5e9' },
  { key: 'casual', label: 'Casual', accent: '#e65100', bg: '#fff3e0' },
]

const totalApplicationBreakdownCards = computed(() => EMPLOYMENT_TYPE_BREAKDOWN_CARDS.map((card) => ({
  ...card,
  value: totalApplicationsBreakdown.value[card.key] ?? 0,
})))

function getEmploymentTypeCardStyle(card) {
  return {
    '--stat-mini-card-accent': card.accent,
    '--stat-mini-card-hover-bg': card.bg,
  }
}

async function fetchDashboard() {
  loading.value = true
  try {
    const { data } = await api.get('/hr/dashboard')
    const applications = Array.isArray(data.applications) ? data.applications : []
    dashboardApplications.value = applications

    activeEmployeeCount.value = Number(data?.active_employees || 0)

    const pendingFromApps = applications.filter((app) => mergeStatus(app) === 'Pending').length
    const approvedFromApps = applications.filter((app) => mergeStatus(app) === 'Approved').length
    const rejectedFromApps = applications.filter((app) => mergeStatus(app) === 'Rejected').length
    const recalledFromApps = applications.filter((app) => mergeStatus(app) === 'Recalled').length

    dashboardData.value = {
      total_count: Number(data.total_count ?? applications.length ?? 0),
      pending_count: Number(data.pending_count ?? pendingFromApps),
      approved_count: Number(data.approved_count ?? approvedFromApps),
      rejected_count: Number(data.rejected_count ?? rejectedFromApps),
      recalled_count: Number(data.recalled_count ?? recalledFromApps),
      analytics:
        data?.analytics && typeof data.analytics === 'object'
          ? normalizeDashboardAnalytics(data.analytics)
          : null,
      kpi_breakdown: data?.kpi_breakdown ?? {
        total: buildEmploymentBreakdown(applications),
      },
    }

    maybeShowPendingReminder()
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load HR dashboard data right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
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
  const pendingCount = Number(dashboardData.value.pending_count || 0)
  syncPendingReminderNotification(pendingCount)

  if (pendingCount <= 0) {
    showPendingReminderDialog.value = false
    return
  }

  if (hasSeenPendingReminderThisLogin()) return

  showPendingReminderDialog.value = true
  markPendingReminderSeenThisLogin()
}

function reviewPendingApplications() {
  showPendingReminderDialog.value = false
  goToApplications('pending')
}

onMounted(fetchDashboard)
</script>

<style scoped>
.hr-dashboard-page {
  min-height: auto !important;
  overflow-y: hidden;
}

.stat-cards-row > div {
  display: flex;
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

.stat-card {
  width: 100%;
  height: 100%;
  min-height: 100px;
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.stat-card-content {
  height: 100%;
  padding: 10px 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.stat-card-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.stat-card-left {
  flex: 1 1 auto;
}

.stat-value {
  flex: 0 0 auto;
  align-self: flex-start;
  margin-top: 2px;
  min-width: 64px;
  text-align: right;
  font-size: clamp(1.8rem, 2.4vw, 2.2rem);
  font-weight: 500;
  line-height: 1;
}

.stat-breakdown {
  margin-top: 4px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.stat-mini-card {
  width: 100%;
  min-width: 0;
  padding: 4px 6px;
  border-radius: 7px;
  border: 1px solid #ebeff3;
  background: #f7f9fb;
  appearance: none;
  font: inherit;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  cursor: default;
}

.stat-mini-label {
  min-width: 0;
  font-size: 0.62rem;
  color: #9aa3ad;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-mini-value {
  flex: 0 0 auto;
  font-size: 0.72rem;
  color: #7f8b97;
  font-weight: 600;
}

.stat-card:hover {
  background-color: #f3faf3 !important;
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
}

.pending-reminder-card {
  min-width: 360px;
  max-width: 480px;
  width: min(480px, calc(100vw - 32px));
  border-radius: 18px;
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
    border-radius: 16px;
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

  .stat-cards-row {
    margin: 0 0 4px !important;
  }

  .stat-card-col {
    padding: 2px 0 0 !important;
  }

  .stat-card {
    min-height: 56px;
  }

  .stat-card--applications {
    min-height: 60px;
  }

  .stat-card--compact {
    min-height: 44px;
  }

  .stat-card-content {
    padding: 6px 9px 5px;
    gap: 2px;
  }

  .stat-card--compact .stat-card-content {
    padding-top: 5px;
    padding-bottom: 4px;
  }

  .stat-card-main {
    align-items: center;
    gap: 8px;
  }

  .stat-card-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .stat-card-left > .row {
    flex: 0 0 auto;
  }

  .stat-card-icon {
    font-size: 18px !important;
  }

  .stat-card-alert-icon {
    font-size: 11px !important;
  }

  .stat-card-left .text-caption {
    margin-top: 0 !important;
    font-size: 0.8rem;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stat-value {
    min-width: 0;
    margin-top: 0;
    font-size: 1.7rem;
  }

  .stat-card--compact .stat-value {
    font-size: 1.45rem;
  }

  .stat-breakdown {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 3px;
    margin-top: 0;
  }

  .stat-mini-card {
    padding: 1px 4px;
    border-radius: 4px;
    gap: 2px;
  }

  .stat-mini-label {
    font-size: 0.5rem;
  }

  .stat-mini-value {
    font-size: 0.58rem;
  }

  .department-stats-panel {
    width: 100%;
    min-width: 0;
  }
}
</style>
