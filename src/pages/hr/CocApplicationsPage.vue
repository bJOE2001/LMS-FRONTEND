<template>
  <q-page class="q-pa-md">
    <div class="q-mb-lg coc-late-page__header">
      <div>
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">COC Applications</h1>
        <div class="text-body2 text-grey-7">
          Review late-filed COC submissions before they enter the normal admin approval flow.
        </div>
      </div>
    </div>

    <q-card flat bordered class="rounded-borders">
      <q-card-section>
        <div class="row items-center justify-between q-col-gutter-sm">
          <div class="col">
            <q-input
              v-model="search"
              dense
              outlined
              clearable
              placeholder="Search employee, office, month, date filed, or status"
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
          <div class="col-auto row items-center q-gutter-sm">
            <q-chip color="orange-2" text-color="orange-10" icon="pending_actions">
              {{ pendingLateCount }} pending late review
            </q-chip>
            <q-btn
              flat
              no-caps
              color="primary"
              icon="refresh"
              label="Refresh"
              :loading="loading"
              @click="loadApplications"
            />
          </div>
        </div>
      </q-card-section>

      <q-table
        :rows="filteredApplications"
        :columns="columns"
        row-key="id"
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 10 }"
        :rows-per-page-options="[10]"
      >
        <template #body-cell-employee="props">
          <q-td>
            <div class="text-weight-medium">{{ props.row.employeeName || 'Unknown' }}</div>
            <div class="text-caption text-grey-7">{{ props.row.employee_control_no || '-' }}</div>
          </q-td>
        </template>

        <template #body-cell-office="props">
          <q-td>
            <span class="text-grey-9">{{ props.row.office || props.row.department || 'N/A' }}</span>
          </q-td>
        </template>

        <template #body-cell-applicationMonth="props">
          <q-td>
            <span class="text-grey-9">{{ formatApplicationMonth(props.row) }}</span>
          </q-td>
        </template>

        <template #body-cell-inclusiveDates="props">
          <q-td>
            <div class="column q-gutter-xs">
              <span
                v-for="(line, index) in getInclusiveDateLines(props.row)"
                :key="`${props.row.id}-date-${index}`"
                class="text-grey-9"
              >
                {{ line }}
              </span>
            </div>
          </q-td>
        </template>

        <template #body-cell-dateFiled="props">
          <q-td>
            <span class="text-grey-9">{{ formatDate(props.row.dateFiled || props.row.date_filed) }}</span>
          </q-td>
        </template>

        <template #body-cell-lateDeadline="props">
          <q-td>
            <span class="text-grey-9">{{ formatDate(props.row.late_filing_deadline) }}</span>
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td>
            <StatusBadge :status="props.row.displayStatus || props.row.status || 'Pending'" />
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td class="text-center">
            <div class="row inline no-wrap justify-center q-gutter-x-xs">
              <q-btn flat dense round size="sm" icon="visibility" @click="openDetails(props.row)">
                <q-tooltip>View Details</q-tooltip>
              </q-btn>
              <q-btn
                v-if="isPendingLateReview(props.row)"
                flat
                dense
                round
                size="sm"
                icon="check_circle"
                color="green-7"
                @click="openActionDialog('approve', props.row)"
              >
                <q-tooltip>Approve Late Filing</q-tooltip>
              </q-btn>
              <q-btn
                v-if="isPendingLateReview(props.row)"
                flat
                dense
                round
                size="sm"
                icon="cancel"
                color="negative"
                @click="openActionDialog('reject', props.row)"
              >
                <q-tooltip>Reject Late Filing</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>

        <template #no-data>
          <div class="full-width row flex-center q-pa-lg text-grey-7">
            <template v-if="loading">
              <q-spinner color="primary" size="24px" class="q-mr-sm" />
              <span>Loading late-filed COC applications...</span>
            </template>
            <template v-else>
              <q-icon name="inbox" size="md" class="q-mr-sm" />
              <span>No late-filed COC applications found.</span>
            </template>
          </div>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="showDetailsDialog" persistent>
      <q-card v-if="selectedApplication" class="coc-late-details-card">
        <q-card-section class="row items-start no-wrap">
          <div>
            <div class="text-h6 text-weight-bold">Late COC Filing Details</div>
            <div class="text-caption text-grey-7">{{ selectedApplication.employeeName }}</div>
          </div>
          <q-space />
          <q-btn flat dense round icon="close" @click="showDetailsDialog = false" />
        </q-card-section>

        <q-separator />

        <q-card-section class="q-gutter-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-7">Employee</div>
              <div class="text-body1 text-weight-medium">{{ selectedApplication.employeeName || 'N/A' }}</div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-7">Control No.</div>
              <div class="text-body1 text-weight-medium">{{ selectedApplication.employee_control_no || 'N/A' }}</div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-7">Office</div>
              <div class="text-body1 text-weight-medium">{{ selectedApplication.office || selectedApplication.department || 'N/A' }}</div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-7">Application Month</div>
              <div class="text-body1 text-weight-medium">{{ formatApplicationMonth(selectedApplication) }}</div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-7">Date Filed</div>
              <div class="text-body1 text-weight-medium">{{ formatDate(selectedApplication.dateFiled || selectedApplication.date_filed) }}</div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-7">Late Filing Deadline</div>
              <div class="text-body1 text-weight-medium">{{ formatDate(selectedApplication.late_filing_deadline) }}</div>
            </div>
            <div class="col-12">
              <div class="text-caption text-grey-7">Status</div>
              <StatusBadge :status="selectedApplication.displayStatus || selectedApplication.status || 'Pending'" />
            </div>
          </div>

          <div v-if="selectedApplication.late_filing_review_remarks" class="q-mt-sm">
            <div class="text-caption text-grey-7">Late Filing Review Remarks</div>
            <div class="text-body2 text-grey-9">{{ selectedApplication.late_filing_review_remarks }}</div>
          </div>

          <div>
            <div class="text-subtitle2 text-weight-medium q-mb-sm">Overtime Rows</div>
            <q-markup-table flat bordered dense class="coc-late-details-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Nature of Overtime</th>
                  <th>Time</th>
                  <th>Raw Overtime</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in selectedApplication.rows || []"
                  :key="`${selectedApplication.id}-${row.line_no}`"
                >
                  <td>{{ formatDate(row.date) }}</td>
                  <td>{{ row.nature_of_overtime || 'N/A' }}</td>
                  <td>{{ formatTimeRange(row.time_from, row.time_to) }}</td>
                  <td>{{ formatMinutes(row.no_of_hours_and_minutes) }}</td>
                </tr>
              </tbody>
            </q-markup-table>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat no-caps color="grey-7" label="Close" @click="showDetailsDialog = false" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showActionDialog" persistent>
      <q-card style="width: 520px; max-width: 95vw">
        <q-card-section class="row items-center q-pb-sm">
          <div class="text-subtitle1 text-weight-bold">
            {{ actionMode === 'approve' ? 'Approve Late Filing' : 'Reject Late Filing' }}
          </div>
          <q-space />
          <q-btn flat dense round icon="close" :disable="actionLoading" @click="showActionDialog = false" />
        </q-card-section>

        <q-separator />

        <q-card-section>
          <div class="text-body2 q-mb-sm">
            {{
              actionMode === 'approve'
                ? 'This will release the late-filed COC into the normal department admin review flow.'
                : 'This will stop the late-filed COC from proceeding to department admin review.'
            }}
          </div>

          <div v-if="selectedApplication" class="text-caption text-grey-7 q-mb-md">
            <div><strong>Employee:</strong> {{ selectedApplication.employeeName }}</div>
            <div><strong>Application Month:</strong> {{ formatApplicationMonth(selectedApplication) }}</div>
            <div><strong>Late Filing Deadline:</strong> {{ formatDate(selectedApplication.late_filing_deadline) }}</div>
          </div>

          <q-input
            v-model="actionRemarks"
            type="textarea"
            autogrow
            outlined
            label="Remarks (Optional)"
            placeholder="Add context for this late-filing decision"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md q-gutter-sm">
          <q-btn flat no-caps color="grey-7" label="Cancel" :disable="actionLoading" @click="showActionDialog = false" />
          <q-btn
            unelevated
            no-caps
            :color="actionMode === 'approve' ? 'green-7' : 'negative'"
            :label="actionMode === 'approve' ? 'Approve Late Filing' : 'Reject Late Filing'"
            :loading="actionLoading"
            @click="submitAction"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import StatusBadge from 'components/StatusBadge.vue'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const $q = useQuasar()

const loading = ref(false)
const actionLoading = ref(false)
const search = ref('')
const applications = ref([])
const selectedApplication = ref(null)
const showDetailsDialog = ref(false)
const showActionDialog = ref(false)
const actionMode = ref('approve')
const actionRemarks = ref('')

const columns = [
  { name: 'employee', label: 'Employee', field: 'employeeName', align: 'left' },
  { name: 'office', label: 'Office', field: 'office', align: 'left' },
  { name: 'applicationMonth', label: 'Application Month', field: 'application_month', align: 'left' },
  { name: 'inclusiveDates', label: 'Inclusive Dates', field: 'selected_dates', align: 'left' },
  { name: 'dateFiled', label: 'Date Filed', field: 'dateFiled', align: 'left' },
  { name: 'lateDeadline', label: 'Late Filing Deadline', field: 'late_filing_deadline', align: 'left' },
  { name: 'status', label: 'Status', field: 'displayStatus', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const pendingLateCount = computed(() =>
  applications.value.filter((application) => isPendingLateReview(application)).length,
)

const filteredApplications = computed(() => {
  const normalizedSearch = String(search.value || '').trim().toLowerCase()
  if (!normalizedSearch) return applications.value

  return applications.value.filter((application) => {
    const haystack = [
      application?.employeeName,
      application?.employee_control_no,
      application?.office,
      application?.department,
      formatApplicationMonth(application),
      formatDate(application?.dateFiled || application?.date_filed),
      formatDate(application?.late_filing_deadline),
      application?.displayStatus,
      ...(application?.selected_dates || []),
      ...((application?.rows || []).map((row) => row?.nature_of_overtime || '')),
    ]
      .map((value) => String(value || '').toLowerCase())
      .join(' ')

    return haystack.includes(normalizedSearch)
  })
})

function normalizeStatusKey(value) {
  return String(value || '').trim().toUpperCase()
}

function isPendingLateReview(application) {
  return normalizeStatusKey(application?.rawStatus || application?.raw_status) === 'PENDING_LATE_HR'
}

function formatDate(value) {
  const raw = String(value || '').trim()
  if (!raw) return 'N/A'
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return raw

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatApplicationMonth(application) {
  const month = Number(application?.application_month || 0)
  const year = Number(application?.application_year || 0)
  if (!Number.isFinite(month) || month < 1 || month > 12 || !Number.isFinite(year) || year <= 0) {
    return 'N/A'
  }

  return `${monthNames[month - 1]} ${year}`
}

function getInclusiveDateLines(application) {
  const dates = Array.isArray(application?.selected_dates) ? application.selected_dates : []
  if (dates.length) {
    return dates.map((value) => formatDate(value))
  }

  const startDate = application?.startDate || application?.start_date
  const endDate = application?.endDate || application?.end_date
  if (startDate && endDate && startDate !== endDate) {
    return [`${formatDate(startDate)} to ${formatDate(endDate)}`]
  }

  if (startDate) {
    return [formatDate(startDate)]
  }

  return ['N/A']
}

function formatTimeRange(timeFrom, timeTo) {
  const fromText = String(timeFrom || '').trim() || 'N/A'
  const toText = String(timeTo || '').trim() || 'N/A'
  return `${fromText} - ${toText}`
}

function formatMinutes(value) {
  const totalMinutes = Number(value || 0)
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '0m'

  const wholeHours = Math.floor(totalMinutes / 60)
  const excessMinutes = totalMinutes % 60

  if (wholeHours && excessMinutes) return `${wholeHours}h ${excessMinutes}m`
  if (wholeHours) return `${wholeHours}h`
  return `${excessMinutes}m`
}

async function loadApplications() {
  loading.value = true
  try {
    const response = await api.get('/hr/coc-applications/late-filings')
    const list = Array.isArray(response?.data?.applications) ? response.data.applications : []
    applications.value = list
  } catch (error) {
    const message = resolveApiErrorMessage(error, 'Unable to load late-filed COC applications right now.')
    $q.notify({ type: 'negative', message, position: 'top' })
  } finally {
    loading.value = false
  }
}

function openDetails(application) {
  selectedApplication.value = application || null
  showDetailsDialog.value = true
}

function openActionDialog(mode, application) {
  actionMode.value = mode
  actionRemarks.value = ''
  selectedApplication.value = application || null
  showActionDialog.value = true
}

async function submitAction() {
  const applicationId = selectedApplication.value?.id
  if (!applicationId) {
    $q.notify({
      type: 'negative',
      message: 'Unable to identify this late-filed COC application.',
      position: 'top',
    })
    return
  }

  const endpoint = actionMode.value === 'approve'
    ? `/hr/coc-applications/${applicationId}/late-filing/approve`
    : `/hr/coc-applications/${applicationId}/late-filing/reject`

  actionLoading.value = true
  try {
    const response = await api.post(endpoint, {
      remarks: String(actionRemarks.value || '').trim(),
    })

    $q.notify({
      type: 'positive',
      message: response?.data?.message || 'Late-filing review saved.',
      position: 'top',
    })

    showActionDialog.value = false
    await loadApplications()
  } catch (error) {
    const message = resolveApiErrorMessage(error, 'Unable to save the late-filing decision right now.')
    $q.notify({ type: 'negative', message, position: 'top' })
  } finally {
    actionLoading.value = false
  }
}

onMounted(() => {
  loadApplications()
})
</script>

<style scoped>
.coc-late-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.coc-late-details-card {
  width: min(880px, 96vw);
  max-width: 96vw;
}

.coc-late-details-table {
  width: 100%;
}
</style>
