<template>
  <div>
    <q-table
      :rows="rows"
      :columns="columns"
      row-key="id"
      flat
      bordered
      wrap-cells
      :loading="loading"
      :pagination="{ rowsPerPage: 0 }"
      hide-bottom
      class="report-table"
      :style="{ minWidth: minWidth }"
    >
      <template v-slot:body="props">
        <q-tr :props="props">
          <q-td
            v-for="col in props.cols"
            :key="col.name"
            :props="props"
          >
            <template v-if="col.name === 'no'">
              {{ props.rowIndex + 1 }}
            </template>
            <template v-else>
              {{ col.value }}
            </template>
          </q-td>
        </q-tr>
      </template>

      <template v-slot:no-data>
        <div class="full-width row flex-center q-pa-md text-grey-8">
          <q-icon name="warning" size="2em" class="q-mr-sm" />
          <span>No application processing records found for the selected date range.</span>
        </div>
      </template>
    </q-table>
  </div>
</template>

<script setup>
defineProps({
  rows: {
    type: Array,
    required: true,
  },
  columns: {
    type: Array,
    required: true,
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

<style scoped>
.report-table {
  max-height: 70vh;
}
.report-table :deep(th) {
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: #f5f5f5;
  font-weight: 600;
}
</style>
