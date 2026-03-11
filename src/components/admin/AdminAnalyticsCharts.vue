<template>
  <div class="row q-col-gutter-md q-mb-lg">
    <div class="col-12 col-md-6">
      <q-card flat bordered class="rounded-borders full-height">
        <q-card-section>
          <div class="row items-center justify-between q-mb-sm">
            <div>
              <div class="text-h6">Leave Trends by Month</div>
              <p class="text-caption text-grey-7 q-mb-none">analytics preview for {{ trendYearLabel }}</p>
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
                  <div class="text-subtitle1 text-weight-bold">{{ trendSourceLabel }}</div>
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
              <p class="text-caption text-grey-7 q-mb-none">
                Monthly leave applications by leave type for {{ trendYearLabel }}
              </p>
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
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import VueApexCharts from 'vue3-apexcharts'

const props = defineProps({
  applications: {
    type: Array,
    default: () => [],
  },
})

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fallbackMonthlyTrend = [4, 6, 5, 8, 7, 9, 11, 10, 8, 7, 9, 6]
const trendYearLabel = new Date().getFullYear()
const leaveTypeFilter = ref('All')
const leaveTypeChartPalette = ['#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#e53935', '#00897b', '#6d4c41', '#7cb342', '#3949ab', '#f4511e']

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

const trendAnalysis = computed(() => {
  const buckets = Array(12).fill(0)
  let hasCurrentYearData = false

  for (const application of props.applications) {
    const rawDate = getApplicationDate(application)
    if (!rawDate) continue

    const parsedDate = new Date(rawDate)
    if (Number.isNaN(parsedDate.getTime())) continue
    if (parsedDate.getFullYear() !== trendYearLabel) continue

    buckets[parsedDate.getMonth()] += 1
    hasCurrentYearData = true
  }

  return {
    buckets: hasCurrentYearData ? buckets : fallbackMonthlyTrend,
    hasCurrentYearData,
  }
})

const monthlyLeaveTrend = computed(() => trendAnalysis.value.buckets)
const trendSourceLabel = computed(() => (
  trendAnalysis.value.hasCurrentYearData ? 'Live application data' : 'UI preview data'
))

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

const leaveTypeMonthlyTrendMap = computed(() => {
  const trendMap = new Map()

  for (const application of props.applications) {
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
    id: 'admin-reports-leave-type-trend',
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
