<template>
  <q-page class="q-pa-md attendance-overview-page">
    <!-- Page Header + Upper-Right Controls (Coverage Date Range, Print DTR, Batch Print) -->
    <div class="row items-center justify-between q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-auto">
        <h1 class="text-h4 text-weight-bold q-my-none">{{ title }}</h1>
      </div>

      <div class="col-12 col-md-auto row items-center q-gutter-sm wrap justify-end">
        <!-- Coverage Date Range Picker -->
        <button
          type="button"
          class="coverage-range-trigger row items-center no-wrap q-px-sm"
          aria-label="Select DTR coverage date range"
        >
          <q-icon name="calendar_month" size="18px" color="green-9" class="q-mr-sm flex-shrink-0" />
          <div class="column items-start text-left q-mr-xs">
            <span class="coverage-range-eyebrow">Coverage Date Range</span>
            <span class="coverage-range-value font-mono">{{ dtrCustomRangeLabel }}</span>
          </div>
          <q-icon name="arrow_drop_down" size="20px" color="grey-7" class="flex-shrink-0" />

          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
            <div class="coverage-popover q-pa-md bg-white">
              <div class="row items-center justify-between q-mb-sm">
                <div class="row items-center q-gutter-x-xs">
                  <q-icon name="date_range" color="green-9" size="18px" />
                  <span class="text-weight-bold text-body2 text-dark">DTR Coverage Period</span>
                </div>
                <q-badge
                  v-if="dtrRangeDayCount > 0"
                  color="green-1"
                  text-color="green-9"
                  class="text-weight-bold font-mono"
                >
                  {{ dtrRangeDayCount }} {{ dtrRangeDayCount === 1 ? 'day' : 'days' }}
                </q-badge>
              </div>

              <!-- Quick Cutoff Presets -->
              <div class="dtr-preset-segmented row no-wrap items-center q-mb-sm">
                <button
                  type="button"
                  class="dtr-preset-btn col"
                  :class="{ 'is-active': isDateRangeMatchingPreset(dtrCustomRange, 'month') }"
                  @click="applyDtrPreset('month')"
                >
                  <span class="dtr-preset-title">Whole Month</span>
                  <span class="dtr-preset-sub">1st – End</span>
                </button>
                <button
                  type="button"
                  class="dtr-preset-btn col"
                  :class="{ 'is-active': isDateRangeMatchingPreset(dtrCustomRange, '11-25') }"
                  @click="applyDtrPreset('11-25')"
                >
                  <span class="dtr-preset-title">11th – 25th</span>
                  <span class="dtr-preset-sub">1st Cutoff</span>
                </button>
                <button
                  type="button"
                  class="dtr-preset-btn col"
                  :class="{ 'is-active': isDateRangeMatchingPreset(dtrCustomRange, '26-10') }"
                  @click="applyDtrPreset('26-10')"
                >
                  <span class="dtr-preset-title">26th – 10th</span>
                  <span class="dtr-preset-sub">2nd Cutoff</span>
                </button>
              </div>

              <q-date
                v-model="dtrDatePickerModel"
                range
                mask="YYYY-MM-DD"
                color="green-9"
                minimal
                flat
                class="full-width no-shadow bg-white dtr-range-calendar"
                @navigation="onDtrCalendarNav"
              />
            </div>
          </q-popup-proxy>
        </button>

        <!-- Primary Action: Print Selected / Checked Employee DTR(s) -->
        <q-btn
          v-if="showPrint"
          unelevated
          no-caps
          color="green-9"
          icon="print"
          :label="checkedControlNos.length > 0 ? `Print (${checkedControlNos.length})` : 'Print'"
          class="text-weight-bold q-px-md toolbar-action-btn"
          :loading="multiPrintLoading"
          :disable="isPrintDisabled"
          @click="handlePrintDtr"
        >
          <q-tooltip class="bg-dark">
            {{
              checkedControlNos.length > 0
                ? `Print Civil Service Form No. 48 for ${checkedControlNos.length} selected employee(s)`
                : 'Print Civil Service Form No. 48 for selected employee'
            }}
          </q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- MASTER-DETAIL SPLIT WORKSPACE (Employees | Live DTR)      -->
    <!-- ========================================================= -->
    <div class="att-split-workspace">
      <!-- LEFT PANE: Employee Directory / Selector -->
      <aside class="att-employee-pane">
        <div class="att-employee-pane-inner bg-white rounded-borders">
          <div class="att-pane-header q-pa-sm">
          <q-input
            v-model="searchTerm"
            dense
            outlined
            clearable
            placeholder="Search name or control no..."
            class="q-mb-sm att-search-input"
          >
            <template #prepend>
              <q-icon name="search" size="18px" color="grey-6" />
            </template>
          </q-input>

          <q-select
            v-if="showOfficeFilter"
            v-model="selectedDepartmentId"
            :options="officeFilterOptions"
            emit-value
            map-options
            outlined
            dense
            options-dense
            use-input
            fill-input
            hide-selected
            input-debounce="0"
            class="status-filter-select full-width q-mb-sm"
            @filter="onDepartmentFilter"
            @update:model-value="onDepartmentFilterChange"
          >
            <template #prepend>
              <q-icon name="apartment" size="18px" color="grey-6" />
            </template>
          </q-select>

          <q-select
            v-model="selectedEmploymentStatus"
            :options="employmentStatusOptions"
            emit-value
            map-options
            outlined
            dense
            options-dense
            class="status-filter-select full-width"
          >
            <template #prepend>
              <q-icon name="filter_list" size="18px" color="grey-6" />
            </template>
          </q-select>

          <div
            v-if="showPrint && checkedControlNos.length > 0"
            class="att-selection-strip row items-center justify-between no-wrap q-mt-xs"
          >
            <span class="text-caption text-weight-bold text-green-9 font-mono">
              {{ checkedControlNos.length }} selected
            </span>
            <q-btn
              flat
              dense
              no-caps
              size="xs"
              color="green-9"
              label="Clear"
              class="text-weight-bold"
              @click="clearCheckedEmployees"
            />
          </div>
        </div>

        <!-- Scrollable Employee List -->
        <div class="att-employee-list">
          <!-- Sticky Employee Table Column Headers (aligned inside scroll container) -->
          <div class="att-table-header row items-stretch no-wrap full-width">
            <div v-if="showPrint" class="att-cell-check row items-center justify-center flex-shrink-0">
              <q-checkbox
                :model-value="selectAllFilteredState"
                dense
                size="sm"
                color="green-9"
                :disable="filteredEmployeeRows.length === 0"
                aria-label="Select all employees"
                class="att-select-all-checkbox"
                @update:model-value="toggleSelectAllFiltered"
              >
                <q-tooltip class="bg-dark text-white">Select all</q-tooltip>
              </q-checkbox>
            </div>
            <div class="att-cell-name col min-width-0 row items-center">
              <span class="att-table-header-label">Name</span>
            </div>
            <div class="att-cell-id row items-center justify-center flex-shrink-0">
              <span class="att-table-header-label">Control No</span>
            </div>
          </div>

          <!-- Initial Skeleton Loading (Table-Aligned Rows) -->
          <div v-if="loading && employeeRows.length === 0">
            <div
              v-for="(w, idx) in employeeSkeletonWidths"
              :key="idx"
              class="att-employee-row att-employee-skeleton-row row items-stretch no-wrap full-width"
              aria-hidden="true"
            >
              <div v-if="showPrint" class="att-cell-check row items-center justify-center flex-shrink-0">
                <q-skeleton
                  type="rect"
                  width="16px"
                  height="16px"
                  animation="wave"
                  class="att-skel-check"
                />
              </div>
              <div class="att-cell-name col min-width-0 row items-center">
                <q-skeleton type="text" :width="w" height="14px" animation="wave" />
              </div>
              <div class="att-cell-id row items-center justify-center flex-shrink-0">
                <q-skeleton
                  type="rect"
                  width="52px"
                  height="18px"
                  animation="wave"
                  class="att-skel-pill"
                />
              </div>
            </div>
          </div>

          <!-- Empty Filter State -->
          <div
            v-else-if="filteredEmployeeRows.length === 0"
            class="column items-center justify-center text-center q-pa-lg text-grey-6"
          >
            <q-icon name="person_off" size="36px" color="grey-4" class="q-mb-sm" />
            <div class="text-subtitle2 text-weight-bold text-grey-8">No Employees Found</div>
            <div class="text-caption text-grey-6 q-mb-md">
              No personnel match your current search or status filter.
            </div>
            <q-btn
              v-if="hasActiveFilters"
              outline
              dense
              no-caps
              color="green-9"
              label="Reset Filters"
              class="q-px-md text-weight-bold"
              @click="resetAllFilters"
            />
          </div>

          <!-- Employee Rows -->
          <div v-else>
            <div
              v-for="emp in filteredEmployeeRows"
              :key="emp.control_no"
              role="button"
              tabindex="0"
              class="att-employee-row row items-stretch no-wrap full-width text-left"
              :class="{
                'is-active': selectedDtrEmployee?.control_no === emp.control_no,
                'is-checked': isEmployeeChecked(emp.control_no),
              }"
              @click="selectEmployee(emp)"
              @keydown.enter.prevent="selectEmployee(emp)"
              @keydown.space.prevent="selectEmployee(emp)"
            >
              <div v-if="showPrint" class="att-cell-check row items-center justify-center flex-shrink-0">
                <q-checkbox
                  :model-value="isEmployeeChecked(emp.control_no)"
                  dense
                  size="sm"
                  color="green-9"
                  class="att-emp-checkbox"
                  :aria-label="`Select ${emp.employee_name} for printing`"
                  @click.stop
                  @update:model-value="toggleEmployeeCheck(emp.control_no)"
                />
              </div>
              <div class="att-cell-name col min-width-0 row items-center">
                <span class="att-employee-name ellipsis" :title="emp.employee_name">
                  {{ emp.employee_name }}
                </span>
              </div>
              <div class="att-cell-id row items-center justify-center flex-shrink-0">
                <span class="att-control-pill font-mono tabular-nums">
                  {{ emp.control_no }}
                </span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </aside>

      <!-- RIGHT PANE: Live Inline CSC Form No. 48 (DTR) -->
      <section class="att-dtr-pane">
        <!-- DTR Document Body -->
        <div class="att-dtr-body">
          <!-- Initial Loading State (CSC Form 48 Document Skeleton) -->
          <div
            v-if="(loading && employeeRows.length === 0) || (dtrLoading && !dtrData)"
            class="att-dtr-skeleton-sheet bg-white rounded-borders att-dtr-placeholder-card"
            aria-label="Loading Daily Time Record"
          >
            <div class="att-dtr-skel-grid">
              <div
                v-for="panel in 2"
                :key="panel"
                class="att-dtr-skel-panel"
                :class="{ 'att-dtr-skel-panel--secondary': panel === 2 }"
              >
                <q-skeleton type="rect" width="46px" height="10px" animation="wave" class="q-mb-xs" />
                <div class="column items-center q-mb-sm">
                  <q-skeleton
                    type="text"
                    width="44%"
                    height="16px"
                    animation="wave"
                    class="q-mb-xs"
                  />
                  <q-skeleton
                    type="text"
                    width="62%"
                    height="14px"
                    animation="wave"
                    class="q-mb-xs"
                  />
                  <q-skeleton type="text" width="76%" height="11px" animation="wave" />
                </div>

                <div class="att-dtr-skel-table">
                  <div class="att-dtr-skel-row att-dtr-skel-row--head row items-center no-wrap">
                    <div class="att-dtr-skel-day flex-shrink-0">
                      <q-skeleton type="text" width="18px" height="10px" animation="wave" />
                    </div>
                    <div v-for="c in 4" :key="c" class="att-dtr-skel-slot col">
                      <q-skeleton type="text" width="60%" height="10px" animation="wave" />
                    </div>
                  </div>
                  <div
                    v-for="r in 12"
                    :key="r"
                    class="att-dtr-skel-row row items-center no-wrap"
                  >
                    <div class="att-dtr-skel-day flex-shrink-0">
                      <q-skeleton type="text" width="14px" height="10px" animation="wave" />
                    </div>
                    <div v-for="c in 4" :key="c" class="att-dtr-skel-slot col">
                      <q-skeleton type="text" width="54%" height="10px" animation="wave" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Error State -->
          <div
            v-else-if="dtrErrorMessage && !dtrData"
            class="column items-center justify-center text-center q-pa-xl text-negative bg-white rounded-borders att-dtr-placeholder att-dtr-placeholder-card"
          >
            <q-icon name="error_outline" size="48px" />
            <div class="text-subtitle1 text-weight-bold q-mt-sm">Unable to Load DTR</div>
            <div class="text-caption text-grey-7 q-mb-md">{{ dtrErrorMessage }}</div>
            <q-btn
              outline
              dense
              no-caps
              color="green-9"
              icon="refresh"
              label="Retry"
              class="q-px-md text-weight-bold"
              @click="refreshSelectedDtr"
            />
          </div>

          <!-- No Employee Selected State -->
          <div
            v-else-if="!selectedDtrEmployee || !dtrData"
            class="column items-center justify-center text-center q-pa-xl text-grey-6 bg-white rounded-borders att-dtr-placeholder att-dtr-placeholder-card"
          >
            <q-icon name="description" size="48px" color="grey-4" class="q-mb-sm" />
            <div class="text-subtitle1 text-weight-bold text-grey-8">
              Select an Employee
            </div>
            <div class="text-caption text-grey-6">
              {{
                readonly && !showPrint
                  ? 'Choose an employee from the list on the left to view their CSC Form No. 48.'
                  : 'Choose an employee from the list on the left to view, override, or print their CSC Form No. 48.'
              }}
            </div>
          </div>

          <!-- Inline CSC Form No. 48 Document -->
          <div v-else class="att-dtr-live-wrap" :class="{ 'att-dtr-reloading': dtrLoading }">
            <q-linear-progress
              v-if="dtrLoading"
              indeterminate
              color="green-9"
              size="3px"
              class="att-dtr-reload-bar"
            />
            <DailyTimeRecordTable
              ref="previewDtrRef"
              v-model:custom-date-range="dtrCustomRange"
              :records="dtrData.records"
              :employee="dtrData.employee"
              :period="dtrData.period"
              :summary="dtrData.summary"
              :department-heads="dtrData.department_heads"
              :pending-delete-requests="dtrData.pending_delete_requests || []"
              :loading="dtrLoading"
              :hide-toolbar="true"
              :readonly="readonly"
              :show-print="showPrint"
              @adjust-saved="onDtrOverrideSaved"
            />
          </div>
        </div>
      </section>
    </div>

    <!-- Offscreen Multi-Employee Print Staging (Zero Modals) -->
    <div
      v-if="showPrint && multiPrintEntries.length > 0"
      ref="multiPrintContainerRef"
      class="offscreen-print-staging"
      aria-hidden="true"
    >
      <DailyTimeRecordTable
        v-for="(item, idx) in multiPrintEntries"
        :key="item.employee?.control_no || idx"
        :records="item.records"
        :employee="item.employee"
        :period="multiPrintPeriod"
        :summary="item.summary"
        :department-heads="multiPrintDepartmentHeads"
        :custom-date-range="normalizedDtrCustomRange"
        :hide-toolbar="true"
        :readonly="true"
      />
    </div>
  </q-page>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAttendanceStore } from 'stores/attendance-store'
import { useEmployeeStore } from 'stores/employee-store'
import DailyTimeRecordTable from 'src/components/admin/DailyTimeRecordTable.vue'
import { formatOfficeAbbreviation, resolveOfficeAcronymLabel } from 'src/utils/office-acronym'
import { openCscForm48PrintTab, printBatchCscForm48 } from 'src/utils/csc-form-48-print'

const props = defineProps({
  title: {
    type: String,
    default: 'Attendance Management',
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  showOfficeFilter: {
    type: Boolean,
    default: false,
  },
  showPrint: {
    type: Boolean,
    default: true,
  },
  routeName: {
    type: String,
    default: 'admin-attendance',
  },
})

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const attendanceStore = useAttendanceStore()
const employeeStore = useEmployeeStore()

function getLocalTodayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const loading = ref(false)
const todayStr = getLocalTodayStr()
const selectedDate = ref(todayStr)
const searchTerm = ref('')
const employeeRows = ref([])
const selectedEmploymentStatus = ref('ALL')
const selectedDepartmentId = ref('ALL')
const departmentFilterText = ref('')
const employeeSkeletonWidths = ['78%', '64%', '84%', '70%', '60%', '86%', '68%', '74%', '62%', '76%']

const officeFilterOptions = computed(() => {
  const allOption = {
    label: 'All Offices',
    value: 'ALL',
    officeName: 'All Offices',
    officeAcronym: '',
  }
  const departments = (employeeStore.allDepartments || []).map((dept) => {
    const acronym = resolveOfficeAcronymLabel(dept)
    const label = acronym || formatOfficeAbbreviation(dept.name)
    return {
      label,
      value: dept.id,
      officeName: dept.name || '',
      officeAcronym: acronym,
    }
  })

  const term = departmentFilterText.value.trim().toLowerCase()
  if (!term) {
    return [allOption, ...departments]
  }

  const filtered = departments.filter(
    (opt) =>
      opt.label.toLowerCase().includes(term) ||
      opt.officeName.toLowerCase().includes(term) ||
      opt.officeAcronym.toLowerCase().includes(term),
  )

  return [allOption, ...filtered]
})

function onDepartmentFilter(val, update) {
  update(() => {
    departmentFilterText.value = val || ''
  })
}

function syncSelectionAfterRosterChange() {
  const rows = filteredEmployeeRows.value
  const currentId = selectedDtrEmployee.value?.control_no
  if (currentId && rows.some((emp) => String(emp.control_no) === String(currentId))) {
    return
  }
  if (rows.length > 0) {
    selectEmployee(rows[0])
  } else {
    selectedDtrEmployee.value = null
    dtrData.value = null
    dtrErrorMessage.value = ''
  }
}

async function onDepartmentFilterChange() {
  if (!selectedDepartmentId.value) {
    selectedDepartmentId.value = 'ALL'
  }
  departmentFilterText.value = ''
  checkedControlNos.value = []
  await fetchAttendanceOverview()
  syncSelectionAfterRosterChange()
}

const hasActiveFilters = computed(() => {
  return (
    selectedEmploymentStatus.value !== 'ALL' ||
    (props.showOfficeFilter && selectedDepartmentId.value !== 'ALL') ||
    Boolean(searchTerm.value && String(searchTerm.value).trim() !== '')
  )
})

async function resetAllFilters() {
  selectedEmploymentStatus.value = 'ALL'
  const hadDepartmentFilter = props.showOfficeFilter && selectedDepartmentId.value !== 'ALL'
  selectedDepartmentId.value = 'ALL'
  departmentFilterText.value = ''
  searchTerm.value = ''
  if (hadDepartmentFilter) {
    checkedControlNos.value = []
    await fetchAttendanceOverview()
    syncSelectionAfterRosterChange()
  }
}

function formatEmploymentStatus(status) {
  if (!status) return ''
  const s = String(status).toUpperCase().trim()
  if (s === 'CASUAL') return 'Casual'
  if (s === 'REGULAR') return 'Permanent'
  if (s === 'CONTRACTUAL') return 'Contractual'
  if (s === 'CO-TERMINOUS') return 'Co-terminous'
  if (s === 'ELECTIVE') return 'Elective'
  if (s === 'HONORARIUM') return 'Honorarium'
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

const employmentStatusOptions = computed(() => {
  const counts = {}
  employeeRows.value.forEach((row) => {
    const raw = (row.employment_status || 'OTHER').toUpperCase().trim()
    counts[raw] = (counts[raw] || 0) + 1
  })

  const baseOptions = [
    { label: `All (${employeeRows.value.length})`, value: 'ALL' },
    { label: `Casual (${counts['CASUAL'] || 0})`, value: 'CASUAL' },
    { label: `Permanent (${counts['REGULAR'] || 0})`, value: 'REGULAR' },
  ]

  if (counts['CONTRACTUAL']) {
    baseOptions.push({ label: `Contractual (${counts['CONTRACTUAL']})`, value: 'CONTRACTUAL' })
  }
  if (counts['CO-TERMINOUS']) {
    baseOptions.push({ label: `Co-terminous (${counts['CO-TERMINOUS']})`, value: 'CO-TERMINOUS' })
  }
  if (counts['ELECTIVE']) {
    baseOptions.push({ label: `Elective (${counts['ELECTIVE']})`, value: 'ELECTIVE' })
  }

  Object.keys(counts).forEach((key) => {
    if (!['CASUAL', 'REGULAR', 'CONTRACTUAL', 'CO-TERMINOUS', 'ELECTIVE', 'OTHER'].includes(key)) {
      baseOptions.push({
        label: `${formatEmploymentStatus(key)} (${counts[key]})`,
        value: key,
      })
    }
  })

  return baseOptions
})

const filteredEmployeeRows = computed(() => {
  const empTarget =
    selectedEmploymentStatus.value && selectedEmploymentStatus.value !== 'ALL'
      ? selectedEmploymentStatus.value.toUpperCase().trim()
      : null
  const needle = String(searchTerm.value || '')
    .toLowerCase()
    .trim()

  return employeeRows.value.filter((row) => {
    if (empTarget) {
      const s = String(row.employment_status || '')
        .toUpperCase()
        .trim()
      if (s !== empTarget) return false
    }
    if (needle) {
      const haystack = `${row.employee_name || ''} ${row.control_no || ''} ${row.designation || ''}`
        .toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    return true
  })
})

/**
 * Fetch Office Employee Directory
 */
async function fetchAttendanceOverview() {
  loading.value = true
  try {
    const params = {
      date: selectedDate.value,
    }
    if (props.showOfficeFilter && selectedDepartmentId.value && selectedDepartmentId.value !== 'ALL') {
      params.department_id = selectedDepartmentId.value
    }
    const data = await attendanceStore.fetchAttendanceOverview(params)
    employeeRows.value = data.employees || []
  } catch (err) {
    console.error('Failed to fetch employee roster:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to load employee list.',
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}

function isDateRangeMatchingPreset(rangeVal, type) {
  if (!rangeVal) return false
  const from = typeof rangeVal === 'string' ? rangeVal : rangeVal.from
  const to = typeof rangeVal === 'string' ? rangeVal : rangeVal.to || from
  if (!from || !to) return false

  const [fromY, fromM, fromD] = from.split('-').map(Number)
  const [toY, toM, toD] = to.split('-').map(Number)
  if (!fromY || !fromM || !fromD || !toY || !toM || !toD) return false

  if (type === 'month') {
    const lastDay = new Date(fromY, fromM, 0).getDate()
    return fromY === toY && fromM === toM && fromD === 1 && toD === lastDay
  }

  if (type === '11-25') {
    return fromY === toY && fromM === toM && fromD === 11 && toD === 25
  }

  if (type === '26-10') {
    if (fromD !== 26 || toD !== 10) return false
    const nextD = new Date(fromY, fromM, 10)
    return nextD.getFullYear() === toY && nextD.getMonth() + 1 === toM
  }

  return false
}

function getRangeDayCount(rangeVal) {
  if (!rangeVal?.from || !rangeVal?.to) return 0
  try {
    const d1 = new Date(`${rangeVal.from}T00:00:00`)
    const d2 = new Date(`${rangeVal.to}T00:00:00`)
    const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1
    return diff > 0 ? diff : 0
  } catch {
    return 0
  }
}

function parseYearMonthFromDate(dateStr) {
  const parts = (dateStr || getLocalTodayStr()).split('-').map(Number)
  return {
    year: parts[0] || new Date().getFullYear(),
    month: parts[1] || new Date().getMonth() + 1,
    day: parts[2] || new Date().getDate(),
  }
}

function buildPresetRangeForCalendarView(type, calVm, currentRange, baseDateStr) {
  const baseParts = parseYearMonthFromDate(baseDateStr)
  const year = calVm?.year || baseParts.year
  const month = calVm?.month || baseParts.month
  const curMStr = String(month).padStart(2, '0')

  if (type === 'month') {
    const lastDay = String(new Date(year, month, 0).getDate()).padStart(2, '0')
    return {
      from: `${year}-${curMStr}-01`,
      to: `${year}-${curMStr}-${lastDay}`,
    }
  }

  if (type === '11-25') {
    return {
      from: `${year}-${curMStr}-11`,
      to: `${year}-${curMStr}-25`,
    }
  }

  if (type === '26-10') {
    const prevD = new Date(year, month - 2, 26)
    const prevY = prevD.getFullYear()
    const prevM = String(prevD.getMonth() + 1).padStart(2, '0')
    const firstOption = {
      from: `${prevY}-${prevM}-26`,
      to: `${year}-${curMStr}-10`,
    }

    const nextD = new Date(year, month, 10)
    const nextY = nextD.getFullYear()
    const nextM = String(nextD.getMonth() + 1).padStart(2, '0')
    const secondOption = {
      from: `${year}-${curMStr}-26`,
      to: `${nextY}-${nextM}-10`,
    }

    const curFrom = typeof currentRange === 'string' ? currentRange : currentRange?.from
    const curTo = typeof currentRange === 'string' ? currentRange : currentRange?.to

    if (curFrom === firstOption.from && curTo === firstOption.to) {
      return secondOption
    }
    if (curFrom === secondOption.from && curTo === secondOption.to) {
      return firstOption
    }

    const isSameAsBaseMonth = year === baseParts.year && month === baseParts.month
    if (isSameAsBaseMonth && baseParts.day <= 15) {
      return firstOption
    }
    return secondOption
  }

  return null
}

// =========================================================
// INLINE SPLIT DTR STATE & LOGIC
// =========================================================
const selectedDtrEmployee = ref(null)
const dtrLoading = ref(false)
const dtrErrorMessage = ref('')
const dtrData = ref(null)
const previewDtrRef = ref(null)
const dtrCalendarYm = ref(parseYearMonthFromDate(todayStr))

const MONTH_NAMES = [
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

function getMonthName(monthNumber) {
  return MONTH_NAMES[(Number(monthNumber) || 1) - 1] || 'January'
}

function buildMonthRangeForDate(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date()
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const m = String(month).padStart(2, '0')
  const lastDay = String(new Date(year, month, 0).getDate()).padStart(2, '0')
  return {
    from: `${year}-${m}-01`,
    to: `${year}-${m}-${lastDay}`,
  }
}

const dtrCustomRange = ref(buildMonthRangeForDate(todayStr))

function onDtrCalendarNav(view) {
  if (view?.year && view?.month) {
    dtrCalendarYm.value = { year: view.year, month: view.month }
  }
}

const dtrDatePickerModel = computed({
  get() {
    return dtrCustomRange.value
  },
  set(val) {
    if (!val) return
    dtrCustomRange.value = typeof val === 'string' ? { from: val, to: val } : val
  },
})

const normalizedDtrCustomRange = computed(() => {
  const val = dtrCustomRange.value || buildMonthRangeForDate(todayStr)
  if (typeof val === 'string') {
    return { from: val, to: val }
  }
  const from = val?.from || buildMonthRangeForDate(todayStr).from
  const to = val?.to || from
  return from <= to ? { from, to } : { from: to, to: from }
})

const dtrRangeDayCount = computed(() => {
  return getRangeDayCount(normalizedDtrCustomRange.value)
})

const dtrCustomRangeLabel = computed(() => {
  const { from, to } = normalizedDtrCustomRange.value
  try {
    const d1 = new Date(`${from}T00:00:00`)
    const d2 = new Date(`${to}T00:00:00`)
    const sameYear = d1.getFullYear() === d2.getFullYear()
    const f1 = d1.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' }),
    })
    const f2 = d2.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return from === to ? f2 : `${f1} – ${f2}`
  } catch {
    return `${from} – ${to}`
  }
})

function applyDtrPreset(type) {
  const targetYm = { ...dtrCalendarYm.value }
  const nextRange = buildPresetRangeForCalendarView(
    type,
    targetYm,
    dtrCustomRange.value,
    selectedDate.value,
  )
  if (nextRange) {
    dtrCustomRange.value = nextRange
  }
}

watch(
  () => [normalizedDtrCustomRange.value.from, normalizedDtrCustomRange.value.to],
  () => {
    if (selectedDtrEmployee.value?.control_no) {
      fetchEmployeeDtr(selectedDtrEmployee.value.control_no)
    }
  },
)

let dtrFetchSeq = 0

/**
 * Fetch Employee Monthly DTR Record
 */
async function fetchEmployeeDtr(controlNo) {
  if (!controlNo) return
  const seq = ++dtrFetchSeq
  dtrLoading.value = true
  dtrErrorMessage.value = ''

  try {
    const { from } = normalizedDtrCustomRange.value
    const [fromY, fromM] = from.split('-').map(Number)

    const year = fromY || new Date().getFullYear()
    const month = fromM || new Date().getMonth() + 1

    const res = await attendanceStore.fetchEmployeeDtr(controlNo, normalizedDtrCustomRange.value)
    if (seq !== dtrFetchSeq) return

    if (res?.period) {
      res.period.year = year
      res.period.month = month
      res.period.month_name = getMonthName(month)
      res.period.days_in_month = new Date(year, month, 0).getDate()
    }

    dtrData.value = res
  } catch (err) {
    if (seq !== dtrFetchSeq) return
    dtrData.value = null
    console.error('Failed to fetch employee DTR:', err)
    dtrErrorMessage.value =
      err.response?.data?.message || 'Failed to load employee Daily Time Record.'
    $q.notify({
      type: 'negative',
      message: dtrErrorMessage.value,
      position: 'top',
    })
  } finally {
    if (seq === dtrFetchSeq) {
      dtrLoading.value = false
    }
  }
}

/**
 * Select an employee from the left directory and load their DTR inline
 */
function selectEmployee(employee) {
  if (!employee?.control_no) return
  selectedDtrEmployee.value = employee
  if (route.query.employeeId && String(route.query.employeeId) !== String(employee.control_no)) {
    router.replace({ name: props.routeName })
  }
  fetchEmployeeDtr(employee.control_no)
}

function refreshSelectedDtr() {
  if (!selectedDtrEmployee.value?.control_no) return
  fetchEmployeeDtr(selectedDtrEmployee.value.control_no)
}

// =========================================================
// MULTI-SELECT CHECKBOXES & UNIFIED PRINT DTR LOGIC
// =========================================================
const checkedControlNos = ref([])
const checkedControlNoSet = computed(() => new Set(checkedControlNos.value))
const multiPrintLoading = ref(false)
const multiPrintEntries = ref([])
const multiPrintPeriod = ref({})
const multiPrintDepartmentHeads = ref([])
const multiPrintContainerRef = ref(null)

function isEmployeeChecked(controlNo) {
  return checkedControlNoSet.value.has(controlNo)
}

function toggleEmployeeCheck(controlNo) {
  if (!controlNo) return
  if (checkedControlNoSet.value.has(controlNo)) {
    checkedControlNos.value = checkedControlNos.value.filter((id) => id !== controlNo)
  } else {
    checkedControlNos.value = [...checkedControlNos.value, controlNo]
  }
}

const selectAllFilteredState = computed(() => {
  const rows = filteredEmployeeRows.value
  if (rows.length === 0) return false
  const checkedInView = rows.filter((emp) => checkedControlNoSet.value.has(emp.control_no)).length
  if (checkedInView === 0) return false
  if (checkedInView === rows.length) return true
  return null
})

function toggleSelectAllFiltered() {
  const rows = filteredEmployeeRows.value
  if (rows.length === 0) return
  if (selectAllFilteredState.value === true) {
    const removeSet = new Set(rows.map((emp) => emp.control_no))
    checkedControlNos.value = checkedControlNos.value.filter((id) => !removeSet.has(id))
  } else {
    const existing = checkedControlNoSet.value
    const toAdd = rows.map((emp) => emp.control_no).filter((id) => !existing.has(id))
    checkedControlNos.value = [...checkedControlNos.value, ...toAdd]
  }
}

function clearCheckedEmployees() {
  checkedControlNos.value = []
}

const isPrintDisabled = computed(() => {
  if (multiPrintLoading.value) return true
  if (checkedControlNos.value.length > 0) return false
  return !dtrData.value || dtrLoading.value
})

async function handlePrintDtr() {
  if (multiPrintLoading.value) return

  const targets = checkedControlNos.value
  if (
    targets.length === 0 ||
    (targets.length === 1 &&
      targets[0] === selectedDtrEmployee.value?.control_no &&
      dtrData.value &&
      !dtrLoading.value)
  ) {
    if (!dtrData.value || dtrLoading.value) return
    previewDtrRef.value?.triggerPrint()
    return
  }

  multiPrintLoading.value = true
  multiPrintEntries.value = []
  const printTab = openCscForm48PrintTab(`CSC Form 48 (${targets.length} Personnel)`)

  try {
    const { from, to } = normalizedDtrCustomRange.value
    const [fromY, fromM] = from.split('-').map(Number)

    const res = await attendanceStore.fetchBulkDtr({
      controlNos: targets,
      startDate: from,
      endDate: to,
      year: fromY,
      month: fromM,
    })

    const entries = res?.employees_dtr || []
    if (entries.length === 0) {
      if (printTab && !printTab.closed) printTab.close()
      $q.notify({
        type: 'warning',
        message: 'No DTR records found for the selected employees and coverage period.',
        position: 'top',
      })
      return
    }

    multiPrintPeriod.value = res?.period || {}
    multiPrintDepartmentHeads.value = res?.department_heads || []
    multiPrintEntries.value = entries

    await nextTick()

    const sheets = multiPrintContainerRef.value?.querySelectorAll('.csc-sheet-wrapper')
    if (!sheets || sheets.length === 0) {
      if (printTab && !printTab.closed) printTab.close()
      $q.notify({
        type: 'warning',
        message: 'No printable DTR sheets available.',
        position: 'top',
      })
      return
    }

    await printBatchCscForm48({
      elements: Array.from(sheets),
      title: `CSC Form 48 (${entries.length} Personnel)`,
      targetWindow: printTab,
    })
  } catch (err) {
    if (printTab && !printTab.closed) printTab.close()
    console.error('Failed to prepare DTR for printing:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to generate DTR for selected employees.',
      position: 'top',
    })
  } finally {
    multiPrintEntries.value = []
    multiPrintLoading.value = false
  }
}

/**
 * Callback when DTR Override is Saved
 */
function onDtrOverrideSaved() {
  if (selectedDtrEmployee.value?.control_no) {
    fetchEmployeeDtr(selectedDtrEmployee.value.control_no)
  }
}

onMounted(async () => {
  if (props.showOfficeFilter) {
    employeeStore.fetchDepartments().catch((err) => {
      console.error('Failed to load offices for DTR filter:', err)
    })
  }
  await fetchAttendanceOverview()
  if (route.query.employeeId) {
    const targetId = String(route.query.employeeId)
    const matched = employeeRows.value.find((emp) => String(emp.control_no) === targetId)
    selectEmployee(matched || { control_no: targetId })
    return
  }
  if (filteredEmployeeRows.value.length > 0) {
    selectEmployee(filteredEmployeeRows.value[0])
  }
})
</script>

<style scoped>
/* ========================================================= */
/* HEADER COVERAGE RANGE TRIGGER & SPLIT WORKSPACE LAYOUT    */
/* ========================================================= */
.coverage-range-trigger {
  appearance: none;
  height: 40px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background-color: #ffffff;
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease,
    box-shadow 0.16s ease;
}

.coverage-range-trigger:hover {
  border-color: #1b5e20;
  background-color: #f8fafc;
}

.coverage-range-trigger:focus-visible {
  outline: 2px solid #1b5e20;
  outline-offset: 2px;
}

.coverage-range-eyebrow {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  line-height: 1.05;
}

.coverage-range-value {
  font-size: 0.8rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.coverage-popover {
  width: 340px;
  max-width: 92vw;
}

.toolbar-action-btn {
  height: 40px;
  border-radius: 6px;
}

.tabular-nums {
  font-variant-numeric: tabular-nums;
}

.font-mono {
  font-family: monospace;
}

.min-width-0 {
  min-width: 0;
}

.att-split-workspace {
  display: grid;
  grid-template-columns: 310px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.att-employee-pane {
  position: sticky;
  top: 72px;
}

.att-employee-pane-inner {
  height: calc(100vh - 88px);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.att-pane-header {
  flex-shrink: 0;
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}

.status-filter-select :deep(.q-field__control),
.att-search-input :deep(.q-field__control) {
  border-radius: 6px;
}

.att-selection-strip {
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  padding: 3px 8px;
}

.att-employee-list {
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.att-employee-list::-webkit-scrollbar {
  width: 6px;
}

.att-employee-list::-webkit-scrollbar-track {
  background: transparent;
}

.att-employee-list::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 999px;
}

.att-employee-list::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}

.att-emp-checkbox {
  flex-shrink: 0;
}

.att-table-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.att-table-header .att-cell-check,
.att-table-header .att-cell-name,
.att-table-header .att-cell-id {
  padding-top: 7px;
  padding-bottom: 7px;
}

.att-table-header-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.att-employee-row {
  border: none;
  border-bottom: 1px solid #eef2f6;
  border-radius: 0;
  padding: 0;
  min-height: 40px;
  background-color: transparent;
  cursor: pointer;
  user-select: none;
  transition:
    background-color 0.14s ease,
    border-color 0.14s ease,
    box-shadow 0.14s ease;
}

.att-cell-check {
  width: 36px;
  padding: 6px 4px 6px 8px;
  border-right: none;
}

.att-cell-name {
  padding: 8px 6px;
  border-right: none;
}

.att-cell-name:first-child {
  padding-left: 12px;
}

.att-cell-id {
  width: 76px;
  padding: 6px 8px 6px 4px;
}

.att-employee-row:hover:not(.is-active) {
  background-color: #f8fafc;
}

.att-employee-row:focus-visible {
  outline: 2px solid #1b5e20;
  outline-offset: -2px;
}

.att-employee-row.is-checked:not(.is-active) {
  background-color: #f8fafc;
}

.att-employee-row.is-active {
  background-color: #f0fdf4;
  box-shadow: inset 3px 0 0 #2e7d32;
  border-bottom-color: #dcfce7;
}

.att-employee-row.is-active .att-employee-name {
  color: #1b5e20;
}

.att-employee-row.is-active .att-control-pill {
  background-color: #dcfce7;
  color: #166534;
  border-color: #bbf7d0;
}

.att-employee-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.25;
}

.att-control-pill {
  font-size: 0.69rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 6px;
  line-height: 1.15;
  white-space: nowrap;
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.att-dtr-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.att-dtr-body {
  flex: 1 1 auto;
  overflow-x: auto;
}

.att-dtr-body :deep(.csc-sheet-wrapper) {
  max-width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.att-dtr-placeholder {
  min-height: 420px;
}

.att-dtr-placeholder-card {
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.att-dtr-reloading {
  opacity: 0.55;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.att-employee-skeleton-row {
  cursor: default;
  pointer-events: none;
}

.att-skel-check {
  border-radius: 3px;
}

.att-skel-pill {
  border-radius: 6px;
}

.att-dtr-skeleton-sheet {
  padding: 20px 24px;
  min-height: 520px;
}

.att-dtr-skel-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.att-dtr-skel-panel {
  min-width: 0;
}

.att-dtr-skel-table {
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.att-dtr-skel-row {
  border-bottom: 1px solid #e2e8f0;
  min-height: 26px;
}

.att-dtr-skel-row:last-child {
  border-bottom: none;
}

.att-dtr-skel-row--head {
  background-color: #f8fafc;
  min-height: 28px;
}

.att-dtr-skel-day {
  width: 32px;
  padding: 5px 6px;
  border-right: 1px solid #e2e8f0;
  display: flex;
  justify-content: center;
}

.att-dtr-skel-slot {
  padding: 5px 8px;
  border-right: 1px solid #e2e8f0;
  display: flex;
  justify-content: center;
}

.att-dtr-skel-slot:last-child {
  border-right: none;
}

.att-dtr-live-wrap {
  position: relative;
}

.att-dtr-reload-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 4;
  border-radius: 10px 10px 0 0;
}

@media (max-width: 900px) {
  .att-dtr-skel-grid {
    grid-template-columns: 1fr;
  }

  .att-dtr-skel-panel--secondary {
    display: none;
  }
}

@media (max-width: 1023px) {
  .att-split-workspace {
    grid-template-columns: 1fr;
  }

  .att-employee-pane {
    position: static;
  }

  .att-employee-pane-inner {
    height: auto;
    max-height: 360px;
  }

  .att-dtr-pane {
    min-height: 480px;
  }
}

/* Dark Mode Overrides */
:global(body.body--dark) .coverage-range-trigger,
:global(body.body--dark) .att-employee-pane-inner,
:global(body.body--dark) .att-pane-header,
:global(body.body--dark) .att-dtr-placeholder-card,
:global(body.body--dark) .att-dtr-skeleton-sheet {
  background-color: var(--dm-surface, #1b2330) !important;
  border-color: var(--dm-border, #324258);
}

:global(body.body--dark) .coverage-range-trigger:hover {
  background-color: var(--dm-surface-2, #212b3a) !important;
  border-color: #22c55e;
}

:global(body.body--dark) .coverage-range-value,
:global(body.body--dark) .att-employee-name {
  color: var(--dm-text-primary, #e6edf5);
}

:global(body.body--dark) .att-selection-strip {
  background-color: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.3);
}

:global(body.body--dark) .att-table-header,
:global(body.body--dark) .att-dtr-skel-row--head {
  background-color: var(--dm-surface-2, #212b3a);
  border-color: var(--dm-border, #2a3649);
}

:global(body.body--dark) .att-table-header-label {
  color: var(--dm-text-secondary, #cad5e4);
}

:global(body.body--dark) .att-employee-row,
:global(body.body--dark) .att-cell-check,
:global(body.body--dark) .att-cell-name,
:global(body.body--dark) .att-dtr-skel-table,
:global(body.body--dark) .att-dtr-skel-row,
:global(body.body--dark) .att-dtr-skel-day,
:global(body.body--dark) .att-dtr-skel-slot {
  border-color: var(--dm-border, #2a3649);
}

:global(body.body--dark) .att-employee-row:hover:not(.is-active),
:global(body.body--dark) .att-employee-row.is-checked:not(.is-active) {
  background-color: var(--dm-surface-2, #212b3a);
}

:global(body.body--dark) .att-employee-row.is-active {
  background-color: rgba(34, 197, 94, 0.12);
  box-shadow: inset 3px 0 0 #22c55e;
  border-bottom-color: rgba(34, 197, 94, 0.25);
}

:global(body.body--dark) .att-employee-row.is-active .att-employee-name {
  color: #86efac;
}

:global(body.body--dark) .att-employee-row.is-active .att-control-pill {
  background-color: rgba(34, 197, 94, 0.18);
  border-color: rgba(34, 197, 94, 0.35);
  color: #bbf7d0;
}

:global(body.body--dark) .att-control-pill {
  background-color: var(--dm-surface-3, #283446);
  border-color: var(--dm-border, #324258);
  color: var(--dm-text-secondary, #cad5e4);
}

.offscreen-print-staging {
  position: fixed;
  left: -99999px;
  top: 0;
  width: 960px;
  pointer-events: none;
  opacity: 0;
}

.flex-shrink-0 {
  flex-shrink: 0;
}

/* ========================================================= */
/* COVERAGE DATE RANGE POPOVER & PRESETS UI/UX               */
/* ========================================================= */
/* Selected Range Summary Banner */
/* Segmented Cutoff Preset Bar */
.dtr-preset-segmented {
  background-color: #f1f5f9;
  padding: 3px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  gap: 4px;
}

.dtr-preset-btn {
  appearance: none;
  border: none;
  background: transparent;
  border-radius: 6px;
  padding: 5px 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.16s ease;
  color: #475569;
  user-select: none;
}

.dtr-preset-btn:hover:not(.is-active) {
  background-color: rgba(255, 255, 255, 0.65);
  color: #0f172a;
}

.dtr-preset-btn.is-active {
  background-color: #1b5e20;
  color: #ffffff;
  box-shadow: 0 2px 5px rgba(27, 94, 32, 0.25);
}

.dtr-preset-title {
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.dtr-preset-sub {
  font-size: 0.62rem;
  font-weight: 500;
  opacity: 0.78;
  line-height: 1.1;
  margin-top: 1px;
}

/* High-Contrast QDate Range Calendar */
.dtr-range-calendar {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.dtr-range-calendar :deep(.q-date__view) {
  padding: 6px 8px 6px;
  min-height: 224px;
}

.dtr-range-calendar :deep(.q-date__calendar-days-container) {
  min-height: 168px;
}

.dtr-range-calendar :deep(.q-date__navigation) {
  margin-bottom: 4px;
}

.dtr-range-calendar :deep(.q-date__navigation .q-btn) {
  font-weight: 700;
  color: #1e293b;
  font-size: 0.85rem;
}

.dtr-range-calendar :deep(.q-date__calendar-weekdays > div) {
  opacity: 1;
  color: #64748b;
  font-weight: 700;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* Soft emerald track for in-range days with high-contrast forest green text */
.dtr-range-calendar :deep(.q-date__range:before),
.dtr-range-calendar :deep(.q-date__range-from:before),
.dtr-range-calendar :deep(.q-date__range-to:before) {
  background-color: #dcfce7 !important;
  opacity: 1 !important;
  top: 2px;
  bottom: 2px;
}

.dtr-range-calendar :deep(.q-date__range .q-btn) {
  color: #14532d !important;
  font-weight: 700 !important;
}

.dtr-range-calendar :deep(.q-date__range .q-btn:hover) {
  background-color: rgba(21, 128, 61, 0.14) !important;
}

/* Solid dark green endpoints (Start & End dates) */
.dtr-range-calendar :deep(.q-date__range-from .q-btn),
.dtr-range-calendar :deep(.q-date__range-to .q-btn) {
  background-color: #1b5e20 !important;
  color: #ffffff !important;
  font-weight: 800 !important;
  box-shadow: 0 2px 6px rgba(27, 94, 32, 0.3);
}

/* Interactive range selection preview (when picking start -> end date) */
.dtr-range-calendar :deep(.q-date__edit-range-from .q-btn),
.dtr-range-calendar :deep(.q-date__edit-range-from-to .q-btn),
.dtr-range-calendar :deep(.q-date__edit-range-to .q-btn) {
  background-color: #dcfce7 !important;
  color: #1b5e20 !important;
  font-weight: 800 !important;
}

/* Today indicator ring */
.dtr-range-calendar :deep(.q-date__today) {
  box-shadow: inset 0 0 0 1.5px #15803d !important;
  font-weight: 800 !important;
}
</style>
