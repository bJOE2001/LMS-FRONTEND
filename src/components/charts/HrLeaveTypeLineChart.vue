<template>
  <q-card flat bordered class="trend-panel-card full-height">
    <q-card-section class="trend-panel-section">
      <div class="trend-panel-header">
        <div class="trend-panel-header__left">
          <span class="trend-panel-header__icon" aria-hidden="true">
            <q-icon name="show_chart" size="18px" />
          </span>
          <div class="trend-panel-header__copy">
            <div class="trend-panel-header__title">Leave Type Line Chart</div>
            <div class="trend-panel-header__subtitle">
              By leave type for {{ resolvedTrendYearLabel }}
            </div>
          </div>
        </div>

        <div class="trend-panel-filters">
          <q-select
            v-model="officeFilter"
            :options="officeFilterOptions"
            emit-value
            map-options
            outlined
            dense
            label="Office"
            class="trend-panel-filter-select"
            :disable="loading"
          />
          <q-select
            v-model="leaveTypeFilter"
            :options="leaveTypeFilterOptions"
            outlined
            dense
            label="Leave Type"
            class="trend-panel-filter-select"
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
        <ChartSkeleton
          :loading="loading"
          :has-data="hasChartData"
          variant="line"
          height="175px"
          label="Updating leave types..."
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import VueApexCharts from 'vue3-apexcharts'
import { formatOfficeAbbreviation, resolveOfficeAcronymLabel } from 'src/utils/office-acronym'

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

const $q = useQuasar()
const isDark = computed(() => $q.dark.isActive)
const chartGridColor = computed(() => (isDark.value ? '#3a4d66' : '#e0e0e0'))
const chartAxisColor = computed(() => (isDark.value ? '#bdd0e5' : '#6b7280'))
const chartMarkerStrokeColor = computed(() => (isDark.value ? '#1b2330' : '#ffffff'))
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const leaveTypeChartPalette = ['#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#e53935', '#00897b', '#6d4c41', '#7cb342', '#3949ab', '#f4511e']
const ALL_OFFICES_FILTER = '__ALL_OFFICES__'
const leaveTypeFilter = ref('All')
const officeFilter = ref(ALL_OFFICES_FILTER)
const trendChartHeight = computed(() => ($q.screen.lt.lg ? 165 : 185))
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

function normalizeOfficeName(value) {
  const normalized = String(value || '').trim()
  return normalized || 'Unassigned'
}

function getApplicationOffice(application) {
  const candidates = [
    application?.office,
    application?.department,
    application?.office_name,
    application?.department_name,
    application?.employee?.office,
    application?.employee?.department,
    application?.user?.department_name,
  ]

  for (const candidate of candidates) {
    const normalized = String(candidate || '').trim()
    if (normalized) return normalizeOfficeName(normalized)
  }

  return 'Unassigned'
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

const officeFilterOptions = computed(() => {
  const officeLabelsByKey = new Map()

  for (const application of props.applications) {
    if (!isApprovedApplication(application)) continue
    const office = getApplicationOffice(application)
    const acronym = resolveOfficeAcronymLabel(application)
    const displayLabel = acronym || formatOfficeAbbreviation(office)
    const existingLabel = officeLabelsByKey.get(office)

    if (!existingLabel || (existingLabel === office && acronym)) {
      officeLabelsByKey.set(office, displayLabel)
    }
  }

  return [
    { label: 'All Offices', value: ALL_OFFICES_FILTER },
    ...Array.from(officeLabelsByKey.entries())
      .sort(([, leftLabel], [, rightLabel]) => leftLabel.localeCompare(rightLabel))
      .map(([office, displayLabel]) => ({
        label: displayLabel,
        value: office,
      })),
  ]
})

watch(
  officeFilterOptions,
  (options) => {
    const optionValues = options.map((option) => option.value)
    if (!optionValues.includes(officeFilter.value)) {
      officeFilter.value = ALL_OFFICES_FILTER
    }
  },
  { immediate: true },
)

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
  const shouldUseAnalyticsPayload = officeFilter.value === ALL_OFFICES_FILTER

  if (shouldUseAnalyticsPayload && leaveTypeTrendPayload && typeof leaveTypeTrendPayload === 'object') {
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
    if (
      officeFilter.value !== ALL_OFFICES_FILTER &&
      getApplicationOffice(application) !== officeFilter.value
    ) {
      continue
    }

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
  flex: 1 1 auto;
  min-width: 0;
}

.trend-panel-header__copy {
  flex: 1 1 auto;
  min-width: 0;
}

.trend-panel-header__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background-color: #dcfce7;
  color: #15803d;
  flex-shrink: 0;
}

.trend-panel-header__title {
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.2;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trend-panel-header__subtitle {
  font-size: 0.72rem;
  color: #64748b;
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trend-panel-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.trend-panel-filter-select {
  width: 145px;
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
  background-color: rgba(34, 197, 94, 0.18);
  color: #86efac;
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

@media (max-width: 639.98px) {
  .trend-panel-header {
    flex-direction: column;
    align-items: stretch;
  }

  .trend-panel-filters {
    width: 100%;
  }

  .trend-panel-filter-select {
    flex: 1 1 0;
    width: auto;
  }
}
</style>
