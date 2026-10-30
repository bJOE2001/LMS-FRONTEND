import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from 'src/boot/axios'

export const useEmployeeStore = defineStore('employee', () => {
  // ─── State ──────────────────────────────────────────────────────────
  const employees = ref([])
  const totalEmployees = ref(0)
  const allDepartments = ref([])
  const departmentsLoaded = ref(false)

  const employeePagination = ref({
    page: 1,
    rowsPerPage: 10,
    rowsNumber: 0,
  })

  const loading = ref(false)
  const loadingDepartments = ref(false)
  const loadingTotalEmployees = ref(false)
  const lastFetchedAt = ref(null)

  // In-flight promise tracking to prevent duplicate parallel network calls
  let activeFetchPromise = null
  let activeFetchKey = ''
  let activeDepartmentsPromise = null
  let activeSummaryPromise = null
  let activeSummaryKey = ''

  const activeAvailableTypesPromises = new Map()
  const activeLeaveHistoryPromises = new Map()
  const activeLedgerPromises = new Map()
  const activeCocCtoPromises = new Map()
  const activeCocImportPromises = new Map()
  const activeOptionsPromises = new Map()

  // Cache configuration
  const CACHE_TTL_MS = 45000 // 45 seconds for paginated lists & option searches
  const DETAIL_CACHE_TTL_MS = 60000 // 60 seconds for employee details, ledgers & history

  // Caches
  const cache = new Map() // queryKey -> { employees, page, rowsNumber, totalEmployees, timestamp }
  const availableLeaveTypesCache = new Map() // controlNo -> { data, timestamp }
  const leaveHistoryCache = new Map() // controlNo -> { data, timestamp }
  const leaveCreditsLedgerCache = new Map() // controlNo -> { data, timestamp }
  const cocCtoLedgerCache = new Map() // controlNo -> { data, timestamp }
  const cocImportEntriesCache = new Map() // controlNo -> { data, timestamp }
  const employeeOptionsCache = new Map() // queryKey -> { data, timestamp }

  // ─── Helpers ────────────────────────────────────────────────────────

  function buildQueryKey(params) {
    return [
      params.department_id || '',
      params.search || '',
      params.activity || 'ALL',
      params.biometric_status || '',
      params.page || 1,
      params.per_page || 10,
    ].join('::')
  }

  function buildOptionsKey(params) {
    return [
      params.department_id || '',
      params.search || '',
      params.limit || 20,
    ].join('::')
  }

  // ─── Actions ────────────────────────────────────────────────────────

  /**
   * Fetch departments library (cached across requests & views)
   * @param {boolean} force - Force network bypass of existing cache
   */
  async function fetchDepartments(force = false) {
    if (!force && departmentsLoaded.value && allDepartments.value.length > 0) {
      return allDepartments.value
    }

    if (!force && activeDepartmentsPromise) {
      return activeDepartmentsPromise
    }

    loadingDepartments.value = true

    activeDepartmentsPromise = (async () => {
      try {
        const { data } = await api.get('/departments')
        const depts = Array.isArray(data?.departments)
          ? data.departments
          : Array.isArray(data)
            ? data
            : []
        allDepartments.value = depts
        departmentsLoaded.value = true
        return depts
      } catch (err) {
        console.error('EmployeeStore: Failed to load departments', err)
        throw err
      } finally {
        loadingDepartments.value = false
        activeDepartmentsPromise = null
      }
    })()

    return activeDepartmentsPromise
  }

  /**
   * Fetch paginated employees list with in-flight deduplication and memory caching
   * @param {Object} params - Query parameters (search, department_id, activity, biometric_status, per_page, page)
   * @param {boolean} force - Whether to bypass memory cache
   */
  async function fetchEmployees(params = {}, force = false) {
    const key = buildQueryKey(params)
    const now = Date.now()

    // 1. Check TTL cache if not forcing refresh
    if (!force && cache.has(key)) {
      const cached = cache.get(key)
      if (now - cached.timestamp < CACHE_TTL_MS) {
        employees.value = cached.employees
        employeePagination.value.page = cached.page
        employeePagination.value.rowsNumber = cached.rowsNumber
        totalEmployees.value = cached.totalEmployees
        return cached
      }
      cache.delete(key)
    }

    // 2. In-flight request deduplication
    if (!force && activeFetchPromise && activeFetchKey === key) {
      return activeFetchPromise
    }

    loading.value = true
    activeFetchKey = key

    activeFetchPromise = (async () => {
      try {
        const queryParams = {
          department_id: params.department_id || undefined,
          search: params.search || undefined,
          activity: params.activity || 'ALL',
          biometric_status:
            params.biometric_status && params.biometric_status !== 'ALL'
              ? params.biometric_status
              : undefined,
          per_page: params.per_page || employeePagination.value.rowsPerPage || 10,
          page: params.page || 1,
        }

        const { data } = await api.get('/employees', { params: queryParams })

        let loadedList = []
        let curPage = queryParams.page
        let totalRows = 0
        let overallTotal = totalEmployees.value

        if (data?.employees) {
          loadedList = data.employees.data ?? []
          curPage = data.employees.current_page ?? queryParams.page
          totalRows = data.employees.total ?? 0
        }

        if (data?.total_employees !== undefined && data?.total_employees !== null) {
          overallTotal = Number(data.total_employees)
        } else if (totalRows > 0 && !params.search && !params.department_id) {
          overallTotal = totalRows
        }

        employees.value = loadedList
        employeePagination.value.page = curPage
        employeePagination.value.rowsPerPage = queryParams.per_page
        employeePagination.value.rowsNumber = totalRows
        totalEmployees.value = overallTotal
        lastFetchedAt.value = now

        // Store into cache
        cache.set(key, {
          employees: loadedList,
          page: curPage,
          rowsNumber: totalRows,
          totalEmployees: overallTotal,
          timestamp: now,
        })

        return data
      } catch (err) {
        console.error('EmployeeStore: Failed to fetch employees', err)
        throw err
      } finally {
        loading.value = false
        activeFetchPromise = null
        activeFetchKey = ''
      }
    })()

    return activeFetchPromise
  }

  /**
   * Fetch total employee summary (only called when explicitly required without full list)
   * @param {string} activity - 'ACTIVE', 'INACTIVE', or 'ALL'
   * @param {boolean} force - Force refresh
   */
  async function fetchTotalEmployeesSummary(activity = 'ACTIVE', force = false) {
    const summaryKey = `summary::${activity}`
    const now = Date.now()

    if (!force && cache.has(summaryKey)) {
      const cached = cache.get(summaryKey)
      if (now - cached.timestamp < CACHE_TTL_MS) {
        totalEmployees.value = cached.total
        return cached.total
      }
      cache.delete(summaryKey)
    }

    if (!force && activeSummaryPromise && activeSummaryKey === summaryKey) {
      return activeSummaryPromise
    }

    loadingTotalEmployees.value = true
    activeSummaryKey = summaryKey

    activeSummaryPromise = (async () => {
      try {
        const { data } = await api.get('/employees', {
          params: {
            activity: activity || 'ALL',
            per_page: 1,
            page: 1,
          },
        })

        const total = Number(data?.total_employees ?? data?.employees?.total ?? 0)
        totalEmployees.value = total

        cache.set(summaryKey, { total, timestamp: now })
        return total
      } catch (err) {
        console.error('EmployeeStore: Failed to load employee summary', err)
        throw err
      } finally {
        loadingTotalEmployees.value = false
        activeSummaryPromise = null
        activeSummaryKey = ''
      }
    })()

    return activeSummaryPromise
  }

  /**
   * Fetch available leave types for an employee (with TTL caching and deduplication).
   * Used concurrently across Leave Credit modal and Employee Details modal.
   * @param {string} controlNo - Employee control number
   * @param {boolean} force - Force refresh
   */
  async function fetchAvailableLeaveTypes(controlNo, force = false) {
    const norm = String(controlNo ?? '').trim()
    if (!norm) return { leave_types: [], as_of_date: null }

    const now = Date.now()
    if (!force && availableLeaveTypesCache.has(norm)) {
      const cached = availableLeaveTypesCache.get(norm)
      if (now - cached.timestamp < DETAIL_CACHE_TTL_MS) {
        return cached.data
      }
      availableLeaveTypesCache.delete(norm)
    }

    if (!force && activeAvailableTypesPromises.has(norm)) {
      return activeAvailableTypesPromises.get(norm)
    }

    const promise = (async () => {
      try {
        const { data } = await api.get('/hr/leave-balances/available-types', {
          params: { employee_control_no: norm },
        })
        availableLeaveTypesCache.set(norm, { data, timestamp: Date.now() })
        return data
      } catch (err) {
        console.error(`EmployeeStore: Failed to fetch available leave types for ${norm}`, err)
        throw err
      } finally {
        activeAvailableTypesPromises.delete(norm)
      }
    })()

    activeAvailableTypesPromises.set(norm, promise)
    return promise
  }

  /**
   * Fetch employee leave history applications and employee info (with caching and deduplication)
   * @param {string} controlNo - Employee control number
   * @param {boolean} force - Force refresh
   */
  async function fetchEmployeeLeaveHistory(controlNo, force = false) {
    const norm = String(controlNo ?? '').trim()
    if (!norm) return { applications: [], employee: null }

    const now = Date.now()
    if (!force && leaveHistoryCache.has(norm)) {
      const cached = leaveHistoryCache.get(norm)
      if (now - cached.timestamp < DETAIL_CACHE_TTL_MS) {
        return cached.data
      }
      leaveHistoryCache.delete(norm)
    }

    if (!force && activeLeaveHistoryPromises.has(norm)) {
      return activeLeaveHistoryPromises.get(norm)
    }

    const promise = (async () => {
      try {
        const { data } = await api.get(`/hr/employees/${encodeURIComponent(norm)}/leave-history`)
        leaveHistoryCache.set(norm, { data, timestamp: Date.now() })
        return data
      } catch (err) {
        console.error(`EmployeeStore: Failed to fetch leave history for ${norm}`, err)
        throw err
      } finally {
        activeLeaveHistoryPromises.delete(norm)
      }
    })()

    activeLeaveHistoryPromises.set(norm, promise)
    return promise
  }

  /**
   * Fetch employee leave credits ledger (deduplicates concurrent endpoint probes and caches)
   * Uses canonical /hr/employees/{controlNo}/leave-credits-ledger with fallback
   * @param {string} controlNo - Employee control number
   * @param {boolean} force - Force refresh
   */
  async function fetchLeaveCreditsLedger(controlNo, force = false) {
    const norm = String(controlNo ?? '').trim()
    if (!norm) return null

    const now = Date.now()
    if (!force && leaveCreditsLedgerCache.has(norm)) {
      const cached = leaveCreditsLedgerCache.get(norm)
      if (now - cached.timestamp < DETAIL_CACHE_TTL_MS) {
        return cached.data
      }
      leaveCreditsLedgerCache.delete(norm)
    }

    if (!force && activeLedgerPromises.has(norm)) {
      return activeLedgerPromises.get(norm)
    }

    const promise = (async () => {
      try {
        let resData = null
        try {
          const res = await api.get(`/hr/employees/${encodeURIComponent(norm)}/leave-credits-ledger`)
          resData = res.data
        } catch (primaryErr) {
          const status = Number(primaryErr?.response?.status)
          if (status === 404 || status === 405) {
            const fallbackRes = await api.get(`/hr/employees/${encodeURIComponent(norm)}/leave-balance-ledger`)
            resData = fallbackRes.data
          } else {
            throw primaryErr
          }
        }
        leaveCreditsLedgerCache.set(norm, { data: resData, timestamp: Date.now() })
        return resData
      } catch (err) {
        console.error(`EmployeeStore: Failed to fetch leave credits ledger for ${norm}`, err)
        throw err
      } finally {
        activeLedgerPromises.delete(norm)
      }
    })()

    activeLedgerPromises.set(norm, promise)
    return promise
  }

  /**
   * Fetch employee COC/CTO ledger entries and current balance
   * @param {string} controlNo - Employee control number
   * @param {boolean} force - Force refresh
   */
  async function fetchCocCtoLedger(controlNo, force = false) {
    const norm = String(controlNo ?? '').trim()
    if (!norm) return null

    const now = Date.now()
    if (!force && cocCtoLedgerCache.has(norm)) {
      const cached = cocCtoLedgerCache.get(norm)
      if (now - cached.timestamp < DETAIL_CACHE_TTL_MS) {
        return cached.data
      }
      cocCtoLedgerCache.delete(norm)
    }

    if (!force && activeCocCtoPromises.has(norm)) {
      return activeCocCtoPromises.get(norm)
    }

    const promise = (async () => {
      try {
        const { data } = await api.get(`/hr/employees/${encodeURIComponent(norm)}/coc-cto-ledger`)
        cocCtoLedgerCache.set(norm, { data, timestamp: Date.now() })
        return data
      } catch (err) {
        console.error(`EmployeeStore: Failed to fetch COC/CTO ledger for ${norm}`, err)
        throw err
      } finally {
        activeCocCtoPromises.delete(norm)
      }
    })()

    activeCocCtoPromises.set(norm, promise)
    return promise
  }

  /**
   * Fetch existing approved COC applications for import entries
   * @param {string} controlNo - Employee control number
   * @param {boolean} force - Force refresh
   */
  async function fetchCocImportEntries(controlNo, force = false) {
    const norm = String(controlNo ?? '').trim()
    if (!norm) return { applications: [] }

    const now = Date.now()
    if (!force && cocImportEntriesCache.has(norm)) {
      const cached = cocImportEntriesCache.get(norm)
      if (now - cached.timestamp < DETAIL_CACHE_TTL_MS) {
        return cached.data
      }
      cocImportEntriesCache.delete(norm)
    }

    if (!force && activeCocImportPromises.has(norm)) {
      return activeCocImportPromises.get(norm)
    }

    const promise = (async () => {
      try {
        const { data } = await api.get('/hr/coc-applications', {
          params: {
            employee_control_no: norm,
            status: 'APPROVED',
            include_imported: 1,
          },
        })
        cocImportEntriesCache.set(norm, { data, timestamp: Date.now() })
        return data
      } catch (err) {
        console.error(`EmployeeStore: Failed to load COC import entries for ${norm}`, err)
        throw err
      } finally {
        activeCocImportPromises.delete(norm)
      }
    })()

    activeCocImportPromises.set(norm, promise)
    return promise
  }

  /**
   * Fetch employee options for dropdown selectors (with caching and debounce deduplication)
   * @param {Object} params - { department_id, search, limit }
   * @param {boolean} force - Force refresh
   * @param {AbortSignal} signal - Optional abort signal
   */
  async function fetchEmployeeOptions(params = {}, force = false, signal = null) {
    const key = buildOptionsKey(params)
    const now = Date.now()

    if (!force && employeeOptionsCache.has(key)) {
      const cached = employeeOptionsCache.get(key)
      if (now - cached.timestamp < CACHE_TTL_MS) {
        return cached.data
      }
      employeeOptionsCache.delete(key)
    }

    if (!force && activeOptionsPromises.has(key)) {
      return activeOptionsPromises.get(key)
    }

    const promise = (async () => {
      try {
        const { data } = await api.get('/hr/employee-options', {
          params: {
            department_id: params.department_id || undefined,
            search: params.search || undefined,
            limit: params.limit || 20,
          },
          signal,
        })
        employeeOptionsCache.set(key, { data, timestamp: Date.now() })
        return data
      } catch (err) {
        if (err?.name !== 'AbortError' && err?.code !== 'ERR_CANCELED') {
          console.error('EmployeeStore: Failed to fetch employee options', err)
        }
        throw err
      } finally {
        activeOptionsPromises.delete(key)
      }
    })()

    activeOptionsPromises.set(key, promise)
    return promise
  }

  /**
   * Invalidate cached data for a specific employee after balance updates, adjustments, or imports
   * @param {string} controlNo - Employee control number
   */
  function invalidateEmployee(controlNo) {
    const norm = String(controlNo ?? '').trim()
    if (!norm) return
    availableLeaveTypesCache.delete(norm)
    leaveHistoryCache.delete(norm)
    leaveCreditsLedgerCache.delete(norm)
    cocCtoLedgerCache.delete(norm)
    cocImportEntriesCache.delete(norm)
  }

  /**
   * Invalidate memory cache so next queries fetch fresh data
   */
  function invalidate(clearCache = true) {
    if (clearCache) {
      cache.clear()
      availableLeaveTypesCache.clear()
      leaveHistoryCache.clear()
      leaveCreditsLedgerCache.clear()
      cocCtoLedgerCache.clear()
      cocImportEntriesCache.clear()
      employeeOptionsCache.clear()
    }
    lastFetchedAt.value = null
  }

  return {
    // State
    employees,
    totalEmployees,
    allDepartments,
    departmentsLoaded,
    employeePagination,
    loading,
    loadingDepartments,
    loadingTotalEmployees,
    lastFetchedAt,

    // Actions
    fetchDepartments,
    fetchEmployees,
    fetchTotalEmployeesSummary,
    fetchAvailableLeaveTypes,
    fetchEmployeeLeaveHistory,
    fetchLeaveCreditsLedger,
    fetchCocCtoLedger,
    fetchCocImportEntries,
    fetchEmployeeOptions,
    invalidateEmployee,
    invalidate,
  }
})
