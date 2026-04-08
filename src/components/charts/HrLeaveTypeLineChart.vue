<template>
  <q-card flat bordered class="rounded-borders full-height">
    <q-card-section>
      <div class="row items-end justify-between q-col-gutter-md q-mb-sm">
        <div class="col-12 col-md-8">
          <div class="text-h6">Leave Type Line Chart</div>
          <p class="text-caption text-grey-7 q-mb-none">
            Monthly leave applications by leave type for {{ resolvedTrendYearLabel }}
          </p>
        </div>
        <div class="col-12 col-sm-4 col-md-4">
          <q-select
            v-model="leaveTypeFilter"
            :options="leaveTypeFilterOptions"
            outlined
            dense
            label="Leave Type"
            :disable="loading"
          />
        </div>
      </div>

      <div ref="chartRoot" class="trend-chart-wrapper chart-loading-host">
        <q-no-ssr>
          <VueApexCharts
            type="line"
            :height="trendChartHeight"
            :options="leaveTypeTrendChartOptions"
            :series="leaveTypeTrendSeries"
          />
        </q-no-ssr>
        <q-inner-loading :showing="loading" :class="['chart-loading', { 'chart-loading--dark': isDark }]">
          <q-spinner color="primary" size="34px" />
        </q-inner-loading>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import VueApexCharts from 'vue3-apexcharts'

const props = defineProps({
  applications: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  analytics: {
    type: Object,
    default: null,
  },
  trendYearLabel: {
    type: Number,
    default: () => new Date().getFullYear(),
  },
})

const $q = useQuasar()
const isDark = computed(() => $q.dark.isActive)
const chartGridColor = computed(() => (isDark.value ? '#3a4d66' : '#e0e0e0'))
const chartAxisColor = computed(() => (isDark.value ? '#bdd0e5' : '#6b7280'))
const chartMarkerStrokeColor = computed(() => (isDark.value ? '#1b2330' : '#ffffff'))
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const leaveTypeChartPalette = ['#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#e53935', '#00897b', '#6d4c41', '#7cb342', '#3949ab', '#f4511e']
const leaveTypeFilter = ref('All')
const trendChartHeight = computed(() => ($q.screen.lt.md ? 190 : 210))
const chartRoot = ref(null)
let chartTitleCleanupObserver = null

function removeNativeChartTitleTooltip() {
  if (!chartRoot.value) return
  chartRoot.value
    .querySelectorAll('[title]')
    .forEach((node) => {
      if (String(node.getAttribute('title') || '').trim().toLowerCase() === 'chart') {
        node.removeAttribute('title')
      }
    })
  chartRoot.value
    .querySelectorAll('title')
    .forEach((node) => {
      if (String(node.textContent || '').trim().toLowerCase() === 'chart') {
        node.remove()
      }
    })
}

function syncNativeChartTitleCleanup() {
  nextTick(removeNativeChartTitleTooltip)
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


function normalizeTrendBuckets(rawBuckets) {
  return Array.from({ length: 12 }, (_unused, monthIndex) => {
    const parsed = Number(rawBuckets?.[monthIndex] ?? 0)
    if (!Number.isFinite(parsed) || parsed <= 0) return 0
    return Math.round(parsed)
  })
}

function normalizeStatusKey(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
}

function isApprovedApplication(application) {
  const candidates = [
    application?.rawStatus,
    application?.raw_status,
    application?.status,
  ]

  return candidates.some((statusValue) => normalizeStatusKey(statusValue) === 'APPROVED')
}

const resolvedTrendYearLabel = computed(() => {
  const parsed = Number(props.analytics?.trend_year)
  if (!Number.isFinite(parsed) || parsed < 2000) return props.trendYearLabel
  return Math.round(parsed)
})

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

const leaveTypeMonthlyTrendMap = computed(() => {
  const trendMap = new Map()
  const leaveTypeTrendPayload = props.analytics?.leave_type_monthly_trend

  if (leaveTypeTrendPayload && typeof leaveTypeTrendPayload === 'object') {
    for (const [rawLeaveType, buckets] of Object.entries(leaveTypeTrendPayload)) {
      const leaveTypeName = normalizeLeaveTypeName(rawLeaveType)
      const normalizedBuckets = normalizeTrendBuckets(buckets)
      const existingBuckets = trendMap.get(leaveTypeName)

      if (existingBuckets) {
        trendMap.set(
          leaveTypeName,
          existingBuckets.map((count, index) => count + normalizedBuckets[index]),
        )
      } else {
        trendMap.set(leaveTypeName, normalizedBuckets)
      }
    }

    return trendMap
  }

  for (const application of props.applications) {
    if (!isApprovedApplication(application)) continue

    const rawDate = getApplicationDate(application)
    if (!rawDate) continue

    const parsedDate = new Date(rawDate)
    if (Number.isNaN(parsedDate.getTime())) continue
    if (parsedDate.getFullYear() !== resolvedTrendYearLabel.value) continue

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
    foreColor: chartAxisColor.value,
  },
  theme: {
    mode: isDark.value ? 'dark' : 'light',
  },
  colors: leaveTypeChartPalette,
  dataLabels: { enabled: false },
  stroke: {
    curve: 'smooth',
    width: 3,
  },
  markers: {
    size: 3,
    strokeWidth: 2,
    colors: leaveTypeChartPalette,
    strokeColors: chartMarkerStrokeColor.value,
    hover: { sizeOffset: 2 },
  },
  grid: {
    borderColor: chartGridColor.value,
    strokeDashArray: 4,
    xaxis: { lines: { show: false } },
  },
  xaxis: {
    categories: monthLabels,
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: chartAxisColor.value } },
  },
  yaxis: {
    min: 0,
    forceNiceScale: true,
    tickAmount: 4,
    labels: {
      style: { colors: chartAxisColor.value },
      formatter: (value) => String(Math.round(value)),
    },
  },
  legend: {
    show: false,
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
    style: { color: chartAxisColor.value },
  },
}))

onMounted(() => {
  syncNativeChartTitleCleanup()

  if (chartRoot.value) {
    chartTitleCleanupObserver = new MutationObserver(syncNativeChartTitleCleanup)
    chartTitleCleanupObserver.observe(chartRoot.value, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['title'],
    })
  }
})

watch([leaveTypeTrendSeries, leaveTypeTrendChartOptions, () => props.loading], syncNativeChartTitleCleanup, {
  deep: true,
})

onBeforeUnmount(() => {
  chartTitleCleanupObserver?.disconnect()
  chartTitleCleanupObserver = null
})
</script>

<style scoped>
.trend-chart-wrapper {
  width: 100%;
  min-height: 210px;
  max-height: 210px;
}

.chart-loading-host {
  position: relative;
}

.chart-loading {
  background: rgba(255, 255, 255, 0.72);
}

.chart-loading--dark {
  background: rgba(16, 22, 30, 0.72);
}

@media (max-width: 1199px) {
  .trend-chart-wrapper {
    min-height: 190px;
    max-height: 190px;
  }
}
</style>
