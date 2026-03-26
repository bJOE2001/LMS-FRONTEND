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
  const map = {
    'Pending': 'warning',
    'Pending Admin': 'warning',
    'Pending HR': 'blue-6',
    'Approved': 'positive',
    'Recalled': 'blue-grey-7',
    'Rejected': 'negative',
    'Disapproved': 'negative',
  }
  return map[props.status] || 'grey'
})

const textColor = computed(() => {
  return ['Pending', 'Pending Admin'].includes(props.status) ? 'dark' : 'white'
})
</script>
