<template>
  <DtrOverviewWorkspace
    title="Attendance Management"
    :readonly="false"
    :show-office-filter="false"
    :show-pull-punches="true"
    :show-print="true"
    route-name="admin-attendance"
  />
</template>

<script setup>
import DtrOverviewWorkspace from 'src/components/attendance/DtrOverviewWorkspace.vue'
</script>
