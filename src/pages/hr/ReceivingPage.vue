<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md no-wrap q-gutter-x-sm">
      <h1 class="text-weight-bold q-ma-none ellipsis" :class="$q.screen.lt.sm ? 'text-h6' : 'text-h4'" style="line-height: 1.2;">
        Receiving Applications
      </h1>
      
      <div class="row q-gutter-x-xs no-wrap">
        <q-btn
          unelevated
          no-caps
          color="secondary"
          icon="download"
          :label="$q.screen.lt.sm ? '' : 'Export'"
          @click="showExportDialog = true"
          :padding="$q.screen.lt.sm ? 'sm' : 'sm md'"
        >
          <q-tooltip v-if="$q.screen.lt.sm">Export</q-tooltip>
        </q-btn>
        
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="qr_code_scanner"
          :label="$q.screen.lt.sm ? '' : 'Scan Form'"
          @click="showScanner = true"
          :padding="$q.screen.lt.sm ? 'sm' : 'sm md'"
        >
          <q-tooltip v-if="$q.screen.lt.sm">Scan Form</q-tooltip>
        </q-btn>
      </div>
    </div>

    <HrApplicationsPanel :key="panelKey" application-type="LEAVE" :pending-receive="true" />

    <LeaveFormScannerDialog
      v-model="showScanner"
      @confirmed="onScannerConfirmed"
    />

    <AppDialog
      v-model="showExportDialog"
      title="Export Received Applications"
      header-class="bg-white text-dark"
      max-width="400px"
      :persistent="false"
      :loading="exporting"
      body-class="q-pt-none q-px-md"
      actions-class="q-pa-md q-gutter-sm"
      cancel-color="grey-7"
      submit-label="Export"
      submit-color="primary"
      @submit="performExport"
    >
      <HeaderDateRangePicker
        v-model:start-date="exportFromDate"
        v-model:end-date="exportToDate"
        label="Export Date Range"
        :clearable="false"
        full-width
        menu-anchor="bottom left"
        menu-self="top left"
        class="q-mb-md"
      />
      <div v-if="dateError" class="text-caption text-negative q-mb-sm">
        {{ dateError }}
      </div>

      <div class="text-subtitle2 q-mb-sm">Export Format</div>
      <div class="q-gutter-sm">
        <q-radio v-model="exportFormat" val="excel" label="Excel (.xlsx)" />
        <q-radio v-model="exportFormat" val="pdf" label="PDF (.pdf)" />
      </div>
    </AppDialog>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { api } from 'boot/axios'
import { useQuasar } from 'quasar'
import HrApplicationsPanel from 'components/hr/HrApplicationsPanel.vue'
import LeaveFormScannerDialog from 'components/hr/LeaveFormScannerDialog.vue'
import HeaderDateRangePicker from 'src/components/common/HeaderDateRangePicker.vue'
import { exportReceivingExcel, exportReceivingPdf } from 'src/utils/receiving-export.js'

const q = useQuasar()
const showScanner = ref(false)
const panelKey = ref(0)

const showExportDialog = ref(false)
const exportFromDate = ref(new Date().toISOString().slice(0, 10))
const exportToDate = ref(new Date().toISOString().slice(0, 10))
const exportFormat = ref('excel')
const exporting = ref(false)

const dateError = computed(() => {
  if (!exportFromDate.value || !exportToDate.value) {
    return 'Both dates are required.'
  }
  if (exportFromDate.value > exportToDate.value) {
    return 'From Date cannot be later than To Date.'
  }
  return ''
})

function onScannerConfirmed() {
  panelKey.value++
}

async function performExport() {
  if (dateError.value) return

  exporting.value = true
  try {
    const { data } = await api.get('/hr/receiving/export', {
      params: {
        from_date: exportFromDate.value,
        to_date: exportToDate.value,
      }
    })

    const applications = data.applications || []
    if (!applications.length) {
      q.notify({
        type: 'warning',
        message: 'No records found for the selected date range.',
      })
      exporting.value = false
      return
    }

    const dateRangeLabel = exportFromDate.value === exportToDate.value 
      ? exportFromDate.value 
      : `${exportFromDate.value}_to_${exportToDate.value}`

    if (exportFormat.value === 'excel') {
      exportReceivingExcel(applications, dateRangeLabel)
    } else {
      await exportReceivingPdf(applications, dateRangeLabel)
    }

    showExportDialog.value = false
  } catch (error) {
    console.error('Export failed:', error)
    q.notify({
      type: 'negative',
      message: 'Failed to export records. Please try again.',
    })
  } finally {
    exporting.value = false
  }
}
</script>
