<template>
  <q-dialog v-model="dialogModel" persistent>
    <q-card
      class="hr-action-dialog-card hr-action-dialog-card--compact hr-action-dialog-card--reject"
    >
      <q-card-section
        class="text-center hr-action-dialog-card__content hr-action-dialog-card__content--compact"
      >
        <q-avatar
          size="64px"
          class="hr-action-dialog-card__avatar hr-action-dialog-card__avatar--reject"
        >
          <q-icon name="cancel" size="32px" />
        </q-avatar>
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
          icon="cancel"
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
      message: 'Please provide a reason for rejection',
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
    const isEditRequest = props.isPendingEditRequest(application)
    const endpoint = isCoc
      ? `/hr/coc-applications/${id}/reject`
      : `/hr/leave-applications/${id}/reject`

    await api.post(endpoint, { remarks })
    $q.notify({
      type: 'info',
      message: isCoc
        ? 'COC application rejected with remarks'
        : isEditRequest
          ? 'Edit request rejected. Original approved application remains unchanged.'
          : 'Leave application rejected with remarks',
      position: 'top',
    })

    dialogModel.value = false
    emit('rejected', {
      applicationId: id,
      application,
    })
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to reject this application right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    submitLoading.value = false
  }
}
</script>
