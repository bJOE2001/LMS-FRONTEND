<template>
  <q-dialog
    :model-value="modelValue"
    :persistent="persistent || loading"
    :maximized="maximized"
    :position="position"
    :transition-show="transitionShow"
    :transition-hide="transitionHide"
    :class="dialogClass"
    @update:model-value="onDialogToggle"
    @hide="$emit('hide')"
  >
    <q-card
      style="width: 95vw"
      :style="[!maximized ? { maxWidth, maxHeight: 'calc(100vh - 32px)' } : null, cardStyle]"
      :class="['app-dialog-card', cardClass]"
    >
      <slot name="header" :cancel="handleCancel" :loading="loading">
        <q-card-section
          class="app-dialog-header row items-center no-wrap q-py-sm q-px-md"
          :class="[
            headerClass || `bg-${headerColor} text-white`,
            showClose ? 'justify-between' : 'q-gutter-sm',
          ]"
        >
          <div class="row items-center q-gutter-sm">
            <q-icon v-if="icon" :name="icon" size="22px" />
            <div>
              <div class="text-subtitle1 text-weight-bold">{{ title }}</div>
              <div v-if="subtitle" class="text-caption" style="opacity: 0.9">{{ subtitle }}</div>
            </div>
          </div>

          <q-btn
            v-if="showClose"
            flat
            round
            dense
            icon="close"
            :color="closeIconColor"
            aria-label="Close dialog"
            :disable="loading"
            @click="handleCancel"
          />
        </q-card-section>
      </slot>

      <component
        :is="wrapperComponent"
        ref="formRef"
        class="app-dialog-form"
        @submit.prevent="onFormSubmit"
      >
        <q-card-section v-if="!rawBody" :class="['app-dialog-body', bodyClass]">
          <slot :cancel="handleCancel" :loading="loading" />
        </q-card-section>
        <slot v-else :cancel="handleCancel" :loading="loading" />

        <q-card-actions
          v-if="!hideActions && (showCancel || submitLabel || $slots.actions)"
          align="right"
          :class="['app-dialog-actions', actionsClass]"
        >
          <slot name="actions" :cancel="handleCancel" :loading="loading">
            <q-btn
              v-if="showCancel"
              flat
              no-caps
              :color="cancelColor"
              :label="cancelLabel"
              :disable="loading"
              @click="handleCancel"
            />
            <q-btn
              v-if="submitLabel"
              unelevated
              no-caps
              :color="submitColor"
              :icon="submitIcon || undefined"
              :label="submitLabel"
              :loading="loading"
              :disable="submitDisable"
              :type="isForm ? 'submit' : 'button'"
              @click="handleSubmitClick"
            />
          </slot>
        </q-card-actions>
      </component>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { QForm } from 'quasar'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  subtitle: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '',
  },
  headerColor: {
    type: String,
    default: 'green-9',
  },
  headerClass: {
    type: String,
    default: '',
  },
  closeIconColor: {
    type: String,
    default: 'white',
  },
  maxWidth: {
    type: String,
    default: '480px',
  },
  dialogClass: {
    type: String,
    default: '',
  },
  cardClass: {
    type: String,
    default: 'rounded-borders',
  },
  cardStyle: {
    type: [String, Object, Array],
    default: '',
  },
  position: {
    type: String,
    default: 'standard',
  },
  maximized: {
    type: Boolean,
    default: false,
  },
  transitionShow: {
    type: String,
    default: undefined,
  },
  transitionHide: {
    type: String,
    default: undefined,
  },
  persistent: {
    type: Boolean,
    default: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  rawBody: {
    type: Boolean,
    default: false,
  },
  bodyClass: {
    type: String,
    default: 'q-gutter-md',
  },
  actionsClass: {
    type: String,
    default: 'q-px-md q-pb-md q-pt-xs q-gutter-sm',
  },
  showCancel: {
    type: Boolean,
    default: true,
  },
  cancelLabel: {
    type: String,
    default: 'Cancel',
  },
  cancelColor: {
    type: String,
    default: 'grey-8',
  },
  showClose: {
    type: Boolean,
    default: false,
  },
  submitLabel: {
    type: String,
    default: '',
  },
  submitIcon: {
    type: String,
    default: '',
  },
  submitColor: {
    type: String,
    default: 'green-9',
  },
  submitDisable: {
    type: Boolean,
    default: false,
  },
  isForm: {
    type: Boolean,
    default: false,
  },
  hideActions: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'submit', 'cancel', 'hide'])

const formRef = ref(null)
const wrapperComponent = computed(() => (props.isForm ? QForm : 'div'))

function onDialogToggle(val) {
  emit('update:modelValue', val)
}

function handleCancel() {
  if (props.loading) return
  emit('cancel')
  emit('update:modelValue', false)
}

function handleSubmitClick() {
  if (!props.isForm) {
    emit('submit')
  }
}

function onFormSubmit() {
  emit('submit')
}

defineExpose({
  validate: () => formRef.value?.validate?.(),
  resetValidation: () => formRef.value?.resetValidation?.(),
})
</script>

<style scoped>
.app-dialog-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-dialog-card > :deep(.q-card__section) {
  flex: 0 0 auto;
}

.app-dialog-form {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.app-dialog-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.app-dialog-actions {
  flex: 0 0 auto;
}
</style>
