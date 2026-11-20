<template>
  <DtrOverviewWorkspace
    title="Employee DTR"
    :readonly="true"
    :show-office-filter="true"
    :show-print="false"
    route-name="hr-dtr"
  />
</template>

<script setup>
import DtrOverviewWorkspace from 'src/components/attendance/DtrOverviewWorkspace.vue'
</script>
