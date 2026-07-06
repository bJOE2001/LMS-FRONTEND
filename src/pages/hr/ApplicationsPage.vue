<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-lg">
      <h1 class="text-h4 text-weight-bold q-ma-none">Applications</h1>
      <q-btn
        unelevated
        no-caps
        color="primary"
        icon="qr_code_scanner"
        label="Scan Form"
        @click="showScanner = true"
      />
    </div>

    <HrApplicationsPanel :key="panelKey" application-type="LEAVE" />

    <LeaveFormScannerDialog
      v-model="showScanner"
      @confirmed="onScannerConfirmed"
    />
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import HrApplicationsPanel from 'components/hr/HrApplicationsPanel.vue'
import LeaveFormScannerDialog from 'components/hr/LeaveFormScannerDialog.vue'

const showScanner = ref(false)
const panelKey = ref(0)

function onScannerConfirmed() {
  panelKey.value++
}
</script>
