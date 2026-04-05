<template>
  <q-dialog v-model="dialogModel" persistent class="hr-edit-dialog">
    <q-card class="hr-edit-card">
      <q-card-section class="bg-primary text-white">
        <div class="text-h6">Edit Application</div>
      </q-card-section>
      <q-form @submit.prevent="handleSave">
        <q-card-section v-if="formModel && formModel.id">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                :model-value="formModel.employeeName"
                outlined
                dense
                label="Employee"
                readonly
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                :model-value="formModel.leaveTypeLabel"
                outlined
                dense
                label="Leave Type"
                readonly
              />
            </div>
            <template v-if="!formModel.isMonetization">
              <div class="col-12 col-md-6">
                <q-input
                  :model-value="formModel.startDate"
                  type="date"
                  outlined
                  dense
                  label="Start Date"
                  @update:model-value="handleDateFieldUpdate('startDate', $event)"
                />
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  :model-value="formModel.endDate"
                  type="date"
                  outlined
                  dense
                  label="End Date"
                  @update:model-value="handleDateFieldUpdate('endDate', $event)"
                />
              </div>
            </template>
            <div class="col-12 col-md-6">
              <q-input
                :model-value="formModel.totalDays"
                type="number"
                min="1"
                outlined
                dense
                :readonly="!formModel.isMonetization"
                :hint="
                  formModel.isMonetization
                    ? 'Days to monetize'
                    : 'Auto-computed from selected date range'
                "
                label="Days"
                @update:model-value="updateField('totalDays', $event)"
              />
            </div>
            <div
              class="col-12"
              v-if="!formModel.isMonetization && Array.isArray(formModel.selectedDates) && formModel.selectedDates.length"
            >
              <div class="text-caption text-grey-7 q-mb-xs">Selected Dates</div>
              <div class="text-caption">
                {{ formModel.selectedDates.map((d) => formatDate(d)).join(', ') }}
              </div>
            </div>
            <div class="col-12">
              <q-input
                :model-value="formModel.reason"
                type="textarea"
                rows="4"
                outlined
                label="Reason"
                @update:model-value="updateField('reason', $event)"
              />
            </div>
            <div class="col-12">
              <q-input
                :model-value="formModel.remarks"
                type="textarea"
                rows="3"
                outlined
                label="Remarks (optional)"
                @update:model-value="updateField('remarks', $event)"
              />
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="dialogModel = false" />
          <q-btn
            unelevated
            color="primary"
            label="Save Changes"
            type="submit"
            :loading="saveLoading"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  application: {
    type: Object,
    default: null,
  },
  getActualRequestedDayCount: {
    type: Function,
    default: () => null,
  },
  formatDate: {
    type: Function,
    default: () => '',
  },
})

const emit = defineEmits(['update:modelValue', 'saved'])
const $q = useQuasar()
const saveLoading = ref(false)
const formModel = ref(getEmptyEditForm())

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

watch(
  () => [props.modelValue, props.application],
  () => {
    if (!props.modelValue) return
    formModel.value = buildFormFromApplication(props.application)
  },
  { immediate: true, deep: true },
)

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) return
    formModel.value = getEmptyEditForm()
  },
)

function updateField(field, value) {
  formModel.value = {
    ...(formModel.value || {}),
    [field]: value,
  }
}

function handleDateFieldUpdate(field, value) {
  const nextForm = {
    ...(formModel.value || {}),
    [field]: value,
  }

  if (!nextForm.isMonetization) {
    const generatedDates = buildWeekdayDateRange(nextForm.startDate, nextForm.endDate)
    nextForm.selectedDates = Array.isArray(generatedDates) ? generatedDates : []
    nextForm.totalDays = nextForm.selectedDates.length
  }

  formModel.value = nextForm
}

function getEmptyEditForm() {
  return {
    id: '',
    employeeName: '',
    leaveTypeLabel: '',
    leaveTypeId: null,
    isMonetization: false,
    startDate: '',
    endDate: '',
    originalStartDate: '',
    originalEndDate: '',
    totalDays: 0,
    reason: '',
    remarks: '',
    selectedDates: [],
  }
}

function toIsoDate(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const normalized = raw.replace(/\//g, '-')
  const isoMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoMatch) return isoMatch[1]

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeSelectedDates(dates) {
  if (!Array.isArray(dates)) return []
  return [...new Set(dates.map((date) => toIsoDate(date)).filter(Boolean))].sort()
}

function formatIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildWeekdayDateRange(startDate, endDate) {
  if (!startDate || !endDate) return []
  if (endDate < startDate) return []

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return []

  const dates = []
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) {
      dates.push(formatIsoDate(cursor))
    }
  }
  return dates
}

function buildFormFromApplication(application) {
  const form = getEmptyEditForm()
  if (!application || typeof application !== 'object') return form

  const selectedDates = normalizeSelectedDates(application?.selected_dates)
  const startDate = toIsoDate(application?.startDate) || selectedDates[0] || ''
  const endDate = toIsoDate(application?.endDate) || selectedDates[selectedDates.length - 1] || ''
  const preservedDates = selectedDates.length
    ? selectedDates
    : buildWeekdayDateRange(startDate, endDate)
  const parsedDays = props.getActualRequestedDayCount(application) ?? Number(application?.days)

  return {
    id: application?.id ?? '',
    employeeName: application?.employeeName || '',
    leaveTypeLabel: `${application?.leaveType || ''}${application?.is_monetization ? ' (Monetization)' : ''}`,
    leaveTypeId: application?.leave_type_id ?? null,
    isMonetization: Boolean(application?.is_monetization),
    startDate,
    endDate,
    originalStartDate: startDate,
    originalEndDate: endDate,
    totalDays: Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : preservedDates.length,
    reason: application?.reason || '',
    remarks: application?.remarks || '',
    selectedDates: preservedDates,
  }
}

async function updateApplicationDetails(id, payload) {
  try {
    await api.put(`/hr/leave-applications/${id}`, payload)
    return
  } catch (err) {
    const statusCode = err?.response?.status
    if (statusCode !== 404 && statusCode !== 405) {
      throw err
    }
  }

  await api.patch(`/hr/leave-applications/${id}`, payload)
}

async function handleSave() {
  if (!formModel.value.id) return

  if (!String(formModel.value.reason || '').trim()) {
    $q.notify({
      type: 'warning',
      message: 'Please provide a reason.',
      position: 'top',
    })
    return
  }

  if (!formModel.value.isMonetization) {
    if (!formModel.value.startDate || !formModel.value.endDate) {
      $q.notify({
        type: 'warning',
        message: 'Please provide a valid start and end date.',
        position: 'top',
      })
      return
    }

    if (formModel.value.endDate < formModel.value.startDate) {
      $q.notify({
        type: 'warning',
        message: 'End date must be on or after start date.',
        position: 'top',
      })
      return
    }
  }

  let selectedDates = [...formModel.value.selectedDates]
  if (!formModel.value.isMonetization) {
    const dateRangeChanged =
      formModel.value.startDate !== formModel.value.originalStartDate ||
      formModel.value.endDate !== formModel.value.originalEndDate
    if (dateRangeChanged || selectedDates.length === 0) {
      selectedDates = buildWeekdayDateRange(formModel.value.startDate, formModel.value.endDate)
    }

    if (!selectedDates.length) {
      $q.notify({
        type: 'warning',
        message: 'Selected date range must include at least one weekday.',
        position: 'top',
      })
      return
    }
  }

  const totalDays = formModel.value.isMonetization
    ? Number(formModel.value.totalDays)
    : selectedDates.length

  if (!Number.isFinite(totalDays) || totalDays < 1) {
    $q.notify({
      type: 'warning',
      message: 'Days must be at least 1.',
      position: 'top',
    })
    return
  }

  const payload = {
    total_days: totalDays,
    reason: String(formModel.value.reason).trim(),
    remarks: String(formModel.value.remarks || '').trim() || null,
  }

  if (formModel.value.leaveTypeId) {
    payload.leave_type_id = formModel.value.leaveTypeId
  }

  if (formModel.value.isMonetization) {
    payload.is_monetization = true
  } else {
    payload.start_date = formModel.value.startDate
    payload.end_date = formModel.value.endDate
    payload.selected_dates = selectedDates
  }

  saveLoading.value = true
  try {
    await updateApplicationDetails(formModel.value.id, payload)
    $q.notify({
      type: 'positive',
      message: 'Application details updated.',
      position: 'top',
    })
    dialogModel.value = false
    emit('saved', {
      applicationId: formModel.value.id,
      application: props.application,
    })
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to update this application right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    saveLoading.value = false
  }
}
</script>
