<template>
  <q-dialog v-model="dialogModel" persistent>
    <q-card style="min-width: 360px; max-width: 680px; width: 92vw">
      <q-card-section>
        <div class="text-h6">Request Recall</div>
        <div class="text-caption text-grey-7">
          Select recall dates and submit to HR for approval. A print prompt will appear after submit.
        </div>
      </q-card-section>

      <q-card-section class="q-pt-none q-gutter-md">
        <q-option-group
          v-model="selectedRecallDates"
          :options="recallDateOptions"
          type="checkbox"
          color="warning"
        />
        <div v-if="!recallDateOptions.length" class="text-caption text-grey-7">
          No recall dates available.
        </div>

        <q-input
          v-model="recallReason"
          type="textarea"
          rows="3"
          outlined
          label="Reason for recall *"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn
          unelevated
          color="warning"
          label="Submit Recall Request"
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
  formatRecallDateLabel: {
    type: Function,
    default: (value) => String(value || ''),
  },
})

const emit = defineEmits(['update:modelValue', 'request-recall'])
const $q = useQuasar()

const selectedRecallDates = ref([])
const recallReason = ref('')
const submitLoading = ref(false)

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const recallDateOptions = computed(() => {
  const application = props.application
  if (!application || typeof application !== 'object') return []

  const options = [
    ...new Set(
      (Array.isArray(props.getRecallDateOptions(application)) ? props.getRecallDateOptions(application) : [])
        .map((value) => normalizeIsoDate(value))
        .filter(Boolean),
    ),
  ].sort()

  return options.map((value) => ({
    label: props.formatRecallDateLabel(value),
    value,
  }))
})

watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) {
      selectedRecallDates.value = []
      recallReason.value = ''
      submitLoading.value = false
      return
    }

    selectedRecallDates.value = []
    recallReason.value = ''
  },
)

function normalizeIsoDate(value) {
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

async function handleSubmit() {
  const trimmedReason = String(recallReason.value || '').trim()
  const recallSelectedDates = [
    ...new Set(
      (Array.isArray(selectedRecallDates.value) ? selectedRecallDates.value : [])
        .map((value) => normalizeIsoDate(value))
        .filter(Boolean),
    ),
  ].sort()

  if (!trimmedReason) {
    $q.notify({
      type: 'warning',
      message: 'Please provide a reason for recall.',
      position: 'top',
    })
    return
  }

  if (!recallSelectedDates.length) {
    $q.notify({
      type: 'warning',
      message: 'Please choose at least one recall date.',
      position: 'top',
    })
    return
  }

  submitLoading.value = true
  try {
    emit('request-recall', {
      application: props.application,
      recall_reason: trimmedReason,
      recall_selected_dates: recallSelectedDates,
    })
    dialogModel.value = false
  } finally {
    submitLoading.value = false
  }
}
</script>
