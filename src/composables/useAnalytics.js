import { buildAlignedApexTooltip } from 'src/composables/useAlignedApexTooltip'

export const analyticsPalette = {
  primary: '#1f7a4d',
  secondary: '#2563eb',
  accent: '#f59e0b',
  positive: '#16a34a',
  warning: '#f97316',
  negative: '#dc2626',
  info: '#0891b2',
  violet: '#7c3aed',
  slate: '#475569',
  muted: '#94a3b8',
}

export function getGeneration(age) {
  const parsedAge = Number(age)
  if (!Number.isFinite(parsedAge) || parsedAge <= 0) return 'Unknown'
  if (parsedAge <= 28) return 'Gen Z'
  if (parsedAge <= 44) return 'Millennials'
  if (parsedAge <= 60) return 'Gen X'
  return 'Boomers'
}

export function getAgeGroup(age) {
  const parsedAge = Number(age)
  if (!Number.isFinite(parsedAge) || parsedAge <= 0) return 'Unknown'
  if (parsedAge <= 25) return '18-25'
  if (parsedAge <= 35) return '26-35'
  if (parsedAge <= 45) return '36-45'
  if (parsedAge <= 55) return '46-55'
  return '56+'
}

export function calculateUtilization(usedDays, availableDays) {
  const used = Number(usedDays)
  const available = Number(availableDays)
  if (!Number.isFinite(used) || !Number.isFinite(available) || available <= 0) return 0
  return Number(((used / available) * 100).toFixed(1))
}

export function generateMonthlyLabels(format = 'short') {
  const shortLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  if (format === 'long') {
    return [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]
  }
  return shortLabels
}

export function formatChartData(values, labels = generateMonthlyLabels()) {
  return labels.map((label, index) => ({
    label,
    value: Number(values?.[index] ?? 0),
  }))
}

export function useAnalytics() {
  const buildBaseOptions = ({
    isDark = false,
    categories = [],
    colors = [],
    stacked = false,
    horizontal = false,
    yFormatter = null,
    xFormatter = null,
    legendPosition = 'bottom',
  } = {}) => {
    const axisColor = isDark ? '#cad5e4' : '#64748b'
    const gridColor = isDark ? '#334155' : '#e2e8f0'

    return {
      chart: {
        toolbar: { show: false },
        zoom: { enabled: false },
        stacked,
        fontFamily: 'inherit',
        foreColor: axisColor,
        animations: { easing: 'easeinout', speed: 450 },
      },
      theme: { mode: isDark ? 'dark' : 'light' },
      colors: colors.length ? colors : [
        analyticsPalette.primary,
        analyticsPalette.secondary,
        analyticsPalette.accent,
        analyticsPalette.info,
        analyticsPalette.violet,
        analyticsPalette.muted,
      ],
      dataLabels: { enabled: false },
      grid: {
        borderColor: gridColor,
        strokeDashArray: 4,
      },
      legend: {
        position: legendPosition,
        fontSize: '12px',
        markers: { size: 8 },
      },
      xaxis: {
        categories,
        labels: {
          style: { colors: axisColor },
          formatter: xFormatter || undefined,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: axisColor },
          formatter: horizontal
            ? undefined
            : yFormatter || ((value) => String(Math.round(value))),
        },
      },
      plotOptions: {
        bar: {
          horizontal,
          borderRadius: 6,
          columnWidth: '48%',
          barHeight: '58%',
        },
      },
      tooltip: {
        theme: isDark ? 'dark' : 'light',
      },
      noData: {
        text: 'No analytics data available.',
        style: { color: axisColor },
      },
    }
  }

  const buildLineOptions = (settings = {}) => ({
    ...buildBaseOptions(settings),
    stroke: {
      curve: 'smooth',
      width: settings.strokeWidth ?? 3,
    },
    markers: {
      size: settings.markerSize ?? 4,
      strokeWidth: 2,
      hover: { sizeOffset: 2 },
    },
    tooltip: {
      custom: buildAlignedApexTooltip(settings),
    },
  })

  const buildAreaOptions = (settings = {}) => ({
    ...buildLineOptions(settings),
    fill: {
      type: 'gradient',
      gradient: {
        opacityFrom: 0.34,
        opacityTo: 0.06,
        stops: [0, 88, 100],
      },
    },
  })

  const buildBarOptions = (settings = {}) => ({
    ...buildBaseOptions(settings),
    stroke: {
      show: true,
      width: 1,
      colors: ['transparent'],
    },
  })

  const buildDonutOptions = ({
    isDark = false,
    labels = [],
    colors = [],
    valueSuffix = '',
    totalLabel = 'Total',
  } = {}) => {
    const textColor = isDark ? '#e6edf5' : '#0f172a'
    const mutedColor = isDark ? '#a4b1c2' : '#64748b'

    return {
      chart: {
        toolbar: { show: false },
        fontFamily: 'inherit',
        foreColor: mutedColor,
      },
      theme: { mode: isDark ? 'dark' : 'light' },
      labels,
      colors: colors.length ? colors : [
        analyticsPalette.primary,
        analyticsPalette.secondary,
        analyticsPalette.accent,
        analyticsPalette.warning,
        analyticsPalette.violet,
        analyticsPalette.muted,
      ],
      stroke: {
        width: 3,
        colors: [isDark ? '#1b2330' : '#ffffff'],
      },
      legend: {
        position: 'bottom',
        fontSize: '12px',
      },
      dataLabels: {
        enabled: true,
        formatter: (value) => `${Math.round(value)}%`,
      },
      plotOptions: {
        pie: {
          donut: {
            size: '68%',
            labels: {
              show: true,
              name: {
                color: mutedColor,
              },
              value: {
                color: textColor,
                formatter: (value) => `${Number(value).toLocaleString()}${valueSuffix}`,
              },
              total: {
                show: true,
                label: totalLabel,
                color: mutedColor,
                formatter: (chart) =>
                  chart.globals.seriesTotals
                    .reduce((sum, value) => sum + Number(value || 0), 0)
                    .toLocaleString(),
              },
            },
          },
        },
      },
      tooltip: {
        y: {
          formatter: (value) => `${Number(value).toLocaleString()}${valueSuffix}`,
        },
      },
      noData: {
        text: 'No distribution data available.',
        style: { color: mutedColor },
      },
    }
  }

  return {
    analyticsPalette,
    getGeneration,
    getAgeGroup,
    calculateUtilization,
    formatChartData,
    generateMonthlyLabels,
    buildBaseOptions,
    buildLineOptions,
    buildAreaOptions,
    buildBarOptions,
    buildDonutOptions,
  }
}
