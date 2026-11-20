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
              By leave type for {{ trendYearLabel }}
            </div>
          </div>
        </div>

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
import { computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import { useApexChartTitleCleanup } from 'src/composables/useApexChartTitleCleanup'
import { useAdminLeaveTypeTrendChart } from 'src/composables/useAdminLeaveTypeTrendChart'

const props = defineProps({
  applications: {
    type: Array,
    default: () => [],
  },
  analytics: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const hasChartData = computed(() => (props.applications?.length || 0) > 0 || Boolean(props.analytics))

const {
  leaveTypeFilter,
  leaveTypeFilterOptions,
  trendYearLabel,
  trendChartHeight,
  leaveTypeTrendSeries,
  leaveTypeTrendChartOptions,
} = useAdminLeaveTypeTrendChart(props)

const { chartRoot } = useApexChartTitleCleanup([
  leaveTypeTrendSeries,
  leaveTypeTrendChartOptions,
  () => props.loading,
])
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

.trend-panel-filter-select {
  width: 155px;
  flex-shrink: 0;
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

  .trend-panel-filter-select {
    width: 100%;
  }
}
</style>
