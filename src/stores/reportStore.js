import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from 'src/boot/axios'

const REPORT_TYPE_ALIASES = {
  lwop: 'lwop',
  leaveBalances: 'leaveBalances',
  monetization: 'monetization',
  ctoAvailment: 'ctoAvailment',
  cocBalance: 'cocBalances',
  cocBalances: 'cocBalances',
  leaveAvailment: 'leaveAvailmentPerOffice',
  leaveAvailmentPerOffice: 'leaveAvailmentPerOffice',
}

const REPORT_TYPES = [
  'lwop',
  'leaveBalances',
  'monetization',
  'ctoAvailment',
  'cocBalances',
  'leaveAvailmentPerOffice',
]

const REPORT_ENDPOINTS = {
  lwop: '/hr/reports/lwop',
  leaveBalances: '/hr/reports/leave-balances',
  monetization: '/hr/reports/monetization',
  ctoAvailment: '/hr/reports/cto-availment',
  cocBalances: '/hr/reports/coc-balances',
  leaveAvailmentPerOffice: '/hr/reports/leave-availment',
}

function normalizeReportRowsPayload(payload) {
  const rawRows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : []

  return rawRows.filter((row) => row && typeof row === 'object' && !Array.isArray(row))
}

function normalizeReportType(type) {
  return REPORT_TYPE_ALIASES[type] || ''
}

function buildLoadedState() {
  return REPORT_TYPES.reduce((state, type) => {
    state[type] = false
    return state
  }, {})
}

function buildLoadingState() {
  return REPORT_TYPES.reduce((state, type) => {
    state[type] = false
    return state
  }, {})
}

export const useReportStore = defineStore('reports', () => {
  const lwopReports = ref([])
  const leaveBalanceReports = ref([])
  const monetizationReports = ref([])
  const ctoAvailmentReports = ref([])
  const cocBalanceReports = ref([])
  const leaveAvailmentReports = ref([])

  const loadedReports = ref(buildLoadedState())
  const loadingByType = ref(buildLoadingState())

  const reportRefs = {
    lwop: lwopReports,
    leaveBalances: leaveBalanceReports,
    monetization: monetizationReports,
    ctoAvailment: ctoAvailmentReports,
    cocBalances: cocBalanceReports,
    leaveAvailmentPerOffice: leaveAvailmentReports,
  }

  const loading = computed(() => Object.values(loadingByType.value).some(Boolean))
  const totalNumberofLwopDays = computed(() => lwopReports.value.length)

  async function fetchReport(type, { force = false } = {}) {
    const resolvedType = normalizeReportType(type)

    if (!REPORT_TYPES.includes(resolvedType)) {
      throw new Error(`Unsupported report type: ${type}`)
    }

    if (loadingByType.value[resolvedType]) {
      return reportRefs[resolvedType].value
    }

    if (loadedReports.value[resolvedType] && !force) {
      return reportRefs[resolvedType].value
    }

    loadingByType.value[resolvedType] = true

    try {
      const { data } = await api.get(REPORT_ENDPOINTS[resolvedType])
      reportRefs[resolvedType].value = normalizeReportRowsPayload(data)
      loadedReports.value[resolvedType] = true
      return reportRefs[resolvedType].value
    } catch (error) {
      console.error(`Error fetching ${resolvedType} reports:`, error)
      reportRefs[resolvedType].value = []
      throw error
    } finally {
      loadingByType.value[resolvedType] = false
    }
  }

  async function ensureReportLoaded(type) {
    return fetchReport(type)
  }

  async function refreshReport(type) {
    return fetchReport(type, { force: true })
  }

  function resetReports() {
    lwopReports.value = []
    leaveBalanceReports.value = []
    monetizationReports.value = []
    ctoAvailmentReports.value = []
    cocBalanceReports.value = []
    leaveAvailmentReports.value = []
    loadedReports.value = buildLoadedState()
    loadingByType.value = buildLoadingState()
  }

  return {
    lwopReports,
    leaveBalanceReports,
    monetizationReports,
    ctoAvailmentReports,
    cocBalanceReports,
    leaveAvailmentReports,
    loadedReports,
    loadingByType,
    loading,
    totalNumberofLwopDays,
    fetchLwopReports: () => fetchReport('lwop', { force: true }),
    fetchLeaveBalances: () => fetchReport('leaveBalances', { force: true }),
    fetchMonetizationReports: () => fetchReport('monetization', { force: true }),
    fetchCtoAvailmentReports: () => fetchReport('ctoAvailment', { force: true }),
    fetchCocBalanceReports: () => fetchReport('cocBalances', { force: true }),
    fetchLeaveAvailmentReports: () => fetchReport('leaveAvailmentPerOffice', { force: true }),
    ensureReportLoaded,
    refreshReport,
    resetReports,
  }
})
