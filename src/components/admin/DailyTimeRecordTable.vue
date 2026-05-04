<template>
  <div class="q-pa-md">
    <q-table
      class="q-pa-md"
      flat
      bordered
      title="Daily Time Record"
      :rows="rows"
      :columns="columns"
      row-key="date"
    >
      <!-- ACTION COLUMN -->
      <template v-slot:body-cell-action="props">
        <q-td :props="props" class="text-center">
          <q-btn dense flat icon="edit" color="primary" @click="editRow(props.row)" />
        </q-td>
      </template>
    </q-table>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const columns = [
  {
    name: 'date',
    label: 'Date',
    field: 'date',
    align: 'left',
    sortable: true,
  },
  {
    name: 'time_in',
    label: 'Time In',
    field: 'time_in',
    align: 'center',
  },
  {
    name: 'break_out',
    label: 'Break Out',
    field: 'break_out',
    align: 'center',
  },
  {
    name: 'break_in',
    label: 'Break In',
    field: 'break_in',
    align: 'center',
  },
  {
    name: 'time_out',
    label: 'Time Out',
    field: 'time_out',
    align: 'center',
  },
  {
    name: 'total_hours',
    label: 'Total Hours',
    field: 'total_hours',
    align: 'center',
    sortable: true,
  },
  {
    name: 'action',
    label: 'Action',
    field: 'action',
    align: 'center',
  },
]

const rows = ref([
  {
    date: 'Monday, April 1, 2026',
    time_in: '08:00 AM',
    break_out: '12:00 PM',
    break_in: '01:00 PM',
    time_out: '05:00 PM',
    total_hours: '8',
  },
  {
    date: 'Tuesday, April 2, 2026',
    time_in: '08:15 AM',
    break_out: '12:00 PM',
    break_in: '01:00 PM',
    time_out: '05:10 PM',
    total_hours: '7.75',
  },
  {
    date: 'Wednesday, April 3, 2026',
    time_in: '-',
    break_out: '-',
    break_in: '-',
    time_out: '-',
    total_hours: '0',
  },
])

function editRow(row) {
  console.log('Edit clicked:', row)
  // 👉 you can open dialog here or route to edit page
}
</script>
