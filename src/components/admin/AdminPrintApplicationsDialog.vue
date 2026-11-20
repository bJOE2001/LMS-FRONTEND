<template>
  <q-dialog v-model="dialogModel" persistent>
    <q-card style="min-width: 360px; max-width: 480px; width: 92vw">
      <q-card-section>
        <div class="text-h6">Print Applications</div>
        <div class="text-caption text-grey-7">
          Select a date range to filter the applications for printing. The default is the last month. Leave blank to print all available applications in the table.
        </div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <HeaderDateRangePicker
          v-model:start-date="dateRange.from"
          v-model:end-date="dateRange.to"
          label="Print Date Range"
          full-width
          menu-anchor="bottom left"
          menu-self="top left"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn
          unelevated
          color="blue-grey-7"
          label="Print"
          icon="print"
          @click="handlePrint"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import HeaderDateRangePicker from 'src/components/common/HeaderDateRangePicker.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'print'])

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

function getDefaultDateRange() {
  const today = new Date()
  const lastMonth = new Date()
  lastMonth.setMonth(today.getMonth() - 1)

  const format = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  return {
    from: format(lastMonth),
    to: format(today),
  }
}

const dateRange = ref(getDefaultDateRange())

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      dateRange.value = getDefaultDateRange()
    }
  },
)

function handlePrint() {
  emit('print', { ...dateRange.value })
  dialogModel.value = false
}
</script>
