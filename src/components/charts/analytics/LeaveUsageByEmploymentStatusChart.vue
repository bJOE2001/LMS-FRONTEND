<template>
  <BaseAnalyticsChart title="Leave Usage by Employment Status" subtitle="Total leave days used" type="bar" :height="320" :loading="loading" :series="chart.series" :options="options" />
</template>

<script setup>
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import BaseAnalyticsChart from './BaseAnalyticsChart.vue'
import { useAnalytics, analyticsPalette } from 'src/composables/useAnalytics'

const props = defineProps({ chart: { type: Object, required: true }, loading: { type: Boolean, default: false } })
const $q = useQuasar()
const { buildBarOptions } = useAnalytics()
const options = computed(() => buildBarOptions({ isDark: $q.dark.isActive, categories: props.chart.labels, colors: [analyticsPalette.info], horizontal: true }))
</script>
