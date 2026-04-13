<template>
  <q-page class="q-pa-md">
    <div class="q-mb-lg">
      <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Late COC Application</h1>
    </div>

    <HrApplicationsPanel application-type="COC" application-source="late_filing" />
  </q-page>
</template>

<script setup>
import HrApplicationsPanel from 'components/hr/HrApplicationsPanel.vue'
</script>
