<template>
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

const {
  isDark,
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
.trend-chart-wrapper {
  width: 100%;
  min-height: 260px;
  max-height: 260px;
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
    min-height: 220px;
    max-height: 220px;
  }
}
</style>
