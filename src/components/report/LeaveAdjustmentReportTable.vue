<template>
  <base-report-table
    :rows="rows"
    :columns="columns"
    :loading="loading"
    :min-width="minWidth"
  />
</template>

<script setup>
import BaseReportTable from './BaseReportTable.vue'

defineProps({
  rows: {
    type: Array,
    default: () => [],
  },
  columns: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  minWidth: {
    type: String,
    default: '1200px',
  },
})
</script>
