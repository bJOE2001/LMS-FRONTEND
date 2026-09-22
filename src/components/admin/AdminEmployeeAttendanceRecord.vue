<template>
  <div class="attendance-record-shell">
    <!-- Top Navigation Header -->
    <div class="row items-center justify-between q-mb-md no-print">
      <div>
        <div class="row items-center q-gutter-x-sm q-mb-xs">
          <q-btn
            outline
            dense
            no-caps
            color="green-9"
            icon="arrow_back"
            label="Back"
            class="back-btn q-px-sm"
            @click="goBack"
          />
        </div>

        <div class="text-h5 text-weight-bold text-dark q-mt-xs">
          Attendance Details of <span class="text-green-9 text-weight-bolder">{{ employeeName }}</span>
        </div>
        <div class="text-caption text-grey-7 text-uppercase text-weight-medium q-mt-none">
          {{ employeeDesignation }}
        </div>

        <div class="q-mt-xs">
          <span class="shift-pill">
            Regular Shift (8:00 AM - 5:00 PM)
          </span>
        </div>
      </div>

      <!-- Action Buttons & Month Selector -->
      <div class="row items-center q-gutter-sm q-mt-sm q-mt-md-none">
        <q-select
          v-model="selectedMonth"
          :options="monthOptions"
          emit-value
          map-options
          outlined
          dense
          label="Month"
          style="width: 130px"
          @update:model-value="fetchMonthlyDtr"
        />
        <q-select
          v-model="selectedYear"
          :options="yearOptions"
          outlined
          dense
          label="Year"
          style="width: 95px"
          @update:model-value="fetchMonthlyDtr"
        />

        <q-btn
          unelevated
          no-caps
          class="green-action-btn"
          icon="visibility"
          label="DTR Preview"
          @click="showPreviewDialog = true"
        />
        <q-btn
          unelevated
          no-caps
          class="green-action-btn"
          icon="print"
          label="Print DTR"
          @click="triggerPrint"
        />
        <q-btn
          unelevated
          no-caps
          class="green-action-btn"
          icon="file_download"
          label="Export DTR"
          @click="exportDtrCsv"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !dtrData" class="row justify-center q-py-xl">
      <q-spinner-dots color="green-9" size="48px" />
      <div class="full-width text-center text-grey-6 q-mt-md">Loading Daily Time Record...</div>
    </div>

    <!-- Error State -->
    <q-banner v-else-if="errorMessage" class="bg-red-1 text-negative rounded-borders q-my-md">
      <div class="row items-center q-gutter-x-sm">
        <q-icon name="error" size="24px" />
        <span>{{ errorMessage }}</span>
      </div>
    </q-banner>

    <template v-else>
      <!-- 5 Summary Stat Cards -->
      <div class="row q-col-gutter-sm q-mb-md no-print">
        <!-- Present Days -->
        <div class="col-12 col-sm-6 col-md">
          <div class="detail-stat-card">
            <div class="row items-center justify-between no-wrap">
              <span class="stat-card-label">Present Days</span>
              <q-icon name="check_circle" size="20px" class="text-green-8" />
            </div>
            <div class="stat-card-value text-dark q-mt-xs">
              {{ summaryMetrics.present_days }}
            </div>
          </div>
        </div>

        <!-- Absent Days -->
        <div class="col-12 col-sm-6 col-md">
          <div class="detail-stat-card">
            <div class="row items-center justify-between no-wrap">
              <span class="stat-card-label">Absent Days</span>
              <q-icon name="directions_walk" size="20px" class="text-deep-orange-7" />
            </div>
            <div class="stat-card-value text-dark q-mt-xs">
              {{ summaryMetrics.absent_days }}
            </div>
          </div>
        </div>

        <!-- Late -->
        <div class="col-12 col-sm-6 col-md">
          <div class="detail-stat-card">
            <div class="row items-center justify-between no-wrap">
              <span class="stat-card-label">Late</span>
              <q-icon name="warning" size="20px" class="text-amber-8" />
            </div>
            <div class="stat-card-value text-dark q-mt-xs">
              {{ summaryMetrics.late_days }}
            </div>
          </div>
        </div>

        <!-- Over Time -->
        <div class="col-12 col-sm-6 col-md">
          <div class="detail-stat-card">
            <div class="row items-center justify-between no-wrap">
              <span class="stat-card-label">Over Time</span>
              <q-icon name="alarm" size="20px" class="text-orange-9" />
            </div>
            <div class="stat-card-value text-dark q-mt-xs">
              {{ summaryMetrics.overtime_days }}
            </div>
          </div>
        </div>

        <!-- Total Worked Hours -->
        <div class="col-12 col-sm-6 col-md">
          <div class="detail-stat-card">
            <div class="row items-center justify-between no-wrap">
              <span class="stat-card-label">Total Worked Hours</span>
              <q-icon name="verified" size="20px" class="text-light-blue-8" />
            </div>
            <div class="stat-card-value text-dark q-mt-xs">
              {{ summaryMetrics.total_worked_hours }}
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs (DTR vs Overtime) -->
      <div class="q-mb-md no-print">
        <q-tabs
          v-model="activeTab"
          dense
          no-caps
          align="left"
          indicator-color="green-9"
          active-color="green-9"
          class="text-grey-7 attendance-tabs"
        >
          <q-tab name="dtr" icon="event" label="Daily Time Record (DTR)" class="q-px-md" />
          <q-tab name="overtime" icon="schedule" label="Overtime Records" class="q-px-md" />
        </q-tabs>
      </div>

      <!-- Tab Panels -->
      <q-tab-panels v-model="activeTab" animated class="bg-transparent no-print">
        <!-- Panel 1: Daily Time Record (DTR) -->
        <q-tab-panel name="dtr" class="q-pa-none">
          <q-card flat bordered class="rounded-borders bg-white">
            <q-card-section class="q-pb-sm">
              <div class="text-h6 text-weight-bold text-dark">Attendance Record</div>
            </q-card-section>

            <q-table
              :rows="monthDayRows"
              :columns="dtrColumns"
              row-key="record_date"
              flat
              :loading="loading"
              :rows-per-page-options="[5, 10, 15, 31]"
              v-model:pagination="pagination"
              class="attendance-detail-table"
            >
              <!-- Date Column -->
              <template #body-cell-date="props">
                <q-td :props="props" class="text-left text-weight-medium">
                  {{ formatDateLong(props.row.record_date) }}
                </q-td>
              </template>

              <!-- Time In (Morning) -->
              <template #body-cell-time_in="props">
                <q-td :props="props" class="text-left">
                  <span :class="isRowLate(props.row) ? 'text-negative text-weight-bold' : 'text-dark'">
                    {{ formatPunchTime(props.row.am_arrival) }}
                  </span>
                </q-td>
              </template>

              <!-- Time Out (Lunch) -->
              <template #body-cell-time_out="props">
                <q-td :props="props" class="text-left">
                  {{ formatPunchTime(props.row.am_departure) }}
                </q-td>
              </template>

              <!-- PM Time In (Afternoon) -->
              <template #body-cell-pm_time_in="props">
                <q-td :props="props" class="text-left">
                  {{ formatPunchTime(props.row.pm_arrival) }}
                </q-td>
              </template>

              <!-- PM Time Out (Afternoon Out) -->
              <template #body-cell-pm_time_out="props">
                <q-td :props="props" class="text-left">
                  <span :class="isRowUndertime(props.row) ? 'text-negative text-weight-bold' : 'text-dark'">
                    {{ formatPunchTime(props.row.pm_departure) }}
                  </span>
                </q-td>
              </template>

              <!-- Action Column (Clock with Pen) -->
              <template #body-cell-action="props">
                <q-td :props="props" class="text-left">
                  <q-btn
                    flat
                    round
                    dense
                    size="sm"
                    class="action-override-btn"
                    icon="edit_calendar"
                    @click="openOverrideDialog(props.row)"
                  >
                    <q-tooltip>Override Time</q-tooltip>
                  </q-btn>
                </q-td>
              </template>

              <template #no-data>
                <div class="full-width text-center q-pa-lg text-grey-6">
                  No attendance records found for this cutoff.
                </div>
              </template>
            </q-table>
          </q-card>
        </q-tab-panel>

        <!-- Panel 2: Overtime Records -->
        <q-tab-panel name="overtime" class="q-pa-none">
          <q-card flat bordered class="rounded-borders bg-white">
            <q-card-section class="q-pb-sm">
              <div class="text-h6 text-weight-bold text-dark">Overtime Records</div>
            </q-card-section>

            <q-table
              :rows="overtimeRows"
              :columns="overtimeColumns"
              row-key="record_date"
              flat
              :loading="loading"
              :rows-per-page-options="[5, 10, 15]"
              v-model:pagination="overtimePagination"
              class="attendance-detail-table"
            >
              <!-- Date Column -->
              <template #body-cell-date="props">
                <q-td :props="props" class="text-left text-weight-medium">
                  {{ formatDateLong(props.row.record_date) }}
                </q-td>
              </template>

              <!-- OT Time In -->
              <template #body-cell-ot_time_in="props">
                <q-td :props="props" class="text-left">
                  {{ formatPunchTime(props.row.ot_arrival) }}
                </q-td>
              </template>

              <!-- OT Time Out -->
              <template #body-cell-ot_time_out="props">
                <q-td :props="props" class="text-left">
                  {{ formatPunchTime(props.row.ot_departure) }}
                </q-td>
              </template>

              <!-- Overtime Hours -->
              <template #body-cell-ot_hours="props">
                <q-td :props="props" class="text-left font-mono">
                  {{ formatOtHours(props.row) }}
                </q-td>
              </template>

              <!-- Action Column -->
              <template #body-cell-action="props">
                <q-td :props="props" class="text-left">
                  <q-btn
                    flat
                    round
                    dense
                    size="sm"
                    class="action-override-btn"
                    icon="edit_calendar"
                    @click="openOverrideDialog(props.row)"
                  >
                    <q-tooltip>Override Overtime</q-tooltip>
                  </q-btn>
                </q-td>
              </template>

              <template #no-data>
                <div class="full-width text-center q-pa-lg text-grey-6">
                  No overtime entries recorded for this cutoff.
                </div>
              </template>
            </q-table>
          </q-card>
        </q-tab-panel>
      </q-tab-panels>
    </template>

    <!-- Override Time Dialog (Screenshot 3) -->
    <DtrOverrideDialog
      v-model="showOverrideDialog"
      :control-no="employeeControlNo"
      :employee-name="employeeName"
      :date="activeOverrideDate"
      :dtr="activeOverrideDtr"
      @saved="onOverrideSaved"
    />

    <!-- CSC Form 48 Preview Dialog -->
    <q-dialog v-model="showPreviewDialog" maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card class="bg-grey-2">
        <q-bar class="bg-green-9 text-white">
          <div class="text-weight-bold">Civil Service Form 48 — {{ employeeName }} ({{ dtrData?.period?.month_name }} {{ dtrData?.period?.year }})</div>
          <q-space />
          <q-btn dense flat icon="print" label="Print" class="q-mr-sm" @click="triggerPrint" />
          <q-btn dense flat icon="close" v-close-popup />
        </q-bar>
        <q-card-section class="q-pa-md flex flex-center">
          <div style="width: 100%; max-width: 900px;" class="bg-white q-pa-md rounded-borders shadow-2">
            <DailyTimeRecordTable
              v-if="dtrData"
              :records="dtrData.records"
              :employee="dtrData.employee"
              :period="dtrData.period"
              :summary="dtrData.summary"
              :loading="loading"
              @adjust="openOverrideDialog"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Hidden Printable Area for Direct Printing -->
    <div id="print-form-48-hidden" class="print-only">
      <DailyTimeRecordTable
        v-if="dtrData"
        :records="dtrData.records"
        :employee="dtrData.employee"
        :period="dtrData.period"
        :summary="dtrData.summary"
        :loading="loading"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import DailyTimeRecordTable from 'src/components/admin/DailyTimeRecordTable.vue'
import DtrOverrideDialog from 'src/components/admin/DtrOverrideDialog.vue'

const props = defineProps({
  employeeId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['back'])
const router = useRouter()
const $q = useQuasar()

const loading = ref(false)
const errorMessage = ref('')
const dtrData = ref(null)

const activeTab = ref('dtr')
const showPreviewDialog = ref(false)
const showOverrideDialog = ref(false)
const activeOverrideDate = ref('')
const activeOverrideDtr = ref(null)

const currentDate = new Date()
const selectedMonth = ref(currentDate.getMonth() + 1)
const selectedYear = ref(currentDate.getFullYear())

const pagination = ref({
  page: 1,
  rowsPerPage: 5, // Exact 5 rows per page as in Screenshot 2
})

const overtimePagination = ref({
  page: 1,
  rowsPerPage: 5,
})

const monthOptions = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
]

const yearOptions = computed(() => {
  const current = new Date().getFullYear()
  return [current - 2, current - 1, current, current + 1]
})

const dtrColumns = [
  { name: 'date', label: 'Date', field: 'record_date', align: 'left' },
  { name: 'time_in', label: 'Time In', field: 'am_arrival', align: 'left' },
  { name: 'time_out', label: 'Time Out', field: 'am_departure', align: 'left' },
  { name: 'pm_time_in', label: 'PM Time In', field: 'pm_arrival', align: 'left' },
  { name: 'pm_time_out', label: 'PM Time Out', field: 'pm_departure', align: 'left' },
  { name: 'action', label: 'Action', field: 'action', align: 'left' },
]

const overtimeColumns = [
  { name: 'date', label: 'Date', field: 'record_date', align: 'left' },
  { name: 'ot_time_in', label: 'Overtime In', field: 'ot_arrival', align: 'left' },
  { name: 'ot_time_out', label: 'Overtime Out', field: 'ot_departure', align: 'left' },
  { name: 'ot_hours', label: 'Rendered Overtime', field: 'overtime_minutes', align: 'left' },
  { name: 'action', label: 'Action', field: 'action', align: 'left' },
]

const employeeName = computed(() => {
  return dtrData.value?.employee?.name || 'Employee'
})

const employeeDesignation = computed(() => {
  return dtrData.value?.employee?.designation || 'Staff'
})

const employeeControlNo = computed(() => {
  return dtrData.value?.employee?.control_no || props.employeeId || ''
})

const summaryMetrics = computed(() => {
  const s = dtrData.value?.summary || {}
  return {
    present_days: s.present_days ?? s.days_present ?? 0,
    absent_days: s.absent_days ?? s.days_absent ?? 0,
    late_days: s.late_days ?? (s.total_late_minutes > 0 ? 1 : 0),
    overtime_days: s.overtime_days ?? 0,
    total_worked_hours: s.total_worked_hours ?? Number(s.total_rendered_hours || 0).toFixed(1),
  }
})

// Build full calendar day rows for the selected month
const monthDayRows = computed(() => {
  if (!dtrData.value?.records) return []
  return dtrData.value.records
})

// Overtime rows
const overtimeRows = computed(() => {
  if (!dtrData.value?.records) return []
  return dtrData.value.records.filter(r => (r.overtime_minutes && r.overtime_minutes > 0) || r.ot_arrival || r.ot_departure)
})

function formatDateLong(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatPunchTime(timeStr) {
  if (!timeStr || timeStr === '—' || timeStr === '-') return '—'
  if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) {
    return timeStr.trim()
  }
  const parts = timeStr.split(':')
  if (parts.length >= 2) {
    let h = parseInt(parts[0], 10)
    const m = parts[1]
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12
    h = h ? h : 12
    return `${h}:${m} ${ampm}`
  }
  return timeStr
}

function formatOtHours(row) {
  const mins = row.overtime_minutes || 0
  if (mins <= 0) return '—'
  const hrs = (mins / 60).toFixed(1)
  return `${hrs} hr(s) (${mins} mins)`
}

function isRowLate(row) {
  return Number(row.late_minutes || 0) > 0
}

function isRowUndertime(row) {
  return Number(row.undertime_minutes || 0) > 0
}

function goBack() {
  emit('back')
  router.push('/admin/attendance')
}

function openOverrideDialog(row) {
  activeOverrideDate.value = row?.record_date || `${selectedYear.value}-${String(selectedMonth.value).padStart(2, '0')}-01`
  activeOverrideDtr.value = row?.dtr || row
  showOverrideDialog.value = true
}

function onOverrideSaved() {
  fetchMonthlyDtr()
}

function triggerPrint() {
  window.print()
}

function exportDtrCsv() {
  if (!dtrData.value?.records?.length) {
    $q.notify({ type: 'warning', message: 'No attendance records available to export.' })
    return
  }

  const headers = ['Date', 'Day', 'Time In (AM)', 'Time Out (AM)', 'Time In (PM)', 'Time Out (PM)', 'Overtime In', 'Overtime Out', 'Late (Mins)', 'Undertime (Mins)', 'Rendered Hours', 'Status']
  const rows = dtrData.value.records.map(r => [
    r.record_date,
    r.day_of_week,
    r.am_arrival || '',
    r.am_departure || '',
    r.pm_arrival || '',
    r.pm_departure || '',
    r.ot_arrival || '',
    r.ot_departure || '',
    r.late_minutes || 0,
    r.undertime_minutes || 0,
    r.rendered_hours || '0.00',
    r.status || '',
  ])

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', `DTR_${employeeControlNo.value}_${selectedMonth.value}_${selectedYear.value}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

async function fetchMonthlyDtr() {
  if (!props.employeeId) return

  loading.value = true
  errorMessage.value = ''

  try {
    const res = await api.get(`/attendance/dtr/employee/${props.employeeId}`, {
      params: {
        month: selectedMonth.value,
        year: selectedYear.value,
      },
    })
    dtrData.value = res.data
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Failed to load employee Daily Time Record.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchMonthlyDtr()
})
</script>

<style scoped>
.attendance-record-shell {
  max-width: 1200px;
  margin: 0 auto;
}

.back-btn {
  border: 1.5px solid #2e7d32 !important;
  color: #2e7d32 !important;
  font-weight: 700 !important;
  border-radius: 4px;
}

.shift-pill {
  display: inline-block;
  background-color: #2e7d32;
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 3px 12px;
  border-radius: 4px;
}

.green-action-btn {
  background-color: #2e7d32 !important;
  color: #ffffff !important;
  font-weight: 600 !important;
  font-size: 0.88rem;
  border-radius: 4px;
  padding: 6px 14px;
}

.detail-stat-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px 14px;
  min-height: 75px;
}

.stat-card-label {
  font-size: 0.82rem;
  color: #475569;
  font-weight: 500;
}

.stat-card-value {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.1;
}

.attendance-tabs :deep(.q-tab__label) {
  font-weight: 600;
  font-size: 0.92rem;
}

.attendance-detail-table {
  background-color: #ffffff;
}

.attendance-detail-table :deep(th) {
  font-weight: 700;
  color: #1e293b;
  font-size: 0.88rem;
  border-bottom: 1.5px solid #e2e8f0;
}

.attendance-detail-table :deep(td) {
  font-size: 0.88rem;
  color: #334155;
  border-bottom: 1px solid #f1f5f9;
}

.action-override-btn {
  color: #2e7d32 !important;
}

@media print {
  .no-print {
    display: none !important;
  }

  .print-only {
    display: block !important;
  }
}

@media screen {
  .print-only {
    display: none !important;
  }
}
</style>
