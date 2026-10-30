<template>
  <q-page class="q-pa-md biometric-devices-page">
    <!-- Page Header -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h1 class="text-h5 text-weight-bold text-dark q-my-none">Biometric Devices</h1>
        <div class="text-caption text-grey-7 q-mt-xs">
          Monitor connected ZKTeco devices and office assignments
        </div>
      </div>
    </div>

    <!-- Interactive Summary Stat Cards (Click to Filter) -->
    <div class="row q-col-gutter-sm q-mb-md">
      <!-- Total Devices -->
      <div class="col-12 col-sm-4">
        <q-card
          flat
          bordered
          class="rounded-borders bg-white stat-card cursor-pointer"
          :class="{ 'stat-card-active-all': statusFilter === 'all' }"
          @click="statusFilter = 'all'"
        >
          <q-card-section class="q-py-md">
            <div class="row items-center justify-between no-wrap">
              <div class="row items-center no-wrap">
                <q-avatar size="42px" color="blue-1" text-color="blue-9" class="q-mr-md">
                  <q-icon name="devices" size="22px" />
                </q-avatar>
                <div>
                  <div class="text-caption text-weight-medium text-grey-7">Total Devices</div>
                  <div class="text-h5 text-weight-bolder text-dark">{{ deviceStats.total }}</div>
                </div>
              </div>
              <q-badge
                v-if="deviceStats.unassigned > 0"
                color="amber-2"
                text-color="amber-10"
                class="text-weight-bold q-px-sm q-py-xs"
              >
                {{ deviceStats.unassigned }} Unassigned
              </q-badge>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Online -->
      <div class="col-12 col-sm-4">
        <q-card
          flat
          bordered
          class="rounded-borders bg-white stat-card cursor-pointer"
          :class="{ 'stat-card-active-online': statusFilter === 'online' }"
          @click="statusFilter = statusFilter === 'online' ? 'all' : 'online'"
        >
          <q-card-section class="q-py-md">
            <div class="row items-center no-wrap">
              <q-avatar size="42px" color="green-1" text-color="green-9" class="q-mr-md">
                <q-icon name="wifi" size="22px" />
              </q-avatar>
              <div>
                <div class="text-caption text-weight-medium text-grey-7">Online</div>
                <div class="text-h5 text-weight-bolder text-positive">{{ deviceStats.online }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Offline -->
      <div class="col-12 col-sm-4">
        <q-card
          flat
          bordered
          class="rounded-borders bg-white stat-card cursor-pointer"
          :class="{ 'stat-card-active-offline': statusFilter === 'offline' }"
          @click="statusFilter = statusFilter === 'offline' ? 'all' : 'offline'"
        >
          <q-card-section class="q-py-md">
            <div class="row items-center justify-between no-wrap">
              <div class="row items-center no-wrap">
                <q-avatar size="42px" color="grey-2" text-color="grey-8" class="q-mr-md">
                  <q-icon name="wifi_off" size="22px" />
                </q-avatar>
                <div>
                  <div class="text-caption text-weight-medium text-grey-7">Offline</div>
                  <div class="text-h5 text-weight-bolder text-grey-8">{{ deviceStats.offline }}</div>
                </div>
              </div>
              <span v-if="statusFilter === 'offline'" class="text-caption text-weight-bold text-grey-7">
                Filtered
              </span>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
    <q-card flat bordered class="rounded-borders bg-white q-mb-md">
      <q-card-section class="q-py-sm">
        <div class="row items-center justify-between q-col-gutter-sm">
          <div class="col-12 col-sm-auto">
            <q-select
              v-model="statusFilter"
              :options="statusOptions"
              emit-value
              map-options
              outlined
              dense
              label="Device Status"
              style="min-width: 180px"
            />
          </div>

          <div class="col-12 col-sm">
            <q-input
              v-model="searchTerm"
              outlined
              dense
              clearable
              placeholder="Search by device label, serial number, office, or IP address..."
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Loading State (Initial Fetch) -->
    <div v-if="loading && devicesList.length === 0" class="row justify-center q-py-xl">
      <q-spinner-dots color="primary" size="48px" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredDevices.length === 0"
      class="text-center q-py-xl text-grey-6 bg-white rounded-borders q-pa-xl"
      style="border: 1px dashed #cbd5e1;"
    >
      <q-icon
        :name="hasActiveFilters ? 'search_off' : 'developer_board_off'"
        size="56px"
        color="grey-4"
      />
      <div class="text-subtitle1 text-weight-bold text-grey-8 q-mt-sm">
        {{ hasActiveFilters ? 'No matching biometric devices' : 'No biometric devices found' }}
      </div>
      <div class="text-caption text-grey-6 q-mb-md">
        {{
          hasActiveFilters
            ? 'Try adjusting your search query or status filter.'
            : 'Biometric terminals will automatically appear here once connected to the network.'
        }}
      </div>
      <q-btn
        v-if="hasActiveFilters"
        outline
        no-caps
        color="primary"
        icon="filter_alt_off"
        label="Reset Filters"
        @click="resetFilters"
      />
    </div>

    <!-- Table View -->
    <div v-else>
      <q-table
        v-model:pagination="pagination"
        :rows="filteredDevices"
        :columns="columns"
        row-key="id"
        flat
        bordered
        :loading="loading"
        :rows-per-page-options="[10, 20, 50, 0]"
        class="biometric-table"
      >
        <!-- Device Info Column -->
        <template #body-cell-device_info="props">
          <q-td :props="props">
            <div class="text-weight-bold text-dark ellipsis" style="max-width: 240px;">
              {{ formatDeviceName(props.row) }}
              <q-tooltip>{{ formatDeviceName(props.row) }}</q-tooltip>
            </div>
          </q-td>
        </template>

        <!-- Serial Number Column -->
        <template #body-cell-serial_number="props">
          <q-td :props="props">
            <q-chip
              dense
              clickable
              color="grey-2"
              text-color="dark"
              icon-right="content_copy"
              class="font-mono text-caption q-my-none"
              @click="copySerialNumber(props.row.serial_number)"
            >
              {{ props.row.serial_number }}
              <q-tooltip>Click to copy Serial Number</q-tooltip>
            </q-chip>
          </q-td>
        </template>

        <!-- Assigned Office Column -->
        <template #body-cell-assigned_office="props">
          <q-td :props="props">
            <div
              v-if="props.row.department_id"
              class="text-dark ellipsis"
              style="max-width: 260px;"
            >
              {{ props.row.department_name }}
              <q-tooltip>{{ props.row.department_name }}</q-tooltip>
            </div>
            <span v-else class="text-grey-5 text-italic text-caption">
              Unassigned
            </span>
          </q-td>
        </template>

        <!-- Network & Heartbeat Column -->
        <template #body-cell-network="props">
          <q-td :props="props">
            <div class="column">
              <code class="text-caption font-mono text-weight-medium text-dark">
                {{ props.row.ip_address || 'Dynamic / DHCP' }}
              </code>
              <span class="text-caption text-grey-6" style="font-size: 11px;">
                Seen: {{ formatDeviceTime(getDeviceLastSeen(props.row)) }}
              </span>
            </div>
          </q-td>
        </template>

        <!-- Status Column -->
        <template #body-cell-status="props">
          <q-td :props="props" class="text-center">
            <span :class="['status-indicator', isDeviceOnline(props.row) ? 'online' : 'offline']">
              <span :class="isDeviceOnline(props.row) ? 'pulse-dot' : 'offline-dot'"></span>
              <span class="status-text text-weight-bold">
                {{ isDeviceOnline(props.row) ? 'Online' : 'Offline' }}
              </span>
            </span>
          </q-td>
        </template>

        <!-- Action Column -->
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <div class="row inline no-wrap items-center q-gutter-x-xs">
              <q-btn
                flat
                round
                dense
                size="sm"
                color="primary"
                icon="edit"
                @click="openEditDeviceDialog(props.row)"
              >
                <q-tooltip>Edit device configuration</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                size="sm"
                color="negative"
                icon="delete_outline"
                @click="confirmDeleteDevice(props.row)"
              >
                <q-tooltip>Delete device</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>
    </div>

    <!-- Edit Biometric Device Dialog -->
    <q-dialog v-model="showDeviceDialog" persistent>
      <q-card style="width: 520px; max-width: 95vw;" class="rounded-borders overflow-hidden">
        <!-- Dialog Header -->
        <div class="dialog-header bg-primary text-white row items-center justify-between no-wrap q-px-md q-py-sm">
          <div class="row items-center no-wrap q-gutter-x-sm">
            <div class="dialog-header-icon row items-center justify-center">
              <q-icon name="devices" size="20px" color="white" />
            </div>
            <div class="text-subtitle1 text-weight-bold">
              Edit Biometric Device
            </div>
          </div>
          <q-btn icon="close" flat round dense text-color="white" @click="showDeviceDialog = false" />
        </div>

        <!-- Dialog Body -->
        <q-card-section class="q-pa-md dialog-form-body">
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <q-input
                v-model="deviceForm.device_name"
                outlined
                dense
                label="Device Label *"
                placeholder="e.g. CHRMO, CICTMO"
                :rules="[val => !!val || 'Device name is required']"
                hide-bottom-space
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="deviceForm.serial_number"
                outlined
                dense
                disable
                label="Serial Number"
                class="font-mono"
                hide-bottom-space
              />
            </div>
          </div>

          <!-- Network & Model -->
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <q-input
                v-model="deviceForm.ip_address"
                outlined
                dense
                label="IP Address"
                placeholder="e.g. 192.168.8.230"
                hide-bottom-space
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="deviceForm.model_name"
                outlined
                dense
                disable
                label="Model"
                hide-bottom-space
              />
            </div>
          </div>

          <!-- Assigned Office Selection (Single-Line Trigger + Sticky In-Menu Search) -->
          <div>
            <q-select
              v-model="deviceForm.department_id"
              :options="filteredOfficeOptions"
              emit-value
              map-options
              outlined
              dense
              options-dense
              label="Assigned Office *"
              :loading="loadingOffices"
              :rules="[val => !!val || 'Assigned office is required']"
              hide-bottom-space
              @popup-show="officeSearchQuery = ''"
              @update:model-value="onOfficeSelected"
            >
              <template #prepend>
                <q-icon name="apartment" color="primary" />
              </template>
              <template #selected-item="scope">
                <div class="ellipsis text-dark">
                  {{ scope.opt.label || scope.opt }}
                </div>
              </template>
              <template #before-options>
                <div class="q-pa-sm bg-white sticky-office-search">
                  <q-input
                    v-model="officeSearchQuery"
                    dense
                    outlined
                    clearable
                    autofocus
                    placeholder="Search office name or acronym..."
                  >
                    <template #prepend>
                      <q-icon name="search" size="18px" color="grey-6" />
                    </template>
                  </q-input>
                </div>
                <q-separator />
              </template>
              <template #no-option>
                <div class="q-pa-sm bg-white sticky-office-search">
                  <q-input
                    v-model="officeSearchQuery"
                    dense
                    outlined
                    clearable
                    autofocus
                    placeholder="Search office name or acronym..."
                  >
                    <template #prepend>
                      <q-icon name="search" size="18px" color="grey-6" />
                    </template>
                  </q-input>
                </div>
                <q-separator />
                <q-item>
                  <q-item-section class="text-grey-6 text-caption">
                    No matching office found in library
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>
        </q-card-section>

        <!-- Dialog Footer -->
        <q-card-actions align="right" class="q-px-md q-py-sm bg-grey-1 dialog-footer">
          <q-btn flat no-caps label="Cancel" color="grey-7" @click="showDeviceDialog = false" />
          <q-btn
            unelevated
            no-caps
            label="Save Changes"
            color="primary"
            class="text-weight-bold q-px-md"
            :loading="submittingDevice"
            @click="submitDeviceForm"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="showDeleteDialog" persistent>
      <q-card style="width: 440px; max-width: 95vw;" class="rounded-borders overflow-hidden">
        <q-card-section class="row items-center justify-between bg-negative text-white q-py-sm q-px-md">
          <div class="row items-center q-gutter-x-sm">
            <q-icon name="warning" size="22px" />
            <span class="text-subtitle1 text-weight-bold">Delete Biometric Device?</span>
          </div>
          <q-btn icon="close" flat round dense text-color="white" @click="showDeleteDialog = false" />
        </q-card-section>

        <q-card-section class="q-pa-md">
          <div class="text-body2 text-grey-9">
            Are you sure you want to remove <strong>{{ activeDeleteDevice?.device_name }}</strong>
            (<code class="font-mono">{{ activeDeleteDevice?.serial_number }}</code>)?
          </div>
          <div class="text-caption text-grey-7 q-mt-sm">
            The device record will be deleted from the system. If the physical terminal continues sending heartbeats, it will reconnect automatically.
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-py-sm bg-grey-1">
          <q-btn flat no-caps label="Cancel" color="grey-7" @click="showDeleteDialog = false" />
          <q-btn
            unelevated
            no-caps
            label="Delete Device"
            color="negative"
            icon="delete"
            class="text-weight-bold q-px-md"
            :loading="submittingDevice"
            @click="submitDeleteDevice"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useQuasar, copyToClipboard } from 'quasar'
import { storeToRefs } from 'pinia'
import { useBiometricDeviceStore } from 'stores/biometric-device-store'

const $q = useQuasar()
const deviceStore = useBiometricDeviceStore()

const {
  loading,
  submittingDevice,
  devicesList,
  loadingOffices,
  deviceStats,
  allOfficeOptions,
} = storeToRefs(deviceStore)
const { isDeviceOnline, getDeviceLastSeen } = deviceStore

const searchTerm = ref('')
const statusFilter = ref('all')

const statusOptions = [
  { label: 'All Devices', value: 'all' },
  { label: 'Online Only', value: 'online' },
  { label: 'Offline Only', value: 'offline' },
]

function formatDeviceTime(val) {
  if (!val) return 'Never'
  try {
    const d = new Date(val)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(val)
  }
}

function formatDeviceName(dev) {
  if (!dev) return 'Biometric Device'
  return dev.device_name || `Terminal ${dev.serial_number}` || 'Biometric Device'
}

const hasActiveFilters = computed(() => {
  return Boolean((searchTerm.value && searchTerm.value.trim() !== '') || statusFilter.value !== 'all')
})

const filteredDevices = computed(() => {
  let list = devicesList.value

  if (statusFilter.value === 'online') {
    list = list.filter((d) => isDeviceOnline(d))
  } else if (statusFilter.value === 'offline') {
    list = list.filter((d) => !isDeviceOnline(d))
  }

  if (searchTerm.value && searchTerm.value.trim() !== '') {
    const q = searchTerm.value.trim().toLowerCase()
    list = list.filter((d) => {
      const name = (d.device_name || '').toLowerCase()
      const sn = (d.serial_number || '').toLowerCase()
      const loc = (d.location || d.department_name || d.office_acronym || '').toLowerCase()
      const ip = (d.ip_address || '').toLowerCase()
      return name.includes(q) || sn.includes(q) || loc.includes(q) || ip.includes(q)
    })
  }

  return list
})

const pagination = ref({
  sortBy: 'status',
  descending: true,
  page: 1,
  rowsPerPage: 10,
})

const columns = [
  {
    name: 'device_info',
    label: 'Device',
    align: 'left',
    field: (row) => row.device_name,
    sortable: true,
  },
  {
    name: 'serial_number',
    label: 'Serial Number',
    align: 'left',
    field: 'serial_number',
    sortable: true,
  },
  {
    name: 'assigned_office',
    label: 'Assigned Office',
    align: 'left',
    field: (row) => row.office_acronym || row.department_name || '',
    sortable: true,
  },
  {
    name: 'network',
    label: 'IP & Heartbeat',
    align: 'left',
    field: (row) => row.ip_address || '',
    sortable: true,
  },
  {
    name: 'status',
    label: 'Status',
    align: 'center',
    field: (row) => (isDeviceOnline(row) ? 1 : 0),
    sortable: true,
  },
  {
    name: 'actions',
    label: 'Actions',
    align: 'right',
    field: 'id',
    sortable: false,
  },
]

function resetFilters() {
  searchTerm.value = ''
  statusFilter.value = 'all'
}

async function fetchDevices(silent = false) {
  try {
    await deviceStore.fetchDevices(silent)
  } catch (err) {
    if (!silent) {
      console.error('Failed to load biometric devices:', err)
      $q.notify({
        type: 'negative',
        message: err.response?.data?.message || 'Failed to load biometric devices.',
        position: 'top',
      })
    }
  }
}

function copySerialNumber(sn) {
  copyToClipboard(sn)
    .then(() => {
      $q.notify({
        type: 'positive',
        message: `Serial Number '${sn}' copied to clipboard.`,
        position: 'top',
        timeout: 2000,
      })
    })
    .catch(() => {})
}

// Office Library (Assigned Office Dropdown)
const officeSearchQuery = ref('')

const filteredOfficeOptions = computed(() => {
  const needle = (officeSearchQuery.value || '').toLowerCase().trim()
  if (!needle) return allOfficeOptions.value
  return allOfficeOptions.value.filter(
    (opt) =>
      (opt.name || '').toLowerCase().includes(needle) ||
      (opt.acronym || '').toLowerCase().includes(needle)
  )
})

async function fetchOffices() {
  try {
    await deviceStore.fetchOffices()
  } catch (err) {
    console.error('Failed to load offices from library:', err)
  }
}

function onOfficeSelected(val) {
  const match = deviceStore.officesList.find((d) => d.id === val)
  if (match) {
    deviceForm.department_id = match.id
    if (!deviceForm.device_name && match.acronym) {
      deviceForm.device_name = match.acronym
    }
  }
}

// Edit Device Dialog
const showDeviceDialog = ref(false)
const activeDevice = ref(null)

const deviceForm = reactive({
  device_name: '',
  serial_number: '',
  model_name: 'MB360',
  department_id: null,
  zkbio_area_id: null,
  is_primary: true,
  comm_key: '0',
  ip_address: '',
})

function openEditDeviceDialog(dev) {
  activeDevice.value = dev
  deviceForm.device_name = dev.device_name || ''
  deviceForm.serial_number = dev.serial_number || ''
  deviceForm.model_name = dev.model || dev.model_name || 'MB360'
  deviceForm.department_id = dev.department_id ? Number(dev.department_id) : null
  deviceForm.zkbio_area_id = dev.zkbio_area_id ? Number(dev.zkbio_area_id) : null
  deviceForm.is_primary = dev.is_primary !== undefined ? Boolean(dev.is_primary) : true
  deviceForm.comm_key = dev.comm_key || '0'
  deviceForm.ip_address = dev.ip_address || ''
  showDeviceDialog.value = true
}

async function submitDeviceForm() {
  if (!activeDevice.value?.id) return

  if (!deviceForm.device_name || !deviceForm.serial_number || !deviceForm.department_id) {
    $q.notify({
      type: 'warning',
      message: 'Device name, serial number, and assigned office are required.',
      position: 'top',
    })
    return
  }

  try {
    const data = await deviceStore.updateDevice(activeDevice.value.id, deviceForm)
    $q.notify({
      type: 'positive',
      message: data?.message || 'Device updated successfully.',
      position: 'top',
    })
    showDeviceDialog.value = false
    await fetchDevices()
  } catch (err) {
    console.error('Failed to save device:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to save device.',
      position: 'top',
    })
  }
}

// Delete Device
const showDeleteDialog = ref(false)
const activeDeleteDevice = ref(null)

function confirmDeleteDevice(dev) {
  activeDeleteDevice.value = dev
  showDeleteDialog.value = true
}

async function submitDeleteDevice() {
  if (!activeDeleteDevice.value) return
  try {
    const data = await deviceStore.deleteDevice(activeDeleteDevice.value.id)
    $q.notify({
      type: 'positive',
      message: data?.message || 'Device deleted successfully.',
      position: 'top',
    })
    showDeleteDialog.value = false
    await fetchDevices()
  } catch (err) {
    console.error('Failed to delete device:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to delete device.',
      position: 'top',
    })
  }
}

let pollTimer = null

onMounted(() => {
  fetchDevices()
  fetchOffices()
  pollTimer = setInterval(() => {
    fetchDevices(true)
  }, 10000)
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})
</script>

<style scoped>
.biometric-devices-page {
  max-width: 1300px;
  margin: 0 auto;
}

.stat-card {
  border-color: #e5e7eb;
  transition: all 0.18s ease;
}

.stat-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
}

.stat-card-active-all {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.stat-card-active-online {
  border-color: #10b981;
  box-shadow: 0 0 0 1px #10b981;
}

.stat-card-active-offline {
  border-color: #64748b;
  box-shadow: 0 0 0 1px #64748b;
}

.font-mono {
  font-family: monospace;
}

.biometric-table {
  border-radius: 8px;
  background-color: #ffffff;
}

.biometric-table :deep(thead tr th) {
  background-color: #f8fafc;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.biometric-table :deep(tbody tr td) {
  font-size: 0.875rem;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.biometric-table :deep(tbody tr:hover td) {
  background-color: #f8fafc;
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 0.75rem;
  line-height: 1;
}

.status-indicator.online {
  background-color: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.status-indicator.offline {
  background-color: #f3f4f6;
  color: #4b5563;
  border: 1px solid #e5e7eb;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #10b981;
  position: relative;
  display: inline-block;
}

.pulse-dot::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: rgba(16, 185, 129, 0.45);
  animation: pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.8);
    opacity: 0.9;
  }
  80%, 100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

.offline-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #9ca3af;
  display: inline-block;
}

.dialog-header-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.22);
}

.dialog-form-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dialog-footer {
  border-top: 1px solid #e2e8f0;
}

.sticky-office-search {
  position: sticky;
  top: 0;
  z-index: 2;
}
</style>
