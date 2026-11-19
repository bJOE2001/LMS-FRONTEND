<template>
  <q-page class="coc-applications-page q-pa-md">
    <div class="row items-center justify-between q-mb-lg coc-applications-header">
      <h1 class="text-h4 text-weight-bold q-ma-none">COC Applications</h1>
    </div>

    <HrApplicationsPanel application-type="COC" />
  </q-page>
</template>

<script setup>
import HrApplicationsPanel from 'components/hr/HrApplicationsPanel.vue'
</script>
