import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from 'src/boot/axios'

export const useBiometricDeviceStore = defineStore('biometricDevices', () => {
  // ─── State ────────────────────────────────────────────────────────
  const loading = ref(false)
  const devicesLoaded = ref(false)
  const devicesList = ref([])
  const lastFetchedAt = ref(null)

  const loadingOffices = ref(false)
  const officesLoaded = ref(false)
  const officesList = ref([])

  const submittingDevice = ref(false)

  // In-flight promise tracking to prevent duplicate parallel requests
  let activeDevicesPromise = null
  let activeOfficesPromise = null

  // ─── Helpers & Computed ────────────────────────────────────────────

  function getDeviceLastSeen(dev) {
    return dev?.last_activity_at || dev?.last_heartbeat_at || dev?.last_sync_at || null
  }

  function isDeviceOnline(dev) {
    if (!dev || dev.is_active === false) return false
    if (typeof dev.is_online === 'boolean') return dev.is_online
    if (dev.status === 'ONLINE') return true
    if (dev.status === 'OFFLINE' || dev.status === 'BLOCKED') return false

    const lastTime = getDeviceLastSeen(dev)
    if (!lastTime) return false
    const diffSec = (Date.now() - new Date(lastTime).getTime()) / 1000
    return diffSec <= 300
  }

  const deviceStats = computed(() => {
    const list = devicesList.value
    const total = list.length
    let online = 0
    let unassigned = 0

    list.forEach((d) => {
      if (isDeviceOnline(d)) online++
      if (!d.department_id) unassigned++
    })

    return {
      total,
      online,
      offline: total - online,
      unassigned,
    }
  })

  const allOfficeOptions = computed(() => {
    return officesList.value.map((d) => ({
      label: d.name,
      value: d.id,
      acronym: d.acronym,
      name: d.name,
    }))
  })

  // ─── Actions ───────────────────────────────────────────────────────

  /**
   * Fetch all registered biometric devices
   * @param {boolean} silent - Whether to suppress loading indicators (for background polling)
   * @param {boolean} force - Whether to bypass in-flight deduplication
   */
  async function fetchDevices(silent = false, force = false) {
    if (!force && activeDevicesPromise) {
      return activeDevicesPromise
    }

    if (!silent) {
      loading.value = true
    }

    activeDevicesPromise = (async () => {
      try {
        const response = await api.get('/attendance/devices')
        const devices = response.data?.devices || []
        devicesList.value = devices
        devicesLoaded.value = true
        lastFetchedAt.value = Date.now()
        return devices
      } catch (err) {
        console.error('BiometricDeviceStore: Failed to fetch devices', err)
        throw err
      } finally {
        if (!silent) {
          loading.value = false
        }
        activeDevicesPromise = null
      }
    })()

    return activeDevicesPromise
  }

  /**
   * Fetch office/department library for assigning devices
   * @param {boolean} force - Whether to force a fresh fetch instead of using cached offices
   */
  async function fetchOffices(force = false) {
    if (!force && officesLoaded.value && officesList.value.length > 0) {
      return officesList.value
    }

    if (!force && activeOfficesPromise) {
      return activeOfficesPromise
    }

    loadingOffices.value = true

    activeOfficesPromise = (async () => {
      try {
        const { data } = await api.get('/departments')
        const depts = Array.isArray(data?.departments) ? data.departments : (Array.isArray(data) ? data : [])
        officesList.value = depts
        officesLoaded.value = true
        return depts
      } catch (err) {
        console.error('BiometricDeviceStore: Failed to fetch offices', err)
        throw err
      } finally {
        loadingOffices.value = false
        activeOfficesPromise = null
      }
    })()

    return activeOfficesPromise
  }

  /**
   * Update an existing device configuration
   */
  async function updateDevice(deviceId, payload) {
    submittingDevice.value = true
    try {
      const response = await api.post(`/attendance/devices/${deviceId}/update`, payload)
      const index = devicesList.value.findIndex((d) => d.id === deviceId)
      if (index !== -1 && response.data?.device) {
        devicesList.value[index] = { ...devicesList.value[index], ...response.data.device }
      }
      return response.data
    } finally {
      submittingDevice.value = false
    }
  }

  /**
   * Delete a biometric device record
   */
  async function deleteDevice(deviceId) {
    submittingDevice.value = true
    try {
      const response = await api.post(`/attendance/devices/${deviceId}/delete`)
      devicesList.value = devicesList.value.filter((d) => d.id !== deviceId)
      return response.data
    } finally {
      submittingDevice.value = false
    }
  }

  /**
   * Toggle device active/inactive status
   */
  async function toggleDeviceStatus(deviceId) {
    const response = await api.post(`/attendance/devices/${deviceId}/toggle`)
    const index = devicesList.value.findIndex((d) => d.id === deviceId)
    if (index !== -1 && response.data?.device) {
      devicesList.value[index] = { ...devicesList.value[index], ...response.data.device }
    }
    return response.data
  }

  /**
   * Authorize a pending biometric device
   */
  async function authorizeDevice(deviceId) {
    const response = await api.post(`/attendance/devices/${deviceId}/authorize`)
    const index = devicesList.value.findIndex((d) => d.id === deviceId)
    if (index !== -1 && response.data?.device) {
      devicesList.value[index] = { ...devicesList.value[index], ...response.data.device }
    }
    return response.data
  }

  return {
    // State
    loading,
    devicesLoaded,
    devicesList,
    lastFetchedAt,
    loadingOffices,
    officesLoaded,
    officesList,
    submittingDevice,

    // Getters & Helpers
    deviceStats,
    allOfficeOptions,
    isDeviceOnline,
    getDeviceLastSeen,

    // Actions
    fetchDevices,
    fetchOffices,
    updateDevice,
    deleteDevice,
    toggleDeviceStatus,
    authorizeDevice,
  }
})

export const useBiometricDevicesStore = useBiometricDeviceStore

