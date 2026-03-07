<template>
  <q-page class="q-pa-md">
    <div class="row justify-between items-center q-mb-lg">
      <div>
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Reports</h1>
        <p class="text-grey-7">View and export leave application reports</p>
      </div>
      <!-- Export dropdown button -->
    <q-btn-dropdown v-model="showExportDropdown" color="green-7" icon="download" label="Export Data" dropdown-icon="arrow_drop_down">
      <q-list>
        <q-item clickable v-close-popup @click="exportData('PDF')">
          <q-item-section>
            <q-item-label>PDF</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable v-close-popup @click="exportData('CSV')">
          <q-item-section>
            <q-item-label>CSV</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable v-close-popup @click="exportData('Excel')">
          <q-item-section>
            <q-item-label>Excel</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
    </div>

    <!-- Report generator -->
    <q-card flat bordered class="rounded-borders q-mb-lg">
      <q-card-section>
        <div class="text-h6 q-mb-md">Generate Report</div>
        <div class="row q-col-gutter-md items-end">
          <div class="col-12 col-md-3">
            <q-select v-model="reportType" :options="reportTypeOptions" outlined dense label="Report Type" />
          </div>
          <div class="col-12 col-md-2">
            <q-input v-model="dateFrom" type="date" outlined dense label="From" />
          </div>
          <div class="col-12 col-md-2">
            <q-input v-model="dateTo" type="date" outlined dense label="To" />
          </div>
          <div class="col-12 col-md-2">
            <q-btn unelevated color="primary" icon="description" label="Generate" @click="showReportModal = true" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Leaves trend chart (UI preview) -->
    <q-card flat bordered class="rounded-borders q-mt-lg q-mb-lg">
      <q-card-section>
        <div class="row items-center justify-between q-mb-sm">
          <div>
            <div class="text-h6">Leave Trends by Month</div>
            <p class="text-caption text-grey-7 q-mb-none">analytics preview for {{ trendYearLabel }}</p>
          </div>
          <!-- <q-chip dense color="blue-1" text-color="primary" icon="analytics">UI Only</q-chip> -->
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
                <div class="text-subtitle1 text-weight-bold">UI preview data</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Report preview modal -->
    <q-dialog v-model="showReportModal" position="standard">
      <q-card style="min-width: 560px; max-width: 90vw">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">{{ reportType }} - Preview</div>
        </q-card-section>
        <q-card-section>
          <div class="text-center q-mb-lg">
            <div class="text-h5">City Government</div>
            <div class="text-subtitle1">Leave Management System</div>
            <div class="text-caption text-grey-7">Generated: {{ new Date().toLocaleDateString() }}</div>
          </div>
          <div class="row q-col-gutter-md">
            <div class="col-4"><q-card flat bordered><q-card-section class="text-center"><div class="text-caption">Total</div><div class="text-h5 text-primary">{{ leaveStore.applications.length }}</div></q-card-section></q-card></div>
            <div class="col-4"><q-card flat bordered><q-card-section class="text-center"><div class="text-caption">Approved</div><div class="text-h5 text-green-8">{{ approvedCount }}</div></q-card-section></q-card></div>
            <div class="col-4"><q-card flat bordered><q-card-section class="text-center"><div class="text-caption">Pending</div><div class="text-h5 text-warning">{{ pendingCount }}</div></q-card-section></q-card></div>
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
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import VueApexCharts from 'vue3-apexcharts'
import { useLeaveStore } from 'stores/leave-store'

const $q = useQuasar()
const leaveStore = useLeaveStore()

const reportType = ref('Monthly Summary')
const dateFrom = ref('')
const dateTo = ref('')
const showReportModal = ref(false)
const showExportDropdown = ref(false)

const reportTypeOptions = ['Monthly Summary', 'Department Report', 'Approval Report', 'Leave Type Analysis']

const approvedCount = computed(() => leaveStore.applications.filter((a) => a.status === 'Approved').length)
const pendingCount = computed(() => leaveStore.applications.filter((a) => a.status === 'Pending').length)

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fallbackMonthlyTrend = [4, 6, 5, 8, 7, 9, 11, 10, 8, 7, 9, 6]
const trendYearLabel = new Date().getFullYear()

function getApplicationDate(application) {
  return (
    application?.date_filed ??
    application?.dateFiled ??
    application?.created_at ??
    application?.start_date ??
    application?.startDate ??
    null
  )
}

const monthlyLeaveTrend = computed(() => {
  const buckets = Array(12).fill(0)
  let hasCurrentYearData = false

  for (const application of leaveStore.applications) {
    const rawDate = getApplicationDate(application)
    if (!rawDate) continue

    const parsedDate = new Date(rawDate)
    if (Number.isNaN(parsedDate.getTime())) continue
    if (parsedDate.getFullYear() !== trendYearLabel) continue

    buckets[parsedDate.getMonth()] += 1
    hasCurrentYearData = true
  }

  return hasCurrentYearData ? buckets : fallbackMonthlyTrend
})

const trendChartSeries = computed(() => [
  {
    name: 'Leave Applications',
    data: monthlyLeaveTrend.value,
  },
])

const trendChartOptions = computed(() => ({
  chart: {
    id: 'admin-leave-trend',
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
  const peakIndex = monthlyLeaveTrend.value.findIndex((value) => value === peakValue)
  return `${monthLabels[peakIndex]} (${peakValue})`
})

function downloadReport() {
  $q.notify({ type: 'info', message: 'Downloading report...', position: 'top' })
}
function exportData(format) {
  $q.notify({ type: 'info', message: `Exporting as ${format}...`, position: 'top' })
  showExportDropdown.value = false
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
