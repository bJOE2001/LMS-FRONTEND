<template>
  <q-page class="q-pa-md attendance-management-page">
    <div class="row items-center q-mb-lg attendance-management-header">
      <div>
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Attendance Management</h1>
        <div class="text-subtitle2 text-grey-7">
          Review biometric attendance, enrollment status, and employee attendance records.
        </div>
      </div>
      <q-space />
      <div class="row q-gutter-sm attendance-management-actions">
        <q-btn
          unelevated
          no-caps
          color="secondary"
          icon="analytics"
          label="Generate Report"
          @click="generateReport"
        />
        <q-btn
          outline
          no-caps
          color="primary"
          icon="download"
          label="Export Report"
          @click="exportReport"
        />
      </div>
    </div>

    <div class="row q-col-gutter-sm q-mb-md status-cards-row">
      <div
        v-for="card in summaryCards"
        :key="card.key"
        class="col-6 col-sm-6 col-md status-cards-row__item"
      >
        <q-card flat bordered class="bg-white rounded-borders stat-card attendance-stat-card">
          <q-card-section class="q-py-md status-card__section">
            <div class="row items-center no-wrap status-card__content">
              <q-avatar
                :style="{ background: card.bg }"
                :text-color="card.color"
                size="44px"
                class="q-mr-md stat-icon status-card__avatar"
              >
                <q-icon :name="card.icon" size="22px" :color="card.color" />
              </q-avatar>
              <div class="text-caption text-grey-7 text-weight-medium status-card__label">
                {{ card.label }}
              </div>
              <div
                class="text-h6 text-weight-bold status-card__value q-ml-auto"
                :style="{ color: card.hex }"
              >
                {{ card.value }}
              </div>
            </div>
            <div class="text-caption text-grey-6 q-mt-xs">{{ card.caption }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card flat bordered class="rounded-borders employee-records-card">
      <q-card-section class="employee-records-card__section">
        <div class="row justify-between items-center employee-records-toolbar">
          <div class="text-h6">Attendance Records</div>
          <q-input
            v-model="searchTerm"
            outlined
            dense
            clearable
            placeholder="Search employee name or ID"
            class="employee-records-search"
          >
            <template #append>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
      </q-card-section>

      <q-table
        :rows="filteredEmployeeRows"
        :columns="employeeColumns"
        row-key="id"
        flat
        :rows-per-page-options="[10, 20, 50]"
        v-model:pagination="employeePagination"
        :dense="$q.screen.lt.md"
        class="employee-records-table attendance-records-table"
        @row-click="handleEmployeeRowClick"
      >
        <template #body-cell-name="props">
          <q-td :props="props">
            <div class="row items-center no-wrap cursor-pointer">
              <q-avatar
                size="32px"
                :color="props.row.avatarColor"
                text-color="white"
                class="q-mr-sm"
              >
                {{ props.row.avatar }}
              </q-avatar>
              <div class="column justify-center items-start">
                <div class="employee-name text-primary text-left">{{ props.row.fullName }}</div>
                <div class="employee-designation text-grey-6 text-left">
                  {{ props.row.employmentType }}
                </div>
              </div>
            </div>
          </q-td>
        </template>

        <template #body-cell-position="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.position }}</div>
          </q-td>
        </template>

        <template #body-cell-biometricStatus="props">
          <q-td :props="props">
            <q-badge
              rounded
              class="text-weight-medium"
              :color="statusMeta(props.row.biometricStatus).color"
              :text-color="statusMeta(props.row.biometricStatus).textColor"
              :label="props.row.biometricStatus"
            />
          </q-td>
        </template>

        <template #body-cell-attendanceStatus="props">
          <q-td :props="props">
            <q-badge
              rounded
              class="text-weight-medium"
              :color="statusMeta(props.row.attendanceStatus).color"
              :text-color="statusMeta(props.row.attendanceStatus).textColor"
              :label="props.row.attendanceStatus"
            />
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <div class="row inline no-wrap justify-center q-gutter-x-xs">
              <q-btn
                flat
                dense
                round
                icon="fingerprint"
                color="primary"
                size="sm"
                @click.stop="openEnrollmentDialog(props.row)"
              >
                <q-tooltip>Enroll Bio</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                icon="visibility"
                color="secondary"
                size="sm"
                @click.stop="openEmployeeRecord(props.row)"
              >
                <q-tooltip>View Attendance Record</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>

        <template #no-data>
          <div class="full-width text-center q-pa-lg">
            <q-icon name="search_off" size="48px" color="grey-5" />
            <div class="text-grey-6 q-mt-sm">
              No attendance records matched the selected filters.
            </div>
          </div>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="showEnrollmentDialog" persistent>
      <q-card class="enrollment-dialog">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">
            {{
              enrollmentEmployee?.biometric.status === 'Enrolled'
                ? 'Update Biometric Enrollment'
                : 'Biometric Enrollment'
            }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense @click="showEnrollmentDialog = false" />
        </q-card-section>

        <q-card-section v-if="enrollmentEmployee" class="enrollment-dialog__content">
          <div class="enrollment-employee-card">
            <div class="row items-center no-wrap">
              <q-avatar :color="enrollmentEmployee.avatarColor" text-color="white" size="52px">
                {{ enrollmentEmployee.avatar }}
              </q-avatar>
              <div class="q-ml-md">
                <div class="text-subtitle1 text-weight-bold">{{ enrollmentEmployee.fullName }}</div>
                <div class="text-caption text-grey-6">
                  {{ enrollmentEmployee.id }} · {{ enrollmentEmployee.department }} ·
                  {{ enrollmentEmployee.position }}
                </div>
              </div>
            </div>
          </div>

          <q-banner
            rounded
            dense
            class="q-mt-md"
            :class="
              selectedEnrollmentDevice?.online ? 'bg-green-1 text-green-9' : 'bg-red-1 text-red-9'
            "
          >
            <div class="row items-center q-gutter-sm">
              <q-icon
                :name="selectedEnrollmentDevice?.online ? 'devices' : 'portable_wifi_off'"
                size="20px"
              />
              <div>
                <div class="text-weight-medium">
                  Device Status:
                  {{ selectedEnrollmentDevice?.online ? 'Connected' : 'Connection Required' }}
                </div>
                <div class="text-caption">
                  {{ selectedEnrollmentDevice?.name || 'Select a device to continue enrollment.' }}
                </div>
              </div>
            </div>
          </q-banner>

          <div class="row q-col-gutter-md q-mt-md">
            <div class="col-12 col-md-5">
              <q-select
                v-model="enrollmentMethod"
                :options="enrollmentMethodOptions"
                outlined
                dense
                emit-value
                map-options
                label="Enrollment Method"
              />
            </div>
            <div class="col-12 col-md-7">
              <q-select
                v-model="selectedEnrollmentDeviceId"
                :options="availableEnrollmentDevices"
                option-label="name"
                option-value="id"
                outlined
                dense
                emit-value
                map-options
                label="Enrollment Device"
              />
            </div>
          </div>

          <q-stepper
            v-model="enrollmentStep"
            flat
            bordered
            animated
            color="primary"
            class="q-mt-lg"
          >
            <q-step
              :name="1"
              title="Connect Device"
              caption="Verify reader availability"
              icon="settings_input_component"
              :done="enrollmentStep > 1"
            >
              <div class="text-body2 text-grey-7 q-mb-md">
                Confirm the selected biometric reader is online and ready to pair with the employee.
              </div>
              <div class="enrollment-step-card">
                <div class="text-caption text-grey-6">Selected Device</div>
                <div class="text-subtitle2 text-weight-medium">
                  {{ selectedEnrollmentDevice?.name || 'No device selected' }}
                </div>
                <div class="text-caption text-grey-6 q-mt-xs">
                  {{
                    selectedEnrollmentDevice?.location || 'Assign a connected device to proceed.'
                  }}
                </div>
              </div>
              <q-stepper-navigation class="q-pt-md">
                <q-btn
                  unelevated
                  no-caps
                  color="primary"
                  label="Validate Connection"
                  @click="validateEnrollmentConnection"
                />
              </q-stepper-navigation>
            </q-step>

            <q-step
              :name="2"
              title="Capture Biometric"
              caption="Fingerprint, face scan, or RFID/card"
              icon="fingerprint"
              :done="enrollmentStep > 2"
            >
              <div class="text-body2 text-grey-7 q-mb-md">
                Guide the employee through the selected capture method and verify a readable sample.
              </div>
              <div class="enrollment-step-card">
                <div class="text-caption text-grey-6">Capture Mode</div>
                <div class="text-subtitle2 text-weight-medium">{{ enrollmentMethod }}</div>
                <div class="text-caption text-grey-6 q-mt-xs">{{ enrollmentMethodGuidance }}</div>
              </div>
              <q-stepper-navigation class="q-pt-md row q-gutter-sm">
                <q-btn
                  unelevated
                  no-caps
                  color="primary"
                  label="Capture Sample"
                  @click="advanceEnrollmentCapture"
                />
                <q-btn flat no-caps color="grey-7" label="Back" @click="enrollmentStep = 1" />
              </q-stepper-navigation>
            </q-step>

            <q-step
              :name="3"
              title="Review & Save"
              caption="Finalize or retry enrollment"
              icon="verified_user"
            >
              <div
                class="enrollment-result-banner"
                :class="`enrollment-result-banner--${enrollmentState}`"
              >
                <div class="row items-center no-wrap">
                  <q-avatar :color="enrollmentStateMeta.color" text-color="white" size="44px">
                    <q-icon :name="enrollmentStateMeta.icon" size="22px" />
                  </q-avatar>
                  <div class="q-ml-md">
                    <div class="text-subtitle2 text-weight-bold">
                      {{ enrollmentStateMeta.label }}
                    </div>
                    <div class="text-caption">{{ enrollmentStateMeta.caption }}</div>
                  </div>
                </div>
              </div>

              <q-stepper-navigation class="q-pt-md row q-gutter-sm">
                <q-btn
                  unelevated
                  no-caps
                  color="positive"
                  label="Mark Success"
                  @click="finalizeEnrollment('success')"
                />
                <q-btn
                  unelevated
                  no-caps
                  color="warning"
                  label="Set Pending"
                  @click="finalizeEnrollment('pending')"
                />
                <q-btn
                  unelevated
                  no-caps
                  color="negative"
                  label="Mark Failed"
                  @click="finalizeEnrollment('failed')"
                />
                <q-btn
                  v-if="enrollmentState === 'failed'"
                  outline
                  no-caps
                  color="primary"
                  label="Retry"
                  @click="retryEnrollment"
                />
              </q-stepper-navigation>
            </q-step>
          </q-stepper>
        </q-card-section>

        <q-card-actions align="between" class="enrollment-dialog__actions">
          <q-btn flat no-caps color="grey-7" label="Close" @click="showEnrollmentDialog = false" />
          <q-btn
            flat
            no-caps
            color="primary"
            icon="sync"
            label="Update Biometric Data"
            @click="retryEnrollment"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import {
  ALL_ATTENDANCE_STATUSES,
  ALL_BIOMETRIC_STATUSES,
  ALL_DEPARTMENTS,
  CURRENT_ENROLLMENT_DATE,
  DEFAULT_LIST_END,
  DEFAULT_LIST_START,
  attendanceEmployees,
  biometricDevices,
  formatDateRange,
  getLatestLog,
  getLogsWithinRange,
  matchesSearch,
  normalizeRange,
  statusMeta,
  summarizeAttendance,
} from 'src/pages/admin/attendanceManagement.data'

const $q = useQuasar()
const router = useRouter()

const employeePagination = ref({
  page: 1,
  rowsPerPage: 10,
  sortBy: 'name',
  descending: false,
})

const searchTerm = ref('')
const selectedDepartment = ref(ALL_DEPARTMENTS)
const selectedAttendanceStatus = ref(ALL_ATTENDANCE_STATUSES)
const selectedBiometricStatus = ref(ALL_BIOMETRIC_STATUSES)
const listStartDate = ref(DEFAULT_LIST_START)
const listEndDate = ref(DEFAULT_LIST_END)

const showEnrollmentDialog = ref(false)
const enrollmentEmployeeId = ref(null)
const enrollmentMethod = ref('Fingerprint')
const selectedEnrollmentDeviceId = ref(null)
const enrollmentStep = ref(1)
const enrollmentState = ref('idle')

const employeeColumns = [
  { name: 'name', label: 'Employee', field: 'fullName', align: 'left', sortable: true },
  { name: 'position', label: 'Position', field: 'position', align: 'left', sortable: true },
  {
    name: 'biometricStatus',
    label: 'Biometric Status',
    field: 'biometricStatus',
    align: 'left',
    sortable: true,
  },
  {
    name: 'attendanceStatus',
    label: 'Attendance Status',
    field: 'attendanceStatus',
    align: 'left',
    sortable: true,
  },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]
const normalizedListRange = computed(() => normalizeRange(listStartDate.value, listEndDate.value))

const filteredEmployeeRows = computed(() => {
  return attendanceEmployees
    .map((employee) => {
      const logs = getLogsWithinRange(employee.attendanceLogs, normalizedListRange.value)
      const summary = summarizeAttendance(logs)
      const latestLog = getLatestLog(logs) || getLatestLog(employee.attendanceLogs)

      return {
        ...employee,
        totalHours: summary.totalHours,
        presentDays: summary.presentDays,
        absentDays: summary.absentDays,
        lateCount: summary.lateCount,
        attendanceStatus: latestLog?.status || 'Present',
        biometricStatus: employee.biometric.status,
      }
    })
    .filter((employee) => matchesSearch(employee, searchTerm.value))
    .filter((employee) =>
      selectedDepartment.value === ALL_DEPARTMENTS
        ? true
        : employee.department === selectedDepartment.value,
    )
    .filter((employee) =>
      selectedAttendanceStatus.value === ALL_ATTENDANCE_STATUSES
        ? true
        : employee.attendanceStatus === selectedAttendanceStatus.value,
    )
    .filter((employee) =>
      selectedBiometricStatus.value === ALL_BIOMETRIC_STATUSES
        ? true
        : employee.biometricStatus === selectedBiometricStatus.value,
    )
})

const summaryCards = computed(() => {
  const totalEmployees = filteredEmployeeRows.value.length
  const enrolledCount = filteredEmployeeRows.value.filter(
    (employee) => employee.biometricStatus === 'Enrolled',
  ).length
  const pendingCount = filteredEmployeeRows.value.filter((employee) =>
    ['Pending', 'Failed', 'Not Enrolled'].includes(employee.biometricStatus),
  ).length
  const exceptionsCount = filteredEmployeeRows.value.filter((employee) =>
    ['Late', 'Absent'].includes(employee.attendanceStatus),
  ).length

  return [
    {
      key: 'employees',
      label: 'Employees',
      value: totalEmployees,
      caption: formatDateRange(normalizedListRange.value.start, normalizedListRange.value.end),
      icon: 'groups',
      color: 'primary',
      hex: '#2e7d32',
      bg: '#e8f5e9',
    },
    {
      key: 'enrolled',
      label: 'Enrolled',
      value: enrolledCount,
      caption: 'Ready for biometric verification',
      icon: 'verified_user',
      color: 'green-8',
      hex: '#2e7d32',
      bg: '#e8f5e9',
    },
    {
      key: 'pending',
      label: 'Needs Enrollment',
      value: pendingCount,
      caption: 'Pending, failed, or not enrolled',
      icon: 'fingerprint',
      color: 'warning',
      hex: '#f59e0b',
      bg: '#fff7e6',
    },
    {
      key: 'exceptions',
      label: 'Exceptions',
      value: exceptionsCount,
      caption: 'Late or absent attendance',
      icon: 'warning_amber',
      color: 'negative',
      hex: '#c62828',
      bg: '#ffebee',
    },
  ]
})

const enrollmentEmployee = computed(
  () => attendanceEmployees.find((employee) => employee.id === enrollmentEmployeeId.value) || null,
)

const availableEnrollmentDevices = computed(() =>
  biometricDevices
    .filter((device) => device.methods.includes(enrollmentMethod.value))
    .map((device) => ({
      ...device,
      label: device.name,
      value: device.id,
    })),
)

const selectedEnrollmentDevice = computed(
  () => biometricDevices.find((device) => device.id === selectedEnrollmentDeviceId.value) || null,
)

const enrollmentMethodGuidance = computed(() => {
  if (enrollmentMethod.value === 'Fingerprint') {
    return 'Capture at least two clean fingerprint samples for verification resilience.'
  }
  if (enrollmentMethod.value === 'Face Scan') {
    return 'Ensure the employee faces the camera directly with consistent lighting.'
  }
  return 'Tap the RFID/card twice to validate both read and reassignment status.'
})

const enrollmentStateMeta = computed(() => {
  const meta = {
    idle: {
      label: 'Ready to Start',
      caption: 'Begin by validating the selected biometric device connection.',
      color: 'grey-7',
      icon: 'play_circle',
    },
    pending: {
      label: 'Enrollment Pending',
      caption: 'Capture is in progress or awaiting final confirmation.',
      color: 'warning',
      icon: 'hourglass_top',
    },
    success: {
      label: 'Enrollment Successful',
      caption: 'Biometric profile saved and ready for daily attendance verification.',
      color: 'positive',
      icon: 'check_circle',
    },
    failed: {
      label: 'Enrollment Failed',
      caption: 'The capture did not pass verification. Retry or assign another device.',
      color: 'negative',
      icon: 'error',
    },
  }

  return meta[enrollmentState.value]
})

watch(availableEnrollmentDevices, (devices) => {
  if (!devices.length) {
    selectedEnrollmentDeviceId.value = null
    return
  }

  const hasSelectedDevice = devices.some((device) => device.id === selectedEnrollmentDeviceId.value)
  if (!hasSelectedDevice) {
    selectedEnrollmentDeviceId.value = devices[0].id
  }
})

function handleEmployeeRowClick(_, row) {
  openEmployeeRecord(row)
}

function openEmployeeRecord(employee) {
  router.push({
    name: 'admin-attendance-record',
    params: { employeeId: employee.id },
  })
}

function openEnrollmentDialog(employee) {
  enrollmentEmployeeId.value = employee.id
  enrollmentMethod.value = employee.biometric.method || 'Fingerprint'
  selectedEnrollmentDeviceId.value =
    biometricDevices.find((device) => device.name === employee.biometric.deviceName)?.id ||
    biometricDevices.find((device) => device.methods.includes(enrollmentMethod.value))?.id ||
    biometricDevices[0]?.id ||
    null
  enrollmentStep.value = 1
  enrollmentState.value = employee.biometric.status === 'Failed' ? 'failed' : 'idle'
  showEnrollmentDialog.value = true
}

function validateEnrollmentConnection() {
  if (!selectedEnrollmentDevice.value) {
    $q.notify({
      type: 'warning',
      message: 'Select a biometric device before continuing.',
      position: 'top',
    })
    return
  }

  if (!selectedEnrollmentDevice.value.online) {
    enrollmentState.value = 'failed'
    $q.notify({
      type: 'negative',
      message: 'The selected device is offline. Reconnect it or switch devices.',
      position: 'top',
    })
    return
  }

  enrollmentState.value = 'pending'
  enrollmentStep.value = 2
}

function advanceEnrollmentCapture() {
  enrollmentState.value = 'pending'
  enrollmentStep.value = 3
}

function finalizeEnrollment(result) {
  if (!enrollmentEmployee.value) return

  enrollmentState.value = result

  if (result === 'success') {
    enrollmentEmployee.value.biometric.status = 'Enrolled'
    enrollmentEmployee.value.biometric.method = enrollmentMethod.value
    enrollmentEmployee.value.biometric.lastEnrollmentDate = CURRENT_ENROLLMENT_DATE
    enrollmentEmployee.value.biometric.deviceName =
      selectedEnrollmentDevice.value?.name || enrollmentEmployee.value.biometric.deviceName
    $q.notify({
      type: 'positive',
      message: `${enrollmentEmployee.value.fullName} was successfully enrolled for biometric attendance.`,
      position: 'top',
    })
  }

  if (result === 'pending') {
    enrollmentEmployee.value.biometric.status = 'Pending'
    enrollmentEmployee.value.biometric.method = enrollmentMethod.value
    enrollmentEmployee.value.biometric.deviceName =
      selectedEnrollmentDevice.value?.name || enrollmentEmployee.value.biometric.deviceName
    $q.notify({
      type: 'warning',
      message: `${enrollmentEmployee.value.fullName}'s biometric setup is marked as pending confirmation.`,
      position: 'top',
    })
  }

  if (result === 'failed') {
    enrollmentEmployee.value.biometric.status = 'Failed'
    enrollmentEmployee.value.biometric.method = enrollmentMethod.value
    enrollmentEmployee.value.biometric.deviceName =
      selectedEnrollmentDevice.value?.name || enrollmentEmployee.value.biometric.deviceName
    $q.notify({
      type: 'negative',
      message: `${enrollmentEmployee.value.fullName}'s biometric enrollment needs another attempt.`,
      position: 'top',
    })
  }
}

function retryEnrollment() {
  enrollmentState.value = 'pending'
  enrollmentStep.value = 2
}

function generateReport() {
  $q.notify({
    type: 'positive',
    message: `Attendance report generated for ${filteredEmployeeRows.value.length} employee(s).`,
    position: 'top',
  })
}

function exportReport() {
  $q.notify({
    type: 'info',
    message: `Export queued for ${filteredEmployeeRows.value.length} employee attendance records.`,
    position: 'top',
  })
}
</script>

<style scoped>
.attendance-management-header {
  gap: 12px;
}

.attendance-management-actions {
  justify-content: flex-end;
}

.attendance-stat-card,
.employee-records-card,
.enrollment-dialog {
  border-radius: 8px;
  border-color: #e5e7eb;
}

.status-card__label {
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.status-card__value {
  line-height: 1;
}

.employee-records-card__section {
  padding: 14px 16px 12px;
}

.employee-records-toolbar {
  gap: 8px;
}

.employee-records-search {
  min-width: 240px;
}

.employee-records-table :deep(.q-table__middle) {
  overflow-x: auto;
}

.employee-name {
  font-size: 1rem;
  line-height: 1.2;
  font-weight: 600;
}

.employee-designation {
  font-size: 0.75rem;
  line-height: 1.2;
  letter-spacing: 0.01em;
}

.attendance-records-table :deep(table) {
  min-width: 760px;
}

.attendance-records-table :deep(th:first-child),
.attendance-records-table :deep(td:first-child) {
  min-width: 260px;
}

.attendance-records-table :deep(th:last-child),
.attendance-records-table :deep(td:last-child) {
  width: 110px;
  min-width: 110px;
}

.enrollment-dialog {
  width: min(920px, calc(100vw - 24px));
  max-width: calc(100vw - 24px);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.18);
}

.enrollment-dialog__content {
  padding-top: 16px;
}

.enrollment-dialog__actions {
  padding: 8px 24px 24px;
}

.enrollment-employee-card,
.enrollment-step-card {
  padding: 16px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
}

.enrollment-result-banner {
  padding: 16px;
  border-radius: 8px;
  border: 1px solid transparent;
}

.enrollment-result-banner--idle {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.enrollment-result-banner--pending {
  background: #fff8e1;
  border-color: #f3d275;
}

.enrollment-result-banner--success {
  background: #edf8ef;
  border-color: #bddbbf;
}

.enrollment-result-banner--failed {
  background: #ffebee;
  border-color: #efb7be;
}

@media (max-width: 600px) {
  .attendance-management-page {
    padding-top: calc(env(safe-area-inset-top, 0px) + 8px) !important;
    padding-right: calc(env(safe-area-inset-right, 0px) + 10px) !important;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 10px) !important;
    padding-left: calc(env(safe-area-inset-left, 0px) + 10px) !important;
  }

  .attendance-management-header {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .attendance-management-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .status-cards-row {
    margin-bottom: 8px !important;
    margin-top: 2px;
  }

  .status-cards-row__item {
    padding-left: 3px !important;
    padding-right: 3px !important;
  }

  .status-card__section {
    padding: 6px 8px;
  }

  .status-card__avatar {
    width: 28px !important;
    height: 28px !important;
    min-width: 28px !important;
    margin-right: 6px !important;
  }

  .status-card__label {
    font-size: 0.58rem;
    line-height: 1;
    max-width: 66%;
  }

  .status-card__value {
    font-size: 1.1rem !important;
  }

  .employee-records-card__section {
    padding: 10px 10px 8px;
  }

  .employee-records-toolbar {
    align-items: flex-start;
  }

  .employee-records-search {
    min-width: 0 !important;
    width: 100%;
  }

  .attendance-records-table :deep(table) {
    min-width: 680px;
  }

  .enrollment-dialog__actions {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
}
</style>
