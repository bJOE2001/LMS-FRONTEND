<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    @update:model-value="(val) => $emit('update:modelValue', val)"
  >
    <q-card class="dtr-delete-popup">
      <!-- Title Bar: Warm Amber when viewing pending request, Crimson when creating request -->
      <div
        class="popup-title-bar row items-center justify-between no-wrap"
        :class="
          matchingPendingDeleteRequest
            ? 'popup-title-bar--pending'
            : 'popup-title-bar--delete'
        "
      >
        <div class="row items-center q-gutter-x-xs no-wrap ellipsis min-width-0">
          <q-icon
            :name="matchingPendingDeleteRequest ? 'hourglass_top' : 'delete_outline'"
            size="18px"
            class="text-white q-mr-xs flex-shrink-0"
          />
          <span class="text-subtitle2 text-weight-bolder text-uppercase letter-spacing-1 text-white">
            {{ formattedDate }}
          </span>
          <span v-if="dayOfWeek" class="text-caption text-weight-medium text-white" style="opacity: 0.9">
            ({{ dayOfWeek }})
          </span>
          <span class="text-white q-mx-xs" style="opacity: 0.7">&bull;</span>
          <span class="text-caption text-weight-bold text-white ellipsis" style="opacity: 0.95">
            {{
              matchingPendingDeleteRequest
                ? `Delete Request Pending — ${activeScopeHeaderLabel}`
                : `Request Deletion — ${activeScopeHeaderLabel}`
            }}
          </span>
        </div>

        <q-btn
          flat
          round
          dense
          icon="close"
          color="white"
          aria-label="Close dialog"
          :disable="deleteSubmitting || cancellingDelete"
          @click="closeDialog"
        />
      </div>

      <q-card-section class="popup-body bg-white">
        <!-- Scope Selector -->
        <div class="apply-scope-row q-mb-md">
          <div class="section-title text-caption text-weight-bold text-grey-8 q-mb-xs">
            Period
          </div>
          <q-option-group
            v-model="applyScope"
            type="radio"
            inline
            dense
            :color="matchingPendingDeleteRequest ? 'amber-9' : 'red-8'"
            :options="applyScopeOptions"
            class="apply-scope-radios"
          />
        </div>

        <!-- STATE A: Pending Request Exists in Scope -->
        <div v-if="matchingPendingDeleteRequest" class="pending-status-card">
          <div class="row items-center no-wrap q-gutter-x-xs q-mb-sm">
            <q-icon name="hourglass_top" size="18px" class="text-amber-9" />
            <span class="text-body2 text-weight-bold text-amber-10">
              Pending HR Approval
            </span>
          </div>

          <div class="pending-detail-row q-mb-xs">
            <span class="text-caption text-weight-bold text-grey-8">Target Slot(s): </span>
            <span class="text-caption text-weight-bold text-dark">
              {{ formatSlotListLabel(matchingPendingDeleteRequest.slots) }}
            </span>
          </div>

          <div class="pending-detail-row q-mb-sm">
            <span class="text-caption text-weight-bold text-grey-8">Reason Submitted: </span>
            <span class="text-caption text-dark">
              "{{ matchingPendingDeleteRequest.reason }}"
            </span>
          </div>

          <div class="text-caption text-grey-7">
            HR has not acted on this request yet. You may cancel it to withdraw the deletion request.
          </div>
        </div>

        <!-- STATE B: New Delete Request Form -->
        <div v-else>
          <div class="q-mb-md">
            <div class="section-title text-caption text-weight-bold text-grey-8 q-mb-xs">
              Entries to be Deleted
            </div>
            <div v-if="hasDeletableDataInScope" class="delete-entries-wrap">
              <table class="delete-entries-table">
                <thead>
                  <tr>
                    <th>Time Slot</th>
                    <th>Recorded Entry</th>
                    <th class="text-right">Source</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in deletableSlotSummaries" :key="item.key">
                    <td class="text-weight-medium text-dark">{{ item.label }}</td>
                    <td>
                      <code class="text-caption text-weight-bold text-dark">
                        {{ item.displayValue }}
                      </code>
                    </td>
                    <td class="text-right">
                      <q-badge
                        :color="item.source === 'biometric' ? 'amber-2' : 'green-1'"
                        :text-color="item.source === 'biometric' ? 'amber-10' : 'green-10'"
                        class="text-weight-bold"
                      >
                        {{ item.sourceLabel }}
                      </q-badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="empty-entries-note text-caption text-grey-6">
              No recorded punch or override in this period.
            </div>
          </div>

          <div class="q-mb-xs">
            <span class="section-title text-caption text-weight-bold text-grey-8">
              Reason for Deletion <span class="text-negative text-weight-bolder">*</span>
            </span>
          </div>
          <q-input
            ref="deleteReasonRef"
            v-model="deleteReason"
            type="textarea"
            rows="2"
            dense
            outlined
            autogrow
            autofocus
            :rules="[
              (val) =>
                (val && val.trim().length >= 3) ||
                'Please provide a reason for deletion (min 3 characters)',
            ]"
            lazy-rules="ondemand"
            hide-bottom-space
            placeholder="Enter reason for requesting deletion (e.g. Wrong biometric tap, incorrect override)..."
            class="bg-white"
          />
          <div class="delete-helper-note row items-center no-wrap q-gutter-x-xs q-mt-sm">
            <q-icon name="info_outline" size="14px" class="text-grey-7" />
            <span>Records remain on the DTR until reviewed and approved by HR.</span>
          </div>
        </div>
      </q-card-section>

      <!-- Action Footer -->
      <div class="popup-footer row items-center justify-end q-gutter-x-sm bg-grey-1">
        <template v-if="matchingPendingDeleteRequest">
          <q-btn
            flat
            dense
            no-caps
            label="Close"
            color="grey-7"
            class="footer-btn q-px-md text-weight-medium"
            :disable="cancellingDelete"
            @click="closeDialog"
          />
          <q-btn
            outline
            dense
            no-caps
            icon="block"
            label="Cancel Request"
            color="negative"
            class="footer-btn q-px-md text-weight-bold"
            :loading="cancellingDelete"
            @click="cancelPendingDeleteRequest"
          />
        </template>
        <template v-else>
          <q-btn
            flat
            dense
            no-caps
            label="Cancel"
            color="grey-7"
            class="footer-btn q-px-md text-weight-medium"
            :disable="deleteSubmitting"
            @click="closeDialog"
          />
          <q-btn
            unelevated
            dense
            no-caps
            label="Submit Delete Request"
            color="negative"
            class="footer-btn q-px-md text-weight-bold"
            :disable="!hasDeletableDataInScope"
            :loading="deleteSubmitting"
            @click="submitDeleteRequest"
          />
        </template>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useAttendanceStore } from 'stores/attendance-store'

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
  pendingDeleteRequests: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:modelValue', 'saved'])
const $q = useQuasar()
const attendanceStore = useAttendanceStore()

const activeSlot = ref('am_arrival')
const applyScope = ref('single')
const deleteReason = ref('')
const deleteReasonRef = ref(null)
const deleteSubmitting = ref(false)
const cancellingDelete = ref(false)

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
  return slotTabs.find((s) => s.key === activeSlot.value) || slotTabs[0]
})

const activeScopeHeaderLabel = computed(() => {
  if (applyScope.value === 'whole') return 'Whole Day (All Slots)'
  if (applyScope.value === 'am') return 'Whole Morning (AM In & Out)'
  if (applyScope.value === 'pm') return 'Whole Afternoon (PM In & Out)'
  return activeSlotMeta.value.label
})

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

function getSlotShortLabel(slotKey) {
  const found = slotTabs.find((s) => s.key === slotKey)
  return found ? found.shortLabel : slotKey
}

function formatSlotListLabel(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return ''
  return slots.map(getSlotShortLabel).join(', ')
}

const targetSlots = computed(() => getSlotsForScope(applyScope.value, activeSlot.value))

const deletableSlotSummaries = computed(() => {
  const list = []
  const dtr = props.dtr
  if (!dtr) return list
  const adjusted = dtr.adjusted_slots
  targetSlots.value.forEach((s) => {
    const rawTime = formatTo12Hour(dtr?.[s])
    const rmk = getSlotNonTimeRemark(adjusted, s)
    if (!rawTime && !rmk) return
    const isBio = isBiometricSlot(dtr, s)
    list.push({
      key: s,
      label: getSlotShortLabel(s),
      displayValue: rmk || rawTime,
      source: isBio ? 'biometric' : 'override',
      sourceLabel: isBio ? 'Biometric' : 'Manual Override',
    })
  })
  return list
})

const hasDeletableDataInScope = computed(() => deletableSlotSummaries.value.length > 0)

const matchingPendingDeleteRequest = computed(() => {
  const currentSet = new Set(targetSlots.value)
  return (
    props.pendingDeleteRequests.find((req) => {
      if (String(req.record_date || '').slice(0, 10) !== String(props.date || '').slice(0, 10)) {
        return false
      }
      if (String(req.status || 'pending').toLowerCase() !== 'pending') return false
      const reqSlots = Array.isArray(req.slots) ? req.slots : []
      return reqSlots.some((s) => currentSet.has(s))
    }) || null
  )
})

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

watch(
  () => [props.modelValue, props.dtr, props.date, props.initialSlot],
  ([isOpen]) => {
    if (!isOpen) return

    if (
      props.initialSlot &&
      ['am_arrival', 'am_departure', 'pm_arrival', 'pm_departure'].includes(props.initialSlot)
    ) {
      activeSlot.value = props.initialSlot
    } else {
      activeSlot.value = 'am_arrival'
    }

    applyScope.value = detectInitialScope(activeSlot.value, props.dtr)
    deleteReason.value = ''
  },
  { immediate: true },
)

function closeDialog() {
  emit('update:modelValue', false)
}

async function submitDeleteRequest() {
  if (!props.controlNo || !props.date) return
  if (!deleteReason.value || deleteReason.value.trim().length < 3) {
    deleteReasonRef.value?.validate?.()
    $q.notify({
      type: 'warning',
      message: 'Please provide a reason for deletion (min 3 characters).',
      position: 'top',
    })
    return
  }

  deleteSubmitting.value = true
  try {
    await attendanceStore.submitDtrDeleteRequest({
      employee_control_no: props.controlNo,
      date: props.date,
      period: applyScope.value,
      slots: deletableSlotSummaries.value.map((item) => item.key),
      reason: deleteReason.value.trim(),
    })

    $q.notify({
      type: 'positive',
      message: 'Delete request submitted for HR approval.',
      position: 'top',
      timeout: 1800,
    })
    emit('saved')
    closeDialog()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to submit delete request.',
      position: 'top',
    })
  } finally {
    deleteSubmitting.value = false
  }
}

async function cancelPendingDeleteRequest() {
  if (!matchingPendingDeleteRequest.value?.id) return
  cancellingDelete.value = true
  try {
    await attendanceStore.cancelDtrDeleteRequest(matchingPendingDeleteRequest.value.id)
    $q.notify({
      type: 'info',
      message: 'Pending delete request cancelled.',
      position: 'top',
      timeout: 1500,
    })
    emit('saved')
    closeDialog()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to cancel delete request.',
      position: 'top',
    })
  } finally {
    cancellingDelete.value = false
  }
}
</script>

<style scoped>
.dtr-delete-popup {
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
  padding: 10px 16px;
  border-radius: 6px 6px 0 0;
}

.popup-title-bar--delete {
  background-color: #b91c1c;
}

.popup-title-bar--pending {
  background-color: #b45309;
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

.section-title {
  color: #334155;
  font-size: 0.88rem;
  line-height: 1.2;
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

.pending-status-card {
  background-color: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 6px;
  padding: 12px 14px;
}

.delete-entries-wrap {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  background-color: #ffffff;
}

.delete-entries-table {
  width: 100%;
  border-collapse: collapse;
}

.delete-entries-table th {
  font-size: 0.74rem;
  font-weight: 600;
  color: #64748b;
  text-align: left;
  padding: 7px 12px;
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.delete-entries-table th.text-right {
  text-align: right;
}

.delete-entries-table td {
  padding: 8px 12px;
  font-size: 0.84rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.delete-entries-table tbody tr:last-child td {
  border-bottom: none;
}

.empty-entries-note {
  padding: 10px 12px;
  background-color: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
}

.delete-helper-note {
  font-size: 0.76rem;
  color: #64748b;
}

.footer-btn {
  height: 34px;
  border-radius: 4px;
  font-size: 0.88rem;
}

.flex-shrink-0 {
  flex-shrink: 0;
}

.min-width-0 {
  min-width: 0;
}

.letter-spacing-1 {
  letter-spacing: 0.5px;
}
</style>
