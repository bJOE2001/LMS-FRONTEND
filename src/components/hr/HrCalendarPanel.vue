<template>
  <q-card flat bordered class="rounded-borders">
    <q-card-section>
      <div class="q-mb-sm">
        <q-select
          v-model="calendarDept"
          :options="departmentOptions"
          dense
          outlined
          emit-value
          map-options
          label="Select Department"
          clearable
          class="department-select q-mb-sm"
          :loading="loadingDepts"
          :use-input="departmentSearchEnabled"
          input-debounce="0"
          @filter="filterDepartments"
          @clear="resetDepartmentOptions"
          @keydown="handleDepartmentKeydown"
          @popup-show="resetDepartmentOptions"
          @popup-hide="resetDepartmentOptions"
        />
        <div class="row items-center calendar-toolbar">
          <q-btn flat round dense icon="chevron_left" @click="prevMonth" />
          <div class="row items-center no-wrap calendar-picker-group">
            <q-btn-dropdown
              flat
              dense
              no-caps
              auto-close
              dropdown-icon="arrow_drop_down"
              :label="selectedMonthLabel"
              class="calendar-picker calendar-picker--month"
            >
              <q-list dense>
                <q-item
                  v-for="month in monthOptions"
                  :key="month.value"
                  clickable
                  @click="selectedMonthIndex = month.value"
                >
                  <q-item-section>{{ month.label }}</q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
            <q-btn-dropdown
              flat
              dense
              no-caps
              auto-close
              dropdown-icon="arrow_drop_down"
              :label="selectedYearLabel"
              class="calendar-picker calendar-picker--year"
            >
              <q-list dense>
                <q-item
                  v-for="year in yearOptions"
                  :key="year.value"
                  clickable
                  @click="selectedYearValue = year.value"
                >
                  <q-item-section>{{ year.label }}</q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
          </div>
          <q-btn flat round dense icon="chevron_right" @click="nextMonth" />
        </div>
      </div>
      <div class="calendar-grid calendar-grid-header">
        <div v-for="day in dayHeaders" :key="day" class="rounded-borders bg-grey-3 q-pa-sm text-center text-weight-medium">{{ day }}</div>
      </div>
      <div class="calendar-grid q-mt-xs">
        <div
          v-for="cell in calendarCells"
          :key="cell.key"
          class="rounded-borders q-pa-xs cursor-pointer min-h-80"
          :class="[cell.class, { 'today-strong': cell.isToday, 'selected-outline': cell.isSelected }]"
          @click="cell.date && openDateDialog(cell.date)"
        >
          <div v-if="cell.day" class="calendar-day-content">
            <div class="row justify-between items-start calendar-day-header">
              <span :class="cell.dayClass">{{ cell.day }}</span>
              <q-badge
                v-if="cell.count"
                color="orange"
                text-color="white"
                rounded
                class="calendar-total-badge"
                :label="cell.count"
              >
                <q-tooltip>{{ getCalendarTotalTooltip(cell.date, cell.count) }}</q-tooltip>
              </q-badge>
            </div>
            <div v-if="cell.leaveTypeBreakdown.length" class="leave-balance-cell calendar-leave-breakdown q-mt-xs">
              <q-badge
                v-for="item in cell.leaveTypeBreakdown"
                :key="`${cell.key}-${item.tooltip}`"
                color="grey-2"
                text-color="grey-7"
                rounded
                class="leave-balance-badge"
                :label="item.label"
              >
                <q-tooltip>{{ item.tooltip }}</q-tooltip>
              </q-badge>
            </div>
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>

  <q-dialog v-model="showDateDialog" class="calendar-date-dialog">
    <q-card class="rounded-borders calendar-date-dialog-card">
      <q-card-section class="row items-center bg-primary text-white calendar-date-dialog-header">
        <q-icon name="calendar_today" size="sm" class="q-mr-sm" />
        <div class="text-subtitle1 text-weight-bold">{{ selectedDateLabel }}</div>
        <q-space />
        <q-btn icon="close" flat round dense color="white" v-close-popup />
      </q-card-section>

      <q-card-section class="calendar-date-dialog-body">
        <div v-if="selectedDateEmployees.length" class="text-caption text-grey-7 q-mb-md">
          {{ selectedDateEmployees.length }} employee(s) on leave
        </div>
        <div v-if="selectedDateLeaveTypeBreakdown.length" class="leave-balance-cell q-mb-md">
          <q-badge
            v-for="item in selectedDateLeaveTypeBreakdown"
            :key="`selected-date-${item.tooltip}`"
            color="grey-2"
            text-color="grey-7"
            rounded
            class="leave-balance-badge"
            :label="item.label"
          >
            <q-tooltip>{{ item.tooltip }}</q-tooltip>
          </q-badge>
        </div>

        <div v-if="selectedDateEmployees.length" class="q-gutter-sm calendar-date-employee-list">
          <q-card
            v-for="emp in selectedDateEmployees"
            :key="emp.id"
            flat
            bordered
            class="rounded-borders calendar-date-employee-card"
          >
            <q-card-section class="q-pa-md calendar-date-employee-card-section">
              <div class="row items-center no-wrap q-mb-xs calendar-date-employee-top">
                <q-avatar size="32px" color="primary" text-color="white" class="q-mr-sm">
                  {{ emp.employeeName.charAt(0) }}
                </q-avatar>
                <div class="col calendar-date-employee-identity">
                  <div class="text-weight-medium">{{ emp.employeeName }}</div>
                  <div class="text-caption text-grey-6">{{ emp.employee_control_no }}</div>
                </div>
                <q-badge color="positive" label="Approved" class="calendar-date-employee-status" />
              </div>
              <div class="row q-gutter-xs q-mt-xs calendar-date-employee-meta">
                <q-badge outline color="primary" :label="emp.leaveType" class="calendar-date-employee-badge" />
                <q-badge outline color="grey-7" :label="emp.office" class="calendar-date-employee-badge calendar-date-employee-badge--office" />
                <q-badge outline color="orange" :label="emp.days + ' day(s)'" class="calendar-date-employee-badge" />
              </div>
              <div class="text-caption text-grey-6 q-mt-xs calendar-date-employee-range">
                {{ formatDate(emp.startDate) }} - {{ formatDate(emp.endDate) }}
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div v-else class="text-center q-pa-lg">
          <q-icon name="event_available" size="48px" color="grey-4" />
          <div class="text-grey-6 q-mt-sm">No employees on leave on this date</div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { api } from 'src/boot/axios'

const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const PRIORITY_LEAVE_TYPES = [
  'Mandatory / Forced Leave',
  'Sick Leave',
  'Vacation Leave',
  'Wellness Leave',
]
const LAST_LEAVE_TYPES = ['MCO6 Leave']
const monthOptions = [
  { label: 'January', value: 0 },
  { label: 'February', value: 1 },
  { label: 'March', value: 2 },
  { label: 'April', value: 3 },
  { label: 'May', value: 4 },
  { label: 'June', value: 5 },
  { label: 'July', value: 6 },
  { label: 'August', value: 7 },
  { label: 'September', value: 8 },
  { label: 'October', value: 9 },
  { label: 'November', value: 10 },
  { label: 'December', value: 11 },
]

const currentMonth = ref(new Date())
const calendarDept = ref(null)
const selectedDate = ref(null)
const showDateDialog = ref(false)
const calendarLeaves = ref([])
const loadingDepts = ref(false)
const allDepartmentOptions = ref([])
const departmentOptions = ref([])
const departmentSearchEnabled = computed(() => !calendarDept.value)

async function fetchDepartments() {
  loadingDepts.value = true
  try {
    const { data } = await api.get('/departments')
    const depts = data.departments ?? data ?? []
    allDepartmentOptions.value = depts.map((d) => ({
      label: typeof d === 'string' ? d : d.name,
      value: typeof d === 'string' ? d : d.name,
    }))
    resetDepartmentOptions()
  } catch {
    allDepartmentOptions.value = []
    departmentOptions.value = []
  } finally {
    loadingDepts.value = false
  }
}

function resetDepartmentOptions() {
  departmentOptions.value = [...allDepartmentOptions.value]
}

function normalizeDepartmentSearch(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

function matchesDepartmentSearch(option, query) {
  const label = normalizeDepartmentSearch(option?.label)
  if (!query) return true
  if (label.startsWith(query)) return true

  const words = label.split(/[\s/-]+/).filter(Boolean)
  if (words.some((word) => word.startsWith(query))) return true

  return label.includes(query)
}

function filterDepartments(val, update) {
  update(() => {
    const query = normalizeDepartmentSearch(val)
    departmentOptions.value = query
      ? allDepartmentOptions.value.filter((option) => matchesDepartmentSearch(option, query))
      : [...allDepartmentOptions.value]
  })
}

function handleDepartmentKeydown(event) {
  if (!calendarDept.value) return

  const blockedKeys = ['Backspace', 'Delete']
  if (blockedKeys.includes(event.key) || event.key.length === 1) {
    event.preventDefault()
  }
}

async function fetchCalendarLeaves() {
  try {
    const year = currentMonth.value.getFullYear()
    const month = currentMonth.value.getMonth() + 1
    const params = { year, month }
    if (calendarDept.value) params.department = calendarDept.value
    const { data } = await api.get('/hr/calendar', { params })
    calendarLeaves.value = data.leaves ?? []
  } catch {
    calendarLeaves.value = []
  }
}

onMounted(() => {
  fetchDepartments()
  fetchCalendarLeaves()
})

watch([currentMonth, calendarDept], () => {
  if (!calendarDept.value) resetDepartmentOptions()
  fetchCalendarLeaves()
})

const today = new Date()
const selectedMonthIndex = computed({
  get: () => currentMonth.value.getMonth(),
  set: (monthIndex) => {
    currentMonth.value = new Date(currentMonth.value.getFullYear(), monthIndex, 1)
    selectedDate.value = null
  },
})
const selectedYearValue = computed({
  get: () => currentMonth.value.getFullYear(),
  set: (year) => {
    currentMonth.value = new Date(year, currentMonth.value.getMonth(), 1)
    selectedDate.value = null
  },
})
const yearOptions = computed(() => {
  const selectedYear = currentMonth.value.getFullYear()
  return Array.from({ length: 11 }, (_, index) => {
    const year = selectedYear - 5 + index
    return { label: String(year), value: year }
  })
})
const selectedMonthLabel = computed(() =>
  monthOptions.find((month) => month.value === selectedMonthIndex.value)?.label || '',
)
const selectedYearLabel = computed(() => String(selectedYearValue.value))

function normalizeLeaveTypeName(value) {
  if (typeof value === 'string' && value.trim()) return value.trim()

  if (value && typeof value === 'object') {
    const nestedName = value.name ?? value.label ?? value.type
    if (typeof nestedName === 'string' && nestedName.trim()) return nestedName.trim()
  }

  return 'Unknown'
}

function prettifyLeaveTypeLabel(value) {
  const label = normalizeLeaveTypeName(value)
  if (!label) return ''

  const normalized = label
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const lower = normalized.toLowerCase()
  if (lower === 'mandatory' || lower === 'forced' || lower === 'mandatory forced leave') return 'Mandatory / Forced Leave'
  if (lower === 'mandatory / forced leave') return 'Mandatory / Forced Leave'
  if (lower === 'mco6' || lower === 'mco6 leave') return 'MCO6 Leave'
  if (lower === 'vacation') return 'Vacation Leave'
  if (lower === 'sick') return 'Sick Leave'
  if (lower === 'vacation leave') return 'Vacation Leave'
  if (lower === 'sick leave') return 'Sick Leave'
  if (lower === 'wellness' || lower === 'wellness leave') return 'Wellness Leave'

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase())
}

function getLeaveTypeKey(value) {
  return prettifyLeaveTypeLabel(value).trim().toLowerCase()
}

function toLeaveTypeAcronym(value) {
  const label = prettifyLeaveTypeLabel(value)
  if (!label) return ''

  const lower = label.toLowerCase()
  if (lower === 'mandatory / forced leave') return 'FL'
  if (lower === 'mco6 leave') return 'MCO6'
  if (lower === 'sick leave') return 'SL'
  if (lower === 'vacation leave') return 'VL'
  if (lower === 'wellness leave') return 'WL'

  const normalized = label
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((part) => part.trim().toUpperCase())
    .filter((part) => part && !['AND', 'FOR', 'OF', 'THE'].includes(part))

  if (!normalized.length) return ''
  return normalized.map((part) => part[0]).join('')
}

function getApplicationLeaveType(application) {
  const leaveTypeValue =
    application?.leaveType ??
    application?.leave_type_name ??
    application?.leaveTypeName ??
    application?.leave_type ??
    application?.leaveType?.name ??
    application?.leave?.name

  return prettifyLeaveTypeLabel(leaveTypeValue)
}

function compareLeaveTypeBreakdown(left, right) {
  const leftKey = getLeaveTypeKey(left.tooltip)
  const rightKey = getLeaveTypeKey(right.tooltip)
  const leftIsLast = LAST_LEAVE_TYPES.some((label) => getLeaveTypeKey(label) === leftKey)
  const rightIsLast = LAST_LEAVE_TYPES.some((label) => getLeaveTypeKey(label) === rightKey)

  if (leftIsLast || rightIsLast) {
    if (leftIsLast && rightIsLast) return left.tooltip.localeCompare(right.tooltip)
    if (leftIsLast) return 1
    return -1
  }

  const leftPriority = PRIORITY_LEAVE_TYPES.findIndex((label) => getLeaveTypeKey(label) === leftKey)
  const rightPriority = PRIORITY_LEAVE_TYPES.findIndex((label) => getLeaveTypeKey(label) === rightKey)

  if (leftPriority !== -1 || rightPriority !== -1) {
    if (leftPriority === -1) return 1
    if (rightPriority === -1) return -1
    if (leftPriority !== rightPriority) return leftPriority - rightPriority
  }

  if (left.count !== right.count) return right.count - left.count
  return left.tooltip.localeCompare(right.tooltip)
}

function getLeaveTypeBreakdown(applications) {
  const totals = new Map()

  for (const application of applications) {
    const leaveType = getApplicationLeaveType(application)
    if (!leaveType) continue
    totals.set(leaveType, (totals.get(leaveType) || 0) + 1)
  }

  return Array.from(totals.entries())
    .map(([leaveType, count]) => {
      const acronym = toLeaveTypeAcronym(leaveType)
      return {
        label: `${acronym || leaveType}: ${count}`,
        tooltip: leaveType,
        count,
      }
    })
    .sort(compareLeaveTypeBreakdown)
}

function toDateStr(date) {
  if (date instanceof Date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return String(date).slice(0, 10)
}

function isDateInRange(date, startStr, endStr) {
  const d = toDateStr(date)
  return d >= startStr && d <= endStr
}

function getEmployeesOnLeave(date) {
  const dow = date.getDay()
  if (dow === 0 || dow === 6) return []

  return calendarLeaves.value.filter((app) => {
    if (app.selected_dates && Array.isArray(app.selected_dates) && app.selected_dates.length > 0) {
      return app.selected_dates.includes(toDateStr(date))
    }
    return isDateInRange(date, app.startDate, app.endDate)
  })
}

const calendarCells = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startPad = first.getDay()
  const daysInMonth = last.getDate()
  const cells = []

  for (let i = 0; i < startPad; i++) {
    cells.push({ key: `e-${i}`, day: null, class: 'bg-grey-2', dayClass: '' })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const employees = getEmployeesOnLeave(date)
    const isToday = date.toDateString() === today.toDateString()
    const isSelected = selectedDate.value && date.toDateString() === selectedDate.value.toDateString()
    const isWeekend = date.getDay() === 0 || date.getDay() === 6

    let cls = 'bg-white'
    if (isWeekend) cls = 'bg-grey-2'
    if (employees.length) cls = 'bg-orange-1'

    let dayClass = 'text-grey-9'
    if (isToday) dayClass = 'text-primary text-weight-bold'
    if (isWeekend && !isToday) dayClass = 'text-grey-6'

    cells.push({
      key: day,
      day,
      date,
      class: cls,
      dayClass,
      count: employees.length,
      leaveTypeBreakdown: getLeaveTypeBreakdown(employees),
      isToday,
      isSelected,
    })
  }

  return cells
})

const selectedDateLabel = computed(() =>
  selectedDate.value
    ? selectedDate.value.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : '',
)

const selectedDateEmployees = computed(() =>
  selectedDate.value ? getEmployeesOnLeave(selectedDate.value) : [],
)
const selectedDateLeaveTypeBreakdown = computed(() =>
  getLeaveTypeBreakdown(selectedDateEmployees.value),
)

function openDateDialog(date) {
  selectedDate.value = date
  showDateDialog.value = true
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getCalendarTotalTooltip(date, count) {
  return `${count} total leave record(s)`
}

function prevMonth() {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() - 1,
    1,
  )
  selectedDate.value = null
}

function nextMonth() {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + 1,
    1,
  )
  selectedDate.value = null
}

</script>

<style scoped>
.department-select {
  width: 100%;
}
.calendar-toolbar {
  min-height: 40px;
  gap: 6px;
}
.calendar-picker-group {
  gap: 10px;
}
.calendar-picker {
  padding: 0;
  min-height: 32px;
  font-weight: 700;
}
.calendar-picker--month {
  min-width: 126px;
}
.calendar-picker--year {
  min-width: 72px;
}
.calendar-picker :deep(.q-btn__content) {
  gap: 2px;
  font-size: 1.55rem;
  font-weight: 700;
}
.calendar-picker :deep(.q-btn-dropdown__arrow-container) {
  margin-left: 0;
}
.calendar-picker :deep(.q-icon) {
  font-size: 1.2rem;
  font-weight: 700;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.calendar-day-content {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  gap: 4px;
}
.calendar-day-header {
  position: relative;
  min-height: 24px;
}
.calendar-grid-header {
  margin-bottom: 4px;
}
.leave-balance-cell {
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  line-height: 1.2;
}
.leave-balance-badge {
  padding: 2px 7px;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
  border: 1px solid #d8dee6;
}
.calendar-leave-breakdown {
  align-items: flex-start;
}
.calendar-total-badge {
  padding: 4px 9px;
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1;
}
.min-h-80 {
  width: 100%;
  min-height: 0;
  aspect-ratio: 1 / 1;
  overflow: hidden;
}
.today-strong {
  background-color: #90caf9 !important;
}
.selected-outline {
  box-shadow: inset 0 0 0 1.5px #4fc3f7;
}
.calendar-date-dialog-card {
  width: min(640px, calc(100vw - 24px));
  max-width: calc(100vw - 24px);
}
.calendar-date-dialog-header {
  min-height: 52px;
}
.calendar-date-dialog-body {
  max-height: calc(100vh - 120px);
  overflow: auto;
}
.calendar-date-employee-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.calendar-date-employee-card-section {
  padding: 14px;
}
.calendar-date-employee-identity {
  min-width: 0;
}
.calendar-date-employee-meta {
  align-items: flex-start;
}
.calendar-date-employee-badge {
  max-width: 100%;
}
.calendar-date-employee-badge--office {
  white-space: normal;
  word-break: break-word;
  line-height: 1.2;
}
.calendar-date-employee-range {
  line-height: 1.35;
}

@media (max-width: 599px) {
  .calendar-grid {
    gap: 3px;
  }

  .calendar-grid > .min-h-80 {
    padding: 4px !important;
  }

  .calendar-day-content {
    gap: 2px;
  }

  .calendar-day-header {
    position: static;
    min-height: 20px;
    justify-content: flex-start;
  }

  .calendar-leave-breakdown {
    display: none;
  }

  .leave-balance-cell {
    gap: 2px;
  }

  .leave-balance-badge {
    padding: 1px 4px;
    font-size: 0.58rem;
  }

  .calendar-total-badge {
    position: absolute;
    bottom: 0;
    right: 0;
    padding: 2px 6px;
    font-size: 0.78rem;
  }

  .calendar-date-dialog :deep(.q-dialog__inner--minimized) {
    padding: 8px;
  }

  .calendar-date-dialog-card {
    width: calc(100vw - 16px);
    max-width: calc(100vw - 16px);
  }

  .calendar-date-dialog-header {
    min-height: 48px;
    padding: 8px 10px;
  }

  .calendar-date-dialog-header .text-subtitle1 {
    min-width: 0;
    font-size: 1rem;
    line-height: 1.2;
  }

  .calendar-date-dialog-body {
    max-height: calc(100vh - 92px);
    padding: 12px 10px;
  }

  .calendar-date-employee-card-section {
    padding: 10px;
  }

  .calendar-date-employee-top {
    align-items: flex-start;
  }

  .calendar-date-employee-status {
    margin-left: 8px;
    align-self: flex-start;
  }

  .calendar-date-employee-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .calendar-date-employee-badge {
    max-width: 100%;
    font-size: 0.7rem;
  }

  .calendar-date-employee-badge--office {
    width: 100%;
  }
}
</style>

