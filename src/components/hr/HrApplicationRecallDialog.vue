<template>
  <q-dialog v-model="dialogModel" persistent class="hr-recall-dialog">
    <q-card
      class="hr-action-dialog-card hr-action-dialog-card--reject hr-action-dialog-card--recall"
      style="min-width: 360px"
    >
      <q-card-section>
        <div class="text-h6">Recall Application</div>
      </q-card-section>
      <q-card-section class="q-pt-none hr-action-dialog-card__content--recall">
        <div class="hr-recall-layout">
          <div class="text-subtitle2 q-mb-sm">Recall Dates *</div>
          <div class="recall-date-grid">
            <div class="recall-date-grid__body">
              <div
                v-for="row in recallDateSelectionRows"
                :key="row.value"
                class="recall-date-grid__row"
              >
                <div class="recall-date-grid__cell recall-date-grid__cell--select">
                  <q-checkbox
                    v-model="recallSelectedDatesModel"
                    :val="row.value"
                    dense
                    color="warning"
                    size="sm"
                  />
                </div>
                <div class="recall-date-grid__cell recall-date-grid__cell--date">
                  {{ row.dateLabel }}
                </div>
                <div class="recall-date-grid__cell recall-date-grid__cell--meta">
                  {{ row.coverageLabel }}
                </div>
                <div class="recall-date-grid__cell recall-date-grid__cell--meta">
                  {{ row.payLabel }}
                </div>
              </div>
              <div v-if="!recallDateSelectionRows.length" class="recall-date-grid__empty">
                No recall dates available.
              </div>
            </div>
          </div>
          <div class="text-caption text-grey-7 q-mt-sm">
            Select the leave dates HR is recalling. Only dates from this application can be
            selected.
          </div>
          <q-input
            v-model="recallReasonModel"
            type="textarea"
            rows="2"
            label="Reason for recall *"
            outlined
            class="hr-recall-reason q-mt-md"
          />
        </div>
      </q-card-section>
      <q-card-actions class="hr-recall-actions">
        <div class="hr-recall-total">
          <span class="hr-recall-total__label">Total Credits Restored:</span>
          <span class="hr-recall-total__value">{{ totalCreditsDisplay }}</span>
        </div>
        <div class="hr-recall-actions__buttons">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            unelevated
            color="warning"
            label="Recall"
            :loading="submitLoading"
            @click="handleConfirm"
          />
        </div>
      </q-card-actions>
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
  getRecallDateOptions: {
    type: Function,
    default: () => [],
  },
  getSelectedDatePayStatusRows: {
    type: Function,
    default: () => [],
  },
  getSelectedDateCoverageWeights: {
    type: Function,
    default: () => ({}),
  },
  formatRecallDateLabel: {
    type: Function,
    default: (value) => String(value || ''),
  },
  toIsoDate: {
    type: Function,
    default: (value) => String(value || ''),
  },
  getApplicationId: {
    type: Function,
    default: (application) => application?.id ?? '',
  },
})

const emit = defineEmits(['update:modelValue', 'recalled'])
const $q = useQuasar()
const recallSelectedDatesModel = ref([])
const recallReasonModel = ref('')
const submitLoading = ref(false)

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) {
      recallSelectedDatesModel.value = []
      recallReasonModel.value = ''
      return
    }

    recallSelectedDatesModel.value = []
    recallReasonModel.value = ''
  },
)

const recallDateSelectionRows = computed(() => {
  const application = props.application
  if (!application || typeof application !== 'object') return []

  const options = [
    ...new Set(
      (Array.isArray(props.getRecallDateOptions(application)) ? props.getRecallDateOptions(application) : [])
        .map((value) => normalizeIsoDate(value))
        .filter(Boolean),
    ),
  ].sort()
  if (!options.length) return []

  const payStatusByDate = props.getSelectedDatePayStatusRows(application).reduce((acc, row) => {
    const normalizedDate = normalizeIsoDate(row?.dateKey)
    if (!normalizedDate) return acc
    acc[normalizedDate] = String(row?.payStatus || '').toUpperCase() === 'WOP' ? 'WOP' : 'WP'
    return acc
  }, {})

  const coverageWeights = props.getSelectedDateCoverageWeights(application)
  return options.map((rawDate) => {
    const normalizedDate = normalizeIsoDate(rawDate) || rawDate
    const coverageWeight = Number(coverageWeights[normalizedDate] ?? 1)
    const payStatusCode = payStatusByDate[normalizedDate] || 'WP'

    return {
      dateLabel: props.formatRecallDateLabel(normalizedDate),
      coverageLabel: coverageWeight === 0.5 ? 'Half Day' : 'Whole Day',
      payLabel: payStatusCode === 'WOP' ? 'Without Pay' : 'With Pay',
      coverageWeight,
      payStatusCode,
      value: normalizedDate,
    }
  })
})

watch(
  recallDateSelectionRows,
  (rows) => {
    const allowedDateSet = new Set(rows.map((row) => String(row?.value || '').trim()).filter(Boolean))
    recallSelectedDatesModel.value = recallSelectedDatesModel.value.filter((value) =>
      allowedDateSet.has(String(value || '').trim()),
    )
  },
  { immediate: true },
)

const totalCreditsDisplay = computed(() => {
  const selectedDateSet = new Set(
    (Array.isArray(recallSelectedDatesModel.value) ? recallSelectedDatesModel.value : [])
      .map((value) => String(value || '').trim())
      .filter(Boolean),
  )
  if (!selectedDateSet.size) return '0 days'

  const total = (Array.isArray(recallDateSelectionRows.value) ? recallDateSelectionRows.value : []).reduce(
    (sum, row) => {
      if (!selectedDateSet.has(String(row?.value || '').trim())) return sum
      if (String(row?.payStatusCode || '').toUpperCase() === 'WOP') return sum

      const weight = Number(row?.coverageWeight ?? 1)
      return sum + (Number.isFinite(weight) && weight > 0 ? weight : 1)
    },
    0,
  )

  const roundedTotal = Math.round((total + Number.EPSILON) * 100) / 100
  const normalizedValue = Number.isFinite(roundedTotal)
    ? Number.isInteger(roundedTotal)
      ? String(roundedTotal)
      : roundedTotal.toFixed(2).replace(/\.?0+$/, '')
    : '0'
  return `${normalizedValue} ${roundedTotal === 1 ? 'day' : 'days'}`
})

function normalizeIsoDate(value) {
  if (typeof props.toIsoDate === 'function') {
    const normalized = String(props.toIsoDate(value) || '').trim()
    if (normalized) return normalized
  }

  const raw = String(value || '').trim()
  if (!raw) return ''
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function handleConfirm() {
  const trimmedRecallReason = String(recallReasonModel.value || '').trim()
  const selectedRecallDates = [
    ...new Set(
      (Array.isArray(recallSelectedDatesModel.value) ? recallSelectedDatesModel.value : [])
        .map((value) => normalizeIsoDate(value))
        .filter(Boolean),
    ),
  ]

  if (!trimmedRecallReason) {
    $q.notify({
      type: 'warning',
      message: 'Please provide a reason for recall.',
      position: 'top',
    })
    return
  }

  if (!selectedRecallDates.length) {
    $q.notify({
      type: 'warning',
      message: 'Please choose at least one recall date.',
      position: 'top',
    })
    return
  }

  const application = props.application
  const applicationId = props.getApplicationId(application)
  if (!applicationId) {
    $q.notify({
      type: 'negative',
      message: 'Unable to identify this application.',
      position: 'top',
    })
    return
  }

  submitLoading.value = true
  try {
    await api.post(`/hr/leave-applications/${applicationId}/recall`, {
      recall_reason: trimmedRecallReason,
      recall_selected_dates: selectedRecallDates,
    })

    $q.notify({
      type: 'positive',
      message: 'Leave application recalled successfully.',
      position: 'top',
    })

    dialogModel.value = false
    emit('recalled', {
      applicationId,
      application,
    })
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to recall this application right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    submitLoading.value = false
  }
}
</script>
