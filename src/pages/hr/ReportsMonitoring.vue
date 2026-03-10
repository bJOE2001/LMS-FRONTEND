<template>
  <q-page class="q-pa-md">
    <div class="row justify-between items-center q-mb-lg">
      <div>
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Reports & Monitoring</h1>
        <p class="text-grey-7">Generate and view comprehensive leave reports</p>
      </div>
      <q-btn-dropdown
        unelevated
        color="green-7"
        icon="download"
        label="Export Data"
        dropdown-icon="arrow_drop_down"
      >
        <q-list>
          <q-item clickable v-close-popup @click="exportData('Excel')">
            <q-item-section avatar><q-icon name="table_chart" color="green" /></q-item-section>
            <q-item-section>Excel (.xlsx)</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="exportData('CSV')">
            <q-item-section avatar><q-icon name="table_rows" color="primary" /></q-item-section>
            <q-item-section>CSV File</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="exportData('PDF')">
            <q-item-section avatar><q-icon name="picture_as_pdf" color="red" /></q-item-section>
            <q-item-section>PDF Report</q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
    </div>

    <q-card flat bordered class="rounded-borders q-mb-lg">
      <q-card-section>
        <div class="text-h6 q-mb-md">Generate Report</div>
        <div class="row q-col-gutter-md items-end">
          <div class="col-12 col-md-3">
            <q-select v-model="reportType" :options="reportTypeOptions" outlined dense />
          </div>
          <div class="col-12 col-md-2">
            <q-input v-model="dateFrom" type="date" outlined dense />
          </div>
          <div class="col-12 col-md-2">
            <q-input v-model="dateTo" type="date" outlined dense />
          </div>
          <div class="col-12 col-md-2">
            <q-btn unelevated color="primary" icon="description" label="Generate" :loading="generating" @click="handleGenerate" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <div class="row q-col-gutter-md q-mb-lg">
      <div v-for="stat in summaryStats" :key="stat.label" class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="rounded-borders">
          <q-card-section class="row items-center">
            <q-icon :name="stat.icon" :color="stat.color" size="32px" class="q-mr-md" />
            <div>
              <div class="text-caption text-grey-7">{{ stat.label }}</div>
              <div class="text-h6">{{ stat.value }}</div>
            </div>
          </q-card-section>
        </q-card>
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

            <div class="row q-col-gutter-sm q-mt-sm">
              <div class="col-12 col-sm-4">
                <q-card flat bordered class="trend-metric-card">
                  <q-card-section class="q-py-sm">
                    <div class="text-caption text-grey-7">Yearly total leaves</div>
                    <div class="text-subtitle1 text-weight-bold">{{ trendTotal }}</div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-sm-4">
                <q-card flat bordered class="trend-metric-card">
                  <q-card-section class="q-py-sm">
                    <div class="text-caption text-grey-7">Peak month</div>
                    <div class="text-subtitle1 text-weight-bold">{{ trendPeakMonth }}</div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-sm-4">
                <q-card flat bordered class="trend-metric-card">
                  <q-card-section class="q-py-sm">
                    <div class="text-caption text-grey-7">Source</div>
                    <div class="text-subtitle1 text-weight-bold">HR dashboard data</div>
                  </q-card-section>
                </q-card>
              </div>
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

    <q-card flat bordered class="rounded-borders q-mb-lg">
      <q-card-section><div class="text-h6">Department Statistics</div></q-card-section>
      <q-table
        v-model:pagination="deptPagination"
        :rows="deptStats"
        :columns="deptColumns"
        row-key="dept"
        flat
        :rows-per-page-options="[5, 10, 15, 20]"
      />
    </q-card>

    <q-dialog v-model="showReportModal" position="standard">
      <q-card style="min-width: 560px; max-width: 90vw">
        <q-card-section class="bg-primary text-white"><div class="text-h6">{{ reportType }} - Preview</div></q-card-section>
        <q-card-section>
          <div class="text-center q-mb-lg">
            <div class="text-h5">City Government</div>
            <div class="text-subtitle1">Leave Management System</div>
            <div class="text-caption text-grey-7">Generated: {{ new Date().toLocaleDateString() }}</div>
          </div>
          <div class="row q-col-gutter-md">
            <div class="col-4"><q-card flat bordered><q-card-section class="text-center"><div class="text-caption">Total</div><div class="text-h5 text-primary">{{ reportData.length }}</div></q-card-section></q-card></div>
            <div class="col-4"><q-card flat bordered><q-card-section class="text-center"><div class="text-caption">Approved</div><div class="text-h5 text-green-8">{{ approvedInReport }}</div></q-card-section></q-card></div>
            <div class="col-4"><q-card flat bordered><q-card-section class="text-center"><div class="text-caption">Pending</div><div class="text-h5 text-warning">{{ pendingInReport }}</div></q-card-section></q-card></div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" v-close-popup />
          <q-btn unelevated color="primary" icon="download" label="Download PDF" @click="downloadReport" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import VueApexCharts from 'vue3-apexcharts'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const $q = useQuasar()

const reportType = ref('Monthly Summary')
const dateFrom = ref('')
const dateTo = ref('')
const showReportModal = ref(false)
const generating = ref(false)
const reportData = ref([])

const reportTypeOptions = ['Monthly Summary', 'Department Report', 'Leave Type Analysis']

const summary = ref({
  total_applications: 0,
  approval_rate: 0,
  avg_processing_days: 0,
  active_employees: 0
})

const deptStats = ref([])
const deptPagination = ref({
  page: 1,
  rowsPerPage: 5,
  sortBy: 'dept',
  descending: false,
})
const trendApplications = ref([])
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const trendYearLabel = new Date().getFullYear()
const leaveTypeFilter = ref('All')
const leaveTypeChartPalette = ['#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#e53935', '#00897b', '#6d4c41', '#7cb342', '#3949ab', '#f4511e']

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

async function fetchTrendData() {
  try {
    const { data } = await api.get('/hr/dashboard')
    trendApplications.value = Array.isArray(data?.applications) ? data.applications : []
  } catch {
    trendApplications.value = []
  }
}

async function fetchSummary() {
  try {
    const { data } = await api.get('/hr/reports/summary')
    summary.value = data
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load summary statistics right now.')
    $q.notify({ type: 'negative', message: msg })
  }
}

async function fetchDeptStats() {
  try {
    const { data } = await api.get('/hr/reports/departments')
    deptStats.value = data
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load department statistics right now.')
    $q.notify({ type: 'negative', message: msg })
  }
}

async function handleGenerate() {
  generating.value = true
  try {
    const { data } = await api.get('/hr/reports/generate', {
      params: {
        type: reportType.value,
        date_from: dateFrom.value,
        date_to: dateTo.value
      }
    })
    reportData.value = data
    showReportModal.value = true
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to generate report right now.')
    $q.notify({ type: 'negative', message: msg })
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  fetchSummary()
  fetchDeptStats()
  fetchTrendData()
})

const summaryStats = computed(() => [
  { label: 'Total Applications', value: summary.value.total_applications, icon: 'description', color: 'primary' },
  { label: 'Approval Rate', value: `${summary.value.approval_rate}%`, icon: 'trending_up', color: 'green' },
  { label: 'Avg Processing', value: `${summary.value.avg_processing_days}d`, icon: 'schedule', color: 'warning' },
  { label: 'Active Employees', value: summary.value.active_employees, icon: 'people', color: 'purple' },
])

const approvedInReport = computed(() => reportData.value.filter(a => a.status === 'APPROVED').length)
const pendingInReport = computed(() => reportData.value.filter(a => a.status === 'PENDING_HR' || a.status === 'PENDING_ADMIN').length)

const monthlyLeaveTrend = computed(() => {
  const buckets = Array(12).fill(0)

  for (const application of trendApplications.value) {
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

const trendChartOptions = computed(() => ({
  chart: {
    id: 'hr-reports-leave-trend',
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

const trendTotal = computed(() => monthlyLeaveTrend.value.reduce((sum, value) => sum + value, 0))
const trendPeakMonth = computed(() => {
  const peakValue = Math.max(...monthlyLeaveTrend.value)
  if (peakValue <= 0) return 'No data'
  const peakIndex = monthlyLeaveTrend.value.findIndex((value) => value === peakValue)
  return `${monthLabels[peakIndex]} (${peakValue})`
})

const leaveTypeMonthlyTrendMap = computed(() => {
  const trendMap = new Map()

  for (const application of trendApplications.value) {
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
    id: 'hr-reports-leave-type-trend',
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

const deptColumns = [
  { name: 'dept', label: 'Department', field: 'dept', align: 'left' },
  { name: 'total', label: 'Total', field: 'total', align: 'left' },
  { name: 'onLeave', label: 'On Leave', field: 'onLeave', align: 'left' },
  { name: 'pending', label: 'Pending', field: 'pending', align: 'left' },
  { name: 'approved', label: 'Approved', field: 'approved', align: 'left' },
  { name: 'rate', label: 'Utilization %', field: 'rate', align: 'left' },
]

function downloadReport() {
  $q.notify({ type: 'info', message: 'Downloading report...', position: 'top' })
}
function exportData(format) {
  $q.notify({ type: 'info', message: `Exporting as ${format}...`, position: 'top' })
}
</script>

<style scoped>
.trend-chart-wrapper {
  width: 100%;
  min-height: 320px;
}

.trend-metric-card {
  background: #fafafa;
}
</style>
