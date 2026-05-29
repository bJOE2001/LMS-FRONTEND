<template>
  <BaseAnalyticsChart title="Generation Distribution" subtitle="Workforce by generation (age ranges)" type="donut" :height="320" :loading="loading" :series="filteredSeries" :options="options" />
</template>

<script setup>
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import BaseAnalyticsChart from './BaseAnalyticsChart.vue'
import { useAnalytics } from 'src/composables/useAnalytics'

const props = defineProps({ chart: { type: Object, required: true }, loading: { type: Boolean, default: false } })
const $q = useQuasar()
const { buildDonutOptions } = useAnalytics()
const generationLabelWithAgeRange = {
  'gen z': 'Gen Z (18-29)',
  millennial: 'Millennial (30-45)',
  'gen x': 'Gen X (46-61)',
  'baby boomer': 'Baby Boomer (62-80)',
  'silent generation': 'Silent Generation (81+)',
}

const filteredLabels = computed(() => {
  const labels = Array.isArray(props.chart?.labels) ? props.chart.labels : []
  return labels
    .map((label) => String(label ?? '').trim())
    .filter((label) => label.toLowerCase() !== 'unknown')
    .map((label) => generationLabelWithAgeRange[label.toLowerCase()] ?? label)
})

const filteredSeries = computed(() => {
  const labels = Array.isArray(props.chart?.labels) ? props.chart.labels : []
  const series = Array.isArray(props.chart?.series) ? props.chart.series : []
  const values = []

  for (let index = 0; index < labels.length; index += 1) {
    const normalizedLabel = String(labels[index] ?? '').trim().toLowerCase()
    if (normalizedLabel === 'unknown') {
      continue
    }

    const value = Number(series[index] ?? 0)
    values.push(Number.isFinite(value) ? value : 0)
  }

  return values
})

const options = computed(() =>
  buildDonutOptions({
    isDark: $q.dark.isActive,
    labels: filteredLabels.value,
    totalLabel: 'Employees',
  }),
)
</script>
