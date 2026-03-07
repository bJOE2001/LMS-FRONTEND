import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from 'stores/auth-store'
import { api } from 'src/boot/axios'

export const useLeaveStore = defineStore('leave', () => {
  const authStore = useAuthStore()
  const demoRoleOverride = ref(null)
  const userRole = computed(() => demoRoleOverride.value ?? authStore.user?.role ?? 'employee')

  // ─── Dashboard state ───────────────────────────────────────────────
  const leaveInitialized = ref(false)
  const applicationSummary = ref({ pending: 0, approved: 0, rejected: 0 })
  const applications = ref([])
  const dashboardLoaded = ref(false)
  const applicationsLoaded = ref(false)

  // ─── Leave summary (4 cards) ──────────────────────────────────────
  const leaveSummary = ref({ accrued: {}, resettable: [], event_based: [] })
  const leaveSummaryLoaded = ref(false)

  const myApplications = computed(() => applications.value)

  function setUserRole(role) {
    demoRoleOverride.value = role
  }

  async function fetchDashboard() {
    if (userRole.value !== 'employee' || !authStore.isAuthenticated) return
    try {
      const { data } = await api.get('/employee/dashboard')
      leaveInitialized.value = data.leave_initialized ?? false
      applicationSummary.value = data.application_summary ?? { pending: 0, approved: 0, rejected: 0 }
      applications.value = data.recent_applications ?? []
      applicationsLoaded.value = true
      dashboardLoaded.value = true
    } catch {
      // keep existing data on error
    }
  }

  async function fetchLeaveSummary() {
    if (userRole.value !== 'employee' || !authStore.isAuthenticated) return
    try {
      const { data } = await api.get('/employee/dashboard/leave-summary')
      leaveInitialized.value = data.leave_initialized ?? false
      leaveSummary.value = {
        accrued: data.accrued ?? {},
        resettable: data.resettable ?? [],
        event_based: data.event_based ?? [],
      }
      leaveSummaryLoaded.value = true
    } catch {
      // keep existing data on error
    }
  }

  async function fetchMyApplications() {
    if (userRole.value !== 'employee' || !authStore.isAuthenticated) return
    try {
      const { data } = await api.get('/employee/leave-applications')
      applications.value = data.applications ?? []
      applicationsLoaded.value = true
    } catch {
      // keep existing data on error
    }
  }

  async function submitLeaveApplication(payload) {
    if (userRole.value !== 'employee' || !authStore.isAuthenticated) return
    const body = {
      leave_type_id: payload.leave_type_id,
      start_date: payload.start_date,
      end_date: payload.end_date,
      total_days: payload.total_days,
      reason: payload.reason ?? null,
    }
    const { data } = await api.post('/employee/leave-applications', body)
    if (data.application) {
      applications.value = [data.application, ...applications.value]
    }
    await fetchMyApplications()
  }

  function updateApplicationStatus(id, status, remarks) {
    applications.value = applications.value.map((app) =>
      app.id === id ? { ...app, status, remarks } : app
    )
  }

  function getApplicationById(id) {
    return applications.value.find((app) => String(app.id) === String(id))
  }

  return {
    userRole,
    leaveInitialized,
    applicationSummary,
    leaveSummary,
    leaveSummaryLoaded,
    applications,
    myApplications,
    setUserRole,
    submitLeaveApplication,
    updateApplicationStatus,
    getApplicationById,
    fetchDashboard,
    fetchLeaveSummary,
    fetchMyApplications,
  }
})
