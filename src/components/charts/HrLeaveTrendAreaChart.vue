<template>
  <q-card flat bordered class="rounded-borders full-height">
    <q-card-section>
      <div class="row items-center justify-between q-mb-sm">
        <div>
          <div class="text-h6">Leave Trends by Month</div>
          <p class="text-caption text-grey-7 q-mb-none">Monthly trend for {{ resolvedTrendYearLabel }}</p>
        </div>
      </div>

      <div ref="chartRoot" class="trend-chart-wrapper chart-loading-host">
        <q-no-ssr>
          <VueApexCharts
            type="area"
            :height="trendChartHeight"
            :options="trendChartOptions"
            :series="trendChartSeries"
          />
        </q-no-ssr>
        <q-inner-loading :showing="loading" class="chart-loading">
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

const $q = useQuasar()
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const trendChartHeight = computed(() => ($q.screen.lt.md ? 190 : 210))

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

const monthlyLeaveTrend = computed(() => {
  const hasBackendMonthlyTrend = props.analytics && typeof props.analytics === 'object' && props.analytics.monthly_leave_trend != null
  if (hasBackendMonthlyTrend) {
    return normalizeTrendBuckets(props.analytics.monthly_leave_trend)
  }

  const buckets = Array(12).fill(0)

  for (const application of props.applications) {
    if (!isApprovedApplication(application)) continue

    const rawDate = getApplicationDate(application)
    if (!rawDate) continue

    const parsedDate = new Date(rawDate)
    if (Number.isNaN(parsedDate.getTime())) continue
    if (parsedDate.getFullYear() !== resolvedTrendYearLabel.value) continue

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

watch([trendChartSeries, trendChartOptions, () => props.loading], syncNativeChartTitleCleanup, {
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

@media (max-width: 1199px) {
  .trend-chart-wrapper {
    min-height: 190px;
    max-height: 190px;
  }
}
</style>
