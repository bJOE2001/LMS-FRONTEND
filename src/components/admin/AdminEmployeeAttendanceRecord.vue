<template>
  <div class="attendance-record-shell">
    <template v-if="employee">
      <div class="row items-center justify-between q-col-gutter-md attendance-record-header">
        <div class="col-12 col-md">
          <q-btn
            flat
            no-caps
            color="primary"
            icon="arrow_back"
            label="Back to Attendance Management"
            class="q-px-none"
            @click="goBack"
          />
          <h1 class="text-h4 text-weight-bold q-mt-sm q-mb-xs">Attendance Record</h1>
        </div>
        <div class="col-12 col-md-auto row q-gutter-sm attendance-record-header__actions">
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="fingerprint"
            :label="employee.biometric.status === 'Enrolled' ? 'Update Bio' : 'Enroll Bio'"
            @click="openEnrollmentDialog"
          />
          <q-btn
            outline
            no-caps
            color="secondary"
            icon="summarize"
            label="Generate Employee Report"
            @click="generateEmployeeReport"
          />
        </div>
      </div>

      <q-card flat bordered class="rounded-borders attendance-profile-card">
        <q-card-section class="attendance-profile-card__section">
          <div class="row q-col-gutter-lg items-center">
            <div class="col-12 col-lg-7">
              <div class="row items-center no-wrap">
                <q-avatar :color="employee.avatarColor" text-color="white" size="62px">
                  {{ employee.avatar }}
                </q-avatar>
                <div class="q-ml-md">
                  <div class="text-h5 text-weight-bold">{{ employee.fullName }}</div>
                  <div class="text-subtitle2 text-grey-7">{{ employee.position }}</div>
                  <div class="row q-gutter-sm q-mt-sm">
                    <q-badge
                      rounded
                      color="green-1"
                      text-color="green-9"
                      :label="employee.department"
                    />
                    <q-badge
                      rounded
                      color="blue-grey-1"
                      text-color="blue-grey-8"
                      :label="employee.employmentType"
                    />
                    <q-badge
                      rounded
                      class="text-weight-medium"
                      :color="statusMeta(metrics.attendanceStatus).color"
                      :text-color="statusMeta(metrics.attendanceStatus).textColor"
                      :label="metrics.attendanceStatus"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12 col-lg-5">
              <div class="attendance-profile-card__meta-grid">
                <div class="attendance-meta-item">
                  <span class="attendance-meta-item__label">Biometric Status</span>
                  <q-badge
                    rounded
                    class="text-weight-medium"
                    :color="statusMeta(employee.biometric.status).color"
                    :text-color="statusMeta(employee.biometric.status).textColor"
                    :label="employee.biometric.status"
                  />
                </div>
                <div class="attendance-meta-item">
                  <span class="attendance-meta-item__label">Preferred Method</span>
                  <span class="attendance-meta-item__value">
                    {{ employee.biometric.method || 'Not configured' }}
                  </span>
                </div>
                <div class="attendance-meta-item">
                  <span class="attendance-meta-item__label">Last Enrolled</span>
                  <span class="attendance-meta-item__value">
                    {{
                      employee.biometric.lastEnrollmentDate
                        ? formatDisplayDate(employee.biometric.lastEnrollmentDate)
                        : 'No enrollment record'
                    }}
                  </span>
                </div>
                <div class="attendance-meta-item">
                  <span class="attendance-meta-item__label">Last Device</span>
                  <span class="attendance-meta-item__value">
                    {{ employee.biometric.deviceName || 'No device assigned' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </q-card-section>
        <DailyTimeRecordTable />
      </q-card>

      <q-dialog v-model="showEnrollmentDialog" persistent>
        <q-card class="enrollment-dialog">
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6">
              {{
                employee.biometric.status === 'Enrolled'
                  ? 'Update Biometric Enrollment'
                  : 'Biometric Enrollment'
              }}
            </div>
            <q-space />
            <q-btn icon="close" flat round dense @click="showEnrollmentDialog = false" />
          </q-card-section>

          <q-card-section class="enrollment-dialog__content">
            <div class="enrollment-employee-card">
              <div class="row items-center no-wrap">
                <q-avatar :color="employee.avatarColor" text-color="white" size="52px">
                  {{ employee.avatar }}
                </q-avatar>
                <div class="q-ml-md">
                  <div class="text-subtitle1 text-weight-bold">{{ employee.fullName }}</div>
                  <div class="text-caption text-grey-6">
                    {{ employee.id }} · {{ employee.department }} · {{ employee.position }}
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
                    {{
                      selectedEnrollmentDevice?.name || 'Select a device to continue enrollment.'
                    }}
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
                  Confirm the selected biometric reader is online and ready to pair with the
                  employee.
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
                  Guide the employee through the selected capture method and verify a readable
                  sample.
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
            <q-btn
              flat
              no-caps
              color="grey-7"
              label="Close"
              @click="showEnrollmentDialog = false"
            />
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
    </template>

    <q-card v-else flat bordered class="rounded-borders employee-records-card">
      <q-card-section class="employee-records-card__section">
        <div class="text-h6">Attendance Record Not Found</div>
        <div class="text-caption text-grey-6 q-mt-sm">
          The selected employee attendance record could not be loaded.
        </div>
        <q-btn
          class="q-mt-md"
          unelevated
          no-caps
          color="primary"
          label="Back to Attendance Management"
          @click="goBack"
        />
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import {
  CURRENT_ENROLLMENT_DATE,
  DEFAULT_DETAIL_END,
  DEFAULT_DETAIL_START,
  biometricDevices,
  formatDisplayDate,
  getAttendanceEmployeeById,
  getLatestLog,
  getLogsWithinRange,
  normalizeRange,
  statusMeta,
  summarizeAttendance,
} from 'src/pages/admin/attendanceManagement.data'
import DailyTimeRecordTable from './DailyTimeRecordTable.vue'

const props = defineProps({
  employeeId: {
    type: String,
    required: true,
  },
})

const $q = useQuasar()
const router = useRouter()

const detailStartDate = ref(DEFAULT_DETAIL_START)
const detailEndDate = ref(DEFAULT_DETAIL_END)

const showEnrollmentDialog = ref(false)
const enrollmentMethod = ref('Fingerprint')
const selectedEnrollmentDeviceId = ref(null)
const enrollmentStep = ref(1)
const enrollmentState = ref('idle')

const enrollmentMethodOptions = [
  { label: 'Fingerprint', value: 'Fingerprint' },
  { label: 'Face Scan', value: 'Face Scan' },
  { label: 'RFID/Card', value: 'RFID/Card' },
]

const employee = computed(() => getAttendanceEmployeeById(props.employeeId))
const normalizedDetailRange = computed(() =>
  normalizeRange(detailStartDate.value, detailEndDate.value),
)

const detailAttendanceRows = computed(() => {
  if (!employee.value) return []

  return [...getLogsWithinRange(employee.value.attendanceLogs, normalizedDetailRange.value)].sort(
    (left, right) => right.date.localeCompare(left.date),
  )
})

const metrics = computed(() => {
  if (!employee.value) {
    return {
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      lateHours: 0,
      absentDays: 0,
      leaveDays: 0,
      lateCount: 0,
      onTimePresentDays: 0,
      attendanceStatus: 'Present',
      verificationSummary: '0 verified logs',
      approvalSummary: 'No approvals yet',
    }
  }

  const summary = summarizeAttendance(detailAttendanceRows.value)
  const latestLog =
    getLatestLog(detailAttendanceRows.value) || getLatestLog(employee.value.attendanceLogs)
  const approvalStatuses = new Set(
    detailAttendanceRows.value.map((row) => row.approvalStatus).filter(Boolean),
  )
  const verificationCount = detailAttendanceRows.value.reduce(
    (count, row) => count + row.logs.length,
    0,
  )

  return {
    ...summary,
    attendanceStatus: latestLog?.status || 'Present',
    verificationSummary: `${verificationCount} biometric events captured`,
    approvalSummary: approvalStatuses.size
      ? Array.from(approvalStatuses).join(', ')
      : 'Pending Review',
  }
})

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

watch(
  employee,
  (currentEmployee) => {
    if (!currentEmployee) return

    enrollmentMethod.value = currentEmployee.biometric.method || 'Fingerprint'
    const initialDevice =
      biometricDevices.find((device) => device.name === currentEmployee.biometric.deviceName)?.id ||
      biometricDevices.find((device) => device.methods.includes(enrollmentMethod.value))?.id ||
      biometricDevices[0]?.id ||
      null

    selectedEnrollmentDeviceId.value = initialDevice
  },
  { immediate: true },
)

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

function goBack() {
  router.push({ name: 'admin-attendance' })
}

function openEnrollmentDialog() {
  enrollmentStep.value = 1
  enrollmentState.value = employee.value?.biometric.status === 'Failed' ? 'failed' : 'idle'
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
  if (!employee.value) return

  enrollmentState.value = result

  if (result === 'success') {
    employee.value.biometric.status = 'Enrolled'
    employee.value.biometric.method = enrollmentMethod.value
    employee.value.biometric.lastEnrollmentDate = CURRENT_ENROLLMENT_DATE
    employee.value.biometric.deviceName =
      selectedEnrollmentDevice.value?.name || employee.value.biometric.deviceName
    $q.notify({
      type: 'positive',
      message: `${employee.value.fullName} was successfully enrolled for biometric attendance.`,
      position: 'top',
    })
  }

  if (result === 'pending') {
    employee.value.biometric.status = 'Pending'
    employee.value.biometric.method = enrollmentMethod.value
    employee.value.biometric.deviceName =
      selectedEnrollmentDevice.value?.name || employee.value.biometric.deviceName
    $q.notify({
      type: 'warning',
      message: `${employee.value.fullName}'s biometric setup is marked as pending confirmation.`,
      position: 'top',
    })
  }

  if (result === 'failed') {
    employee.value.biometric.status = 'Failed'
    employee.value.biometric.method = enrollmentMethod.value
    employee.value.biometric.deviceName =
      selectedEnrollmentDevice.value?.name || employee.value.biometric.deviceName
    $q.notify({
      type: 'negative',
      message: `${employee.value.fullName}'s biometric enrollment needs another attempt.`,
      position: 'top',
    })
  }
}

function retryEnrollment() {
  enrollmentState.value = 'pending'
  enrollmentStep.value = 2
}

function generateEmployeeReport() {
  if (!employee.value) return

  $q.notify({
    type: 'positive',
    message: `Prepared attendance detail report for ${employee.value.fullName}.`,
    position: 'top',
  })
}
</script>

<style scoped>
.attendance-record-shell {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.attendance-record-header__actions {
  justify-content: flex-end;
}

.attendance-profile-card,
.attendance-metric-card,
.employee-records-card,
.enrollment-dialog {
  border-radius: 8px;
  border-color: #e5e7eb;
}

.attendance-profile-card__section,
.attendance-metric-card__section {
  padding: 20px 22px;
}

.attendance-profile-card__meta-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.attendance-meta-item,
.attendance-device-card__row,
.attendance-breakdown__legend-item,
.attendance-log-item,
.enrollment-employee-card,
.enrollment-step-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
}

.attendance-meta-item__label,
.attendance-device-card__label {
  font-size: 0.75rem;
  color: #607d8b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.attendance-meta-item__value,
.attendance-device-card__value {
  font-weight: 600;
  color: #1f2937;
}

.employee-records-card__section {
  padding: 14px 16px 12px;
}

.employee-records-toolbar {
  gap: 8px;
}

.employee-records-table :deep(.q-table__middle) {
  overflow-x: auto;
}

.attendance-records-table :deep(table) {
  min-width: 1180px;
}

.attendance-breakdown__bar {
  display: flex;
  height: 14px;
  overflow: hidden;
  border-radius: 8px;
  background: #eef2f7;
}

.attendance-breakdown__segment {
  min-width: 0;
}

.attendance-breakdown__legend-item {
  flex-direction: row;
  align-items: center;
  gap: 10px;
  background: #ffffff;
}

.attendance-breakdown__legend-swatch {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  flex: 0 0 auto;
}

.attendance-device-card,
.attendance-log-stack {
  display: grid;
  gap: 8px;
}

.attendance-slot-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.attendance-slot-chip {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: #eef7ef;
  color: #2e7d32;
  font-size: 0.75rem;
  font-weight: 600;
}

.attendance-log-cell {
  min-width: 260px;
}

.attendance-log-item__top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
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

@media (max-width: 1023px) {
  .attendance-record-header__actions {
    justify-content: flex-start;
  }

  .attendance-profile-card__meta-grid {
    grid-template-columns: 2fr;
  }
}

@media (max-width: 600px) {
  .employee-records-card__section {
    padding: 10px 10px 8px;
  }

  .attendance-records-table :deep(table) {
    min-width: 980px;
  }

  .enrollment-dialog__actions {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
}
</style>
