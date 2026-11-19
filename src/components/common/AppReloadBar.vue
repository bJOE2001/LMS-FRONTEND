<template>
  <q-linear-progress
    v-if="loading"
    indeterminate
    :color="color"
    :size="size"
    :class="barClass"
  />
</template>

<script setup>
defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  color: {
    type: String,
    default: 'green-9',
  },
  size: {
    type: String,
    default: '3px',
  },
  barClass: {
    type: [String, Array, Object],
    default: 'q-mb-md rounded-borders top-reload-bar',
  },
})
</script>

