<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-lg">
      <h1 class="text-h4 text-weight-bold q-mt-none q-mb-none">
        Print Logs
      </h1>
      <q-space />
    </div>

    <!-- Indeterminate Top Progress Bar for Background Reloads -->
    <q-linear-progress
      v-if="loading && logs.length > 0"
      indeterminate
      color="green-9"
      size="3px"
      class="q-mb-md rounded-borders top-reload-bar"
    />

    <!-- ========================================================= -->
    <!-- SKELETON LOADING STATE (Initial Page Load)               -->
    <!-- ========================================================= -->
    <div v-if="loading && logs.length === 0" class="skeleton-suite">
      <q-card flat bordered class="rounded-borders">
        <q-card-section>
          <div class="row justify-between items-center q-mb-md">
            <div class="text-h6">Print History</div>
            <q-skeleton type="rect" width="220px" height="36px" class="rounded-borders" animation="wave" />
          </div>

          <div class="q-pa-sm">
            <!-- Columns Header Placeholder -->
            <div class="row items-center q-pb-sm border-bottom q-col-gutter-sm text-grey-5">
              <div class="col-1"><q-skeleton type="text" width="60%" height="16px" animation="wave" /></div>
              <div class="col-2"><q-skeleton type="text" width="60%" height="16px" animation="wave" /></div>
              <div class="col-2"><q-skeleton type="text" width="60%" height="16px" animation="wave" /></div>
              <div class="col-1"><q-skeleton type="text" width="60%" height="16px" animation="wave" /></div>
              <div class="col-2"><q-skeleton type="text" width="60%" height="16px" animation="wave" /></div>
              <div class="col-2"><q-skeleton type="text" width="60%" height="16px" animation="wave" /></div>
              <div class="col-2"><q-skeleton type="text" width="60%" height="16px" animation="wave" /></div>
            </div>

            <!-- 8 Skeleton Rows -->
            <div
              v-for="r in 8"
              :key="'sk-row-' + r"
              class="row items-center q-py-md border-bottom q-col-gutter-sm"
              :class="{ 'bg-grey-1': r % 2 === 0 }"
            >
              <div class="col-1"><q-skeleton type="text" width="40px" height="16px" animation="wave" /></div>
              <div class="col-2"><q-skeleton type="text" width="130px" height="16px" animation="wave" /></div>
              <div class="col-2"><q-skeleton type="rect" width="100px" height="22px" class="rounded-borders" animation="wave" /></div>
              <div class="col-1"><q-skeleton type="text" width="75px" height="16px" animation="wave" /></div>
              <div class="col-2"><q-skeleton type="text" width="120px" height="16px" animation="wave" /></div>
              <div class="col-2">
                <q-skeleton type="text" width="90px" height="16px" animation="wave" />
                <q-skeleton type="rect" width="55px" height="18px" class="rounded-borders q-mt-xs" animation="wave" />
              </div>
              <div class="col-2">
                <q-skeleton type="text" width="85px" height="16px" animation="wave" />
                <q-skeleton type="text" width="50px" height="12px" class="q-mt-xs" animation="wave" />
              </div>
            </div>
          </div>

          <!-- Skeleton Table Footer -->
          <div class="q-pa-sm row items-center justify-between bg-grey-1 border-top">
            <q-skeleton type="text" width="120px" height="16px" animation="wave" />
            <q-skeleton type="rect" width="160px" height="30px" class="rounded-borders" animation="wave" />
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- ========================================================= -->
    <!-- REAL CONTENT SUITE                                        -->
    <!-- ========================================================= -->
    <div v-else :class="{ 'content-reloading': loading && logs.length > 0 }">
      <q-card flat bordered class="rounded-borders">
      <q-card-section>
        <div class="row justify-between items-center q-mb-md">
          <div class="text-h6">Print History</div>
          <q-input
            v-model="search"
            outlined
            dense
            debounce="400"
            placeholder="Search logs..."
            clearable
            @update:model-value="onSearch"
          >
            <template #prepend>
              <q-icon name="search" size="sm" color="grey-6" />
            </template>
          </q-input>
        </div>

        <q-table
          :rows="logs"
          :columns="columns"
          row-key="id"
          flat
          :loading="loading"
          :rows-per-page-options="[15, 30, 50]"
          v-model:pagination="pagination"
          @request="onRequest"
        >
          <template #body-cell-tracking_no="props">
            <q-td :props="props">
              <div class="text-weight-bold text-primary">
                {{ props.row.leave_application ? '#' + props.row.leave_application.id : (props.row.leave_application_id ? '#' + props.row.leave_application_id : '-') }}
              </div>
            </q-td>
          </template>

          <template #body-cell-applicant="props">
            <q-td :props="props">
              <div>
                {{ props.row.leave_application?.employee_name || props.row.leave_application?.employee_control_no || '-' }}
              </div>
            </q-td>
          </template>

          <template #body-cell-leave_type="props">
            <q-td :props="props">
              <div class="text-weight-medium">
                {{ getLeaveType(props.row) }}
              </div>
            </q-td>
          </template>

          <template #body-cell-date_filed="props">
            <q-td :props="props">
              <div>{{ formatFiledDate(props.row) }}</div>
            </q-td>
          </template>

          <template #body-cell-inclusive_dates="props">
            <q-td :props="props">
              <div v-if="getInclusiveDateLines(props.row).length > 0" class="column q-gutter-y-xs">
                <span
                  v-for="(line, idx) in getInclusiveDateLines(props.row)"
                  :key="idx"
                  class="text-weight-medium text-grey-9"
                >
                  {{ line }}
                </span>
              </div>
              <div v-else class="text-grey-6">-</div>
            </q-td>
          </template>

          <template #body-cell-printed_by="props">
            <q-td :props="props">
              <div>{{ props.row.printed_by_name || '-' }}</div>
              <q-badge
                :color="props.row.printed_by_type === 'ADMIN' ? 'negative' : 'primary'"
                class="q-mt-xs"
              >
                {{ props.row.printed_by_type }}
              </q-badge>
            </q-td>
          </template>

          <template #body-cell-created_at="props">
            <q-td :props="props">
              <div>{{ formatDate(props.row.created_at) }}</div>
              <div class="text-caption text-grey">{{ formatTime(props.row.created_at) }}</div>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from 'boot/axios'
import { date } from 'quasar'
import { getApplicationSelectedDates, normalizeIsoDate } from 'src/utils/leave-date-locking'

const route = useRoute()
const loading = ref(false)
const logs = ref([])
const search = ref('')

const pagination = ref({
  sortBy: 'created_at',
  descending: true,
  page: 1,
  rowsPerPage: 15,
  rowsNumber: 0
})

const columns = [
  { name: 'tracking_no', label: 'ID', align: 'left', sortable: false },
  { name: 'applicant', label: 'Applicant', align: 'left', sortable: false },
  { name: 'leave_type', label: 'Type of Leave', align: 'left', sortable: false },
  { name: 'date_filed', label: 'Date Filed', align: 'left', sortable: false },
  { name: 'inclusive_dates', label: 'Inclusive Dates', align: 'left', sortable: false },
  { name: 'printed_by', label: 'Printed By', align: 'left', sortable: true, field: 'printed_by_name' },
  { name: 'created_at', label: 'Date/Time Printed', align: 'left', field: 'created_at', sortable: true },
  { name: 'ip_address', label: 'IP Address', align: 'left', field: 'ip_address', sortable: false }
]

const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  
  loading.value = true
  const endpoint = route.path.startsWith('/hr') ? '/hr/application-print-logs' : '/admin/application-print-logs'
  
  try {
    const response = await api.get(endpoint, {
      params: {
        page,
        rowsPerPage,
        sortBy,
        descending,
        search: search.value
      }
    })
    
    logs.value = response.data.data
    
    pagination.value.rowsNumber = response.data.total
    pagination.value.page = response.data.current_page
    pagination.value.rowsPerPage = response.data.per_page
    pagination.value.sortBy = sortBy
    pagination.value.descending = descending
  } catch (error) {
    console.error('Error fetching print logs:', error)
  } finally {
    loading.value = false
  }
}

const onSearch = () => {
  pagination.value.page = 1
  onRequest({ pagination: pagination.value })
}

const formatDate = (val) => {
  if (!val) return '-'
  return date.formatDate(val, 'MMM D, YYYY')
}

const formatTime = (val) => {
  if (!val) return '-'
  return date.formatDate(val, 'hh:mm A')
}

const getLeaveType = (row) => {
  const app = row?.leave_application
  if (!app) return '-'

  if (app.is_monetization) {
    const rawType = app.leave_type?.name || app.leave_type_name || app.leaveType?.name
    return rawType ? `${rawType} (Monetization)` : 'Monetization'
  }

  return app.leave_type?.name || app.leave_type_name || app.leaveType?.name || '-'
}

const getFiledRawDate = (row) => {
  const app = row?.leave_application
  return app?.created_at || app?.date_filed || app?.dateFiled || app?.filed_at || null
}

const formatFiledDate = (row) => {
  const val = getFiledRawDate(row)
  if (!val) return '-'
  return formatDate(val)
}

const formatGroupedInclusiveDateLines = (dateValues) => {
  if (!Array.isArray(dateValues) || dateValues.length === 0) return []

  const groupedByMonthYear = new Map()
  const sortedDates = [...new Set(dateValues.filter(Boolean))].sort(
    (left, right) => Date.parse(left) - Date.parse(right),
  )

  for (const rawDate of sortedDates) {
    const isoDate = normalizeIsoDate(rawDate)
    const parsedDate = isoDate ? new Date(`${isoDate}T12:00:00`) : new Date(rawDate)
    if (Number.isNaN(parsedDate.getTime())) continue

    const monthName = parsedDate.toLocaleDateString('en-US', { month: 'short' })
    const year = parsedDate.getFullYear()
    const day = parsedDate.getDate()
    const groupKey = `${year}-${parsedDate.getMonth()}`

    if (!groupedByMonthYear.has(groupKey)) {
      groupedByMonthYear.set(groupKey, { monthName, year, days: [] })
    }

    groupedByMonthYear.get(groupKey).days.push(day)
  }

  return Array.from(groupedByMonthYear.values())
    .map((group) => {
      const uniqueDays = [...new Set(group.days)].sort((a, b) => a - b)
      if (!uniqueDays.length) return ''

      const dayRanges = []
      let rangeStart = uniqueDays[0]
      let rangeEnd = uniqueDays[0]

      for (let index = 1; index < uniqueDays.length; index += 1) {
        const currentDay = uniqueDays[index]
        if (currentDay === rangeEnd + 1) {
          rangeEnd = currentDay
          continue
        }

        dayRanges.push([rangeStart, rangeEnd])
        rangeStart = currentDay
        rangeEnd = currentDay
      }

      dayRanges.push([rangeStart, rangeEnd])

      const rangeLabels = dayRanges.map(([startDay, endDay]) => {
        let dayLabel = String(startDay)
        if (endDay > startDay) {
          dayLabel = endDay === startDay + 1 ? `${startDay}, ${endDay}` : `${startDay}-${endDay}`
        }
        return `${group.monthName} ${dayLabel}`
      })

      const hasSingleDayOnly = dayRanges.length === 1 && dayRanges[0][0] === dayRanges[0][1]
      if (hasSingleDayOnly) {
        return `${group.monthName} ${dayRanges[0][0]}, ${group.year}`
      }

      return `${rangeLabels.join(', ')} ${group.year}`
    })
    .filter(Boolean)
}

const getInclusiveDateLines = (row) => {
  const app = row?.leave_application
  if (!app) return []
  if (app.is_monetization) return ['N/A']

  const selectedDates = getApplicationSelectedDates(app)
  if (!selectedDates || selectedDates.length === 0) {
    return ['-']
  }

  const grouped = formatGroupedInclusiveDateLines(selectedDates)
  return grouped.length > 0 ? grouped : ['-']
}

onMounted(() => {
  onRequest({ pagination: pagination.value })
})
</script>

<style scoped>
.top-reload-bar {
  box-shadow: 0 1px 4px rgba(46, 125, 50, 0.25);
}

.content-reloading {
  opacity: 0.55;
  pointer-events: none;
  transition: opacity 0.25s ease-in-out;
}

.skeleton-suite {
  animation: fadeIn 0.2s ease-in;
}

.border-bottom {
  border-bottom: 1px solid #f1f5f9;
}

.border-top {
  border-top: 1px solid #f1f5f9;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
