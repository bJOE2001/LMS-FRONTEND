<template>
  <q-page class="q-pa-md biometric-devices-page">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="row items-center q-gutter-x-sm">
          <q-icon name="devices" size="32px" color="primary" />
          <h1 class="text-h4 text-weight-bold q-my-none">Biometric Devices</h1>
        </div>
        <div class="text-subtitle2 text-grey-7 q-mt-xs">
          Manage authorized ZKTeco MB360 biometric devices, monitor real-time ADMS heartbeats, and control network access.
        </div>
      </div>

      <div class="row q-gutter-sm items-center q-mt-sm q-mt-md-none">
        <q-btn
          flat
          round
          dense
          icon="refresh"
          color="grey-8"
          :loading="loading"
          @click="fetchDevices"
        >
          <q-tooltip>Refresh device status</q-tooltip>
        </q-btn>
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="add_circle"
          label="Authorize New Device"
          @click="openAddDeviceDialog"
        />
      </div>
    </div>

    <!-- Summary Stat Cards -->
    <div class="row q-col-gutter-sm q-mb-md">
      <!-- Total Devices -->
      <div class="col-6 col-sm-3">
        <q-card flat bordered class="rounded-borders bg-white stat-card">
          <q-card-section class="q-py-md">
            <div class="row items-center no-wrap">
              <q-avatar size="42px" color="blue-1" text-color="blue-9" class="q-mr-md">
                <q-icon name="devices" size="24px" />
              </q-avatar>
              <div>
                <div class="text-caption text-grey-7 text-weight-medium">Total Devices</div>
                <div class="text-h5 text-weight-bold text-dark">{{ stats.total }}</div>
              </div>
            </div>
            <div class="text-caption text-grey-6 q-mt-xs">Registered in BIO_DB</div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Online -->
      <div class="col-6 col-sm-3">
        <q-card flat bordered class="rounded-borders bg-white stat-card">
          <q-card-section class="q-py-md">
            <div class="row items-center no-wrap">
              <q-avatar size="42px" color="green-1" text-color="green-9" class="q-mr-md">
                <q-icon name="wifi" size="24px" />
              </q-avatar>
              <div>
                <div class="text-caption text-grey-7 text-weight-medium">Online Devices</div>
                <div class="text-h5 text-weight-bold text-positive">{{ stats.online }}</div>
              </div>
            </div>
            <div class="text-caption text-grey-6 q-mt-xs">Active ADMS heartbeat</div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Offline -->
      <div class="col-6 col-sm-3">
        <q-card flat bordered class="rounded-borders bg-white stat-card">
          <q-card-section class="q-py-md">
            <div class="row items-center no-wrap">
              <q-avatar size="42px" color="grey-2" text-color="grey-8" class="q-mr-md">
                <q-icon name="wifi_off" size="24px" />
              </q-avatar>
              <div>
                <div class="text-caption text-grey-7 text-weight-medium">Offline Devices</div>
                <div class="text-h5 text-weight-bold text-grey-8">{{ stats.offline }}</div>
              </div>
            </div>
            <div class="text-caption text-grey-6 q-mt-xs">No recent ping received</div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Authorized / Active -->
      <div class="col-6 col-sm-3">
        <q-card flat bordered class="rounded-borders bg-white stat-card">
          <q-card-section class="q-py-md">
            <div class="row items-center no-wrap">
              <q-avatar size="42px" color="teal-1" text-color="teal-9" class="q-mr-md">
                <q-icon name="verified_user" size="24px" />
              </q-avatar>
              <div>
                <div class="text-caption text-grey-7 text-weight-medium">Authorized</div>
                <div class="text-h5 text-weight-bold text-teal-9">{{ stats.authorized }}</div>
              </div>
            </div>
            <div class="text-caption text-grey-6 q-mt-xs">{{ stats.blocked }} device(s) blocked</div>
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
        {{ searchTerm || statusFilter !== 'all' ? 'Try adjusting your search query or status filter.' : 'Pre-authorize your first ZKTeco biometric device to enable ADMS synchronization.' }}
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
      <q-btn
        v-else
        unelevated
        no-caps
        color="primary"
        icon="add_circle"
        label="Authorize First Device"
        @click="openAddDeviceDialog"
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
              <q-avatar size="36px" color="blue-1" text-color="primary" class="q-mr-sm">
                <q-icon name="devices" size="20px" />
              </q-avatar>
              <div class="column justify-center items-start">
                <div class="text-weight-bold text-dark ellipsis" style="max-width: 240px;">
                  {{ props.row.device_name }}
                  <q-tooltip>{{ props.row.device_name }}</q-tooltip>
                </div>
                <div class="row items-center q-gutter-x-xs q-mt-xs">
                  <q-badge color="blue-grey-1" text-color="blue-grey-8" class="text-caption text-weight-medium">
                    {{ props.row.model || props.row.model_name || 'MB360' }}
                  </q-badge>
                  <q-badge color="indigo-1" text-color="indigo-8" class="text-caption text-weight-bold">
                    ADMS
                  </q-badge>
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
              class="font-mono text-caption q-my-none text-weight-medium"
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
            <div class="row items-center no-wrap">
              <q-icon name="apartment" size="18px" color="primary" class="q-mr-xs" />
              <span class="text-weight-medium text-dark ellipsis" style="max-width: 220px;">
                {{ props.row.department_name || props.row.location || 'Tagum City Hall' }}
                <q-tooltip>{{ props.row.department_name || props.row.location || 'Tagum City Hall' }}</q-tooltip>
              </span>
            </div>
          </q-td>
        </template>

        <!-- Network & Comm Key Column -->
        <template #body-cell-network="props">
          <q-td :props="props">
            <div class="column justify-center items-start">
              <div class="row items-center q-gutter-x-xs">
                <q-icon name="router" size="14px" color="grey-6" />
                <code class="text-caption font-mono text-weight-medium">{{ props.row.ip_address || 'Dynamic / DHCP' }}</code>
              </div>
              <div class="text-caption text-grey-6 q-mt-xs">
                Comm Key: <code class="text-weight-medium text-dark">{{ props.row.comm_key || '0' }}</code>
              </div>
            </div>
          </q-td>
        </template>

        <!-- Live Status Column -->
        <template #body-cell-status="props">
          <q-td :props="props" class="text-center">
            <div class="column items-center justify-center">
              <span
                :class="['status-indicator', isDeviceOnline(props.row) ? 'online' : 'offline']"
                :aria-label="isDeviceOnline(props.row) ? 'Online' : 'Offline'"
              >
                <span :class="isDeviceOnline(props.row) ? 'pulse-dot' : 'offline-dot'"></span>
                <span class="status-text text-weight-bold">
                  {{ isDeviceOnline(props.row) ? 'Online' : 'Offline' }}
                </span>
              </span>
              <div class="text-caption text-grey-6 q-mt-xs">
                {{ formatDeviceTime(props.row.last_activity_at || props.row.last_heartbeat_at || props.row.last_sync_at) }}
              </div>
            </div>
          </q-td>
        </template>

        <!-- Authorization Column -->
        <template #body-cell-authorization="props">
          <q-td :props="props" class="text-center">
            <div class="column items-center justify-center">
              <q-toggle
                :model-value="props.row.is_active"
                dense
                color="positive"
                :loading="togglingDeviceId === props.row.id"
                @update:model-value="toggleDevice(props.row)"
              >
                <q-tooltip>{{ props.row.is_active ? 'Click to disable and block this device' : 'Click to authorize this device' }}</q-tooltip>
              </q-toggle>
              <span
                class="text-caption text-weight-bold q-mt-xs"
                :class="props.row.is_active ? 'text-positive' : 'text-negative'"
              >
                {{ props.row.is_active ? 'Authorized' : 'Blocked' }}
              </span>
            </div>
          </q-td>
        </template>

        <!-- Actions Column -->
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <div class="row inline no-wrap q-gutter-x-xs">
              <q-btn
                flat
                round
                dense
                size="sm"
                color="primary"
                icon="edit"
                @click="openEditDeviceDialog(props.row)"
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

            <!-- Location -->
            <div class="row items-center q-gutter-x-xs text-caption text-grey-8 q-mb-xs">
              <q-icon name="place" size="16px" color="grey-6" />
              <span>{{ dev.location || dev.department_name || 'Tagum City Hall' }}</span>
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
              <!-- Authorization Toggle Switch -->
              <div class="row items-center q-gutter-x-xs">
                <q-toggle
                  :model-value="dev.is_active"
                  dense
                  color="positive"
                  :label="dev.is_active ? 'Authorized' : 'Blocked'"
                  :loading="togglingDeviceId === dev.id"
                  class="text-caption text-weight-bold"
                  :class="dev.is_active ? 'text-positive' : 'text-negative'"
                  @update:model-value="toggleDevice(dev)"
                >
                  <q-tooltip>{{ dev.is_active ? 'Click to disable and block this device' : 'Click to authorize this device' }}</q-tooltip>
                </q-toggle>
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

    <!-- Authorize New Biometric Device Dialog -->
    <q-dialog v-model="showAddDeviceDialog" persistent>
      <q-card style="width: 540px; max-width: 95vw;" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none bg-primary text-white">
          <div class="text-h6 text-weight-bold flex items-center q-gutter-x-sm">
            <q-icon name="security" size="22px" />
            <span>Authorize Biometric Device</span>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense text-color="white" @click="showAddDeviceDialog = false" />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="text-caption text-grey-7 q-mb-md">
            Whitelisting a device serial number permits it to connect to ADMS and push punches. Unlisted devices are rejected with <code>403 Forbidden</code>.
          </div>

          <div class="q-gutter-y-md">
            <q-input
              v-model="deviceForm.serial_number"
              outlined
              dense
              label="Device Serial Number (SN) *"
              placeholder="e.g. KMY2252000112"
              :rules="[val => !!val || 'Serial Number is required']"
            >
              <template #prepend>
                <q-icon name="fingerprint" />
              </template>
            </q-input>

            <q-input
              v-model="deviceForm.device_name"
              outlined
              dense
              label="Device Label / Friendly Name *"
              placeholder="e.g. MB360 - Mayor's Office Entrance"
              :rules="[val => !!val || 'Device name is required']"
            >
              <template #prepend>
                <q-icon name="badge" />
              </template>
            </q-input>

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input
                  v-model="deviceForm.model_name"
                  outlined
                  dense
                  label="Model"
                  placeholder="MB360"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="deviceForm.comm_key"
                  outlined
                  dense
                  label="Comm Key"
                  placeholder="0 (Default)"
                />
              </div>
            </div>

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-select
                  v-model="deviceForm.department_name"
                  :options="filteredOfficeOptions"
                  emit-value
                  map-options
                  use-input
                  input-debounce="0"
                  outlined
                  dense
                  label="Assigned Office *"
                  placeholder="Select office from library..."
                  :loading="loadingOffices"
                  :rules="[val => !!val || 'Assigned office is required']"
                  @filter="filterOffices"
                  @update:model-value="onOfficeSelectedForAdd"
                >
                  <template #prepend>
                    <q-icon name="apartment" />
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
              <div class="col-6">
                <q-input
                  v-model="deviceForm.ip_address"
                  outlined
                  dense
                  label="IP Address (Optional)"
                  placeholder="e.g. 192.168.8.230"
                />
              </div>
            </div>

            <!-- ADMS Device Config Guide Banner -->
            <q-banner rounded class="bg-blue-1 text-blue-9 text-caption">
              <div class="row items-center q-gutter-x-xs text-weight-bold">
                <q-icon name="info" size="18px" />
                <span>ZKTeco MB360 ADMS Setup Instructions:</span>
              </div>
              <div class="q-mt-xs">
                On the physical machine, go to <strong>Menu &gt; Comm. &gt; Cloud Server Setting</strong>.<br>
                Enter your Server IP / Domain and Port. Set <strong>Enable Domain Name</strong> accordingly.
              </div>
            </q-banner>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md bg-grey-1">
          <q-btn flat no-caps label="Cancel" color="grey-7" @click="showAddDeviceDialog = false" />
          <q-btn
            unelevated
            no-caps
            label="Authorize Device"
            color="primary"
            icon="verified_user"
            :loading="submittingDevice"
            @click="submitAddDevice"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Edit Biometric Device Dialog -->
    <q-dialog v-model="showEditDeviceDialog" persistent>
      <q-card style="width: 540px; max-width: 95vw;" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none bg-primary text-white">
          <div class="text-h6 text-weight-bold flex items-center q-gutter-x-sm">
            <q-icon name="edit" size="22px" />
            <span>Edit Biometric Device</span>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense text-color="white" @click="showEditDeviceDialog = false" />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="text-caption text-grey-7 q-mb-md">
            Update device label, network IP, or assigned location for <strong>{{ activeEditDevice?.serial_number }}</strong>.
          </div>

          <div class="q-gutter-y-md">
            <q-input
              v-model="editDeviceForm.device_name"
              outlined
              dense
              label="Device Label / Friendly Name *"
              :rules="[val => !!val || 'Device name is required']"
            />

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input
                  v-model="editDeviceForm.model_name"
                  outlined
                  dense
                  label="Model"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="editDeviceForm.comm_key"
                  outlined
                  dense
                  label="Comm Key"
                />
              </div>
            </div>

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-select
                  v-model="editDeviceForm.department_name"
                  :options="filteredEditOfficeOptions"
                  emit-value
                  map-options
                  use-input
                  input-debounce="0"
                  outlined
                  dense
                  label="Assigned Office *"
                  placeholder="Select office from library..."
                  :loading="loadingOffices"
                  :rules="[val => !!val || 'Assigned office is required']"
                  @filter="filterEditOffices"
                  @update:model-value="onOfficeSelectedForEdit"
                >
                  <template #prepend>
                    <q-icon name="apartment" />
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
              <div class="col-6">
                <q-input
                  v-model="editDeviceForm.ip_address"
                  outlined
                  dense
                  label="IP Address"
                />
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md bg-grey-1">
          <q-btn flat no-caps label="Cancel" color="grey-7" @click="showEditDeviceDialog = false" />
          <q-btn
            unelevated
            no-caps
            label="Save Changes"
            color="primary"
            :loading="submittingDevice"
            @click="submitEditDevice"
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
            The device will immediately be blocked from connecting to ADMS. You can re-authorize it anytime.
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
const togglingDeviceId = ref(null)

const searchTerm = ref('')
const statusFilter = ref('all')

const statusOptions = [
  { label: 'All Devices', value: 'all' },
  { label: 'Online Only', value: 'online' },
  { label: 'Offline Only', value: 'offline' },
  { label: 'Authorized Only', value: 'authorized' },
  { label: 'Blocked Only', value: 'blocked' },
]

const devicesList = ref([])

const stats = reactive({
  total: 0,
  online: 0,
  offline: 0,
  authorized: 0,
  blocked: 0,
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

function calculateStats() {
  stats.total = devicesList.value.length
  stats.online = devicesList.value.filter(d => isDeviceOnline(d)).length
  stats.offline = stats.total - stats.online
  stats.authorized = devicesList.value.filter(d => d.is_active).length
  stats.blocked = stats.total - stats.authorized
}

const filteredDevices = computed(() => {
  let list = devicesList.value

  if (statusFilter.value === 'online') {
    list = list.filter(d => isDeviceOnline(d))
  } else if (statusFilter.value === 'offline') {
    list = list.filter(d => !isDeviceOnline(d))
  } else if (statusFilter.value === 'authorized') {
    list = list.filter(d => d.is_active)
  } else if (statusFilter.value === 'blocked') {
    list = list.filter(d => !d.is_active)
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
    label: 'Device / Model',
    align: 'left',
    field: row => row.device_name,
    sortable: true,
  },
  {
    name: 'serial_number',
    label: 'Serial Number (SN)',
    align: 'left',
    field: 'serial_number',
    sortable: true,
  },
  {
    name: 'assigned_office',
    label: 'Assigned Office',
    align: 'left',
    field: row => row.department_name || row.location || '',
    sortable: true,
  },
  {
    name: 'network',
    label: 'Network & Key',
    align: 'left',
    field: row => row.ip_address || '',
    sortable: true,
  },
  {
    name: 'status',
    label: 'Live Status',
    align: 'center',
    field: row => (isDeviceOnline(row) ? 1 : 0),
    sortable: true,
  },
  {
    name: 'authorization',
    label: 'Authorization',
    align: 'center',
    field: 'is_active',
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
const filteredEditOfficeOptions = ref([])

async function fetchOffices() {
  loadingOffices.value = true
  try {
    const { data } = await api.get('/departments')
    const list = Array.isArray(data?.departments) ? data.departments : []
    officesList.value = list
    const options = list.map(d => ({
      label: d.name,
      value: d.name,
      id: d.id,
    }))
    filteredOfficeOptions.value = options
    filteredEditOfficeOptions.value = options
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
      label: d.name,
      value: d.name,
      id: d.id,
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

function filterEditOffices(val, update) {
  update(() => {
    const needle = (val || '').toLowerCase().trim()
    const options = officesList.value.map(d => ({
      label: d.name,
      value: d.name,
      id: d.id,
    }))
    if (!needle) {
      filteredEditOfficeOptions.value = options
    } else {
      filteredEditOfficeOptions.value = options.filter(opt =>
        opt.label.toLowerCase().includes(needle)
      )
    }
  })
}

function onOfficeSelectedForAdd(val) {
  const match = officesList.value.find(d => d.name === val || d.id === val)
  if (match) {
    deviceForm.department_id = match.id
    deviceForm.department_name = match.name
  }
}

function onOfficeSelectedForEdit(val) {
  const match = officesList.value.find(d => d.name === val || d.id === val)
  if (match) {
    editDeviceForm.department_id = match.id
    editDeviceForm.department_name = match.name
  }
}

// Add Device
const showAddDeviceDialog = ref(false)
const deviceForm = reactive({
  serial_number: '',
  device_name: '',
  model_name: 'MB360',
  department_id: null,
  department_name: null,
  comm_key: '0',
  ip_address: '',
})

function openAddDeviceDialog() {
  deviceForm.serial_number = ''
  deviceForm.device_name = ''
  deviceForm.model_name = 'MB360'
  deviceForm.department_id = null
  deviceForm.department_name = null
  deviceForm.comm_key = '0'
  deviceForm.ip_address = ''
  showAddDeviceDialog.value = true
}

async function submitAddDevice() {
  if (!deviceForm.serial_number || !deviceForm.device_name || !deviceForm.department_name) {
    $q.notify({
      type: 'warning',
      message: 'Please provide Device Serial Number, Name, and Assigned Office.',
      position: 'top',
    })
    return
  }

  submittingDevice.value = true
  try {
    const response = await api.post('/attendance/devices', deviceForm)
    $q.notify({
      type: 'positive',
      message: response.data.message || 'Biometric device authorized successfully.',
      position: 'top',
    })
    showAddDeviceDialog.value = false
    await fetchDevices()
  } catch (err) {
    console.error('Failed to authorize device:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to authorize device.',
      position: 'top',
    })
  } finally {
    submittingDevice.value = false
  }
}

// Edit Device
const showEditDeviceDialog = ref(false)
const activeEditDevice = ref(null)
const editDeviceForm = reactive({
  device_name: '',
  model_name: 'MB360',
  department_id: null,
  department_name: null,
  comm_key: '0',
  ip_address: '',
})

function openEditDeviceDialog(dev) {
  activeEditDevice.value = dev
  editDeviceForm.device_name = dev.device_name || ''
  editDeviceForm.model_name = dev.model || dev.model_name || 'MB360'
  editDeviceForm.department_id = dev.department_id || null
  editDeviceForm.department_name = dev.department_name || dev.location || null
  editDeviceForm.comm_key = dev.comm_key || '0'
  editDeviceForm.ip_address = dev.ip_address || ''
  showEditDeviceDialog.value = true
}

async function submitEditDevice() {
  if (!editDeviceForm.device_name || !editDeviceForm.department_name) {
    $q.notify({
      type: 'warning',
      message: 'Device name and Assigned Office are required.',
      position: 'top',
    })
    return
  }

  submittingDevice.value = true
  try {
    const response = await api.post(`/attendance/devices/${activeEditDevice.value.id}/update`, editDeviceForm)
    $q.notify({
      type: 'positive',
      message: response.data.message || 'Device updated successfully.',
      position: 'top',
    })
    showEditDeviceDialog.value = false
    await fetchDevices()
  } catch (err) {
    console.error('Failed to update device:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to update device.',
      position: 'top',
    })
  } finally {
    submittingDevice.value = false
  }
}

// Toggle Device Authorization
async function toggleDevice(dev) {
  togglingDeviceId.value = dev.id
  try {
    const response = await api.post(`/attendance/devices/${dev.id}/toggle`)
    $q.notify({
      type: 'positive',
      message: response.data.message || 'Device authorization status updated.',
      position: 'top',
    })
    await fetchDevices()
  } catch (err) {
    console.error('Failed to toggle device authorization:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to update device authorization.',
      position: 'top',
    })
  } finally {
    togglingDeviceId.value = null
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
</style>
