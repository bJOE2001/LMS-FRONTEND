<template>
  <BaseAnalyticsChart title="Leave Usage by Generation" subtitle="Total leave days used" type="bar" :height="320" :loading="loading" :series="seriesForChart" :options="options" />
</template>

<script setup>
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import BaseAnalyticsChart from './BaseAnalyticsChart.vue'
import { useAnalytics, analyticsPalette } from 'src/composables/useAnalytics'

const props = defineProps({ chart: { type: Object, required: true }, loading: { type: Boolean, default: false } })
const $q = useQuasar()
const { buildBarOptions } = useAnalytics()
const generationLabelWithAgeRange = {
  'gen z': 'Gen Z (18-29)',
  millennial: 'Millennial (30-45)',
  'gen x': 'Gen X (46-61)',
  'baby boomer': 'Baby Boomer (62-80)',
  'silent generation': 'Silent Generation (81+)',
}

const transformedChart = computed(() => {
  const labels = Array.isArray(props.chart?.labels) ? props.chart.labels : []
  const rawSeries = Array.isArray(props.chart?.series) ? props.chart.series : []

  let values = []

  if (rawSeries.every((entry) => typeof entry === 'number')) {
    values = rawSeries.map((entry) => Number(entry ?? 0))
  } else if (rawSeries.length > 0 && Array.isArray(rawSeries[0]?.data)) {
    values = rawSeries[0].data.map((entry) => Number(entry ?? 0))
  }

  const filteredLabels = []
  const filteredValues = []

  for (let index = 0; index < labels.length; index += 1) {
    const normalizedLabel = String(labels[index] ?? '').trim()
    if (normalizedLabel.toLowerCase() === 'unknown') {
      continue
    }

    filteredLabels.push(generationLabelWithAgeRange[normalizedLabel.toLowerCase()] ?? normalizedLabel)
    const value = Number(values[index] ?? 0)
    filteredValues.push(Number.isFinite(value) ? value : 0)
  }

  return {
    labels: filteredLabels,
    values: filteredValues,
  }
})

const seriesForChart = computed(() => [
  {
    name: 'Leave Days',
    data: transformedChart.value.values,
  },
])

const options = computed(() =>
  buildBarOptions({
    isDark: $q.dark.isActive,
    categories: transformedChart.value.labels,
    colors: [analyticsPalette.violet],
  }),
)
</script>
