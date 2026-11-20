<template>
  <q-card flat bordered class="manpower-card">
    <q-card-section class="manpower-card-section">
      <!-- Header -->
      <div class="manpower-header">
        <div class="manpower-header__left">
          <div class="manpower-header__title-row">
            <span class="manpower-header__icon" aria-hidden="true">
              <q-icon name="groups" size="18px" />
            </span>
            <div>
              <div class="manpower-header__title">Daily Manpower</div>
              <div class="manpower-header__date">
                <q-icon name="event" size="13px" class="q-mr-xs" />
                <span>Snapshot for {{ currentDateLabel || 'Today' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="manpower-total-pill">
          <span class="manpower-total-pill__label">Total Employees</span>
          <span class="manpower-total-pill__value tabular-nums">
            {{ formatCount(safeActiveEmployeeCount) }}
          </span>
        </div>
      </div>

      <!-- Content: Donut + Present / Absent / On Leave Cards -->
      <div ref="chartRoot" class="manpower-body chart-loading-host">
        <div class="manpower-grid" :class="{ 'is-empty-loading': loading && !hasChartData }">
          <div class="manpower-donut-box">
            <q-no-ssr>
              <VueApexCharts
                type="donut"
                width="150"
                height="150"
                :options="manpowerChartOptions"
                :series="manpowerChartSeries"
              />
            </q-no-ssr>
          </div>

          <div class="manpower-stats">
            <div
              v-for="item in statusBreakdownItems"
              :key="item.key"
              class="manpower-stat-row"
              :class="`manpower-stat-row--${item.variant}`"
            >
              <div class="manpower-stat-row__main">
                <span class="manpower-stat-row__label-wrap">
                  <span class="manpower-stat-row__dot" aria-hidden="true" />
                  <span class="manpower-stat-row__label">{{ item.label }}:</span>
                </span>
                <div class="manpower-stat-row__metrics">
                  <span class="manpower-stat-row__count tabular-nums">
                    {{ formatCount(item.count) }}
                  </span>
                  <span class="manpower-stat-row__pct tabular-nums">
                    {{ item.pctLabel }}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ChartSkeleton
          :loading="loading"
          :has-data="hasChartData"
          variant="pie"
          height="168px"
          label="Refreshing snapshot..."
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
  currentDateLabel: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  activeEmployeeCount: {
    type: Number,
    default: 0,
  },
  snapshot: {
    type: Object,
    default: () => ({
      presentCount: 0,
      absentCount: 0,
      onLeaveCount: 0,
      presentPercentage: 0,
      absentPercentage: 0,
      onLeavePercentage: 0,
    }),
  },
})

const hasChartData = computed(() => {
  const s = props.snapshot || {}
  const sum =
    Number(s.presentCount || 0) + Number(s.absentCount || 0) + Number(s.onLeaveCount || 0)
  return Number(props.activeEmployeeCount || 0) > 0 || sum > 0
})

const chartRoot = ref(null)
let chartTitleCleanupObserver = null
const $q = useQuasar()
const isDark = computed(() => $q.dark.isActive)
const chartTextColor = computed(() => (isDark.value ? '#d7e2ef' : '#526170'))

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

const safeActiveEmployeeCount = computed(() => Math.max(Number(props.activeEmployeeCount || 0), 0))

const normalizedSnapshot = computed(() => {
  const s = props.snapshot || {}
  const presentCount = Math.max(Number(s.presentCount || 0), 0)
  const onLeaveCount = Math.max(Number(s.onLeaveCount || 0), 0)
  const absentCount = Math.max(
    Number(s.absentCount ?? Math.max(safeActiveEmployeeCount.value - presentCount - onLeaveCount, 0)),
    0,
  )

  return {
    presentCount,
    absentCount,
    onLeaveCount,
    presentPercentage: Math.max(Number(s.presentPercentage || 0), 0),
    absentPercentage: Math.max(Number(s.absentPercentage || 0), 0),
    onLeavePercentage: Math.max(Number(s.onLeavePercentage || 0), 0),
  }
})

function clampPct(value) {
  return Math.min(Math.max(Number(value || 0), 0), 100)
}

const statusBreakdownItems = computed(() => {
  const s = normalizedSnapshot.value
  return [
    {
      key: 'present',
      label: 'Present',
      variant: 'present',
      count: s.presentCount,
      pctLabel: clampPct(s.presentPercentage).toFixed(1),
    },
    {
      key: 'absent',
      label: 'Absent',
      variant: 'absent',
      count: s.absentCount,
      pctLabel: clampPct(s.absentPercentage).toFixed(1),
    },
    {
      key: 'onLeave',
      label: 'On Leave',
      variant: 'leave',
      count: s.onLeaveCount,
      pctLabel: clampPct(s.onLeavePercentage).toFixed(1),
    },
  ]
})

const manpowerChartSeries = computed(() => [
  normalizedSnapshot.value.presentCount,
  normalizedSnapshot.value.absentCount,
  normalizedSnapshot.value.onLeaveCount,
])

function formatCount(value) {
  return Number(value || 0).toLocaleString('en-US')
}

const manpowerChartOptions = computed(() => ({
  chart: {
    id: 'hr-manpower-daily-percentage',
    type: 'donut',
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: { easing: 'easeinout', speed: 450 },
    fontFamily: 'inherit',
    foreColor: chartTextColor.value,
  },
  theme: {
    mode: isDark.value ? 'dark' : 'light',
  },
  labels: ['Present', 'Absent', 'On Leave'],
  colors: ['#16a34a', '#ef4444', '#f59e0b'],
  dataLabels: {
    enabled: false,
  },
  stroke: {
    width: 0,
  },
  legend: {
    show: false,
  },
  plotOptions: {
    pie: {
      expandOnClick: false,
      donut: {
        size: '62%',
        labels: {
          show: false,
        },
      },
    },
  },
  tooltip: {
    y: {
      formatter: (countValue, options) => {
        const pctByIndex = [
          normalizedSnapshot.value.presentPercentage,
          normalizedSnapshot.value.absentPercentage,
          normalizedSnapshot.value.onLeavePercentage,
        ]
        const pct = Number(pctByIndex[options.seriesIndex] || 0).toFixed(1)
        return `${formatCount(countValue)} (${pct}%)`
      },
    },
  },
  noData: {
    text: 'No current manpower data available.',
    style: {
      color: chartTextColor.value,
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

watch([manpowerChartSeries, manpowerChartOptions, () => props.loading], syncNativeChartTitleCleanup, {
  deep: true,
})

onBeforeUnmount(() => {
  chartTitleCleanupObserver?.disconnect()
  chartTitleCleanupObserver = null
})
</script>

<style scoped>
.manpower-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 12px;
  border-color: #e2e8f0;
  background-color: #ffffff;
}

.manpower-card-section {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  padding: 12px 14px;
}

.manpower-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 9px;
  margin-bottom: 10px;
  border-bottom: 1px solid #f1f5f9;
}

.manpower-header__title-row {
  display: flex;
  align-items: center;
  gap: 9px;
}

.manpower-header__icon {
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

.manpower-header__title {
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.2;
  color: #0f172a;
}

.manpower-header__date {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  color: #64748b;
  margin-top: 1px;
}

.manpower-total-pill {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 4px 10px;
  border-radius: 8px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.manpower-total-pill__label {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  line-height: 1.1;
}

.manpower-total-pill__value {
  font-size: 0.96rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.15;
}

.manpower-body {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  min-height: 152px;
}

.manpower-grid {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.manpower-grid.is-empty-loading {
  opacity: 0;
}

.manpower-donut-box {
  position: relative;
  width: 150px;
  height: 150px;
  flex: 0 0 150px;
  overflow: visible;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.manpower-stats {
  flex: 0 1 230px;
  min-width: 190px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.manpower-stat-row {
  --stat-accent: #16a34a;
  --stat-pill-bg: #dcfce7;
  --stat-pill-fg: #15803d;

  padding: 4px 0;
  display: flex;
  flex-direction: column;
}

.manpower-stat-row--absent {
  --stat-accent: #ef4444;
  --stat-pill-bg: #fee2e2;
  --stat-pill-fg: #b91c1c;
}

.manpower-stat-row--leave {
  --stat-accent: #f59e0b;
  --stat-pill-bg: #fef3c7;
  --stat-pill-fg: #b45309;
}

.manpower-stat-row__main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.manpower-stat-row__label-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.manpower-stat-row__dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background-color: var(--stat-accent);
  flex-shrink: 0;
}

.manpower-stat-row__label {
  min-width: 64px;
  text-align: right;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
}

.manpower-stat-row__metrics {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.manpower-stat-row__count {
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1;
  color: #0f172a;
}

.manpower-stat-row__pct {
  min-width: 42px;
  text-align: center;
  padding: 1px 5px;
  border-radius: 999px;
  background-color: var(--stat-pill-bg);
  color: var(--stat-pill-fg);
  font-size: 0.64rem;
  font-weight: 700;
}

.chart-loading-host {
  position: relative;
}

.manpower-donut-box :deep(.vue-apexcharts),
.manpower-donut-box :deep(.apexcharts-canvas),
.manpower-donut-box :deep(.apexcharts-svg) {
  outline: none !important;
  box-shadow: none !important;
}

:global(body.body--dark) .manpower-card {
  background-color: var(--dm-surface, #1b2330);
  border-color: var(--dm-border, #324258);
}

:global(body.body--dark) .manpower-header {
  border-bottom-color: var(--dm-border, #324258);
}

:global(body.body--dark) .manpower-header__icon {
  background-color: rgba(34, 197, 94, 0.18);
  color: #86efac;
}

:global(body.body--dark) .manpower-header__title,
:global(body.body--dark) .manpower-total-pill__value,
:global(body.body--dark) .manpower-stat-row__count {
  color: var(--dm-text-primary, #e6edf5);
}

:global(body.body--dark) .manpower-header__date,
:global(body.body--dark) .manpower-total-pill__label {
  color: var(--dm-text-muted, #a4b1c2);
}

:global(body.body--dark) .manpower-stat-row__label {
  color: var(--dm-text-secondary, #cad5e4);
}

:global(body.body--dark) .manpower-total-pill {
  background-color: var(--dm-surface-2, #212b3a);
  border-color: var(--dm-border, #324258);
}

:global(body.body--dark) .manpower-stat-row--present .manpower-stat-row__pct {
  background-color: rgba(34, 197, 94, 0.2);
  color: #86efac;
}

:global(body.body--dark) .manpower-stat-row--absent .manpower-stat-row__pct {
  background-color: rgba(239, 68, 68, 0.22);
  color: #fca5a5;
}

:global(body.body--dark) .manpower-stat-row--leave .manpower-stat-row__pct {
  background-color: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
}

@media (max-width: 639.98px) {
  .manpower-header {
    flex-wrap: wrap;
  }

  .manpower-grid {
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .manpower-stats {
    width: 100%;
    max-width: 240px;
    flex: none;
  }

  .manpower-donut-box {
    width: 150px;
    height: 150px;
    margin: 0 auto;
  }
}
</style>
