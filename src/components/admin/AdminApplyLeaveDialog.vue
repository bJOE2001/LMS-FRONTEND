<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    class="apply-leave-dialog"
    transition-show="scale"
    transition-hide="scale"
    @update:model-value="onDialogModelUpdate"
  >
    <q-card class="apply-leave-dialog-card">
      <q-bar class="apply-leave-dialog-header bg-primary text-white">
        <div class="text-h6 text-weight-bold">Leave Application</div>
        <q-space />
        <q-btn
          flat
          round
          icon="close"
          color="white"
          size="md"
          class="apply-leave-dialog-close"
          @click="handleCancel"
        />
      </q-bar>
      <q-card-section class="q-pa-none apply-leave-dialog-body">
        <AdminApplySelf
          in-dialog
          :existing-applications="existingApplications"
          @cancel="handleCancel"
          @submitted="handleSubmitted"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import AdminApplySelf from 'pages/admin/AdminApplySelf.vue'

defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  existingApplications: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:modelValue', 'cancel', 'submitted'])

function onDialogModelUpdate(value) {
  emit('update:modelValue', value)
}

function handleCancel() {
  emit('cancel')
  emit('update:modelValue', false)
}

function handleSubmitted(payload) {
  emit('submitted', payload)
}
</script>

<style scoped>
.apply-leave-dialog-card {
  width: min(1280px, 96vw);
  max-width: none;
  max-height: calc(100vh - 24px);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.apply-leave-dialog-header {
  min-height: 56px;
  padding: 0 10px 0 14px;
  position: sticky;
  top: 0;
  z-index: 3;
}

.apply-leave-dialog-close {
  width: 38px;
  height: 38px;
}

.apply-leave-dialog :deep(.q-dialog__inner--minimized) {
  padding: 12px;
}

.apply-leave-dialog :deep(.q-dialog__inner--minimized > div) {
  max-width: none !important;
}

.apply-leave-dialog-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
}

@media (max-width: 599px) {
  .apply-leave-dialog-card {
    width: min(100vw, 100vw);
    max-height: calc(100vh - 8px);
    border-radius: 10px;
  }

  .apply-leave-dialog :deep(.q-dialog__inner--minimized) {
    padding: 4px;
  }

  .apply-leave-dialog-header {
    min-height: 52px;
    padding: 0 8px 0 10px;
  }
}
</style>
