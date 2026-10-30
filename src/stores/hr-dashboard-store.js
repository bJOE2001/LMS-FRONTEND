import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from 'src/boot/axios'

export const useHrDashboardStore = defineStore('hrDashboard', () => {
  // ─── Dashboard State ───────────────────────────────────────────────
  const loading = ref(false)
  const dashboardLoaded = ref(false)
  const rawDashboardData = ref(null)
  const activeEmployeeCount = ref(0)
  const dashboardApplications = ref([])
  const dashboardData = ref({
    total_count: 0,
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    recalled_count: 0,
    analytics: null,
    kpi_breakdown: {
      total: { elective: 0, co_terminous: 0, regular: 0, casual: 0 },
    },
  })

  // ─── Departments State ─────────────────────────────────────────────
  const loadingDepts = ref(false)
  const departmentsLoaded = ref(false)
  const departments = ref([])
  const allDepartmentOptions = ref([])

  // ─── Calendar Leaves State ─────────────────────────────────────────
  const calendarLoading = ref(false)
  const calendarLeaves = ref([])
  const calendarCache = ref({}) // key -> leaves array

  let activeDashboardPromise = null
  let activeDepartmentsPromise = null
  let activeCalendarPromise = null
  let activeCalendarKey = ''

  // ─── Actions ───────────────────────────────────────────────────────

  /**
   * Fetch HR Dashboard overview & metrics
   */
  async function fetchDashboard(force = false) {
    if (!force && activeDashboardPromise) {
      return activeDashboardPromise
    }

    loading.value = true

    activeDashboardPromise = (async () => {
      try {
        const { data } = await api.get('/hr/dashboard')
        rawDashboardData.value = data
        dashboardLoaded.value = true
        return data
      } catch (err) {
        console.error('HrDashboardStore: Failed to fetch dashboard data', err)
        throw err
      } finally {
        loading.value = false
        activeDashboardPromise = null
      }
    })()

    return activeDashboardPromise
  }

  /**
   * Fetch list of active departments for filter options
   */
  async function fetchDepartments(force = false) {
    if (!force && departmentsLoaded.value && allDepartmentOptions.value.length > 0) {
      return allDepartmentOptions.value
    }
    if (!force && activeDepartmentsPromise) {
      return activeDepartmentsPromise
    }

    loadingDepts.value = true

    activeDepartmentsPromise = (async () => {
      try {
        const { data } = await api.get('/departments')
        const depts = data.departments ?? data ?? []
        departments.value = depts
        allDepartmentOptions.value = depts.map((d) => ({
          label: typeof d === 'string' ? d : d.name,
          value: typeof d === 'string' ? d : d.name,
        }))
        departmentsLoaded.value = true
        return allDepartmentOptions.value
      } catch (err) {
        console.error('HrDashboardStore: Failed to fetch departments', err)
        allDepartmentOptions.value = []
        departments.value = []
        throw err
      } finally {
        loadingDepts.value = false
        activeDepartmentsPromise = null
      }
    })()

    return activeDepartmentsPromise
  }

  /**
   * Fetch monthly leaves for calendar panel
   */
  async function fetchCalendarLeaves({ year, month, department = null }, force = false) {
    const key = `${year}_${month}_${department || 'ALL'}`

    if (!force && calendarCache.value[key]) {
      calendarLeaves.value = calendarCache.value[key]
      return calendarCache.value[key]
    }

    if (!force && activeCalendarPromise && activeCalendarKey === key) {
      return activeCalendarPromise
    }

    calendarLoading.value = true
    activeCalendarKey = key

    activeCalendarPromise = (async () => {
      try {
        const params = { year, month }
        if (department) {
          params.department = department
        }
        const { data } = await api.get('/hr/calendar', { params })
        const leaves = data.leaves ?? []
        calendarLeaves.value = leaves
        calendarCache.value[key] = leaves
        return leaves
      } catch (err) {
        console.error('HrDashboardStore: Failed to fetch calendar leaves', err)
        calendarLeaves.value = []
        throw err
      } finally {
        calendarLoading.value = false
        activeCalendarPromise = null
        activeCalendarKey = ''
      }
    })()

    return activeCalendarPromise
  }

  return {
    // Dashboard
    loading,
    dashboardLoaded,
    rawDashboardData,
    dashboardData,
    dashboardApplications,
    activeEmployeeCount,
    fetchDashboard,

    // Departments
    loadingDepts,
    departmentsLoaded,
    departments,
    allDepartmentOptions,
    fetchDepartments,

    // Calendar
    calendarLoading,
    calendarLeaves,
    fetchCalendarLeaves,
  }
})

