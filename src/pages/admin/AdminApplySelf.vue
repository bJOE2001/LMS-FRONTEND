<template>
  <component
    :is="inDialog ? 'div' : 'q-page'"
    :class="['apply-form-shell', inDialog ? 'q-pa-sm apply-form-shell--dialog' : 'q-pa-md']"
  >
    <div v-if="!inDialog" class="q-mb-lg">
      <div class="row items-center q-mb-xs">
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-none">Apply for Leave</h1>
      </div>
    </div>

    <q-card flat bordered :class="['rounded-borders q-mb-lg', { 'dialog-form-card': inDialog }]">
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
              <div class="col-12 col-md-6">
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
              <div class="col-12 col-md-6">
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
          <q-form ref="step2Form" @submit.prevent="onSubmit" greedy :class="{ 'dialog-step-form': inDialog }">
            <div :class="{ 'dialog-step-content-scroll': inDialog }">
            <div v-if="inDialog" class="section-block dialog-summary-panel q-mb-lg">
              <div class="dialog-summary-header">
                <div class="dialog-summary-main">
                  <div class="dialog-summary-line dialog-summary-line--name">
                    <q-skeleton
                      v-if="dialogSummaryLoading"
                      type="text"
                      animation="fade"
                      class="dialog-summary-skeleton dialog-summary-skeleton--name"
                    />
                    <template v-else>{{ dialogEmployeeName }}</template>
                  </div>
                  <div class="dialog-summary-line dialog-summary-line--position">
                    <q-skeleton
                      v-if="dialogSummaryLoading"
                      type="text"
                      animation="fade"
                      class="dialog-summary-skeleton dialog-summary-skeleton--position"
                    />
                    <template v-else>{{ form.position || '-' }}</template>
                  </div>
                  <div class="dialog-summary-line dialog-summary-line--department">
                    <q-skeleton
                      v-if="dialogSummaryLoading"
                      type="text"
                      animation="fade"
                      class="dialog-summary-skeleton dialog-summary-skeleton--department"
                    />
                    <template v-else>{{ dialogOfficeDisplay }}</template>
                  </div>
                </div>
                <div class="dialog-summary-meta">
                  <div class="dialog-summary-meta-item dialog-summary-meta-item--filed">
                    <span class="dialog-summary-meta-label">Date of Filing:</span>
                    <span class="dialog-summary-meta-value">{{ todayFormatted }}</span>
                  </div>
                  <div class="dialog-summary-meta-item dialog-summary-meta-item--leave-balance">
                    <div :class="['dialog-summary-badges', { 'dialog-summary-badges--loading': dialogSummaryLoading }]">
                      <template v-if="dialogSummaryLoading">
                        <q-skeleton
                          v-for="index in 5"
                          :key="`dialog-balance-${index}`"
                          type="rect"
                          animation="fade"
                          class="dialog-summary-badge-skeleton"
                        />
                      </template>
                      <template v-else>
                        <span
                          v-for="item in dialogLeaveBalanceItems"
                          :key="item.key"
                          class="dialog-summary-badge"
                        >
                          {{ item.label }}
                          <q-tooltip>{{ item.tooltip }}</q-tooltip>
                        </span>
                      </template>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                hide-bottom-space
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
                hide-bottom-space
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
                <q-select
                  v-if="form.sickDetail"
                  v-model="form.sickSpecify"
                  :options="sickIllnessOptions"
                  outlined
                  dense
                  emit-value
                  map-options
                  clearable
                  label="Specify illness *"
                  placeholder="Select illness"
                  class="form-input q-mt-sm"
                />
                <q-input
                  v-if="form.sickDetail && form.sickSpecify === 'Other'"
                  v-model="form.sickSpecifyOther"
                  outlined
                  dense
                  label="Other illness *"
                  placeholder="Enter illness"
                  class="form-input q-mt-sm"
                />
                </div>

                <div v-if="showDocumentUploadField" class="dialog-detail-options">
                <q-file
                  v-model="form.attachmentFile"
                  outlined
                  dense
                  clearable
                  use-chips
                  counter
                  :max-files="1"
                  accept="image/*,.pdf,.doc,.docx"
                  :max-file-size="attachmentMaxSizeBytes"
                  :label="documentUploadLabel"
                  hint="Allowed: image, PDF, DOC, DOCX (max 10 MB)"
                  persistent-hint
                  bottom-slots
                  class="form-input q-mt-sm"
                  @rejected="onAttachmentRejected"
                >
                  <template #prepend>
                    <q-icon name="attach_file" />
                  </template>
                </q-file>
                <div v-if="documentUploadHint" class="text-caption text-negative q-mt-xs">
                  {{ documentUploadHint }}
                </div>
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
              <div class="text-subtitle1 text-weight-bold q-mb-md">Number of Working Days Applied</div>

              <div class="row q-col-gutter-md" :class="{ 'dialog-dates-layout': inDialog }">
                <div :class="inDialog ? 'col-12 col-sm-6' : 'col-12 col-md-6'">
                  <label class="input-label">
                    <template v-if="isMco6Leave">Select Leave Dates (max 3)</template>
                    <template v-else-if="isMaternityLeave || isPaternityLeave">Select Start Date</template>
                    <template v-else>Select Leave Dates</template>
                  </label>

                  <!-- Maternity/Paternity Leave: Single Date Picker -->
                  <div
                    ref="leaveDateCalendarRef"
                    class="leave-date-calendar q-mt-sm"
                    @pointerdown.capture="handleCalendarSurfacePointerDown"
                    @click.capture="handleCalendarSurfaceClick"
                  >
                    <q-date
                      v-if="isMaternityLeave || isPaternityLeave"
                      v-model="maternityStartDate"
                      mask="YYYY-MM-DD"
                      color="primary"
                      :options="leaveDateOptions"
                      style="width: 100%"
                      @navigation="onCalendarNavigation"
                    />

                    <!-- Standard Leave: Multi-select -->
                    <q-date
                      v-else
                      v-model="selectedDates"
                      multiple
                      mask="YYYY-MM-DD"
                      color="primary"
                      :options="leaveDateOptions"
                      style="width: 100%"
                      @navigation="onCalendarNavigation"
                      @update:model-value="onSelectedDatesChange"
                    />

                    <div
                      v-if="calendarDateWarning && calendarDateWarningStyle.left"
                      :class="[
                        'leave-date-warning-popover',
                        `leave-date-warning-popover--${calendarWarningState}`,
                      ]"
                      :style="calendarDateWarningStyle"
                    >
                      <q-icon :name="calendarWarningIcon" size="16px" />
                      <span>{{ calendarDateWarning }}</span>
                    </div>
                  </div>
                </div>
                <div :class="inDialog ? 'col-12 col-sm-6 dialog-selected-dates-panel' : 'col-12 col-md-6'">
                  <div class="selected-dates-warning-slot">
                    <div
                      v-if="maxDaysWarning"
                      class="row items-start no-wrap text-caption text-warning"
                    >
                      <q-icon name="warning_amber" size="14px" class="q-mr-xs q-mt-xs" />
                      <span>{{ maxDaysWarning }}</span>
                    </div>
                  </div>
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
                      <div class="selected-date-duration-actions">
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
                        <button
                          v-if="selectedDateDurations[d] === 'half_day'"
                          type="button"
                          :class="[
                            'selected-date-duration-toggle',
                            'selected-date-duration-toggle--half-day-portion',
                            {
                              'selected-date-duration-toggle--half-day-portion-pm':
                                selectedDateHalfDayPortions[d] === 'PM',
                            },
                          ]"
                          @click="toggleSelectedDateHalfDayPortion(d)"
                        >
                          {{ selectedDateHalfDayPortionLabel(d) }}
                        </button>
                        <span
                          v-else
                          class="selected-date-duration-toggle selected-date-duration-toggle--half-day-placeholder"
                          aria-hidden="true"
                        >
                          AM
                        </span>
                        <button
                          type="button"
                          :class="[
                            'selected-date-duration-toggle',
                            'selected-date-duration-toggle--pay-status',
                            {
                              'selected-date-duration-toggle--without-pay':
                                selectedDatePayStatuses[d] === 'without_pay',
                            },
                          ]"
                          @click="toggleSelectedDatePayStatus(d)"
                        >
                          {{ selectedDatePayStatusLabel(d) }}
                        </button>
                      </div>
                    </div>
                  </div>
                  <q-list v-else dense bordered separator class="rounded-borders q-mt-sm" style="max-height: 300px; overflow-y: auto">
                    <q-item v-for="(d, idx) in sortedSelectedDates" :key="idx">
                      <q-item-section>
                        <q-item-label>{{ formatDateDisplay(d) }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <div class="selected-date-duration-actions selected-date-duration-actions--list">
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
                          <button
                            v-if="selectedDateDurations[d] === 'half_day'"
                            type="button"
                            :class="[
                              'selected-date-duration-toggle',
                              'selected-date-duration-toggle--half-day-portion',
                              {
                                'selected-date-duration-toggle--half-day-portion-pm':
                                  selectedDateHalfDayPortions[d] === 'PM',
                              },
                            ]"
                            @click="toggleSelectedDateHalfDayPortion(d)"
                          >
                            {{ selectedDateHalfDayPortionLabel(d) }}
                          </button>
                          <span
                            v-else
                            class="selected-date-duration-toggle selected-date-duration-toggle--half-day-placeholder"
                            aria-hidden="true"
                          >
                            AM
                          </span>
                          <button
                            type="button"
                            :class="[
                              'selected-date-duration-toggle',
                              'selected-date-duration-toggle--pay-status',
                              {
                                'selected-date-duration-toggle--without-pay':
                                  selectedDatePayStatuses[d] === 'without_pay',
                              },
                            ]"
                            @click="toggleSelectedDatePayStatus(d)"
                          >
                            {{ selectedDatePayStatusLabel(d) }}
                          </button>
                          <q-btn flat round dense icon="close" size="sm" color="negative" @click="removeSelectedDate(idx)" :disable="isMaternityLeave || isPaternityLeave" />
                        </div>
                      </q-item-section>
                    </q-item>
                  </q-list>
                  <div class="text-caption q-mt-sm text-grey-6">
                    {{ formatSelectedDayCount(selectedDateTotalDays) }} day(s) selected
                    <template v-if="selectedDateCreditTotalDays !== selectedDateTotalDays">
                      • {{ formatSelectedDayCount(selectedDateCreditTotalDays) }} day(s) deductible
                    </template>
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
            </div>
            </div>

            <!-- Navigation -->
            <q-stepper-navigation
              :class="[
                'dialog-section',
                moveDialogActionsUp ? 'dialog-section--actions-raised' : 'dialog-section--actions',
                { 'dialog-actions-bar': inDialog },
              ]"
            >
              <div :class="['row', { 'q-gutter-md': !inDialog, 'dialog-actions-row': inDialog }]">
                <template v-if="inDialog">
                  <q-btn outline no-caps label="Cancel" color="grey-7" class="step-btn" @click="handleCancel" />
                  <q-btn
                    unelevated
                    no-caps
                    color="primary"
                    type="button"
                    :label="isMonetization ? 'Submit Request' : 'Submit Application'"
                    :icon="$q.screen.lt.sm ? void 0 : 'send'"
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
                  <q-btn unelevated no-caps color="primary" type="submit" :label="isMonetization ? 'Submit Request' : 'Submit Application'" :icon="$q.screen.lt.sm ? void 0 : 'send'" :loading="loading" :disable="isMonetization && monetizationSubmitDisabled" class="step-btn" />
                </template>
              </div>
            </q-stepper-navigation>
          </q-form>
        </q-step>
      </q-stepper>
    </q-card>

  </component>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { api } from 'boot/axios'
import { useAuthStore } from 'stores/auth-store'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'
import { saveLocalLeaveApplicationDetails } from 'src/utils/leave-application-local-details'
import {
  enumerateInclusiveDates,
  getApplicationBlockingDates,
  getApplicationInformationalDates,
  getBlockingLeaveApplicationState,
  getApplicationRequestedDayCount,
  getApplicationSelectedDates,
  getInformationalLeaveApplicationState,
  isBlockingLeaveApplication,
  normalizeIsoDate,
  offsetIsoDate,
} from 'src/utils/leave-date-locking'

const props = defineProps({
  inDialog: {
    type: Boolean,
    default: false,
  },
  existingApplications: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['cancel', 'submitted'])

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()

const step = ref(props.inDialog ? 2 : 1)
const step1Form = ref(null)
const step2Form = ref(null)
const loading = ref(false)
const dialogSummaryLoading = ref(Boolean(props.inDialog))
const selectedDateDurations = ref({})
const selectedDatePayStatuses = ref({})
const selectedDateHalfDayPortions = ref({})
const calendarDateWarning = ref('')
const calendarDateWarningDate = ref('')
const calendarDateWarningStyle = ref({})
const leaveDateCalendarRef = ref(null)
const latestApplications = ref([])
const hasLoadedLatestApplications = ref(false)
let applicationsRefreshIntervalId = null

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
  sickSpecifyOther: '',
  attachmentFile: null,
  womenSpecify: '',
  studyDetail: '',
  otherPurpose: '',
  days: 1,
  startDate: '',
  endDate: '',
  commutation: 'Not Requested',
  reason: '',
})

function parseSalary(value) {
  if (value === null || value === undefined || value === '') return null

  const numericValue = Number(value)
  if (Number.isFinite(numericValue)) {
    return numericValue > 0 ? numericValue : null
  }

  const cleaned = String(value)
    .replace(/,/g, '')
    .replace(/[^\d.-]/g, '')
    .trim()
  if (!cleaned || cleaned === '.' || cleaned === '-' || cleaned === '-.') return null

  const parsed = Number(cleaned)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const attachmentMaxSizeBytes = 10 * 1024 * 1024
const allowedAttachmentExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.pdf', '.doc', '.docx']
const sickIllnessOptions = [
  { label: 'Flu', value: 'Flu' },
  { label: 'Fever', value: 'Fever' },
  { label: 'Cough and Cold', value: 'Cough and Cold' },
  { label: 'Hypertension', value: 'Hypertension' },
  { label: 'Migraine', value: 'Migraine' },
  { label: 'Asthma', value: 'Asthma' },
  { label: 'Dengue', value: 'Dengue' },
  { label: 'Diarrhea', value: 'Diarrhea' },
  { label: 'Urinary Tract Infection (UTI)', value: 'Urinary Tract Infection (UTI)' },
  { label: 'Other', value: 'Other' },
]

function resolveSingleFile(value) {
  if (!value) return null
  if (Array.isArray(value)) return value[0] || null
  return value
}

function isAllowedAttachmentImage(file) {
  if (!file) return false

  const mimeType = String(file.type || '').trim().toLowerCase()
  const allowedMimeTypes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ])
  if (mimeType.startsWith('image/') || allowedMimeTypes.has(mimeType)) return true

  const filename = String(file.name || '').trim().toLowerCase()
  return allowedAttachmentExtensions.some((ext) => filename.endsWith(ext))
}

const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]'

function appendMultipartValue(formData, key, value) {
  if (value === undefined || value === null) return

  if (
    (typeof File !== 'undefined' && value instanceof File) ||
    (typeof Blob !== 'undefined' && value instanceof Blob)
  ) {
    formData.append(key, value)
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      appendMultipartValue(formData, `${key}[${index}]`, item)
    })
    return
  }

  if (isPlainObject(value)) {
    Object.entries(value).forEach(([childKey, childValue]) => {
      appendMultipartValue(formData, `${key}[${childKey}]`, childValue)
    })
    return
  }

  if (typeof value === 'boolean') {
    formData.append(key, value ? '1' : '0')
    return
  }

  formData.append(key, String(value))
}

function buildMultipartPayload(payload) {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    appendMultipartValue(formData, key, value)
  })
  return formData
}

function onAttachmentRejected() {
  $q.notify({ type: 'negative', message: 'Please upload an image or document file up to 10 MB.' })
}

const resolvedSickIllness = computed(() => {
  const selectedIllness = String(form.value.sickSpecify || '').trim()
  if (selectedIllness !== 'Other') {
    return selectedIllness
  }

  return String(form.value.sickSpecifyOther || '').trim()
})

const today = new Date()
const calendarView = ref({
  year: today.getFullYear(),
  month: today.getMonth() + 1,
})
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

const REQUIRED_LEAVE_BALANCE_TYPES = [
  'Vacation Leave',
  'Sick Leave',
  'CTO Leave',
  'Mandatory / Forced Leave',
  'Special Privilege Leave',
  'Wellness Leave',
]

function formatLeaveBalanceValue(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return ''
  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(2)
}

function prettifyLeaveBalanceLabel(value) {
  const label = String(value || '').trim()
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
  if (lower === 'cto' || lower === 'cto leave') return 'CTO Leave'
  if (lower === 'vacation') return 'Vacation Leave'
  if (lower === 'sick') return 'Sick Leave'
  if (lower === 'vacation leave') return 'Vacation Leave'
  if (lower === 'sick leave') return 'Sick Leave'
  if (lower === 'wellness' || lower === 'wellness leave') return 'Wellness Leave'

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase())
}

function getLeaveTypeDisplayLabel(value) {
  const prettified = prettifyLeaveBalanceLabel(value)
  if (prettified === 'Special Privilege Leave') return 'MC06'
  return prettified
}

function toLeaveBalanceAcronym(value) {
  const label = prettifyLeaveBalanceLabel(value)
  if (!label) return ''

  const lower = label.toLowerCase()
  if (lower === 'mandatory / forced leave') return 'FL'
  if (lower === 'special privilege leave') return 'SPL'
  if (lower === 'cto leave') return 'CTO'
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

function getLeaveBalanceTypeKey(value) {
  return prettifyLeaveBalanceLabel(value).trim().toLowerCase()
}

function addLeaveBalanceEntry(entries, seen, label, value) {
  const formattedValue = formatLeaveBalanceValue(value)
  const formattedLabel = prettifyLeaveBalanceLabel(label)
  if (!formattedLabel || formattedValue === '') return

  const key = formattedLabel.toLowerCase()
  if (seen.has(key)) return

  seen.add(key)
  entries.push({ label: formattedLabel, value: formattedValue })
}

function resolveLeaveBalanceItemLabel(item, fallbackLabel = '') {
  const directLabel =
    item?.leave_type_name ||
    item?.leave_type ||
    item?.type_name ||
    item?.type ||
    item?.name ||
    item?.label ||
    fallbackLabel

  if (String(directLabel || '').trim() !== '') {
    return directLabel
  }

  const rawTypeId = Number(
    item?.leave_type_id ??
      item?.leaveTypeId ??
      item?.type_id ??
      item?.typeId ??
      item?.id,
  )

  if (!Number.isFinite(rawTypeId) || rawTypeId <= 0) {
    return fallbackLabel
  }

  const matchedType = allLeaveTypes.value.find((leaveType) => {
    const leaveTypeId = Number(
      leaveType?.id ?? leaveType?.leave_type_id ?? leaveType?.type_id,
    )
    return Number.isFinite(leaveTypeId) && leaveTypeId === rawTypeId
  })

  return matchedType?.name || matchedType?.leave_type_name || fallbackLabel
}

function collectLeaveBalanceEntriesFromValue(entries, seen, source, fallbackLabel = '') {
  if (!source) return

  if (Array.isArray(source)) {
    for (const item of source) {
      if (item == null || typeof item !== 'object') continue

      addLeaveBalanceEntry(
        entries,
        seen,
        resolveLeaveBalanceItemLabel(item, fallbackLabel),
        item.balance ?? item.remaining_balance ?? item.available_balance ?? item.credits ?? item.value,
      )
    }
    return
  }

  if (typeof source !== 'object') {
    addLeaveBalanceEntry(entries, seen, fallbackLabel, source)
    return
  }

  for (const [key, value] of Object.entries(source)) {
    if (value == null || key === 'as_of_date') continue

    if (typeof value === 'object' && !Array.isArray(value)) {
      addLeaveBalanceEntry(
        entries,
        seen,
        value.leave_type_name || value.leave_type || value.type_name || value.type || value.name || value.label || key,
        value.balance ?? value.remaining_balance ?? value.available_balance ?? value.credits ?? value.value,
      )
      continue
    }

    addLeaveBalanceEntry(entries, seen, key, value)
  }
}

function collectLeaveBalanceEntries(entries, seen, source) {
  if (!source) return

  collectLeaveBalanceEntriesFromValue(entries, seen, source?.certificationLeaveCredits)
  collectLeaveBalanceEntriesFromValue(entries, seen, source?.certification_leave_credits)
  collectLeaveBalanceEntriesFromValue(entries, seen, source?.leaveBalances)
  collectLeaveBalanceEntriesFromValue(entries, seen, source?.leave_balances)
  collectLeaveBalanceEntriesFromValue(entries, seen, source?.leaveCredits)
  collectLeaveBalanceEntriesFromValue(entries, seen, source?.leave_credits)
  collectLeaveBalanceEntriesFromValue(entries, seen, source?.balances)
  collectLeaveBalanceEntriesFromValue(entries, seen, source?.leave_balance)
  collectLeaveBalanceEntriesFromValue(entries, seen, source?.leave_balance_summary)
  collectLeaveBalanceEntriesFromValue(entries, seen, source?.employee_leave_balances)
  collectLeaveBalanceEntriesFromValue(entries, seen, source?.leaveBalance)
  collectLeaveBalanceEntriesFromValue(entries, seen, source)
}

function buildOrderedLeaveBalanceEntries(...sources) {
  let orderedLabels = REQUIRED_LEAVE_BALANCE_TYPES
  let sourceEntries = sources

  if (Array.isArray(sources[0])) {
    orderedLabels = sources[0].length ? sources[0] : []
    sourceEntries = sources.slice(1)
  }

  const entries = []
  const seen = new Set()

  for (const source of sourceEntries) {
    collectLeaveBalanceEntries(entries, seen, source)
  }

  const entryByType = new Map(entries.map((entry) => [getLeaveBalanceTypeKey(entry.label), entry]))
  return orderedLabels.map((label) =>
    entryByType.get(getLeaveBalanceTypeKey(label)) || { label, value: '0' },
  )
}

function buildLeaveBalanceEntries(...sources) {
  const entries = []
  const seen = new Set()

  for (const source of sources) {
    collectLeaveBalanceEntries(entries, seen, source)
  }

  return entries
}

function normalizeLookupValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function normalizePersonName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getApplicationEmployeeName(application) {
  return (
    application?.employeeName ||
    application?.employee_name ||
    application?.employee?.name ||
    application?.employee?.full_name ||
    application?.employee?.employee_name ||
    application?.name ||
    application?.full_name ||
    [application?.employee?.firstname, application?.employee?.middlename, application?.employee?.surname].filter(Boolean).join(' ') ||
    [application?.firstname, application?.middlename, application?.surname].filter(Boolean).join(' ')
  )
}

function getApplicationLeaveTypeName(application) {
  return prettifyLeaveBalanceLabel(
    application?.leaveType ??
      application?.leave_type_name ??
      application?.leaveTypeName ??
      application?.leave_type ??
      application?.leaveType?.name ??
      application?.leave?.name ??
      '',
  )
}

function extractApplicationsFromPayload(payload) {
  if (!payload) return []
  if (Array.isArray(payload)) return payload

  const candidates = [
    payload?.applications,
    payload?.leave_applications,
    payload?.leaveApplications,
    payload?.rows,
    payload?.items,
    payload?.data,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
    if (candidate && typeof candidate === 'object' && Array.isArray(candidate.data)) {
      return candidate.data
    }
  }

  return []
}

function getApplicationLogicalKey(application, index) {
  const explicitId =
    application?.id ??
    application?.application_id ??
    application?.leave_application_id

  if (explicitId !== undefined && explicitId !== null && String(explicitId).trim() !== '') {
    return `id:${String(explicitId).trim()}`
  }

  const applicationControlNo = normalizeLookupValue(
    application?.employee_control_no ??
      application?.employeeControlNo ??
      application?.control_no ??
      application?.controlNo ??
      application?.employee?.control_no ??
      application?.employee?.controlNo ??
      application?.employee?.employee_control_no ??
      application?.employee?.employeeControlNo,
  )
  const applicationName = normalizePersonName(getApplicationEmployeeName(application))
  const filedDate = normalizeIsoDate(
    application?.dateFiled ??
      application?.date_filed ??
      application?.filed_at ??
      application?.filedAt ??
      application?.created_at ??
      application?.createdAt,
  )
  const leaveTypeKey = normalizePersonName(
    application?.leaveType ?? application?.leave_type ?? application?.leaveTypeName ?? application?.leave_type_name,
  )
  const selectedDatesKey = getApplicationSelectedDates(application).join(',')
  const startDate = normalizeIsoDate(application?.startDate ?? application?.start_date)
  const endDate = normalizeIsoDate(application?.endDate ?? application?.end_date)

  const fallbackKey = [
    applicationControlNo || applicationName,
    leaveTypeKey,
    filedDate,
    selectedDatesKey || `${startDate}|${endDate}`,
  ]
    .filter(Boolean)
    .join('|')

  return fallbackKey ? `logical:${fallbackKey}` : `index:${index}`
}

function getApplicationTimestampValue(application) {
  const candidates = [
    application?.updated_at,
    application?.updatedAt,
    application?.disapprovedAt,
    application?.hrActionAt,
    application?.adminActionAt,
    application?.dateFiled,
    application?.date_filed,
    application?.filed_at,
    application?.filedAt,
    application?.created_at,
    application?.createdAt,
  ]

  for (const candidate of candidates) {
    const timestamp = Date.parse(candidate)
    if (!Number.isNaN(timestamp)) return timestamp
  }

  return 0
}

function getApplicationDateDetailScore(application) {
  const selectedDates = getApplicationSelectedDates(application)
  if (selectedDates.length > 0) return selectedDates.length

  const startDate = normalizeIsoDate(application?.startDate ?? application?.start_date)
  const endDate = normalizeIsoDate(application?.endDate ?? application?.end_date)
  return startDate || endDate ? 1 : 0
}

function choosePreferredApplication(existingApplication, incomingApplication) {
  if (!existingApplication) return incomingApplication

  const existingState = getBlockingLeaveApplicationState(existingApplication)
  const incomingState = getBlockingLeaveApplicationState(incomingApplication)

  if (Boolean(existingState) !== Boolean(incomingState)) {
    return incomingState ? existingApplication : incomingApplication
  }

  const incomingDateScore = getApplicationDateDetailScore(incomingApplication)
  const existingDateScore = getApplicationDateDetailScore(existingApplication)
  if (incomingDateScore !== existingDateScore) {
    return incomingDateScore > existingDateScore ? incomingApplication : existingApplication
  }

  const incomingTimestamp = getApplicationTimestampValue(incomingApplication)
  const existingTimestamp = getApplicationTimestampValue(existingApplication)
  if (incomingTimestamp !== existingTimestamp) {
    return incomingTimestamp > existingTimestamp ? incomingApplication : existingApplication
  }

  return incomingApplication
}

async function refreshLatestApplications() {
  const [dashboardResponse, leaveApplicationsResponse] = await Promise.all([
    api.get('/admin/dashboard').catch(() => null),
    api.get('/admin/leave-applications').catch(() => null),
  ])

  const mergedApplications = new Map()

  ;[
    ...(Array.isArray(props.existingApplications) ? props.existingApplications : []),
    ...extractApplicationsFromPayload(dashboardResponse?.data),
    ...extractApplicationsFromPayload(leaveApplicationsResponse?.data),
  ].forEach((application, index) => {
    const key = getApplicationLogicalKey(application, index)
    const existingApplication = mergedApplications.get(key)
    mergedApplications.set(key, choosePreferredApplication(existingApplication, application))
  })

  latestApplications.value = Array.from(mergedApplications.values())
  hasLoadedLatestApplications.value = true
}

function handleLatestApplicationsFocusRefresh() {
  refreshLatestApplications().catch(() => {})
}

function handleLatestApplicationsVisibilityRefresh() {
  if (document.visibilityState !== 'visible') return
  refreshLatestApplications().catch(() => {})
}

const currentAdminName = computed(() => {
  const user = authStore.user
  const fullName = `${user?.firstname || ''} ${user?.surname || ''}`.trim()
  return fullName || String(user?.name || '').trim()
})

const currentAdminControlNo = computed(() =>
  normalizeLookupValue(
    authStore.user?.control_no ??
      authStore.user?.employee_control_no ??
      authStore.user?.employeeControlNo ??
      authStore.user?.controlNo,
  ),
)

const currentAdminNameTokens = computed(() =>
  [normalizePersonName(form.value.firstName), normalizePersonName(form.value.lastName)].filter(Boolean),
)

const applicationSource = computed(() =>
  hasLoadedLatestApplications.value
    ? latestApplications.value
    : (Array.isArray(props.existingApplications) ? props.existingApplications : []),
)

const selfApplicationsForBalance = computed(() => {
  const currentName = normalizePersonName(currentAdminName.value)
  const currentControlNo = currentAdminControlNo.value

  return applicationSource.value.filter((application) => {
    const applicationControlNo = normalizeLookupValue(
      application?.employee_control_no ??
        application?.employeeControlNo ??
        application?.control_no ??
        application?.controlNo,
    )

    if (currentControlNo && applicationControlNo) {
      return applicationControlNo === currentControlNo
    }

    const applicationName = normalizePersonName(getApplicationEmployeeName(application))
    if (!applicationName) return !currentName

    if (currentAdminNameTokens.value.length > 0) {
      return currentAdminNameTokens.value.every((token) => applicationName.includes(token))
    }

    return applicationName === currentName
  })
})

const selfApplicationsForBalanceByRecency = computed(() =>
  [...selfApplicationsForBalance.value]
    .sort((left, right) => getApplicationTimestampValue(right) - getApplicationTimestampValue(left)),
)

const resolvedLeaveBalanceEntries = computed(() =>
  buildLeaveBalanceEntries(
    ...selfApplicationsForBalanceByRecency.value,
    { leaveCredits: allLeaveTypes.value },
    authStore.user,
  ),
)

const dialogAllowedLeaveBalanceTypes = computed(() => {
  const allowedTypeKeys = new Set(
    allLeaveTypes.value
      .filter((leaveType) => leaveType?.is_credit_based)
      .map((leaveType) => getLeaveBalanceTypeKey(leaveType?.name)),
  )

  return REQUIRED_LEAVE_BALANCE_TYPES.filter((label) =>
    allowedTypeKeys.has(getLeaveBalanceTypeKey(label)),
  )
})

const dialogLeaveBalanceItems = computed(() =>
  buildOrderedLeaveBalanceEntries(
    dialogAllowedLeaveBalanceTypes.value,
    ...selfApplicationsForBalanceByRecency.value,
    { leaveCredits: allLeaveTypes.value },
    authStore.user,
  ).map((entry) => ({
    key: getLeaveBalanceTypeKey(entry.label),
    label: `${toLeaveBalanceAcronym(entry.label) || entry.label}: ${entry.value}`,
    tooltip: entry.label,
  })),
)

const selfExistingApplications = computed(() => {
  const currentName = normalizePersonName(currentAdminName.value)
  const currentControlNo = currentAdminControlNo.value

  return applicationSource.value
    .filter((application) => isBlockingLeaveApplication(application))
    .filter((application) => {
      const applicationControlNo = normalizeLookupValue(
        application?.employee_control_no ??
          application?.employeeControlNo ??
          application?.control_no ??
          application?.controlNo,
      )

      if (currentControlNo && applicationControlNo) {
        return applicationControlNo === currentControlNo
      }

      const applicationName = normalizePersonName(getApplicationEmployeeName(application))
      if (!applicationName) return !currentName

      if (currentAdminNameTokens.value.length > 0) {
        return currentAdminNameTokens.value.every((token) => applicationName.includes(token))
      }

      return applicationName === currentName
    })
})

const selfInformationalApplications = computed(() => selfApplicationsForBalance.value.filter((application) =>
  getInformationalLeaveApplicationState(application),
))

function getLockedDatePriority(state) {
  return state === 'pending' ? 2 : 1
}

const lockedLeaveDateStates = computed(() => {
  const dates = new Map()

  selfExistingApplications.value.forEach((application) => {
    const state = getBlockingLeaveApplicationState(application)
    if (!state) return

    getApplicationBlockingDates(application).forEach((date) => {
      const existingState = dates.get(date)
      if (!existingState || getLockedDatePriority(state) > getLockedDatePriority(existingState)) {
        dates.set(date, state)
      }
    })
  })

  return dates
})

const informationalLeaveDateStates = computed(() => {
  const dates = new Map()

  selfInformationalApplications.value.forEach((application) => {
    const state = getInformationalLeaveApplicationState(application)
    if (!state) return

    getApplicationInformationalDates(application).forEach((date) => {
      if (!dates.has(date)) {
        dates.set(date, state)
      }
    })
  })

  return dates
})

const lockedLeaveDates = computed(() => new Set(lockedLeaveDateStates.value.keys()))
const unavailableLeaveDates = computed(() => new Set([
  ...lockedLeaveDateStates.value.keys(),
  ...informationalLeaveDateStates.value.keys(),
]))
const calendarWarningState = computed(() =>
  getLockedDateState(calendarDateWarningDate.value) ||
  getInformationalDateState(calendarDateWarningDate.value) ||
  'pending',
)
const calendarWarningIcon = computed(() =>
  calendarWarningState.value === 'recalled' ? 'info_outline' : 'warning_amber',
)

function getVacationLeaveTypeId() {
  const vacationType = allLeaveTypes.value.find((lt) => lt.name === 'Vacation Leave')
  return vacationType ? (vacationType.leave_type_id || vacationType.id) : null
}

function sortLeaveTypeOptions(leaveTypes) {
  return [...leaveTypes]
    .sort((left, right) => String(left?.name || '').localeCompare(String(right?.name || '')))
    .map((leaveType) => ({
      label: getLeaveTypeDisplayLabel(leaveType.name),
      value: leaveType.leave_type_id || leaveType.id,
    }))
}

function ensureDefaultLeaveType() {
  if (form.value.leaveTypeId) return
  const vacationLeaveTypeId = getVacationLeaveTypeId()
  const fallbackLeaveTypeId = vacationLeaveTypeId || leaveTypeOptions.value[0]?.value || null
  if (!fallbackLeaveTypeId) return
  form.value.leaveTypeId = fallbackLeaveTypeId
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
    const resolvedSalary = parseSalary(data?.salary)
    if (resolvedSalary && !parseSalary(form.value.salary)) {
      form.value.salary = resolvedSalary
    }
    const all = [
      ...(data.accrued || []),
      ...(data.resettable || []),
      ...(data.event_based || [])
    ]
    allLeaveTypes.value = all
    leaveTypeOptions.value = sortLeaveTypeOptions(all)
    ensureDefaultLeaveType()
    await refreshLatestApplications()

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleLatestApplicationsFocusRefresh)
      applicationsRefreshIntervalId = window.setInterval(() => {
        if (document.visibilityState === 'hidden') return
        refreshLatestApplications().catch(() => {})
      }, 30000)
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleLatestApplicationsVisibilityRefresh)
    }
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load leave types right now.')
    $q.notify({ type: 'negative', message: msg })
  } finally {
    dialogSummaryLoading.value = false
  }
})

const selectedLeaveTypeName = computed(() => {
  const lt = allLeaveTypes.value.find(t => (t.leave_type_id || t.id) === form.value.leaveTypeId)
  return lt ? lt.name : ''
})
const selectedLeaveTypeConfig = computed(() =>
  allLeaveTypes.value.find((leaveType) => (leaveType.leave_type_id || leaveType.id) === form.value.leaveTypeId) || null,
)
const selectedLeaveTypeRequiresDocuments = computed(() =>
  Boolean(selectedLeaveTypeConfig.value?.requires_documents ?? selectedLeaveTypeConfig.value?.requiresDocuments ?? false),
)

function formatDayCountValue(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return '0'
  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(1)
}

const selectedLeaveTypeBalanceValue = computed(() => {
  const leaveTypeKey = getLeaveBalanceTypeKey(selectedLeaveTypeName.value)
  if (!leaveTypeKey) return null

  const matchedEntry = resolvedLeaveBalanceEntries.value.find(
    (entry) => getLeaveBalanceTypeKey(entry.label) === leaveTypeKey,
  )

  if (!matchedEntry) return null

  const numericValue = Number(matchedEntry.value)
  return Number.isFinite(numericValue) ? numericValue : null
})

const pendingSelectedLeaveDays = computed(() =>
  selfApplicationsForBalance.value
    .filter((application) => getBlockingLeaveApplicationState(application) === 'pending')
    .filter((application) =>
      getLeaveBalanceTypeKey(getApplicationLeaveTypeName(application)) ===
        getLeaveBalanceTypeKey(selectedLeaveTypeName.value),
    )
    .reduce((total, application) => total + getApplicationRequestedDayCount(application), 0),
)

const availableSelectedLeaveBalance = computed(() => {
  if (selectedLeaveTypeBalanceValue.value === null) return null
  return Math.max(0, selectedLeaveTypeBalanceValue.value - pendingSelectedLeaveDays.value)
})

function getLeaveBalanceWarningForTotal(totalDays) {
  if (isMonetization.value || totalDays <= 0) return ''
  const trackedBalance = selectedLeaveTypeBalanceValue.value
  if (trackedBalance === null) return ''

  if (totalDays <= availableSelectedLeaveBalance.value) {
    return ''
  }

  if (isCtoType.value) {
    if (pendingSelectedLeaveDays.value > 0) {
      return `You already have ${formatDayCountValue(pendingSelectedLeaveDays.value)} day(s) of ${selectedLeaveTypeName.value} pending. CTO stays WP-only, so reduce the selected dates or wait for more valid CTO credits.`
    }

    return `Your ${selectedLeaveTypeName.value} balance is insufficient. CTO stays WP-only, so reduce the selected dates or wait for more valid CTO credits.`
  }

  const withoutPayDays = Math.max(totalDays - availableSelectedLeaveBalance.value, 0)
  const withPayDays = Math.max(totalDays - withoutPayDays, 0)

  if (pendingSelectedLeaveDays.value > 0) {
    return `You already have ${formatDayCountValue(pendingSelectedLeaveDays.value)} day(s) of ${selectedLeaveTypeName.value} pending. Automatic split for this request: ${formatDayCountValue(withPayDays)} day(s) WP and ${formatDayCountValue(withoutPayDays)} day(s) WOP.`
  }

  return `Your ${selectedLeaveTypeName.value} balance is insufficient. Automatic split for this request: ${formatDayCountValue(withPayDays)} day(s) WP and ${formatDayCountValue(withoutPayDays)} day(s) WOP.`
}

const leaveBalanceWarning = computed(() => {
  return getLeaveBalanceWarningForTotal(selectedDateCreditTotalDays.value)
})

const selectedLeaveTypeMaxDays = computed(() => {
  const lt = allLeaveTypes.value.find(t => (t.leave_type_id || t.id) === form.value.leaveTypeId)
  return lt ? lt.max_days : null
})

function getMaxDaysWarningForTotal(totalDays) {
  const max = Number(selectedLeaveTypeMaxDays.value)
  if (!Number.isFinite(max) || max <= 0) return ''
  if (totalDays > max) return `Maximum of ${formatDayCountValue(max)} day(s) allowed for this leave type.`
  return ''
}

function getSelectionLimitWarningForTotal(totalDays) {
  return getMaxDaysWarningForTotal(totalDays)
}

const isMco6Leave = computed(() => selectedLeaveTypeName.value === 'Special Privilege Leave')
const isMaternityLeave = computed(() => selectedLeaveTypeName.value === 'Maternity Leave')
const isPaternityLeave = computed(() => selectedLeaveTypeName.value === 'Paternity Leave')
const isCtoType = computed(() => selectedLeaveTypeName.value === 'CTO Leave')
const isMonetization = computed(() => selectedLeaveTypeName.value === 'Monetization Leave')

const showDetailsOfLeave = computed(() => {
  const types = ['Vacation Leave', 'Sick Leave']
  return types.includes(selectedLeaveTypeName.value) || selectedLeaveTypeRequiresDocuments.value
})
const isVacationType = computed(() => selectedLeaveTypeName.value === 'Vacation Leave')
const isSickType = computed(() => selectedLeaveTypeName.value === 'Sick Leave')
const moveDialogActionsUp = computed(() => props.inDialog && !isMonetization.value && showDetailsOfLeave.value)

// Monetization state
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
    const resolvedSalary = parseSalary(data?.salary)
    if (resolvedSalary && !parseSalary(form.value.salary)) {
      form.value.salary = resolvedSalary
    }
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
  form.value.sickSpecifyOther = ''
  form.value.attachmentFile = null
  form.value.womenSpecify = ''
  form.value.studyDetail = ''
  form.value.otherPurpose = ''
  form.value.leaveTypeOther = ''
  selectedDates.value = []
  selectedDateDurations.value = {}
  selectedDateHalfDayPortions.value = {}
  clearCalendarDateWarning()
  monetization.value = { leaveTypeId: null, availableBalance: null, daysToMonetize: null, loadingBalance: false }
}

// Unified multi-date selection (all leave types)
const selectedDates = ref([])
const lastValidSelectedDates = ref([])

const sortedSelectedDates = computed(() =>
  [...selectedDates.value].sort()
)

function normalizeSelectedDates(value) {
  return [...new Set((Array.isArray(value) ? value : []).filter(Boolean))].sort()
}

function getSelectedDateTotalForDates(dates, durations = selectedDateDurations.value) {
  return dates.reduce((total, date) => total + ((durations?.[date] === 'half_day') ? 0.5 : 1), 0)
}

function getSelectedDateCreditTotalForDates(
  dates,
  durations = selectedDateDurations.value,
  payStatuses = selectedDatePayStatuses.value,
) {
  return dates.reduce((total, date) => {
    if ((payStatuses?.[date] || 'with_pay') === 'without_pay') {
      return total
    }

    return total + ((durations?.[date] === 'half_day') ? 0.5 : 1)
  }, 0)
}

function onSelectedDatesChange(value) {
  const currentDates = normalizeSelectedDates(lastValidSelectedDates.value)
  const normalizedDates = normalizeSelectedDates(value)
  const blockedDates = lockedLeaveDates.value
  const allowedDates = normalizedDates.filter((date) => blockedDates.has(date) === false)
  const addedDates = allowedDates.filter((date) => currentDates.includes(date) === false)

  if (allowedDates.length !== normalizedDates.length) {
    const blockedDate = normalizedDates.find((date) => blockedDates.has(date))
    showCalendarDateWarning(blockedDate)
    selectedDates.value = allowedDates
    syncLockedDateDecorations()
    return
  }

  const limitWarning = getSelectionLimitWarningForDates(allowedDates)
  if (limitWarning && addedDates.length > 0) {
    showCalendarDateWarning(addedDates[addedDates.length - 1], { message: limitWarning })
    selectedDates.value = currentDates
    syncLockedDateDecorations()
    return
  }

  clearCalendarDateWarning()
  selectedDates.value = allowedDates
  lastValidSelectedDates.value = allowedDates
  syncLockedDateDecorations()
}

function formatDateDisplay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDialogDateChip(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getLockedDateState(dateStr) {
  return lockedLeaveDateStates.value.get(normalizeIsoDate(dateStr)) || ''
}

function getInformationalDateState(dateStr) {
  return informationalLeaveDateStates.value.get(normalizeIsoDate(dateStr)) || ''
}

function getLockedDateConflict(dateStr) {
  const normalizedDate = normalizeIsoDate(dateStr)
  if (!normalizedDate) return null

  if (isMaternityLeave.value || isPaternityLeave.value) {
    const totalDays = isMaternityLeave.value ? 105 : 7
    const conflictingDate = enumerateInclusiveDates(
      normalizedDate,
      offsetIsoDate(normalizedDate, totalDays - 1),
    ).find((date) => lockedLeaveDates.value.has(date))

    if (!conflictingDate) return null
    return {
      date: conflictingDate,
      state: getLockedDateState(conflictingDate) || 'pending',
    }
  }

  if (!lockedLeaveDates.value.has(normalizedDate)) return null

  return {
    date: normalizedDate,
    state: getLockedDateState(normalizedDate) || 'pending',
  }
}

function getInformationalDateConflict(dateStr) {
  const normalizedDate = normalizeIsoDate(dateStr)
  if (!normalizedDate) return null
  if (!informationalLeaveDateStates.value.has(normalizedDate)) return null

  return {
    date: normalizedDate,
    state: getInformationalDateState(normalizedDate) || 'recalled',
  }
}

function buildLockedDateWarningMessage(dateStr) {
  const conflict = getLockedDateConflict(dateStr)
  if (!conflict) return ''

  const formattedDate = formatDateDisplay(conflict.date)
  if (conflict.state === 'approved') {
    return `${formattedDate} leave application is already approved.`
  }

  return `${formattedDate} leave application is still pending.`
}

function buildInformationalDateMessage(dateStr) {
  const conflict = getInformationalDateConflict(dateStr)
  if (!conflict) return ''

  if (conflict.state === 'recalled') {
    return 'This date was recalled by HR.'
  }

  return ''
}

let calendarWarningTimeoutId = null
let calendarWarningPressedDate = ''
let calendarWarningPressedAt = 0
let calendarWarningPressedMessage = ''
const CALENDAR_WARNING_WIDTH = 220
const CALENDAR_WARNING_TIMEOUT_MS = 7000

function clearCalendarWarningTimeout() {
  if (calendarWarningTimeoutId) {
    window.clearTimeout(calendarWarningTimeoutId)
    calendarWarningTimeoutId = null
  }
}

function releaseCalendarWarningDismiss() {
  window.removeEventListener('pointerdown', handleCalendarWarningDismissPointerDown, true)
}

function clearCalendarDateWarning() {
  clearCalendarWarningTimeout()
  releaseCalendarWarningDismiss()
  if (!calendarDateWarning.value && !calendarDateWarningDate.value && Object.keys(calendarDateWarningStyle.value).length === 0) return
  calendarDateWarning.value = ''
  calendarDateWarningDate.value = ''
  calendarDateWarningStyle.value = {}
  syncLockedDateDecorations()
}

function showCalendarDateWarning(dateStr, options = {}) {
  const { sticky = false, message = '' } = options
  const resolvedMessage = message || buildLockedDateWarningMessage(dateStr)
  const normalizedDate = normalizeIsoDate(dateStr)
  if (!normalizedDate) {
    clearCalendarDateWarning()
    return
  }

  if (!resolvedMessage) {
    clearCalendarDateWarning()
    return
  }

  clearCalendarWarningTimeout()
  releaseCalendarWarningDismiss()
  calendarDateWarning.value = resolvedMessage
  calendarDateWarningDate.value = normalizedDate
  syncLockedDateDecorations()
  window.addEventListener('pointerdown', handleCalendarWarningDismissPointerDown, true)

  if (!sticky) {
    calendarWarningTimeoutId = window.setTimeout(() => {
      clearCalendarDateWarning()
    }, CALENDAR_WARNING_TIMEOUT_MS)
  }
}

function resolveCalendarDateFromEvent(event) {
  const dayCell = event.target?.closest?.('.q-date__calendar-item')
  if (!dayCell || dayCell.classList.contains('q-date__calendar-item--fill')) return ''

  const day = Number.parseInt(String(dayCell.textContent || '').trim(), 10)
  if (!Number.isInteger(day) || day < 1 || day > 31) return ''

  return `${calendarView.value.year}-${String(calendarView.value.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function releaseCalendarWarningPointer() {
  window.removeEventListener('pointerup', handleCalendarGlobalPointerUp, true)
  window.removeEventListener('pointercancel', handleCalendarGlobalPointerUp, true)
}

function handleCalendarGlobalPointerUp() {
  if (!calendarWarningPressedDate) return

  const pressedDate = calendarWarningPressedDate
  const pressedDuration = Date.now() - calendarWarningPressedAt
  const pressedMessage = calendarWarningPressedMessage

  calendarWarningPressedDate = ''
  calendarWarningPressedAt = 0
  calendarWarningPressedMessage = ''
  releaseCalendarWarningPointer()

  if (pressedDuration >= 250) {
    clearCalendarDateWarning()
    return
  }

  showCalendarDateWarning(pressedDate, { message: pressedMessage })
}

function handleCalendarWarningDismissPointerDown() {
  clearCalendarDateWarning()
}

function isLockedDateSelection(dateStr) {
  return Boolean(getLockedDateConflict(dateStr) || getInformationalDateConflict(dateStr))
}

function getSelectionLimitWarningForDates(dates) {
  const normalizedDates = normalizeSelectedDates(dates)
  const actualDays = getSelectedDateTotalForDates(normalizedDates)
  return getSelectionLimitWarningForTotal(actualDays)
}

function getSelectionLimitWarningForDate(dateStr) {
  const normalizedDate = normalizeIsoDate(dateStr)
  if (!normalizedDate) return ''

  const currentDates = normalizeSelectedDates(selectedDates.value)
  if (currentDates.includes(normalizedDate)) return ''

  if (!leaveDateOptions.value(toSlash(normalizedDate))) return ''

  if (isMaternityLeave.value || isPaternityLeave.value) {
    const totalDays = isMaternityLeave.value ? 105 : 7
    const proposedDates = Array.from({ length: totalDays }, (_, index) =>
      offsetIsoDate(normalizedDate, index),
    )
    return getSelectionLimitWarningForDates(proposedDates)
  }

  return getSelectionLimitWarningForDates([...currentDates, normalizedDate])
}

function getCalendarSelectionWarning(dateStr) {
  return (
    buildLockedDateWarningMessage(dateStr) ||
    buildInformationalDateMessage(dateStr) ||
    getSelectionLimitWarningForDate(dateStr)
  )
}

function getCalendarInformationalMessage(dateStr) {
  return buildInformationalDateMessage(dateStr)
}

function onCalendarNavigation({ year, month }) {
  calendarView.value = { year, month }
  clearCalendarDateWarning()
  syncLockedDateDecorations()
}

function handleCalendarSurfacePointerDown(event) {
  const clickedDate = resolveCalendarDateFromEvent(event)
  const warningMessage = clickedDate ? getCalendarSelectionWarning(clickedDate) : ''

  if (!clickedDate || !warningMessage) {
    calendarWarningPressedDate = ''
    calendarWarningPressedAt = 0
    calendarWarningPressedMessage = ''
    releaseCalendarWarningPointer()
    clearCalendarDateWarning()
    return
  }

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation?.()
  calendarWarningPressedDate = clickedDate
  calendarWarningPressedAt = Date.now()
  calendarWarningPressedMessage = warningMessage
  showCalendarDateWarning(clickedDate, { sticky: true, message: warningMessage })
  releaseCalendarWarningPointer()
  window.addEventListener('pointerup', handleCalendarGlobalPointerUp, true)
  window.addEventListener('pointercancel', handleCalendarGlobalPointerUp, true)
}

function handleCalendarSurfaceClick(event) {
  const clickedDate = resolveCalendarDateFromEvent(event)
  const warningMessage = clickedDate ? getCalendarSelectionWarning(clickedDate) : ''
  if (warningMessage) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation?.()
    return
  }

  const informationalMessage = clickedDate ? getCalendarInformationalMessage(clickedDate) : ''
  if (!informationalMessage) return

  showCalendarDateWarning(clickedDate, { message: informationalMessage })
}

function syncLockedDateDecorations() {
  nextTick(() => {
    const calendarRoot = leaveDateCalendarRef.value
    if (!calendarRoot) return

    const calendarRect = calendarRoot.getBoundingClientRect()
    const calendarWidth = calendarRoot.clientWidth || calendarRect.width || 0
    let nextWarningStyle = {}

    const dayCells = calendarRoot.querySelectorAll('.q-date__calendar-item')
    dayCells.forEach((cell) => {
      cell.classList.remove('leave-date-calendar__day--locked')
      cell.classList.remove('leave-date-calendar__day--locked-pending')
      cell.classList.remove('leave-date-calendar__day--locked-approved')
      cell.classList.remove('leave-date-calendar__day--info')
      cell.classList.remove('leave-date-calendar__day--info-recalled')
      cell.classList.remove('leave-date-calendar__day--warning')

      if (cell.classList.contains('q-date__calendar-item--fill')) return

      const day = Number.parseInt(String(cell.textContent || '').trim(), 10)
      if (!Number.isInteger(day) || day < 1 || day > 31) return

      const date = `${calendarView.value.year}-${String(calendarView.value.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const lockedState = getLockedDateState(date)
      if (lockedState) {
        cell.classList.add('leave-date-calendar__day--locked')
        cell.classList.add(`leave-date-calendar__day--locked-${lockedState}`)
      }

      const informationalState = getInformationalDateState(date)
      if (informationalState) {
        cell.classList.add('leave-date-calendar__day--info')
        cell.classList.add(`leave-date-calendar__day--info-${informationalState}`)
      }

      if (calendarDateWarningDate.value === date && calendarDateWarning.value) {
        cell.classList.add('leave-date-calendar__day--warning')

        const cellRect = cell.getBoundingClientRect()
        const popupWidth = Math.max(160, Math.min(CALENDAR_WARNING_WIDTH, Math.max(calendarWidth - 16, 160)))
        const cellCenter = (cellRect.left - calendarRect.left) + (cellRect.width / 2)
        const popupLeft = Math.max(8, Math.min(cellCenter - (popupWidth * 0.58), calendarWidth - popupWidth - 8))
        const popupTop = Math.max(6, (cellRect.top - calendarRect.top) - 56)
        const arrowLeft = Math.max(16, Math.min(cellCenter - popupLeft - 6, popupWidth - 18))

        nextWarningStyle = {
          width: `${popupWidth}px`,
          left: `${popupLeft}px`,
          top: `${popupTop}px`,
          '--leave-date-warning-arrow-left': `${arrowLeft}px`,
        }
      }
    })

    calendarDateWarningStyle.value = nextWarningStyle
  })
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

function syncSelectedDatePayStatuses(dates) {
  const activeDates = new Set(dates)

  Object.keys(selectedDatePayStatuses.value).forEach((date) => {
    if (!activeDates.has(date)) {
      delete selectedDatePayStatuses.value[date]
    }
  })

  dates.forEach((date) => {
    if (!selectedDatePayStatuses.value[date]) {
      selectedDatePayStatuses.value[date] = 'with_pay'
    }
  })
}

function syncSelectedDateHalfDayPortions(dates) {
  const activeDates = new Set(dates)

  Object.keys(selectedDateHalfDayPortions.value).forEach((date) => {
    if (!activeDates.has(date) || selectedDateDurations.value[date] !== 'half_day') {
      delete selectedDateHalfDayPortions.value[date]
    }
  })

  dates.forEach((date) => {
    if (selectedDateDurations.value[date] === 'half_day' && !selectedDateHalfDayPortions.value[date]) {
      selectedDateHalfDayPortions.value[date] = 'AM'
    }
  })
}

function parseIsoDateValue(value) {
  const raw = String(value || '').trim()
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

function countWorkingDaysFromNextDay(lastAbsentDate, filedDate) {
  if (!(lastAbsentDate instanceof Date) || Number.isNaN(lastAbsentDate.getTime())) return 0
  if (!(filedDate instanceof Date) || Number.isNaN(filedDate.getTime())) return 0
  if (filedDate <= lastAbsentDate) return 0

  let count = 0
  const cursor = new Date(lastAbsentDate.getFullYear(), lastAbsentDate.getMonth(), lastAbsentDate.getDate())
  cursor.setDate(cursor.getDate() + 1)

  while (cursor <= filedDate) {
    const dayOfWeek = cursor.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count += 1
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return count
}

function countWorkingDaysBeforeDate(filedDate, targetDate) {
  if (!(filedDate instanceof Date) || Number.isNaN(filedDate.getTime())) return 0
  if (!(targetDate instanceof Date) || Number.isNaN(targetDate.getTime())) return 0
  if (targetDate <= filedDate) return 0

  let count = 0
  const cursor = new Date(filedDate.getFullYear(), filedDate.getMonth(), filedDate.getDate())
  cursor.setDate(cursor.getDate() + 1)

  while (cursor < targetDate) {
    const dayOfWeek = cursor.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count += 1
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return count
}

function getNextWorkingDate(dateValue) {
  const cursor = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate())
  do {
    cursor.setDate(cursor.getDate() + 1)
  } while (cursor.getDay() === 0 || cursor.getDay() === 6)

  return cursor
}

function calculateMaxConsecutiveWorkingDateSpan(dateKeys) {
  const parsedDates = (Array.isArray(dateKeys) ? dateKeys : [])
    .map((dateKey) => parseIsoDateValue(dateKey))
    .filter((dateValue) => dateValue instanceof Date && !Number.isNaN(dateValue.getTime()))
    .sort((left, right) => left.getTime() - right.getTime())

  if (!parsedDates.length) return 0

  let maxStreak = 1
  let currentStreak = 1

  for (let index = 1; index < parsedDates.length; index += 1) {
    const expectedNextDate = getNextWorkingDate(parsedDates[index - 1])
    if (parsedDates[index].getTime() === expectedNextDate.getTime()) {
      currentStreak += 1
    } else {
      currentStreak = 1
    }

    if (currentStreak > maxStreak) {
      maxStreak = currentStreak
    }
  }

  return maxStreak
}

function resolveSickLeaveDisplayPayMode() {
  const sortedDates = [...sortedSelectedDates.value]
  if (!sortedDates.length) return 'with_pay'

  const firstAbsentDate = parseIsoDateValue(sortedDates[0])
  const lastAbsentDate = parseIsoDateValue(sortedDates[sortedDates.length - 1])
  if (!(firstAbsentDate instanceof Date) || !(lastAbsentDate instanceof Date)) {
    return 'with_pay'
  }

  const nowDate = new Date()
  const filedDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate())
  if (filedDate < firstAbsentDate) {
    return 'with_pay'
  }

  const workingDaysElapsed = countWorkingDaysFromNextDay(lastAbsentDate, filedDate)
  return workingDaysElapsed <= 5 ? 'with_pay' : 'without_pay'
}

function applySickLeaveDisplayPayStatusPolicy() {
  if (isMonetization.value || !isSickType.value) return

  const resolvedPayMode = resolveSickLeaveDisplayPayMode()
  if (resolvedPayMode !== 'without_pay') {
    return
  }

  const sortedDates = [...sortedSelectedDates.value]
  sortedDates.forEach((date) => {
    selectedDatePayStatuses.value[date] = 'without_pay'
  })
}

function applyCtoDisplayPayStatusPolicy() {
  if (isMonetization.value || !isCtoType.value) return

  const sortedDates = [...sortedSelectedDates.value]
  sortedDates.forEach((date) => {
    selectedDatePayStatuses.value[date] = 'with_pay'
  })
}

const selectedDateTotalDays = computed(() =>
  sortedSelectedDates.value.reduce(
    (total, date) => total + (selectedDateDurations.value[date] === 'half_day' ? 0.5 : 1),
    0,
  ),
)

const selectedDateCreditTotalDays = computed(() =>
  getSelectedDateCreditTotalForDates(sortedSelectedDates.value)
)
const requiresSickAttachment = computed(() =>
  isSickType.value && selectedDateTotalDays.value >= 5
)
const requiresLeaveDocumentUpload = computed(() =>
  !isMonetization.value
  && (isSickType.value ? requiresSickAttachment.value : selectedLeaveTypeRequiresDocuments.value),
)
const showDocumentUploadField = computed(() =>
  !isMonetization.value && (isSickType.value || selectedLeaveTypeRequiresDocuments.value),
)
const documentUploadLabel = computed(() =>
  requiresLeaveDocumentUpload.value
    ? 'Required attachment *'
    : 'Attachment (Optional)',
)
const documentUploadHint = computed(() => {
  if (isSickType.value) {
    return requiresSickAttachment.value
      ? 'Required for Sick Leave applications of 5 days or more.'
      : ''
  }
  if (selectedLeaveTypeRequiresDocuments.value) {
    return 'Required for the selected leave type.'
  }
  return ''
})

function formatSelectedDayCount(value) {
  return Number.isInteger(value) ? value : value.toFixed(1)
}

function buildSelectedDateDurationsPayload(dates) {
  return dates.reduce((acc, date) => {
    acc[date] = selectedDateDurations.value[date] || 'whole_day'
    return acc
  }, {})
}

function buildSelectedDateCoveragePayload(dates) {
  return dates.reduce((acc, date) => {
    acc[date] = selectedDateDurations.value[date] === 'half_day' ? 'half' : 'whole'
    return acc
  }, {})
}

function buildSelectedDateHalfDayPortionPayload(dates) {
  const portions = dates.reduce((acc, date) => {
    if (selectedDateDurations.value[date] !== 'half_day') return acc
    acc[date] = selectedDateHalfDayPortions.value[date] === 'PM' ? 'PM' : 'AM'
    return acc
  }, {})

  return Object.keys(portions).length > 0 ? portions : null
}

function buildSelectedDatePayStatusesPayload(dates) {
  return dates.reduce((acc, date) => {
    acc[date] = selectedDatePayStatuses.value[date] || 'with_pay'
    return acc
  }, {})
}

function buildSelectedDatePayStatusCodesPayload(dates) {
  return dates.reduce((acc, date) => {
    acc[date] = selectedDatePayStatuses.value[date] === 'without_pay' ? 'WOP' : 'WP'
    return acc
  }, {})
}

function resolveSelectedDatePayMode(dates) {
  if (!Array.isArray(dates) || dates.length === 0) {
    return 'WP'
  }

  const hasWithPayDates = dates.some(
    (date) => (selectedDatePayStatuses.value[date] || 'with_pay') !== 'without_pay',
  )

  return hasWithPayDates ? 'WP' : 'WOP'
}

function getSelectedDatePayStatusBreakdown(dates) {
  const withPayDates = dates.filter(
    (date) => (selectedDatePayStatuses.value[date] || 'with_pay') !== 'without_pay',
  )
  const withoutPayDates = dates.filter(
    (date) => (selectedDatePayStatuses.value[date] || 'with_pay') === 'without_pay',
  )

  return {
    withPayDates,
    withoutPayDates,
    withPayTotalDays: getSelectedDateTotalForDates(withPayDates),
    withoutPayTotalDays: getSelectedDateTotalForDates(withoutPayDates),
  }
}

function selectedDateDurationLabel(date) {
  return selectedDateDurations.value[date] === 'half_day' ? 'Half Day' : 'Whole Day'
}

function toggleSelectedDateDuration(date) {
  const isHalfDay = selectedDateDurations.value[date] === 'half_day'
  selectedDateDurations.value[date] = isHalfDay ? 'whole_day' : 'half_day'

  if (isHalfDay) {
    delete selectedDateHalfDayPortions.value[date]
  } else if (!selectedDateHalfDayPortions.value[date]) {
    selectedDateHalfDayPortions.value[date] = 'AM'
  }

  applyCtoDisplayPayStatusPolicy()
  applySickLeaveDisplayPayStatusPolicy()
}

function selectedDateHalfDayPortionLabel(date) {
  return selectedDateHalfDayPortions.value[date] === 'PM' ? 'PM' : 'AM'
}

function toggleSelectedDateHalfDayPortion(date) {
  if (selectedDateDurations.value[date] !== 'half_day') {
    delete selectedDateHalfDayPortions.value[date]
    return
  }

  selectedDateHalfDayPortions.value[date] =
    selectedDateHalfDayPortions.value[date] === 'PM' ? 'AM' : 'PM'
}

function selectedDatePayStatusLabel(date) {
  return selectedDatePayStatuses.value[date] === 'without_pay' ? 'WOP' : 'WP'
}

function toggleSelectedDatePayStatus(date) {
  if (isCtoType.value) {
    applyCtoDisplayPayStatusPolicy()
    $q.notify({ type: 'info', message: 'CTO applications stay WP-only. Use half day or whole day blocks instead.' })
    return
  }

  if (
    isSickType.value &&
    !isMonetization.value &&
    resolveSickLeaveDisplayPayMode() === 'without_pay'
  ) {
    applySickLeaveDisplayPayStatusPolicy()
    return
  }

  selectedDatePayStatuses.value[date] =
    selectedDatePayStatuses.value[date] === 'without_pay' ? 'with_pay' : 'without_pay'
}

const leaveDateOptions = computed(() => {
  // Access dependencies to trigger re-computation
  const selected = selectedDates.value
  const blockedDates = unavailableLeaveDates.value

  return (date) => {
    const dashDate = normalizeIsoDate(date)

    // Maternity/Paternity Leave allows weekends/holidays (continuous)
    if (isMaternityLeave.value || isPaternityLeave.value) {
      return isLockedDateSelection(dashDate) === false
    }

    if (!isWeekday(date)) return false
    if (blockedDates.has(dashDate) && selected.includes(dashDate) === false) return false

    return true
  }
})

const maternityStartDate = ref(null)

// Auto-calculate days for Maternity (105) or Paternity (7)
watch(maternityStartDate, (newDate) => {
  if (newDate) {
    if (isLockedDateSelection(newDate)) {
      showCalendarDateWarning(newDate)
      maternityStartDate.value = null
      selectedDates.value = []
      return
    }

    clearCalendarDateWarning()
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
      const normalizedDates = normalizeSelectedDates(dates)
      const limitWarning = getSelectionLimitWarningForDates(normalizedDates)
      if (limitWarning) {
        showCalendarDateWarning(newDate, { message: limitWarning })
        maternityStartDate.value = null
        selectedDates.value = []
        return
      }
      selectedDates.value = normalizedDates
    }
  }
})

// Reset start date if leave type changes
watch([isMaternityLeave, isPaternityLeave], ([mat, pat]) => {
  if (!mat && !pat) maternityStartDate.value = null
})

watch(unavailableLeaveDates, (dates) => {
  const invalidSelectedDate = selectedDates.value.find((date) => dates.has(date))
  if (invalidSelectedDate) {
    selectedDates.value = selectedDates.value.filter((date) => dates.has(date) === false)
  }

  if (maternityStartDate.value && isLockedDateSelection(maternityStartDate.value)) {
    maternityStartDate.value = null
    selectedDates.value = []
  }

  if (calendarDateWarningDate.value && dates.has(calendarDateWarningDate.value) === false) {
    clearCalendarDateWarning()
  }
  syncLockedDateDecorations()
}, { immediate: true })

watch([calendarDateWarningDate, calendarDateWarning], () => {
  syncLockedDateDecorations()
})

onBeforeUnmount(() => {
  clearCalendarDateWarning()
  releaseCalendarWarningPointer()
  releaseCalendarWarningDismiss()
  if (applicationsRefreshIntervalId) {
    window.clearInterval(applicationsRefreshIntervalId)
    applicationsRefreshIntervalId = null
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('focus', handleLatestApplicationsFocusRefresh)
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleLatestApplicationsVisibilityRefresh)
  }
})

function removeSelectedDate(idx) {
  const sorted = [...selectedDates.value].sort()
  const dateToRemove = sorted[idx]
  selectedDates.value = selectedDates.value.filter(d => d !== dateToRemove)
}

const maxDaysWarning = computed(() => {
  return getMaxDaysWarningForTotal(selectedDateTotalDays.value)
})

watch(selectedDates, (dates) => {
  const normalized = normalizeSelectedDates(dates)
  if (JSON.stringify(normalized) !== JSON.stringify(dates)) {
    selectedDates.value = normalized
    return
  }

  syncSelectedDateDurations(dates)
  syncSelectedDatePayStatuses(dates)
  syncSelectedDateHalfDayPortions(dates)
  applyCtoDisplayPayStatusPolicy()
  applySickLeaveDisplayPayStatusPolicy()

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
  if (!getSelectionLimitWarningForDates(normalized)) {
    lastValidSelectedDates.value = normalized
  }
  syncLockedDateDecorations()
}, { deep: true })

watch(
  [sortedSelectedDates, selectedDateTotalDays, isSickType, isCtoType, isMonetization],
  () => {
    applyCtoDisplayPayStatusPolicy()
    applySickLeaveDisplayPayStatusPolicy()
  },
  { immediate: true },
)

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

function extractSubmittedApplicationFromResponse(payload) {
  if (!payload || typeof payload !== 'object') return null

  const candidates = [
    payload.application,
    payload.leave_application,
    payload.leaveApplication,
    payload.data,
  ]

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      return candidate
    }
  }

  return null
}

function buildSubmittedApplicationOverride(backendApplication, isMonetizationSubmission = false) {
  const leaveDetailsPayload = {
    vacation_detail: form.value.vacationDetail,
    vacation_specify: form.value.vacationSpecify,
    sick_detail: form.value.sickDetail,
    sick_specify: resolvedSickIllness.value,
    women_specify: form.value.womenSpecify,
    study_detail: form.value.studyDetail,
    other_purpose: form.value.otherPurpose,
    leave_type_other: form.value.leaveTypeOther,
  }

  const employeeName = [
    String(form.value.firstName || '').trim(),
    String(form.value.lastName || '').trim(),
  ].filter(Boolean).join(' ').trim()
  const selectedDateHalfDayPortionPayload = buildSelectedDateHalfDayPortionPayload(
    sortedSelectedDates.value,
  )

  return {
    ...(backendApplication && typeof backendApplication === 'object' ? backendApplication : {}),
    application_type: 'LEAVE',
    leaveType:
      backendApplication?.leaveType ??
      backendApplication?.leave_type_name ??
      selectedLeaveTypeName.value,
    leave_type_name:
      backendApplication?.leave_type_name ??
      backendApplication?.leaveType ??
      selectedLeaveTypeName.value,
    employeeName:
      backendApplication?.employeeName ??
      backendApplication?.employee_name ??
      employeeName,
    employee_control_no:
      backendApplication?.employee_control_no ??
      authStore.user?.control_no ??
      authStore.user?.employee_control_no ??
      null,
    startDate: backendApplication?.startDate ?? backendApplication?.start_date ?? form.value.startDate,
    endDate: backendApplication?.endDate ?? backendApplication?.end_date ?? form.value.endDate,
    days: backendApplication?.days ?? backendApplication?.total_days ?? selectedDateTotalDays.value,
    total_days: backendApplication?.total_days ?? selectedDateTotalDays.value,
    selected_dates: backendApplication?.selected_dates ?? [...selectedDates.value],
    selected_date_half_day_portion:
      backendApplication?.selected_date_half_day_portion ??
      backendApplication?.selectedDateHalfDayPortion ??
      selectedDateHalfDayPortionPayload,
    selectedDateHalfDayPortion:
      backendApplication?.selectedDateHalfDayPortion ??
      backendApplication?.selected_date_half_day_portion ??
      selectedDateHalfDayPortionPayload,
    reason: backendApplication?.reason ?? (String(form.value.reason || '').trim() || null),
    commutation: backendApplication?.commutation ?? form.value.commutation,
    is_monetization:
      backendApplication?.is_monetization ??
      isMonetizationSubmission,
    dateFiled:
      backendApplication?.dateFiled ??
      backendApplication?.date_filed ??
      backendApplication?.filed_at ??
      new Date().toISOString(),
    details: {
      ...(backendApplication?.details && typeof backendApplication.details === 'object'
        ? backendApplication.details
        : {}),
      ...leaveDetailsPayload,
    },
    ...leaveDetailsPayload,
  }
}

function handleSubmitSuccess(isMonetizationSubmission = false, submittedApplication = null) {
  const message = isMonetizationSubmission
    ? 'Monetization request submitted successfully and is now pending HR review.'
    : 'Leave application submitted successfully and is now pending HR review.'

  $q.notify({ type: 'positive', message })

  if (props.inDialog) {
    emit('submitted', submittedApplication)
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
      const response = await api.post('/admin/leave-applications/self', {
        is_monetization: true,
        leave_type_id: monetization.value.leaveTypeId,
        total_days: monetization.value.daysToMonetize,
        reason: String(form.value.reason || '').trim() || null,
        salary: parseSalary(form.value.salary) || null,
      })
      const submittedApplication = buildSubmittedApplicationOverride(
        extractSubmittedApplicationFromResponse(response?.data),
        true,
      )
      saveLocalLeaveApplicationDetails(submittedApplication)
      handleSubmitSuccess(true, submittedApplication)
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

  if (leaveBalanceWarning.value) {
    $q.notify({ type: 'warning', message: leaveBalanceWarning.value, position: 'top' })
  }

  loading.value = true
  try {
    if (selectedDates.value.length === 0) {
      $q.notify({ type: 'negative', message: 'Please select at least 1 date.' })
      loading.value = false
      return
    }

    const sortedSelectedDatesPayload = [...selectedDates.value].sort()
    const payStatusBreakdown = getSelectedDatePayStatusBreakdown(sortedSelectedDatesPayload)
    const selectedAttachmentFile = resolveSingleFile(form.value.attachmentFile)
    const selectedIllness = String(form.value.sickSpecify || '').trim()

    if (isCtoType.value) {
      if (payStatusBreakdown.withoutPayDates.length > 0) {
        $q.notify({ type: 'negative', message: 'CTO applications must stay WP-only.' })
        loading.value = false
        return
      }

      const firstAvailmentDate = parseIsoDateValue(sortedSelectedDatesPayload[0])
      const nowDate = new Date()
      const filedDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate())
      const workingDaysBeforeAvailment = countWorkingDaysBeforeDate(filedDate, firstAvailmentDate)
      if (workingDaysBeforeAvailment < 5) {
        $q.notify({
          type: 'negative',
          message: 'CTO applications must be submitted at least 5 working days before the first availment date.',
        })
        loading.value = false
        return
      }

      const maxConsecutiveWorkingDays = calculateMaxConsecutiveWorkingDateSpan(sortedSelectedDatesPayload)
      if (maxConsecutiveWorkingDays > 5) {
        $q.notify({
          type: 'negative',
          message: 'CTO may only be availed for up to 5 consecutive working days per application.',
        })
        loading.value = false
        return
      }
    }

    if (isSickType.value) {
      if (!String(form.value.sickDetail || '').trim()) {
        $q.notify({ type: 'negative', message: 'Please select In Hospital or Out Patient for Sick Leave.' })
        loading.value = false
        return
      }

      if (!selectedIllness) {
        $q.notify({ type: 'negative', message: 'Please select the illness for Sick Leave.' })
        loading.value = false
        return
      }

      if (selectedIllness === 'Other' && !String(form.value.sickSpecifyOther || '').trim()) {
        $q.notify({ type: 'negative', message: 'Please specify the illness when selecting Other.' })
        loading.value = false
        return
      }
    }

    if (requiresLeaveDocumentUpload.value && !selectedAttachmentFile) {
      $q.notify({
        type: 'negative',
        message: isSickType.value
          ? 'Please upload a supporting document for Sick Leave of 5 days or more.'
          : 'Please upload the required attachment for the selected leave type.',
      })
      loading.value = false
      return
    }

    if (selectedAttachmentFile) {
      if (!isAllowedAttachmentImage(selectedAttachmentFile)) {
        $q.notify({ type: 'negative', message: 'Attachment must be an image, PDF, DOC, or DOCX file.' })
        loading.value = false
        return
      }

      if (Number(selectedAttachmentFile.size || 0) > attachmentMaxSizeBytes) {
        $q.notify({ type: 'negative', message: 'Attachment must not exceed 10 MB.' })
        loading.value = false
        return
      }
    }

    const leaveDetailsPayload = {
      vacation_detail: form.value.vacationDetail,
      vacation_specify: form.value.vacationSpecify,
      sick_detail: form.value.sickDetail,
      sick_specify: resolvedSickIllness.value,
      women_specify: form.value.womenSpecify,
      study_detail: form.value.studyDetail,
      other_purpose: form.value.otherPurpose,
      leave_type_other: form.value.leaveTypeOther,
    }

    const payload = {
      leave_type_id: form.value.leaveTypeId,
      start_date: form.value.startDate,
      end_date: form.value.endDate,
      total_days: selectedDateTotalDays.value,
      actual_total_days: form.value.days,
      applied_total_days: form.value.days,
      requested_total_days: form.value.days,
      credit_deducting_days: payStatusBreakdown.withPayTotalDays,
      deductible_days: payStatusBreakdown.withPayTotalDays,
      with_pay_days: payStatusBreakdown.withPayTotalDays,
      without_pay_days: payStatusBreakdown.withoutPayTotalDays,
      reason: String(form.value.reason || '').trim() || null,
      selected_dates: sortedSelectedDatesPayload,
      with_pay_dates: payStatusBreakdown.withPayDates,
      without_pay_dates: payStatusBreakdown.withoutPayDates,
      selected_date_durations: buildSelectedDateDurationsPayload(sortedSelectedDatesPayload),
      selected_date_coverage: buildSelectedDateCoveragePayload(sortedSelectedDatesPayload),
      selected_date_half_day_portion: buildSelectedDateHalfDayPortionPayload(sortedSelectedDatesPayload),
      selectedDateHalfDayPortion: buildSelectedDateHalfDayPortionPayload(sortedSelectedDatesPayload),
      selected_date_pay_statuses: buildSelectedDatePayStatusesPayload(sortedSelectedDatesPayload),
      selected_date_pay_status_codes: buildSelectedDatePayStatusCodesPayload(sortedSelectedDatesPayload),
      selected_date_pay_status: buildSelectedDatePayStatusCodesPayload(sortedSelectedDatesPayload),
      pay_mode: isCtoType.value ? 'WP' : resolveSelectedDatePayMode(sortedSelectedDatesPayload),
      commutation: form.value.commutation,
      attachment_submitted: Boolean(selectedAttachmentFile),
      vacation_detail: leaveDetailsPayload.vacation_detail,
      vacation_specify: leaveDetailsPayload.vacation_specify,
      sick_detail: leaveDetailsPayload.sick_detail,
      sick_specify: leaveDetailsPayload.sick_specify,
      women_specify: leaveDetailsPayload.women_specify,
      study_detail: leaveDetailsPayload.study_detail,
      other_purpose: leaveDetailsPayload.other_purpose,
      leave_type_other: leaveDetailsPayload.leave_type_other,
      details: leaveDetailsPayload,
    }
    if (selectedAttachmentFile) {
      payload.attachment = selectedAttachmentFile
    }

    const isMultipartPayload = Boolean(payload.attachment)
    const requestPayload = isMultipartPayload ? buildMultipartPayload(payload) : payload
    const requestConfig = isMultipartPayload
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : undefined

    const response = await api.post('/admin/leave-applications/self', requestPayload, requestConfig)
    const submittedApplication = buildSubmittedApplicationOverride(
      extractSubmittedApplicationFromResponse(response?.data),
      false,
    )
    saveLocalLeaveApplicationDetails(submittedApplication)
    handleSubmitSuccess(false, submittedApplication)
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to submit your leave application right now.')
    $q.notify({ type: 'negative', message: msg })
  } finally {
    loading.value = false
  }
}

watch(
  () => form.value.sickSpecify,
  (value) => {
    if (value !== 'Other') {
      form.value.sickSpecifyOther = ''
    }
  },
)
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
.apply-form-shell--dialog {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.dialog-form-card {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.dialog-form-card .section-block {
  padding: 14px;
}
.dialog-summary-panel {
  margin-bottom: 14px;
}
.dialog-form-card :deep(.q-field--dense .q-field__control) {
  min-height: 34px;
}
.dialog-summary-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: 24px;
  row-gap: 2px;
  align-items: start;
}
.dialog-summary-main {
  display: contents;
}
.dialog-summary-line {
  font-size: 1rem;
  line-height: 1.12;
  color: #2d3436;
  text-transform: uppercase;
  min-height: 1.15rem;
  display: flex;
  align-items: center;
}
.dialog-summary-line--name {
  grid-column: 1;
  grid-row: 1;
  font-size: 1rem;
  font-weight: 700;
  color: #2d3436;
}
.dialog-summary-line--position {
  grid-column: 1;
  grid-row: 2;
  color: #2d3436;
  font-weight: 600;
}
.dialog-summary-line--department {
  grid-column: 1;
  grid-row: 3;
  font-size: 0.86rem;
  color: #8b98a1;
  font-weight: 500;
}
.dialog-summary-meta {
  display: contents;
}
.dialog-summary-meta-item {
  grid-column: 2;
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 5px;
  min-height: 1rem;
  justify-self: end;
  min-width: 0;
}
.dialog-summary-meta-item--filed {
  grid-row: 1;
}
.dialog-summary-meta-item--salary {
  grid-row: 2;
}
.dialog-summary-meta-item--leave-balance {
  grid-row: 3;
  align-items: center;
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
.dialog-summary-badges {
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-end;
  align-items: center;
  gap: 3px;
  min-height: 1rem;
  max-width: 100%;
}
.dialog-summary-badges--loading {
  min-height: 20px;
}
.dialog-summary-badge {
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid #d8dee6;
  background: #f5f7fa;
  color: #72808c;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
}
.dialog-summary-skeleton {
  display: block;
  width: 100%;
  max-width: 100%;
  border-radius: 999px;
}
.dialog-summary-skeleton--name {
  width: min(320px, 72%);
  height: 28px;
}
.dialog-summary-skeleton--position {
  width: min(240px, 52%);
  height: 18px;
}
.dialog-summary-skeleton--department {
  width: min(300px, 64%);
  height: 18px;
}
.dialog-summary-badge-skeleton {
  flex: 0 0 auto;
  width: 58px;
  height: 22px;
  border-radius: 999px;
}
@media (max-width: 768px) {
  .dialog-summary-header {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .dialog-summary-main {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .dialog-summary-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    text-align: left;
  }
  .dialog-summary-meta-item {
    grid-column: auto;
    grid-row: auto;
    justify-self: auto;
    justify-content: flex-start;
  }
  .dialog-summary-badges {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
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
.dialog-apply-stepper {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.dialog-apply-stepper :deep(.q-stepper__content) {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.dialog-apply-stepper :deep(.q-stepper__step) {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.dialog-apply-stepper :deep(.q-stepper__step-inner) {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 8px 12px 12px;
}
.dialog-step-form {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.dialog-step-content-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
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
.selected-dates-warning-slot {
  min-height: 24px;
  margin-bottom: 4px;
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
.selected-date-duration-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: nowrap;
}
.selected-date-duration-actions--list {
  gap: 6px;
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
.selected-date-duration-toggle--pay-status {
  min-width: 52px;
}
.selected-date-duration-toggle--half-day-portion {
  min-width: 52px;
  color: #ef6c00;
}
.selected-date-duration-toggle--half-day-portion-pm {
  color: #1d4ed8;
}
.selected-date-duration-toggle--half-day-placeholder {
  min-width: 52px;
  visibility: hidden;
  pointer-events: none;
}
.selected-date-duration-toggle--without-pay {
  color: #42a5f5;
}
.selected-date-duration-toggle:hover {
  background: rgba(46, 125, 50, 0.12);
}
.selected-date-duration-toggle--half:hover {
  background: rgba(66, 165, 245, 0.16);
}
.selected-date-duration-toggle--half-day-portion:hover {
  background: rgba(239, 108, 0, 0.14);
}
.selected-date-duration-toggle--half-day-portion-pm:hover {
  background: rgba(29, 78, 216, 0.16);
}
.selected-date-duration-toggle--without-pay:hover {
  background: rgba(66, 165, 245, 0.16);
}
.leave-date-calendar {
  position: relative;
}
.leave-date-warning-popover {
  position: absolute;
  z-index: 4;
  display: inline-flex;
  align-items: flex-start;
  gap: 6px;
  padding: 7px 10px;
  border: 1px solid rgba(245, 158, 11, 0.42);
  border-radius: 10px;
  background: #fff8db;
  color: #9a6700;
  font-size: 0.74rem;
  font-weight: 600;
  line-height: 1.35;
  text-align: left;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.12);
  pointer-events: none;
  background: var(--leave-date-warning-bg, #fff1c9);
  border-color: var(--leave-date-warning-border, rgba(225, 192, 106, 0.8));
  color: var(--leave-date-warning-text, #9a6700);
}
.leave-date-warning-popover::after {
  content: '';
  position: absolute;
  left: var(--leave-date-warning-arrow-left, 24px);
  bottom: -6px;
  width: 10px;
  height: 10px;
  border-right: 1px solid var(--leave-date-warning-border, rgba(225, 192, 106, 0.8));
  border-bottom: 1px solid var(--leave-date-warning-border, rgba(225, 192, 106, 0.8));
  background: var(--leave-date-warning-bg, #fff1c9);
  transform: rotate(45deg);
}
.leave-date-warning-popover--pending {
  --leave-date-warning-bg: #fff1c9;
  --leave-date-warning-border: rgba(225, 192, 106, 0.8);
  --leave-date-warning-text: #9a6700;
}
.leave-date-warning-popover--approved {
  --leave-date-warning-bg: #e3f3e6;
  --leave-date-warning-border: rgba(129, 199, 132, 0.9);
  --leave-date-warning-text: #2e7d32;
}
.leave-date-warning-popover--recalled {
  --leave-date-warning-bg: #dbeafe;
  --leave-date-warning-border: rgba(37, 99, 235, 0.92);
  --leave-date-warning-text: #1d4ed8;
}
.leave-date-calendar :deep(.leave-date-calendar__day--warning) {
  position: relative;
  z-index: 3;
}
.leave-date-calendar :deep(.leave-date-calendar__day--locked) {
  opacity: 1 !important;
}
.leave-date-calendar :deep(.leave-date-calendar__day--locked > div),
.leave-date-calendar :deep(.leave-date-calendar__day--locked .q-btn) {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #2b2f33 !important;
  opacity: 1 !important;
  border-radius: 999px !important;
}
.leave-date-calendar :deep(.leave-date-calendar__day--locked .q-btn__content) {
  color: #2b2f33 !important;
  font-weight: 700;
}
.leave-date-calendar :deep(.leave-date-calendar__day--locked-pending > div),
.leave-date-calendar :deep(.leave-date-calendar__day--locked-pending .q-btn) {
  background: #fff1c9;
}
.leave-date-calendar :deep(.leave-date-calendar__day--locked-approved > div),
.leave-date-calendar :deep(.leave-date-calendar__day--locked-approved .q-btn) {
  background: #dff1e0;
}
.leave-date-calendar :deep(.leave-date-calendar__day--info-recalled > div),
.leave-date-calendar :deep(.leave-date-calendar__day--info-recalled .q-btn) {
  background: rgba(191, 219, 254, 0.8);
  border: 1px dashed rgba(37, 99, 235, 0.95);
  color: #1d4ed8 !important;
  border-radius: 999px !important;
}
.leave-date-calendar :deep(.leave-date-calendar__day--info-recalled .q-btn__content) {
  color: #1d4ed8 !important;
  font-weight: 800;
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
  overflow: visible;
}
.dialog-form-card :deep(.q-date__calendar-days-container) {
  min-height: 156px;
  overflow: visible;
}
.dialog-form-card :deep(.q-date__calendar-item) {
  height: 26px;
  overflow: visible;
}
.dialog-form-card :deep(.q-date__calendar-item div) {
  min-width: 24px;
  height: 24px;
}
.dialog-form-card :deep(.q-stepper__nav) {
  padding-top: 0;
}
.dialog-form-card :deep(.q-stepper__nav.dialog-actions-bar) {
  flex: 0 0 auto;
  width: 100%;
  margin-top: 10px;
  padding: 18px 12px calc(env(safe-area-inset-bottom, 0px) + 10px);
  background: #fff;
  border-top: none !important;
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  align-self: stretch;
  justify-self: stretch;
  position: sticky;
  bottom: 0;
  z-index: 3;
  box-shadow: none;
}
.dialog-actions-row {
  width: auto;
  max-width: 100%;
  margin: 0 !important;
  margin-left: auto !important;
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}
.dialog-actions-row .step-btn {
  min-width: 0;
  margin: 0 !important;
}
.dialog-actions-row .step-btn:first-child {
  flex: 0 0 116px;
}
.dialog-actions-row .step-btn:last-child {
  flex: 0 0 auto;
  min-width: 184px;
}
.dialog-actions-row :deep(.q-btn__content) {
  justify-content: center;
}

@media (max-width: 1024px) {
  .dialog-application-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }

  .dialog-section-stack--left,
  .dialog-section--type,
  .dialog-section--details,
  .dialog-section--commutation,
  .dialog-section--reason,
  .dialog-section--dates,
  .dialog-section--full,
  .dialog-section--actions,
  .dialog-section--actions-raised,
  .dialog-section--dates-raised {
    grid-column: 1 / -1;
    grid-row: auto;
  }

  .dialog-section--actions-raised {
    justify-self: stretch;
    align-self: auto;
  }

  .dialog-dates-layout {
    row-gap: 10px;
  }

  .dialog-form-card .section-block {
    padding: 12px;
  }

  .dialog-form-card :deep(.q-date) {
    max-width: 100%;
    width: 100%;
  }

  .dialog-form-card :deep(.q-stepper__step-inner) {
    padding: 6px 8px 10px;
  }

  .dialog-form-card :deep(.q-stepper__nav.dialog-actions-bar) {
    padding: 16px 10px calc(env(safe-area-inset-bottom, 0px) + 10px);
  }

  .dialog-actions-row {
    gap: 8px;
    width: 100%;
  }

  .dialog-actions-row .step-btn:first-child {
    flex: 0 0 104px;
  }

  .dialog-actions-row .step-btn:last-child {
    flex: 0 0 auto;
    min-width: 164px;
  }
}

@media (max-width: 599px) {
  .dialog-step-content-scroll {
    overflow-x: hidden;
  }

  .dialog-dates-layout {
    margin-left: 0 !important;
    margin-right: 0 !important;
    row-gap: 8px;
  }

  .dialog-dates-layout > [class*='col-'] {
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  .dialog-selected-dates-panel {
    min-width: 0;
    overflow: hidden;
  }

  .dialog-form-card :deep(.q-date__view) {
    min-height: 0;
    padding: 8px 4px 6px;
  }

  .dialog-form-card :deep(.q-date__calendar-item) {
    height: 24px;
  }

  .dialog-form-card :deep(.q-date__calendar-item div) {
    min-width: 22px;
    height: 22px;
  }

  .dialog-form-card :deep(.q-stepper__nav.dialog-actions-bar) {
    padding: 14px 8px calc(env(safe-area-inset-bottom, 0px) + 8px);
  }

  .dialog-actions-row {
    gap: 6px;
  }

  .dialog-actions-row .step-btn {
    min-height: 42px;
    font-size: 0.9rem;
  }

  .dialog-actions-row .step-btn:first-child {
    flex: 0 0 88px;
  }

  .dialog-actions-row .step-btn:last-child {
    flex: 1 1 auto;
    min-width: 0;
  }
}
</style>






