<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    @update:model-value="val => $emit('update:modelValue', val)"
    @keyup.enter="onDialogEnter"
  >
    <q-card class="dtr-override-popup">
      <!-- Title Bar: Solid Forest Green -->
      <div class="popup-title-bar row items-center no-wrap">
        <div class="row items-center q-gutter-x-xs no-wrap ellipsis">
          <q-icon
            name="edit_calendar"
            size="18px"
            class="text-white q-mr-xs"
          />
          <span class="text-subtitle2 text-weight-bolder text-uppercase letter-spacing-1 text-white">
            {{ formattedDate }}
          </span>
          <span v-if="dayOfWeek" class="text-caption text-weight-medium text-green-1">
            ({{ dayOfWeek }})
          </span>
          <span class="text-green-2 q-mx-xs">•</span>
          <span class="text-caption text-weight-bold text-green-1 ellipsis">
            {{ activeScopeHeaderLabel }}
          </span>
        </div>
      </div>

      <!-- Main Body: Scope-First Override Layout -->
      <q-card-section class="popup-body bg-white">
        <!-- Apply Scope Selector (Single Slot vs Half-Day vs Whole-Day) -->
        <div class="apply-scope-row q-mb-md">
          <div class="section-title text-caption text-weight-bold text-grey-8 q-mb-xs">
            Period
          </div>
          <q-option-group
            v-model="applyScope"
            type="radio"
            inline
            dense
            color="green-9"
            :options="applyScopeOptions"
            class="apply-scope-radios"
            @update:model-value="onScopeChanged"
          />
        </div>

        <!-- Edge-case Guard: Selected period contains a protected biometric punch -->
        <div
          v-if="hasLockedBiometricSlot"
          class="biometric-guard-note row items-start no-wrap q-gutter-x-sm q-mb-md"
        >
          <q-icon name="lock" size="16px" class="text-amber-9 q-mt-xs" />
          <span class="text-caption text-amber-10 text-weight-medium">
            This period includes a protected biometric punch and cannot be overwritten directly. Select a different period or request deletion on the biometric cell.
          </span>
        </div>

        <!-- Standard Override Form -->
        <div class="row q-col-gutter-md items-start">
          <!-- Left Column: Time Input (Only when editing a single slot) -->
          <div v-if="applyScope === 'single'" class="col-12 col-sm-4">
            <div class="column-header row items-center q-mb-xs">
              <span class="section-title text-caption text-weight-bold text-grey-8">
                Time ({{ activeSlotMeta.shortLabel }})
              </span>
            </div>
            <q-input
              v-model="slotTime"
              dense
              outlined
              :placeholder="slotPlaceholder"
              :disable="hasLockedBiometricSlot"
              class="popup-time-input font-mono"
              autofocus
            >
              <template #append>
                <q-icon
                  v-if="slotTime && !hasLockedBiometricSlot"
                  name="clear"
                  size="14px"
                  class="cursor-pointer text-grey-5"
                  @click="slotTime = ''"
                />
                <q-icon name="schedule" size="18px" class="cursor-pointer text-green-9">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-time v-model="slotTime" mask="h:mm A" color="green-9" />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </div>

          <!-- Right / Full-Width Column: Reason/Remarks Dropdown (Loaded from Remarks Library - Required) -->
          <div :class="applyScope === 'single' ? 'col-12 col-sm-8' : 'col-12'">
            <div class="column-header row items-center q-mb-xs">
              <span class="section-title text-caption text-weight-bold text-grey-8">
                Reason / Remarks <span class="text-negative text-weight-bolder">*</span>
              </span>
            </div>
            <q-select
              ref="selectRemarkRef"
              v-model="slotRemark"
              dense
              outlined
              emit-value
              map-options
              :options="remarkOptionsList"
              :loading="loadingRemarks"
              :disable="hasLockedBiometricSlot"
              :rules="[val => !!val || 'Reason / Remarks is required']"
              lazy-rules="ondemand"
              hide-bottom-space
              placeholder="Select Reason"
              class="popup-select-input"
              @update:model-value="onRemarkSelected"
            />

            <!-- Inline Custom Remark Input when OTHERS is chosen -->
            <transition name="fade">
              <div v-if="slotRemark === 'OTHERS'" class="q-mt-xs">
                <q-input
                  ref="customRemarkRef"
                  v-model="slotCustomRemark"
                  dense
                  outlined
                  :disable="hasLockedBiometricSlot"
                  :rules="[val => !!(val && val.trim()) || 'Please specify remark']"
                  lazy-rules="ondemand"
                  hide-bottom-space
                  placeholder="Specify remark (e.g. Pass Slip, Travel Order)..."
                  class="popup-select-input"
                />
              </div>
            </transition>

            <div
              v-if="applyScope !== 'single'"
              class="merged-hint row items-center no-wrap q-gutter-x-xs q-mt-sm"
            >
              <q-icon name="info_outline" size="14px" class="text-green-9" />
              <span>{{ mergedHintText }}</span>
            </div>
          </div>
        </div>
      </q-card-section>

      <!-- Action Footer -->
      <div class="popup-footer row items-center justify-end q-gutter-x-sm bg-grey-1">
        <q-btn
          flat
          dense
          no-caps
          label="Close"
          color="grey-7"
          class="footer-btn q-px-md text-weight-medium"
          @click="closeDialog"
        />
        <q-btn
          unelevated
          dense
          no-caps
          label="Save"
          class="save-btn text-weight-bold q-px-lg"
          :disable="hasLockedBiometricSlot"
          :loading="submitting"
          @click="submitOverride"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  controlNo: {
    type: String,
    required: true,
  },
  employeeName: {
    type: String,
    default: '',
  },
  date: {
    type: String,
    required: true,
  },
  dtr: {
    type: Object,
    default: null,
  },
  initialSlot: {
    type: String,
    default: 'am_arrival',
  },
})

const emit = defineEmits(['update:modelValue', 'saved'])
const $q = useQuasar()
const submitting = ref(false)
const loadingRemarks = ref(false)
const libraryRemarks = ref([])

const selectRemarkRef = ref(null)
const customRemarkRef = ref(null)

const activeSlot = ref('am_arrival')
const initialScope = ref('single')
const applyScope = ref('single')
const slotTime = ref('')
const slotRemark = ref(null)
const slotCustomRemark = ref('')

const applyScopeOptions = [
  { label: 'Selected Cell', value: 'single' },
  { label: 'Morning (AM)', value: 'am' },
  { label: 'Afternoon (PM)', value: 'pm' },
  { label: 'Whole Day', value: 'whole' },
]

const slotTabs = [
  { key: 'am_arrival', label: 'Morning Arrival (A.M. In)', shortLabel: 'AM In' },
  { key: 'am_departure', label: 'Morning Departure (A.M. Out)', shortLabel: 'AM Out' },
  { key: 'pm_arrival', label: 'Afternoon Arrival (P.M. In)', shortLabel: 'PM In' },
  { key: 'pm_departure', label: 'Afternoon Departure (P.M. Out)', shortLabel: 'PM Out' },
]

const activeSlotMeta = computed(() => {
  return slotTabs.find(s => s.key === activeSlot.value) || slotTabs[0]
})

const activeScopeHeaderLabel = computed(() => {
  if (applyScope.value === 'whole') return 'Whole Day (All Slots)'
  if (applyScope.value === 'am') return 'Whole Morning (AM In & Out)'
  if (applyScope.value === 'pm') return 'Whole Afternoon (PM In & Out)'
  return activeSlotMeta.value.label
})

const mergedHintText = computed(() => {
  if (applyScope.value === 'whole') {
    return 'Applies remark across all 4 merged slots for the whole day (no time entry).'
  }
  if (applyScope.value === 'am') {
    return 'Applies remark across merged AM In & AM Out cells (no time entry).'
  }
  if (applyScope.value === 'pm') {
    return 'Applies remark across merged PM In & PM Out cells (no time entry).'
  }
  return ''
})

// Dynamic options loaded from System Remarks Library (tblDtrRemarks) - strictly required remarks
const remarkOptionsList = computed(() => {
  const options = []

  if (libraryRemarks.value.length > 0) {
    libraryRemarks.value.forEach(item => {
      const abbrv = item.abbrv ? item.abbrv.trim().toUpperCase() : null
      const desc = item.description ? item.description.trim().toUpperCase() : ''
      const val = abbrv || desc
      const label = abbrv ? `${desc} (${abbrv})` : desc
      if (val && !options.some(o => o.value === val)) {
        options.push({ label, value: val })
      }
    })
  } else {
    // Graceful fallback matching default library items
    options.push(
      { label: 'OFFICIAL BUSINESS (O.B.)', value: 'O.B.' },
      { label: 'ON FIELD (O.F.)', value: 'O.F.' },
      { label: 'OTHERS', value: 'OTHERS' }
    )
  }

  return options
})

async function fetchRemarksOptions() {
  if (libraryRemarks.value.length > 0) return
  loadingRemarks.value = true
  try {
    const res = await api.get('/dtr-remarks/options', { params: { active_only: true } })
    libraryRemarks.value = res.data?.remarks || []
  } catch (err) {
    console.error('Failed to load Remarks Library options:', err)
  } finally {
    loadingRemarks.value = false
  }
}

onMounted(() => {
  fetchRemarksOptions()
})

function getDefaultSlotTime(slotKey) {
  switch (slotKey) {
    case 'am_arrival': return '8:00 AM'
    case 'am_departure': return '12:00 PM'
    case 'pm_arrival': return '1:00 PM'
    case 'pm_departure': return '5:00 PM'
    default: return '8:00 AM'
  }
}

const slotPlaceholder = computed(() => {
  return getDefaultSlotTime(activeSlot.value)
})

function onRemarkSelected(newRemark) {
  if (newRemark && applyScope.value === 'single' && !slotTime.value) {
    slotTime.value = getDefaultSlotTime(activeSlot.value)
  }
}

function onScopeChanged(scope) {
  if (scope !== 'single') {
    slotTime.value = ''
  } else if (!slotTime.value) {
    slotTime.value = formatTo12Hour(props.dtr?.[activeSlot.value]) || ''
  }
}

function onDialogEnter(event) {
  if (event?.target?.tagName === 'TEXTAREA') return
  submitOverride()
}

function isSlotManuallyAdjusted(dtr, slotKey) {
  if (!dtr || !dtr.is_adjusted) return false
  const adjusted = dtr.adjusted_slots
  if (Array.isArray(adjusted)) {
    return adjusted.includes(slotKey)
  }
  if (adjusted && typeof adjusted === 'object') {
    return Boolean(adjusted[slotKey])
  }
  return false
}

function isBiometricSlot(dtr, slotKey) {
  return hasRealPunch(dtr?.[slotKey]) && !isSlotManuallyAdjusted(dtr, slotKey)
}

const targetSlots = computed(() => getSlotsForScope(applyScope.value, activeSlot.value))

const lockedBiometricSlots = computed(() => {
  return targetSlots.value.filter((s) => isBiometricSlot(props.dtr, s))
})

const hasLockedBiometricSlot = computed(() => lockedBiometricSlots.value.length > 0)

function hasRealPunch(val) {
  return Boolean(val && val !== '-' && val !== '—')
}

function getSlotNonTimeRemark(adjusted, slotKey) {
  if (!adjusted || typeof adjusted !== 'object' || Array.isArray(adjusted)) return ''
  const val = adjusted[slotKey]
  return typeof val === 'string' && val.trim() !== '' && val !== 'TIME'
    ? val.trim().toUpperCase()
    : ''
}

function detectInitialScope(slotKey, dtr) {
  const adjusted = dtr?.adjusted_slots
  const amInRmk = getSlotNonTimeRemark(adjusted, 'am_arrival')
  const amOutRmk = getSlotNonTimeRemark(adjusted, 'am_departure')
  const pmInRmk = getSlotNonTimeRemark(adjusted, 'pm_arrival')
  const pmOutRmk = getSlotNonTimeRemark(adjusted, 'pm_departure')

  const amMerged =
    !hasRealPunch(dtr?.am_arrival) &&
    !hasRealPunch(dtr?.am_departure) &&
    amInRmk !== '' &&
    amInRmk === amOutRmk
  const pmMerged =
    !hasRealPunch(dtr?.pm_arrival) &&
    !hasRealPunch(dtr?.pm_departure) &&
    pmInRmk !== '' &&
    pmInRmk === pmOutRmk

  if (amMerged && pmMerged && amInRmk === pmInRmk) {
    return 'whole'
  }
  if ((slotKey === 'am_arrival' || slotKey === 'am_departure') && amMerged) {
    return 'am'
  }
  if ((slotKey === 'pm_arrival' || slotKey === 'pm_departure') && pmMerged) {
    return 'pm'
  }
  return 'single'
}

function getSlotsForScope(scope, slotKey) {
  if (scope === 'whole') {
    return ['am_arrival', 'am_departure', 'pm_arrival', 'pm_departure']
  }
  if (scope === 'am') {
    return ['am_arrival', 'am_departure']
  }
  if (scope === 'pm') {
    return ['pm_arrival', 'pm_departure']
  }
  return [slotKey]
}

function formatTo12Hour(timeStr) {
  if (!timeStr || timeStr === '—' || timeStr === '-') return ''
  if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) {
    return timeStr.trim()
  }
  const parts = String(timeStr).split(':')
  if (parts.length >= 2) {
    let h = parseInt(parts[0], 10)
    const m = parts[1]
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12
    h = h ? h : 12
    return `${h}:${m} ${ampm}`
  }
  return timeStr
}

function syncSlotState(slotKey) {
  const detectedScope = detectInitialScope(slotKey, props.dtr)
  initialScope.value = detectedScope
  applyScope.value = detectedScope
  slotTime.value = detectedScope === 'single' ? (formatTo12Hour(props.dtr?.[slotKey]) || '') : ''

  const adjusted = props.dtr?.adjusted_slots
  if (adjusted && typeof adjusted === 'object' && !Array.isArray(adjusted)) {
    const val = adjusted[slotKey]
    if (val && val !== 'TIME') {
      const upper = String(val).toUpperCase().trim()
      if (['O.F.', 'ON FIELD'].includes(upper)) {
        slotRemark.value = 'O.F.'
        slotCustomRemark.value = ''
      } else if (['O.B.', 'OFFICIAL BUSINESS'].includes(upper)) {
        slotRemark.value = 'O.B.'
        slotCustomRemark.value = ''
      } else if (upper === 'OTHERS') {
        slotRemark.value = 'OTHERS'
        slotCustomRemark.value = ''
      } else {
        const found = remarkOptionsList.value.find(o => o.value === upper)
        if (found) {
          slotRemark.value = found.value
          slotCustomRemark.value = ''
        } else {
          slotRemark.value = 'OTHERS'
          slotCustomRemark.value = val
        }
      }
      return
    }
  }

  const rawRemark = String(props.dtr?.adjustment_remarks || '').toUpperCase().trim()
  const rawStatus = String(props.dtr?.status || '').toUpperCase().trim()
  if (rawRemark === 'O.F.' || rawStatus === 'O.F.') {
    slotRemark.value = 'O.F.'
    slotCustomRemark.value = ''
  } else if (rawRemark === 'O.B.' || rawStatus === 'O.B.' || rawStatus === 'OFFICIAL_BUSINESS') {
    slotRemark.value = 'O.B.'
    slotCustomRemark.value = ''
  } else {
    slotRemark.value = null
    slotCustomRemark.value = ''
  }
}

// Watch dialog open & slot change
watch(
  () => [props.modelValue, props.dtr, props.date, props.initialSlot],
  ([isOpen]) => {
    if (!isOpen) return

    fetchRemarksOptions()

    if (props.initialSlot && ['am_arrival', 'am_departure', 'pm_arrival', 'pm_departure'].includes(props.initialSlot)) {
      activeSlot.value = props.initialSlot
    } else {
      activeSlot.value = 'am_arrival'
    }

    syncSlotState(activeSlot.value)
  },
  { immediate: true }
)

const dayOfWeek = computed(() => {
  if (!props.date) return 'Day'
  try {
    const d = new Date(props.date + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'long' })
  } catch {
    return 'Day'
  }
})

const formattedDate = computed(() => {
  if (!props.date) return ''
  try {
    const d = new Date(props.date + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return props.date
  }
})

function closeDialog() {
  emit('update:modelValue', false)
}

async function submitOverride() {
  if (!props.controlNo || !props.date) return
  if (hasLockedBiometricSlot.value) {
    $q.notify({
      type: 'warning',
      message: 'Biometric punches cannot be modified or cleared directly. Submit a Delete Request instead.',
      position: 'top',
    })
    return
  }

  // Validation: Reason / Remarks is strictly required
  if (!slotRemark.value) {
    $q.notify({
      type: 'warning',
      message: 'Reason / Remarks is required.',
      position: 'top',
    })
    selectRemarkRef.value?.validate?.()
    return
  }

  if (slotRemark.value === 'OTHERS' && !slotCustomRemark.value.trim()) {
    $q.notify({
      type: 'warning',
      message: 'Please specify the remark description.',
      position: 'top',
    })
    customRemarkRef.value?.validate?.()
    return
  }

  submitting.value = true

  try {
    const existingAdjusted = props.dtr?.adjusted_slots
    let adjustedMap = {}
    if (existingAdjusted && typeof existingAdjusted === 'object' && !Array.isArray(existingAdjusted)) {
      adjustedMap = { ...existingAdjusted }
    } else if (Array.isArray(existingAdjusted)) {
      existingAdjusted.forEach(slot => {
        adjustedMap[slot] = 'TIME'
      })
    }

    let amArr = formatTo12Hour(props.dtr?.am_arrival) || null
    let amDep = formatTo12Hour(props.dtr?.am_departure) || null
    let pmArr = formatTo12Hour(props.dtr?.pm_arrival) || null
    let pmDep = formatTo12Hour(props.dtr?.pm_departure) || null

    const finalRmk = slotRemark.value === 'OTHERS'
      ? (slotCustomRemark.value.trim() || 'OTHERS')
      : slotRemark.value

    const timeVal = slotTime.value ? slotTime.value.trim() : null
    const slot = activeSlot.value
    const slotSetters = {
      am_arrival: (v) => { amArr = v },
      am_departure: (v) => { amDep = v },
      pm_arrival: (v) => { pmArr = v },
      pm_departure: (v) => { pmDep = v },
    }
    const previousSlots = getSlotsForScope(initialScope.value, slot)
    const targetSlots = getSlotsForScope(applyScope.value, slot)

    if (initialScope.value !== applyScope.value) {
      previousSlots.forEach((s) => {
        if (!targetSlots.includes(s)) {
          delete adjustedMap[s]
          slotSetters[s](null)
        }
      })
    }

    if (applyScope.value !== 'single') {
      targetSlots.forEach((s) => {
        adjustedMap[s] = finalRmk
        slotSetters[s](null)
      })
    } else if (finalRmk) {
      adjustedMap[slot] = finalRmk
      slotSetters[slot](timeVal)
    } else if (timeVal) {
      adjustedMap[slot] = 'TIME'
      slotSetters[slot](timeVal)
    } else {
      delete adjustedMap[slot]
      slotSetters[slot](null)
    }

    const payload = {
      employee_control_no: props.controlNo,
      date: props.date,
      am_arrival: amArr,
      am_departure: amDep,
      pm_arrival: pmArr,
      pm_departure: pmDep,
      ot_arrival: formatTo12Hour(props.dtr?.ot_arrival) || null,
      ot_departure: formatTo12Hour(props.dtr?.ot_departure) || null,
      remark: finalRmk || null,
      adjusted_slots: Object.keys(adjustedMap).length > 0 ? adjustedMap : null,
    }

    const res = await api.post('/attendance/dtr/override', payload)

    $q.notify({
      type: 'positive',
      message: 'Override saved successfully.',
      position: 'top',
      timeout: 1500,
    })

    emit('saved', res.data?.dtr)
    closeDialog()
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to save override.'
    $q.notify({
      type: 'negative',
      message: msg,
      position: 'top',
    })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.dtr-override-popup {
  width: 530px;
  max-width: 95vw;
  background-color: transparent;
  color: #1e293b;
  border-radius: 6px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.16);
  overflow: hidden;
  border: none;
}

.popup-title-bar {
  background-color: #2e7d32; /* System Design Solid Forest Green */
  color: #ffffff;
  padding: 10px 16px;
  border-radius: 6px 6px 0 0;
}

.popup-body {
  background-color: #ffffff;
  padding: 16px 18px;
}

.popup-footer {
  background-color: #f8fafc;
  border-top: 1px solid #e2e8f0;
  padding: 10px 16px;
}

.column-header {
  height: 24px;
  min-height: 24px;
}

.section-title {
  color: #334155;
  font-size: 0.88rem;
  line-height: 1.2;
}

.popup-time-input :deep(.q-field__control),
.popup-select-input :deep(.q-field__control) {
  height: 40px;
  min-height: 40px;
  border-radius: 4px;
  background-color: #ffffff;
}

.popup-time-input :deep(.q-field__native) {
  font-size: 1.05rem;
  font-weight: 600;
  font-family: var(--app-font-mono);
  font-variant-numeric: tabular-nums;
  color: #1e293b;
}

.popup-select-input :deep(.q-field__native),
.popup-select-input :deep(.q-field__input) {
  font-size: 0.95rem;
  font-weight: 500;
  color: #1e293b;
}

.apply-scope-row {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 10px 12px;
}

.apply-scope-radios {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: 8px;
}

.apply-scope-radios :deep(> div) {
  margin-left: 0 !important;
}

.apply-scope-radios :deep(.q-radio__label) {
  font-size: 0.84rem;
  font-weight: 500;
  color: #1e293b;
  white-space: nowrap;
}

@media (max-width: 520px) {
  .apply-scope-radios {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 12px;
  }
}

.merged-hint {
  font-size: 0.78rem;
  color: #166534;
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 4px;
  padding: 6px 10px;
  line-height: 1.35;
}

.biometric-guard-note {
  background-color: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 6px;
  padding: 9px 12px;
  line-height: 1.35;
}

.save-btn {
  background-color: #2e7d32 !important; /* Forest Green System Primary */
  color: #ffffff !important;
  border-radius: 4px;
  height: 34px;
  font-size: 0.88rem;
}

.save-btn:hover {
  background-color: #256628 !important;
}

.footer-btn {
  height: 34px;
  border-radius: 4px;
  font-size: 0.88rem;
}

.letter-spacing-1 {
  letter-spacing: 0.5px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
