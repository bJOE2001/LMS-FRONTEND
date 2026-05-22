<template>
  <BaseAnalyticsChart title="Gender Leave Trend" subtitle="Monthly leave requests by gender" type="line" :height="320" :loading="loading" :series="chart.series" :options="options" />
</template>

<script setup>
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import BaseAnalyticsChart from './BaseAnalyticsChart.vue'
import { useAnalytics } from 'src/composables/useAnalytics'

const props = defineProps({ chart: { type: Object, required: true }, loading: { type: Boolean, default: false } })
const $q = useQuasar()
const { buildLineOptions } = useAnalytics()
const options = computed(() => buildLineOptions({ isDark: $q.dark.isActive, categories: props.chart.labels, colors: ['#2563eb', '#db2777'], markerSize: 3 }))
</script>
