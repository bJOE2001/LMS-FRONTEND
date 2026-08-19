<template>
  <q-page class="coc-applications-page q-pa-sm q-pa-md-md">
    <div class="row items-center justify-between q-mb-md q-mb-md-lg coc-applications-header">
      <h1 class="text-h5 text-h4-md text-weight-bold q-mt-none q-mb-none">COC Applications</h1>
    </div>

    <HrApplicationsPanel application-type="COC" />
  </q-page>
</template>

<script setup>
import HrApplicationsPanel from 'components/hr/HrApplicationsPanel.vue'
</script>
