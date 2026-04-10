<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="onDialogModelUpdate">
    <q-card
      class="admin-action-dialog-card admin-action-dialog-card--compact"
      :class="rejectionMode === 'cancel' ? 'admin-action-dialog-card--cancel' : 'admin-action-dialog-card--reject'"
    >
      <q-card-section class="text-center admin-action-dialog-card__content admin-action-dialog-card__content--compact">
        <div class="admin-action-dialog-card__title">{{ rejectionDialogTitle }}</div>
      </q-card-section>
      <q-card-section class="q-pt-none admin-action-dialog-card__content--compact">
        <q-input
          v-model="remarksModel"
          type="textarea"
          :label="rejectionDialogLabel"
          rows="4"
          outlined
        />
      </q-card-section>
      <q-card-actions class="admin-action-dialog-card__actions admin-action-dialog-card__actions--compact">
        <q-btn flat no-caps label="Cancel" color="grey-7" class="admin-action-dialog-card__button" v-close-popup />
        <q-btn
          unelevated
          no-caps
          :color="rejectionMode === 'cancel' ? 'warning' : 'negative'"
          :label="rejectionMode === 'cancel' ? 'Confirm Cancel' : 'Submit'"
          class="admin-action-dialog-card__button"
          :loading="actionLoading"
          @click="handleConfirm"
        />
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
  rejectionMode: {
    type: String,
    default: 'disapprove',
  },
  rejectionDialogTitle: {
    type: String,
    default: 'Disapprove Application',
  },
  rejectionDialogLabel: {
    type: String,
    default: 'Reason for disapproval',
  },
  remarks: {
    type: String,
    default: '',
  },
  actionLoading: {
    type: Boolean,
    default: false,
  },
  onConfirm: {
    type: Function,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'update:remarks'])

const remarksModel = computed({
  get: () => props.remarks,
  set: (value) => {
    emit('update:remarks', value)
  },
})

function onDialogModelUpdate(value) {
  emit('update:modelValue', value)
}

function handleConfirm() {
  if (!props.onConfirm) return
  props.onConfirm()
}
</script>

<style scoped>
.admin-action-dialog-card {
  width: min(560px, calc(100vw - 24px));
  max-width: calc(100vw - 24px);
  border-radius: 2px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.18);
}

.admin-action-dialog-card--compact {
  width: min(420px, calc(100vw - 24px));
  min-width: 340px;
  max-width: 420px;
  border-radius: 2px;
}

.admin-action-dialog-card--cancel {
  border-color: #f0d08a;
}

.admin-action-dialog-card--reject {
  border-color: #e6b8b8;
}

.admin-action-dialog-card__content {
  padding: 8px 28px 12px;
}

.admin-action-dialog-card__content--compact {
  padding: 22px 26px 12px;
}

.admin-action-dialog-card__title {
  margin-top: 14px;
  font-size: 2rem;
  line-height: 1.1;
  font-weight: 500;
  color: #111827;
}

.admin-action-dialog-card__avatar {
  color: #ffffff;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.18);
}

.admin-action-dialog-card__avatar--cancel {
  background: #f59e0b;
}

.admin-action-dialog-card__avatar--reject {
  background: #c62828;
}

.admin-action-dialog-card__actions {
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 22px 20px;
}

.admin-action-dialog-card__button {
  flex: 0 0 auto;
  min-height: 44px;
  min-width: 140px;
  border-radius: 2px;
  font-size: 1rem;
  font-weight: 700;
}

@media (max-width: 599px) {
  .admin-action-dialog-card {
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
    border-radius: 2px;
  }

  .admin-action-dialog-card--compact {
    min-width: 0;
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
  }

  .admin-action-dialog-card__content {
    padding: 4px 20px 10px;
  }

  .admin-action-dialog-card__title {
    font-size: 1.55rem;
  }

  .admin-action-dialog-card__actions {
    gap: 12px;
    padding: 0 20px 20px;
  }

  .admin-action-dialog-card__button {
    min-height: 50px;
    border-radius: 2px;
    min-width: 0;
    flex: 1 1 0;
  }
}
</style>
