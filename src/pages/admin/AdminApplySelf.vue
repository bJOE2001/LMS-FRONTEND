<template>
  <component :is="inDialog ? 'div' : 'q-page'" :class="inDialog ? 'q-pa-sm' : 'q-pa-md'">
    <div v-if="!inDialog" class="q-mb-lg">
      <div class="row items-center q-mb-xs">
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-none">Apply for Leave</h1>
      </div>
      <p class="text-grey-7">Civil Service Form No. 6 — Application for Leave (Personal Application)</p>
    </div>

    <q-card flat bordered :class="['rounded-borders q-mb-lg', { 'dialog-form-card': inDialog }]">
      <q-form v-if="inDialog" ref="dialogStep1Form" greedy class="section-block q-ma-md q-mb-none">
        <div class="dialog-summary-header">
          <div class="dialog-summary-main">
            <div class="dialog-summary-line dialog-summary-line--name">{{ dialogEmployeeName }}</div>
            <div class="dialog-summary-line dialog-summary-line--position">{{ form.position || '-' }}</div>
            <div class="dialog-summary-line dialog-summary-line--department">{{ dialogOfficeDisplay }}</div>
          </div>
          <div class="dialog-summary-meta">
            <div class="dialog-summary-meta-item">
              <span class="dialog-summary-meta-label">Date of Filing:</span>
              <span class="dialog-summary-meta-value">{{ todayFormatted }}</span>
            </div>
            <div class="dialog-summary-meta-item">
              <span class="dialog-summary-meta-label">Salary:</span>
              <span class="dialog-summary-meta-value">{{ dialogSalaryDisplay }}</span>
            </div>
          </div>
        </div>
      </q-form>

      <!-- Stepper -->
      <q-stepper
        v-model="step"
        flat
        animated
        :class="{ 'dialog-apply-stepper': inDialog }"
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
          <q-form ref="step2Form" @submit.prevent="onSubmit" greedy>
            <div :class="{ 'dialog-application-grid': inDialog }">
            <!-- 6.A Type of Leave -->
            <div class="section-block q-mb-lg dialog-section dialog-section--type">
              <div class="text-subtitle1 text-weight-bold q-mb-md">Type of Leave to be Availed Of</div>

              <q-select
                v-model="form.leaveTypeId"
                :options="leaveTypeOptions"
                :placeholder="form.leaveTypeId ? '' : 'Select Leave Type'"
                outlined
                dense
                emit-value
                map-options
                :rules="[val => !!val || 'Please select a leave type']"
                class="form-input leave-type-select"
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

            <!-- ==================== MONETIZATION SECTION ==================== -->
            <div v-if="isMonetization" class="section-block q-mb-lg dialog-section dialog-section--full">
              <div class="text-subtitle1 text-weight-bold q-mb-xs">Monetization Leave</div>
              <p class="text-grey-6 text-caption q-mb-md">City Hall of Tagum Policy: Minimum of 10 accumulated leave credits required.</p>

              <div class="q-mb-md">
                <label class="input-label">Select Leave Type to Monetize</label>
                <q-select v-model="monetization.leaveTypeId" :options="monetizationLeaveTypeOptions" :placeholder="monetization.leaveTypeId ? '' : 'Select Leave Type'" outlined dense emit-value map-options :rules="[val => !!val || 'Required']" class="form-input" @update:model-value="onMonetizationTypeChange">
                  <template #prepend><q-icon name="account_balance_wallet" size="sm" color="grey-6" /></template>
                </q-select>
              </div>

              <div class="row q-col-gutter-md q-mb-md">
                <div class="col-12 col-md-4">
                  <label class="input-label">Available Leave Credits</label>
                  <q-input :model-value="monetization.availableBalance" outlined dense readonly class="form-input readonly-field" :loading="monetization.loadingBalance">
                    <template #prepend><q-icon name="savings" size="sm" color="grey-6" /></template>
                  </q-input>
                  <div v-if="monetization.availableBalance !== null && monetization.availableBalance < 10" class="text-caption text-negative q-mt-xs">Insufficient credits. Minimum of 10 required.</div>
                </div>
                <div class="col-12 col-md-4">
                  <label class="input-label">Days to Monetize</label>
                  <q-input v-model.number="monetization.daysToMonetize" type="number" min="1" :max="monetization.availableBalance || 999" outlined dense placeholder="Enter number of days" :rules="[val => (val !== null && val !== '' && val >= 1) || 'At least 1 day', val => !monetization.availableBalance || val <= monetization.availableBalance || 'Cannot exceed balance']" class="form-input">
                    <template #prepend><q-icon name="today" size="sm" color="grey-6" /></template>
                  </q-input>
                </div>
                <div class="col-12 col-md-4">
                  <label class="input-label">Estimated Equivalent Amount</label>
                  <q-input :model-value="monetizationEstimatedAmount" outlined dense readonly class="form-input readonly-field">
                    <template #prepend><span class="text-grey-6 text-body2">&#8369;</span></template>
                  </q-input>
                  <div class="text-caption text-grey-5 q-mt-xs">Daily rate = monthly salary / 22</div>
                </div>
              </div>
            </div>

            <div :class="{ 'dialog-section-stack dialog-section-stack--left': inDialog }">
              <!-- Details of Leave -->
              <div v-if="showDetailsOfLeave && !isMonetization" class="section-block q-mb-lg dialog-section dialog-section--details">
                <div class="text-subtitle1 text-weight-bold q-mb-md">Details of Leave</div>

                <div v-if="isVacationType" class="dialog-detail-options">
                <div class="text-body2 text-weight-medium q-mb-sm">In case of Vacation Leave:</div>
                <q-option-group v-model="form.vacationDetail" :options="[{ label: 'Within the Philippines', value: 'Within the Philippines' }, { label: 'Abroad (Specify)', value: 'Abroad' }]" type="radio" color="primary" />
                <q-input v-if="form.vacationDetail === 'Abroad'" v-model="form.vacationSpecify" outlined dense label="Specify destination" placeholder="Enter Destination" class="form-input q-mt-sm" />
                <q-input v-if="form.vacationDetail === 'Within the Philippines'" v-model="form.vacationSpecify" outlined dense label="Specify location" placeholder="Enter Location" class="form-input q-mt-sm" />
                </div>

                <div v-if="isSickType" class="dialog-detail-options">
                <div class="text-body2 text-weight-medium q-mb-sm">In case of Sick Leave:</div>
                <q-option-group v-model="form.sickDetail" :options="[{ label: 'In Hospital (Specify Illness)', value: 'In Hospital' }, { label: 'Out Patient (Specify Illness)', value: 'Out Patient' }]" type="radio" color="primary" />
                <q-input v-if="form.sickDetail" v-model="form.sickSpecify" outlined dense label="Specify illness" placeholder="Enter Illness" class="form-input q-mt-sm" />
                </div>

                <div v-if="selectedLeaveTypeName === 'Special Leave Benefits for Women'" class="dialog-detail-options">
                <div class="text-body2 text-weight-medium q-mb-sm">In case of Special Leave Benefits for Women:</div>
                <q-input v-model="form.womenSpecify" outlined dense label="Specify illness" placeholder="Enter Illness" class="form-input" />
                </div>

                <div v-if="selectedLeaveTypeName === 'Study Leave'" class="dialog-detail-options">
                <div class="text-body2 text-weight-medium q-mb-sm">In case of Study Leave:</div>
                <q-option-group v-model="form.studyDetail" :options="[{ label: 'Completion of Master\'s Degree', value: 'Masters Degree' }, { label: 'BAR/Board Examination Review', value: 'BAR Review' }]" type="radio" color="primary" />
                </div>

                <div v-if="selectedLeaveTypeName === 'Others'" class="dialog-detail-options">
                <div class="text-body2 text-weight-medium q-mb-sm">Other purpose:</div>
                <q-option-group v-model="form.otherPurpose" :options="[{ label: 'Monetization Leave', value: 'Monetization' }, { label: 'Terminal Leave', value: 'Terminal Leave' }]" type="radio" color="primary" />
                </div>
              </div>

              <!-- Commutation -->
              <div v-if="!isMonetization" class="section-block q-mb-lg dialog-section dialog-section--commutation">
                <div class="text-subtitle1 text-weight-bold q-mb-md">Commutation</div>
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
            </div>

            <!-- 6.C Number of Working Days Applied For (hidden for monetization) -->
            <div
              v-if="!isMonetization"
              :class="[
                'section-block q-mb-lg dialog-section dialog-section--dates',
                { 'dialog-section--dates-raised': moveDialogActionsUp },
              ]"
            >
              <div class="text-subtitle1 text-weight-bold q-mb-md">Number of Working Days Applied For</div>

              <div class="row q-col-gutter-md" :class="{ 'dialog-dates-layout': inDialog }">
                <div :class="inDialog ? 'col-12 col-sm-6' : 'col-12 col-md-6'">
                  <label class="input-label">
                    <template v-if="isMco6Leave">Select Leave Dates (max 3)</template>
                    <template v-else-if="isMaternityLeave || isPaternityLeave">Select Start Date</template>
                    <template v-else>Select Leave Dates</template>
                  </label>

                  <!-- Maternity/Paternity Leave: Single Date Picker -->
                  <q-date
                    v-if="isMaternityLeave || isPaternityLeave"
                    v-model="maternityStartDate"
                    mask="YYYY-MM-DD"
                    color="primary"
                    :options="leaveDateOptions"
                    class="q-mt-sm"
                    style="width: 100%"
                  />

                  <!-- Standard Leave: Multi-select -->
                  <q-date
                    v-else
                    v-model="selectedDates"
                    multiple
                    mask="YYYY-MM-DD"
                    color="primary"
                    :options="leaveDateOptions"
                    class="q-mt-sm"
                    style="width: 100%"
                    @update:model-value="onSelectedDatesChange"
                  />
                </div>
                <div :class="inDialog ? 'col-12 col-sm-6 dialog-selected-dates-panel' : 'col-12 col-md-6'">
                  <label class="input-label">Selected Dates</label>
                  <div v-if="selectedDates.length === 0" class="text-grey-5 text-body2 q-mt-sm">
                    No dates selected yet.
                  </div>
                  <div
                    v-else-if="inDialog"
                    :class="[
                      'selected-date-duration-list q-mt-sm',
                      { 'selected-date-duration-list--scrollable': sortedSelectedDates.length > 6 },
                    ]"
                  >
                    <div
                      v-for="(d, idx) in sortedSelectedDates"
                      :key="idx"
                      class="selected-date-duration-row"
                    >
                      <div class="selected-date-duration-label">
                        <span>{{ formatDialogDateChip(d) }}</span>
                        <q-btn
                          v-if="!(isMaternityLeave || isPaternityLeave)"
                          flat
                          round
                          dense
                          icon="close"
                          size="sm"
                          color="negative"
                          @click="removeSelectedDate(idx)"
                        />
                      </div>
                      <button
                        type="button"
                        :class="[
                          'selected-date-duration-toggle',
                          { 'selected-date-duration-toggle--half': selectedDateDurations[d] === 'half_day' },
                        ]"
                        @click="toggleSelectedDateDuration(d)"
                      >
                        {{ selectedDateDurationLabel(d) }}
                      </button>
                    </div>
                  </div>
                  <q-list v-else dense bordered separator class="rounded-borders q-mt-sm" style="max-height: 300px; overflow-y: auto">
                    <q-item v-for="(d, idx) in sortedSelectedDates" :key="idx">
                      <q-item-section>
                        <q-item-label>{{ formatDateDisplay(d) }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-btn flat round dense icon="close" size="sm" color="negative" @click="removeSelectedDate(idx)" :disable="isMaternityLeave || isPaternityLeave" />
                      </q-item-section>
                    </q-item>
                  </q-list>
                  <div class="text-caption q-mt-sm text-grey-6">
                    {{ formatSelectedDayCount(selectedDateTotalDays) }} day(s) selected
                  </div>
                  <div v-if="mco6ConsecutiveWarning" class="text-caption text-negative q-mt-xs">
                    ⚠ {{ mco6ConsecutiveWarning }}
                  </div>
                  <div v-if="maxDaysWarning" class="text-caption text-negative q-mt-xs">
                    ⚠ {{ maxDaysWarning }}
                  </div>
                </div>
              </div>
            </div>

            <div class="section-block q-mb-lg dialog-section dialog-section--reason">
              <label class="input-label">
                Reason / Purpose
                <span class="input-label-optional">(Optional)</span>
              </label>
              <q-input v-model="form.reason" type="textarea" :rows="inDialog ? 2 : 3" outlined dense :placeholder="isMonetization ? 'Enter reason for monetization request' : 'Enter Reason / Purpose'" class="form-input" />
            </div>

            <!-- Navigation -->
            <q-stepper-navigation
              :class="[
                'dialog-section',
                moveDialogActionsUp ? 'dialog-section--actions-raised' : 'dialog-section--actions',
              ]"
            >
              <div class="row q-gutter-md">
                <template v-if="inDialog">
                  <q-space />
                  <q-btn outline no-caps label="Cancel" color="grey-7" class="step-btn" @click="handleCancel" />
                  <q-btn
                    unelevated
                    no-caps
                    color="primary"
                    type="button"
                    :label="isMonetization ? 'Submit Monetization Request' : 'Submit Application'"
                    icon="send"
                    :loading="loading"
                    :disable="isMonetization && monetizationSubmitDisabled"
                    class="step-btn"
                    @click="submitDialogForm"
                  />
                </template>
                <template v-else>
                  <q-btn flat no-caps label="Back" icon="arrow_back" color="grey-7" @click="step = 1" class="step-btn" />
                  <q-space />
                  <q-btn outline no-caps label="Cancel" color="grey-7" class="step-btn" @click="handleCancel" />
                  <q-btn unelevated no-caps color="primary" type="submit" :label="isMonetization ? 'Submit Monetization Request' : 'Submit Application'" icon="send" :loading="loading" :disable="isMonetization && monetizationSubmitDisabled" class="step-btn" />
                </template>
              </div>
            </q-stepper-navigation>
            </div>
          </q-form>
        </q-step>
      </q-stepper>
    </q-card>

  </component>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { api } from 'boot/axios'
import { useAuthStore } from 'stores/auth-store'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const props = defineProps({
  inDialog: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['cancel', 'submitted'])

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()

const step = ref(props.inDialog ? 2 : 1)
const dialogStep1Form = ref(null)
const step1Form = ref(null)
const step2Form = ref(null)
const loading = ref(false)
const selectedDateDurations = ref({})

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

const dialogEmployeeName = computed(() => {
  const fullName = [form.value.firstName, form.value.lastName].filter(Boolean).join(' ').trim()
  return fullName || '-'
})

const dialogOfficeDisplay = computed(() => {
  const office = String(form.value.office || '').trim()
  if (!office) return '-'
  return office.replace(/^office of the\s+/i, '') || office
})

const dialogSalaryDisplay = computed(() => {
  const salary = formatSalary(form.value.salary)
  return salary ? `PHP ${salary}` : '-'
})

function getVacationLeaveTypeId() {
  const vacationType = allLeaveTypes.value.find((lt) => lt.name === 'Vacation Leave')
  return vacationType ? (vacationType.leave_type_id || vacationType.id) : null
}

function sortLeaveTypeOptions(leaveTypes) {
  return [...leaveTypes]
    .sort((left, right) => String(left?.name || '').localeCompare(String(right?.name || '')))
    .map((leaveType) => ({
      label: leaveType.name,
      value: leaveType.leave_type_id || leaveType.id,
    }))
}

function ensureDefaultLeaveType() {
  if (form.value.leaveTypeId) return
  const vacationLeaveTypeId = getVacationLeaveTypeId()
  if (!vacationLeaveTypeId) return
  form.value.leaveTypeId = vacationLeaveTypeId
  onLeaveTypeChange()
}

onMounted(async () => {
  const u = authStore.user
  form.value.office = u?.department_name || u?.department?.name || ''
  form.value.firstName = u?.firstname || (u?.name ? u.name.split(' ')[0] : '')
  form.value.lastName = u?.surname || (u?.name ? u.name.split(' ').slice(1).join(' ') : '')
  form.value.position = u?.designation || 'Department Admin'
  form.value.salary = u?.salary || ''

  try {
    const { data } = await api.get('/admin/leave-credits')
    const all = [
      ...(data.accrued || []),
      ...(data.resettable || []),
      ...(data.event_based || [])
    ]
    allLeaveTypes.value = all
    leaveTypeOptions.value = sortLeaveTypeOptions(all)
    ensureDefaultLeaveType()
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load leave types right now.')
    $q.notify({ type: 'negative', message: msg })
  }
})

const selectedLeaveTypeName = computed(() => {
  const lt = allLeaveTypes.value.find(t => (t.leave_type_id || t.id) === form.value.leaveTypeId)
  return lt ? lt.name : ''
})

const selectedLeaveTypeMaxDays = computed(() => {
  const lt = allLeaveTypes.value.find(t => (t.leave_type_id || t.id) === form.value.leaveTypeId)
  return lt ? lt.max_days : null
})

const isMco6Leave = computed(() => selectedLeaveTypeName.value === 'MCO6 Leave')
const isMaternityLeave = computed(() => selectedLeaveTypeName.value === 'Maternity Leave')
const isPaternityLeave = computed(() => selectedLeaveTypeName.value === 'Paternity Leave')
const isMonetization = computed(() => selectedLeaveTypeName.value === 'Monetization Leave')

const showDetailsOfLeave = computed(() => {
  const types = ['Vacation Leave', 'Sick Leave']
  return types.includes(selectedLeaveTypeName.value)
})
const isVacationType = computed(() => selectedLeaveTypeName.value === 'Vacation Leave')
const isSickType = computed(() => selectedLeaveTypeName.value === 'Sick Leave')
const moveDialogActionsUp = computed(() => props.inDialog && !isMonetization.value && showDetailsOfLeave.value)

// ─── Monetization State ──────────────────────────────────────────
const monetization = ref({
  leaveTypeId: null,
  availableBalance: null,
  daysToMonetize: null,
  loadingBalance: false,
})

const monetizationLeaveTypeOptions = computed(() => {
  const opts = []
  const vl = allLeaveTypes.value.find(t => t.name === 'Vacation Leave')
  const sl = allLeaveTypes.value.find(t => t.name === 'Sick Leave')
  if (vl) opts.push({ label: 'Vacation Leave', value: vl.leave_type_id || vl.id })
  if (sl) opts.push({ label: 'Sick Leave', value: sl.leave_type_id || sl.id })
  return opts
})

watch(isMonetization, async (val) => {
  if (val) {
    const vlOpt = monetizationLeaveTypeOptions.value.find(o => o.label === 'Vacation Leave')
    if (vlOpt) {
      monetization.value.leaveTypeId = vlOpt.value
      await fetchAdminMonetizationBalance(vlOpt.value)
    }
  } else {
    monetization.value = { leaveTypeId: null, availableBalance: null, daysToMonetize: null, loadingBalance: false }
  }
})

async function onMonetizationTypeChange(typeId) {
  if (typeId) await fetchAdminMonetizationBalance(typeId)
}

async function fetchAdminMonetizationBalance(typeId) {
  monetization.value.loadingBalance = true
  monetization.value.availableBalance = null
  monetization.value.daysToMonetize = null
  try {
    const { data } = await api.get(`/admin/self-leave-balance/${typeId}`)
    monetization.value.availableBalance = data.balance
  } catch {
    monetization.value.availableBalance = 0
  } finally {
    monetization.value.loadingBalance = false
  }
}

const monetizationEstimatedAmount = computed(() => {
  const salary = parseSalary(form.value.salary)
  const days = monetization.value.daysToMonetize
  if (!salary || !days || days <= 0) return '0.00'
  const dailyRate = Number(salary) / 22
  return (days * dailyRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
})

const monetizationSubmitDisabled = computed(() => {
  const bal = monetization.value.availableBalance
  const days = monetization.value.daysToMonetize
  if (bal === null || bal < 10) return true
  if (!days || days < 1 || days > bal) return true
  if (!monetization.value.leaveTypeId) return true
  return false
})

function onLeaveTypeChange() {
  form.value.vacationDetail = selectedLeaveTypeName.value === 'Vacation Leave'
    ? 'Within the Philippines'
    : ''
  form.value.vacationSpecify = ''
  form.value.sickDetail = ''
  form.value.sickSpecify = ''
  form.value.womenSpecify = ''
  form.value.studyDetail = ''
  form.value.otherPurpose = ''
  form.value.leaveTypeOther = ''
  selectedDates.value = []
  selectedDateDurations.value = {}
  monetization.value = { leaveTypeId: null, availableBalance: null, daysToMonetize: null, loadingBalance: false }
}

// ─── Unified Multi-date Selection (all leave types) ─────────────
const selectedDates = ref([])

const sortedSelectedDates = computed(() =>
  [...selectedDates.value].sort()
)

function normalizeSelectedDates(value) {
  return [...new Set((Array.isArray(value) ? value : []).filter(Boolean))].sort()
}

function onSelectedDatesChange(value) {
  selectedDates.value = normalizeSelectedDates(value)
}

function formatDateDisplay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDialogDateChip(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function syncSelectedDateDurations(dates) {
  const activeDates = new Set(dates)

  Object.keys(selectedDateDurations.value).forEach((date) => {
    if (!activeDates.has(date)) {
      delete selectedDateDurations.value[date]
    }
  })

  dates.forEach((date) => {
    if (!selectedDateDurations.value[date]) {
      selectedDateDurations.value[date] = 'whole_day'
    }
  })
}

const selectedDateTotalDays = computed(() =>
  sortedSelectedDates.value.reduce(
    (total, date) => total + (selectedDateDurations.value[date] === 'half_day' ? 0.5 : 1),
    0,
  ),
)

function formatSelectedDayCount(value) {
  return Number.isInteger(value) ? value : value.toFixed(1)
}

function buildSelectedDateDurationsPayload(dates) {
  return dates.reduce((acc, date) => {
    acc[date] = selectedDateDurations.value[date] || 'whole_day'
    return acc
  }, {})
}

function selectedDateDurationLabel(date) {
  return selectedDateDurations.value[date] === 'half_day' ? 'Half Day' : 'Whole Day'
}

function toggleSelectedDateDuration(date) {
  selectedDateDurations.value[date] =
    selectedDateDurations.value[date] === 'half_day' ? 'whole_day' : 'half_day'
}

const leaveDateOptions = computed(() => {
  // Access dependencies to trigger re-computation
  const selected = selectedDates.value
  const max = selectedLeaveTypeMaxDays.value
  const isMco6 = isMco6Leave.value
  const today = toSlash(todayStr.value)

  return (date) => {
    // Maternity/Paternity Leave allows weekends/holidays (continuous)
    if (isMaternityLeave.value || isPaternityLeave.value) {
      return date >= today
    }

    if (!isWeekday(date)) return false
    if (date < today) return false
    
    if (isMco6 && selected.length >= 3) {
      const dashDate = date.replace(/\//g, '-')
      return selected.includes(dashDate)
    }
    
    if (max && selected.length >= max) {
      const dashDate = date.replace(/\//g, '-')
      return selected.includes(dashDate)
    }
    
    return true
  }
})

const maternityStartDate = ref(null)

// Auto-calculate days for Maternity (105) or Paternity (7)
watch(maternityStartDate, (newDate) => {
  if (newDate) {
    let daysCount = 0
    if (isMaternityLeave.value) daysCount = 105
    else if (isPaternityLeave.value) daysCount = 7
    
    if (daysCount > 0) {
      const dates = []
      const start = new Date(newDate)
      for (let i = 0; i < daysCount; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        dates.push(d.toISOString().split('T')[0])
      }
      selectedDates.value = normalizeSelectedDates(dates)
    }
  }
})

// Reset start date if leave type changes
watch([isMaternityLeave, isPaternityLeave], ([mat, pat]) => {
  if (!mat && !pat) maternityStartDate.value = null
})

function removeSelectedDate(idx) {
  const sorted = [...selectedDates.value].sort()
  const dateToRemove = sorted[idx]
  selectedDates.value = selectedDates.value.filter(d => d !== dateToRemove)
}

function calcMaxConsecutive(dates) {
  if (!dates || dates.length <= 1) return dates ? dates.length : 0
  const normalized = dates.map((d) => d.replace(/\//g, '-'))
  const sorted = [...new Set(normalized)].sort()

  let max = 1,
    streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00')
    const curr = new Date(sorted[i] + 'T00:00:00')
    const nextDay = new Date(prev)
    nextDay.setDate(nextDay.getDate() + 1)

    if (nextDay.getTime() === curr.getTime()) {
      streak++
      max = Math.max(max, streak)
    } else {
      streak = 1
    }
  }
  return max
}

const mco6ConsecutiveWarning = computed(() => {
  if (!isMco6Leave.value) return ''
  if (selectedDates.value.length < 2) return ''
  const maxC = calcMaxConsecutive(selectedDates.value)
  if (maxC > 3) return 'MCO6 Leave cannot exceed 3 consecutive days. Please adjust your selection.'
  return ''
})

const maxDaysWarning = computed(() => {
  const max = selectedLeaveTypeMaxDays.value
  if (!max) return ''
  if (selectedDates.value.length > max) return `Maximum of ${max} days allowed for this leave type.`
  return ''
})

watch(selectedDates, (dates) => {
  const normalized = normalizeSelectedDates(dates)
  if (JSON.stringify(normalized) !== JSON.stringify(dates)) {
    selectedDates.value = normalized
    return
  }

  syncSelectedDateDurations(dates)

  if (dates.length === 0) {
    form.value.days = 1
    form.value.startDate = ''
    form.value.endDate = ''
    return
  }
  const sorted = [...dates].sort()
  form.value.days = selectedDateTotalDays.value
  form.value.startDate = sorted[0]
  form.value.endDate = sorted[sorted.length - 1]
}, { deep: true })

watch(selectedDateTotalDays, (total) => {
  if (selectedDates.value.length === 0) return
  form.value.days = total
})

// Date limitation logic as per employee form
function toSlash(dateStr) {
  return dateStr ? dateStr.replace(/-/g, '/') : ''
}
function isWeekday(dateStr) {
  const [y, m, d] = dateStr.split('/').map(Number)
  const day = new Date(y, m - 1, d).getDay()
  return day !== 0 && day !== 6
}


async function goToStep2() {
  const valid = await step1Form.value.validate()
  if (valid) step.value = 2
}

async function submitDialogForm() {
  const employeeValid = await dialogStep1Form.value?.validate?.()
  if (!employeeValid) return

  const detailsValid = await step2Form.value?.validate?.()
  if (!detailsValid) return

  await onSubmit()
}

function navigateToDashboard() {
  router.push({ name: 'admin-dashboard' })
}

function handleCancel() {
  if (props.inDialog) {
    emit('cancel')
    return
  }
  navigateToDashboard()
}

function handleSubmitSuccess(isMonetizationSubmission = false) {
  const message = isMonetizationSubmission
    ? 'Monetization request submitted successfully and is now pending HR review.'
    : 'Leave application submitted successfully and is now pending HR review.'

  $q.notify({ type: 'positive', message })

  if (props.inDialog) {
    emit('submitted')
    return
  }
  navigateToDashboard()
}

async function onSubmit() {
  // Monetization submission
  if (isMonetization.value) {
    if (!monetization.value.leaveTypeId || monetizationSubmitDisabled.value) {
      $q.notify({ type: 'negative', message: 'Please complete all monetization fields.' })
      return
    }
    loading.value = true
    try {
      await api.post('/admin/leave-applications/self', {
        is_monetization: true,
        leave_type_id: monetization.value.leaveTypeId,
        total_days: monetization.value.daysToMonetize,
        reason: String(form.value.reason || '').trim() || null,
        salary: parseSalary(form.value.salary) || null,
      })
      handleSubmitSuccess(true)
    } catch (err) {
      const msg = resolveApiErrorMessage(err, 'Unable to submit your monetization request right now.')
      $q.notify({ type: 'negative', message: msg })
    } finally {
      loading.value = false
    }
    return
  }



  if (maxDaysWarning.value) {
      $q.notify({ type: 'negative', message: maxDaysWarning.value })
      return
  }

  loading.value = true
  try {
    if (selectedDates.value.length === 0) {
      $q.notify({ type: 'negative', message: 'Please select at least 1 date.' })
      loading.value = false
      return
    }

    const payload = {
      leave_type_id: form.value.leaveTypeId,
      start_date: form.value.startDate,
      end_date: form.value.endDate,
      total_days: form.value.days,
      reason: String(form.value.reason || '').trim() || null,
      selected_dates: [...selectedDates.value].sort(),
      selected_date_durations: buildSelectedDateDurationsPayload([...selectedDates.value].sort()),
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
    handleSubmitSuccess(false)
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to submit your leave application right now.')
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
.input-label-optional {
  margin-left: 4px;
  font-size: 0.76rem;
  font-weight: 400;
  color: #94a3ab;
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
.leave-type-select :deep(.q-field__control-container) {
  overflow: hidden;
}
.leave-type-select :deep(.q-field__native),
.leave-type-select :deep(.q-field__input),
.leave-type-select :deep(.q-select__selection),
.leave-type-select :deep(.q-field__native > span) {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dialog-form-card {
  margin-bottom: 0;
}
.dialog-form-card .section-block {
  padding: 14px;
}
.dialog-form-card :deep(.q-field--dense .q-field__control) {
  min-height: 34px;
}
.dialog-summary-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}
.dialog-summary-main {
  min-width: 0;
  flex: 1 1 auto;
}
.dialog-summary-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dialog-summary-line {
  font-size: 1rem;
  line-height: 1.25;
  color: #2d3436;
  text-transform: uppercase;
}
.dialog-summary-line--name {
  font-size: 1rem;
  font-weight: 700;
  color: #2d3436;
}
.dialog-summary-line--position {
  color: #2d3436;
  font-weight: 600;
}
.dialog-summary-line--department {
  font-size: 0.86rem;
  color: #8b98a1;
  font-weight: 500;
}
.dialog-summary-meta {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: right;
}
.dialog-summary-meta-item {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 6px;
}
.dialog-summary-meta-label {
  font-size: 0.84rem;
  font-weight: 700;
  color: #46535d;
}
.dialog-summary-meta-value {
  font-size: 0.92rem;
  font-weight: 600;
  color: #46535d;
}
.section-block {
  background: #fafafa;
  border-radius: 10px;
  padding: 20px;
  border: 1px solid #eeeeee;
}
.step-btn {
  min-width: 120px;
}
.dialog-apply-stepper :deep(.q-stepper__header) {
  display: none;
}
.dialog-apply-stepper :deep(.q-stepper__step-inner) {
  padding: 8px 12px 12px;
}
.dialog-application-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 14px;
  align-items: start;
}
.dialog-section {
  margin-bottom: 0 !important;
}
.dialog-section-stack--left {
  grid-column: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dialog-section--type,
.dialog-section--details,
.dialog-section--commutation {
  grid-column: 1;
}
.dialog-section--reason {
  grid-column: 2 / 4;
  grid-row: 1;
}
.dialog-section--dates {
  grid-column: 2 / 4;
  grid-row: 2 / span 2;
}
.dialog-section--dates-raised {
  grid-row: 2;
}
.dialog-section--full,
.dialog-section--actions {
  grid-column: 1 / -1;
}
.dialog-section--actions-raised {
  grid-column: 2 / 4;
  grid-row: 3;
  justify-self: end;
  align-self: start;
}
.dialog-dates-layout {
  align-items: start;
}
.dialog-selected-dates-panel {
  align-self: start;
  display: flex;
  flex-direction: column;
}
.dialog-detail-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dialog-detail-options :deep(.q-option-group) {
  gap: 4px;
}
.dialog-detail-options :deep(.q-radio) {
  margin: 0;
}
.selected-date-duration-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.selected-date-duration-list--scrollable {
  max-height: calc((28px * 6) + (6px * 5));
  overflow-y: auto;
  padding-right: 6px;
  scrollbar-gutter: stable;
}
.selected-date-duration-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 28px;
  gap: 10px;
  padding: 2px 0;
  border-radius: 6px;
  transition: background-color 0.15s ease;
}
.selected-date-duration-row:hover {
  background: #f1f3f5;
}
.selected-date-duration-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.84rem;
  font-weight: 600;
  color: #46535d;
}
.selected-date-duration-toggle {
  border: 0;
  padding: 2px 8px;
  border-radius: 999px;
  background: transparent;
  color: #2e7d32;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  line-height: 1.2;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.selected-date-duration-toggle--half {
  color: #42a5f5;
}
.selected-date-duration-toggle:hover {
  background: rgba(46, 125, 50, 0.12);
}
.selected-date-duration-toggle--half:hover {
  background: rgba(66, 165, 245, 0.16);
}
.dialog-form-card :deep(.q-date) {
  box-shadow: none;
  max-width: 360px;
  font-size: 0.9rem;
}
.dialog-form-card :deep(.q-date__header) {
  display: none;
}
.dialog-form-card :deep(.q-date--portrait-standard .q-date__content) {
  height: 100%;
}
.dialog-form-card :deep(.q-date__content) {
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
}
.dialog-form-card :deep(.q-date__view) {
  min-height: 236px;
  padding: 10px 12px 8px;
}
.dialog-form-card :deep(.q-date__calendar-days-container) {
  min-height: 156px;
}
.dialog-form-card :deep(.q-date__calendar-item) {
  height: 26px;
}
.dialog-form-card :deep(.q-date__calendar-item div) {
  min-width: 24px;
  height: 24px;
}
.dialog-form-card :deep(.q-stepper__nav) {
  padding-top: 0;
}
</style>
