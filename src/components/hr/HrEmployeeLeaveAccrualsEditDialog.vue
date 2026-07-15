<template>
  <q-dialog v-model="dialogModel" persistent>
    <q-card style="min-width: 400px; max-width: 600px;">
      <q-card-section class="row items-center q-pb-none">
        <q-icon name="edit_calendar" size="sm" color="primary" class="q-mr-sm" />
        <div class="text-h6">Edit Monthly Accrual</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup :disable="saving" />
      </q-card-section>

      <q-card-section class="q-pt-sm">
        <q-banner v-if="error" dense rounded class="bg-orange-1 text-orange-9 q-mb-md">
          <template #avatar>
            <q-icon name="warning" color="orange-8" />
          </template>
          {{ error }}
        </q-banner>

        <div v-if="loading" class="row justify-center q-pa-md">
          <q-spinner color="primary" size="2em" />
        </div>

        <div v-else-if="accruals.length > 0">
          <div class="q-mb-md text-subtitle2 text-grey-8">
            Update the leave credits for this accrual period.
          </div>

          <div v-for="(accrual, index) in accruals" :key="accrual.id" class="q-mb-md">
            <q-input
              v-model="accruals[index].editCredits"
              :label="`${accrual.leave_type_name} Accrual`"
              type="number"
              step="0.001"
              outlined
              dense
              :hint="`Current value: ${Number(accrual.credits_added).toFixed(3)}`"
              @blur="formatCredits(index)"
            >
              <template #prepend>
                <q-icon name="account_balance_wallet" />
              </template>
            </q-input>
          </div>
        </div>
        <div v-else class="text-center text-grey-7 q-pa-md">
          No editable accrual records found.
        </div>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Cancel" color="grey-8" v-close-popup :disable="saving" />
        <q-btn
          unelevated
          label="Save Changes"
          color="primary"
          :loading="saving"
          :disable="loading || accruals.length === 0"
          @click="saveChanges"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  accrualIds: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:modelValue', 'saved'])
const $q = useQuasar()

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const accruals = ref([])

const dialogModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      loadAccruals()
    } else {
      accruals.value = []
      error.value = ''
    }
  },
)

function formatCredits(index) {
  const val = Number(accruals.value[index].editCredits)
  if (!isNaN(val)) {
    accruals.value[index].editCredits = val.toFixed(3)
  }
}

async function loadAccruals() {
  if (!props.accrualIds || props.accrualIds.length === 0) {
    error.value = 'No accrual IDs provided.'
    return
  }

  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/hr/leave-accruals', {
      params: { ids: props.accrualIds.join(',') },
    })
    accruals.value = (data.data || []).map((a) => ({
      ...a,
      editCredits: Number(a.credits_added).toFixed(3),
    }))
  } catch (err) {
    error.value = resolveApiErrorMessage(err, 'Failed to load accrual records.')
  } finally {
    loading.value = false
  }
}

async function saveChanges() {
  saving.value = true
  error.value = ''

  const updates = accruals.value.map((a) => ({
    id: a.id,
    credits_added: Number(a.editCredits),
  }))

  try {
    await api.post('/hr/leave-accruals/bulk-update', { updates })
    $q.notify({
      type: 'positive',
      message: 'Accruals updated successfully.',
      position: 'top',
    })
    emit('saved')
    dialogModel.value = false
  } catch (err) {
    let debugMessage = err.message
    if (err.response) {
      debugMessage = `Status: ${err.response.status} Data: ${JSON.stringify(err.response.data)}`
    }
    error.value = debugMessage || resolveApiErrorMessage(err, 'An error occurred while updating accruals.')
    $q.notify({
      type: 'negative',
      message: error.value,
      position: 'top',
      timeout: 10000
    })
  } finally {
    saving.value = false
  }
}
</script>
