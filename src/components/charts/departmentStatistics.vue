<template>
  <q-card flat bordered class="rounded-borders full-width department-stats-card">
    <q-card-section class="q-pb-sm">
      <div class="row items-start justify-between q-col-gutter-sm">
        <div class="col-12 col-md">
          <div class="text-h6">Department Leave Statistics</div>
          <p class="text-caption text-grey-7 q-mb-none">
            {{ selectedPeriodLabel }} view
          </p>
        </div>
        <div class="col-12 col-md-auto">
          <q-btn-toggle
            v-model="selectedPeriod"
            :options="periodToggleOptions"
            no-caps
            unelevated
            dense
            toggle-color="primary"
            color="grey-3"
            text-color="grey-8"
            class="department-period-toggle"
            :spread="isMobile"
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
            <span>No department statistics available for this period.</span>
          </template>
        </div>

        <div v-else class="department-mobile-list">
          <q-card
            v-for="row in departmentRows"
            :key="row.department"
            flat
            bordered
            class="department-mobile-item"
          >
            <q-card-section class="department-mobile-item__header">
              <div class="department-mobile-item__name">{{ row.department }}</div>
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
                :key="`${row.department}-${column.name}`"
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
        row-key="department"
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
              <span>No department statistics available for this period.</span>
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
import { api } from 'src/boot/axios'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

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

const tableMinWidth = '1460px'
const isMobile = computed(() => $q.screen.lt.md)
const selectedPeriod = ref('daily')
const periodOptions = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
]
const periodToggleOptions = computed(() => {
  if (!$q.screen.xs) return periodOptions

  return [
    { label: 'Day', value: 'daily' },
    { label: 'Week', value: 'weekly' },
    { label: 'Month', value: 'monthly' },
    { label: 'Year', value: 'yearly' },
  ]
})

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

// Single backend mapping variable: update these keys to match your API exactly.
const backendFieldMap = {
  // Optional wrapper key path from API response root.
  // Example: 'departmentStatistics' or 'data.departmentStatistics'
  responseDataPath: '',

  // Optional path for each period container.
  // Example: { daily: 'daily', weekly: 'weekly', monthly: 'monthly', yearly: 'yearly' }
  rowsPathByPeriod: {
    daily: '',
    weekly: '',
    monthly: '',
    yearly: '',
  },

  // Optional rows key path inside responseDataPath / rowsPathByPeriod.
  // Example: 'rows'
  rowsPath: '',

  // Row field mappings
  department: 'department',
  vacationLeave: 'vacationLeave',
  sickLeave: 'sickLeave',
  mandatoryForcedLeave: 'mandatoryForcedLeave',
  mco6Leave: 'mco6Leave',
  wellnessLeave: 'wellnessLeave',
  maternityLeave: 'maternityLeave',
  paternityLeave: 'paternityLeave',
  specialPrivilegeLeave: 'specialPrivilegeLeave',
  soloParentLeave: 'soloParentLeave',
}

const periodKeys = ['daily', 'weekly', 'monthly', 'yearly']
const isLoading = ref(false)
const fetchErrorMessage = ref('')
const loadStateByPeriod = ref(createPeriodState(false))
const departmentRowsByPeriod = ref(createPeriodState([]))
let activeRequestId = 0

const selectedPeriodLabel = computed(() =>
  periodOptions.find((option) => option.value === selectedPeriod.value)?.label || 'Daily',
)

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

function createPeriodState(defaultValue) {
  return periodKeys.reduce((result, periodKey) => {
    result[periodKey] = Array.isArray(defaultValue) ? [...defaultValue] : defaultValue
    return result
  }, {})
}

function toSafeCount(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return Math.round(parsed)
}

function normalizePeriodKey(value) {
  if (periodKeys.includes(value)) return value
  return 'daily'
}

function readByPath(source, path) {
  if (!path) return source
  return String(path)
    .split('.')
    .reduce((value, key) => {
      if (!value || typeof value !== 'object') return undefined
      return value[key]
    }, source)
}

function normalizeDepartmentRow(rawRow) {
  if (!rawRow || typeof rawRow !== 'object' || Array.isArray(rawRow)) return null

  const departmentName = String(readByPath(rawRow, backendFieldMap.department) || '').trim()
  if (!departmentName) return null

  return {
    department: departmentName,
    vacationLeave: toSafeCount(readByPath(rawRow, backendFieldMap.vacationLeave)),
    sickLeave: toSafeCount(readByPath(rawRow, backendFieldMap.sickLeave)),
    mandatoryForcedLeave: toSafeCount(readByPath(rawRow, backendFieldMap.mandatoryForcedLeave)),
    mco6Leave: toSafeCount(readByPath(rawRow, backendFieldMap.mco6Leave)),
    wellnessLeave: toSafeCount(readByPath(rawRow, backendFieldMap.wellnessLeave)),
    maternityLeave: toSafeCount(readByPath(rawRow, backendFieldMap.maternityLeave)),
    paternityLeave: toSafeCount(readByPath(rawRow, backendFieldMap.paternityLeave)),
    specialPrivilegeLeave: toSafeCount(readByPath(rawRow, backendFieldMap.specialPrivilegeLeave)),
    soloParentLeave: toSafeCount(readByPath(rawRow, backendFieldMap.soloParentLeave)),
  }
}

function normalizeDepartmentRows(rawRows) {
  if (!Array.isArray(rawRows)) return []

  return rawRows
    .map((row) => normalizeDepartmentRow(row))
    .filter((row) => row != null)
    .sort((left, right) => left.department.localeCompare(right.department))
}

function resolveRowsFromResponse(data, periodKey) {
  const scopedResponse = readByPath(data, backendFieldMap.responseDataPath)
  const periodPath = backendFieldMap.rowsPathByPeriod?.[periodKey] || ''
  const periodSource = readByPath(scopedResponse, periodPath)
  const rowsSource = readByPath(periodSource, backendFieldMap.rowsPath)

  if (Array.isArray(rowsSource)) return rowsSource
  if (Array.isArray(periodSource)) return periodSource

  const fallbackRowsSource = readByPath(scopedResponse, backendFieldMap.rowsPath)
  if (Array.isArray(fallbackRowsSource)) return fallbackRowsSource
  if (Array.isArray(scopedResponse)) return scopedResponse

  return []
}

async function fetchDepartmentStatistics(period = selectedPeriod.value, forceRefresh = false) {
  const periodKey = normalizePeriodKey(period)
  if (!props.apiEndpoint) return
  if (!forceRefresh && loadStateByPeriod.value[periodKey]) return

  const requestId = ++activeRequestId
  isLoading.value = true
  fetchErrorMessage.value = ''

  try {
    const { data } = await api.get(props.apiEndpoint, {
      params: { period: periodKey },
    })

    if (requestId !== activeRequestId) return

    const rows = normalizeDepartmentRows(resolveRowsFromResponse(data, periodKey))
    departmentRowsByPeriod.value[periodKey] = rows
    loadStateByPeriod.value[periodKey] = true
  } catch (err) {
    if (requestId !== activeRequestId) return

    fetchErrorMessage.value = resolveApiErrorMessage(
      err,
      'Unable to load department leave statistics right now.',
    )

    if (props.notifyOnFetchError) {
      $q.notify({ type: 'negative', message: fetchErrorMessage.value, position: 'top' })
    }
  } finally {
    if (requestId === activeRequestId) {
      isLoading.value = false
    }
  }
}

const departmentRows = computed(() =>
  (departmentRowsByPeriod.value[selectedPeriod.value] || []).map((row) => {
    const total = leaveTypeColumns.reduce(
      (sum, column) => sum + Number(row[column.name] || 0),
      0,
    )

    return {
      ...row,
      total,
    }
  }),
)

const tablePagination = ref({
  page: 1,
  rowsPerPage: 0,
})

watch(selectedPeriod, (nextPeriod) => {
  if (!props.autoFetch) return
  fetchDepartmentStatistics(nextPeriod)
})

watch(
  () => props.apiEndpoint,
  (nextEndpoint, previousEndpoint) => {
    if (nextEndpoint === previousEndpoint) return

    departmentRowsByPeriod.value = createPeriodState([])
    loadStateByPeriod.value = createPeriodState(false)
    fetchErrorMessage.value = ''

    if (props.autoFetch) {
      fetchDepartmentStatistics(selectedPeriod.value, true)
    }
  },
)

onMounted(() => {
  if (props.autoFetch) {
    fetchDepartmentStatistics(selectedPeriod.value, true)
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

.department-period-toggle {
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

@media (max-width: 767px) {
  .department-period-toggle :deep(.q-btn) {
    min-width: 0;
  }

  .department-period-toggle :deep(.q-btn .block) {
    font-size: 0.74rem;
  }
}

@media (max-width: 359px) {
  .department-mobile-item__stats {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (min-width: 768px) {
  .department-period-toggle {
    width: auto;
  }
}
</style>
