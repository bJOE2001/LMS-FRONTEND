<template>
  <base-report-table
    :rows="rowsWithIndex"
    :columns="columns"
    :loading="loading"
    :min-width="minWidth"
  />
</template>

<script setup>
import { computed } from 'vue'
import BaseReportTable from './BaseReportTable.vue'

const props = defineProps({
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

const rowsWithIndex = computed(() =>
  (Array.isArray(props.rows) ? props.rows : []).map((row, index) => ({
    ...row,
    no: index + 1,
  })),
)
</script>
