<template>
  <q-page class="q-pa-md">
    <div class="q-mb-lg">
      <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">All Applications</h1>
      <p class="text-grey-7">Review, approve, and reject leave applications across all departments</p>
    </div>

    <HrApplicationsPanel />
  </q-page>
</template>

<script setup>
import HrApplicationsPanel from 'components/hr/HrApplicationsPanel.vue'
</script>
