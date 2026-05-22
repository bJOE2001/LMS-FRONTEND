<template>
  <BaseAnalyticsChart title="Leave Type by Gender" subtitle="Male and female usage stacked by leave type" type="bar" badge="Stacked" :height="400" :loading="loading" :series="chart.series" :options="options" />
</template>

<script setup>
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import BaseAnalyticsChart from './BaseAnalyticsChart.vue'
import { useAnalytics } from 'src/composables/useAnalytics'

const props = defineProps({ chart: { type: Object, required: true }, loading: { type: Boolean, default: false } })
const $q = useQuasar()
const { buildBarOptions } = useAnalytics()
const leaveTypeShortLabels = computed(() =>
  props.chart.labels.map((label) => {
    const shortLabels = {
      '10-Day VAWC Leave': 'VAWC',
      'Adoption Leave': 'AL',
      'CTO Leave': 'CTO',
      'Mandatory / Forced Leave': 'MFL',
      'Maternity Leave': 'ML',
      'Monetization Leave': 'MON',
      'Paternity Leave': 'PL',
      'Rehabilitation Leave': 'RL',
      'Sick Leave': 'SL',
      'Solo Parent Leave': 'SPL',
      'Special Emergency (Calamity) Leave': 'SECL',
      'Special Leave Benefits for Women': 'SLBW',
      'Special Privilege Leave(MC06)': 'SPL6',
      'Study Leave': 'STL',
      'Terminal Leave': 'TL',
      'Vacation Leave': 'VL',
      'Wellness Leave': 'WL',
    }
    return shortLabels[label] ?? label
  }),
)
const options = computed(() => ({
  ...buildBarOptions({
  isDark: $q.dark.isActive,
  categories: leaveTypeShortLabels.value,
  colors: ['#2563eb', '#db2777'],
  stacked: true,
}),
  tooltipTitleLabels: props.chart.labels,
}))
</script>
