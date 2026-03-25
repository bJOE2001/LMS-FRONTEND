<template>
  <q-card flat bordered class="rounded-borders full-width manpower-card">
    <q-card-section class="manpower-card-section">
      <div class="row items-center justify-between q-mb-sm">
        <div>
          <div class="text-h6">Daily Manpower Percentage</div>
          <p class="text-caption text-grey-7 q-mb-none">
            Snapshot for {{ currentDateLabel }}
          </p>
        </div>
        <div class="text-right">
          <div class="text-caption text-grey-7">Active Employees</div>
          <div class="text-subtitle1 text-weight-bold">{{ safeActiveEmployeeCount }}</div>
        </div>
      </div>

      <div class="manpower-chart-wrapper chart-loading-host">
        <q-no-ssr>
          <VueApexCharts
            type="pie"
            height="100%"
            :options="manpowerChartOptions"
            :series="manpowerChartSeries"
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
import { computed } from 'vue'
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
      availableCount: 0,
      onLeaveCount: 0,
      availablePercentage: 0,
      onLeavePercentage: 0,
    }),
  },
})

const safeActiveEmployeeCount = computed(() => Math.max(Number(props.activeEmployeeCount || 0), 0))

const normalizedSnapshot = computed(() => ({
  availableCount: Math.max(Number(props.snapshot?.availableCount || 0), 0),
  onLeaveCount: Math.max(Number(props.snapshot?.onLeaveCount || 0), 0),
  availablePercentage: Math.max(Number(props.snapshot?.availablePercentage || 0), 0),
  onLeavePercentage: Math.max(Number(props.snapshot?.onLeavePercentage || 0), 0),
}))

const manpowerChartSeries = computed(() => [
  normalizedSnapshot.value.availablePercentage,
  normalizedSnapshot.value.onLeavePercentage,
])

const manpowerChartOptions = computed(() => ({
  chart: {
    id: 'hr-manpower-daily-percentage',
    type: 'pie',
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: { easing: 'easeinout', speed: 450 },
    fontFamily: 'inherit',
  },
  labels: ['Available', 'On Leave'],
  colors: ['#2e7d32', '#fb8c00'],
  dataLabels: {
    enabled: true,
    formatter: (value) => `${Number(value).toFixed(1)}%`,
  },
  stroke: {
    width: 1,
    colors: ['#ffffff'],
  },
  legend: {
    show: true,
    position: 'right',
    horizontalAlign: 'left',
    formatter: (seriesName, options) => {
      const chartValue = Number(options?.w?.globals?.series?.[options.seriesIndex] || 0).toFixed(1)
      const countValue = options.seriesIndex === 0
        ? normalizedSnapshot.value.availableCount
        : normalizedSnapshot.value.onLeaveCount
      return `${seriesName}: ${countValue} (${chartValue}%)`
    },
  },
  responsive: [
    {
      breakpoint: 600,
      options: {
        legend: {
          position: 'bottom',
        },
        plotOptions: {
          pie: {
            customScale: 0.96,
          },
        },
      },
    },
  ],
  plotOptions: {
    pie: {
      customScale: 1,
      expandOnClick: false,
      dataLabels: {
        offset: -2,
      },
    },
  },
  tooltip: {
    y: {
      formatter: (value, options) => {
        const countValue = options.seriesIndex === 0
          ? normalizedSnapshot.value.availableCount
          : normalizedSnapshot.value.onLeaveCount
        return `${countValue} employee(s) | ${Number(value).toFixed(2)}%`
      },
    },
  },
  noData: {
    text: 'No current manpower data available.',
  },
}))
</script>

<style scoped>
.manpower-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.manpower-card-section {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.manpower-chart-wrapper {
  width: 100%;
  flex: 1 1 auto;
  min-height: 260px;
  max-height: 260px;
}

.chart-loading-host {
  position: relative;
}

.chart-loading {
  background: rgba(255, 255, 255, 0.72);
}

.manpower-chart-wrapper :deep(.q-no-ssr),
.manpower-chart-wrapper :deep(.vue-apexcharts),
.manpower-chart-wrapper :deep(.apexcharts-canvas),
.manpower-chart-wrapper :deep(.apexcharts-svg) {
  height: 100% !important;
}

@media (max-width: 1199px) {
  .manpower-chart-wrapper {
    min-height: 220px;
    max-height: 220px;
  }
}
</style>
