import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from 'src/boot/axios'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const GROUP_BY_VALUES = ['daily', 'weekly', 'monthly', 'yearly']
const LEAVE_TYPE_KEYS = [
  'vacationLeave',
  'sickLeave',
  'mandatoryForcedLeave',
  'wellnessLeave',
  'maternityLeave',
  'paternityLeave',
  'specialPrivilegeLeave',
  'soloParentLeave',
]
const CURRENT_DATE = new Date()
const CURRENT_YEAR = CURRENT_DATE.getFullYear()
const CURRENT_MONTH = CURRENT_DATE.getMonth() + 1
const CURRENT_DATE_ISO = CURRENT_DATE.toISOString().slice(0, 10)

function normalizeGroupBy(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()

  return GROUP_BY_VALUES.includes(normalized) ? normalized : 'daily'
}

function normalizeFilterDate(value) {
  const normalized = String(value || '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : CURRENT_DATE_ISO
}

function normalizeFilterMonth(value) {
  const month = Number(value)
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : CURRENT_MONTH
}

function normalizeFilterYear(value) {
  const year = Number(value)
  return Number.isInteger(year) && year >= 1900 && year <= 3000 ? year : CURRENT_YEAR
}

function normalizeFilterByGroup(groupBy, { filterDate, filterMonth, filterYear } = {}) {
  const normalizedGroupBy = normalizeGroupBy(groupBy)

  if (normalizedGroupBy === 'daily' || normalizedGroupBy === 'weekly') {
    return {
      groupBy: normalizedGroupBy,
      filterDate: normalizeFilterDate(filterDate),
      filterMonth: null,
      filterYear: null,
    }
  }

  if (normalizedGroupBy === 'monthly') {
    return {
      groupBy: normalizedGroupBy,
      filterDate: null,
      filterMonth: normalizeFilterMonth(filterMonth),
      filterYear: normalizeFilterYear(filterYear),
    }
  }

  return {
    groupBy: normalizedGroupBy,
    filterDate: null,
    filterMonth: null,
    filterYear: normalizeFilterYear(filterYear),
  }
}

function buildRequestKey(apiEndpoint, groupBy, secondaryFilter = {}) {
  const normalized = normalizeFilterByGroup(groupBy, secondaryFilter)
  return `${apiEndpoint}::${normalized.groupBy}::${normalized.filterDate ?? ''}::${normalized.filterMonth ?? ''}::${normalized.filterYear ?? ''}`
}

function toSafeCount(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return Math.round(parsed)
}

function normalizeRow(rawRow, index) {
  if (!rawRow || typeof rawRow !== 'object' || Array.isArray(rawRow)) return null

  const groupBy = normalizeGroupBy(rawRow.groupBy)
  const groupKey = String(rawRow.groupKey || '').trim()
  const groupLabel = String(rawRow.groupLabel || '').trim()
  const department = String(rawRow.department || '').trim()

  if (!groupKey || !groupLabel || !department) return null

  const normalizedRow = {
    rowKey: `${groupKey}|${department}|${index}`,
    groupBy,
    groupKey,
    groupLabel,
    department,
  }

  for (const leaveTypeKey of LEAVE_TYPE_KEYS) {
    normalizedRow[leaveTypeKey] = toSafeCount(rawRow[leaveTypeKey])
  }

  return normalizedRow
}

function normalizeRows(payload) {
  if (!Array.isArray(payload)) return []

  return payload
    .map((rawRow, index) => normalizeRow(rawRow, index))
    .filter((row) => row != null)
}

export const useDepartmentStatisticsStore = defineStore('department-statistics', () => {
  const rowsByRequestKey = ref({})
  const loadingByRequestKey = ref({})
  const loadedByRequestKey = ref({})
  const errorByRequestKey = ref({})

  const isAnyLoading = computed(() => Object.values(loadingByRequestKey.value).some(Boolean))

  function getRows(apiEndpoint, groupBy, secondaryFilter = {}) {
    const requestKey = buildRequestKey(apiEndpoint, groupBy, secondaryFilter)
    return rowsByRequestKey.value[requestKey] || []
  }

  function isLoading(apiEndpoint, groupBy, secondaryFilter = {}) {
    const requestKey = buildRequestKey(apiEndpoint, groupBy, secondaryFilter)
    return Boolean(loadingByRequestKey.value[requestKey])
  }

  function getError(apiEndpoint, groupBy, secondaryFilter = {}) {
    const requestKey = buildRequestKey(apiEndpoint, groupBy, secondaryFilter)
    return String(errorByRequestKey.value[requestKey] || '')
  }

  async function fetchDepartmentStatistics({
    apiEndpoint,
    groupBy,
    filterDate = null,
    filterMonth = null,
    filterYear = null,
    force = false,
    notifyOnError = false,
    notify = null,
  }) {
    const endpoint = String(apiEndpoint || '').trim()
    if (!endpoint) return []

    const normalizedFilter = normalizeFilterByGroup(groupBy, {
      filterDate,
      filterMonth,
      filterYear,
    })
    const requestKey = buildRequestKey(endpoint, normalizedFilter.groupBy, normalizedFilter)

    if (loadingByRequestKey.value[requestKey]) {
      return rowsByRequestKey.value[requestKey] || []
    }

    if (loadedByRequestKey.value[requestKey] && !force) {
      return rowsByRequestKey.value[requestKey] || []
    }

    loadingByRequestKey.value = {
      ...loadingByRequestKey.value,
      [requestKey]: true,
    }
    errorByRequestKey.value = {
      ...errorByRequestKey.value,
      [requestKey]: '',
    }

    try {
      const params = { group_by: normalizedFilter.groupBy }

      if (normalizedFilter.groupBy === 'daily' || normalizedFilter.groupBy === 'weekly') {
        params.filter_date = normalizedFilter.filterDate
      } else if (normalizedFilter.groupBy === 'monthly') {
        params.filter_month = normalizedFilter.filterMonth
        params.filter_year = normalizedFilter.filterYear
      } else if (normalizedFilter.groupBy === 'yearly') {
        params.filter_year = normalizedFilter.filterYear
      }

      const { data } = await api.get(endpoint, {
        params,
      })

      const normalizedRows = normalizeRows(data)

      rowsByRequestKey.value = {
        ...rowsByRequestKey.value,
        [requestKey]: normalizedRows,
      }
      loadedByRequestKey.value = {
        ...loadedByRequestKey.value,
        [requestKey]: true,
      }

      return normalizedRows
    } catch (error) {
      const message = resolveApiErrorMessage(
        error,
        'Unable to load department leave statistics right now.',
      )

      errorByRequestKey.value = {
        ...errorByRequestKey.value,
        [requestKey]: message,
      }

      if (notifyOnError && typeof notify === 'function') {
        notify(message)
      }

      return []
    } finally {
      loadingByRequestKey.value = {
        ...loadingByRequestKey.value,
        [requestKey]: false,
      }
    }
  }

  function clearForEndpoint(apiEndpoint) {
    const endpointPrefix = `${String(apiEndpoint || '').trim()}::`
    if (!endpointPrefix.trim()) return

    const nextRows = {}
    const nextLoading = {}
    const nextLoaded = {}
    const nextError = {}

    for (const [key, value] of Object.entries(rowsByRequestKey.value)) {
      if (!key.startsWith(endpointPrefix)) nextRows[key] = value
    }

    for (const [key, value] of Object.entries(loadingByRequestKey.value)) {
      if (!key.startsWith(endpointPrefix)) nextLoading[key] = value
    }

    for (const [key, value] of Object.entries(loadedByRequestKey.value)) {
      if (!key.startsWith(endpointPrefix)) nextLoaded[key] = value
    }

    for (const [key, value] of Object.entries(errorByRequestKey.value)) {
      if (!key.startsWith(endpointPrefix)) nextError[key] = value
    }

    rowsByRequestKey.value = nextRows
    loadingByRequestKey.value = nextLoading
    loadedByRequestKey.value = nextLoaded
    errorByRequestKey.value = nextError
  }

  return {
    isAnyLoading,
    getRows,
    isLoading,
    getError,
    fetchDepartmentStatistics,
    clearForEndpoint,
  }
})
