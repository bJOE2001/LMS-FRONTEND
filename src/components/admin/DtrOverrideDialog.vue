<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    @update:model-value="val => $emit('update:modelValue', val)"
    @keyup.enter="submitOverride"
  >
    <q-card class="dtr-override-popup">
      <!-- Title Bar: Solid Forest Green matching System Design -->
      <div class="popup-title-bar row items-center no-wrap">
        <div class="row items-center q-gutter-x-xs no-wrap ellipsis">
          <q-icon name="edit_calendar" size="18px" class="text-white q-mr-xs" />
          <span class="text-subtitle2 text-weight-bolder text-uppercase letter-spacing-1 text-white">
            {{ formattedDate }}
          </span>
          <span class="text-green-2 q-mx-xs">•</span>
          <span class="text-caption text-weight-bold text-green-1 ellipsis">
            {{ activeSlotMeta.label }}
          </span>
        </div>
      </div>

      <!-- Main Body: Two-Column Side-by-Side with Perfect Horizontal Alignment -->
      <q-card-section class="popup-body bg-white">
        <div class="row q-col-gutter-md items-start">
          <!-- Left Column: Day + Time Input -->
          <div class="col-12 col-sm-4">
            <div class="column-header row items-center q-mb-xs">
              <span class="day-label text-weight-bolder">{{ dayOfWeek }}</span>
            </div>
            <q-input
              v-model="slotTime"
              dense
              outlined
              :placeholder="slotPlaceholder"
              class="popup-time-input font-mono"
              autofocus
            >
              <template #append>
                <q-icon
                  v-if="slotTime"
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

          <!-- Right Column: Reason/Remarks Dropdown (Loaded from Remarks Library - Required) -->
          <div class="col-12 col-sm-8">
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
                  :rules="[val => !!(val && val.trim()) || 'Please specify remark']"
                  lazy-rules="ondemand"
                  hide-bottom-space
                  placeholder="Specify remark (e.g. Pass Slip, Travel Order)..."
                  class="popup-select-input"
                />
              </div>
            </transition>
          </div>
        </div>
      </q-card-section>

      <!-- Action Footer (Clean System Design) -->
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
const slotTime = ref('')
const slotRemark = ref(null)
const slotCustomRemark = ref('')

const slotTabs = [
  { key: 'am_arrival', label: 'Morning Arrival (A.M. In)', shortLabel: 'AM In' },
  { key: 'am_departure', label: 'Morning Departure (A.M. Out)', shortLabel: 'AM Out' },
  { key: 'pm_arrival', label: 'Afternoon Arrival (P.M. In)', shortLabel: 'PM In' },
  { key: 'pm_departure', label: 'Afternoon Departure (P.M. Out)', shortLabel: 'PM Out' },
]

const activeSlotMeta = computed(() => {
  return slotTabs.find(s => s.key === activeSlot.value) || slotTabs[0]
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
  if (newRemark && !slotTime.value) {
    slotTime.value = getDefaultSlotTime(activeSlot.value)
  }
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
  slotTime.value = formatTo12Hour(props.dtr?.[slotKey]) || ''

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

  // Validation: Reason / Remarks is strictly required
  if (!slotRemark.value) {
    $q.notify({
      type: 'warning',
      message: 'Reason / Remarks is required.',
      position: 'top-right',
    })
    selectRemarkRef.value?.validate?.()
    return
  }

  if (slotRemark.value === 'OTHERS' && !slotCustomRemark.value.trim()) {
    $q.notify({
      type: 'warning',
      message: 'Please specify the remark description.',
      position: 'top-right',
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

    if (finalRmk) {
      adjustedMap[slot] = finalRmk
      if (slot === 'am_arrival') amArr = timeVal
      if (slot === 'am_departure') amDep = timeVal
      if (slot === 'pm_arrival') pmArr = timeVal
      if (slot === 'pm_departure') pmDep = timeVal
    } else if (timeVal) {
      adjustedMap[slot] = 'TIME'
      if (slot === 'am_arrival') amArr = timeVal
      if (slot === 'am_departure') amDep = timeVal
      if (slot === 'pm_arrival') pmArr = timeVal
      if (slot === 'pm_departure') pmDep = timeVal
    } else {
      delete adjustedMap[slot]
      if (slot === 'am_arrival') amArr = null
      if (slot === 'am_departure') amDep = null
      if (slot === 'pm_arrival') pmArr = null
      if (slot === 'pm_departure') pmDep = null
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
      position: 'top-right',
      timeout: 1500,
    })

    emit('saved', res.data?.dtr)
    closeDialog()
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to save override.'
    $q.notify({
      type: 'negative',
      message: msg,
      position: 'top-right',
    })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.dtr-override-popup {
  width: 480px;
  max-width: 95vw;
  background-color: #ffffff;
  color: #1e293b;
  border-radius: 6px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.16);
  overflow: hidden;
  border: 1px solid #cbd5e1;
}

.popup-title-bar {
  background-color: #2e7d32; /* System Design Solid Forest Green */
  color: #ffffff;
  padding: 8px 14px;
}

.popup-body {
  background-color: #ffffff;
  padding: 16px;
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

.day-label {
  font-size: 1.18rem;
  color: #2e7d32; /* Forest Green matching brand typography */
  line-height: 1.2;
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
  font-family: Consolas, Monaco, "Courier New", monospace;
  color: #1e293b;
}

.popup-select-input :deep(.q-field__native),
.popup-select-input :deep(.q-field__input) {
  font-size: 0.95rem;
  font-weight: 500;
  color: #1e293b;
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
