<template>
  <q-dialog v-model="dialogModel" persistent>
    <q-card
      class="hr-action-dialog-card hr-action-dialog-card--compact"
      :class="
        confirmActionType === 'approve'
          ? 'hr-action-dialog-card--approve'
          : confirmActionType === 'cancel'
            ? 'hr-action-dialog-card--cancel'
            : 'hr-action-dialog-card--reject'
      "
    >
      <q-card-section
        class="text-center hr-action-dialog-card__content hr-action-dialog-card__content--compact"
      >
        <q-avatar
          size="64px"
          class="hr-action-dialog-card__avatar"
          :class="`hr-action-dialog-card__avatar--${actionTone}`"
        >
          <q-icon :name="actionIcon" size="32px" />
        </q-avatar>
        <div class="hr-action-dialog-card__title">
          {{ actionTitle }}
        </div>
        <div class="hr-action-dialog-card__message">
          {{ actionMessage }}
        </div>
      </q-card-section>
      <q-card-actions
        class="hr-action-dialog-card__actions hr-action-dialog-card__actions--compact"
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
          :icon="actionIcon"
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
import { computed, ref } from 'vue'
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
  getApplicationId: {
    type: Function,
    default: (application) => application?.id ?? '',
  },
})

const emit = defineEmits(['update:modelValue', 'request-reject', 'approved'])
const $q = useQuasar()
const loading = ref(false)

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const actionTitle = computed(() => {
  if (props.confirmActionType === 'approve') return 'Approve'
  if (props.confirmActionType === 'cancel') return 'Cancel'
  return 'Disapprove'
})

const actionMessage = computed(() => {
  if (props.confirmActionType === 'approve') {
    return props.isEditRequest
      ? 'This will approve the edit request and apply the requested changes.'
      : 'This will finalize the approval of this application.'
  }

  if (props.confirmActionType === 'cancel') {
    return 'This will cancel this application.'
  }

  return props.isEditRequest
    ? 'You will continue to the disapproval form for this edit request.'
    : 'You will continue to the disapproval form.'
})

const actionTone = computed(() => {
  if (props.confirmActionType === 'approve') return 'approve'
  if (props.confirmActionType === 'cancel') return 'cancel'
  return 'reject'
})

const actionIcon = computed(() => {
  if (props.confirmActionType === 'approve') return 'check_circle'
  if (props.confirmActionType === 'cancel') return 'remove_circle'
  return 'cancel'
})

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

  loading.value = true
  try {
    await api.post(endpoint)
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
      applicationId,
      application,
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
</script>
