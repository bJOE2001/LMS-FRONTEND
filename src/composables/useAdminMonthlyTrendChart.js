import { computed } from 'vue'
import { useQuasar } from 'quasar'
import {
  getApplicationDate,
  isApprovedApplication,
  monthLabels,
  normalizeTrendBuckets,
} from 'src/composables/useAdminChartUtils'

export function useAdminMonthlyTrendChart(props) {
  const $q = useQuasar()

  const isDark = computed(() => $q.dark.isActive)
  const chartGridColor = computed(() => (isDark.value ? '#3a4d66' : '#e0e0e0'))
  const chartAxisColor = computed(() => (isDark.value ? '#bdd0e5' : '#6b7280'))
  const chartMarkerStrokeColor = computed(() => (isDark.value ? '#1b2330' : '#ffffff'))
  const trendChartHeight = computed(() => ($q.screen.lt.lg ? 220 : 260))

  const currentYear = new Date().getFullYear()
  const trendYearLabel = computed(() => {
    const parsed = Number(props.analytics?.trend_year)
    if (!Number.isFinite(parsed) || parsed < 2000) return currentYear
    return Math.round(parsed)
  })

  const monthlyLeaveTrend = computed(() => {
    const hasBackendMonthlyTrend =
      props.analytics && typeof props.analytics === 'object' && props.analytics.monthly_leave_trend != null

    if (hasBackendMonthlyTrend) {
      return normalizeTrendBuckets(props.analytics.monthly_leave_trend)
    }

    const buckets = Array(12).fill(0)

    for (const application of props.applications) {
      if (!isApprovedApplication(application)) continue

      const rawDate = getApplicationDate(application)
      if (!rawDate) continue

      const parsedDate = new Date(rawDate)
      if (Number.isNaN(parsedDate.getTime())) continue
      if (parsedDate.getFullYear() !== trendYearLabel.value) continue

      buckets[parsedDate.getMonth()] += 1
    }

    return buckets
  })

  const trendChartSeries = computed(() => [
    {
      name: 'Leave Applications',
      data: monthlyLeaveTrend.value,
    },
  ])

  const trendChartOptions = computed(() => ({
    chart: {
      id: 'admin-leave-trend',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { easing: 'easeinout', speed: 450 },
      fontFamily: 'inherit',
      foreColor: chartAxisColor.value,
    },
    theme: {
      mode: isDark.value ? 'dark' : 'light',
    },
    colors: ['#1e88e5'],
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: 3,
    },
    markers: {
      size: 4,
      strokeWidth: 2,
      colors: ['#1e88e5'],
      strokeColors: chartMarkerStrokeColor.value,
      hover: { sizeOffset: 2 },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 0.7,
        opacityFrom: 0.35,
        opacityTo: 0.06,
        stops: [0, 90, 100],
      },
    },
    grid: {
      borderColor: chartGridColor.value,
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
    xaxis: {
      categories: monthLabels,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: chartAxisColor.value } },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      tickAmount: 4,
      labels: {
        style: { colors: chartAxisColor.value },
        formatter: (value) => String(Math.round(value)),
      },
    },
    legend: { show: false },
    tooltip: {
      y: {
        formatter: (value) => `${Math.round(value)} leaves`,
      },
    },
    noData: {
      text: 'No leave trend data available.',
      style: { color: chartAxisColor.value },
    },
  }))

  return {
    isDark,
    trendYearLabel,
    trendChartHeight,
    trendChartSeries,
    trendChartOptions,
  }
}
