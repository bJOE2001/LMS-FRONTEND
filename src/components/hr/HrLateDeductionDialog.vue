<template>
  <q-dialog v-model="dialogModel" persistent>
    <q-card style="width: 500px; max-width: 95vw" class="rounded-borders">
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
                { label: 'Sick Leave (SL)', value: 'SL' }
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

          <q-input
            v-model="selectedDatesDisplay"
            outlined
            dense
            readonly
            label="Date of Late *"
            placeholder="Click calendar icon to select dates"
            :rules="[() => normalizedSelectedDates.length > 0 || 'Please select at least one date']"
          >
            <template #append>
              <q-icon name="event" class="cursor-pointer text-primary">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date
                    v-model="rawSelectedDates"
                    multiple
                    mask="YYYY-MM-DD"
                    color="primary"
                  >
                    <div class="row items-center justify-between q-pa-xs">
                      <q-btn flat label="Clear" color="negative" dense @click="rawSelectedDates = null" />
                      <q-btn v-close-popup label="Done" color="primary" unelevated dense />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>

          <q-input
            v-model="form.particulars"
            outlined
            dense
            label="Particulars"
            placeholder="Leave blank for default: Late Deduction (XX minutes)"
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
const rawSelectedDates = ref(null)

const controlNo = computed(() => {
  if (!props.employee) return ''
  return props.employee.control_no || props.employee.controlNo || ''
})

const form = reactive({
  target_leave: 'VL',
  minutes_late: null,
  particulars: '',
})

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

const selectedDatesDisplay = computed(() => {
  const dates = normalizedSelectedDates.value
  if (dates.length === 0) return ''
  if (dates.length === 1) return dates[0]
  return `${dates.length} dates selected`
})

const deductionAmount = computed(() => {
  if (!form.minutes_late || form.minutes_late <= 0) return 0
  return form.minutes_late / 480
})

const deductionAmountDisplay = computed(() => {
  return deductionAmount.value > 0 ? deductionAmount.value.toFixed(3) : '0.000'
})

function resetForm() {
  form.target_leave = 'VL'
  form.minutes_late = null
  rawSelectedDates.value = null
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

  if (normalizedSelectedDates.value.length === 0) {
    $q.notify({ type: 'warning', message: 'Please select at least one date.', position: 'top' })
    return
  }

  const dates = normalizedSelectedDates.value

  $q.dialog({
    title: 'Confirm Late Deduction',
    message: `<div style="font-size: 0.95rem; line-height: 1.6;">
      <p style="margin-bottom: 8px; font-weight: 500;">Please review the deduction details before proceeding:</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px;">
        <div style="margin-bottom: 6px;"><strong>Minutes Late:</strong> ${form.minutes_late} min</div>
        <div style="margin-bottom: 6px;"><strong>Date(s) of Late:</strong> ${selectedDatesDisplay.value}</div>
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
