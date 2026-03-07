<template>
  <q-page class="q-pa-md">
    <div class="q-mb-lg">
      <div class="row items-center q-mb-xs">
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-none">Apply for Leave</h1>
      </div>
      <p class="text-grey-7">Civil Service Form No. 6 — Application for Leave</p>
    </div>

    <q-card flat bordered class="rounded-borders q-mb-lg">
      <!-- Form Header -->
      <q-card-section class="text-center bg-primary text-white">
        <div class="text-h6 text-weight-bold">APPLICATION FOR LEAVE</div>
        <div class="text-caption" style="opacity: 0.8">Civil Service Form No. 6 (Revised 2020)</div>
      </q-card-section>

      <!-- Stepper -->
      <q-stepper
        v-model="step"
        flat
        animated
        color="primary"
        done-color="positive"
        active-color="primary"
        inactive-color="grey-5"
      >
        <!-- ==================== STEP 1: Employee Information ==================== -->
        <q-step :name="1" title="Employee Information" icon="person" :done="step > 1">
          <q-form ref="step1Form" greedy>
            <div class="text-subtitle1 text-weight-bold q-mb-md">Employee Information</div>
            <p class="text-grey-6 text-body2 q-mb-lg">Please verify your information below.</p>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-4">
                <label class="input-label">1. Office / Department</label>
                <q-input
                  :model-value="officeDisplayValue"
                  outlined
                  dense
                  readonly
                  placeholder="Your department"
                  :rules="[() => !!(officeDisplayValue && String(officeDisplayValue).trim()) || 'Office / Department is required']"
                  class="form-input readonly-field"
                />
              </div>
              <div class="col-12 col-md-4">
                <label class="input-label">2. Last Name</label>
                <q-input
                  :model-value="lastNameDisplayValue"
                  outlined
                  dense
                  readonly
                  placeholder="Last name"
                  :rules="[() => !!lastNameDisplayValue || 'Last name is required']"
                  class="form-input readonly-field"
                />
              </div>
              <div class="col-12 col-md-4">
                <label class="input-label">First Name</label>
                <q-input
                  :model-value="firstNameDisplayValue"
                  outlined
                  dense
                  readonly
                  placeholder="First name"
                  :rules="[() => !!firstNameDisplayValue || 'First name is required']"
                  class="form-input readonly-field"
                />
              </div>
            </div>

            <div class="row q-col-gutter-md q-mt-xs">
              <div class="col-12 col-md-4">
                <label class="input-label">3. Date of Filing</label>
                <q-input
                  :model-value="todayFormatted"
                  outlined
                  dense
                  readonly
                  class="form-input"
                >
                  <template #prepend>
                    <q-icon name="calendar_today" size="sm" color="grey-6" />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-md-4">
                <label class="input-label">4. Position</label>
                <q-input
                  :model-value="positionDisplayValue"
                  outlined
                  dense
                  readonly
                  placeholder="Position"
                  :rules="[() => !!positionDisplayValue || 'Position is required']"
                  class="form-input readonly-field"
                />
              </div>
              <div class="col-12 col-md-4">
                <label class="input-label">5. Salary</label>
                <q-input
                  :model-value="formatSalary(form.salary)"
                  outlined
                  dense
                  placeholder="Enter Salary"
                  :rules="[val => {
                    const parsed = parseSalary(val || form.salary)
                    return !!parsed || 'Salary is required'
                  }]"
                  class="form-input"
                  @update:model-value="handleSalaryInput"
                >
                  <template #prepend>
                    <span class="text-grey-6 text-body2">&#8369;</span>
                  </template>
                </q-input>
              </div>
            </div>

            <q-stepper-navigation class="q-mt-lg flex justify-end">
              <q-btn
                unelevated
                no-caps
                color="primary"
                label="Next: Details of Application"
                icon-right="arrow_forward"
                @click="goToStep2"
                class="step-btn"
              />
            </q-stepper-navigation>
          </q-form>
        </q-step>

        <!-- ==================== STEP 2: Details of Application ==================== -->
        <q-step :name="2" title="Details of Application" icon="description" :done="step > 2">
          <q-form @submit.prevent="onSubmit" greedy>
            <!-- 6.A Type of Leave -->
            <div class="section-block q-mb-lg">
              <div class="text-subtitle1 text-weight-bold q-mb-xs">6.A Type of Leave to be Availed Of</div>
              <p class="text-grey-6 text-caption q-mb-md">Select the type of leave you wish to apply for.</p>

              <q-select
                v-model="form.leaveTypeId"
                :options="leaveTypeOptions"
                label="Select Leave Type"
                outlined
                dense
                emit-value
                map-options
                use-input
                input-debounce="0"
                :rules="[val => !!val || 'Please select a leave type']"
                class="form-input"
                @filter="filterLeaveTypes"
                @update:model-value="onLeaveTypeChange"
              >
                <template #prepend>
                  <q-icon name="event_note" size="sm" color="grey-6" />
                </template>
                <template #no-option>
                  <q-item>
                    <q-item-section class="text-grey">No results found</q-item-section>
                  </q-item>
                </template>
              </q-select>

              <!-- Others / specify -->
              <q-input
                v-if="form.leaveType === 'Others'"
                v-model="form.leaveTypeOther"
                outlined
                dense
                label="Other purpose"
                placeholder="Enter Leave Type"
                class="form-input q-mt-sm"
                :rules="[val => !!val || 'Please specify leave type']"
              />
            </div>

            <!-- 6.B Details of Leave (conditional — only for Vacation, Sick, Study, Women, Others) -->
            <div v-if="showDetailsOfLeave" class="section-block q-mb-lg">
              <div class="text-subtitle1 text-weight-bold q-mb-xs">6.B Details of Leave</div>
              <p class="text-grey-6 text-caption q-mb-md">Provide additional details based on your selected leave type.</p>

              <!-- Vacation / Special Privilege Leave -->
              <div v-if="isVacationType" class="q-gutter-sm">
                <div class="text-body2 text-weight-medium q-mb-sm">In case of Vacation/Special Privilege Leave:</div>
                <q-option-group
                  v-model="form.vacationDetail"
                  :options="[
                    { label: 'Within the Philippines', value: 'Within the Philippines' },
                    { label: 'Abroad (Specify)', value: 'Abroad' },
                  ]"
                  type="radio"
                  color="primary"
                />
                <q-input
                  v-if="form.vacationDetail === 'Abroad'"
                  v-model="form.vacationSpecify"
                  outlined
                  dense
                  label="Specify destination"
                  placeholder="Enter Destination"
                  class="form-input q-mt-sm"
                />
                <q-input
                  v-if="form.vacationDetail === 'Within the Philippines'"
                  v-model="form.vacationSpecify"
                  outlined
                  dense
                  label="Specify location"
                  placeholder="Enter Location"
                  class="form-input q-mt-sm"
                />
              </div>

              <!-- Sick Leave -->
              <div v-if="isSickType" class="q-gutter-sm">
                <div class="text-body2 text-weight-medium q-mb-sm">In case of Sick Leave:</div>
                <q-option-group
                  v-model="form.sickDetail"
                  :options="[
                    { label: 'In Hospital (Specify Illness)', value: 'In Hospital' },
                    { label: 'Out Patient (Specify Illness)', value: 'Out Patient' },
                  ]"
                  type="radio"
                  color="primary"
                />
                <q-input
                  v-if="form.sickDetail"
                  v-model="form.sickSpecify"
                  outlined
                  dense
                  label="Specify illness"
                  placeholder="Enter Illness"
                  class="form-input q-mt-sm"
                />
              </div>

              <!-- Special Leave Benefits for Women -->
              <div v-if="form.leaveType === 'Special Leave Benefits for Women'" class="q-gutter-sm">
                <div class="text-body2 text-weight-medium q-mb-sm">In case of Special Leave Benefits for Women:</div>
                <q-input
                  v-model="form.womenSpecify"
                  outlined
                  dense
                  label="Specify illness"
                  placeholder="Enter Illness"
                  class="form-input"
                />
              </div>

              <!-- Study Leave -->
              <div v-if="form.leaveType === 'Study Leave'" class="q-gutter-sm">
                <div class="text-body2 text-weight-medium q-mb-sm">In case of Study Leave:</div>
                <q-option-group
                  v-model="form.studyDetail"
                  :options="[
                    { label: 'Completion of Master\'s Degree', value: 'Masters Degree' },
                    { label: 'BAR/Board Examination Review', value: 'BAR Review' },
                  ]"
                  type="radio"
                  color="primary"
                />
              </div>

              <!-- Other purpose (Monetization / Terminal) -->
              <div v-if="showOtherPurpose" class="q-gutter-sm q-mt-md">
                <div class="text-body2 text-weight-medium q-mb-sm">Other purpose:</div>
                <q-option-group
                  v-model="form.otherPurpose"
                  :options="[
                    { label: 'Monetization of Leave Credits', value: 'Monetization' },
                    { label: 'Terminal Leave', value: 'Terminal Leave' },
                  ]"
                  type="radio"
                  color="primary"
                />
              </div>
            </div>

            <!-- 6.C Number of Working Days & Inclusive Dates -->
            <div class="section-block q-mb-lg">
              <div class="text-subtitle1 text-weight-bold q-mb-xs">6.C Number of Working Days Applied For</div>
              <p class="text-grey-6 text-caption q-mb-md">Enter the number of days and inclusive dates.</p>

              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-4">
                  <label class="input-label">Working Days</label>
                  <q-input
                    v-model.number="form.days"
                    type="number"
                    min="1"
                    outlined
                    dense
                    placeholder="Enter Working Days"
                    :rules="[val => val >= 1 || 'At least 1 day required']"
                    class="form-input"
                  >
                    <template #prepend>
                      <q-icon name="date_range" size="sm" color="grey-6" />
                    </template>
                  </q-input>
                </div>
                <div class="col-12 col-md-4">
                  <label class="input-label">Inclusive Date - From</label>
                  <q-input
                    v-model="form.startDate"
                    outlined
                    dense
                    readonly
                    :rules="[val => !!val || 'Start date is required']"
                    class="form-input cursor-pointer"
                    placeholder="Select start date"
                  >
                    <template #prepend>
                      <q-icon name="event" size="sm" color="grey-6" />
                    </template>
                    <template #append>
                      <q-icon name="arrow_drop_down" color="grey-6" />
                    </template>
                    <q-popup-proxy transition-show="scale" transition-hide="scale">
                      <q-date
                        v-model="form.startDate"
                        mask="YYYY-MM-DD"
                        color="primary"
                        :options="startDateOptions"
                      >
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="OK" color="primary" flat no-caps />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-input>
                </div>
                <div class="col-12 col-md-4">
                  <label class="input-label">Inclusive Date - To</label>
                  <q-input
                    v-model="form.endDate"
                    outlined
                    dense
                    readonly
                    :rules="[
                      val => !!val || 'End date is required',
                      val => !form.startDate || val >= form.startDate || 'End date must be after start date'
                    ]"
                    class="form-input cursor-pointer"
                    placeholder="Select end date"
                  >
                    <template #prepend>
                      <q-icon name="event" size="sm" color="grey-6" />
                    </template>
                    <template #append>
                      <q-icon name="arrow_drop_down" color="grey-6" />
                    </template>
                    <q-popup-proxy transition-show="scale" transition-hide="scale">
                      <q-date
                        v-model="form.endDate"
                        mask="YYYY-MM-DD"
                        color="primary"
                        :options="endDateOptions"
                      >
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="OK" color="primary" flat no-caps />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-input>
                </div>
              </div>
            </div>

            <!-- 6.D Commutation -->
            <div class="section-block q-mb-lg">
              <div class="text-subtitle1 text-weight-bold q-mb-xs">6.D Commutation</div>
              <p class="text-grey-6 text-caption q-mb-md">Select whether commutation is requested.</p>

              <q-option-group
                v-model="form.commutation"
                :options="[
                  { label: 'Not Requested', value: 'Not Requested' },
                  { label: 'Requested', value: 'Requested' },
                ]"
                type="radio"
                color="primary"
              />
            </div>

            <!-- Reason -->
            <div class="section-block q-mb-lg">
              <label class="input-label">Reason / Purpose</label>
              <q-input
                v-model="form.reason"
                type="textarea"
                rows="3"
                outlined
                dense
                placeholder="Enter Reason / Purpose"
                :rules="[val => !!val || 'Reason / Purpose is required']"
                class="form-input"
              />
            </div>

            <!-- Navigation -->
            <q-stepper-navigation>
              <div class="row q-gutter-md">
                <q-btn
                  flat
                  no-caps
                  label="Back"
                  icon="arrow_back"
                  color="grey-7"
                  @click="step = 1"
                  class="step-btn"
                />
                <q-space />
                <q-btn
                  outline
                  no-caps
                  label="Cancel"
                  color="grey-7"
                  :to="{ path: '/employee/dashboard' }"
                  class="step-btn"
                />
                <q-btn
                  unelevated
                  no-caps
                  color="primary"
                  type="submit"
                  label="Submit Application"
                  icon="send"
                  :loading="loading"
                  class="step-btn"
                />
              </div>
            </q-stepper-navigation>
          </q-form>
        </q-step>
      </q-stepper>
    </q-card>

    <!-- Success Dialog -->
    <q-dialog v-model="showSuccess" persistent>
      <q-card style="min-width: 400px" class="rounded-borders">
        <q-card-section class="text-center q-pa-lg">
          <q-icon name="check_circle" color="positive" size="64px" class="q-mb-md" />
          <div class="text-h6 text-weight-bold">Application Submitted!</div>
          <p class="text-grey-7 q-mb-lg">Your leave application has been submitted successfully and is now pending approval.</p>
          <div class="row q-gutter-sm">
            <q-btn outline no-caps color="primary" label="View Applications" class="col" :to="{ path: '/employee/leave-history' }" v-close-popup />
            <q-btn unelevated no-caps color="primary" label="Back to Dashboard" class="col" :to="{ path: '/employee/dashboard' }" v-close-popup />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useLeaveStore } from 'stores/leave-store'
import { useAuthStore } from 'stores/auth-store'

const route = useRoute()

const $q = useQuasar()
const leaveStore = useLeaveStore()
const authStore = useAuthStore()

// Display-only: get department name from user (object { id, name } or string)
function departmentDisplayName(val) {
  if (val == null || val === '') return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object' && val !== null && 'name' in val) return val.name
  return String(val)
}

// Split full name into first + last (backend may send "name" instead of first_name/last_name)
function splitFullName(fullName) {
  if (!fullName || typeof fullName !== 'string') return { firstName: '', lastName: '' }
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

// Format salary with commas (e.g., 12000 -> "12,000")
function formatSalary(value) {
  if (!value) return ''
  // Remove any existing commas and non-numeric characters except digits
  const numericValue = String(value).replace(/[^\d]/g, '')
  if (!numericValue) return ''
  // Format with commas
  return Number(numericValue).toLocaleString('en-US')
}

// Parse salary input (remove commas and non-numeric characters)
function parseSalary(value) {
  if (!value) return ''
  // Remove all non-numeric characters
  return String(value).replace(/[^\d]/g, '')
}

// Handle salary input changes
function handleSalaryInput(value) {
  // Parse the input to remove commas and store the raw numeric value
  form.value.salary = parseSalary(value)
}





const today = new Date()
const todayStr = computed(() => today.toISOString().split('T')[0])
const todayFormatted = computed(() => {
  return today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
})

const step = ref(1)
const step1Form = ref(null)
const loading = ref(false)
const showSuccess = ref(false)

const form = ref({
  // Step 1: Employee Info (office, lastName, firstName, position are read-only; filled from user or query)
  employeeId: '',
  office: '',
  lastName: '',
  firstName: '',
  position: '',
  salary: '',
  // Step 2: Details
  leaveTypeId: null,
  leaveTypeOther: '',
  vacationDetail: '',
  vacationSpecify: '',
  sickDetail: '',
  sickSpecify: '',
  womenSpecify: '',
  studyDetail: '',
  otherPurpose: '',
  days: 1,
  startDate: '',
  endDate: '',
  commutation: 'Not Requested',
  reason: '',
})

// Read-only field values: always from their info (auth user) or query when admin files on behalf
const officeDisplayValue = computed(() => {
  if (route.query.office) return form.value.office
  const raw = authStore.user?.department_name ?? authStore.user?.department
  return departmentDisplayName(raw) || form.value.office || ''
})

const lastNameDisplayValue = computed(() => {
  if (route.query.lastName) return form.value.lastName
  const u = authStore.user
  if (u?.last_name) return u.last_name
  if (u?.name) return splitFullName(u.name).lastName
  return form.value.lastName || ''
})

const firstNameDisplayValue = computed(() => {
  if (route.query.firstName) return form.value.firstName
  const u = authStore.user
  if (u?.first_name) return u.first_name
  if (u?.name) return splitFullName(u.name).firstName
  return form.value.firstName || ''
})

const positionDisplayValue = computed(() => {
  if (route.query.position) return form.value.position
  return authStore.user?.position ?? form.value.position ?? ''
})

// Sync form from auth user or query so submit has values; keep in sync when user loads (e.g. /me)
function syncReadOnlyFieldsFromUser() {
  const q = route.query
  const user = authStore.user
  if (q.empId) form.value.employeeId = q.empId
  // Office/Department
  if (q.office) form.value.office = q.office
  else {
    const raw = user?.department_name ?? user?.department
    form.value.office = departmentDisplayName(raw) || (typeof raw === 'string' ? raw : '')
  }
  // Last name, first name (support first_name/last_name or split from name)
  if (q.lastName) form.value.lastName = q.lastName
  else if (user?.last_name) form.value.lastName = user.last_name
  else if (user?.name) form.value.lastName = splitFullName(user.name).lastName
  if (q.firstName) form.value.firstName = q.firstName
  else if (user?.first_name) form.value.firstName = user.first_name
  else if (user?.name) form.value.firstName = splitFullName(user.name).firstName
  // Position
  if (q.position) form.value.position = q.position
  else if (user?.position) form.value.position = user.position
}

// syncReadOnlyFieldsFromUser is now called inside the main onMounted below
// When user data loads/updates (e.g. /me), auto-fill read-only fields from their info
watch(
  () => authStore.user,
  () => syncReadOnlyFieldsFromUser(),
  { deep: true }
)

// Build leave type options from leave summary data (fetched from API)
const allLeaveTypeOptions = ref([])

// Auto-clear end date if it falls outside the allowed range when days or start date change
watch(
  [() => form.value.days, () => form.value.startDate],
  () => {
    if (form.value.startDate && form.value.endDate && form.value.days >= 1) {
      const start = new Date(form.value.startDate)
      const end = new Date(form.value.endDate)
      const maxEnd = getMaxEndDate(form.value.startDate, form.value.days)
      if (end > maxEnd || end < start) {
        form.value.endDate = ''
      }
    }
  }
)


onMounted(async () => {
  syncReadOnlyFieldsFromUser()
  // Fetch leave summary to get leave types with IDs
  await leaveStore.fetchLeaveSummary()
  const summary = leaveStore.leaveSummary
  const options = []
  // Accrued types (object keyed by slug)
  if (summary.accrued) {
    for (const key in summary.accrued) {
      const t = summary.accrued[key]
      if (t && t.id) options.push({ label: t.name, value: t.id })
    }
  }
  // Resettable types (array)
  if (Array.isArray(summary.resettable)) {
    for (const t of summary.resettable) {
      if (t && t.id) options.push({ label: t.name, value: t.id })
    }
  }
  // Event-based types (array)
  if (Array.isArray(summary.event_based)) {
    for (const t of summary.event_based) {
      if (t && t.id) options.push({ label: t.name, value: t.id })
    }
  }
  // Sort alphabetically
  options.sort((a, b) => a.label.localeCompare(b.label))
  allLeaveTypeOptions.value = options
  leaveTypeOptions.value = options
})

// Filtered options for searchable dropdown
const leaveTypeOptions = ref([])

function filterLeaveTypes(val, update) {
  update(() => {
    if (!val) {
      leaveTypeOptions.value = allLeaveTypeOptions.value
    } else {
      const needle = val.toLowerCase()
      leaveTypeOptions.value = allLeaveTypeOptions.value.filter(
        opt => opt.label.toLowerCase().includes(needle)
      )
    }
  })
}

// Look up the selected leave type name from the options
const selectedLeaveTypeName = computed(() => {
  const opt = allLeaveTypeOptions.value.find(o => o.value === form.value.leaveTypeId)
  return opt ? opt.label : ''
})

const leaveTypesWithDetails = [
  'Vacation Leave',
  'Sick Leave',
  'Study Leave',
  'Special Leave Benefits for Women',
  'Others',
]
const showDetailsOfLeave = computed(() =>
  leaveTypesWithDetails.includes(selectedLeaveTypeName.value)
)
const isVacationType = computed(() => selectedLeaveTypeName.value === 'Vacation Leave')
const isSickType = computed(() => selectedLeaveTypeName.value === 'Sick Leave')
const showOtherPurpose = computed(() => selectedLeaveTypeName.value === 'Others')

// Reset sub-details when leave type changes
function onLeaveTypeChange() {
  form.value.vacationDetail = ''
  form.value.vacationSpecify = ''
  form.value.sickDetail = ''
  form.value.sickSpecify = ''
  form.value.womenSpecify = ''
  form.value.studyDetail = ''
  form.value.otherPurpose = ''
  form.value.leaveTypeOther = ''
}

// Quasar q-date passes dates as YYYY/MM/DD, but our values use YYYY-MM-DD
function toSlash(dateStr) {
  return dateStr ? dateStr.replace(/-/g, '/') : ''
}

// Check if a Quasar date string (YYYY/MM/DD) falls on a weekday (Mon-Fri)
function isWeekday(dateStr) {
  const [y, m, d] = dateStr.split('/').map(Number)
  const day = new Date(y, m - 1, d).getDay()
  return day !== 0 && day !== 6
}
// Calculate the max end date by advancing N working days from a start date (skipping weekends)
function getMaxEndDate(startDateStr, workingDays) {
  const d = new Date(startDateStr)
  let remaining = workingDays - 1 // start date counts as day 1
  while (remaining > 0) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) remaining--
  }
  return d
}

// Date options: only allow today or future weekdays for start
function startDateOptions(date) {
  return date >= toSlash(todayStr.value) && isWeekday(date)
}

// Date options: only allow weekdays >= startDate and within the working days limit
function endDateOptions(date) {
  if (!isWeekday(date)) return false
  const minDate = toSlash(form.value.startDate) || toSlash(todayStr.value)
  if (date < minDate) return false
  // Limit range to the number of working days entered
  if (form.value.startDate && form.value.days >= 1) {
    const maxEnd = getMaxEndDate(form.value.startDate, form.value.days)
    const y = maxEnd.getFullYear()
    const m = String(maxEnd.getMonth() + 1).padStart(2, '0')
    const dd = String(maxEnd.getDate()).padStart(2, '0')
    const maxDateStr = `${y}/${m}/${dd}`
    return date <= maxDateStr
  }
  return true
}

// Validate step 1 then proceed
async function goToStep2() {
  const valid = await step1Form.value.validate()
  if (valid) {
    step.value = 2
  }
}

/**
 * Submit via API: POST /employee/leave-applications (snake_case body).
 */
async function onSubmit() {
  if (!form.value.leaveTypeId || !form.value.startDate || !form.value.endDate || !form.value.reason) {
    return
  }
  loading.value = true
  try {
    await leaveStore.submitLeaveApplication({
      leave_type_id: form.value.leaveTypeId,
      start_date: form.value.startDate,
      end_date: form.value.endDate,
      total_days: form.value.days,
      reason: form.value.reason,
    })
    showSuccess.value = true
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to submit leave application'
    $q.notify({ type: 'negative', message: msg })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.input-label {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: #37474f;
  margin-bottom: 6px;
}

/* Read-only fields: show as non-editable */
.readonly-field :deep(.q-field__control) {
  background: rgba(0, 0, 0, 0.04);
}
.readonly-field :deep(.q-field__native) {
  cursor: default;
}

.form-input :deep(.q-field--outlined .q-field__control) {
  border-radius: 8px;
}

.form-input :deep(.q-field__native),
.form-input :deep(input),
.form-input :deep(textarea) {
  text-transform: uppercase;
}

.form-input :deep(.q-field__native::placeholder),
.form-input :deep(input::placeholder),
.form-input :deep(textarea::placeholder) {
  text-transform: none;
}

.section-block {
  background: #fafafa;
  border-radius: 10px;
  padding: 20px;
  border: 1px solid #eeeeee;
}

.step-btn {
  border-radius: 8px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

:deep(.q-stepper__header) {
  border-bottom: 1px solid #e0e0e0;
}

:deep(.q-stepper__tab) {
  font-weight: 600;
}
</style>
