<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="onDialogModelUpdate">
    <q-card
      class="admin-action-dialog-card admin-action-dialog-card--compact"
      :class="
        confirmActionType === 'approve'
          ? 'admin-action-dialog-card--approve'
          : confirmActionType === 'cancel'
            ? 'admin-action-dialog-card--cancel'
            : 'admin-action-dialog-card--reject'
      "
    >
      <q-card-section
        class="admin-action-dialog-card__content admin-action-dialog-card__content--compact"
      >
        <div class="row items-center no-wrap admin-action-dialog-card__title-row">
          <q-icon
            :name="actionIcon"
            :color="actionIconColor"
            size="28px"
            class="q-mr-sm admin-action-dialog-card__title-icon"
          />
          <div class="admin-action-dialog-card__title">
            {{ getConfirmActionTitle(confirmActionType) }}
          </div>
        </div>
        <div class="admin-action-dialog-card__message">
          {{ getConfirmActionMessage(confirmActionType) }}
        </div>
      </q-card-section>
      <q-card-actions
        class="admin-action-dialog-card__actions admin-action-dialog-card__actions--compact"
      >
        <q-btn
          flat
          no-caps
          label="Cancel"
          color="grey-7"
          class="admin-action-dialog-card__button admin-action-dialog-card__button--cancel"
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
          class="admin-action-dialog-card__button"
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
  confirmActionType: {
    type: String,
    default: 'approve',
  },
  getConfirmActionTitle: {
    type: Function,
    default: () => 'Confirm Action',
  },
  getConfirmActionMessage: {
    type: Function,
    default: () => 'Are you sure you want to continue?',
  },
  onConfirm: {
    type: Function,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue'])

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

.admin-action-dialog-card--approve {
  border-color: #b7ddc1;
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
  font-size: 2rem;
  line-height: 1.1;
  font-weight: 500;
  color: #111827;
}

.admin-action-dialog-card__title-row {
  display: flex;
  align-items: center;
}

.admin-action-dialog-card__title-row .admin-action-dialog-card__title {
  margin-top: 0 !important;
}

.admin-action-dialog-card--compact .admin-action-dialog-card__title {
  margin-top: 14px;
  font-size: 1.45rem;
  line-height: 1.15;
  white-space: nowrap;
}

.admin-action-dialog-card__message {
  margin-top: 14px;
  font-size: 1.02rem;
  line-height: 1.45;
  color: #6b7280;
}

.admin-action-dialog-card__avatar {
  color: #ffffff;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.18);
}

.admin-action-dialog-card__avatar--approve {
  background: #2e7d32;
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

.admin-action-dialog-card__button--cancel {
  background: transparent;
  border-color: transparent;
  color: #6b7280;
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

  .admin-action-dialog-card--compact .admin-action-dialog-card__title {
    font-size: 1.2rem;
  }

  .admin-action-dialog-card__message {
    margin-top: 14px;
    font-size: 1rem;
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
