<template>
  <q-card v-bind="attrs" flat bordered class="calendar-panel-card">
    <q-card-section class="calendar-panel-section">
      <!-- Panel Header (Matches Manpower Panel) -->
      <div class="calendar-panel-header">
        <div class="calendar-panel-header__left">
          <span class="calendar-panel-header__icon" aria-hidden="true">
            <q-icon name="calendar_month" size="18px" />
          </span>
          <div class="calendar-panel-header__copy">
            <div class="calendar-panel-header__title">Leave Schedule Calendar</div>
            <div class="calendar-panel-header__subtitle">
              {{ weekLeaveSummaryText }}
            </div>
          </div>
        </div>

        <q-select
          v-model="calendarDept"
          :options="departmentOptions"
          dense
          outlined
          emit-value
          map-options
          label="Office"
          placeholder="All Offices"
          clearable
          class="department-select"
          :loading="loadingDepts"
          :use-input="departmentSearchEnabled"
          input-debounce="0"
          @filter="filterDepartments"
          @clear="resetDepartmentOptions"
          @keydown="handleDepartmentKeydown"
          @popup-show="resetDepartmentOptions"
          @popup-hide="resetDepartmentOptions"
        />
      </div>

      <!-- Unified Month / Year + Week Navigator -->
      <div class="calendar-nav-bar">
        <div class="calendar-month-controls">
          <q-btn
            flat
            round
            dense
            size="sm"
            icon="chevron_left"
            class="calendar-nav-arrow"
            aria-label="Previous month"
            @click="prevMonth"
          />

          <div class="calendar-picker-group">
            <q-btn-dropdown
              flat
              dense
              no-caps
              auto-close
              dropdown-icon="expand_more"
              :label="selectedMonthLabel"
              class="calendar-picker calendar-picker--month"
            >
              <q-list dense>
                <q-item
                  v-for="month in monthOptions"
                  :key="month.value"
                  clickable
                  :active="month.value === selectedMonthIndex"
                  active-class="text-green-9 text-weight-bold"
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
              dropdown-icon="expand_more"
              :label="selectedYearLabel"
              class="calendar-picker calendar-picker--year"
            >
              <q-list dense>
                <q-item
                  v-for="year in yearOptions"
                  :key="year.value"
                  clickable
                  :active="year.value === selectedYearValue"
                  active-class="text-green-9 text-weight-bold"
                  @click="selectedYearValue = year.value"
                >
                  <q-item-section>{{ year.label }}</q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
          </div>

          <q-btn
            flat
            round
            dense
            size="sm"
            icon="chevron_right"
            class="calendar-nav-arrow"
            aria-label="Next month"
            @click="nextMonth"
          />

          <q-btn
            v-if="!isOnTodayWindow"
            flat
            dense
            no-caps
            size="sm"
            label="Today"
            class="calendar-today-jump-btn"
            @click="goToToday"
          />
        </div>

        <div class="week-nav-pill">
          <q-btn
            flat
            dense
            round
            size="xs"
            icon="chevron_left"
            :disable="!hasPrevTwoWeekWindow"
            aria-label="Previous week"
            @click="prevTwoWeekWindow"
          />
          <span class="week-nav-pill__label tabular-nums">{{ visibleWeekLabel }}</span>
          <q-btn
            flat
            dense
            round
            size="xs"
            icon="chevron_right"
            :disable="!hasNextTwoWeekWindow"
            aria-label="Next week"
            @click="nextTwoWeekWindow"
          />
        </div>
      </div>

      <!-- 7-Day Weekday Headers -->
      <div class="calendar-grid calendar-grid-header">
        <div
          v-for="(day, index) in dayHeaders"
          :key="day"
          class="calendar-weekday-label"
          :class="{ 'is-weekend': index === 0 || index === 6 }"
        >
          {{ day }}
        </div>
      </div>

      <!-- 7-Day Calendar Cells -->
      <div class="calendar-grid calendar-grid-days">
        <div
          v-for="cell in visibleCalendarCells"
          :key="cell.key"
          class="calendar-day-cell"
          :class="[
            cell.stateClass,
            {
              'is-today': cell.isToday,
              'is-selected': cell.isSelected,
              'is-clickable': Boolean(cell.date),
            },
          ]"
          :role="cell.date ? 'button' : undefined"
          :tabindex="cell.date ? 0 : undefined"
          @click="cell.date && openDateDialog(cell.date)"
          @keydown.enter.prevent="cell.date && openDateDialog(cell.date)"
          @keydown.space.prevent="cell.date && openDateDialog(cell.date)"
        >
          <div v-if="cell.day" class="calendar-day-content">
            <div class="calendar-day-header">
              <span class="calendar-day-num tabular-nums" :class="{ 'is-today-num': cell.isToday }">
                {{ cell.day }}
              </span>
              <span v-if="cell.count" class="calendar-count-pill tabular-nums">
                {{ cell.count }}
                <q-tooltip>{{ getCalendarTotalTooltip(cell.date, cell.count) }}</q-tooltip>
              </span>
            </div>

            <div v-if="cell.leaveTypeBreakdown.length" class="calendar-leave-breakdown">
              <span
                v-for="item in cell.leaveTypeBreakdown.slice(0, 2)"
                :key="`${cell.key}-${item.tooltip}`"
                class="leave-type-chip"
              >
                {{ item.label }}
                <q-tooltip>{{ item.tooltip }}</q-tooltip>
              </span>
              <span
                v-if="cell.leaveTypeBreakdown.length > 2"
                class="leave-type-more"
              >
                +{{ cell.leaveTypeBreakdown.length - 2 }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Quick Agenda Preview Strip -->
      <div class="calendar-agenda-strip">
        <div class="calendar-agenda-strip__info">
          <span class="calendar-agenda-strip__dot" :class="{ 'is-active': agendaPreviewEmployees.length > 0 }" />
          <span class="calendar-agenda-strip__date">{{ agendaPreviewDateLabel }}</span>
          <span class="calendar-agenda-strip__sep">·</span>
          <span class="calendar-agenda-strip__count">
            {{
              agendaPreviewEmployees.length
                ? `${agendaPreviewEmployees.length} employee(s) on leave`
                : 'No scheduled leaves'
            }}
          </span>
        </div>

        <q-btn
          v-if="agendaPreviewDate"
          flat
          dense
          no-caps
          size="sm"
          icon-right="arrow_forward"
          label="Details"
          class="calendar-agenda-strip__btn"
          @click="openDateDialog(agendaPreviewDate)"
        />
      </div>
    </q-card-section>
  </q-card>

  <!-- Date Details Dialog -->
  <q-dialog v-model="showDateDialog" class="calendar-date-dialog">
    <q-card class="rounded-borders calendar-date-dialog-card">
      <q-card-section class="row items-center bg-green-9 text-white calendar-date-dialog-header">
        <q-icon name="calendar_today" size="sm" class="q-mr-sm" />
        <div class="text-subtitle1 text-weight-bold">{{ selectedDateLabel }}</div>
        <q-space />
        <q-btn v-close-popup icon="close" flat round dense color="white" />
      </q-card-section>

      <q-card-section class="calendar-date-dialog-body">
        <div v-if="selectedDateEmployees.length" class="text-caption text-grey-7 q-mb-sm">
          {{ selectedDateEmployees.length }} employee(s) on leave
        </div>
        <div v-if="selectedDateLeaveTypeBreakdown.length" class="leave-balance-cell q-mb-md">
          <q-badge
            v-for="item in selectedDateLeaveTypeBreakdown"
            :key="`selected-date-${item.tooltip}`"
            color="grey-2"
            text-color="grey-8"
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
                <q-avatar size="32px" color="green-9" text-color="white" class="q-mr-sm">
                  {{ emp.employeeName.charAt(0) }}
                </q-avatar>
                <div class="col calendar-date-employee-identity">
                  <div class="text-weight-medium">{{ emp.employeeName }}</div>
                  <div class="text-caption text-grey-6">{{ emp.employee_control_no }}</div>
                </div>
                <q-badge color="positive" label="Approved" class="calendar-date-employee-status" />
              </div>
              <div class="row q-gutter-xs q-mt-xs calendar-date-employee-meta">
                <q-badge outline color="green-9" :label="formatLeaveTypeDisplayLabel(emp.leaveType)" class="calendar-date-employee-badge" />
                <q-badge outline color="grey-7" :label="emp.office" class="calendar-date-employee-badge calendar-date-employee-badge--office" />
                <q-badge outline color="positive" :label="emp.days + ' day(s)'" class="calendar-date-employee-badge" />
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
import { ref, computed, onMounted, watch, useAttrs } from 'vue'
import { useHrDashboardStore } from 'stores/hr-dashboard-store'

defineOptions({
  inheritAttrs: false,
})

const attrs = useAttrs()
const hrDashboardStore = useHrDashboardStore()

const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const PRIORITY_LEAVE_TYPES = [
  'Mandatory / Forced Leave',
  'Sick Leave',
  'Vacation Leave',
  'Wellness Leave',
]
const LAST_LEAVE_TYPES = ['Special Privilege Leave']
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
const calendarWindowIndex = ref(0)
const calendarDept = ref(null)
const selectedDate = ref(null)
const showDateDialog = ref(false)
const initialCalendarKey = `${currentMonth.value.getFullYear()}_${currentMonth.value.getMonth() + 1}_ALL`
const calendarLeaves = ref(hrDashboardStore.calendarCache?.[initialCalendarKey] ?? [])
const loadingDepts = ref(false)
const allDepartmentOptions = ref(
  hrDashboardStore.departmentsLoaded ? [...hrDashboardStore.allDepartmentOptions] : [],
)
const departmentOptions = ref([...allDepartmentOptions.value])
const departmentSearchEnabled = computed(() => !calendarDept.value)

async function fetchDepartments() {
  if (hrDashboardStore.departmentsLoaded && hrDashboardStore.allDepartmentOptions.length > 0) {
    allDepartmentOptions.value = [...hrDashboardStore.allDepartmentOptions]
    resetDepartmentOptions()
    return
  }
  loadingDepts.value = true
  try {
    allDepartmentOptions.value = await hrDashboardStore.fetchDepartments()
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
    calendarLeaves.value = await hrDashboardStore.fetchCalendarLeaves(params)
  } catch {
    calendarLeaves.value = []
  }
}

onMounted(() => {
  syncCalendarWindowToCurrentWeek()
  fetchDepartments()
  fetchCalendarLeaves()
})

watch([currentMonth, calendarDept], () => {
  if (!calendarDept.value) resetDepartmentOptions()
  fetchCalendarLeaves()
})

watch(currentMonth, () => {
  syncCalendarWindowToCurrentWeek()
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

function getCurrentMonthWeekIndex(date) {
  const dayOfMonth = date.getDate()
  const firstDayOffset = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  return Math.floor((firstDayOffset + dayOfMonth - 1) / 7)
}

function getVisibleWeekCountForMonth(date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDayOffset = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return Math.max(1, Math.ceil((firstDayOffset + daysInMonth) / 7))
}

function isViewingCurrentMonth() {
  return (
    currentMonth.value.getFullYear() === today.getFullYear() &&
    currentMonth.value.getMonth() === today.getMonth()
  )
}

const isOnTodayWindow = computed(
  () => isViewingCurrentMonth() && calendarWindowIndex.value === getCurrentMonthWeekIndex(today),
)

function syncCalendarWindowToCurrentWeek() {
  if (!isViewingCurrentMonth()) {
    calendarWindowIndex.value = 0
    return
  }

  const maxIndex = getVisibleWeekCountForMonth(today) - 1
  const currentWeekIndex = getCurrentMonthWeekIndex(today)
  calendarWindowIndex.value = Math.min(currentWeekIndex, maxIndex)
}

function goToToday() {
  const now = new Date()
  if (
    currentMonth.value.getFullYear() !== now.getFullYear() ||
    currentMonth.value.getMonth() !== now.getMonth()
  ) {
    currentMonth.value = new Date(now.getFullYear(), now.getMonth(), 1)
  } else {
    syncCalendarWindowToCurrentWeek()
  }
  selectedDate.value = null
}

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
  if (lower === 'mco6' || lower === 'mco6 leave' || lower === 'mc06' || lower === 'mo6 leave') return 'Special Privilege Leave'
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

function formatLeaveTypeDisplayLabel(value) {
  const label = prettifyLeaveTypeLabel(value)
  if (!label) return ''

  if (getLeaveTypeKey(label) === getLeaveTypeKey('Special Privilege Leave')) {
    return 'Special Privilege Leave(MC06)'
  }

  return label
}

function toLeaveTypeAcronym(value) {
  const label = prettifyLeaveTypeLabel(value)
  if (!label) return ''

  const lower = label.toLowerCase()
  if (lower === 'mandatory / forced leave') return 'FL'
  if (lower === 'special privilege leave') return 'MC06'
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
  const leftKey = getLeaveTypeKey(left.sortKey || left.tooltip)
  const rightKey = getLeaveTypeKey(right.sortKey || right.tooltip)
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
      const displayLabel = formatLeaveTypeDisplayLabel(leaveType)
      return {
        label: `${acronym || leaveType}: ${count}`,
        tooltip: displayLabel,
        sortKey: leaveType,
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
    cells.push({
      key: `e-${i}`,
      day: null,
      stateClass: 'is-empty',
      count: 0,
      leaveTypeBreakdown: [],
    })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const employees = getEmployeesOnLeave(date)
    const isToday = date.toDateString() === today.toDateString()
    const isSelected = selectedDate.value && date.toDateString() === selectedDate.value.toDateString()
    const isWeekend = date.getDay() === 0 || date.getDay() === 6

    let stateClass = 'is-weekday'
    if (isWeekend) stateClass = 'is-weekend'
    else if (employees.length) stateClass = 'is-has-leaves'

    cells.push({
      key: day,
      day,
      date,
      stateClass,
      count: employees.length,
      leaveTypeBreakdown: getLeaveTypeBreakdown(employees),
      isToday,
      isSelected,
    })
  }

  const remainder = cells.length % 7
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i++) {
      cells.push({
        key: `t-${i}`,
        day: null,
        stateClass: 'is-empty',
        count: 0,
        leaveTypeBreakdown: [],
      })
    }
  }

  return cells
})

const calendarWeeks = computed(() => {
  const rows = []
  for (let index = 0; index < calendarCells.value.length; index += 7) {
    rows.push(calendarCells.value.slice(index, index + 7))
  }
  return rows
})

const twoWeekWindowCount = computed(() => Math.max(1, calendarWeeks.value.length))
const currentWindowStartIndex = computed(() => calendarWindowIndex.value)

const visibleCalendarCells = computed(() => {
  return calendarWeeks.value[currentWindowStartIndex.value] || []
})

const hasPrevTwoWeekWindow = computed(() => calendarWindowIndex.value > 0)
const hasNextTwoWeekWindow = computed(() =>
  calendarWindowIndex.value < twoWeekWindowCount.value - 1,
)

const visibleWeekLabel = computed(() => {
  const currentWeek = calendarWeeks.value[currentWindowStartIndex.value] || []
  const startDate = currentWeek.find((cell) => cell?.date)?.date || null
  const endDate = [...currentWeek].reverse().find((cell) => cell?.date)?.date || startDate
  const weekNumber = currentWindowStartIndex.value + 1

  if (!startDate) return `Wk ${weekNumber}`

  const startLabel = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endLabel = (endDate || startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `Wk ${weekNumber}: ${startLabel} – ${endLabel}`
})

const weekLeaveSummaryText = computed(() => {
  const totalInWeek = visibleCalendarCells.value.reduce((sum, cell) => sum + Number(cell?.count || 0), 0)
  return `${totalInWeek} scheduled leave(s) this week`
})

const agendaPreviewDate = computed(() => {
  if (selectedDate.value) return selectedDate.value
  const todayCell = visibleCalendarCells.value.find((cell) => cell?.isToday)
  if (todayCell?.date) return todayCell.date
  const firstBusy = visibleCalendarCells.value.find((cell) => cell?.date && cell.count > 0)
  if (firstBusy?.date) return firstBusy.date
  return visibleCalendarCells.value.find((cell) => cell?.date)?.date || null
})

const agendaPreviewEmployees = computed(() =>
  agendaPreviewDate.value ? getEmployeesOnLeave(agendaPreviewDate.value) : [],
)

const agendaPreviewDateLabel = computed(() => {
  if (!agendaPreviewDate.value) return 'No date selected'
  const isToday = agendaPreviewDate.value.toDateString() === today.toDateString()
  const formatted = agendaPreviewDate.value.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  return isToday ? `Today (${formatted})` : formatted
})

watch(twoWeekWindowCount, (windowCount) => {
  if (calendarWindowIndex.value >= windowCount) {
    calendarWindowIndex.value = Math.max(windowCount - 1, 0)
  }
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

function prevTwoWeekWindow() {
  if (!hasPrevTwoWeekWindow.value) return
  calendarWindowIndex.value -= 1
  selectedDate.value = null
}

function nextTwoWeekWindow() {
  if (!hasNextTwoWeekWindow.value) return
  calendarWindowIndex.value += 1
  selectedDate.value = null
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
.calendar-panel-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 12px;
  border-color: #e2e8f0;
  background-color: #ffffff;
}

.calendar-panel-section {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  padding: 12px 14px;
}

.calendar-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 9px;
  margin-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
}

.calendar-panel-header__left {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 1 1 auto;
  min-width: 0;
}

.calendar-panel-header__copy {
  flex: 1 1 auto;
  min-width: 0;
}

.calendar-panel-header__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background-color: #dcfce7;
  color: #15803d;
  flex-shrink: 0;
}

.calendar-panel-header__title {
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.2;
  color: #0f172a;
}

.calendar-panel-header__subtitle {
  font-size: 0.72rem;
  color: #64748b;
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.department-select {
  width: 190px;
  max-width: 100%;
  flex-shrink: 0;
}

/* Unified Nav Bar */
.calendar-nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.calendar-month-controls {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.calendar-nav-arrow {
  color: #475569;
}

.calendar-picker-group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.calendar-picker {
  padding: 2px 6px;
  min-height: 30px;
  border-radius: 7px;
  color: #0f172a;
}

.calendar-picker:hover {
  background-color: #f1f5f9;
}

.calendar-picker :deep(.q-btn__content) {
  gap: 2px;
  font-size: 0.95rem;
  font-weight: 700;
}

.calendar-picker :deep(.q-icon) {
  font-size: 1rem;
  color: #64748b;
}

.calendar-today-jump-btn {
  margin-left: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  background-color: #f0fdf4;
  color: #15803d;
  font-size: 0.74rem;
  font-weight: 700;
}

.week-nav-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background-color: #f8fafc;
}

.week-nav-pill__label {
  font-size: 0.74rem;
  font-weight: 700;
  color: #334155;
  white-space: nowrap;
}

/* 7-Column Grid */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 5px;
}

.calendar-grid-header {
  margin-bottom: 4px;
}

.calendar-weekday-label {
  text-align: center;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #475569;
  padding: 2px;
}

.calendar-weekday-label.is-weekend {
  color: #94a3b8;
}

.calendar-day-cell {
  min-width: 0;
  min-height: 58px;
  padding: 5px 6px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background-color: #ffffff;
  transition:
    border-color 0.14s ease,
    background-color 0.14s ease,
    box-shadow 0.14s ease;
}

.calendar-day-cell.is-empty {
  background-color: #f8fafc;
  border-color: #f1f5f9;
}

.calendar-day-cell.is-weekend {
  background-color: #f8fafc;
  border-color: #e2e8f0;
}

.calendar-day-cell.is-weekend .calendar-day-num {
  color: #94a3b8;
}

.calendar-day-cell.is-has-leaves {
  background-color: #f0fdf4;
  border-color: #bbf7d0;
}

.calendar-day-cell.is-today {
  background-color: #ecfdf5;
  border: 1.5px solid #16a34a;
  box-shadow: 0 2px 8px rgba(22, 163, 74, 0.12);
}

.calendar-day-cell.is-selected {
  box-shadow: 0 0 0 2px rgba(21, 128, 61, 0.25);
}

.calendar-day-cell.is-clickable {
  cursor: pointer;
}

.calendar-day-cell.is-clickable:hover {
  border-color: #4ade80;
  box-shadow: 0 4px 10px -4px rgba(15, 23, 42, 0.12);
}

.calendar-day-cell:focus-visible {
  outline: 2px solid #16a34a;
  outline-offset: 2px;
}

.calendar-day-content {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  gap: 6px;
}

.calendar-day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.calendar-day-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #334155;
  border-radius: 999px;
}

.calendar-day-num.is-today-num {
  background-color: #15803d;
  color: #ffffff;
  font-weight: 800;
}

.calendar-count-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background-color: #dcfce7;
  color: #14532d;
  font-size: 0.68rem;
  font-weight: 800;
}

.calendar-leave-breakdown {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px;
}

.leave-type-chip {
  padding: 1px 5px;
  border-radius: 5px;
  background-color: #ffffff;
  border: 1px solid #d1fae5;
  color: #166534;
  font-size: 0.63rem;
  font-weight: 700;
  line-height: 1.25;
  white-space: nowrap;
}

.leave-type-more {
  font-size: 0.62rem;
  font-weight: 700;
  color: #64748b;
}

/* Bottom Agenda Strip */
.calendar-agenda-strip {
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background-color: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.calendar-agenda-strip__info {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  font-size: 0.76rem;
}

.calendar-agenda-strip__dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background-color: #94a3b8;
  flex-shrink: 0;
}

.calendar-agenda-strip__dot.is-active {
  background-color: #16a34a;
}

.calendar-agenda-strip__date {
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
}

.calendar-agenda-strip__sep {
  color: #94a3b8;
}

.calendar-agenda-strip__count {
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.calendar-agenda-strip__btn {
  color: #15803d;
  font-weight: 700;
  flex-shrink: 0;
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

/* Dark Mode */
:global(body.body--dark) .calendar-panel-card {
  background-color: var(--dm-surface, #1b2330);
  border-color: var(--dm-border, #324258);
}

:global(body.body--dark) .calendar-panel-header {
  border-bottom-color: var(--dm-border, #324258);
}

:global(body.body--dark) .calendar-panel-header__icon {
  background-color: rgba(34, 197, 94, 0.18);
  color: #86efac;
}

:global(body.body--dark) .calendar-panel-header__title,
:global(body.body--dark) .calendar-picker,
:global(body.body--dark) .calendar-day-num,
:global(body.body--dark) .calendar-agenda-strip__date {
  color: var(--dm-text-primary, #e6edf5);
}

:global(body.body--dark) .calendar-panel-header__subtitle,
:global(body.body--dark) .calendar-weekday-label,
:global(body.body--dark) .calendar-nav-arrow,
:global(body.body--dark) .calendar-agenda-strip__count {
  color: var(--dm-text-muted, #a4b1c2);
}

:global(body.body--dark) .calendar-picker:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

:global(body.body--dark) .calendar-today-jump-btn {
  background-color: rgba(34, 197, 94, 0.18);
  color: #86efac;
}

:global(body.body--dark) .week-nav-pill,
:global(body.body--dark) .calendar-agenda-strip {
  background-color: var(--dm-surface-2, #212b3a);
  border-color: var(--dm-border, #324258);
}

:global(body.body--dark) .week-nav-pill__label {
  color: var(--dm-text-secondary, #cad5e4);
}

:global(body.body--dark) .calendar-day-cell {
  background-color: var(--dm-surface-2, #212b3a);
  border-color: var(--dm-border, #324258);
}

:global(body.body--dark) .calendar-day-cell.is-empty,
:global(body.body--dark) .calendar-day-cell.is-weekend {
  background-color: var(--dm-surface, #1b2330);
  border-color: #283446;
}

:global(body.body--dark) .calendar-day-cell.is-has-leaves {
  background-color: rgba(22, 101, 52, 0.22);
  border-color: rgba(74, 222, 128, 0.35);
}

:global(body.body--dark) .calendar-day-cell.is-today {
  background-color: rgba(22, 101, 52, 0.3);
  border-color: #4ade80;
}

:global(body.body--dark) .calendar-count-pill {
  background-color: rgba(34, 197, 94, 0.24);
  color: #86efac;
}

:global(body.body--dark) .leave-type-chip {
  background-color: var(--dm-surface, #1b2330);
  border-color: rgba(74, 222, 128, 0.35);
  color: #86efac;
}

:global(body.body--dark) .calendar-agenda-strip__btn {
  color: #86efac;
}

@media (max-width: 767.98px) {
  .calendar-panel-header {
    flex-direction: column;
    align-items: stretch;
  }

  .department-select {
    width: 100%;
  }
}

@media (max-width: 599px) {
  .week-nav-pill {
    width: 100%;
    justify-content: space-between;
  }

  .calendar-grid {
    gap: 4px;
  }

  .calendar-day-cell {
    min-height: 62px;
    padding: 5px;
  }

  .calendar-leave-breakdown {
    display: none;
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
