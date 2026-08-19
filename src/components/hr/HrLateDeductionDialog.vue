<template>
  <q-dialog v-model="dialogModel" persistent>
    <q-card style="width: 500px; max-width: 95vw;" class="rounded-borders">
      <q-card-section class="bg-negative text-white row items-center justify-between q-py-sm">
        <div class="row items-center text-subtitle1 text-weight-bold">
          <q-icon name="timer_off" class="q-mr-sm" size="sm" />
          Late Deduction
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

          <q-input
            v-model.number="form.minutes_late"
            type="number"
            outlined
            dense
            label="Minutes Late *"
            placeholder="e.g. 60"
            :rules="[(val) => (val && val > 0) || 'Must be a positive number of minutes']"
          />

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
                v-model="form.selected_month"
                :options="monthOptions"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                outlined
                dense
                label="Month *"
                :rules="[(val) => !!val || 'Month is required']"
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
                :rules="[(val) => !!val || 'Year is required']"
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
            icon="remove_circle_outline"
            label="Deduct"
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
})

const emit = defineEmits(['update:modelValue', 'deducted'])

const dialogModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const submitting = ref(false)

const controlNo = computed(() => {
  if (!props.employee) return ''
  return props.employee.control_no || props.employee.controlNo || ''
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
  minutes_late: null,
  selected_month: qdate.formatDate(initialNow, 'MM'),
  selected_year: qdate.formatDate(initialNow, 'YYYY'),
  particulars: '',
})

const monthNameDisplay = computed(() => {
  const found = monthOptions.find((m) => m.value === form.selected_month)
  return found ? found.label : ''
})

const monthYearDisplay = computed(() => {
  if (!form.selected_month || !form.selected_year) return ''
  return `${monthNameDisplay.value} ${form.selected_year}`
})

const normalizedSelectedDates = computed(() => {
  if (!form.selected_month || !form.selected_year) return []
  return [`${form.selected_year}-${form.selected_month}-01`]
})

const deductionAmount = computed(() => {
  if (!form.minutes_late || form.minutes_late <= 0) return 0
  return form.minutes_late / 480
})

const deductionAmountDisplay = computed(() => {
  return deductionAmount.value > 0 ? deductionAmount.value.toFixed(3) : '0.000'
})

const defaultParticularsPlaceholder = computed(() => {
  const totalMinutes = parseInt(form.minutes_late, 10) || 0
  if (totalMinutes <= 0) {
    return 'Leave blank for default: LATE 0-0-0'
  }
  const minutesPerDay = 8 * 60
  const dayCount = Math.floor(totalMinutes / minutesPerDay)
  const remainingMinutes = totalMinutes % minutesPerDay
  const hourCount = Math.floor(remainingMinutes / 60)
  const minuteCount = remainingMinutes % 60
  return `Leave blank for default: LATE ${dayCount}-${hourCount}-${minuteCount}`
})

function resetForm() {
  const now = new Date()
  form.target_leave = 'VL'
  form.minutes_late = null
  form.selected_month = qdate.formatDate(now, 'MM')
  form.selected_year = qdate.formatDate(now, 'YYYY')
  form.particulars = ''
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      resetForm()
    }
  },
)

async function handleSubmit() {
  if (!controlNo.value) {
    $q.notify({ type: 'warning', message: 'No valid employee selected.', position: 'top' })
    return
  }

  if (!form.selected_month || !form.selected_year) {
    $q.notify({ type: 'warning', message: 'Please select both month and year.', position: 'top' })
    return
  }

  const dates = normalizedSelectedDates.value

  $q.dialog({
    title: 'Confirm Late Deduction',
    message: `<div style="font-size: 0.95rem; line-height: 1.6;">
      <p style="margin-bottom: 8px; font-weight: 500;">Please review the deduction details before proceeding:</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px;">
        <div style="margin-bottom: 6px;"><strong>Minutes Late:</strong> ${form.minutes_late} min</div>
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
      label: 'Confirm Deduction',
      color: 'negative',
      icon: 'remove_circle',
    },
    persistent: true,
  }).onOk(async () => {
    submitting.value = true
    try {
      const payload = {
        target_leave: form.target_leave,
        minutes_late: form.minutes_late,
        selected_dates: dates,
        particulars: form.particulars.trim(),
      }

      const res = await api.post(`/hr/employees/${controlNo.value}/deduct-late-leave`, payload)

      $q.notify({
        type: 'positive',
        message: res.data?.message || 'Late deduction applied successfully!',
        position: 'top',
      })

      dialogModel.value = false
      emit('deducted', res.data?.deduction)
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to apply late deduction.'
      $q.notify({ type: 'negative', message, position: 'top' })
    } finally {
      submitting.value = false
    }
  })
}
</script>
