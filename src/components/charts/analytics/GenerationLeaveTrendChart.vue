<template>
  <BaseAnalyticsChart title="Generation Leave Trend" subtitle="Monthly leave requests by generation" type="line" :height="320" :loading="loading" :series="filteredSeries" :options="options" />
</template>

<script setup>
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import BaseAnalyticsChart from './BaseAnalyticsChart.vue'
import { useAnalytics } from 'src/composables/useAnalytics'

const props = defineProps({ chart: { type: Object, required: true }, loading: { type: Boolean, default: false } })
const $q = useQuasar()
const { buildLineOptions } = useAnalytics()

const filteredSeries = computed(() => {
  const rawSeries = Array.isArray(props.chart?.series) ? props.chart.series : []

  return rawSeries.filter((entry) => {
    const label = String(entry?.name ?? '').trim().toLowerCase()
    return label !== 'unknown'
  })
})

const options = computed(() => {
  const baseOptions = buildLineOptions({
    isDark: $q.dark.isActive,
    categories: props.chart.labels,
    markerSize: 3,
  })

  return {
    ...baseOptions,
    stroke: {
      ...(baseOptions.stroke ?? {}),
      curve: 'straight',
    },
  }
})
</script>
