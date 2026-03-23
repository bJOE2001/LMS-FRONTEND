<template>
  <div class="report-table-container">
    <q-table
      :rows="rows"
      :columns="columns"
      row-key="id"
      flat
      wrap-cells
      v-model:pagination="tablePagination"
      :rows-per-page-options="[5, 10, 15, 20]"
      :loading="loading"
      table-header-class="bg-grey-2 text-weight-bold"
      :table-style="{ minWidth }"
      class="report-preview-table"
    >
      <template #header="scope">
        <q-tr :props="scope">
          <q-th
            v-for="col in scope.cols"
            :key="col.name"
            :props="scope"
            :style="resolveHeaderStyle(col)"
            class="report-th-wrap"
          >
            <div class="report-th-wrap__text">{{ formatHeaderLabel(col.label) }}</div>
          </q-th>
        </q-tr>
      </template>

      <template #no-data>
        <div class="full-width row flex-center q-pa-lg text-grey-7">
          <template v-if="loading">
            <q-spinner color="primary" size="24px" class="q-mr-sm" />
            <span>Loading report records...</span>
          </template>
          <template v-else>
            <q-icon name="inbox" size="md" class="q-mr-sm" />
            <span>No records found for the selected filters.</span>
          </template>
        </div>
      </template>
    </q-table>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

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

const defaultHeaderStyle = 'white-space: pre-line; line-height: 1.3; text-align: left;'
const HEADER_WRAP_CHARS = 15

const tablePagination = ref({
  page: 1,
  rowsPerPage: 10,
})

watch(
  () => props.rows.length,
  () => {
    tablePagination.value.page = 1
  },
)

function resolveHeaderStyle(column) {
  return column && column.headerStyle ? column.headerStyle : defaultHeaderStyle
}

function formatHeaderLabel(label) {
  const lineChunks = String(label || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lineChunks.length === 0) return ''

  return lineChunks
    .flatMap((line) => wrapLine(line, HEADER_WRAP_CHARS))
    .join('\n')
}

function wrapLine(line, maxChars) {
  const words = line.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']

  const lines = []
  let currentLine = ''

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word

    if (nextLine.length <= maxChars || currentLine.length === 0) {
      currentLine = nextLine
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}
</script>

<style scoped>
.report-table-container {
  overflow-x: hidden;
}

.report-th-wrap {
  white-space: pre-line;
  vertical-align: middle;
  text-align: left;
}

.report-th-wrap__text {
  display: block;
  white-space: pre-line;
  overflow-wrap: anywhere;
  word-break: break-word;
  line-height: 1.3;
  text-align: left;
}

.report-table-container :deep(.q-table thead th),
.report-table-container :deep(.q-table tbody td) {
  padding: 6px 8px;
}

.report-table-container :deep(.q-table__middle) {
  overflow-x: auto;
}

.report-table-container :deep(.q-table tbody td) {
  white-space: normal;
  vertical-align: top;
}
</style>
