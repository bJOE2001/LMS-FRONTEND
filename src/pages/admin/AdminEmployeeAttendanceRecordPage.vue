<template>
  <q-page class="q-pa-md">
    <AdminEmployeeAttendanceRecord :employee-id="employeeId" />
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AdminEmployeeAttendanceRecord from 'src/components/admin/AdminEmployeeAttendanceRecord.vue'

const route = useRoute()

const employeeId = computed(() => String(route.params.employeeId || ''))
</script>
