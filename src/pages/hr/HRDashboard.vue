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

    <div class="row q-col-gutter-md q-mb-lg stat-cards-row">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="stat-card bg-white rounded-borders" flat elevation="1" @click="goToApplications('total')">
          <q-card-section class="stat-card-content">
            <div class="stat-card-main">
              <div class="stat-card-left">
                <div class="row items-center no-wrap q-gutter-xs">
                  <q-icon name="description" size="28px" color="grey" />
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
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="stat-card bg-white rounded-borders" flat elevation="1" @click="goToApplications('pending')">
          <q-card-section class="stat-card-content">
            <div class="stat-card-main">
              <div class="stat-card-left">
                <div class="row items-center no-wrap q-gutter-xs">
                  <q-icon name="schedule" size="28px" color="warning" />
                  <q-icon v-if="dashboardData.pending_count > 5" name="warning" size="18px" color="warning" />
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
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="stat-card bg-white rounded-borders" flat elevation="1" @click="goToApplications('approved')">
          <q-card-section class="stat-card-content">
            <div class="stat-card-main">
              <div class="stat-card-left">
                <div class="row items-center no-wrap q-gutter-xs">
                  <q-icon name="check_circle" size="28px" color="primary" />
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
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="stat-card bg-white rounded-borders" flat elevation="1" @click="goToApplications('rejected')">
          <q-card-section class="stat-card-content">
            <div class="stat-card-main">
              <div class="stat-card-left">
                <div class="row items-center no-wrap q-gutter-xs">
                  <q-icon name="cancel" size="28px" color="negative" />
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
    </div>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md-6 dashboard-panel-col">
        <q-card flat bordered class="rounded-borders full-width manpower-card">
          <q-card-section class="manpower-card-section">
            <div class="row items-center justify-between q-mb-sm">
              <div>
                <div class="text-h6">Monthly Manpower Percentage</div>
                <!-- <p class="text-caption text-grey-7 q-mb-none">
                  Based on active employees minus approved leaves per month (current year)
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

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md-6">
        <q-card flat bordered class="rounded-borders full-height">
          <q-card-section>
            <div class="row items-center justify-between q-mb-sm">
              <div>
                <div class="text-h6">Leave Trends by Month</div>
                <p class="text-caption text-grey-7 q-mb-none">Monthly trend for {{ trendYearLabel }}</p>
              </div>
            </div>

            <div class="trend-chart-wrapper">
              <q-no-ssr>
                <VueApexCharts
                  type="area"
                  height="320"
                  :options="trendChartOptions"
                  :series="trendChartSeries"
                />
              </q-no-ssr>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat bordered class="rounded-borders full-height">
          <q-card-section>
            <div class="row items-end justify-between q-col-gutter-md q-mb-sm">
              <div class="col-12 col-md-8">
                <div class="text-h6">Leave Type Line Chart</div>
                <p class="text-caption text-grey-7 q-mb-none">Monthly leave applications by leave type for {{ trendYearLabel }}</p>
              </div>
              <div class="col-12 col-sm-4 col-md-3">
                <q-select
                  v-model="leaveTypeFilter"
                  :options="leaveTypeFilterOptions"
                  outlined
                  dense
                  label="Leave Type"
                />
              </div>
            </div>

            <div class="trend-chart-wrapper">
              <q-no-ssr>
                <VueApexCharts
                  type="line"
                  height="320"
                  :options="leaveTypeTrendChartOptions"
                  :series="leaveTypeTrendSeries"
                />
              </q-no-ssr>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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
  kpi_breakdown: {
    total: emptyEmploymentBreakdown(),
  },
})
const dashboardApplications = ref([])
const activeEmployeeCount = ref(0)
const showPendingReminderDialog = ref(false)
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const trendYearLabel = new Date().getFullYear()
const leaveTypeFilter = ref('All')
const leaveTypeChartPalette = ['#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#e53935', '#00897b', '#6d4c41', '#7cb342', '#3949ab', '#f4511e']

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

function getApplicationDate(application) {
  return (
    application?.dateFiled ??
    application?.date_filed ??
    application?.created_at ??
    application?.startDate ??
    application?.start_date ??
    null
  )
}

function normalizeLeaveTypeName(value) {
  if (typeof value === 'string' && value.trim()) return value.trim()

  if (value && typeof value === 'object') {
    const nestedName = value.name ?? value.label ?? value.type
    if (typeof nestedName === 'string' && nestedName.trim()) return nestedName.trim()
  }

  return 'Unknown'
}

function getApplicationLeaveType(application) {
  const leaveTypeValue =
    application?.leaveType ??
    application?.leave_type_name ??
    application?.leaveTypeName ??
    application?.leave_type ??
    application?.leaveType?.name ??
    application?.leave?.name

  return normalizeLeaveTypeName(leaveTypeValue)
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

const manpowerMonths = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, '0')
    return `${currentYear}-${month}`
  })
})

const manpowerMonthlyOnLeave = computed(() => {
  const monthSetMap = new Map(manpowerMonths.value.map((month) => [month, new Set()]))

  for (const application of dashboardApplications.value) {
    if (mergeStatus(application) !== 'Approved') continue

    const employeeKey = getEmployeeKey(application)
    if (!employeeKey) continue

    const leaveDates = getApplicationLeaveDates(application)
    for (const leaveDate of leaveDates) {
      const monthKey = leaveDate.slice(0, 7)
      const bucket = monthSetMap.get(monthKey)
      if (bucket) bucket.add(employeeKey)
    }
  }

  return manpowerMonths.value.map((month) => monthSetMap.get(month)?.size ?? 0)
})

const manpowerMonthlyPercentage = computed(() => {
  const totalActive = Number(activeEmployeeCount.value || 0)
  if (totalActive <= 0) return manpowerMonthlyOnLeave.value.map(() => 0)

  return manpowerMonthlyOnLeave.value.map((onLeaveCount) => {
    const available = Math.max(totalActive - onLeaveCount, 0)
    return Number(((available / totalActive) * 100).toFixed(2))
  })
})

const manpowerChartSeries = computed(() => [
  {
    name: 'Manpower %',
    data: manpowerMonthlyPercentage.value,
  },
])

const monthlyLeaveTrend = computed(() => {
  const buckets = Array(12).fill(0)

  for (const application of dashboardApplications.value) {
    const rawDate = getApplicationDate(application)
    if (!rawDate) continue

    const parsedDate = new Date(rawDate)
    if (Number.isNaN(parsedDate.getTime())) continue
    if (parsedDate.getFullYear() !== trendYearLabel) continue

    buckets[parsedDate.getMonth()] += 1
  }

  return buckets
})

const trendChartSeries = computed(() => [
  {
    name: 'Leave Applications',
    data: monthlyLeaveTrend.value,
  },
])

const totalApplicationsBreakdown = computed(() => {
  const apiBreakdown = normalizeEmploymentBreakdown(dashboardData.value.kpi_breakdown?.total)
  if (Object.values(apiBreakdown).some((value) => value > 0)) return apiBreakdown
  return buildEmploymentBreakdown(dashboardApplications.value)
})

const EMPLOYMENT_TYPE_BREAKDOWN_CARDS = [
  { key: 'elective', label: 'Elective', accent: '#f9a825', bg: '#fff8e1' },
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

const manpowerChartOptions = computed(() => ({
  chart: {
    id: 'hr-manpower-monthly-percentage',
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
    categories: manpowerMonths.value.map((month) => {
      const parsedDate = new Date(`${month}-01T00:00:00`)
      return parsedDate.toLocaleDateString('en-US', { month: 'short' })
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

const trendChartOptions = computed(() => ({
  chart: {
    id: 'hr-dashboard-leave-trend',
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
    size: 4,
    strokeWidth: 2,
    colors: ['#ffffff'],
    strokeColors: '#1e88e5',
    hover: { sizeOffset: 2 },
  },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 0.7,
      opacityFrom: 0.35,
      opacityTo: 0.06,
      stops: [0, 90, 100],
    },
  },
  grid: {
    borderColor: '#e0e0e0',
    strokeDashArray: 4,
    xaxis: { lines: { show: false } },
  },
  xaxis: {
    categories: monthLabels,
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: '#6b7280' } },
  },
  yaxis: {
    min: 0,
    forceNiceScale: true,
    tickAmount: 4,
    labels: {
      style: { colors: '#6b7280' },
      formatter: (value) => String(Math.round(value)),
    },
  },
  legend: { show: false },
  tooltip: {
    y: {
      formatter: (value) => `${Math.round(value)} leaves`,
    },
  },
}))

const leaveTypeMonthlyTrendMap = computed(() => {
  const trendMap = new Map()

  for (const application of dashboardApplications.value) {
    const rawDate = getApplicationDate(application)
    if (!rawDate) continue

    const parsedDate = new Date(rawDate)
    if (Number.isNaN(parsedDate.getTime())) continue
    if (parsedDate.getFullYear() !== trendYearLabel) continue

    const leaveTypeName = getApplicationLeaveType(application)
    if (!trendMap.has(leaveTypeName)) {
      trendMap.set(leaveTypeName, Array(12).fill(0))
    }

    trendMap.get(leaveTypeName)[parsedDate.getMonth()] += 1
  }

  return trendMap
})

const leaveTypeFilterOptions = computed(() => [
  'All',
  ...Array.from(leaveTypeMonthlyTrendMap.value.keys()).sort((left, right) => left.localeCompare(right)),
])

watch(
  leaveTypeFilterOptions,
  (options) => {
    if (!options.includes(leaveTypeFilter.value)) {
      leaveTypeFilter.value = 'All'
    }
  },
  { immediate: true },
)

const leaveTypeTrendSeries = computed(() => {
  const trendEntries = Array.from(leaveTypeMonthlyTrendMap.value.entries())
    .sort(([left], [right]) => left.localeCompare(right))

  if (leaveTypeFilter.value === 'All') {
    return trendEntries.map(([leaveType, data]) => ({
      name: leaveType,
      data,
    }))
  }

  const selectedTypeData = leaveTypeMonthlyTrendMap.value.get(leaveTypeFilter.value)
  if (!selectedTypeData) return []

  return [
    {
      name: leaveTypeFilter.value,
      data: selectedTypeData,
    },
  ]
})

const leaveTypeTrendChartOptions = computed(() => ({
  chart: {
    id: 'hr-dashboard-leave-type-trend',
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: { easing: 'easeinout', speed: 450 },
    fontFamily: 'inherit',
  },
  colors: leaveTypeChartPalette,
  dataLabels: { enabled: false },
  stroke: {
    curve: 'smooth',
    width: 3,
  },
  markers: {
    size: 3,
    hover: { sizeOffset: 2 },
  },
  grid: {
    borderColor: '#e0e0e0',
    strokeDashArray: 4,
    xaxis: { lines: { show: false } },
  },
  xaxis: {
    categories: monthLabels,
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: '#6b7280' } },
  },
  yaxis: {
    min: 0,
    forceNiceScale: true,
    tickAmount: 4,
    labels: {
      style: { colors: '#6b7280' },
      formatter: (value) => String(Math.round(value)),
    },
  },
  legend: {
    show: true,
    position: 'top',
    horizontalAlign: 'left',
  },
  tooltip: {
    shared: true,
    intersect: false,
    y: {
      formatter: (value) => `${Math.round(value)} leaves`,
    },
  },
  noData: {
    text: 'No leave data for selected leave type.',
  },
}))

async function fetchDashboard() {
  loading.value = true
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
.stat-cards-row > div {
  display: flex;
}

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

.trend-chart-wrapper {
  width: 100%;
  min-height: 320px;
}

.stat-card {
  width: 100%;
  height: 100%;
  min-height: 116px;
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.stat-card-content {
  height: 100%;
  padding: 12px 16px 10px;
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
  font-size: clamp(2.2rem, 3.2vw, 2.8rem);
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

@media (max-width: 599px) {
  .stat-breakdown {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
