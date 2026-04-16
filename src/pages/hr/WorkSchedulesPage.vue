<template>
  <q-page class="work-schedules-page q-pa-md">
    <div class="page-header q-mb-md">
      <div>
        <div class="text-h4 text-weight-bold">Work Schedule</div>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-xl-5">
        <q-card flat bordered class="settings-card full-height">
          <q-card-section class="row items-center q-pb-none">
            <div>
              <div class="text-h6">Default Schedule</div>
              <div class="text-caption text-grey-7">
                Used for everyone unless an employee override exists.
              </div>
            </div>
            <q-space />
            <q-chip
              dense
              square
              :color="hasLoadedSchedules ? 'green-1' : 'grey-3'"
              :text-color="hasLoadedSchedules ? 'green-9' : 'grey-8'"
              :icon="hasLoadedSchedules ? 'query_builder' : 'hourglass_top'"
            >
              {{ hasLoadedSchedules ? defaultWorkingHoursLabel : 'Loading schedule...' }}
            </q-chip>
          </q-card-section>

          <q-card-section v-if="hasLoadedSchedules">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input v-model="defaultScheduleForm.work_start_time" outlined dense type="time" label="Work Start *" />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model="defaultScheduleForm.work_end_time" outlined dense type="time" label="Work End *" />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model="defaultScheduleForm.break_start_time" outlined dense type="time" label="Break Start" />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model="defaultScheduleForm.break_end_time" outlined dense type="time" label="Break End" />
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  :model-value="formatDeductionValue(defaultWholeDayDeduction)"
                  outlined
                  dense
                  readonly
                  label="Whole Day Leave Deduction *"
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  :model-value="formatDeductionValue(defaultHalfDayDeduction)"
                  outlined
                  dense
                  readonly
                  label="Half Day Leave Deduction *"
                />
              </div>
            </div>
          </q-card-section>

          <q-card-section v-else class="q-pt-md">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6"><q-skeleton height="40px" bordered /></div>
              <div class="col-12 col-sm-6"><q-skeleton height="40px" bordered /></div>
              <div class="col-12 col-sm-6"><q-skeleton height="40px" bordered /></div>
              <div class="col-12 col-sm-6"><q-skeleton height="40px" bordered /></div>
              <div class="col-12 col-sm-6"><q-skeleton height="40px" bordered /></div>
              <div class="col-12 col-sm-6"><q-skeleton height="40px" bordered /></div>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-actions v-if="hasLoadedSchedules" align="between" class="q-pa-md items-center">
            <div class="text-caption text-grey-7">
              <span v-if="defaultScheduleMeta.updated_at">
                Last updated {{ formatDateTime(defaultScheduleMeta.updated_at) }}
              </span>
              <span v-else>Using the built-in LMS defaults.</span>
              <span v-if="defaultScheduleMeta.updated_by_hr"> by {{ defaultScheduleMeta.updated_by_hr }}</span>
            </div>
            <div class="row q-gutter-sm">
              <q-btn flat no-caps color="grey-7" label="Reset" :disable="loading || savingDefault" @click="resetDefaultScheduleForm" />
              <q-btn unelevated no-caps color="primary" label="Save Default Schedule" :loading="savingDefault" @click="saveDefaultSchedule" />
            </div>
          </q-card-actions>

          <q-card-actions v-else align="between" class="q-pa-md items-center">
            <div class="text-caption text-grey-7">Loading saved work schedule...</div>
            <q-btn flat no-caps color="grey-6" label="Please wait" disable />
          </q-card-actions>
        </q-card>
      </div>

      <div class="col-12 col-xl-7">
        <q-card flat bordered class="settings-card full-height">
          <q-card-section class="row items-center q-col-gutter-sm">
            <div class="col-12 col-md">
              <div class="text-h6">Employee Overrides</div>
              <div class="text-caption text-grey-7">
                Assign a custom work schedule and deduction rule for a specific employee.
              </div>
            </div>
            <div class="col-12 col-md-auto">
              <q-input
                v-model="overrideSearch"
                outlined
                dense
                clearable
                debounce="250"
                label="Search override"
                style="min-width: 220px"
              >
                <template #prepend>
                  <q-icon name="search" />
                </template>
              </q-input>
            </div>
            <div class="col-12 col-md-auto">
              <q-btn unelevated no-caps color="primary" icon="person_add" label="Add Override" @click="openCreateOverrideDialog" />
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section class="q-pa-none">
            <q-table
              flat
              :rows="filteredOverrides"
              :columns="overrideColumns"
              row-key="id"
              :loading="loading"
              :pagination="{ rowsPerPage: 10 }"
              no-data-label="No employee overrides yet."
            >
              <template #body-cell-employee="props">
                <q-td :props="props">
                  <div class="text-weight-medium">{{ props.row.employee_name || 'Unknown employee' }}</div>
                </q-td>
              </template>

              <template #body-cell-office="props">
                <q-td :props="props">
                  <div>{{ resolveEmployeeOfficeAcronymLabel(props.row) || 'N/A' }}</div>
                  <div class="text-caption text-grey-7">{{ props.row.designation || 'No designation' }}</div>
                </q-td>
              </template>

              <template #body-cell-status="props">
                <q-td :props="props">
                  <div>{{ props.row.status || 'No status' }}</div>
                </q-td>
              </template>

              <template #body-cell-schedule="props">
                <q-td :props="props">
                  <div>{{ formatScheduleSummary(props.row) }}</div>
                  <div class="text-caption text-grey-7">{{ formatWorkingHoursLabel(props.row.working_hours_per_day) }}</div>
                </q-td>
              </template>

              <template #body-cell-deduction="props">
                <q-td :props="props">
                  <div>Whole: {{ formatDecimal(props.row.whole_day_leave_deduction) }}</div>
                  <div class="text-caption text-grey-7">Half: {{ formatDecimal(props.row.half_day_leave_deduction) }}</div>
                </q-td>
              </template>

              <template #body-cell-updated_at="props">
                <q-td :props="props">
                  <div>{{ formatDateTime(props.row.updated_at) }}</div>
                  <div class="text-caption text-grey-7">{{ props.row.updated_by_hr || 'HR' }}</div>
                </q-td>
              </template>

              <template #body-cell-actions="props">
                <q-td :props="props" class="text-right">
                  <q-btn flat round dense icon="edit" color="primary" @click="openEditOverrideDialog(props.row)">
                    <q-tooltip>Edit override</q-tooltip>
                  </q-btn>
                  <q-btn flat round dense icon="delete" color="negative" @click="confirmDeleteOverride(props.row)">
                    <q-tooltip>Delete override</q-tooltip>
                  </q-btn>
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-dialog v-model="showOverrideDialog" persistent>
      <q-card class="override-dialog">
        <q-card-section class="row items-center q-pb-none">
          <div>
            <div class="text-h6">{{ editingOverrideId ? 'Edit Employee Override' : 'Add Employee Override' }}</div>
            <div class="text-caption text-grey-7">
              Create a custom work schedule and leave-deduction rule for one employee.
            </div>
          </div>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup :disable="savingOverride" />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="row q-col-gutter-md">
            <div v-if="!editingOverrideId" class="col-12">
              <q-select
                v-model="overrideForm.employee_control_no"
                v-model:input-value="employeeSearch"
                outlined
                dense
                emit-value
                map-options
                use-input
                fill-input
                hide-selected
                clearable
                option-label="label"
                option-value="value"
                :options="employeeOptions"
                :loading="loadingEmployeeOptions"
                :disable="Boolean(editingOverrideId)"
                label="Employee *"
                hint="Type at least 2 characters to search active employees."
                @filter="filterEmployeeOptions"
                @popup-show="handleEmployeePopupShow"
                @update:model-value="handleEmployeeSelection"
              >
                <template #option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section>
                      <q-item-label>{{ scope.opt.label }}</q-item-label>
                      <q-item-label caption>{{ scope.opt.caption }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
                <template #no-option>
                  <q-item>
                    <q-item-section class="text-grey-7">{{ employeeNoOptionMessage }}</q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>

            <div v-if="selectedOverrideEmployee" class="col-12">
              <q-banner rounded class="bg-grey-1 text-grey-9">
                <div class="text-weight-medium">{{ selectedOverrideEmployee.full_name || selectedOverrideEmployee.label }}</div>
                <div class="text-caption">{{ selectedOverrideEmployee.designation || 'No designation' }}</div>
                <div class="text-caption">{{ resolveEmployeeOfficeAcronymLabel(selectedOverrideEmployee) || 'No office' }} • {{ selectedOverrideEmployee.status || 'No status' }}</div>
              </q-banner>
            </div>

            <div class="col-12 col-sm-6">
              <q-input v-model="overrideForm.work_start_time" outlined dense type="time" label="Work Start *" />
            </div>
            <div class="col-12 col-sm-6">
              <q-input v-model="overrideForm.work_end_time" outlined dense type="time" label="Work End *" />
            </div>
            <div class="col-12 col-sm-6">
              <q-input v-model="overrideForm.break_start_time" outlined dense type="time" label="Break Start" />
            </div>
            <div class="col-12 col-sm-6">
              <q-input v-model="overrideForm.break_end_time" outlined dense type="time" label="Break End" />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                :model-value="formatDeductionValue(overrideWholeDayDeduction)"
                outlined
                dense
                readonly
                label="Whole Day Leave Deduction *"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                :model-value="formatDeductionValue(overrideHalfDayDeduction)"
                outlined
                dense
                readonly
                label="Half Day Leave Deduction *"
              />
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md q-gutter-sm">
          <q-btn flat no-caps color="grey-7" label="Cancel" v-close-popup :disable="savingOverride" />
          <q-btn unelevated no-caps color="primary" :label="editingOverrideId ? 'Save Changes' : 'Create Override'" :loading="savingOverride" @click="saveOverride" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const STANDARD_WORKDAY_HOURS = 8
const $q = useQuasar()

const loading = ref(false)
const savingDefault = ref(false)
const savingOverride = ref(false)
const loadingEmployeeOptions = ref(false)
const hasLoadedSchedules = ref(false)

const showOverrideDialog = ref(false)
const editingOverrideId = ref(null)
const overrideSearch = ref('')
const employeeSearch = ref('')

const defaultScheduleForm = ref(defaultSchedulePayload())
const defaultScheduleSnapshot = ref(defaultSchedulePayload())
const defaultScheduleMeta = ref({ updated_at: null, updated_by_hr: null })

const employeeOverrides = ref([])
const employeeOptions = ref([])
const employeeDirectory = ref({})
const selectedOverrideEmployee = ref(null)
let employeeLookupRequestId = 0

const overrideForm = ref(defaultOverridePayload())

const overrideColumns = [
  { name: 'employee', label: 'Employee', align: 'left', field: 'employee_name', sortable: true },
  { name: 'office', label: 'Office / Designation', align: 'left', field: 'office', sortable: true },
  { name: 'status', label: 'Status', align: 'left', field: 'status', sortable: true },
  { name: 'schedule', label: 'Schedule', align: 'left', field: 'work_start_time' },
  { name: 'deduction', label: 'Deduction', align: 'left', field: 'whole_day_leave_deduction' },
  { name: 'updated_at', label: 'Last Updated', align: 'left', field: 'updated_at', sortable: true },
  { name: 'actions', label: 'Actions', align: 'right', field: 'actions' },
]

const filteredOverrides = computed(() => {
  const term = String(overrideSearch.value || '').trim().toLowerCase()
  if (!term) return employeeOverrides.value

  return employeeOverrides.value.filter((row) => {
    const haystack = [
      row.employee_name,
      row.employee_control_no,
      row.office,
      row.designation,
      row.status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(term)
  })
})

const defaultWorkingHoursLabel = computed(() => formatWorkingHoursLabel(calculateWorkingHours(defaultScheduleForm.value)))
const defaultWholeDayDeduction = computed(() => calculateWholeDayDeduction(defaultScheduleForm.value))
const defaultHalfDayDeduction = computed(() => calculateHalfDayDeduction(defaultScheduleForm.value))
const overrideWholeDayDeduction = computed(() => calculateWholeDayDeduction(overrideForm.value))
const overrideHalfDayDeduction = computed(() => calculateHalfDayDeduction(overrideForm.value))
const employeeNoOptionMessage = computed(() => {
  if (loadingEmployeeOptions.value) return 'Searching employees...'
  if (String(employeeSearch.value || '').trim().length < 2) return 'Type at least 2 characters to search employees.'
  return 'No matching employees found.'
})

onMounted(() => {
  void loadSchedules()
})

function defaultSchedulePayload() {
  return {
    work_start_time: '08:00',
    work_end_time: '17:00',
    break_start_time: '12:00',
    break_end_time: '13:00',
    whole_day_leave_deduction: 1,
    half_day_leave_deduction: 0.5,
  }
}

function defaultOverridePayload() {
  return {
    employee_control_no: '',
    work_start_time: '08:00',
    work_end_time: '17:00',
    break_start_time: '12:00',
    break_end_time: '13:00',
    whole_day_leave_deduction: 1,
    half_day_leave_deduction: 0.5,
  }
}

function applyDefaultSchedule(schedule) {
  const normalized = {
    ...defaultSchedulePayload(),
    ...schedule,
    whole_day_leave_deduction: Number(schedule?.whole_day_leave_deduction ?? 1),
    half_day_leave_deduction: Number(schedule?.half_day_leave_deduction ?? 0.5),
  }

  defaultScheduleForm.value = { ...normalized }
  defaultScheduleSnapshot.value = { ...normalized }
  defaultScheduleMeta.value = {
    updated_at: schedule?.updated_at || null,
    updated_by_hr: schedule?.updated_by_hr || null,
  }
}

function applyOverrideForm(schedule, employee = null) {
  overrideForm.value = {
    ...defaultOverridePayload(),
    ...schedule,
    employee_control_no: schedule?.employee_control_no || '',
    whole_day_leave_deduction: Number(schedule?.whole_day_leave_deduction ?? 1),
    half_day_leave_deduction: Number(schedule?.half_day_leave_deduction ?? 0.5),
  }
  selectedOverrideEmployee.value = employee || null
}

function resetDefaultScheduleForm() {
  defaultScheduleForm.value = { ...defaultScheduleSnapshot.value }
}

async function loadSchedules() {
  loading.value = true
  try {
    const { data } = await api.get('/hr/work-schedules')
    applyDefaultSchedule(data?.default_schedule || defaultSchedulePayload())
    employeeOverrides.value = Array.isArray(data?.employee_overrides) ? data.employee_overrides : []
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: resolveApiErrorMessage(err, 'Unable to load work schedule settings right now.'),
      position: 'top',
    })
  } finally {
    hasLoadedSchedules.value = true
    loading.value = false
  }
}

async function saveDefaultSchedule() {
  savingDefault.value = true
  try {
    const payload = buildSchedulePayload(defaultScheduleForm.value)
    const { data } = await api.put('/hr/work-schedules/default', payload)
    applyDefaultSchedule(data?.default_schedule || payload)
    $q.notify({ type: 'positive', message: data?.message || 'Default schedule updated successfully.', position: 'top' })
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: resolveApiErrorMessage(err, 'Unable to save the default schedule right now.'),
      position: 'top',
    })
  } finally {
    savingDefault.value = false
  }
}

function openCreateOverrideDialog() {
  editingOverrideId.value = null
  employeeSearch.value = ''
  employeeOptions.value = []
  selectedOverrideEmployee.value = null
  applyOverrideForm(defaultScheduleSnapshot.value)
  overrideForm.value.employee_control_no = ''
  showOverrideDialog.value = true
}

function openEditOverrideDialog(row) {
  editingOverrideId.value = Number(row.id)
  employeeSearch.value = row.employee_name || ''
  employeeOptions.value = []
  selectedOverrideEmployee.value = {
    control_no: row.employee_control_no,
    full_name: row.employee_name,
    designation: row.designation,
    office: row.office,
    officeAcronym: row.hrisOfficeAcronym || row.officeAcronym || null,
    hrisOfficeAcronym: row.hrisOfficeAcronym || row.officeAcronym || null,
    status: row.status,
    label: row.employee_name,
  }
  applyOverrideForm(row, selectedOverrideEmployee.value)
  showOverrideDialog.value = true
}

async function saveOverride() {
  if (!overrideForm.value.employee_control_no) {
    $q.notify({ type: 'warning', message: 'Please select an employee first.', position: 'top' })
    return
  }

  savingOverride.value = true
  try {
    const payload = {
      employee_control_no: overrideForm.value.employee_control_no,
      ...buildSchedulePayload(overrideForm.value),
    }

    let data
    if (editingOverrideId.value) {
      ;({ data } = await api.put(`/hr/work-schedules/overrides/${editingOverrideId.value}`, payload))
    } else {
      ;({ data } = await api.post('/hr/work-schedules/overrides', payload))
    }

    $q.notify({
      type: 'positive',
      message: data?.message || 'Employee schedule override saved successfully.',
      position: 'top',
    })

    showOverrideDialog.value = false
    await loadSchedules()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: resolveApiErrorMessage(err, 'Unable to save the employee override right now.'),
      position: 'top',
    })
  } finally {
    savingOverride.value = false
  }
}

function confirmDeleteOverride(row) {
  $q.dialog({
    title: 'Delete Override',
    message: `Remove the work schedule override for ${row.employee_name}?`,
    cancel: { flat: true, noCaps: true, color: 'grey-7' },
    ok: { unelevated: true, noCaps: true, color: 'negative', label: 'Delete' },
    persistent: true,
  }).onOk(async () => {
    try {
      const { data } = await api.delete(`/hr/work-schedules/overrides/${row.id}`)
      $q.notify({ type: 'positive', message: data?.message || 'Employee override removed successfully.', position: 'top' })
      await loadSchedules()
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: resolveApiErrorMessage(err, 'Unable to delete the employee override right now.'),
        position: 'top',
      })
    }
  })
}

async function handleEmployeePopupShow() {
  if (editingOverrideId.value) return
  if (loadingEmployeeOptions.value) return
  if (employeeOptions.value.length) return
}

function handleEmployeeSelection(controlNo) {
  const normalizedControlNo = String(controlNo || '').trim()
  if (!normalizedControlNo) {
    selectedOverrideEmployee.value = null
    employeeSearch.value = ''
    return
  }

  const selectedEmployee = employeeDirectory.value[normalizedControlNo] || null
  selectedOverrideEmployee.value = selectedEmployee
  employeeSearch.value = selectedEmployee?.full_name || selectedEmployee?.label || normalizedControlNo
}

function filterEmployeeOptions(value, update) {
  employeeSearch.value = String(value || '').trim()

  if (editingOverrideId.value) {
    update(() => {
      employeeOptions.value = []
    })
    return
  }

  if (employeeSearch.value.length < 2) {
    update(() => {
      employeeOptions.value = []
    })
    return
  }

  void fetchEmployeeOptions(employeeSearch.value)
    .then(() => {
      update(() => {})
    })
    .catch(() => {
      update(() => {
        employeeOptions.value = []
      })
    })
}

async function fetchEmployeeOptions(searchTerm) {
  const requestId = ++employeeLookupRequestId
  loadingEmployeeOptions.value = true

  try {
    const { data } = await api.get('/hr/employee-options', {
      params: {
        search: String(searchTerm || '').trim() || undefined,
        limit: 20,
        activity: 'ACTIVE',
      },
    })

    if (requestId !== employeeLookupRequestId) return

    const employees = Array.isArray(data?.employees) ? data.employees : []
    const directory = { ...employeeDirectory.value }
    const options = employees.map((employee) => {
      const controlNo = String(employee?.control_no || '').trim()
      const fullName = String(
        employee?.full_name
        || [employee?.firstname, employee?.middlename, employee?.surname].filter(Boolean).join(' ')
        || controlNo,
      ).trim() || controlNo
      directory[controlNo] = employee
      return {
        label: fullName,
        value: controlNo,
        caption: [
          employee?.designation,
          resolveEmployeeOfficeAcronymLabel(employee),
        ].filter(Boolean).join(' • '),
        full_name: fullName,
      }
    })

    employeeDirectory.value = directory
    employeeOptions.value = options
  } finally {
    if (requestId === employeeLookupRequestId) {
      loadingEmployeeOptions.value = false
    }
  }
}

function buildSchedulePayload(form) {
  const wholeDayDeduction = calculateWholeDayDeduction(form)
  const halfDayDeduction = calculateHalfDayDeduction(form)

  return {
    work_start_time: normalizeTime(form.work_start_time),
    work_end_time: normalizeTime(form.work_end_time),
    break_start_time: normalizeTime(form.break_start_time),
    break_end_time: normalizeTime(form.break_end_time),
    whole_day_leave_deduction: wholeDayDeduction ?? 1,
    half_day_leave_deduction: halfDayDeduction ?? 0.5,
  }
}

function normalizeTime(value) {
  const raw = String(value || '').trim()
  return raw || null
}

function calculateWorkingHours(schedule) {
  const start = parseTimeToMinutes(schedule?.work_start_time)
  const end = parseTimeToMinutes(schedule?.work_end_time)
  if (start === null || end === null || end <= start) return null

  let minutes = end - start
  const breakStart = parseTimeToMinutes(schedule?.break_start_time)
  const breakEnd = parseTimeToMinutes(schedule?.break_end_time)
  if (breakStart !== null && breakEnd !== null && breakEnd > breakStart && breakStart >= start && breakEnd <= end) {
    minutes -= breakEnd - breakStart
  }

  if (minutes <= 0) return null
  return Math.round((minutes / 60) * 100) / 100
}

function calculateWholeDayDeduction(schedule) {
  const workingHours = calculateWorkingHours(schedule)
  if (workingHours === null) return null

  return Math.round((workingHours / STANDARD_WORKDAY_HOURS) * 1000) / 1000
}

function calculateHalfDayDeduction(schedule) {
  const wholeDayDeduction = calculateWholeDayDeduction(schedule)
  if (wholeDayDeduction === null) return null

  return Math.round((wholeDayDeduction / 2) * 1000) / 1000
}

function parseTimeToMinutes(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const match = raw.match(/^(\d{2}):(\d{2})/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function formatWorkingHoursLabel(value) {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return 'Invalid schedule'
  return `${numeric.toFixed(2)} hour(s)`
}

function resolveEmployeeOfficeAcronymLabel(employee) {
  const hrisOfficeAcronym = String(employee?.hrisOfficeAcronym || '').trim()
  const officeAcronym = String(employee?.officeAcronym || '').trim()
  const directOffice = String(employee?.office || '').trim()
  const assignedDepartment = String(employee?.assigned_department_name || '').trim()
  const hrisOffice = String(employee?.hris_office || '').trim()

  return (
    hrisOfficeAcronym
    || officeAcronym
    || directOffice
    || assignedDepartment
    || hrisOffice
    || ''
  )
}

function formatScheduleSummary(row) {
  const workRange = `${formatTime(row.work_start_time)} - ${formatTime(row.work_end_time)}`
  if (row.break_start_time && row.break_end_time) {
    return `${workRange} (Break ${formatTime(row.break_start_time)} - ${formatTime(row.break_end_time)})`
  }
  return workRange
}

function formatTime(value) {
  const raw = String(value || '').trim()
  return raw || '--'
}

function formatDecimal(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toFixed(3) : '0.000'
}

function formatDeductionValue(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toFixed(3) : 'Invalid schedule'
}

function formatDateTime(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed)
}
</script>

<style scoped>
.work-schedules-page {
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.settings-card {
  border-radius: 18px;
}

.override-dialog {
  width: min(860px, 96vw);
  max-width: 96vw;
  border-radius: 18px;
}
</style>

