<template>
  <q-dialog v-model="dialogModel" persistent>
    <q-card
      class="hr-action-dialog-card"
      :class="[
        confirmActionType === 'approve'
          ? 'hr-action-dialog-card--approve'
          : confirmActionType === 'cancel'
            ? 'hr-action-dialog-card--cancel'
            : 'hr-action-dialog-card--reject',
        isCocApproveFlow ? 'hr-action-dialog-card--review-wide' : 'hr-action-dialog-card--compact',
      ]"
    >
      <q-card-section
        class="hr-action-dialog-card__content"
        :class="
          isCocApproveFlow
            ? 'hr-action-dialog-card__content--review'
            : 'hr-action-dialog-card__content--compact'
        "
      >
        <template v-if="isCocApproveFlow">
          <div>
            <div class="row items-center no-wrap hr-action-dialog-card__title-row">
              <q-icon
                :name="actionIcon"
                :color="actionIconColor"
                size="28px"
                class="q-mr-sm hr-action-dialog-card__title-icon"
              />
              <div class="hr-action-dialog-card__title">
                {{ actionTitle }}
              </div>
            </div>
            <div class="hr-action-dialog-card__message">
              HR must classify each overtime row before the COC application is approved.
            </div>
          </div>

          <q-banner dense rounded class="bg-blue-1 text-primary q-mt-md q-mb-md">
            <strong>Regular</strong> = weekdays or scheduled workdays. <strong>Special</strong> = weekends,
            holidays, or scheduled days off.
          </q-banner>

          <div v-if="classificationLoading" class="row items-center justify-center q-py-lg text-grey-7">
            <q-spinner color="primary" size="24px" class="q-mr-sm" />
            <span>Loading overtime rows...</span>
          </div>

          <div v-else class="coc-review-table-wrap">
            <q-markup-table
              flat
              bordered
              dense
              separator="cell"
              class="coc-review-table"
            >
              <thead>
                <tr>
                  <th class="text-left">Date</th>
                  <th class="text-left">Nature of Overtime</th>
                  <th class="text-left">Time Range</th>
                  <th class="text-left">Duration</th>
                  <th class="text-left">Credit Category</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in cocReviewRows" :key="row.lineNo">
                  <td class="coc-review-table__cell coc-review-table__cell--date">
                    {{ formatReviewDate(row.date) }}
                  </td>
                  <td class="coc-review-table__cell">
                    {{ row.natureOfOvertime || 'N/A' }}
                  </td>
                  <td class="coc-review-table__cell">
                    {{ formatReviewTimeRange(row.timeFrom, row.timeTo) }}
                  </td>
                  <td class="coc-review-table__cell">
                    {{ formatReviewMinutes(row.minutes) }}
                  </td>
                  <td class="coc-review-table__cell coc-review-table__cell--toggle">
                    <q-btn-toggle
                      v-model="row.creditCategory"
                      spread
                      dense
                      no-caps
                      unelevated
                      toggle-color="primary"
                      color="grey-3"
                      text-color="grey-8"
                      class="coc-review-table__toggle"
                      :options="creditCategoryOptions"
                    />
                  </td>
                </tr>
                <tr v-if="!cocReviewRows.length">
                  <td class="text-center text-grey-7 coc-review-table__empty" colspan="5">
                    No overtime rows found for this COC application.
                  </td>
                </tr>
              </tbody>
            </q-markup-table>
          </div>
        </template>
        <template v-else>
          <div class="row items-center no-wrap hr-action-dialog-card__title-row">
            <q-icon
              :name="actionIcon"
              :color="actionIconColor"
              size="28px"
              class="q-mr-sm hr-action-dialog-card__title-icon"
            />
            <div class="hr-action-dialog-card__title">
              {{ actionTitle }}
            </div>
          </div>
          <div class="hr-action-dialog-card__message">
            {{ actionMessage }}
          </div>
        </template>
      </q-card-section>
      <q-card-actions
        class="hr-action-dialog-card__actions hr-action-dialog-card__actions--compact"
        :class="{ 'hr-action-dialog-card__actions--review-wide': isCocApproveFlow }"
      >
        <q-btn
          flat
          no-caps
          label="Cancel"
          color="grey-7"
          class="hr-action-dialog-card__button hr-action-dialog-card__button--cancel"
          v-close-popup
        />
        <q-btn
          unelevated
          no-caps
          label="Confirm"
          :color="
            confirmActionType === 'approve'
              ? 'green-7'
              : confirmActionType === 'cancel'
                ? 'warning'
                : 'negative'
          "
          class="hr-action-dialog-card__button"
          :loading="loading"
          @click="handleConfirm"
        />
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
  confirmActionType: {
    type: String,
    default: 'approve',
  },
  isEditRequest: {
    type: Boolean,
    default: false,
  },
  application: {
    type: Object,
    default: null,
  },
  isCocApplication: {
    type: Function,
    default: () => false,
  },
  isPendingEditRequest: {
    type: Function,
    default: () => false,
  },
  getLeaveRequestActionType: {
    type: Function,
    default: () => '',
  },
  getApplicationId: {
    type: Function,
    default: (application) => application?.id ?? '',
  },
})

const emit = defineEmits(['update:modelValue', 'request-reject', 'approved'])
const $q = useQuasar()
const loading = ref(false)
const classificationLoading = ref(false)
const cocReviewRows = ref([])

const creditCategoryOptions = [
  { label: 'Regular (1.0)', value: 'REGULAR' },
  { label: 'Special (1.5)', value: 'SPECIAL' },
]

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const isCocApproveFlow = computed(
  () => props.confirmActionType === 'approve' && props.isCocApplication(props.application),
)

const actionTitle = computed(() => {
  if (props.confirmActionType === 'approve') return 'Approve'
  if (props.confirmActionType === 'cancel') return 'Cancel'
  return 'Disapprove'
})

const isCancellationRequest = computed(
  () => String(props.getLeaveRequestActionType(props.application) || '').toUpperCase() === 'REQUEST_CANCEL',
)

const actionMessage = computed(() => {
  if (props.confirmActionType === 'approve') {
    if (props.isEditRequest) {
      return isCancellationRequest.value
        ? 'This will approve the cancellation request and continue the cancellation workflow.'
        : 'This will approve the edit request and apply the requested changes.'
    }

    return 'This will finalize the approval of this application.'
  }

  if (props.confirmActionType === 'cancel') {
    return 'This will cancel this application.'
  }

  if (props.isEditRequest) {
    return isCancellationRequest.value
      ? 'You will continue to the disapproval form for this cancellation request.'
      : 'You will continue to the disapproval form for this edit request.'
  }

  return 'You will continue to the disapproval form.'
})

const actionIcon = computed(() => {
  if (props.confirmActionType === 'approve') return 'check_circle'
  if (props.confirmActionType === 'cancel') return 'remove_circle'
  return 'cancel'
})

const actionIconColor = computed(() => {
  if (props.confirmActionType === 'approve') return 'green-7'
  if (props.confirmActionType === 'cancel') return 'warning'
  return 'negative'
})

const normalizeReviewRows = (application) => {
  const rows = Array.isArray(application?.rows) ? application.rows : []

  return rows.map((row, index) => ({
    lineNo: Number(row?.line_no ?? row?.lineNo ?? index + 1),
    date: String(row?.date ?? '').trim(),
    natureOfOvertime: String(row?.nature_of_overtime ?? row?.natureOfOvertime ?? '').trim(),
    timeFrom: String(row?.time_from ?? row?.timeFrom ?? '').trim(),
    timeTo: String(row?.time_to ?? row?.timeTo ?? '').trim(),
    minutes: Number(row?.no_of_hours_and_minutes ?? row?.minutes ?? 0),
    creditCategory:
      String(row?.credit_category ?? row?.creditCategory ?? '').trim().toUpperCase() || 'REGULAR',
  }))
}

const formatReviewDate = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return 'No date'

  const resolvedDate = new Date(`${raw}T12:00:00`)
  if (Number.isNaN(resolvedDate.getTime())) return raw

  return resolvedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatReviewTimeRange = (timeFrom, timeTo) => {
  const fromText = String(timeFrom || '').trim() || 'N/A'
  const toText = String(timeTo || '').trim() || 'N/A'
  return `${fromText} - ${toText}`
}

const formatReviewMinutes = (value) => {
  const minutes = Number(value || 0)
  if (!Number.isFinite(minutes) || minutes <= 0) return '0m'

  const wholeHours = Math.floor(minutes / 60)
  const excessMinutes = minutes % 60

  if (wholeHours && excessMinutes) return `${wholeHours}h ${excessMinutes}m`
  if (wholeHours) return `${wholeHours}h`
  return `${excessMinutes}m`
}

async function ensureCocReviewRows() {
  if (!isCocApproveFlow.value) {
    cocReviewRows.value = []
    return
  }

  const applicationId = props.getApplicationId(props.application)
  if (!applicationId) {
    cocReviewRows.value = []
    return
  }

  const existingRows = normalizeReviewRows(props.application)
  if (existingRows.length) {
    cocReviewRows.value = existingRows
    return
  }

  classificationLoading.value = true
  try {
    const response = await api.get(`/hr/coc-applications/${applicationId}`)
    const detailedApplication = response?.data?.application
    cocReviewRows.value = normalizeReviewRows(detailedApplication)
  } catch {
    cocReviewRows.value = []
  } finally {
    classificationLoading.value = false
  }
}

async function approveApplication() {
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

  const isCoc = props.isCocApplication(application)
  const isEditRequest = props.isPendingEditRequest(application)
  const endpoint = isCoc
    ? `/hr/coc-applications/${applicationId}/approve`
    : `/hr/leave-applications/${applicationId}/approve`

  const payload = {}
  if (isCoc) {
    if (!cocReviewRows.value.length) {
      $q.notify({
        type: 'negative',
        message: 'No overtime rows were found for this COC application.',
        position: 'top',
      })
      return
    }

    const hasUnclassifiedRow = cocReviewRows.value.some(
      (row) => !String(row.creditCategory || '').trim(),
    )
    if (hasUnclassifiedRow) {
      $q.notify({
        type: 'negative',
        message: 'Please classify every overtime row as Regular or Special.',
        position: 'top',
      })
      return
    }

    payload.rows = cocReviewRows.value.map((row) => ({
      line_no: Number(row.lineNo || 0),
      credit_category: String(row.creditCategory || '').trim().toUpperCase(),
    }))
  }

  loading.value = true
  try {
    const response = await api.post(endpoint, payload)
    $q.notify({
      type: 'positive',
      message: isCoc
        ? 'COC application approved and converted to CTO credits.'
        : isEditRequest
          ? 'Edit request approved. Requested changes and leave balances are now applied.'
          : 'Leave application approved! Balance deducted if credit-based.',
      position: 'top',
    })
    dialogModel.value = false
    emit('approved', {
      actionType: 'approve',
      applicationId,
      application: response?.data?.application || application,
    })
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to approve this application right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    loading.value = false
  }
}

async function handleConfirm() {
  if (props.confirmActionType === 'approve') {
    await approveApplication()
    return
  }

  dialogModel.value = false
  emit('request-reject', props.application)
}

watch(
  [() => props.modelValue, isCocApproveFlow, () => props.application],
  async ([isOpen, isCocFlow]) => {
    if (!isOpen || !isCocFlow) {
      if (!isOpen) {
        cocReviewRows.value = []
      }
      return
    }

    await ensureCocReviewRows()
  },
  { immediate: true },
)
</script>

<style scoped>
.hr-action-dialog-card__title-row {
  display: flex;
  align-items: center;
}

.hr-action-dialog-card__title-row .hr-action-dialog-card__title {
  margin-top: 0 !important;
}

.hr-action-dialog-card--review-wide {
  width: min(1040px, calc(100vw - 32px));
  max-width: calc(100vw - 32px);
}

.hr-action-dialog-card__actions--review-wide {
  justify-content: flex-end !important;
  gap: 8px;
  padding-top: 10px;
}

.hr-action-dialog-card--review-wide .hr-action-dialog-card__button {
  flex: 0 0 auto;
  min-width: 110px;
  min-height: 38px;
  padding: 0 14px;
  font-size: 0.9rem;
}

.coc-review-table-wrap {
  overflow-x: auto;
  border-radius: 10px;
}

.coc-review-table {
  width: 100%;
  min-width: 0;
  table-layout: fixed;
}

.coc-review-table thead th {
  background: #f4f8fc;
  color: #334155;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.coc-review-table__cell {
  vertical-align: middle;
  font-size: 0.86rem;
  color: #1f2937;
  white-space: normal;
  overflow-wrap: anywhere;
}

.coc-review-table__cell--date {
  font-weight: 600;
  width: 150px;
}

.coc-review-table__cell--toggle {
  width: 260px;
}

.coc-review-table__toggle {
  width: 100%;
  min-width: 0;
}

.coc-review-table__empty {
  padding: 16px 12px;
}

@media (max-width: 640px) {
  .hr-action-dialog-card--review-wide {
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
  }

  .hr-action-dialog-card--review-wide .hr-action-dialog-card__button {
    min-width: 102px;
    min-height: 36px;
    padding: 0 12px;
  }

  .coc-review-table {
    min-width: 680px;
  }
}
</style>
