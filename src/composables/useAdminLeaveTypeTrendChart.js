import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import {
  getApplicationDate,
  getApplicationLeaveType,
  isApprovedApplication,
  monthLabels,
  normalizeLeaveTypeName,
  normalizeTrendBuckets,
} from 'src/composables/useAdminChartUtils'

export function useAdminLeaveTypeTrendChart(props) {
  const $q = useQuasar()

  const isDark = computed(() => $q.dark.isActive)
  const chartGridColor = computed(() => (isDark.value ? '#3a4d66' : '#e0e0e0'))
  const chartAxisColor = computed(() => (isDark.value ? '#bdd0e5' : '#6b7280'))
  const chartMarkerStrokeColor = computed(() => (isDark.value ? '#1b2330' : '#ffffff'))
  const trendChartHeight = computed(() => ($q.screen.lt.lg ? 220 : 260))
  const leaveTypeFilter = ref('All')
  const leaveTypeChartPalette = ['#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#e53935', '#00897b', '#6d4c41', '#7cb342', '#3949ab', '#f4511e']

  const currentYear = new Date().getFullYear()
  const trendYearLabel = computed(() => {
    const parsed = Number(props.analytics?.trend_year)
    if (!Number.isFinite(parsed) || parsed < 2000) return currentYear
    return Math.round(parsed)
  })

  const leaveTypeMonthlyTrendMap = computed(() => {
    const trendMap = new Map()
    const leaveTypeTrendPayload = props.analytics?.leave_type_monthly_trend

    if (leaveTypeTrendPayload && typeof leaveTypeTrendPayload === 'object') {
      for (const [rawLeaveType, buckets] of Object.entries(leaveTypeTrendPayload)) {
        const leaveTypeName = normalizeLeaveTypeName(rawLeaveType)
        const normalizedBuckets = normalizeTrendBuckets(buckets)
        const existingBuckets = trendMap.get(leaveTypeName)

        if (existingBuckets) {
          trendMap.set(
            leaveTypeName,
            existingBuckets.map((count, index) => count + normalizedBuckets[index]),
          )
        } else {
          trendMap.set(leaveTypeName, normalizedBuckets)
        }
      }

      return trendMap
    }

    for (const application of props.applications) {
      if (!isApprovedApplication(application)) continue

      const rawDate = getApplicationDate(application)
      if (!rawDate) continue

      const parsedDate = new Date(rawDate)
      if (Number.isNaN(parsedDate.getTime())) continue
      if (parsedDate.getFullYear() !== trendYearLabel.value) continue

      const leaveTypeName = getApplicationLeaveType(application)
      if (!trendMap.has(leaveTypeName)) {
        trendMap.set(leaveTypeName, Array(12).fill(0))
      }

      trendMap.get(leaveTypeName)[parsedDate.getMonth()] += 1
    }

    return trendMap
  })

  const leaveTypeFilterOptions = computed(() => [
    'All',
    ...Array.from(leaveTypeMonthlyTrendMap.value.keys()).sort((left, right) => left.localeCompare(right)),
  ])

  watch(
    leaveTypeFilterOptions,
    (options) => {
      if (!options.includes(leaveTypeFilter.value)) {
        leaveTypeFilter.value = 'All'
      }
    },
    { immediate: true },
  )

  const leaveTypeTrendSeries = computed(() => {
    const trendEntries = Array.from(leaveTypeMonthlyTrendMap.value.entries())
      .sort(([left], [right]) => left.localeCompare(right))

    if (leaveTypeFilter.value === 'All') {
      return trendEntries.map(([leaveType, data]) => ({
        name: leaveType,
        data,
      }))
    }

    const selectedTypeData = leaveTypeMonthlyTrendMap.value.get(leaveTypeFilter.value)
    if (!selectedTypeData) return []

    return [
      {
        name: leaveTypeFilter.value,
        data: selectedTypeData,
      },
    ]
  })

  const leaveTypeTrendChartOptions = computed(() => ({
    chart: {
      id: 'admin-reports-leave-type-trend',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { easing: 'easeinout', speed: 450 },
      fontFamily: 'inherit',
      foreColor: chartAxisColor.value,
    },
    theme: {
      mode: isDark.value ? 'dark' : 'light',
    },
    colors: leaveTypeChartPalette,
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: 3,
    },
    markers: {
      size: 3,
      strokeWidth: 2,
      colors: leaveTypeChartPalette,
      strokeColors: chartMarkerStrokeColor.value,
      hover: { sizeOffset: 2 },
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
    legend: {
      show: false,
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value) => `${Math.round(value)} leaves`,
      },
    },
    noData: {
      text: 'No leave data for selected leave type.',
      style: { color: chartAxisColor.value },
    },
  }))

  return {
    isDark,
    leaveTypeFilter,
    leaveTypeFilterOptions,
    trendYearLabel,
    trendChartHeight,
    leaveTypeTrendSeries,
    leaveTypeTrendChartOptions,
  }
}
