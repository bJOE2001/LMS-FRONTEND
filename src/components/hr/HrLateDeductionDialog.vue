<template>
  <q-dialog v-model="dialogModel" persistent>
    <q-card style="width: 500px; max-width: 95vw;" class="rounded-borders">
      <q-card-section class="bg-negative text-white row items-center justify-between q-py-sm">
        <div class="row items-center text-subtitle1 text-weight-bold">
          <q-icon :name="isEditMode ? 'edit' : 'timer_off'" class="q-mr-sm" size="sm" />
          {{ isEditMode ? 'Edit Late Deduction' : 'Late Deduction' }}
        </div>
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-form @submit="handleSubmit">
        <q-card-section class="q-gutter-y-md q-pt-md">
          <div class="q-mb-sm">
            <div class="text-weight-bold text-grey-8 q-mb-xs">Target Leave to Deduct</div>
            <q-option-group
              v-model="form.target_leave"
              :options="[
                { label: 'Vacation Leave (VL)', value: 'VL' },
                { label: 'Sick Leave (SL)', value: 'SL' },
              ]"
              color="primary"
              inline
            />
          </div>

          <div>
            <div class="text-weight-bold text-grey-8 q-mb-xs">Duration *</div>
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-4">
                <q-input
                  v-model.number="form.days_late"
                  type="number"
                  outlined
                  dense
                  label="Days"
                  placeholder="0"
                  min="0"
                  :rules="[
                    (val) => val === null || val === undefined || val === '' || val >= 0 || 'Must be >= 0',
                    validateDuration,
                  ]"
                />
              </div>
              <div class="col-12 col-sm-4">
                <q-input
                  v-model.number="form.hours_late"
                  type="number"
                  outlined
                  dense
                  label="Hours"
                  placeholder="0"
                  min="0"
                  :rules="[
                    (val) => val === null || val === undefined || val === '' || val >= 0 || 'Must be >= 0',
                    validateDuration,
                  ]"
                />
              </div>
              <div class="col-12 col-sm-4">
                <q-input
                  v-model.number="form.minutes_late"
                  type="number"
                  outlined
                  dense
                  label="Minutes"
                  placeholder="0"
                  min="0"
                  :rules="[
                    (val) => val === null || val === undefined || val === '' || val >= 0 || 'Must be >= 0',
                    validateDuration,
                  ]"
                />
              </div>
            </div>
          </div>

          <q-input
            v-model="deductionAmountDisplay"
            type="text"
            outlined
            dense
            readonly
            label="Equivalent Leave Credits Deduction"
            bg-color="grey-2"
          >
            <template #append>
              <span class="text-caption text-weight-bold text-negative">CREDITS</span>
            </template>
          </q-input>

          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <q-select
                v-model="form.selected_months"
                multiple
                use-chips
                :options="monthOptions"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                outlined
                dense
                label="Month(s) *"
                :rules="[(val) => (Array.isArray(val) && val.length > 0) || 'Required']"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-select
                v-model="form.selected_year"
                :options="yearOptions"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                outlined
                dense
                label="Year *"
                :rules="[(val) => !!val || 'Required']"
              />
            </div>
          </div>

          <q-input
            v-model="form.particulars"
            outlined
            dense
            label="Particulars"
            :placeholder="defaultParticularsPlaceholder"
            hint="Custom text for the Ledger Particulars column"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup :disable="submitting" />
          <q-btn
            type="submit"
            color="negative"
            :icon="isEditMode ? 'save' : 'remove_circle_outline'"
            :label="isEditMode ? 'Save Changes' : 'Deduct'"
            :loading="submitting"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useQuasar, date as qdate } from 'quasar'
import { api } from 'src/boot/axios'

const $q = useQuasar()

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  employee: {
    type: Object,
    default: null,
  },
  deduction: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'deducted', 'updated'])

const dialogModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const submitting = ref(false)

const controlNo = computed(() => {
  if (!props.employee) return ''
  return props.employee.control_no || props.employee.controlNo || ''
})

const deductionId = computed(() => {
  if (!props.deduction) return null
  return props.deduction.late_deduction_id || props.deduction.lateDeductionId || props.deduction.id || null
})

const isEditMode = computed(() => {
  if (!deductionId.value) return false
  const clean = String(deductionId.value).replace('late-deduction-', '').trim()
  return clean !== '' && !isNaN(Number(clean))
})

const monthOptions = [
  { label: 'January', value: '01' },
  { label: 'February', value: '02' },
  { label: 'March', value: '03' },
  { label: 'April', value: '04' },
  { label: 'May', value: '05' },
  { label: 'June', value: '06' },
  { label: 'July', value: '07' },
  { label: 'August', value: '08' },
  { label: 'September', value: '09' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' },
]

const currentYearNum = new Date().getFullYear()
const yearOptions = computed(() => {
  const years = []
  for (let y = currentYearNum - 5; y <= currentYearNum + 5; y++) {
    years.push({ label: String(y), value: String(y) })
  }
  return years
})

const initialNow = new Date()
const form = reactive({
  target_leave: 'VL',
  days_late: null,
  hours_late: null,
  minutes_late: null,
  selected_months: [],
  selected_year: qdate.formatDate(initialNow, 'YYYY'),
  particulars: '',
})

const totalLateMinutes = computed(() => {
  const days = parseInt(form.days_late, 10) || 0
  const hours = parseInt(form.hours_late, 10) || 0
  const minutes = parseInt(form.minutes_late, 10) || 0
  return Math.max(0, days * 480 + hours * 60 + minutes)
})

function validateDuration() {
  return totalLateMinutes.value > 0 || 'Required'
}

const durationSummaryDisplay = computed(() => {
  const days = parseInt(form.days_late, 10) || 0
  const hours = parseInt(form.hours_late, 10) || 0
  const minutes = parseInt(form.minutes_late, 10) || 0
  const parts = []
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`)
  if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`)
  if (minutes > 0) parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`)
  return parts.length > 0 ? parts.join(', ') : '0 mins'
})

const monthNameDisplay = computed(() => {
  if (!Array.isArray(form.selected_months) || form.selected_months.length === 0) return ''
  const sortedMonths = [...form.selected_months].sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
  const names = sortedMonths
    .map((mVal) => {
      const found = monthOptions.find((m) => m.value === mVal)
      return found ? found.label : ''
    })
    .filter(Boolean)
  return names.join(', ')
})

const monthYearDisplay = computed(() => {
  if (!monthNameDisplay.value || !form.selected_year) return ''
  return `${monthNameDisplay.value} ${form.selected_year}`
})

const normalizedSelectedDates = computed(() => {
  if (!Array.isArray(form.selected_months) || form.selected_months.length === 0 || !form.selected_year) return []
  const sortedMonths = [...form.selected_months].sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
  return sortedMonths.map((mVal) => `${form.selected_year}-${mVal}-01`)
})

const deductionAmount = computed(() => {
  if (totalLateMinutes.value <= 0) return 0
  return totalLateMinutes.value / 480
})

const deductionAmountDisplay = computed(() => {
  return deductionAmount.value > 0 ? deductionAmount.value.toFixed(3) : '0.000'
})

const defaultParticularsPlaceholder = computed(() => {
  const total = totalLateMinutes.value
  if (total <= 0) {
    return 'Leave blank for default: LATE 0-0-0'
  }
  const dayCount = Math.floor(total / 480)
  const remainingMinutes = total % 480
  const hourCount = Math.floor(remainingMinutes / 60)
  const minuteCount = remainingMinutes % 60
  return `Leave blank for default: LATE ${dayCount}-${hourCount}-${minuteCount}`
})

function resetForm() {
  const now = new Date()
  form.target_leave = 'VL'
  form.days_late = null
  form.hours_late = null
  form.minutes_late = null
  form.selected_months = []
  form.selected_year = qdate.formatDate(now, 'YYYY')
  form.particulars = ''
}

function initForm() {
  if (isEditMode.value && props.deduction) {
    const d = props.deduction
    form.target_leave = d.target_leave || (d.leave_type_code === 'SL' || d.balance_key === 'sick' ? 'SL' : 'VL')

    let days = d.days_late !== undefined && d.days_late !== null ? d.days_late : (d.daysLate ?? null)
    let hours = d.hours_late !== undefined && d.hours_late !== null ? d.hours_late : (d.hoursLate ?? null)
    let minutes = d.minutes_late !== undefined && d.minutes_late !== null ? d.minutes_late : (d.minutesLate ?? null)

    if (days === null && hours === null && minutes === null) {
      const totalMins = parseInt(d.minutes_late || d.minutesLate, 10) || Math.round(parseFloat(d.deducted_days || d.amount || 0) * 480)
      if (totalMins > 0) {
        days = Math.floor(totalMins / 480)
        const rem = totalMins % 480
        hours = Math.floor(rem / 60)
        minutes = rem % 60
      }
    }

    form.days_late = days !== null ? parseInt(days, 10) : null
    form.hours_late = hours !== null ? parseInt(hours, 10) : null
    form.minutes_late = minutes !== null ? parseInt(minutes, 10) : null

    const rawDates = d.selected_dates || d.selectedDates || d.inclusive_dates || d.inclusiveDates || []
    let dateList = []
    if (Array.isArray(rawDates)) dateList = rawDates
    else if (typeof rawDates === 'string') {
      try { dateList = JSON.parse(rawDates) } catch { dateList = [rawDates] }
    }
    if (dateList.length > 0) {
      const months = []
      let year = form.selected_year
      dateList.forEach((dt) => {
        const p = String(dt).split('-')
        if (p.length >= 2) {
          year = p[0]
          months.push(p[1])
        }
      })
      form.selected_year = year
      form.selected_months = Array.from(new Set(months)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    } else if (d.start_date || d.inclusive_start_date) {
      const p = String(d.start_date || d.inclusive_start_date).split('-')
      if (p.length >= 2) {
        form.selected_year = p[0]
        form.selected_months = [p[1]]
      }
    } else {
      form.selected_months = []
    }

    const existingParticulars = String(d.particulars || '').trim()
    if (existingParticulars && !/^LATE \d+-\d+-\d+$/i.test(existingParticulars)) {
      form.particulars = existingParticulars
    } else {
      form.particulars = ''
    }
  } else {
    resetForm()
  }
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      initForm()
    }
  },
)

async function handleSubmit() {
  if (!controlNo.value) {
    $q.notify({ type: 'warning', message: 'No valid employee selected.', position: 'top' })
    return
  }

  if (totalLateMinutes.value <= 0) {
    $q.notify({ type: 'warning', message: 'Please specify at least one day, hour, or minute late.', position: 'top' })
    return
  }

  if (!Array.isArray(form.selected_months) || form.selected_months.length === 0 || !form.selected_year) {
    $q.notify({ type: 'warning', message: 'Please select at least one month and a year.', position: 'top' })
    return
  }

  const dates = normalizedSelectedDates.value

  const confirmTitle = isEditMode.value ? 'Confirm Late Deduction Update' : 'Confirm Late Deduction'
  const confirmOkLabel = isEditMode.value ? 'Save Changes' : 'Confirm Deduction'

  $q.dialog({
    title: confirmTitle,
    message: `<div style="font-size: 0.95rem; line-height: 1.6;">
      <p style="margin-bottom: 8px; font-weight: 500;">Please review the deduction details before proceeding:</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px;">
        <div style="margin-bottom: 6px;"><strong>Duration:</strong> ${durationSummaryDisplay.value}</div>
        <div style="margin-bottom: 6px;"><strong>Month/Year of Late:</strong> ${monthYearDisplay.value}</div>
        <div><strong>Credits to Deduct (${form.target_leave}):</strong> <span style="color: #c62828; font-weight: 700;">-${deductionAmountDisplay.value}</span></div>
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
      label: confirmOkLabel,
      color: 'negative',
      icon: isEditMode.value ? 'save' : 'remove_circle',
    },
    persistent: true,
  }).onOk(async () => {
    submitting.value = true
    try {
      const payload = {
        target_leave: form.target_leave,
        days_late: parseInt(form.days_late, 10) || 0,
        hours_late: parseInt(form.hours_late, 10) || 0,
        minutes_late: parseInt(form.minutes_late, 10) || 0,
        selected_dates: dates,
        particulars: form.particulars.trim(),
      }

      if (isEditMode.value) {
        const cleanId = String(deductionId.value).replace('late-deduction-', '').trim()
        const res = await api.post(`/hr/employees/${controlNo.value}/late-deductions/${cleanId}/update`, payload)

        $q.notify({
          type: 'positive',
          message: res.data?.message || 'Late deduction updated successfully!',
          position: 'top',
        })

        dialogModel.value = false
        emit('deducted', res.data?.deduction)
        emit('updated', res.data?.deduction)
      } else {
        const res = await api.post(`/hr/employees/${controlNo.value}/deduct-late-leave`, payload)

        $q.notify({
          type: 'positive',
          message: res.data?.message || 'Late deduction applied successfully!',
          position: 'top',
        })

        dialogModel.value = false
        emit('deducted', res.data?.deduction)
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to process late deduction.'
      $q.notify({ type: 'negative', message, position: 'top' })
    } finally {
      submitting.value = false
    }
  })
}
</script>
