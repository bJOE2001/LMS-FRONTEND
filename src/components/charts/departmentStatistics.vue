<template>
  <q-card flat bordered class="rounded-borders full-width department-stats-card">
    <q-card-section class="q-pb-sm">
      <div class="row items-start justify-between q-col-gutter-sm">
        <div class="col-12 col-md">
          <div class="text-h6">Department Leave Statistics</div>
          <p class="text-caption text-grey-7 q-mb-none">
            Grouped by {{ selectedGroupByLabel }}
          </p>
        </div>
        <div class="col-12 col-md-auto">
          <q-select
            v-model="selectedGroupBy"
            :options="groupByOptions"
            emit-value
            map-options
            dense
            outlined
            label="Group By"
            class="department-group-select"
          />
        </div>
        <div v-if="usesDailyDateFilter" class="col-12 col-md-auto">
          <q-input
            v-model="selectedFilterDate"
            label="Date"
            outlined
            dense
            readonly
            class="department-secondary-filter"
          >
            <template #append>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="selectedFilterDate" mask="YYYY-MM-DD">
                    <div class="row items-center justify-end q-gutter-sm q-pa-sm">
                      <q-btn v-close-popup label="Close" color="primary" flat no-caps />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </div>
        <div v-if="usesWeeklyRangeFilter" class="col-12 col-md-auto">
          <q-input
            :model-value="selectedWeeklyRangeLabel"
            label="Week Range"
            outlined
            dense
            readonly
            class="department-secondary-filter"
          >
            <template #append>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date
                    v-model="selectedWeeklyRange"
                    range
                    mask="YYYY-MM-DD"
                    @update:model-value="handleWeeklyRangeChange"
                  >
                    <div class="row items-center justify-end q-gutter-sm q-pa-sm">
                      <q-btn v-close-popup label="Close" color="primary" flat no-caps />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </div>
        <div v-if="usesMonthFilter" class="col-12 col-md-auto">
          <q-select
            v-model="selectedFilterMonth"
            :options="monthOptions"
            emit-value
            map-options
            outlined
            dense
            label="Month"
            class="department-secondary-filter"
          />
        </div>
        <div v-if="usesYearFilter" class="col-12 col-md-auto">
          <q-select
            v-model="selectedFilterYear"
            :options="yearOptions"
            emit-value
            map-options
            outlined
            dense
            label="Year"
            class="department-secondary-filter"
          />
        </div>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section class="q-pa-none">
      <div v-if="isMobile" class="department-stats-mobile">
        <div
          v-if="isLoading || fetchErrorMessage || !departmentRows.length"
          class="full-width row flex-center q-pa-md text-grey-7"
        >
          <template v-if="isLoading">
            <q-spinner color="primary" size="24px" class="q-mr-sm" />
            <span>Loading department statistics...</span>
          </template>
          <template v-else-if="fetchErrorMessage">
            <q-icon name="error_outline" size="20px" class="q-mr-sm" />
            <span>{{ fetchErrorMessage }}</span>
          </template>
          <template v-else>
            <q-icon name="inbox" size="20px" class="q-mr-sm" />
            <span>No department statistics available for this grouping.</span>
          </template>
        </div>

        <div v-else class="department-mobile-list">
          <q-card
            v-for="row in departmentRows"
            :key="row.rowKey"
            flat
            bordered
            class="department-mobile-item"
          >
            <q-card-section class="department-mobile-item__header">
              <div class="department-mobile-item__identity">
                <div class="department-mobile-item__name">{{ row.department }}</div>
              </div>
              <q-badge
                color="primary"
                text-color="primary"
                class="department-mobile-item__total"
                outline
              >
                Total: {{ row.total }}
              </q-badge>
            </q-card-section>
            <q-separator />
            <q-card-section class="department-mobile-item__stats">
              <div
                v-for="column in leaveTypeColumns"
                :key="`${row.rowKey}-${column.name}`"
                class="department-mobile-stat"
              >
                <span class="department-mobile-stat__label">{{ column.mobileLabel }}</span>
                <span class="department-mobile-stat__value">{{ row[column.name] }}</span>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <q-table
        v-else
        :rows="departmentRows"
        :columns="tableColumns"
        row-key="rowKey"
        flat
        dense
        hide-pagination
        :pagination="tablePagination"
        :rows-per-page-options="[0]"
        table-header-class="bg-grey-2 text-weight-bold"
        :table-style="{ minWidth: tableMinWidth }"
        class="department-stats-table"
        :loading="isLoading"
      >
        <template #body-cell-total="props">
          <q-td :props="props" class="text-weight-bold text-primary">
            {{ props.row.total }}
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width row flex-center q-pa-md text-grey-7">
            <template v-if="isLoading">
              <q-spinner color="primary" size="24px" class="q-mr-sm" />
              <span>Loading department statistics...</span>
            </template>
            <template v-else-if="fetchErrorMessage">
              <q-icon name="error_outline" size="20px" class="q-mr-sm" />
              <span>{{ fetchErrorMessage }}</span>
            </template>
            <template v-else>
              <q-icon name="inbox" size="20px" class="q-mr-sm" />
              <span>No department statistics available for this grouping.</span>
            </template>
          </div>
        </template>
      </q-table>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useDepartmentStatisticsStore } from 'src/stores/department-statistics-store'

const props = defineProps({
  apiEndpoint: {
    type: String,
    default: '/hr/department-statistics',
  },
  autoFetch: {
    type: Boolean,
    default: true,
  },
  notifyOnFetchError: {
    type: Boolean,
    default: false,
  },
})

const $q = useQuasar()
const departmentStatisticsStore = useDepartmentStatisticsStore()
const today = new Date()
const todayYear = today.getFullYear()
const todayMonth = today.getMonth() + 1
const todayDateString = today.toISOString().slice(0, 10)

const tableMinWidth = '1620px'
const isMobile = computed(() => $q.screen.lt.md)
const selectedGroupBy = ref('daily')
const groupByOptions = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
]
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
const yearOptions = Array.from({ length: todayYear - 1999 }, (_unused, index) => {
  const value = todayYear - index
  return { label: String(value), value }
})
const selectedFilterDate = ref(todayDateString)
const selectedFilterMonth = ref(todayMonth)
const selectedFilterYear = ref(todayYear)
const selectedWeeklyRange = ref({
  from: todayDateString,
  to: todayDateString,
})
const normalizedApiEndpoint = computed(() => String(props.apiEndpoint || '').trim())
const DEPARTMENT_ACRONYM_STOP_WORDS = new Set([
  'A',
  'AN',
  'AND',
  'FOR',
  'IN',
  'OF',
  'OFFICE',
  'ON',
  'THE',
  'TO',
])

const leaveTypeColumns = [
  { name: 'vacationLeave', label: 'Vacation Leave', mobileLabel: 'Vacation' },
  { name: 'sickLeave', label: 'Sick Leave', mobileLabel: 'Sick' },
  {
    name: 'mandatoryForcedLeave',
    label: 'Mandatory / Forced Leave',
    mobileLabel: 'Mandatory',
  },
  { name: 'wellnessLeave', label: 'Wellness Leave', mobileLabel: 'Wellness' },
  { name: 'maternityLeave', label: 'Maternity Leave', mobileLabel: 'Maternity' },
  { name: 'paternityLeave', label: 'Paternity Leave', mobileLabel: 'Paternity' },
  {
    name: 'specialPrivilegeLeave',
    label: 'Special Privilege Leave(MC06)',
    mobileLabel: 'SPL (MC06)',
  },
  { name: 'soloParentLeave', label: 'Solo Parent Leave', mobileLabel: 'Solo Parent' },
]

const selectedGroupByLabel = computed(() =>
  groupByOptions.find((option) => option.value === selectedGroupBy.value)?.label || 'Daily',
)
const usesDailyDateFilter = computed(() => selectedGroupBy.value === 'daily')
const usesWeeklyRangeFilter = computed(() => selectedGroupBy.value === 'weekly')
const usesMonthFilter = computed(() => selectedGroupBy.value === 'monthly')
const usesYearFilter = computed(
  () => selectedGroupBy.value === 'monthly' || selectedGroupBy.value === 'yearly',
)
const selectedWeeklyRangeLabel = computed(() => {
  const from = String(selectedWeeklyRange.value?.from || '').trim()
  const to = String(selectedWeeklyRange.value?.to || '').trim()
  if (!from && !to) return ''
  if (from && to) return `${from} to ${to}`
  return from || to
})
const activeFilterSignature = computed(() => {
  if (selectedGroupBy.value === 'daily' || selectedGroupBy.value === 'weekly') {
    return `${selectedGroupBy.value}|${selectedFilterDate.value}`
  }

  if (selectedGroupBy.value === 'monthly') {
    return `${selectedGroupBy.value}|${selectedFilterMonth.value}|${selectedFilterYear.value}`
  }

  return `${selectedGroupBy.value}|${selectedFilterYear.value}`
})

const tableColumns = computed(() => [
  {
    name: 'department',
    label: 'Department',
    field: 'department',
    align: 'left',
    classes: 'text-weight-medium',
    headerClasses: 'text-weight-bold',
  },
  ...leaveTypeColumns.map((column) => ({
    ...column,
    field: column.name,
    align: 'center',
  })),
  {
    name: 'total',
    label: 'Total',
    field: 'total',
    align: 'center',
    headerClasses: 'text-weight-bold',
  },
])

const isLoading = computed(() =>
  departmentStatisticsStore.isLoading(normalizedApiEndpoint.value, selectedGroupBy.value, {
    filterDate: selectedFilterDate.value,
    filterMonth: selectedFilterMonth.value,
    filterYear: selectedFilterYear.value,
  }),
)

const fetchErrorMessage = computed(() =>
  departmentStatisticsStore.getError(normalizedApiEndpoint.value, selectedGroupBy.value, {
    filterDate: selectedFilterDate.value,
    filterMonth: selectedFilterMonth.value,
    filterYear: selectedFilterYear.value,
  }),
)

const departmentRows = computed(() =>
  departmentStatisticsStore
    .getRows(normalizedApiEndpoint.value, selectedGroupBy.value, {
      filterDate: selectedFilterDate.value,
      filterMonth: selectedFilterMonth.value,
      filterYear: selectedFilterYear.value,
    })
    .map((row) => {
      const total = leaveTypeColumns.reduce(
        (sum, column) => sum + Number(row[column.name] || 0),
        0,
      )

      return {
        ...row,
        department: toDepartmentCode(row?.department),
        total,
      }
    }),
)

const tablePagination = ref({
  page: 1,
  rowsPerPage: 0,
})

function formatDateToIso(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return todayDateString

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toDepartmentCode(value) {
  const source = String(value || '').trim()
  if (!source) return '-'

  if (!/\s/.test(source) && source === source.toUpperCase()) {
    return source
  }

  const words = source
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim().toUpperCase())
    .filter(Boolean)

  if (!words.length) return source

  const acronymWords = words.filter(
    (word) => !DEPARTMENT_ACRONYM_STOP_WORDS.has(word) && !/^\d+$/.test(word),
  )
  const selectedWords = acronymWords.length ? acronymWords : words
  const acronym = selectedWords.map((word) => word[0]).join('')

  return acronym || source
}

function parseIsoDate(value) {
  const normalized = String(value || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null

  const parsedDate = new Date(`${normalized}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) return null
  return parsedDate
}

function resolveWeekRangeFromDate(value) {
  const date = parseIsoDate(value) || new Date(`${todayDateString}T00:00:00`)
  const dayOfWeek = date.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const weekStart = new Date(date)
  weekStart.setDate(date.getDate() + diffToMonday)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  return {
    from: formatDateToIso(weekStart),
    to: formatDateToIso(weekEnd),
  }
}

function handleWeeklyRangeChange(rangeValue) {
  const range = rangeValue && typeof rangeValue === 'object' ? rangeValue : {}
  const anchorDate = String(range.from || range.to || selectedFilterDate.value || todayDateString)
  const normalizedRange = resolveWeekRangeFromDate(anchorDate)

  selectedWeeklyRange.value = normalizedRange
  selectedFilterDate.value = normalizedRange.from
}

function syncSecondaryFiltersByGroupBy(groupBy) {
  if (groupBy === 'daily') {
    selectedFilterDate.value = parseIsoDate(selectedFilterDate.value)
      ? selectedFilterDate.value
      : todayDateString
    selectedWeeklyRange.value = resolveWeekRangeFromDate(selectedFilterDate.value)
    selectedFilterMonth.value = null
    selectedFilterYear.value = null
    return
  }

  if (groupBy === 'weekly') {
    selectedFilterDate.value = parseIsoDate(selectedFilterDate.value)
      ? selectedFilterDate.value
      : todayDateString
    selectedWeeklyRange.value = resolveWeekRangeFromDate(selectedFilterDate.value)
    selectedFilterDate.value = selectedWeeklyRange.value.from
    selectedFilterMonth.value = null
    selectedFilterYear.value = null
    return
  }

  if (groupBy === 'monthly') {
    selectedFilterDate.value = ''
    selectedWeeklyRange.value = resolveWeekRangeFromDate(todayDateString)
    selectedFilterMonth.value = Number.isInteger(selectedFilterMonth.value)
      ? selectedFilterMonth.value
      : todayMonth
    selectedFilterYear.value = Number.isInteger(selectedFilterYear.value)
      ? selectedFilterYear.value
      : todayYear
    return
  }

  selectedFilterDate.value = ''
  selectedWeeklyRange.value = resolveWeekRangeFromDate(todayDateString)
  selectedFilterMonth.value = null
  selectedFilterYear.value = Number.isInteger(selectedFilterYear.value)
    ? selectedFilterYear.value
    : todayYear
}

async function fetchDepartmentStatistics(groupBy = selectedGroupBy.value, forceRefresh = false) {
  if (!normalizedApiEndpoint.value) return []

  return departmentStatisticsStore.fetchDepartmentStatistics({
    apiEndpoint: normalizedApiEndpoint.value,
    groupBy,
    filterDate: selectedFilterDate.value,
    filterMonth: selectedFilterMonth.value,
    filterYear: selectedFilterYear.value,
    force: forceRefresh,
    notifyOnError: props.notifyOnFetchError,
    notify: (message) => {
      $q.notify({ type: 'negative', message, position: 'top' })
    },
  })
}

watch(selectedGroupBy, (nextGroupBy) => {
  syncSecondaryFiltersByGroupBy(nextGroupBy)
})

watch(activeFilterSignature, () => {
  if (!props.autoFetch) return
  fetchDepartmentStatistics(selectedGroupBy.value)
})

watch(
  () => props.apiEndpoint,
  (nextEndpoint, previousEndpoint) => {
    if (nextEndpoint === previousEndpoint) return

    const previousApiEndpoint = String(previousEndpoint || '').trim()
    if (previousApiEndpoint) {
      departmentStatisticsStore.clearForEndpoint(previousApiEndpoint)
    }

    if (props.autoFetch) {
      fetchDepartmentStatistics(selectedGroupBy.value, true)
    }
  },
)

onMounted(() => {
  syncSecondaryFiltersByGroupBy(selectedGroupBy.value)
  if (props.autoFetch) {
    fetchDepartmentStatistics(selectedGroupBy.value, true)
  }
})

defineExpose({
  fetchDepartmentStatistics,
})
</script>

<style scoped>
.department-stats-card {
  width: 100%;
}

.department-group-select {
  width: 100%;
}

.department-secondary-filter {
  width: 100%;
}

.department-stats-mobile {
  padding: 8px;
}

.department-mobile-list {
  display: grid;
  gap: 10px;
}

.department-mobile-item {
  border-radius: 12px;
}

.department-mobile-item__header {
  padding: 10px 12px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.department-mobile-item__identity {
  min-width: 0;
}

.department-mobile-item__name {
  min-width: 0;
  color: #223245;
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.3;
  word-break: break-word;
}

.department-mobile-item__total {
  flex: 0 0 auto;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}

.department-mobile-item__stats {
  padding: 10px 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.department-mobile-stat {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid #e4ebf2;
  border-radius: 8px;
  background: #f8fbfe;
  padding: 6px 8px;
}

.department-mobile-stat__label {
  min-width: 0;
  color: #6b7a89;
  font-size: 0.68rem;
  line-height: 1.2;
}

.department-mobile-stat__value {
  flex: 0 0 auto;
  color: #223245;
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1;
}

.department-stats-table :deep(.q-table__middle) {
  overflow-x: auto;
}

.department-stats-table :deep(.q-table thead th),
.department-stats-table :deep(.q-table tbody td) {
  white-space: nowrap;
  padding: 7px 10px;
}

.department-stats-table :deep(.q-table thead th:first-child),
.department-stats-table :deep(.q-table tbody td:first-child) {
  min-width: 210px;
}

.department-stats-table :deep(.q-table thead th:last-child) {
  position: sticky;
  right: 0;
  z-index: 3;
  background: #eceff1;
  box-shadow: -1px 0 0 #dce3e8;
}

.department-stats-table :deep(.q-table tbody td:last-child) {
  position: sticky;
  right: 0;
  z-index: 2;
  background: #f5f8fb;
  box-shadow: -1px 0 0 #e1e5ea;
}

.department-stats-table :deep(.q-table tbody tr:hover td:last-child) {
  background: #e8f2ff;
}

@media (max-width: 359px) {
  .department-mobile-item__stats {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (min-width: 768px) {
  .department-group-select {
    width: 180px;
  }

  .department-secondary-filter {
    width: 180px;
  }
}
</style>
