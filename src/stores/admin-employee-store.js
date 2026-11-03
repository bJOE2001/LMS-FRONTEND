import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from 'src/boot/axios'

export const useAdminEmployeeStore = defineStore('adminEmployee', () => {
  // ─── State ──────────────────────────────────────────────────────────
  const employees = ref([])
  const fullEmployeeRows = ref([])
  const fullEmployeeRowsCacheKey = ref('')
  const totalEmployees = ref(0)
  const statusCounts = ref({})
  const departmentHead = ref(null)
  const departmentHeadId = ref(null)

  const loading = ref(false)
  const loadingDepartmentHead = ref(false)
  const savingDepartmentHead = ref(false)
  const submitting = ref(false)
  const lastFetchedAt = ref(null)

  const pagination = ref({
    page: 1,
    rowsPerPage: 10,
    rowsNumber: 0,
    sortBy: null,
    descending: false,
  })

  // Leave history and balances state
  const leaveHistory = ref([])
  const leaveHistoryLoading = ref(false)
  const leaveBalanceRowsByControlNo = ref(new Map())

  // Employee picker state (for department employee assignment)
  const employeePickerOptions = ref([])
  const employeePickerLoading = ref(false)

  // ─── Deduplication & Caching ─────────────────────────────────────────
  const CACHE_TTL_MS = 45000 // 45 seconds TTL
  const DETAIL_CACHE_TTL_MS = 60000 // 60 seconds TTL

  const cache = new Map() // queryKey -> { data, timestamp }
  const summaryCache = new Map() // deptKey -> { data, timestamp }
  const leaveHistoryCache = new Map() // controlNo -> { data, timestamp }
  const pickerOptionsCache = new Map() // searchKey -> { data, timestamp }
  let departmentBalancesCache = { data: null, timestamp: 0 }

  let activeFetchPromise = null
  let activeFetchKey = ''
  let activeCollectionPromise = null
  let activeBalancesPromise = null
  const activeLeaveHistoryPromises = new Map()
  const activePickerPromises = new Map()

  // ─── Helpers ────────────────────────────────────────────────────────
  function buildQueryKey(params) {
    return [
      params.department_id || '',
      params.search || '',
      params.status || '',
      params.page || 1,
      params.per_page || 10,
    ].join('::')
  }

  function normalizeControlNo(value) {
    return String(value ?? '').trim()
  }

  function invalidateEmployeeCollectionCache() {
    fullEmployeeRows.value = []
    fullEmployeeRowsCacheKey.value = ''
  }

  function invalidateCache() {
    cache.clear()
    summaryCache.clear()
    leaveHistoryCache.clear()
    pickerOptionsCache.clear()
    departmentBalancesCache = { data: null, timestamp: 0 }
    invalidateEmployeeCollectionCache()
  }

  function resetDepartmentHeadState() {
    departmentHeadId.value = null
    departmentHead.value = null
  }

  function setDepartmentHead(head) {
    const normalizedHead = head && typeof head === 'object' ? head : null
    departmentHeadId.value = normalizedHead?.id || null
    departmentHead.value = normalizedHead
  }

  // ─── Actions ────────────────────────────────────────────────────────

  /**
   * Fetch all employee collection rows for client-side sorting & status filtering
   * @param {Object} baseParams - { department_id, search }
   */
  async function fetchEmployeeCollection(baseParams = {}) {
    if (activeCollectionPromise) {
      return activeCollectionPromise
    }

    activeCollectionPromise = (async () => {
      const collectedRows = []
      let page = 1
      let lastPage = 1

      try {
        do {
          const { data } = await api.get('/employees', {
            params: {
              ...baseParams,
              per_page: 100,
              page,
            },
          })

          const pageData = data?.employees ?? {}
          const pageRows = Array.isArray(pageData?.data) ? pageData.data : []
          collectedRows.push(...pageRows)

          const currentPage = Number(pageData?.current_page ?? page)
          const resolvedLastPage = Number(pageData?.last_page ?? currentPage)
          lastPage =
            Number.isFinite(resolvedLastPage) && resolvedLastPage > 0 ? resolvedLastPage : currentPage
          page = currentPage + 1
        } while (page <= lastPage)

        return collectedRows
      } catch (err) {
        console.error('AdminEmployeeStore: Failed to fetch employee collection', err)
        throw err
      } finally {
        activeCollectionPromise = null
      }
    })()

    return activeCollectionPromise
  }

  /**
   * Fetch department summary data (total_employees, status_counts, department_head)
   * @param {number} departmentId
   * @param {boolean} force
   */
  async function fetchDepartmentSummary(departmentId, force = false) {
    if (!departmentId) return {}
    const now = Date.now()
    const summaryKey = `dept::${departmentId}`

    if (!force && summaryCache.has(summaryKey)) {
      const cached = summaryCache.get(summaryKey)
      if (now - cached.timestamp < CACHE_TTL_MS) {
        return cached.data
      }
      summaryCache.delete(summaryKey)
    }

    try {
      const { data } = await api.get('/employees', {
        params: {
          department_id: departmentId,
          per_page: 1,
          page: 1,
        },
      })
      summaryCache.set(summaryKey, { data, timestamp: now })
      return data
    } catch {
      return {}
    }
  }

  /**
   * Fetch paginated employees list with in-flight deduplication and memory caching
   * @param {Object} params - Query parameters (department_id, search, status, per_page, page)
   * @param {boolean} force - Force cache bypass
   */
  async function fetchEmployees(params = {}, force = false) {
    if (!params.department_id) {
      employees.value = []
      totalEmployees.value = 0
      statusCounts.value = {}
      pagination.value.rowsNumber = 0
      resetDepartmentHeadState()
      invalidateEmployeeCollectionCache()
      return
    }

    const key = buildQueryKey(params)
    const now = Date.now()

    // 1. Check TTL Cache
    if (!force && cache.has(key)) {
      const cached = cache.get(key)
      if (now - cached.timestamp < CACHE_TTL_MS) {
        employees.value = cached.employees
        totalEmployees.value = cached.totalEmployees
        statusCounts.value = cached.statusCounts
        setDepartmentHead(cached.departmentHead)
        pagination.value.page = cached.page
        pagination.value.rowsPerPage = cached.rowsPerPage
        pagination.value.rowsNumber = cached.rowsNumber
        return cached
      }
      cache.delete(key)
    }

    // 2. In-flight request deduplication
    if (!force && activeFetchPromise && activeFetchKey === key) {
      return activeFetchPromise
    }

    loading.value = true
    loadingDepartmentHead.value = true
    activeFetchKey = key

    activeFetchPromise = (async () => {
      try {
        const pageNum = Math.max(1, parseInt(params.page, 10) || 1)
        const perPage = params.per_page || pagination.value.rowsPerPage || 10
        const baseParams = {
          department_id: params.department_id,
          search: params.search || undefined,
        }

        const tableRequest = api.get('/employees', {
          params: {
            ...baseParams,
            status: params.status || undefined,
            per_page: perPage,
            page: pageNum,
          },
        })

        // Summary request (only needed if status is filtered or summary not yet cached)
        const summaryRequest = fetchDepartmentSummary(params.department_id, force)

        const [tableResponse, summaryData] = await Promise.all([tableRequest, summaryRequest])
        const data = tableResponse?.data ?? {}

        const loadedEmployees = data.employees?.data ?? []
        const total = summaryData?.total_employees ?? data.total_employees ?? 0
        const counts = summaryData?.status_counts ?? data.status_counts ?? {}
        const curPage = data.employees?.current_page ?? pageNum
        const totalRows = data.employees?.total ?? 0
        const head = data.department_head ?? summaryData?.department_head ?? null

        employees.value = loadedEmployees
        totalEmployees.value = total
        statusCounts.value = counts
        setDepartmentHead(head)
        pagination.value.page = curPage
        pagination.value.rowsPerPage = perPage
        pagination.value.rowsNumber = totalRows
        lastFetchedAt.value = now

        // Store into cache
        cache.set(key, {
          employees: loadedEmployees,
          totalEmployees: total,
          statusCounts: counts,
          departmentHead: head,
          page: curPage,
          rowsPerPage: perPage,
          rowsNumber: totalRows,
          timestamp: now,
        })

        return data
      } catch (err) {
        console.error('AdminEmployeeStore: Failed to fetch employees', err)
        throw err
      } finally {
        loading.value = false
        loadingDepartmentHead.value = false
        activeFetchPromise = null
        activeFetchKey = ''
      }
    })()

    return activeFetchPromise
  }

  /**
   * Fetch employee leave history with deduplication and caching
   * @param {string} controlNo
   * @param {boolean} force
   */
  async function fetchEmployeeLeaveHistory(controlNo, force = false) {
    const norm = normalizeControlNo(controlNo)
    if (!norm) {
      leaveHistory.value = []
      return []
    }

    const now = Date.now()
    if (!force && leaveHistoryCache.has(norm)) {
      const cached = leaveHistoryCache.get(norm)
      if (now - cached.timestamp < DETAIL_CACHE_TTL_MS) {
        leaveHistory.value = cached.applications
        return cached
      }
      leaveHistoryCache.delete(norm)
    }

    if (!force && activeLeaveHistoryPromises.has(norm)) {
      return activeLeaveHistoryPromises.get(norm)
    }

    leaveHistoryLoading.value = true

    const promise = (async () => {
      try {
        const { data } = await api.get(
          `/admin/employees/${encodeURIComponent(norm)}/leave-history`,
        )
        const applications = Array.isArray(data?.applications) ? data.applications : []
        leaveHistory.value = applications

        const result = {
          applications,
          employee: data?.employee ?? null,
          timestamp: Date.now(),
        }
        leaveHistoryCache.set(norm, result)
        return result
      } catch (err) {
        leaveHistory.value = []
        throw err
      } finally {
        leaveHistoryLoading.value = false
        activeLeaveHistoryPromises.delete(norm)
      }
    })()

    activeLeaveHistoryPromises.set(norm, promise)
    return promise
  }

  /**
   * Fetch employees-for-leave map for department leave balances
   * @param {boolean} force
   */
  async function fetchDepartmentLeaveBalanceRows(force = false) {
    const now = Date.now()
    if (!force && departmentBalancesCache.data && now - departmentBalancesCache.timestamp < DETAIL_CACHE_TTL_MS) {
      leaveBalanceRowsByControlNo.value = departmentBalancesCache.data
      return departmentBalancesCache.data
    }

    if (!force && activeBalancesPromise) {
      return activeBalancesPromise
    }

    activeBalancesPromise = (async () => {
      try {
        const { data } = await api.get('/admin/employees-for-leave')
        const rows = Array.isArray(data?.employees) ? data.employees : []
        const nextLookup = new Map()

        for (const row of rows) {
          const rowControlNo = normalizeControlNo(row?.control_no)
          if (!rowControlNo) continue
          nextLookup.set(rowControlNo, row)
        }

        leaveBalanceRowsByControlNo.value = nextLookup
        departmentBalancesCache = { data: nextLookup, timestamp: Date.now() }
        return nextLookup
      } catch (err) {
        console.error('AdminEmployeeStore: Failed to fetch leave balances', err)
        throw err
      } finally {
        activeBalancesPromise = null
      }
    })()

    return activeBalancesPromise
  }

  /**
   * Fetch lightweight employee options for department assignment picker
   * @param {string} searchTerm
   * @param {number} limit
   * @param {boolean} force
   */
  async function fetchEmployeePickerOptions(searchTerm, limit = 20, force = false) {
    const normalizedSearch = String(searchTerm || '').trim()
    if (!normalizedSearch) {
      employeePickerOptions.value = []
      return []
    }

    const searchKey = `${normalizedSearch}::${limit}`
    const now = Date.now()

    if (!force && pickerOptionsCache.has(searchKey)) {
      const cached = pickerOptionsCache.get(searchKey)
      if (now - cached.timestamp < CACHE_TTL_MS) {
        employeePickerOptions.value = cached.options
        return cached.options
      }
      pickerOptionsCache.delete(searchKey)
    }

    if (!force && activePickerPromises.has(searchKey)) {
      return activePickerPromises.get(searchKey)
    }

    employeePickerLoading.value = true

    const promise = (async () => {
      try {
        const { data } = await api.get('/admin/employee-options', {
          params: {
            search: normalizedSearch,
            limit,
          },
        })

        const options = Array.isArray(data?.employees) ? data.employees : []
        employeePickerOptions.value = options
        pickerOptionsCache.set(searchKey, { options, timestamp: Date.now() })
        return options
      } catch (err) {
        employeePickerOptions.value = []
        throw err
      } finally {
        employeePickerLoading.value = false
        activePickerPromises.delete(searchKey)
      }
    })()

    activePickerPromises.set(searchKey, promise)
    return promise
  }

  /**
   * Add / Transfer employee to this department
   * @param {Object} payload - { control_no }
   */
  async function addEmployee(payload) {
    submitting.value = true
    try {
      const { data } = await api.post('/admin/employees', payload)
      invalidateCache()
      return data
    } finally {
      submitting.value = false
    }
  }

  /**
   * Remove employee from this department
   * @param {string} controlNo
   */
  async function removeEmployee(controlNo) {
    const norm = normalizeControlNo(controlNo)
    const { data } = await api.post(`/admin/employees/${encodeURIComponent(norm)}/delete`)
    invalidateCache()
    return data
  }

  /**
   * Add or update department head
   * @param {Object} payload
   * @param {boolean} isEdit
   */
  async function saveDepartmentHead(payload, isEdit = false) {
    savingDepartmentHead.value = true
    try {
      const endpoint = isEdit ? '/admin/department-head/update' : '/admin/department-head'
      const { data } = await api.post(endpoint, payload)
      invalidateCache()
      return data
    } finally {
      savingDepartmentHead.value = false
    }
  }

  /**
   * Remove assigned department head
   */
  async function removeDepartmentHead() {
    savingDepartmentHead.value = true
    try {
      const { data } = await api.post('/admin/department-head/delete')
      resetDepartmentHeadState()
      invalidateCache()
      return data
    } finally {
      savingDepartmentHead.value = false
    }
  }

  /**
   * Submit on-behalf COC application for an employee
   * @param {Object} payload
   */
  async function submitCocApplication(payload) {
    const { data } = await api.post('/admin/coc-applications', payload)
    return data
  }

  return {
    // State
    employees,
    fullEmployeeRows,
    fullEmployeeRowsCacheKey,
    totalEmployees,
    statusCounts,
    departmentHead,
    departmentHeadId,
    loading,
    loadingDepartmentHead,
    savingDepartmentHead,
    submitting,
    lastFetchedAt,
    pagination,
    leaveHistory,
    leaveHistoryLoading,
    leaveBalanceRowsByControlNo,
    employeePickerOptions,
    employeePickerLoading,

    // Actions
    fetchEmployees,
    fetchEmployeeCollection,
    fetchDepartmentSummary,
    fetchEmployeeLeaveHistory,
    fetchDepartmentLeaveBalanceRows,
    fetchEmployeePickerOptions,
    addEmployee,
    removeEmployee,
    saveDepartmentHead,
    removeDepartmentHead,
    submitCocApplication,
    invalidateCache,
    invalidateEmployeeCollectionCache,
    resetDepartmentHeadState,
    setDepartmentHead,
  }
})

