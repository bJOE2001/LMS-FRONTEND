<template>
  <q-card flat bordered class="rounded-borders full-height">
    <q-card-section>
      <div class="row items-center justify-between q-mb-sm">
        <div>
          <div class="text-h6">Leave Trends by Month</div>
          <p class="text-caption text-grey-7 q-mb-none">analytics preview for {{ trendYearLabel }}</p>
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
import { useAdminMonthlyTrendChart } from 'src/composables/useAdminMonthlyTrendChart'

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
  trendYearLabel,
  trendChartHeight,
  trendChartSeries,
  trendChartOptions,
} = useAdminMonthlyTrendChart(props)

const { chartRoot } = useApexChartTitleCleanup([
  trendChartSeries,
  trendChartOptions,
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
