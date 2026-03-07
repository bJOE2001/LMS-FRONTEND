<template>
  <q-page class="q-pa-md">
    <div class="q-mb-lg">
      <div class="row items-center q-mb-xs">
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-none">Apply for Leave</h1>
      </div>
      <p class="text-grey-7">Civil Service Form No. 6 — Application for Leave (Personal Application)</p>
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
                  v-model="form.office"
                  outlined
                  dense
                  readonly
                  placeholder="Your department"
                  class="form-input readonly-field"
                />
              </div>
              <div class="col-12 col-md-4">
                <label class="input-label">2. Last Name</label>
                <q-input
                  v-model="form.lastName"
                  outlined
                  dense
                  readonly
                  placeholder="Last name"
                  class="form-input readonly-field"
                />
              </div>
              <div class="col-12 col-md-4">
                <label class="input-label">First Name</label>
                <q-input
                  v-model="form.firstName"
                  outlined
                  dense
                  readonly
                  placeholder="First name"
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
                  v-model="form.position"
                  outlined
                  dense
                  readonly
                  placeholder="Position"
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
                v-if="selectedLeaveTypeName === 'Others'"
                v-model="form.leaveTypeOther"
                outlined
                dense
                label="Other purpose"
                placeholder="Enter Leave Type"
                class="form-input q-mt-sm"
                :rules="[val => !!val || 'Please specify leave type']"
              />
            </div>

            <!-- 6.B Details of Leave -->
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
                <q-input v-if="form.vacationDetail === 'Abroad'" v-model="form.vacationSpecify" outlined dense label="Specify destination" placeholder="Enter Destination" class="form-input q-mt-sm" />
                <q-input v-if="form.vacationDetail === 'Within the Philippines'" v-model="form.vacationSpecify" outlined dense label="Specify location" placeholder="Enter Location" class="form-input q-mt-sm" />
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
                <q-input v-if="form.sickDetail" v-model="form.sickSpecify" outlined dense label="Specify illness" placeholder="Enter Illness" class="form-input q-mt-sm" />
              </div>

              <!-- Special Leave Benefits for Women -->
              <div v-if="selectedLeaveTypeName === 'Special Leave Benefits for Women'" class="q-gutter-sm">
                <div class="text-body2 text-weight-medium q-mb-sm">In case of Special Leave Benefits for Women:</div>
                <q-input v-model="form.womenSpecify" outlined dense label="Specify illness" placeholder="Enter Illness" class="form-input" />
              </div>

              <!-- Study Leave -->
              <div v-if="selectedLeaveTypeName === 'Study Leave'" class="q-gutter-sm">
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

              <!-- Others purpose -->
              <div v-if="selectedLeaveTypeName === 'Others'" class="q-gutter-sm q-mt-md">
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
                    placeholder="Select start date"
                    :rules="[val => !!val || 'Start date is required']"
                    class="form-input cursor-pointer"
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
                    placeholder="Select end date"
                    :rules="[
                      val => !!val || 'End date is required',
                      val => !form.startDate || val >= form.startDate || 'End date must be after start date'
                    ]"
                    class="form-input cursor-pointer"
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

            <div class="section-block q-mb-lg">
              <label class="input-label">Reason / Purpose</label>
              <q-input v-model="form.reason" type="textarea" rows="3" outlined dense placeholder="Enter Reason / Purpose" :rules="[val => !!val || 'Required']" class="form-input" />
            </div>

            <!-- Navigation -->
            <q-stepper-navigation>
              <div class="row q-gutter-md">
                <q-btn flat no-caps label="Back" icon="arrow_back" color="grey-7" @click="step = 1" class="step-btn" />
                <q-space />
                <q-btn outline no-caps label="Cancel" color="grey-7" :to="{ name: 'admin-dashboard' }" class="step-btn" />
                <q-btn unelevated no-caps color="primary" type="submit" label="Submit Application" icon="send" :loading="loading" class="step-btn" />
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
          <p class="text-grey-7 q-mb-lg">Your leave application has been submitted successfully and is now pending HR review.</p>
          <div class="row q-gutter-sm">
            <q-btn unelevated no-caps color="primary" label="Back to Dashboard" class="full-width" :to="{ name: 'admin-dashboard' }" v-close-popup />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { useAuthStore } from 'stores/auth-store'

const $q = useQuasar()
const authStore = useAuthStore()

const step = ref(1)
const step1Form = ref(null)
const loading = ref(false)
const showSuccess = ref(false)

const allLeaveTypes = ref([])
const leaveTypeOptions = ref([])

const form = ref({
  office: '',
  lastName: '',
  firstName: '',
  position: '',
  salary: '',
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

// Salary Formatting logic as per employee form
function formatSalary(value) {
  if (!value) return ''
  const numericValue = String(value).replace(/[^\d]/g, '')
  if (!numericValue) return ''
  return Number(numericValue).toLocaleString('en-US')
}
function parseSalary(value) {
  if (!value) return ''
  return String(value).replace(/[^\d]/g, '')
}
function handleSalaryInput(value) {
  form.value.salary = parseSalary(value)
}

const today = new Date()
const todayStr = computed(() => today.toISOString().split('T')[0])
const todayFormatted = computed(() => {
  return today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
})

onMounted(async () => {
  const u = authStore.user
  form.value.office = u?.department_name || u?.department?.name || ''
  form.value.firstName = u?.first_name || (u?.name ? u.name.split(' ')[0] : '')
  form.value.lastName = u?.last_name || (u?.name ? u.name.split(' ').slice(1).join(' ') : '')
  form.value.position = u?.position || 'Department Admin'
  form.value.salary = u?.salary || ''

  try {
    const { data } = await api.get('/admin/leave-credits')
    const all = [
      ...(data.accrued || []),
      ...(data.resettable || []),
      ...(data.event_based || [])
    ]
    allLeaveTypes.value = all
    leaveTypeOptions.value = all.map(lt => ({
      label: lt.name,
      value: lt.leave_type_id || lt.id
    }))
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to load leave types' })
  }
})

function filterLeaveTypes(val, update) {
  update(() => {
    if (!val) {
      leaveTypeOptions.value = allLeaveTypes.value.map(lt => ({ label: lt.name, value: lt.leave_type_id || lt.id }))
    } else {
      const needle = val.toLowerCase()
      leaveTypeOptions.value = allLeaveTypes.value
        .filter(lt => lt.name.toLowerCase().includes(needle))
        .map(lt => ({ label: lt.name, value: lt.leave_type_id || lt.id }))
    }
  })
}

const selectedLeaveTypeName = computed(() => {
  const lt = allLeaveTypes.value.find(t => (t.leave_type_id || t.id) === form.value.leaveTypeId)
  return lt ? lt.name : ''
})

const showDetailsOfLeave = computed(() => {
  const types = ['Vacation Leave', 'Sick Leave', 'Study Leave', 'Special Leave Benefits for Women', 'Others']
  return types.includes(selectedLeaveTypeName.value)
})
const isVacationType = computed(() => selectedLeaveTypeName.value === 'Vacation Leave')
const isSickType = computed(() => selectedLeaveTypeName.value === 'Sick Leave')

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

// Date limitation logic as per employee form
function toSlash(dateStr) {
  return dateStr ? dateStr.replace(/-/g, '/') : ''
}
function isWeekday(dateStr) {
  const [y, m, d] = dateStr.split('/').map(Number)
  const day = new Date(y, m - 1, d).getDay()
  return day !== 0 && day !== 6
}
function getMaxEndDate(startDateStr, workingDays) {
  const d = new Date(startDateStr)
  let remaining = workingDays - 1
  while (remaining > 0) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) remaining--
  }
  return d
}
function startDateOptions(date) {
  return date >= toSlash(todayStr.value) && isWeekday(date)
}
function endDateOptions(date) {
  if (!isWeekday(date)) return false
  const minDate = toSlash(form.value.startDate) || toSlash(todayStr.value)
  if (date < minDate) return false
  if (form.value.startDate && form.value.days >= 1) {
    const maxEnd = getMaxEndDate(form.value.startDate, form.value.days)
    const y = maxEnd.getFullYear()
    const m = String(maxEnd.getMonth() + 1).padStart(2, '0')
    const dd = String(maxEnd.getDate()).padStart(2, '0')
    return date <= `${y}/${m}/${dd}`
  }
  return true
}

// Clear invalid end date if start date/days change
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

async function goToStep2() {
  const valid = await step1Form.value.validate()
  if (valid) step.value = 2
}

async function onSubmit() {
  loading.value = true
  try {
    const payload = {
      leave_type_id: form.value.leaveTypeId,
      start_date: form.value.startDate,
      end_date: form.value.endDate,
      total_days: form.value.days,
      reason: form.value.reason,
      details: {
        vacation_detail: form.value.vacationDetail,
        vacation_specify: form.value.vacationSpecify,
        sick_detail: form.value.sickDetail,
        sick_specify: form.value.sickSpecify,
        women_specify: form.value.womenSpecify,
        study_detail: form.value.studyDetail,
        other_purpose: form.value.otherPurpose,
        leave_type_other: form.value.leaveTypeOther,
      }
    }
    await api.post('/admin/leave-applications/self', payload)
    showSuccess.value = true
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to submit application'
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
.readonly-field :deep(.q-field__control) {
  background: rgba(0, 0, 0, 0.04);
}
.readonly-field :deep(.q-field__native) {
  cursor: default;
}
.form-input :deep(.q-field--outlined .q-field__control) {
  border-radius: 8px;
}
.step-btn {
  min-width: 120px;
}
</style>
