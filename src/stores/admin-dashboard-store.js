import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from 'src/boot/axios'

export const useAdminDashboardStore = defineStore('adminDashboard', () => {
  // ─── State ────────────────────────────────────────────────────────
  const loading = ref(false)
  const dashboardLoaded = ref(false)
  const lastFetchedAt = ref(null)

  const rawDashboardData = ref(null)
  const rawCocData = ref(null)
  const dashboardData = ref({
    pending_count: 0,
    approved_today: 0,
    total_approved: 0,
    rejected_count: 0,
    total_count: 0,
    analytics: null,
    kpi_breakdown: {
      pending: { elective: 0, co_terminous: 0, regular: 0, casual: 0 },
      approved_today: { elective: 0, co_terminous: 0, regular: 0, casual: 0 },
      total_approved: { elective: 0, co_terminous: 0, regular: 0, casual: 0 },
      total: { elective: 0, co_terminous: 0, regular: 0, casual: 0 },
    },
  })
  const applicationRows = ref([])
  const actionLoading = ref(false)

  // In-flight promise tracking for deduplication
  let activeDashboardPromise = null

  // ─── Actions ───────────────────────────────────────────────────────

  /**
   * Fetch raw Office Admin dashboard payload
   */
  async function fetchRawDashboard() {
    return api.get('/admin/dashboard')
  }

  /**
   * Fetch raw COC applications payload
   */
  async function fetchRawCocApplications() {
    return api.get('/admin/coc-applications').catch(() => null)
  }

  /**
   * Fetch Office Admin Dashboard metrics and COC applications in parallel with deduplication
   * @param {boolean} force - Force re-fetch even if in-flight or cached
   */
  async function fetchDashboard(force = false) {
    if (!force && activeDashboardPromise) {
      return activeDashboardPromise
    }

    loading.value = true

    activeDashboardPromise = (async () => {
      try {
        const [dashboardResponse, cocApplicationsResponse] = await Promise.all([
          fetchRawDashboard(),
          fetchRawCocApplications(),
        ])

        const dashData = dashboardResponse?.data ?? {}
        const cocData = cocApplicationsResponse?.data ?? null

        rawDashboardData.value = dashData
        rawCocData.value = cocData
        dashboardLoaded.value = true
        lastFetchedAt.value = Date.now()

        return {
          dashboard: dashData,
          coc: cocData,
          dashboardResponse,
          cocApplicationsResponse,
        }
      } catch (err) {
        console.error('AdminDashboardStore: Failed to fetch dashboard data', err)
        throw err
      } finally {
        loading.value = false
        activeDashboardPromise = null
      }
    })()

    return activeDashboardPromise
  }

  /**
   * Fetch leave application attachment as blob
   */
  async function fetchAttachment(id, config = {}) {
    return api.get(`/admin/leave-applications/${id}/attachment`, {
      responseType: 'blob',
      ...config,
    })
  }

  /**
   * Fetch single application details (leave or COC)
   */
  async function fetchApplicationDetail(endpointOrId, isCoc = false) {
    const endpoint = typeof endpointOrId === 'string' && endpointOrId.startsWith('/')
      ? endpointOrId
      : (isCoc ? `/admin/coc-applications/${endpointOrId}` : `/admin/leave-applications/${endpointOrId}`)
    return api.get(endpoint)
  }

  /**
   * Recommend / approve application as Department Admin
   */
  async function postApproval(endpoint) {
    return api.post(endpoint)
  }

  /**
   * Disapprove or cancel application as Department Admin
   */
  async function postDisapproval(endpoint, payload) {
    return api.post(endpoint, payload)
  }

  return {
    // State
    loading,
    dashboardLoaded,
    lastFetchedAt,
    rawDashboardData,
    rawCocData,
    dashboardData,
    applicationRows,
    actionLoading,

    // Actions
    fetchRawDashboard,
    fetchRawCocApplications,
    fetchDashboard,
    fetchAttachment,
    fetchApplicationDetail,
    postApproval,
    postDisapproval,
  }
})

// Provide alias
export const useOfficeAdminDashboardStore = useAdminDashboardStore
