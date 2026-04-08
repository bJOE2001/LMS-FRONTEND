<template>
  <q-badge
    :color="color"
    :text-color="textColor"
    :label="status"
    class="q-px-sm q-py-xs"
  />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true,
  },
})

const color = computed(() => {
  const normalized = String(props.status || '').trim().toUpperCase()
  if (!normalized) return 'grey'

  if (normalized.includes('PENDING') && normalized.includes('LATE')) return 'orange-8'
  if (normalized.includes('PENDING ADMIN')) return 'warning'
  if (normalized.includes('PENDING HR')) return 'blue-6'
  if (normalized.includes('PENDING RELEASE')) return 'indigo-6'
  if (normalized.includes('PENDING RECEIVE')) return 'teal-6'
  if (normalized.includes('PENDING')) return 'warning'
  if (normalized.includes('RELEASED')) return 'positive'
  if (normalized.includes('APPROVED')) return 'positive'
  if (normalized.includes('RECALLED')) return 'blue-grey-7'
  if (normalized.includes('REJECTED') || normalized.includes('DISAPPROVED')) return 'negative'

  return 'grey'
})

const textColor = computed(() => 'white')
</script>
