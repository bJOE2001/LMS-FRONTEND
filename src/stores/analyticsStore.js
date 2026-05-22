import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from 'src/boot/axios'

const ANALYTICS_ENDPOINT = '/hr/analytics'

const CHART_KEYS = [
  'employmentStatusDistribution',
  'leaveUsageByEmploymentStatus',
  'employmentStatusTrend',
  'generationDistribution',
  'leaveUsageByGeneration',
  'generationLeaveTrend',
  'ageGroupDistribution',
  'leaveUsageByAgeGroup',
  'averageLeaveDaysByAgeGroup',
  'genderDistribution',
  'leaveTypeByGender',
  'genderLeaveTrend',
]

function currentYearDateRange() {
  const year = new Date().getFullYear()
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  }
}

function emptyChart() {
  return {
    labels: [],
    series: [],
  }
}

function emptyCharts() {
  return CHART_KEYS.reduce((result, key) => {
    result[key] = emptyChart()
    return result
  }, {})
}

function normalizeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeLabels(value) {
  return Array.isArray(value) ? value.map((label) => String(label ?? '')) : []
}

function normalizeSeries(value) {
  if (!Array.isArray(value)) return []

  return value.map((entry) => {
    if (typeof entry === 'number') return normalizeNumber(entry)

    if (entry && typeof entry === 'object') {
      return {
        ...entry,
        name: String(entry.name ?? entry.label ?? 'Series'),
        data: Array.isArray(entry.data) ? entry.data.map(normalizeNumber) : [],
      }
    }

    return normalizeNumber(entry)
  })
}

function normalizeChart(value) {
  if (!value || typeof value !== 'object') return emptyChart()

  return {
    labels: normalizeLabels(value.labels ?? value.categories),
    series: normalizeSeries(value.series ?? value.data),
  }
}

function normalizeCharts(payload) {
  const source = payload?.charts && typeof payload.charts === 'object' ? payload.charts : payload
  const result = emptyCharts()

  if (!source || typeof source !== 'object') return result

  for (const key of CHART_KEYS) {
    result[key] = normalizeChart(source[key])
  }

  return result
}

function buildAnalyticsParams(filters) {
  return {
    date_from: filters.dateRange?.from || undefined,
    date_to: filters.dateRange?.to || undefined,
  }
}

export const useAnalyticsStore = defineStore('analytics', () => {
  const charts = ref(emptyCharts())
  const filters = ref({
    dateRange: currentYearDateRange(),
  })
  const loading = ref(false)
  const error = ref(null)
  const lastUpdated = ref(null)

  const hasCharts = computed(() =>
    Object.values(charts.value || {}).some((chart) => {
      if (!Array.isArray(chart?.series)) return false
      return chart.series.some((entry) => {
        if (typeof entry === 'number') return entry > 0
        return Array.isArray(entry?.data) && entry.data.some((value) => Number(value || 0) > 0)
      })
    }),
  )

  function setFilter(key, value) {
    filters.value = {
      ...filters.value,
      [key]: value,
    }
  }

  function resetFilters() {
    filters.value = {
      dateRange: currentYearDateRange(),
    }
  }

  function clearAnalytics() {
    charts.value = emptyCharts()
    lastUpdated.value = null
  }

  async function fetchAnalytics() {
    loading.value = true
    error.value = null

    try {
      const { data } = await api.get(ANALYTICS_ENDPOINT, {
        params: buildAnalyticsParams(filters.value),
      })

      charts.value = normalizeCharts(data)
      lastUpdated.value = new Date().toISOString()
    } catch (err) {
      clearAnalytics()
      error.value =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to load analytics data from the backend endpoint.'
    } finally {
      loading.value = false
    }
  }

  async function fetchAnalyticsFromApi() {
    return fetchAnalytics()
  }

  return {
    charts,
    filters,
    loading,
    error,
    lastUpdated,
    hasCharts,
    setFilter,
    resetFilters,
    clearAnalytics,
    fetchAnalytics,
    fetchAnalyticsFromApi,
  }
})
