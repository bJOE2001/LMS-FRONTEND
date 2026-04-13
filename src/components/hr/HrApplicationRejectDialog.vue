<template>
  <q-dialog v-model="dialogModel" persistent>
    <q-card
      class="hr-action-dialog-card hr-action-dialog-card--compact hr-action-dialog-card--reject"
    >
      <q-card-section
        class="text-center hr-action-dialog-card__content hr-action-dialog-card__content--compact"
      >
        <div class="hr-action-dialog-card__title">Disapprove Application</div>
      </q-card-section>
      <q-card-section class="q-pt-none hr-action-dialog-card__content--compact">
        <q-input
          v-model="remarksModel"
          type="textarea"
          label="Reason for disapproval"
          rows="4"
          outlined
        />
      </q-card-section>
      <q-card-actions
        class="hr-action-dialog-card__actions hr-action-dialog-card__actions--compact"
      >
        <q-btn
          flat
          no-caps
          label="Cancel"
          color="grey-7"
          class="hr-action-dialog-card__button"
          v-close-popup
        />
        <q-btn
          unelevated
          color="negative"
          no-caps
          label="Submit"
          class="hr-action-dialog-card__button"
          :loading="submitLoading"
          @click="handleSubmit"
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

const emit = defineEmits(['update:modelValue', 'rejected'])
const $q = useQuasar()
const remarksModel = ref('')
const submitLoading = ref(false)

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const normalizeRawStatusKey = (application) =>
  String(application?.group_raw_status ?? application?.rawStatus ?? application?.raw_status ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

const applicationId = computed(() => props.getApplicationId(props.application))

watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) {
      remarksModel.value = ''
      return
    }

    remarksModel.value = ''
  },
)

async function handleSubmit() {
  const remarks = String(remarksModel.value || '').trim()
  if (!remarks) {
    $q.notify({
      type: 'warning',
      message: 'Please provide a reason for disapproval',
      position: 'top',
    })
    return
  }

  const id = applicationId.value
  if (!id) {
    $q.notify({
      type: 'negative',
      message: 'Unable to identify this application.',
      position: 'top',
    })
    return
  }

  submitLoading.value = true
  try {
    const application = props.application
    const isCoc = props.isCocApplication(application)
    const isCocLateFilingReview =
      isCoc && normalizeRawStatusKey(application) === 'PENDING_LATE_HR'
    const isEditRequest = props.isPendingEditRequest(application)
    const isCancellationRequest =
      String(props.getLeaveRequestActionType(application) || '').toUpperCase() === 'REQUEST_CANCEL'
    const endpoint = isCoc
      ? isCocLateFilingReview
        ? `/hr/coc-applications/${id}/late-filing/reject`
        : `/hr/coc-applications/${id}/reject`
      : `/hr/leave-applications/${id}/reject`

    const response = await api.post(endpoint, { remarks })
    $q.notify({
      type: 'info',
      message: isCoc
        ? isCocLateFilingReview
          ? 'Late COC filing disapproved.'
          : 'COC application disapproved with remarks'
        : isEditRequest
          ? isCancellationRequest
            ? 'Cancellation request disapproved. The approved leave application remains active.'
            : 'Edit request disapproved. Original approved application remains unchanged.'
          : 'Leave application disapproved with remarks',
      position: 'top',
    })

    dialogModel.value = false
    emit('rejected', {
      actionType: 'reject',
      applicationId: id,
      application: response?.data?.application || application,
    })
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to disapprove this application right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    submitLoading.value = false
  }
}
</script>
