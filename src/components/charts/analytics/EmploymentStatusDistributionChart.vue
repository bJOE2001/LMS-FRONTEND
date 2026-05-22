<template>
  <BaseAnalyticsChart title="Employment Status Distribution" subtitle="Current employee composition" type="donut" :height="320" :loading="loading" :series="chart.series" :options="options" />
</template>

<script setup>
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import BaseAnalyticsChart from './BaseAnalyticsChart.vue'
import { useAnalytics } from 'src/composables/useAnalytics'

const props = defineProps({ chart: { type: Object, required: true }, loading: { type: Boolean, default: false } })
const $q = useQuasar()
const { buildDonutOptions } = useAnalytics()
const options = computed(() => buildDonutOptions({ isDark: $q.dark.isActive, labels: props.chart.labels, totalLabel: 'Employees' }))
</script>
