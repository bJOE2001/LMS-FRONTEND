<template>
  <q-dialog
    v-model="dialogModel"
    persistent
    transition-show="scale"
    transition-hide="scale"
    @show="onShow"
    @hide="onHide"
  >
    <q-card
      class="bg-grey-1 text-grey-9 column no-wrap"
      style="width: 1000px; max-width: 95vw; max-height: 82vh; border-radius: 12px;"
    >
      <q-bar class="bg-primary text-white q-py-lg flex-shrink-0" style="height: 50px;">
        <q-icon name="qr_code_scanner" size="20px" />
        <div class="text-subtitle1 text-weight-medium">Scan Leave Form</div>
        <q-space />
        <q-btn flat round dense icon="close" v-close-popup class="text-white">
          <q-tooltip>Close Scanner</q-tooltip>
        </q-btn>
      </q-bar>

      <q-card-section class="q-pa-md q-pb-xl col scroll">
        <div class="row q-col-gutter-lg">
          <div class="col-12 col-md-5">
            <q-card flat bordered class="scanner-card">
              <q-tabs
                v-model="activeTab"
                dense
                class="text-grey"
                active-color="primary"
                indicator-color="primary"
                align="justify"
                narrow-indicator
                @update:model-value="onTabChange"
              >
                <q-tab name="camera" icon="photo_camera" label="Camera" />
                <q-tab name="file" icon="add_a_photo" label="Upload Image" />
              </q-tabs>

              <q-separator />

              <q-tab-panels v-model="activeTab" animated class="bg-transparent">
                <!-- Camera Tab -->
                <q-tab-panel name="camera" class="q-pa-md">
                  <div class="text-body2 text-grey-7 q-mb-md">
                    Keep the QR code steady and fully visible inside the camera frame.
                  </div>

                  <div v-if="cameraActive" class="scanner-frame">
                    <qrcode-stream
                      :constraints="cameraConstraints"
                      :track="paintBoundingBox"
                      :paused="isPaused"
                      @detect="onDetect"
                      @error="onCameraError"
                      class="scanner-reader"
                    >
                      <div class="scanner-overlay-focus">
                        <div class="corner corner-tl"></div>
                        <div class="corner corner-tr"></div>
                        <div class="corner corner-bl"></div>
                        <div class="corner corner-br"></div>
                        <div class="scanner-laser"></div>
                      </div>
                      <div class="scanner-badge q-py-xs q-px-sm">
                        <span class="scanner-dot"></span>
                        <span class="text-caption text-weight-bold text-white">SCANNING</span>
                      </div>
                    </qrcode-stream>
                  </div>
                  <div class="scanner-frame-placeholder" v-else>
                    <q-icon name="videocam_off" size="56px" color="grey-4" />
                    <div class="text-grey-6 q-mt-sm">Camera is inactive</div>
                  </div>

                  <q-banner
                    v-if="!cameraActive && cameraError"
                    rounded
                    class="bg-orange-1 text-orange-10 q-mb-md q-mt-md"
                  >
                    {{ cameraError }}
                  </q-banner>

                  <div class="row q-mt-md">
                    <q-btn
                      v-if="!cameraActive"
                      class="full-width"
                      unelevated
                      no-caps
                      color="primary"
                      icon="qr_code_scanner"
                      label="Start Camera Scan"
                      :disable="checking || receiving"
                      @click="startCamera"
                    />
                    <q-btn
                      v-else
                      class="full-width"
                      outline
                      no-caps
                      color="negative"
                      icon="stop"
                      label="Stop Camera"
                      @click="stopCamera"
                    />
                  </div>
                </q-tab-panel>

                <!-- File Upload Tab -->
                <q-tab-panel name="file" class="q-pa-md">
                  <div class="text-body2 text-grey-7 q-mb-md">
                    Take a photo of the printed form's QR code or upload an image file from your device.
                  </div>

                  <div class="file-upload-zone q-py-xl q-px-md text-center cursor-pointer" @click="triggerImageCapture">
                    <q-icon name="cloud_upload" size="56px" :color="imageScanning ? 'primary' : 'grey-5'" class="q-mb-md" />
                    <div class="text-subtitle1 text-weight-medium text-grey-8">
                      {{ imageScanning ? 'Processing image...' : 'Click to upload or take photo' }}
                    </div>
                    <div class="text-caption text-grey-6 q-mt-xs">Supports JPEG, PNG images</div>
                    <q-spinner v-if="imageScanning" color="primary" size="24px" class="q-mt-md" />
                  </div>

                  <qrcode-capture
                    ref="qrcodeCaptureRef"
                    class="hidden"
                    accept="image/*"
                    @change="onCaptureFileChange"
                    @detect="onDetectCapture"
                  />
                </q-tab-panel>
              </q-tab-panels>
            </q-card>
          </div>

          <div id="verification-result-section" class="col-12 col-md-7">
            <q-card flat bordered class="scanner-card">
              <q-card-section>
                <div class="text-h6">Verification result</div>
                <div v-if="expectedApplicationId" class="text-caption text-grey-7">
                  Expected application: #{{ expectedApplicationId }}
                </div>
              </q-card-section>

              <q-separator />

              <q-card-section v-if="checking" class="text-center q-py-xl">
                <q-spinner color="primary" size="42px" />
                <div class="q-mt-md text-grey-7">Checking the printed form...</div>
              </q-card-section>

              <q-card-section v-else-if="verificationResult">
                <q-banner rounded :class="verificationBannerClass" class="q-mb-md">
                  <template #avatar>
                    <q-icon :name="verificationIcon" size="28px" />
                  </template>
                  <div class="text-subtitle1 text-weight-bold">{{ verificationLabel }}</div>
                  <div>{{ verificationMessage }}</div>
                </q-banner>

                <template v-if="verifiedApplication">
                  <q-list bordered separator :dense="$q.screen.lt.sm" class="rounded-borders q-mt-md">
                    <q-item>
                      <q-item-section avatar>
                        <q-icon name="person" color="primary" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label caption>Employee</q-item-label>
                        <q-item-label class="text-weight-medium">{{
                          formatEmployeeNameFromRaw(verifiedApplication.employee_name || verifiedApplication.employeeName)
                        }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section avatar>
                        <q-icon name="business" color="primary" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label caption>Office</q-item-label>
                        <q-item-label class="text-weight-medium">
                          {{ verifiedApplication.office_acronym || verifiedApplication.office || 'Not available' }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section avatar>
                        <q-icon name="history" color="primary" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label caption>Submission date</q-item-label>
                        <q-item-label class="text-weight-medium">{{ formatDateTime(verifiedApplication.filed_at) }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section avatar>
                        <q-icon name="class" color="primary" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label caption>Leave type</q-item-label>
                        <q-item-label class="text-weight-medium">{{
                          verifiedApplication.leave_type_name || 'Not available'
                        }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section avatar>
                        <q-icon name="comment" color="primary" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label caption>Reason</q-item-label>
                        <q-item-label class="text-weight-medium">
                          {{ verifiedApplication.reason || 'N/A' }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section avatar>
                        <q-icon name="date_range" color="primary" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label caption>Inclusive dates</q-item-label>
                        <q-item-label class="text-weight-medium">
                          <template v-if="inclusiveDateList && inclusiveDateList.length > 0">
                            <div v-for="d in inclusiveDateList" :key="d.dateText" class="row items-center q-gutter-x-xs q-mt-xs">
                              <span>{{ d.dateText }}</span>
                              <q-badge dense color="grey-5" text-color="white" class="q-px-xs" style="border-radius: 4px; font-size: 10px;">{{ d.coverage }}</q-badge>
                              <q-badge dense :color="d.payStatus === 'WOP' ? 'negative' : 'positive'" text-color="white" class="q-px-xs" style="border-radius: 4px; font-size: 10px;">{{ d.payStatus }}</q-badge>
                            </div>
                          </template>
                          <template v-else>
                            {{ inclusiveDates }}
                          </template>
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section avatar>
                        <q-icon name="info" color="primary" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label caption>Status</q-item-label>
                        <q-item-label class="text-weight-medium">
                          <q-badge
                            :color="getStatusBadgeColor(getLeaveWorkflowStageStatus(verifiedApplication))"
                            class="text-weight-bold q-px-sm q-py-xs"
                            style="border-radius: 4px;"
                          >
                            {{ getLeaveWorkflowStageStatus(verifiedApplication) }}
                          </q-badge>
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>

                  <q-checkbox
                    v-if="canCompareForReceipt"
                    v-model="comparisonConfirmed"
                    class="q-mt-md"
                    color="primary"
                    label="I compared the printed employee, filing date, leave type, dates, and total days with this official record."
                  />

                  <div class="row q-col-gutter-sm q-mt-lg">
                    <div v-if="showConfirmButton" class="col-12 col-sm-6">
                      <q-btn
                        unelevated
                        no-caps
                        color="positive"
                        icon="check_circle"
                        label="Confirm Received"
                        :loading="receiving"
                        :disable="!canConfirmReceipt"
                        @click="confirmReceipt"
                        class="full-width text-weight-bold"
                        style="height: 44px; border-radius: 8px;"
                      />
                    </div>
                    <div :class="showConfirmButton ? 'col-12 col-sm-6' : 'col-12'">
                      <q-btn
                        outline
                        no-caps
                        color="primary"
                        icon="qr_code_scanner"
                        label="Scan Another Form"
                        :disable="receiving"
                        @click="resetScanner"
                        class="full-width"
                        style="height: 44px; border-radius: 8px;"
                      />
                    </div>
                  </div>
                </template>
              </q-card-section>

              <q-card-section v-else class="text-center text-grey-7 q-py-xl">
                <div class="q-mx-auto flex flex-center bg-grey-1 rounded-borders" style="width: 80px; height: 80px;">
                  <q-icon name="qr_code" size="48px" color="grey-4" />
                </div>
                <div class="text-subtitle1 text-weight-medium q-mt-md text-grey-8">Awaiting Document Scan</div>
                <div class="text-caption text-grey-6 max-width-xs q-mx-auto q-mt-xs">
                  Scan a printed leave application form to verify its details and record its receipt.
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { QrcodeStream, QrcodeCapture } from 'vue-qrcode-reader'
import { api } from 'src/boot/axios'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  applicationId: {
    type: [String, Number],
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'confirmed'])

const dialogModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const $q = useQuasar()
const route = useRoute()

const cameraActive = ref(false)
const cameraError = ref('')
const checking = ref(false)
const receiving = ref(false)
const imageScanning = ref(false)
const scannedToken = ref('')
const verificationResult = ref(null)
const comparisonConfirmed = ref(false)

const qrcodeCaptureRef = ref(null)

const activeTab = ref('camera')

function onTabChange(tabName) {
  if (tabName !== 'camera') {
    void stopCamera()
  }
}

const cameraConstraints = ref({
  facingMode: { ideal: 'environment' },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
})

const expectedApplicationId = computed(() => {
  if (props.applicationId) return String(props.applicationId).trim()
  return String(route.query.application || '').trim()
})
const verifiedApplication = computed(() => verificationResult.value?.application || null)
const verificationStatus = computed(() =>
  String(verificationResult.value?.verification?.status || '').toLowerCase(),
)
const isPaused = computed(() => {
  return checking.value || receiving.value || Boolean(verificationResult.value)
})
const currentReference = computed(
  () => verificationResult.value?.verification?.current_reference || '',
)
const scannedReference = computed(
  () => verificationResult.value?.verification?.scanned_reference || '',
)
const canCompareForReceipt = computed(
  () =>
    verificationStatus.value === 'verified' &&
    Boolean(verificationResult.value?.verification?.can_receive),
)
const canConfirmReceipt = computed(
  () => canCompareForReceipt.value && comparisonConfirmed.value && !receiving.value,
)
const showConfirmButton = computed(() => {
  if (!verifiedApplication.value) return false
  const alreadyReceived = Boolean(verificationResult.value?.verification?.already_received)
  const isCancelled = Boolean(verifiedApplication.value?.cancelled)
  return !alreadyReceived && !isCancelled
})

const inclusiveDates = computed(() => {
  const application = verifiedApplication.value
  if (!application) return 'Not available'

  const dates = Array.isArray(application.selected_dates)
    ? application.selected_dates.filter(Boolean)
    : []
  if (dates.length > 0) return dates.map(formatDate).join(', ')

  const startDate = formatDate(application.start_date)
  const endDate = formatDate(application.end_date)
  if (startDate && endDate && startDate !== endDate) return `${startDate} to ${endDate}`
  return startDate || endDate || 'Not available'
})

const inclusiveDateList = computed(() => {
  const application = verifiedApplication.value
  if (!application) return []

  const dates = Array.isArray(application.selected_dates)
    ? application.selected_dates.filter(Boolean)
    : (application.start_date ? [application.start_date] : [])

  // Helper function to resolve coverage label
  const getCoverageLabel = (dateStr) => {
    const coverages = application.selected_date_coverage || {}
    const cov = String(coverages[dateStr] || '').toLowerCase().trim()
    if (cov.includes('half')) {
      const portions = application.selected_date_half_day_portion || {}
      const portion = String(portions[dateStr] || '').toUpperCase().trim()
      return portion ? `Half Day (${portion})` : 'Half Day'
    }
    return 'Whole Day'
  }

  // Helper function to resolve pay status label
  const getPayStatusLabel = (dateStr) => {
    const payStatuses = application.selected_date_pay_status || {}
    const status = String(payStatuses[dateStr] || '').toLowerCase().trim()
    if (status.includes('without') || status === 'wop' || status.includes('wop')) {
      return 'WOP'
    }
    return 'WP'
  }

  return dates.map(d => {
    return {
      dateText: formatInclusiveDateText(d),
      coverage: getCoverageLabel(d),
      payStatus: getPayStatusLabel(d)
    }
  })
})

function formatInclusiveDateText(value) {
  if (!value) return ''
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value)

  if (Number.isNaN(parsedDate.getTime())) return String(value)

  return parsedDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function trimText(value) {
  return String(value || '').trim()
}

function getMiddleInitial(value) {
  const normalized = trimText(value)
  if (!normalized) return ''

  const tokens = normalized.split(/\s+/)
  const firstToken = tokens[0]
  if (!firstToken) return ''

  const firstCharacter = String(firstToken)
    .replace(/[^A-Za-z0-9]/g, '')
    .charAt(0)

  return firstCharacter ? `${firstCharacter.toUpperCase()}.` : ''
}

function formatEmployeeNameFromParts(surname, firstname, middlename = '') {
  const cleanSurname = trimText(surname)
  const cleanFirstname = trimText(firstname)
  if (!cleanSurname || !cleanFirstname) return ''

  const formattedName = `${cleanSurname}, ${cleanFirstname}`
  const middleInitial = getMiddleInitial(middlename)
  return middleInitial ? `${formattedName} ${middleInitial}` : formattedName
}

function formatEmployeeNameFromRaw(value) {
  const rawName = trimText(value)
  if (!rawName) return ''

  if (rawName.includes(',')) {
    const [rawSurname, ...rawGivenNames] = rawName.split(',')
    const surname = trimText(rawSurname)
    const givenTokens = rawGivenNames
      .join(' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)

    const firstname = givenTokens[0] || ''
    const middlename = givenTokens.slice(1).join(' ')

    return formatEmployeeNameFromParts(surname, firstname, middlename) || rawName
  }

  const tokens = rawName
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
  if (tokens.length < 2) return rawName

  const firstname = tokens[0]
  const surname = tokens[tokens.length - 1]
  const middlename = tokens.slice(1, -1).join(' ')

  return formatEmployeeNameFromParts(surname, firstname, middlename) || rawName
}

function getLeaveWorkflowStageStatus(app) {
  if (!app) return ''

  if (app.cancelled) return 'Cancelled'

  const rawStatus = String(app.raw_status || app.status || '').trim().toUpperCase()
  if (rawStatus === 'REJECTED') return 'Disapproved'
  if (rawStatus === 'APPROVED' && app.has_hr_released) return 'Approved'

  const queueStageKey = String(app.queue_stage_key || '').trim().toUpperCase()
  const isPendingUpdate = Boolean(app.has_pending_update_request)

  if (queueStageKey === 'PENDING_ADMIN' || queueStageKey === 'PENDING_ADMIN_REVIEW' || rawStatus === 'PENDING_ADMIN') {
    return 'Department Recommendation'
  }

  if (queueStageKey === 'PENDING_HR_RECEIVE' || rawStatus === 'PENDING_HR') {
    const received = Boolean(app.has_hr_received)
    if (received) {
      return isPendingUpdate ? 'Pending Update Review' : 'CHRMO Certification'
    }
    return isPendingUpdate ? 'Pending Update Receive' : 'Pending Receive'
  }

  if (queueStageKey === 'PENDING_HR_REVIEW') {
    return isPendingUpdate ? 'Pending Update Review' : 'CHRMO Certification'
  }

  if (queueStageKey === 'PENDING_CMO_CBMO_REVIEW') {
    const reviewed = Boolean(app.has_cmo_cbmo_reviewed)
    return reviewed ? 'Pending Release' : 'CMO/CVMO Review'
  }

  if (queueStageKey === 'PENDING_RELEASE' || (rawStatus === 'APPROVED' && !app.has_hr_released)) {
    return isPendingUpdate ? 'Pending Update Release' : 'Pending Release'
  }

  return app.status || 'Pending'
}

function getStatusBadgeColor(statusText) {
  const status = String(statusText || '').trim().toUpperCase()
  if (!status) return 'grey-7'

  if (status.includes('PENDING RECEIVE')) {
    return 'teal-6'
  }
  if (status.includes('CHRMO CERTIFICATION') || status.includes('HR CERTIFICATION') || status.includes('PENDING HR')) {
    return 'blue-6'
  }
  if (status.includes('CMO') || status.includes('CBMO')) {
    return 'deep-purple-6'
  }
  if (status.includes('RELEASE')) {
    return 'indigo-6'
  }
  if (status.includes('APPROVED') || status.includes('RELEASED')) {
    return 'positive'
  }
  if (status.includes('REJECTED') || status.includes('DISAPPROVED')) {
    return 'negative'
  }
  if (status.includes('PENDING')) {
    return 'warning'
  }
  if (status.includes('RECALLED')) {
    return 'blue-grey-7'
  }
  return 'grey-7'
}

const verificationLabel = computed(() => {
  if (verifiedApplication.value?.cancelled) {
    return 'Cancelled application'
  }
  if (verificationResult.value?.verification?.already_received) {
    return 'Already received'
  }

  const labels = {
    verified: 'Valid current form',
    outdated: 'Outdated form',
    invalid: 'Invalid or altered QR code',
    mismatch: 'Wrong application form',
    not_found: 'Application not found',
  }

  return labels[verificationStatus.value] || 'Unable to verify form'
})
const verificationIcon = computed(() => {
  if (verifiedApplication.value?.cancelled) return 'cancel'
  if (verificationResult.value?.verification?.already_received) return 'info'
  if (verificationStatus.value === 'verified') return 'verified'
  if (verificationStatus.value === 'outdated') return 'history'
  return 'gpp_bad'
})
const verificationBannerClass = computed(() => {
  if (verifiedApplication.value?.cancelled) return 'bg-red-1 text-red-10'
  if (verificationResult.value?.verification?.already_received) return 'bg-blue-1 text-blue-10'
  if (verificationStatus.value === 'verified') return 'bg-green-1 text-green-10'
  if (verificationStatus.value === 'outdated') return 'bg-orange-1 text-orange-10'
  return 'bg-red-1 text-red-10'
})
const verificationMessage = computed(() => {
  if (verifiedApplication.value?.cancelled) {
    return 'This application has been cancelled and cannot be received.'
  }
  if (verificationResult.value?.verification?.already_received) {
    return 'This application has already been recorded as received by HR.'
  }
  return verificationResult.value?.message || ''
})

function onShow() {
  void startCamera()
}

function onHide() {
  void stopCamera()
  resetScanner()
}

async function startCamera() {
  cameraError.value = ''
  cameraActive.value = true
}

async function stopCamera() {
  cameraActive.value = false
}

function onCameraError(error) {
  let msg = 'Could not access the camera. Make sure permissions are granted.'
  if (error.name === 'NotAllowedError') {
    msg = 'Camera access denied. Please allow camera permissions in your browser.'
  } else if (error.name === 'NotFoundError') {
    msg = 'No camera found on this device.'
  } else if (error.name === 'NotSupportedError') {
    msg = 'Camera features not supported on this connection (requires HTTPS/secure origin).'
  }
  cameraError.value = msg
  cameraActive.value = false
}

function onDetect(detectedCodes) {
  if (checking.value || receiving.value || verificationResult.value) return

  const code = detectedCodes[0]
  if (code && code.rawValue) {
    void verifyToken(code.rawValue)
  }
}

function paintBoundingBox(detectedCodes, ctx) {
  for (const { boundingBox } of detectedCodes) {
    const { x, y, width, height } = boundingBox
    ctx.lineWidth = 2
    ctx.strokeStyle = '#21ba45' // green theme color
    ctx.setLineDash([8, 6]) // dashed line style
    ctx.strokeRect(x, y, width, height)
  }
}

function triggerImageCapture() {
  if (checking.value || receiving.value || imageScanning.value) return
  if (qrcodeCaptureRef.value && qrcodeCaptureRef.value.$el) {
    qrcodeCaptureRef.value.$el.click()
  }
}

function onCaptureFileChange() {
  imageScanning.value = true
}

async function onDetectCapture(detectedCodes) {
  try {
    const code = detectedCodes[0]
    if (code && code.rawValue) {
      await verifyToken(code.rawValue)
    } else {
      $q.notify({
        type: 'negative',
        position: 'top',
        message: 'No QR code detected in the uploaded image.',
      })
    }
  } catch (error) {
    console.error('QR Image Capture processing failed:', error)
    $q.notify({
      type: 'negative',
      position: 'top',
      message: 'Failed to process QR image.',
    })
  } finally {
    imageScanning.value = false
  }
}

async function verifyToken(rawValue) {
  const token = extractVerificationToken(rawValue)
  if (!token) {
    $q.notify({
      type: 'negative',
      position: 'top',
      message: 'This QR code is not an LMS leave application verification code.',
    })
    return
  }

  checking.value = true
  comparisonConfirmed.value = false
  verificationResult.value = null
  scannedToken.value = token

  try {
    const response = await api.post('/hr/leave-applications/verify-document', { token })
    const result = response.data
    const scannedApplicationId = String(result?.application?.id || '').trim()

    if (
      expectedApplicationId.value &&
      scannedApplicationId &&
      expectedApplicationId.value !== scannedApplicationId
    ) {
      result.verification = {
        ...result.verification,
        status: 'mismatch',
        can_receive: false,
      }
      result.message = `This QR code belongs to application #${scannedApplicationId}, not application #${expectedApplicationId.value}.`
    }

    verificationResult.value = result
  } catch (error) {
    verificationResult.value = error?.response?.data || {
      message: resolveApiErrorMessage(error, 'Unable to verify this leave application form.'),
      verification: { status: 'invalid', can_receive: false },
    }
  } finally {
    checking.value = false
    // Smooth scroll down to the verification result on mobile viewports
    nextTick(() => {
      const el = document.getElementById('verification-result-section')
      if (el && window.innerWidth < 1024) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }
}

async function confirmReceipt() {
  const applicationId = verifiedApplication.value?.id
  if (!applicationId || !canConfirmReceipt.value) return

  receiving.value = true
  try {
    const reference = currentReference.value || scannedReference.value
    const response = await api.post(`/hr/leave-applications/${applicationId}/receive`, {
      verification_token: scannedToken.value,
      remarks: reference
        ? `Received after QR verification (${reference}).`
        : 'Received after QR verification.',
    })

    verificationResult.value = {
      ...verificationResult.value,
      message: response?.data?.message || 'Hard-copy receipt confirmed.',
      verification: {
        ...verificationResult.value.verification,
        already_received: true,
        can_receive: false,
      },
      application: response?.data?.application || verifiedApplication.value,
    }

    emit('confirmed')

    $q.notify({
      type: 'positive',
      position: 'top',
      message: 'Receipt recorded successfully.',
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      position: 'top',
      message: resolveApiErrorMessage(error, 'Failed to record receipt.'),
    })
  } finally {
    receiving.value = false
  }
}

function extractVerificationToken(rawValue) {
  const clean = String(rawValue || '').trim()
  if (!clean) return null

  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    try {
      const url = new URL(clean)
      const tokenParam = url.searchParams.get('token')
      if (tokenParam) return tokenParam
    } catch {
      // ignore, fallback to raw check
    }
  }

  if (clean.length > 50) return clean
  return null
}

function resetScanner() {
  verificationResult.value = null
  scannedToken.value = ''
  comparisonConfirmed.value = false
  cameraError.value = ''

  // Toggle cameraActive off and on to fully reset the internal detection cache
  // and reload the device camera stream cleanly.
  cameraActive.value = false
  nextTick(() => {
    void startCamera()
  })
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function formatDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date)
}
</script>

<style scoped>
/* Card style */
.scanner-card {
  border-radius: 12px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.05);
}

/* Scanner viewport frames */
.scanner-frame,
.scanner-frame-placeholder {
  position: relative;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  background: #111;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.scanner-frame-placeholder {
  background: #f8f9fa;
  border: 2px dashed #e9ecef;
  flex-direction: column;
}

.scanner-reader {
  width: 100%;
  height: 100%;
}

.scanner-reader :deep(video) {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover;
}

/* Scanning Overlay Focus Corners */
.scanner-overlay-focus {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 180px;
  height: 180px;
  z-index: 9;
  pointer-events: none;
}

.corner {
  position: absolute;
  width: 24px;
  height: 24px;
  border: 3px solid #21ba45;
  pointer-events: none;
}

.corner-tl {
  top: 0;
  left: 0;
  border-right: none;
  border-bottom: none;
  border-top-left-radius: 8px;
}

.corner-tr {
  top: 0;
  right: 0;
  border-left: none;
  border-bottom: none;
  border-top-right-radius: 8px;
}

.corner-bl {
  bottom: 0;
  left: 0;
  border-right: none;
  border-top: none;
  border-bottom-left-radius: 8px;
}

.corner-br {
  bottom: 0;
  right: 0;
  border-left: none;
  border-top: none;
  border-bottom-right-radius: 8px;
}

/* Laser sweep */
.scanner-laser {
  position: absolute;
  left: 5%;
  right: 5%;
  height: 3px;
  background: #21ba45;
  box-shadow: 0 0 12px 3px rgba(33, 186, 69, 0.85);
  border-radius: 50%;
  animation: scan-laser-move 2.5s infinite ease-in-out;
  pointer-events: none;
  z-index: 10;
}

/* Scanner badge */
.scanner-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  z-index: 11;
  display: flex;
  align-items: center;
  gap: 6px;
  pointer-events: none;
  border-radius: 4px;
}

.scanner-dot {
  width: 8px;
  height: 8px;
  background-color: #21ba45;
  border-radius: 50%;
  box-shadow: 0 0 0 0 rgba(33, 186, 69, 0.7);
  animation: pulse-dot 1.2s infinite;
}

/* File Upload Zone styling */
.file-upload-zone {
  border: 2px dashed #ccc;
  border-radius: 12px;
  background: #fafafa;
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.file-upload-zone:hover {
  border-color: var(--q-primary);
  background: #f0f7f3;
  color: var(--q-primary);
}

@keyframes scan-laser-move {
  0% {
    top: 20%;
  }
  50% {
    top: 80%;
  }
  100% {
    top: 20%;
  }
}

@keyframes pulse-dot {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(33, 186, 69, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgba(33, 186, 69, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(33, 186, 69, 0);
  }
}

@media (max-width: 599px) {
  .scanner-overlay-focus {
    width: 140px;
    height: 140px;
  }
}
</style>
