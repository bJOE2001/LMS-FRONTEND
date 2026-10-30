<template>
  <q-dialog v-model="dialogModel" persistent>
    <q-card style="width: 540px; max-width: 95vw" class="rounded-borders">
      <q-card-section class="bg-primary text-white row items-center justify-between q-py-sm">
        <div class="row items-center text-subtitle1 text-weight-bold">
          <q-icon :name="isEditMode ? 'edit' : 'settings_backup_restore'" class="q-mr-sm" size="sm" />
          {{ isEditMode ? 'Edit Restored Leave Entry' : 'Restore/Cancel/Recall Leave' }}
        </div>
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-form @submit="handleSubmit">
        <q-card-section class="q-gutter-y-md q-pt-md">
          <!-- Target Leave Type Selection -->
          <q-select
            v-model="form.target_leave_type_id"
            :options="leaveTypeOptions"
            option-value="id"
            option-label="name"
            emit-value
            map-options
            outlined
            dense
            label="Target Leave Type *"
            hint="Select the leave type balance receiving the restored credits"
            :rules="[(val) => !!val || 'Target leave type is required']"
          />

          <!-- Particulars (Manual Input) -->
          <q-input
            v-model="form.particulars"
            outlined
            dense
            label="Particulars *"
            placeholder="e.g. Magna Carta for Women"
            hint="This text will appear in the Ledger Particulars column"
            :rules="[(val) => (!!val && val.trim() !== '') || 'Particulars text is required']"
          />

          <!-- Single Field for Select Dates -->
          <q-input
            v-model="selectedDatesDisplay"
            outlined
            dense
            readonly
            label="Select Restored Dates *"
            placeholder="Click calendar icon to select dates"
            hint="Click calendar icon to select a single date, date range, or multiple dates"
            :rules="[
              () =>
                normalizedSelectedDates.length > 0 || 'Please select at least one restoration date',
            ]"
          >
            <template #append>
              <q-icon name="event" class="cursor-pointer text-primary">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date
                    v-model="rawSelectedDates"
                    multiple
                    mask="YYYY-MM-DD"
                    color="primary"
                    @update:model-value="onDateSelectionChange"
                  >
                    <div class="row items-center justify-between q-pa-xs">
                      <q-btn flat label="Clear" color="negative" dense @click="clearDates" />
                      <q-btn v-close-popup label="Done" color="primary" unelevated dense />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>

          <!-- Restored Days -->
          <q-input
            v-model="form.restored_days"
            type="text"
            outlined
            dense
            label="Restored Days (Credits) *"
            placeholder="e.g. 1.000"
            hint="Exact number of days to credit back (auto-calculated from selected dates, editable)"
            @blur="formatRestoredDaysOnBlur"
            :rules="[
              (val) =>
                (val !== null && val !== undefined && val !== '' && parseFloat(val) > 0) ||
                'Restored days must be greater than 0',
            ]"
          >
            <template #append>
              <span class="text-caption text-weight-bold text-primary">DAYS</span>
            </template>
          </q-input>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup :disable="submitting" />
          <q-btn
            type="submit"
            color="primary"
            :icon="isEditMode ? 'save' : 'settings_backup_restore'"
            :label="isEditMode ? 'Save Changes' : 'Submit'"
            :loading="submitting"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useQuasar, date as qdate } from 'quasar'
import { api } from 'src/boot/axios'
import { useEmployeeStore } from 'src/stores/employee-store'

const $q = useQuasar()
const employeeStore = useEmployeeStore()

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  employee: {
    type: Object,
    default: null,
  },
  restoration: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'restored', 'updated'])

const dialogModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const submitting = ref(false)
const availableLeaveTypes = ref([])
const rawSelectedDates = ref(null)

const controlNo = computed(() => {
  if (!props.employee) return ''
  return props.employee.control_no || props.employee.controlNo || ''
})

const restorationId = computed(() => {
  if (!props.restoration) return null
  return (
    props.restoration.restoration_id ||
    props.restoration.restorationId ||
    props.restoration.id ||
    null
  )
})

const isEditMode = computed(() => {
  if (!restorationId.value) return false
  const clean = String(restorationId.value).replace('restoration-', '').trim()
  return !Number.isNaN(parseInt(clean, 10)) && parseInt(clean, 10) > 0
})

const DEFAULT_LEAVE_TYPES = [
  { id: 2, name: 'Sick Leave' },
  { id: 1, name: 'Vacation Leave' },
  { id: 3, name: 'Mandatory / Forced Leave' },
  { id: 4, name: 'Special Privilege Leave' },
  { id: 5, name: 'Wellness Leave' },
  { id: 6, name: 'Solo Parent Leave' },
  { id: 7, name: 'Special Emergency (Calamity) Leave' },
  { id: 8, name: 'CTO Leave' },
  { id: 9, name: 'Maternity Leave' },
  { id: 10, name: 'Paternity Leave' },
  { id: 11, name: 'Adoption Leave' },
  { id: 12, name: '10-Day VAWC Leave' },
  { id: 13, name: 'Rehabilitation Leave' },
  { id: 14, name: 'Study Leave' },
  { id: 15, name: 'Special Leave Benefits for Women' },
  { id: 16, name: 'Terminal Leave' },
  { id: 17, name: 'Monetization Leave' },
]

const leaveTypeOptions = computed(() => {
  if (availableLeaveTypes.value.length) {
    return availableLeaveTypes.value
  }
  return DEFAULT_LEAVE_TYPES
})

const form = reactive({
  target_leave_type_id: 2, // Default Sick Leave
  particulars: '',
  restored_days: null,
})

// Helper to expand dates between from and to
function expandDateRange(fromStr, toStr) {
  const dates = []
  let curr = new Date(fromStr)
  const end = new Date(toStr)
  while (curr <= end) {
    dates.push(qdate.formatDate(curr, 'YYYY-MM-DD'))
    curr = qdate.addToDate(curr, { days: 1 })
  }
  return dates
}

// Compute normalized array of YYYY-MM-DD date strings
const normalizedSelectedDates = computed(() => {
  const val = rawSelectedDates.value
  if (!val) return []

  const dateSet = new Set()

  const processItem = (item) => {
    if (!item) return
    if (typeof item === 'string') {
      dateSet.add(item)
    } else if (typeof item === 'object' && item.from && item.to) {
      expandDateRange(item.from, item.to).forEach((d) => dateSet.add(d))
    }
  }

  if (Array.isArray(val)) {
    val.forEach(processItem)
  } else {
    processItem(val)
  }

  const result = Array.from(dateSet)
  result.sort()
  return result
})

function parseLedgerDateParts(value) {
  if (!value) return null
  const str = String(value).trim()
  if (!str) return null
  const parsed = new Date(str)
  if (Number.isNaN(parsed.getTime())) return null
  return {
    date: parsed,
    year: parsed.getFullYear(),
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
  }
}

function formatLedgerInclusiveDatesLabel(datesList) {
  if (!Array.isArray(datesList) || datesList.length === 0) return ''

  const partsList = datesList.map((d) => parseLedgerDateParts(d)).filter(Boolean)
  if (partsList.length === 0) return ''

  const byIsoDate = new Map()
  for (const parts of partsList) {
    const iso = `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
    if (!byIsoDate.has(iso)) {
      byIsoDate.set(iso, parts)
    }
  }

  const normalizedList = [...byIsoDate.entries()]
    .sort(([leftIso], [rightIso]) => (leftIso < rightIso ? -1 : leftIso > rightIso ? 1 : 0))
    .map(([, parts]) => parts)

  const groups = new Map()
  for (const parts of normalizedList) {
    const groupKey = `${parts.year}-${String(parts.month).padStart(2, '0')}`
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        monthLabel: parts.date.toLocaleDateString('en-US', { month: 'short' }),
        year: parts.year,
        days: [],
      })
    }
    groups.get(groupKey).days.push(parts.day)
  }

  return [...groups.values()]
    .map((group) => {
      const uniqueDays = [...new Set(group.days)].sort((left, right) => left - right)
      if (uniqueDays.length === 0) return ''

      const dayRanges = []
      let rangeStart = uniqueDays[0]
      let rangeEnd = uniqueDays[0]

      for (let index = 1; index < uniqueDays.length; index += 1) {
        const currentDay = uniqueDays[index]
        if (currentDay === rangeEnd + 1) {
          rangeEnd = currentDay
          continue
        }
        dayRanges.push([rangeStart, rangeEnd])
        rangeStart = currentDay
        rangeEnd = currentDay
      }
      dayRanges.push([rangeStart, rangeEnd])

      const rangeLabels = dayRanges.map(([startDay, endDay]) => {
        let dayLabel = String(startDay)
        if (endDay > startDay) {
          dayLabel = endDay === startDay + 1 ? `${startDay}, ${endDay}` : `${startDay}-${endDay}`
        }
        return `${group.monthLabel} ${dayLabel}`
      })

      const hasSingleDayOnly = dayRanges.length === 1 && dayRanges[0][0] === dayRanges[0][1]
      if (hasSingleDayOnly) {
        return `${group.monthLabel} ${dayRanges[0][0]}, ${group.year}`
      }

      return `${rangeLabels.join(', ')} ${group.year}`
    })
    .filter(Boolean)
    .join(', ')
}

// Display text for single dates field
const selectedDatesDisplay = computed(() => {
  const dates = normalizedSelectedDates.value
  if (dates.length === 0) return ''
  const formattedLabel = formatLedgerInclusiveDatesLabel(dates)
  return `${formattedLabel} (${dates.length} ${dates.length === 1 ? 'day' : 'days'})`
})

function onDateSelectionChange() {
  const count = normalizedSelectedDates.value.length
  if (count > 0) {
    form.restored_days = count.toFixed(3)
  }
}

function formatRestoredDaysOnBlur() {
  if (form.restored_days !== null && form.restored_days !== undefined && form.restored_days !== '') {
    const val = parseFloat(form.restored_days)
    if (!Number.isNaN(val) && val > 0) {
      form.restored_days = val.toFixed(3)
    }
  }
}

function clearDates() {
  rawSelectedDates.value = null
  form.restored_days = null
}

async function fetchAvailableLeaveTypes(force = false) {
  if (!controlNo.value) return
  try {
    const data = await employeeStore.fetchAvailableLeaveTypes(controlNo.value, force)
    const types = data?.leave_types || data?.types || data || []
    if (Array.isArray(types) && types.length) {
      availableLeaveTypes.value = types.map((t) => ({
        id: t.id || t.leave_type_id,
        name: t.name || t.leave_type_name || t.label || 'Unknown Leave Type',
      }))
    }
  } catch (err) {
    console.error('Failed to fetch available leave types:', err)
  }
}

function resetForm() {
  form.target_leave_type_id = 2
  form.particulars = ''
  rawSelectedDates.value = null
  form.restored_days = null
}

function populateForm() {
  if (isEditMode.value && props.restoration) {
    const r = props.restoration
    form.target_leave_type_id = r.target_leave_type_id || r.targetLeaveTypeId || 2
    form.particulars = r.particulars || ''

    if (Array.isArray(r.selected_dates) && r.selected_dates.length) {
      rawSelectedDates.value = r.selected_dates.length === 1 ? r.selected_dates[0] : [...r.selected_dates]
    } else if (Array.isArray(r.inclusive_dates) && r.inclusive_dates.length) {
      rawSelectedDates.value = r.inclusive_dates.length === 1 ? r.inclusive_dates[0] : [...r.inclusive_dates]
    } else if (r.inclusive_start_date || r.start_date) {
      const s = r.inclusive_start_date || r.start_date
      const e = r.inclusive_end_date || r.end_date || s
      if (s === e) {
        rawSelectedDates.value = s
      } else {
        rawSelectedDates.value = { from: s, to: e }
      }
    } else {
      rawSelectedDates.value = null
    }

    const parsePositiveNumber = (val) => {
      if (val === null || val === undefined || val === '') return null
      const clean = String(val).replace('+', '').trim()
      const n = parseFloat(clean)
      return !Number.isNaN(n) && n > 0 ? n : null
    }

    const days =
      parsePositiveNumber(r.restored_days) ??
      parsePositiveNumber(r.amount) ??
      parsePositiveNumber(r.vacationEarned) ??
      parsePositiveNumber(r.sickEarned) ??
      parsePositiveNumber(r.otherEarned) ??
      (normalizedSelectedDates.value.length > 0 ? normalizedSelectedDates.value.length : null)

    form.restored_days = days !== null ? Number(days).toFixed(3) : null
  } else {
    resetForm()
  }
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      populateForm()
      if (controlNo.value) {
        fetchAvailableLeaveTypes()
      }
    }
  },
)

watch(
  () => props.restoration,
  () => {
    if (props.modelValue) {
      populateForm()
    }
  },
)

onMounted(() => {
  if (props.modelValue && controlNo.value) {
    populateForm()
    fetchAvailableLeaveTypes()
  }
})

async function handleSubmit() {
  if (!controlNo.value) {
    $q.notify({ type: 'warning', message: 'No valid employee selected.', position: 'top' })
    return
  }

  if (normalizedSelectedDates.value.length === 0) {
    $q.notify({
      type: 'warning',
      message: 'Please select at least one restoration date.',
      position: 'top',
    })
    return
  }

  const selectedTypeObj = leaveTypeOptions.value.find((t) => t.id === form.target_leave_type_id)
  const targetTypeName = selectedTypeObj ? selectedTypeObj.name : 'Selected Leave Type'
  const dates = normalizedSelectedDates.value
  const formattedDatesStr = formatLedgerInclusiveDatesLabel(dates)

  const dialogTitle = isEditMode.value
    ? 'Confirm Restoration Update'
    : 'Confirm Leave Credit Restoration'
  const actionButtonLabel = isEditMode.value ? 'Save Changes' : 'Confirm'
  const actionButtonIcon = isEditMode.value ? 'save' : 'check_circle'

  $q.dialog({
    title: dialogTitle,
    message: `<div style="font-size: 0.95rem; line-height: 1.6;">
      <p style="margin-bottom: 8px; font-weight: 500;">Please review the restoration details before proceeding:</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px;">
        <div style="margin-bottom: 6px;"><strong>Target Leave Type:</strong> ${targetTypeName}</div>
        <div style="margin-bottom: 6px;"><strong>Particulars:</strong> ${form.particulars.trim()}</div>
        <div style="margin-bottom: 6px;"><strong>Restored Dates:</strong> ${formattedDatesStr}</div>
        <div><strong>Restored Days:</strong> <span style="color: #1b5e20; font-weight: 700;">${Number(form.restored_days || 0).toFixed(3)}</span></div>
      </div>
    </div>`,
    html: true,
    cancel: {
      flat: true,
      label: 'Go Back',
      color: 'grey-8',
    },
    ok: {
      unelevated: true,
      label: actionButtonLabel,
      color: 'primary',
      icon: actionButtonIcon,
    },
    persistent: true,
  }).onOk(async () => {
    submitting.value = true
    try {
      const payload = {
        target_leave_type_id: form.target_leave_type_id,
        particulars: form.particulars.trim(),
        selected_dates: dates,
        start_date: dates[0],
        end_date: dates[dates.length - 1],
        restored_days: parseFloat(form.restored_days),
      }

      let res
      if (isEditMode.value) {
        const cleanId = String(restorationId.value).replace('restoration-', '').trim()
        res = await api.post(`/hr/employees/${controlNo.value}/restore-leave-credits/${cleanId}/update`, payload)
        employeeStore.invalidateEmployee(controlNo.value)
        $q.notify({
          type: 'positive',
          message: res.data?.message || 'Leave credit restoration updated successfully!',
          position: 'top',
        })
        dialogModel.value = false
        emit('updated', res.data?.restoration)
        emit('restored', res.data?.restoration)
      } else {
        res = await api.post(`/hr/employees/${controlNo.value}/restore-leave-credits`, payload)
        employeeStore.invalidateEmployee(controlNo.value)
        $q.notify({
          type: 'positive',
          message: res.data?.message || 'Leave credits restored successfully!',
          position: 'top',
        })
        dialogModel.value = false
        emit('restored', res.data?.restoration)
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (isEditMode.value ? 'Failed to update leave restoration.' : 'Failed to restore leave credits.')
      $q.notify({ type: 'negative', message, position: 'top' })
    } finally {
      submitting.value = false
    }
  })
}
</script>
