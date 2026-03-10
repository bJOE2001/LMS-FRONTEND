<template>
  <q-page class="q-pa-md">
    <div class="row justify-between items-center q-mb-lg">
      <div>
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">HR Dashboard</h1>
        <p class="text-grey-7">Monitor leave applications across all departments</p>
      </div>
    </div>

    <q-dialog v-model="showPendingReminderDialog" persistent>
      <q-card style="min-width: 360px; max-width: 480px">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="pending_actions" color="warning" size="28px" class="q-mr-sm" />
          <div class="text-h6">Pending Leave Applications</div>
        </q-card-section>
        <q-card-section>
          <div class="text-body2 text-grey-8">
            You have
            <span class="text-weight-bold">{{ dashboardData.pending_count }}</span>
            pending leave application(s) that need review and approval.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-7" label="Later" v-close-popup />
          <q-btn unelevated color="warning" label="Review Now" @click="reviewPendingApplications" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-white rounded-borders summary-card" flat bordered @click="goToApplications('total')">
          <q-card-section>
            <div class="text-caption text-weight-medium">Total Applications</div>
            <div class="text-h4 text-primary">{{ dashboardData.total_count }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-white rounded-borders summary-card" flat bordered @click="goToApplications('pending')">
          <q-card-section>
            <div class="text-caption text-weight-medium">Pending</div>
            <div class="text-h4 text-warning">{{ dashboardData.pending_count }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-white rounded-borders summary-card" flat bordered @click="goToApplications('approved')">
          <q-card-section>
            <div class="text-caption text-weight-medium">Approved</div>
            <div class="text-h4 text-green-8">{{ dashboardData.approved_count }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-white rounded-borders summary-card" flat bordered @click="goToApplications('rejected')">
          <q-card-section>
            <div class="text-caption text-weight-medium">Rejected</div>
            <div class="text-h4 text-negative">{{ dashboardData.rejected_count }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md-6 dashboard-panel-col">
        <q-card flat bordered class="rounded-borders full-width manpower-card">
          <q-card-section class="manpower-card-section">
            <div class="row items-center justify-between q-mb-sm">
              <div>
                <div class="text-h6">Daily Manpower Percentage</div>
                <!-- <p class="text-caption text-grey-7 q-mb-none">
                  Based on active employees minus approved leaves per day (current month)
                </p> -->
              </div>
              <div class="text-right">
                <div class="text-caption text-grey-7">Active Employees</div>
                <div class="text-subtitle1 text-weight-bold">{{ activeEmployeeCount || 0 }}</div>
              </div>
            </div>

            <div class="manpower-chart-wrapper">
              <q-no-ssr>
                <VueApexCharts
                  type="area"
                  height="100%"
                  :options="manpowerChartOptions"
                  :series="manpowerChartSeries"
                />
              </q-no-ssr>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-6 dashboard-panel-col">
        <HrCalendarPanel />
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
import VueApexCharts from 'vue3-apexcharts'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const notifStore = useNotificationStore()

const dashboardData = ref({
  total_count: 0,
  pending_count: 0,
  approved_count: 0,
  rejected_count: 0,
})
const dashboardApplications = ref([])
const activeEmployeeCount = ref(0)
const showPendingReminderDialog = ref(false)

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
    title: 'Pending Leave Applications',
    message: `You have ${pendingCount} pending leave ${noun} that need review and approval.`,
  })
}

function mergeStatus(app) {
  const raw = String(app.rawStatus || '').toUpperCase()
  const status = String(app.status || '').toUpperCase()

  if (raw.includes('PENDING') || status.includes('PENDING')) return 'Pending'
  if (raw.includes('APPROVED') || status.includes('APPROVED')) return 'Approved'
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
  const key = application?.employee_id ?? application?.employeeId ?? application?.user_id ?? application?.employeeName
  return String(key || '').trim()
}

const manpowerDays = computed(() => {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = String(index + 1).padStart(2, '0')
    const monthLabel = String(month + 1).padStart(2, '0')
    return `${year}-${monthLabel}-${day}`
  })
})

const manpowerDailyOnLeave = computed(() => {
  const daySetMap = new Map(manpowerDays.value.map((day) => [day, new Set()]))

  for (const application of dashboardApplications.value) {
    if (mergeStatus(application) !== 'Approved') continue

    const employeeKey = getEmployeeKey(application)
    if (!employeeKey) continue

    const leaveDates = getApplicationLeaveDates(application)
    for (const leaveDate of leaveDates) {
      const bucket = daySetMap.get(leaveDate)
      if (bucket) bucket.add(employeeKey)
    }
  }

  return manpowerDays.value.map((day) => daySetMap.get(day)?.size ?? 0)
})

const manpowerDailyPercentage = computed(() => {
  const totalActive = Number(activeEmployeeCount.value || 0)
  if (totalActive <= 0) return manpowerDailyOnLeave.value.map(() => 0)

  return manpowerDailyOnLeave.value.map((onLeaveCount) => {
    const available = Math.max(totalActive - onLeaveCount, 0)
    return Number(((available / totalActive) * 100).toFixed(2))
  })
})

const manpowerChartSeries = computed(() => [
  {
    name: 'Manpower %',
    data: manpowerDailyPercentage.value,
  },
])

const manpowerChartOptions = computed(() => ({
  chart: {
    id: 'hr-manpower-daily-percentage',
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: { easing: 'easeinout', speed: 450 },
    fontFamily: 'inherit',
  },
  colors: ['#1e88e5'],
  dataLabels: { enabled: false },
  stroke: {
    curve: 'smooth',
    width: 3,
  },
  markers: {
    size: 3,
    hover: { sizeOffset: 2 },
  },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 0.7,
      opacityFrom: 0.32,
      opacityTo: 0.08,
      stops: [0, 90, 100],
    },
  },
  grid: {
    borderColor: '#e0e0e0',
    strokeDashArray: 4,
    xaxis: { lines: { show: false } },
  },
  xaxis: {
    categories: manpowerDays.value.map((day) => {
      const parsedDate = new Date(`${day}T00:00:00`)
      return parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }),
    labels: {
      hideOverlappingLabels: true,
      rotate: -45,
      style: { colors: '#6b7280' },
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    min: 0,
    max: 100,
    tickAmount: 5,
    labels: {
      formatter: (value) => `${Math.round(value)}%`,
      style: { colors: '#6b7280' },
    },
  },
  tooltip: {
    y: {
      formatter: (value) => `${Number(value).toFixed(2)}%`,
    },
  },
  noData: {
    text: 'No manpower data available.',
  },
}))

async function fetchDashboard() {
  try {
    const [{ data }, summaryResponse] = await Promise.all([
      api.get('/hr/dashboard'),
      api.get('/hr/reports/summary').catch(() => null),
    ])
    const applications = Array.isArray(data.applications) ? data.applications : []
    dashboardApplications.value = applications

    const summaryActiveEmployees = Number(summaryResponse?.data?.active_employees || 0)
    const dashboardActiveEmployees = Number(data?.active_employees || 0)
    activeEmployeeCount.value = summaryActiveEmployees || dashboardActiveEmployees || 0

    const pendingFromApps = applications.filter((app) => mergeStatus(app) === 'Pending').length
    const approvedFromApps = applications.filter((app) => mergeStatus(app) === 'Approved').length
    const rejectedFromApps = applications.filter((app) => mergeStatus(app) === 'Rejected').length

    dashboardData.value = {
      total_count: applications.length || data.total_count || 0,
      pending_count: applications.length ? pendingFromApps : (data.pending_count ?? 0),
      approved_count: applications.length ? approvedFromApps : (data.approved_count ?? 0),
      rejected_count: applications.length ? rejectedFromApps : (data.rejected_count ?? 0),
    }

    maybeShowPendingReminder()
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load HR dashboard data right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  }
}

function goToApplications(status) {
  router.push({ path: '/hr/applications', query: { status } })
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
.dashboard-panel-col {
  display: flex;
}

.dashboard-panel-col > * {
  width: 100%;
}

.manpower-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.manpower-card-section {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.manpower-chart-wrapper {
  width: 100%;
  flex: 1 1 auto;
  min-height: 320px;
}

.manpower-chart-wrapper :deep(.q-no-ssr),
.manpower-chart-wrapper :deep(.vue-apexcharts),
.manpower-chart-wrapper :deep(.apexcharts-canvas),
.manpower-chart-wrapper :deep(.apexcharts-svg) {
  height: 100% !important;
}

.summary-card {
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}
.summary-card:hover {
  background-color: #f3faf3 !important;
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
}
</style>
