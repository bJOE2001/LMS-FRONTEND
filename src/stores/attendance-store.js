import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from 'boot/axios'

function getLocalTodayStr() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatEmploymentStatus(status) {
  if (!status) return ''
  const s = String(status).toUpperCase().trim()
  if (s === 'CASUAL') return 'Casual'
  if (s === 'REGULAR') return 'Permanent'
  if (s === 'CONTRACTUAL') return 'Job Order'
  if (s === 'CO-TERMINOUS') return 'Co-terminous'
  if (s === 'ELECTIVE') return 'Elective'
  if (s === 'HONORARIUM') return 'Honorarium'
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function isRowLate(row) {
  return Number(row?.dtr?.late_minutes || 0) > 0
}

function matchesAttendanceStatusFilter(row, filterKey) {
  if (!filterKey || filterKey === 'ALL') return true
  const norm = String(row.attendance_status || '').toLowerCase().trim()
  const rawDtrStatus = String(row.dtr?.status || '').toLowerCase().trim()

  if (filterKey === 'PRESENT') {
    return (
      rawDtrStatus === 'present' ||
      norm === 'present' ||
      norm === 'on time' ||
      norm === 'late'
    )
  }
  if (filterKey === 'LATE') {
    return norm === 'late' || isRowLate(row)
  }
  if (filterKey === 'ON_LEAVE') {
    return (
      norm.startsWith('on leave') ||
      norm.startsWith('on_leave') ||
      norm === 'half day'
    )
  }
  if (filterKey === 'ABSENT') {
    return norm === 'absent'
  }
  return true
}

export const useAttendanceStore = defineStore('attendance', () => {
  // ─── Attendance Overview State ─────────────────────────────────────
  const todayStr = getLocalTodayStr()
  const selectedDate = ref(todayStr)
  const searchTerm = ref('')
  const selectedAttendanceStatus = ref('ALL')
  const selectedEmploymentStatus = ref('ALL')

  const employeeRows = ref([])
  const stats = ref({
    total: 0,
    present: 0,
    late: 0,
    on_leave: 0,
    absent: 0,
  })
  const devices = ref({})
  const loading = ref(false)
  const error = ref(null)

  // ─── Single DTR Preview Modal State ────────────────────────────────
  const showDtrModal = ref(false)
  const selectedDtrEmployee = ref(null)
  const dtrCustomRange = ref(null)
  const dtrData = ref(null)
  const dtrLoading = ref(false)
  const dtrErrorMessage = ref('')

  // ─── Batch DTR State ───────────────────────────────────────────────
  const showBulkDialog = ref(false)
  const showBatchDtrModal = ref(false)
  const selectedEmployees = ref([])
  const batchDateRange = ref(null)
  const batchEmployeesDtr = ref([])
  const batchPeriod = ref({})
  const batchDepartmentHeads = ref([])
  const batchLoading = ref(false)
  const batchErrorMessage = ref('')

  // ─── Computed Getters ──────────────────────────────────────────────
  const hasActiveFilters = computed(() => {
    return (
      selectedAttendanceStatus.value !== 'ALL' ||
      selectedEmploymentStatus.value !== 'ALL' ||
      Boolean(searchTerm.value && String(searchTerm.value).trim() !== '')
    )
  })

  const employmentStatusOptions = computed(() => {
    const counts = {}
    employeeRows.value.forEach((row) => {
      const raw = (row.employment_status || 'OTHER').toUpperCase().trim()
      counts[raw] = (counts[raw] || 0) + 1
    })

    const baseOptions = [
      { label: `All Statuses (${employeeRows.value.length})`, value: 'ALL' },
      { label: `Casual (${counts['CASUAL'] || 0})`, value: 'CASUAL' },
      { label: `Permanent (${counts['REGULAR'] || 0})`, value: 'REGULAR' },
    ]

    if (counts['CONTRACTUAL']) {
      baseOptions.push({ label: `Job Order (${counts['CONTRACTUAL']})`, value: 'CONTRACTUAL' })
    }
    if (counts['CO-TERMINOUS']) {
      baseOptions.push({ label: `Co-terminous (${counts['CO-TERMINOUS']})`, value: 'CO-TERMINOUS' })
    }
    if (counts['ELECTIVE']) {
      baseOptions.push({ label: `Elective (${counts['ELECTIVE']})`, value: 'ELECTIVE' })
    }

    Object.keys(counts).forEach((key) => {
      if (!['CASUAL', 'REGULAR', 'CONTRACTUAL', 'CO-TERMINOUS', 'ELECTIVE', 'OTHER'].includes(key)) {
        baseOptions.push({
          label: `${formatEmploymentStatus(key)} (${counts[key]})`,
          value: key,
        })
      }
    })

    return baseOptions
  })

  const filteredEmployeeRows = computed(() => {
    const empTarget =
      selectedEmploymentStatus.value && selectedEmploymentStatus.value !== 'ALL'
        ? selectedEmploymentStatus.value.toUpperCase().trim()
        : null
    const attTarget = selectedAttendanceStatus.value

    return employeeRows.value.filter((row) => {
      if (empTarget) {
        const s = String(row.employment_status || '').toUpperCase().trim()
        if (s !== empTarget) return false
      }
      if (!matchesAttendanceStatusFilter(row, attTarget)) {
        return false
      }
      return true
    })
  })

  const selectedControlNoSet = computed(() => {
    return new Set(selectedEmployees.value.map((e) => e.control_no))
  })

  function getEmployeeStatusKey(emp) {
    const raw = String(emp?.employment_status || '').toUpperCase().trim()
    if (raw) return raw
    const status = String(emp?.status || '').toUpperCase().trim()
    if (status === 'CONTRACTUAL' || Boolean(emp?.is_contractual)) return 'CONTRACTUAL'
    return 'OTHER'
  }

  const batchEmploymentStatusOptions = computed(() => {
    const buckets = new Map()
    employeeRows.value.forEach((row) => {
      const key = getEmployeeStatusKey(row)
      if (!buckets.has(key)) {
        buckets.set(key, [])
      }
      buckets.get(key).push(row)
    })

    const priorityOrder = [
      'REGULAR',
      'CASUAL',
      'CONTRACTUAL',
      'CO-TERMINOUS',
      'ELECTIVE',
      'HONORARIUM',
    ]

    const orderedKeys = [
      ...priorityOrder.filter((k) => buckets.has(k)),
      ...Array.from(buckets.keys()).filter((k) => !priorityOrder.includes(k) && k !== 'OTHER'),
      ...(buckets.has('OTHER') ? ['OTHER'] : []),
    ]

    const selectedSet = selectedControlNoSet.value

    return orderedKeys.map((key) => {
      const rows = buckets.get(key) || []
      const selectedCount = rows.reduce(
        (acc, r) => acc + (selectedSet.has(r.control_no) ? 1 : 0),
        0
      )
      const total = rows.length
      return {
        value: key,
        label: key === 'OTHER' ? 'Unspecified' : formatEmploymentStatus(key),
        total,
        selectedCount,
        isAllSelected: total > 0 && selectedCount === total,
        isPartial: selectedCount > 0 && selectedCount < total,
      }
    })
  })

  // ─── Actions ───────────────────────────────────────────────────────
  async function fetchAttendanceOverview(opts = {}) {
    loading.value = true
    error.value = null
    try {
      const params = {
        date: opts.date ?? selectedDate.value,
      }
      const search = opts.search ?? searchTerm.value
      if (search && String(search).trim() !== '') {
        params.search = String(search).trim()
      }
      if (opts.department_id) {
        params.department_id = opts.department_id
      }

      const response = await api.get('/attendance/dtr', { params })
      const data = response.data

      employeeRows.value = data.employees || []
      stats.value = {
        total: data.stats?.total || 0,
        present: data.stats?.present || 0,
        late: data.stats?.late || 0,
        on_leave: data.stats?.on_leave || 0,
        absent: data.stats?.absent || 0,
      }
      devices.value = data.devices || {}
      return data
    } catch (err) {
      console.error('AttendanceStore: Failed to fetch attendance overview', err)
      error.value = err.response?.data?.message || 'Failed to load attendance records.'
      throw err
    } finally {
      loading.value = false
    }
  }

  function changeDate(deltaDays) {
    if (!selectedDate.value) {
      selectedDate.value = getLocalTodayStr()
    }
    const parts = selectedDate.value.split('-').map(Number)
    const d = new Date(parts[0], parts[1] - 1, parts[2] + deltaDays)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    selectedDate.value = `${y}-${m}-${day}`
    return fetchAttendanceOverview()
  }

  function goToToday() {
    const curToday = getLocalTodayStr()
    if (selectedDate.value === curToday) return Promise.resolve()
    selectedDate.value = curToday
    return fetchAttendanceOverview()
  }

  function setSelectedDate(dateStr) {
    selectedDate.value = dateStr
    return fetchAttendanceOverview()
  }

  function setSearchTerm(term) {
    searchTerm.value = term
  }

  function setAttendanceStatusFilter(statusKey) {
    selectedAttendanceStatus.value = statusKey || 'ALL'
  }

  function toggleAttendanceStatusFilter(statusKey) {
    selectedAttendanceStatus.value =
      selectedAttendanceStatus.value === statusKey ? 'ALL' : statusKey
  }

  function setEmploymentStatusFilter(statusKey) {
    selectedEmploymentStatus.value = statusKey || 'ALL'
  }

  function resetAllFilters() {
    selectedAttendanceStatus.value = 'ALL'
    selectedEmploymentStatus.value = 'ALL'
    const hadSearch = Boolean(searchTerm.value && String(searchTerm.value).trim() !== '')
    searchTerm.value = ''
    if (hadSearch) {
      fetchAttendanceOverview()
    }
  }

  let activeEmployeeDtrPromise = null
  let activeEmployeeDtrKey = ''

  async function fetchEmployeeDtr(controlNo, customRange = null) {
    if (!controlNo) return null

    const cacheKey = `${controlNo}_${customRange?.from || ''}_${customRange?.to || ''}`
    if (activeEmployeeDtrPromise && activeEmployeeDtrKey === cacheKey) {
      return activeEmployeeDtrPromise
    }

    dtrLoading.value = true
    dtrErrorMessage.value = ''
    activeEmployeeDtrKey = cacheKey

    activeEmployeeDtrPromise = (async () => {
      try {
        const params = {}
        if (customRange?.from && customRange?.to) {
          const [fromY, fromM] = customRange.from.split('-').map(Number)
          const [toY, toM] = customRange.to.split('-').map(Number)
          const year = fromY || new Date().getFullYear()
          const month = fromM || new Date().getMonth() + 1
          params.year = year
          params.month = month

          const startPadM = String(fromM).padStart(2, '0')
          const endPadM = String(toM).padStart(2, '0')
          const endMaxDay = String(new Date(toY, toM, 0).getDate()).padStart(2, '0')
          params.start_date = `${fromY}-${startPadM}-01`
          params.end_date = `${toY}-${endPadM}-${endMaxDay}`
        }

        const res = await api.get(`/attendance/dtr/employee/${controlNo}`, { params })
        dtrData.value = res.data
        return res.data
      } catch (err) {
        console.error('AttendanceStore: Failed to fetch employee DTR', err)
        dtrErrorMessage.value = err.response?.data?.message || 'Failed to load employee Daily Time Record.'
        throw err
      } finally {
        dtrLoading.value = false
        activeEmployeeDtrPromise = null
        activeEmployeeDtrKey = ''
      }
    })()

    return activeEmployeeDtrPromise
  }

  async function fetchBulkDtr({ controlNos, startDate, endDate, year, month }) {
    if (!Array.isArray(controlNos) || controlNos.length === 0) return null
    batchLoading.value = true
    batchErrorMessage.value = ''

    try {
      const payload = {
        control_nos: controlNos,
        start_date: startDate,
        end_date: endDate,
        year,
        month,
      }

      const res = await api.post('/attendance/dtr/bulk-print', payload)
      batchEmployeesDtr.value = res.data.employees_dtr || []
      batchPeriod.value = res.data.period || {}
      batchDepartmentHeads.value = res.data.department_heads || []
      return res.data
    } catch (err) {
      console.error('AttendanceStore: Failed to fetch batch DTR', err)
      batchErrorMessage.value = err.response?.data?.message || 'Failed to generate batch Daily Time Records.'
      throw err
    } finally {
      batchLoading.value = false
    }
  }

  function toggleBatchStatusSelection(statusKey) {
    const matchingRows = employeeRows.value.filter(
      (row) => getEmployeeStatusKey(row) === statusKey
    )
    if (matchingRows.length === 0) return

    const selectedSet = selectedControlNoSet.value
    const allCurrentlySelected = matchingRows.every((r) => selectedSet.has(r.control_no))

    if (allCurrentlySelected) {
      const removeSet = new Set(matchingRows.map((r) => r.control_no))
      selectedEmployees.value = selectedEmployees.value.filter(
        (e) => !removeSet.has(e.control_no)
      )
    } else {
      const toAdd = matchingRows.filter((r) => !selectedSet.has(r.control_no))
      selectedEmployees.value = [...selectedEmployees.value, ...toAdd]
    }
  }

  function selectAllBatchEmployees() {
    selectedEmployees.value = [...employeeRows.value]
  }

  function clearSelectedEmployees() {
    selectedEmployees.value = []
  }

  function removeEmployeeFromBatch(emp) {
    selectedEmployees.value = selectedEmployees.value.filter(
      (e) => e.control_no !== emp.control_no
    )
  }

  function updateEmployeeDtrInOverview(updatedDtr) {
    if (!updatedDtr?.employee_control_no) return
    const row = employeeRows.value.find(
      (r) => r.control_no === updatedDtr.employee_control_no
    )
    if (row) {
      row.dtr = { ...row.dtr, ...updatedDtr }
    }
  }

  return {
    // State
    selectedDate,
    searchTerm,
    selectedAttendanceStatus,
    selectedEmploymentStatus,
    employeeRows,
    stats,
    devices,
    loading,
    error,
    // Single DTR
    showDtrModal,
    selectedDtrEmployee,
    dtrCustomRange,
    dtrData,
    dtrLoading,
    dtrErrorMessage,
    // Batch DTR
    showBulkDialog,
    showBatchDtrModal,
    selectedEmployees,
    batchDateRange,
    batchEmployeesDtr,
    batchPeriod,
    batchDepartmentHeads,
    batchLoading,
    batchErrorMessage,
    // Getters
    hasActiveFilters,
    employmentStatusOptions,
    filteredEmployeeRows,
    selectedControlNoSet,
    batchEmploymentStatusOptions,
    // Actions
    fetchAttendanceOverview,
    changeDate,
    goToToday,
    setSelectedDate,
    setSearchTerm,
    setAttendanceStatusFilter,
    toggleAttendanceStatusFilter,
    setEmploymentStatusFilter,
    resetAllFilters,
    fetchEmployeeDtr,
    fetchBulkDtr,
    toggleBatchStatusSelection,
    selectAllBatchEmployees,
    clearSelectedEmployees,
    removeEmployeeFromBatch,
    updateEmployeeDtrInOverview,
  }
})

