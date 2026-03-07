<template>
  <q-page class="q-pa-md">
    <div class="q-mb-lg">
      <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Calendar</h1>
      <p class="text-grey-7">Visual overview of employee leaves across all departments</p>
    </div>

    <q-card flat bordered class="rounded-borders">
      <q-card-section>
        <div class="row justify-between items-center q-mb-md flex-wrap q-gutter-md">
          <div class="row q-gutter-sm items-center">
            <q-btn flat round dense icon="chevron_left" @click="prevMonth" />
            <div class="text-h6 q-mx-sm">{{ monthName }} {{ currentYear }}</div>
            <q-btn flat round dense icon="chevron_right" @click="nextMonth" />
          </div>
          <div class="row q-gutter-sm items-center">
            <q-btn unelevated color="primary" size="sm" label="Today" @click="goToday" />
            <q-select
              v-model="calendarDept"
              :options="departmentOptions"
              dense
              outlined
              emit-value
              map-options
              label="Select Department"
              clearable
              style="min-width: 220px"
              :loading="loadingDepts"
            />
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
            :class="cell.class"
            @click="cell.date && openDateDialog(cell.date)"
          >
            <div v-if="cell.day" class="row justify-between items-start">
              <span :class="cell.dayClass">{{ cell.day }}</span>
              <q-badge v-if="cell.count" :label="cell.count" color="orange" />
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Date Detail Dialog -->
    <q-dialog v-model="showDateDialog">
      <q-card style="min-width: 520px; max-width: 640px" class="rounded-borders">
        <q-card-section class="row items-center bg-primary text-white">
          <q-icon name="calendar_today" size="sm" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold">{{ selectedDateLabel }}</div>
          <q-space />
          <q-btn icon="close" flat round dense color="white" v-close-popup />
        </q-card-section>

        <q-card-section>
          <div v-if="selectedDateEmployees.length" class="text-caption text-grey-7 q-mb-md">
            {{ selectedDateEmployees.length }} employee(s) on leave
          </div>

          <div v-if="selectedDateEmployees.length" class="q-gutter-sm">
            <q-card
              v-for="emp in selectedDateEmployees"
              :key="emp.id"
              flat
              bordered
              class="rounded-borders"
            >
              <q-card-section class="q-pa-md">
                <div class="row items-center no-wrap q-mb-xs">
                  <q-avatar size="32px" color="primary" text-color="white" class="q-mr-sm">
                    {{ emp.employeeName.charAt(0) }}
                  </q-avatar>
                  <div class="col">
                    <div class="text-weight-medium">{{ emp.employeeName }}</div>
                    <div class="text-caption text-grey-6">{{ emp.employeeId }}</div>
                  </div>
                  <q-badge color="positive" label="Approved" />
                </div>
                <div class="row q-gutter-xs q-mt-xs">
                  <q-badge outline color="primary" :label="emp.leaveType" />
                  <q-badge outline color="grey-7" :label="emp.office" />
                  <q-badge outline color="orange" :label="emp.days + ' day(s)'" />
                </div>
                <div class="text-caption text-grey-6 q-mt-xs">
                  {{ formatDate(emp.startDate) }} — {{ formatDate(emp.endDate) }}
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
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { api } from 'src/boot/axios'

const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const currentMonth = ref(new Date())
const calendarDept = ref(null)
const selectedDate = ref(null)
const showDateDialog = ref(false)
const calendarLeaves = ref([])
const loading = ref(false)
const loadingDepts = ref(false)
const departmentOptions = ref([])

// Fetch departments from API
async function fetchDepartments() {
  loadingDepts.value = true
  try {
    const { data } = await api.get('/departments')
    const depts = data.departments ?? data ?? []
    departmentOptions.value = depts.map(d => ({
      label: typeof d === 'string' ? d : d.name,
      value: typeof d === 'string' ? d : d.name,
    }))
  } catch {
    departmentOptions.value = []
  } finally {
    loadingDepts.value = false
  }
}

// Fetch approved leaves for the current month from backend
async function fetchCalendarLeaves() {
  loading.value = true
  try {
    const year = currentMonth.value.getFullYear()
    const month = currentMonth.value.getMonth() + 1
    const params = { year, month }
    if (calendarDept.value) params.department = calendarDept.value
    const { data } = await api.get('/hr/calendar', { params })
    calendarLeaves.value = data.leaves ?? []
  } catch {
    calendarLeaves.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDepartments()
  fetchCalendarLeaves()
})

// Re-fetch when month or department changes
watch([currentMonth, calendarDept], () => {
  fetchCalendarLeaves()
})

const monthName = computed(() => currentMonth.value.toLocaleString('en-US', { month: 'long' }))
const currentYear = computed(() => currentMonth.value.getFullYear())

const today = new Date()

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
  return calendarLeaves.value.filter((app) => {
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
    cells.push({ key: `e-${i}`, day: null, class: 'bg-grey-2', employees: [], dayClass: '' })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const employees = getEmployeesOnLeave(date)
    const isToday = date.toDateString() === today.toDateString()
    const isSelected = selectedDate.value && date.toDateString() === selectedDate.value.toDateString()
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    let cls = 'bg-white'
    if (isToday) cls = 'bg-blue-1'
    if (isSelected) cls = 'bg-blue-2'
    if (employees.length && !isSelected) cls = 'bg-orange-1'
    if (isWeekend && !isToday && !isSelected) cls = 'bg-grey-2'
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
      employees,
    })
  }
  return cells
})

const selectedDateLabel = computed(() =>
  selectedDate.value ? selectedDate.value.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''
)

const selectedDateEmployees = computed(() => (selectedDate.value ? getEmployeesOnLeave(selectedDate.value) : []))

function openDateDialog(date) {
  selectedDate.value = date
  showDateDialog.value = true
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
function prevMonth() {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1)
  selectedDate.value = null
}
function nextMonth() {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1)
  selectedDate.value = null
}
function goToday() {
  currentMonth.value = new Date()
  selectedDate.value = new Date()
  showDateDialog.value = true
}
</script>

<style scoped>
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.calendar-grid-header { margin-bottom: 4px; }
.min-h-80 { min-height: 80px; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
