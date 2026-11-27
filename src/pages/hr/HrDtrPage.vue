<template>
  <AttendanceManagement
    title="Daily Time Records"
    :readonly="true"
    :show-office-filter="true"
    :show-print="false"
    route-name="hr-dtr"
  />
</template>

<script setup>
import AttendanceManagement from 'src/pages/admin/AttendanceManagement.vue'
</script>
