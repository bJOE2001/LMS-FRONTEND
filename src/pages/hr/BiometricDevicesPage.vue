<template>
  <q-page class="q-pa-md biometric-devices-page">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="row items-center q-gutter-x-sm">
          <q-icon name="devices" size="32px" color="primary" />
          <h1 class="text-h4 text-weight-bold q-my-none">Biometric Devices</h1>
        </div>
      </div>
      <q-btn
        color="primary"
        icon="add"
        label="Add Device"
        unelevated
        no-caps
        @click="openAddDeviceDialog"
      />
    </div>

    <!-- Summary Stat Cards (Clean 3-Card Grid) -->
    <div class="row q-col-gutter-sm q-mb-md">
      <!-- Total Devices -->
      <div class="col-12 col-sm-4">
        <q-card flat bordered class="rounded-borders bg-white stat-card">
          <q-card-section class="q-py-md">
            <div class="row items-center no-wrap">
              <q-avatar size="40px" color="blue-1" text-color="blue-9" class="q-mr-md">
                <q-icon name="devices" size="22px" />
              </q-avatar>
              <div>
                <div class="text-caption text-grey-7">Total Devices</div>
                <div class="text-h5 text-weight-bold text-dark">{{ stats.total }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Online -->
      <div class="col-12 col-sm-4">
        <q-card flat bordered class="rounded-borders bg-white stat-card">
          <q-card-section class="q-py-md">
            <div class="row items-center no-wrap">
              <q-avatar size="40px" color="green-1" text-color="green-9" class="q-mr-md">
                <q-icon name="wifi" size="22px" />
              </q-avatar>
              <div>
                <div class="text-caption text-grey-7">Online</div>
                <div class="text-h5 text-weight-bold text-positive">{{ stats.online }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Offline -->
      <div class="col-12 col-sm-4">
        <q-card flat bordered class="rounded-borders bg-white stat-card">
          <q-card-section class="q-py-md">
            <div class="row items-center no-wrap">
              <q-avatar size="40px" color="grey-2" text-color="grey-8" class="q-mr-md">
                <q-icon name="wifi_off" size="22px" />
              </q-avatar>
              <div>
                <div class="text-caption text-grey-7">Offline</div>
                <div class="text-h5 text-weight-bold text-grey-8">{{ stats.offline }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
    <q-card flat bordered class="rounded-borders q-mb-md">
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
              placeholder="Search by device label, serial number, IP, or location..."
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>

          <!-- View Mode Toggle -->
          <div class="col-12 col-sm-auto">
            <q-btn-toggle
              v-model="viewMode"
              dense
              rounded
              unelevated
              no-caps
              toggle-color="primary"
              color="grey-2"
              text-color="grey-8"
              :options="[
                { label: 'Table', value: 'table', icon: 'view_list' },
                { label: 'Cards', value: 'grid', icon: 'grid_view' },
              ]"
            />
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
        :name="searchTerm || statusFilter !== 'all' ? 'search_off' : 'developer_board_off'"
        size="64px"
        color="grey-4"
      />
      <div class="text-h6 q-mt-sm">
        {{ searchTerm || statusFilter !== 'all' ? 'No matching biometric devices' : 'No biometric devices found' }}
      </div>
      <div class="text-caption text-grey-6 q-mb-md">
        {{ searchTerm || statusFilter !== 'all' ? 'Try adjusting your search query or status filter.' : 'Biometric devices will automatically appear here once connected to the network.' }}
      </div>
      <q-btn
        v-if="searchTerm || statusFilter !== 'all'"
        outline
        no-caps
        color="primary"
        icon="filter_alt_off"
        label="Reset Filters"
        @click="resetFilters"
      />
    </div>

    <!-- Table View -->
    <div v-else-if="viewMode === 'table'">
      <q-table
        :rows="filteredDevices"
        :columns="columns"
        row-key="id"
        flat
        bordered
        :loading="loading"
        v-model:pagination="pagination"
        :rows-per-page-options="[10, 20, 50, 0]"
        class="biometric-table"
      >
        <!-- Device Info Column -->
        <template #body-cell-device_info="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <q-avatar size="32px" color="blue-1" text-color="primary" class="q-mr-sm">
                <q-icon name="devices" size="18px" />
              </q-avatar>
              <div>
                <div class="text-weight-bold text-dark ellipsis" style="max-width: 240px;">
                  {{ formatDeviceName(props.row) }}
                  <q-tooltip>{{ props.row.device_name }}</q-tooltip>
                </div>
                <div class="text-caption text-grey-6">
                  {{ props.row.model || props.row.model_name || 'MB360' }}
                </div>
              </div>
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
            <span v-if="props.row.status === 'PENDING_APPROVAL' && !props.row.department_id" class="text-grey-5 text-italic text-caption">
              Awaiting Office Assignment
            </span>
            <div v-else-if="props.row.department_id" class="row items-center no-wrap">
              <q-chip
                dense
                color="primary"
                text-color="white"
                class="text-weight-bold font-mono q-mr-xs"
                size="sm"
              >
                {{ props.row.office_acronym || 'OFFICE' }}
              </q-chip>
              <span class="text-dark ellipsis" style="max-width: 220px;">
                {{ props.row.department_name }}
                <q-tooltip>{{ props.row.department_name }}</q-tooltip>
              </span>
              <q-badge v-if="props.row.is_primary" color="amber-9" class="q-ml-xs text-white" rounded>
                Primary
              </q-badge>
            </div>
            <span v-else class="text-grey-5 text-italic text-caption">
              Unassigned
            </span>
          </q-td>
        </template>

        <!-- ZKBio Area Column -->
        <template #body-cell-zkbio_area="props">
          <q-td :props="props">
            <q-badge
              v-if="props.row.zkbio_area_id"
              color="blue-grey-1"
              text-color="blue-grey-9"
              class="q-pa-xs text-weight-medium font-mono"
            >
              <q-icon name="hub" size="14px" class="q-mr-xs text-primary" />
              {{ props.row.zkbio_area_name || `Area ${props.row.zkbio_area_id}` }}
            </q-badge>
            <span v-else class="text-grey-5 text-caption text-italic">
              No Area
            </span>
          </q-td>
        </template>

        <!-- Network Column -->
        <template #body-cell-network="props">
          <q-td :props="props">
            <code class="text-caption font-mono text-dark">{{ props.row.ip_address || 'Dynamic / DHCP' }}</code>
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
            <div class="row inline no-wrap items-center q-gutter-x-sm">
              <q-btn
                flat
                round
                dense
                size="sm"
                color="primary"
                icon="edit"
                @click="openEditDeviceDialog(props.row)"
              >
                <q-tooltip>Edit details</q-tooltip>
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

    <!-- Devices Grid -->
    <div v-else-if="viewMode === 'grid'" class="row q-col-gutter-md">
      <div
        v-for="dev in filteredDevices"
        :key="dev.id"
        class="col-12 col-sm-6 col-lg-4"
      >
        <q-card flat bordered class="rounded-borders device-card bg-white column justify-between full-height">
          <q-card-section class="q-pa-md">
            <!-- Card Header: Title, Model & Online Badge -->
            <div class="row items-start justify-between no-wrap q-mb-sm">
              <div>
                <div class="text-subtitle1 text-weight-bold text-dark ellipsis" style="max-width: 220px;">
                  {{ dev.device_name }}
                  <q-tooltip>{{ dev.device_name }}</q-tooltip>
                </div>
                <div class="text-caption text-grey-7">
                  Model: <span class="text-weight-medium text-dark">{{ dev.model || dev.model_name || 'MB360' }}</span>
                </div>
              </div>

              <div class="column items-end q-gutter-y-xs">
                <q-badge
                  rounded
                  :color="isDeviceOnline(dev) ? 'positive' : 'grey-5'"
                  :label="isDeviceOnline(dev) ? 'Online' : 'Offline'"
                  class="text-weight-bold q-px-sm q-py-xs"
                >
                  <q-icon
                    :name="isDeviceOnline(dev) ? 'wifi' : 'wifi_off'"
                    size="12px"
                    class="q-mr-xs"
                  />
                </q-badge>
              </div>
            </div>

            <!-- Serial Number with Copy Button -->
            <div class="row items-center q-gutter-x-xs q-mb-xs">
              <span class="text-caption text-grey-6 text-weight-medium">SN:</span>
              <q-chip
                dense
                clickable
                color="grey-2"
                text-color="dark"
                icon="content_copy"
                class="font-mono text-caption q-my-none"
                @click="copySerialNumber(dev.serial_number)"
              >
                {{ dev.serial_number }}
                <q-tooltip>Click to copy Serial Number</q-tooltip>
              </q-chip>
            </div>

            <!-- Office -->
            <div class="row items-center q-gutter-x-xs text-caption text-grey-8 q-mb-xs">
              <q-icon name="apartment" size="16px" color="primary" />
              <q-chip
                v-if="dev.office_acronym"
                dense
                color="primary"
                text-color="white"
                class="text-weight-bold font-mono q-mr-xs"
                size="sm"
              >
                {{ dev.office_acronym }}
              </q-chip>
              <span class="ellipsis" style="max-width: 220px;">
                {{ dev.department_name || 'Unassigned' }}
                <q-tooltip>{{ dev.department_name }}</q-tooltip>
              </span>
              <q-badge v-if="dev.is_primary" color="amber-9" class="q-ml-xs text-white" rounded>
                Primary
              </q-badge>
            </div>

            <!-- ZKBio Area -->
            <div class="row items-center q-gutter-x-xs text-caption text-grey-7 q-mb-xs">
              <q-icon name="hub" size="16px" color="blue-grey-6" />
              <span>ZKBio Area: <strong>{{ dev.zkbio_area_name || (dev.zkbio_area_id ? `Area ${dev.zkbio_area_id}` : 'None') }}</strong></span>
            </div>

            <!-- IP Address & Comm Key -->
            <div class="row items-center justify-between text-caption text-grey-7 q-mb-xs">
              <div class="row items-center q-gutter-x-xs">
                <q-icon name="router" size="16px" color="grey-6" />
                <span>IP: <code>{{ dev.ip_address || 'Dynamic / DHCP' }}</code></span>
              </div>
              <div>Comm Key: <code>{{ dev.comm_key || '0' }}</code></div>
            </div>

            <!-- Last Seen Timestamp -->
            <div class="row items-center q-gutter-x-xs text-caption text-grey-6 q-mt-xs">
              <q-icon name="access_time" size="14px" color="grey-5" />
              <span>Last Heartbeat: <strong>{{ formatDeviceTime(dev.last_activity_at || dev.last_heartbeat_at || dev.last_sync_at) }}</strong></span>
            </div>

            <!-- Hardware Counters (if reported by device) -->
            <div
              v-if="dev.device_user_count > 0 || dev.device_log_count > 0"
              class="row q-col-gutter-xs q-mt-sm bg-grey-1 rounded-borders q-pa-xs text-center"
            >
              <div class="col-6 text-caption text-grey-7">
                Users: <strong>{{ dev.device_user_count }}</strong>
              </div>
              <div class="col-6 text-caption text-grey-7">
                Punches: <strong>{{ dev.device_log_count }}</strong>
              </div>
            </div>
          </q-card-section>

          <!-- Card Actions Footer -->
          <div>
            <q-separator />
            <div class="row items-center justify-between q-pa-sm bg-grey-1">
              <div class="text-caption">
                <span :class="isDeviceOnline(dev) ? 'text-positive text-weight-bold' : 'text-grey-6'">
                  ● {{ isDeviceOnline(dev) ? 'Online' : 'Offline' }}
                </span>
              </div>

              <!-- Edit & Delete Buttons -->
              <div class="row q-gutter-x-xs">
                <q-btn
                  flat
                  round
                  dense
                  size="sm"
                  color="primary"
                  icon="edit"
                  @click="openEditDeviceDialog(dev)"
                >
                  <q-tooltip>Edit device details</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  round
                  dense
                  size="sm"
                  color="negative"
                  icon="delete_outline"
                  @click="confirmDeleteDevice(dev)"
                >
                  <q-tooltip>Delete device</q-tooltip>
                </q-btn>
              </div>
            </div>
          </div>
        </q-card>
      </div>
    </div>

    <!-- Add / Edit Biometric Device Dialog -->
    <q-dialog v-model="showDeviceDialog" persistent>
      <q-card style="width: 580px; max-width: 95vw;" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none bg-primary text-white">
          <div class="text-h6 text-weight-bold flex items-center q-gutter-x-sm">
            <q-icon :name="isCreatingDevice ? 'add_to_queue' : 'edit'" size="22px" />
            <span>{{ isCreatingDevice ? 'Add Biometric Device' : 'Edit Biometric Device' }}</span>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense text-color="white" @click="showDeviceDialog = false" />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="text-caption text-grey-7 q-mb-md">
            {{ isCreatingDevice ? 'Register a new physical ZKTeco terminal and map it to an office.' : `Update device configuration for terminal ${deviceForm.serial_number}.` }}
          </div>

          <div class="q-gutter-y-md">
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="deviceForm.device_name"
                  outlined
                  dense
                  label="Device Label / Friendly Name *"
                  placeholder="e.g. CHRMO, CICTMO"
                  :rules="[val => !!val || 'Device name is required']"
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="deviceForm.serial_number"
                  outlined
                  dense
                  label="Serial Number *"
                  placeholder="e.g. KMY2252000112"
                  :disable="!isCreatingDevice"
                  :rules="[val => !!val || 'Serial number is required']"
                />
              </div>
            </div>

            <!-- Assigned Office Selection -->
            <div>
              <q-select
                v-model="deviceForm.department_id"
                :options="filteredOfficeOptions"
                emit-value
                map-options
                use-input
                input-debounce="0"
                outlined
                dense
                label="Assigned Office *"
                placeholder="Search office from library..."
                :loading="loadingOffices"
                :rules="[val => !!val || 'Assigned office is required']"
                @filter="filterOffices"
                @update:model-value="onOfficeSelected"
              >
                <template #prepend>
                  <q-icon name="apartment" color="primary" />
                </template>
                <template #no-option>
                  <q-item>
                    <q-item-section class="text-grey-6">
                      No matching office found in library
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>

            <!-- ZKBio Time Area Selection -->
            <div>
              <q-select
                v-model="deviceForm.zkbio_area_id"
                :options="zkBioAreaOptions"
                emit-value
                map-options
                outlined
                dense
                label="ZKBio Time Area *"
                :rules="[
                  val => !!val || 'ZKBio Area is required',
                  val => Number(val) !== 1 || 'Area 1 is prohibited (Default non-sync area)'
                ]"
              >
                <template #prepend>
                  <q-icon name="hub" color="primary" />
                </template>
                <template #option="scope">
                  <q-item v-bind="scope.itemProps" :disable="scope.opt.disable">
                    <q-item-section>
                      <q-item-label :class="{ 'text-grey-5': scope.opt.disable }">
                        {{ scope.opt.label }}
                      </q-item-label>
                      <q-item-label v-if="scope.opt.disable" caption class="text-negative">
                        Default non-synchronizing area — data will not transfer
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
              <div class="text-caption text-grey-6 q-mt-xs">
                * Note: Area 1 is prohibited because ZKBio Time disables cross-terminal sync for the default area.
              </div>
            </div>

            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="deviceForm.ip_address"
                  outlined
                  dense
                  label="IP Address"
                  placeholder="e.g. 192.168.8.230"
                />
              </div>
              <div class="col-12 col-sm-3">
                <q-input
                  v-model="deviceForm.model_name"
                  outlined
                  dense
                  label="Model"
                />
              </div>
              <div class="col-12 col-sm-3">
                <q-input
                  v-model="deviceForm.comm_key"
                  outlined
                  dense
                  label="Comm Key"
                />
              </div>
            </div>

            <q-toggle
              v-model="deviceForm.is_primary"
              label="Primary Terminal for this Office"
              color="primary"
            />
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md bg-grey-1">
          <q-btn flat no-caps label="Cancel" color="grey-7" @click="showDeviceDialog = false" />
          <q-btn
            unelevated
            no-caps
            :label="isCreatingDevice ? 'Authorize Device' : 'Save Changes'"
            color="primary"
            :loading="submittingDevice"
            @click="submitDeviceForm"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="showDeleteDialog" persistent>
      <q-card style="width: 440px; max-width: 95vw;" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none bg-negative text-white">
          <div class="text-h6 text-weight-bold flex items-center q-gutter-x-sm">
            <q-icon name="warning" size="22px" />
            <span>Delete Biometric Device?</span>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense text-color="white" @click="showDeleteDialog = false" />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="text-body2 text-grey-8">
            Are you sure you want to remove <strong>{{ activeDeleteDevice?.device_name }}</strong> (SN: {{ activeDeleteDevice?.serial_number }})?
          </div>
          <div class="text-caption text-grey-7 q-mt-sm">
            The device record will be deleted from the system. If the physical terminal continues sending heartbeats, it will reconnect automatically.
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md bg-grey-1">
          <q-btn flat no-caps label="Cancel" color="grey-7" @click="showDeleteDialog = false" />
          <q-btn
            unelevated
            no-caps
            label="Delete Device"
            color="negative"
            icon="delete"
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
import { api } from 'boot/axios'

const $q = useQuasar()

const loading = ref(false)
const submittingDevice = ref(false)

const searchTerm = ref('')
const statusFilter = ref('all')

const statusOptions = [
  { label: 'All Devices', value: 'all' },
  { label: 'Online Only', value: 'online' },
  { label: 'Offline Only', value: 'offline' },
]

const devicesList = ref([])

const stats = reactive({
  total: 0,
  online: 0,
  offline: 0,
})

function isDeviceOnline(dev) {
  if (!dev || !dev.is_active) return false
  const lastTime = dev.last_heartbeat_at || dev.last_activity_at || dev.last_sync_at
  if (!lastTime) return false
  const diffSec = (Date.now() - new Date(lastTime).getTime()) / 1000
  return diffSec <= 180
}

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

function calculateStats() {
  stats.total = devicesList.value.length
  stats.online = devicesList.value.filter(d => isDeviceOnline(d)).length
  stats.offline = devicesList.value.filter(d => !isDeviceOnline(d)).length
}

const filteredDevices = computed(() => {
  let list = devicesList.value

  if (statusFilter.value === 'online') {
    list = list.filter(d => isDeviceOnline(d))
  } else if (statusFilter.value === 'offline') {
    list = list.filter(d => !isDeviceOnline(d))
  }

  if (searchTerm.value && searchTerm.value.trim() !== '') {
    const q = searchTerm.value.trim().toLowerCase()
    list = list.filter(d => {
      const name = (d.device_name || '').toLowerCase()
      const sn = (d.serial_number || '').toLowerCase()
      const loc = (d.location || d.department_name || '').toLowerCase()
      const ip = (d.ip_address || '').toLowerCase()
      return name.includes(q) || sn.includes(q) || loc.includes(q) || ip.includes(q)
    })
  }

  return list
})

const viewMode = ref('table')

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
    field: row => row.device_name,
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
    label: 'Office',
    align: 'left',
    field: row => row.office_acronym || row.department_name || '',
    sortable: true,
  },
  {
    name: 'zkbio_area',
    label: 'ZKBio Area',
    align: 'left',
    field: row => row.zkbio_area_id || 0,
    sortable: true,
  },
  {
    name: 'network',
    label: 'IP Address',
    align: 'left',
    field: row => row.ip_address || '',
    sortable: true,
  },
  {
    name: 'status',
    label: 'Status',
    align: 'center',
    field: row => (isDeviceOnline(row) ? 1 : 0),
    sortable: true,
  },
  {
    name: 'actions',
    label: 'Action',
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
  if (!silent) loading.value = true
  try {
    const response = await api.get('/attendance/devices')
    devicesList.value = response.data.devices || []
    calculateStats()
  } catch (err) {
    if (!silent) {
      console.error('Failed to load biometric devices:', err)
      $q.notify({
        type: 'negative',
        message: err.response?.data?.message || 'Failed to load biometric devices.',
        position: 'top',
      })
    }
  } finally {
    if (!silent) loading.value = false
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
const loadingOffices = ref(false)
const officesList = ref([])
const filteredOfficeOptions = ref([])

async function fetchOffices() {
  loadingOffices.value = true
  try {
    const { data } = await api.get('/departments')
    const list = Array.isArray(data?.departments) ? data.departments : []
    officesList.value = list
    filteredOfficeOptions.value = list.map(d => ({
      label: d.acronym ? `[${d.acronym}] ${d.name}` : d.name,
      value: d.id,
      acronym: d.acronym,
      name: d.name,
    }))
  } catch (err) {
    console.error('Failed to load offices from library:', err)
  } finally {
    loadingOffices.value = false
  }
}

function filterOffices(val, update) {
  update(() => {
    const needle = (val || '').toLowerCase().trim()
    const options = officesList.value.map(d => ({
      label: d.acronym ? `[${d.acronym}] ${d.name}` : d.name,
      value: d.id,
      acronym: d.acronym,
      name: d.name,
    }))
    if (!needle) {
      filteredOfficeOptions.value = options
    } else {
      filteredOfficeOptions.value = options.filter(opt =>
        opt.label.toLowerCase().includes(needle)
      )
    }
  })
}

function onOfficeSelected(val) {
  const match = officesList.value.find(d => d.id === val)
  if (match) {
    deviceForm.department_id = match.id
    if (!deviceForm.device_name && match.acronym) {
      deviceForm.device_name = match.acronym
    }
  }
}

// ZKBio Time Areas
const zkBioAreasList = ref([])
const zkBioAreaOptions = computed(() => {
  return zkBioAreasList.value.map(a => ({
    label: a.label || `Area ${a.id} (${a.area_name})`,
    value: a.id,
    disable: a.is_prohibited === true || a.id === 1,
  }))
})

async function fetchZkBioAreas() {
  try {
    const { data } = await api.get('/attendance/zkbio-areas')
    zkBioAreasList.value = data?.areas || []
  } catch (err) {
    console.error('Failed to load ZKBio Time areas:', err)
  }
}

// Add / Edit Device Dialog
const showDeviceDialog = ref(false)
const isCreatingDevice = ref(false)
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

function openAddDeviceDialog() {
  isCreatingDevice.value = true
  activeDevice.value = null
  deviceForm.device_name = ''
  deviceForm.serial_number = ''
  deviceForm.model_name = 'MB360'
  deviceForm.department_id = null
  deviceForm.zkbio_area_id = null
  deviceForm.is_primary = true
  deviceForm.comm_key = '0'
  deviceForm.ip_address = ''
  showDeviceDialog.value = true
}

function openEditDeviceDialog(dev) {
  isCreatingDevice.value = false
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
  if (!deviceForm.device_name || !deviceForm.serial_number || !deviceForm.department_id || !deviceForm.zkbio_area_id) {
    $q.notify({
      type: 'warning',
      message: 'Device name, serial number, assigned office, and ZKBio Area are required.',
      position: 'top',
    })
    return
  }

  if (Number(deviceForm.zkbio_area_id) === 1) {
    $q.notify({
      type: 'negative',
      message: 'Area 1 is prohibited as it is the default non-synchronizing area in ZKBio Time.',
      position: 'top',
    })
    return
  }

  submittingDevice.value = true
  try {
    let response
    if (isCreatingDevice.value || !activeDevice.value?.id) {
      response = await api.post('/attendance/devices', deviceForm)
    } else {
      response = await api.post(`/attendance/devices/${activeDevice.value.id}/update`, deviceForm)
    }

    $q.notify({
      type: 'positive',
      message: response.data.message || (isCreatingDevice.value ? 'Device registered successfully.' : 'Device updated successfully.'),
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
  } finally {
    submittingDevice.value = false
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
  submittingDevice.value = true
  try {
    const response = await api.post(`/attendance/devices/${activeDeleteDevice.value.id}/delete`)
    $q.notify({
      type: 'positive',
      message: response.data.message || 'Device deleted successfully.',
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
  } finally {
    submittingDevice.value = false
  }
}

let pollTimer = null

onMounted(() => {
  fetchDevices()
  fetchOffices()
  fetchZkBioAreas()
  pollTimer = setInterval(() => {
    fetchDevices(true)
  }, 10000) // Auto-refresh device status every 10 seconds
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
}

.device-card {
  border-color: #e5e7eb;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.device-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
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

.border-amber {
  border: 1px solid #f59e0b;
}
</style>
