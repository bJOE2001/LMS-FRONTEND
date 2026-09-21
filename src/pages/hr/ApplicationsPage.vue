<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-lg">
      <h1 class="text-h4 text-weight-bold q-ma-none">Applications</h1>
    </div>

    <HrApplicationsPanel application-type="LEAVE" />
  </q-page>
</template>

<script setup>
import HrApplicationsPanel from 'components/hr/HrApplicationsPanel.vue'
</script>
