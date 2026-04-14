<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="onDialogModelUpdate">
    <q-card style="min-width: 420px; max-width: 520px">
      <q-card-section class="row items-center">
        <q-icon :name="resultIcon" :color="resultIconColor" size="28px" class="q-mr-sm" />
        <div class="text-h6">Application {{ getActionResultLabel(actionResultType) }}</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <div class="text-body2 text-grey-8">
          <template v-if="actionResultType === 'approved' && actionResultIsEditRequestApproval">
            The request update has been approved. You can print the leave form and request-change
            form now.
          </template>
          <template v-else-if="actionResultType === 'cancelled'">
            The application has been cancelled.
          </template>
          <template v-else>
            The application has been {{ getActionResultVerb(actionResultType) }}. You can print the
            finalized form now.
          </template>
        </div>
        <div v-if="actionResultApp" class="text-caption text-grey-7 q-mt-sm">
          {{ actionResultApp.employeeName }} - {{ actionResultApp.leaveType }}
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          v-if="canPrintRequestChangesActionResult"
          unelevated
          color="teal-7"
          icon="description"
          label="Print Form"
          :disable="!actionResultApp"
          @click="handlePrintRequestChanges"
        />
        <q-btn
          v-if="actionResultType !== 'cancelled'"
          unelevated
          color="primary"
          icon="print"
          label="Print PDF"
          :disable="!actionResultApp"
          @click="handlePrint"
        />
        <q-btn flat label="Close" color="grey-7" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  actionResultType: {
    type: String,
    default: 'approved',
  },
  actionResultApp: {
    type: Object,
    default: null,
  },
  actionResultIsEditRequestApproval: {
    type: Boolean,
    default: false,
  },
  canPrintRequestChangesActionResult: {
    type: Boolean,
    default: false,
  },
  getActionResultLabel: {
    type: Function,
    default: () => 'Updated',
  },
  getActionResultVerb: {
    type: Function,
    default: () => 'updated',
  },
  onPrintRequestChanges: {
    type: Function,
    default: null,
  },
  onPrint: {
    type: Function,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue'])

const resultIcon = computed(() => (props.actionResultType === 'approved' ? 'check_circle' : 'cancel'))

const resultIconColor = computed(() => {
  if (props.actionResultType === 'approved') return 'green-7'
  if (props.actionResultType === 'cancelled') return 'warning'
  return 'negative'
})

function onDialogModelUpdate(value) {
  emit('update:modelValue', value)
}

function handlePrintRequestChanges() {
  if (!props.onPrintRequestChanges) return
  props.onPrintRequestChanges()
}

function handlePrint() {
  if (!props.onPrint) return
  props.onPrint()
}
</script>
