<template>
  <q-card flat bordered class="trend-panel-card full-height">
    <q-card-section class="trend-panel-section">
      <div class="trend-panel-header">
        <div class="trend-panel-header__left">
          <span class="trend-panel-header__icon" aria-hidden="true">
            <q-icon name="trending_up" size="18px" />
          </span>
          <div>
            <div class="trend-panel-header__title">Leave Trends by Month</div>
            <div class="trend-panel-header__subtitle">
              Monthly trend for {{ resolvedTrendYearLabel }}
            </div>
          </div>
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
        <ChartSkeleton
          :loading="loading"
          :has-data="hasChartData"
          variant="area"
          height="175px"
          label="Updating trends..."
        />
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

const hasChartData = computed(() => (props.applications?.length || 0) > 0 || Boolean(props.analytics))

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
const isDark = computed(() => $q.dark.isActive)
const chartGridColor = computed(() => (isDark.value ? '#3a4d66' : '#e0e0e0'))
const chartAxisColor = computed(() => (isDark.value ? '#bdd0e5' : '#6b7280'))
const chartMarkerStrokeColor = computed(() => (isDark.value ? '#1b2330' : '#ffffff'))
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const trendChartHeight = computed(() => ($q.screen.lt.lg ? 165 : 185))

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
    foreColor: chartAxisColor.value,
  },
  theme: {
    mode: isDark.value ? 'dark' : 'light',
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
    colors: ['#1e88e5'],
    strokeColors: chartMarkerStrokeColor.value,
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
  legend: { show: false },
  tooltip: {
    y: {
      formatter: (value) => `${Math.round(value)} leaves`,
    },
  },
  noData: {
    text: 'No leave trend data available.',
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

watch([trendChartSeries, trendChartOptions, () => props.loading], syncNativeChartTitleCleanup, {
  deep: true,
})

onBeforeUnmount(() => {
  chartTitleCleanupObserver?.disconnect()
  chartTitleCleanupObserver = null
})
</script>

<style scoped>
.trend-panel-card {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border-color: #e2e8f0;
  background-color: #ffffff;
}

.trend-panel-section {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  padding: 12px 14px;
}

.trend-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 8px;
  margin-bottom: 6px;
  border-bottom: 1px solid #f1f5f9;
}

.trend-panel-header__left {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.trend-panel-header__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background-color: #e0f2fe;
  color: #0284c7;
  flex-shrink: 0;
}

.trend-panel-header__title {
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.2;
  color: #0f172a;
}

.trend-panel-header__subtitle {
  font-size: 0.72rem;
  color: #64748b;
  margin-top: 1px;
}

.trend-chart-wrapper {
  width: 100%;
  min-height: 185px;
  max-height: 185px;
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

.trend-chart-wrapper :deep(.apexcharts-canvas:focus),
.trend-chart-wrapper :deep(.apexcharts-canvas:focus-visible),
.trend-chart-wrapper :deep(.apexcharts-svg:focus),
.trend-chart-wrapper :deep(.apexcharts-svg:focus-visible),
.trend-chart-wrapper :deep(svg:focus),
.trend-chart-wrapper :deep(svg:focus-visible) {
  outline: none !important;
  box-shadow: none !important;
}

:global(body.body--dark) .trend-panel-card {
  background-color: var(--dm-surface, #1b2330);
  border-color: var(--dm-border, #324258);
}

:global(body.body--dark) .trend-panel-header {
  border-bottom-color: var(--dm-border, #324258);
}

:global(body.body--dark) .trend-panel-header__icon {
  background-color: rgba(14, 165, 233, 0.2);
  color: #7dd3fc;
}

:global(body.body--dark) .trend-panel-header__title {
  color: var(--dm-text-primary, #e6edf5);
}

:global(body.body--dark) .trend-panel-header__subtitle {
  color: var(--dm-text-muted, #a4b1c2);
}

@media (max-width: 1199px) {
  .trend-chart-wrapper {
    min-height: 165px;
    max-height: 165px;
  }
}
</style>
