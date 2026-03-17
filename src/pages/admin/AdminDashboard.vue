<template>
  <q-page class="q-pa-md">
    <div :class="['row items-center q-mb-lg', { 'applications-page-header': props.applicationsOnly }]">
      <h1 class="text-h4 text-weight-bold q-mt-none q-mb-none">
        {{ props.applicationsOnly ? 'Applications' : 'Admin Dashboard' }}
      </h1>
      <q-space />
      <q-btn
        v-if="props.applicationsOnly"
        unelevated
        color="green-8"
        icon="description"
        label="Apply Leave"
        class="applications-page-cta"
        @click="openApplyLeaveDialog"
      />
    </div>
    <q-dialog
      v-if="props.applicationsOnly"
      v-model="showApplyLeaveDialog"
      persistent
      class="apply-leave-dialog"
      transition-show="scale"
      transition-hide="scale"
    >
      <q-card class="apply-leave-dialog-card">
        <q-bar class="apply-leave-dialog-header bg-primary text-white">
          <div class="text-h6 text-weight-bold">Leave Application</div>
          <q-space />
          <q-btn
            flat
            round
            icon="close"
            color="white"
            size="md"
            class="apply-leave-dialog-close"
            @click="closeApplyLeaveDialog"
          />
        </q-bar>
        <q-card-section class="q-pa-none apply-leave-dialog-body">
          <AdminApplySelf
            in-dialog
            :existing-applications="applicationRows"
            @cancel="closeApplyLeaveDialog"
            @submitted="handleApplyLeaveSubmitted"
          />
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog
      v-if="!props.applicationsOnly"
      v-model="showPendingReminderDialog"
      persistent
      class="pending-reminder-dialog"
    >
      <q-card class="pending-reminder-card">
        <q-card-section class="row items-center q-pb-none pending-reminder-card__header">
          <q-icon
            name="pending_actions"
            color="warning"
            size="28px"
            class="q-mr-sm pending-reminder-card__icon"
          />
          <div class="text-h6 pending-reminder-card__title">Pending Leave Applications</div>
        </q-card-section>
        <q-card-section class="pending-reminder-card__body">
          <div class="text-body2 text-grey-8 pending-reminder-card__message">
            You have
            <span class="text-weight-bold">{{ dashboardData.pending_count }}</span>
            pending leave application(s) that need review and approval.
          </div>
        </q-card-section>
        <q-card-actions align="right" class="pending-reminder-card__actions">
          <q-btn
            flat
            color="grey-7"
            label="Later"
            class="pending-reminder-card__button"
            v-close-popup
          />
          <q-btn
            unelevated
            color="warning"
            label="Review Now"
            class="pending-reminder-card__button"
            @click="focusPendingApplications"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <div
      v-if="!props.applicationsOnly"
      class="row q-col-gutter-md q-mb-lg stat-cards-row dashboard-kpi-row"
    >
      <div class="col-12 col-sm-6 col-md-4 dashboard-kpi-col">
        <q-card
          class="stat-card stat-card--interactive bg-white rounded-borders dashboard-kpi-card"
          flat
          elevation="1"
          role="button"
          tabindex="0"
          :style="{ '--stat-card-hover-bg': '#eef4ff' }"
          @click="openApplicationsView()"
          @keyup.enter="openApplicationsView()"
          @keyup.space.prevent="openApplicationsView()"
        >
          <q-card-section class="stat-card-content dashboard-kpi-content">
            <div class="stat-card-main dashboard-kpi-main">
              <div class="stat-card-left dashboard-kpi-left">
                <div class="row items-center no-wrap q-gutter-xs dashboard-kpi-icon-wrap">
                  <q-icon name="description" size="28px" color="grey" />
                </div>
                <div class="text-caption text-weight-medium q-mt-sm dashboard-kpi-label">
                  Applications
                </div>
              </div>
              <div class="stat-value text-primary dashboard-kpi-value">
                <q-spinner v-if="loading" size="32px" color="primary" />
                <template v-else>{{ dashboardData.total_count }}</template>
              </div>
            </div>
            <div class="stat-breakdown dashboard-kpi-breakdown">
              <div
                v-for="card in totalApplicationBreakdownCards"
                :key="card.key"
                class="stat-mini-card"
                :style="getEmploymentTypeCardStyle(card)"
              >
                <span class="stat-mini-label">{{ card.label }}</span>
                <span class="stat-mini-value">{{ loading ? '-' : card.value }}</span>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-4 dashboard-kpi-col">
        <q-card
          class="stat-card stat-card--interactive bg-white rounded-borders dashboard-kpi-card"
          flat
          elevation="1"
          role="button"
          tabindex="0"
          :style="{ '--stat-card-hover-bg': '#fff5e0' }"
          @click="openApplicationsView('pending')"
          @keyup.enter="openApplicationsView('pending')"
          @keyup.space.prevent="openApplicationsView('pending')"
        >
          <q-card-section class="stat-card-content dashboard-kpi-content">
            <div class="stat-card-main dashboard-kpi-main">
              <div class="stat-card-left dashboard-kpi-left">
                <div class="row items-center no-wrap q-gutter-xs dashboard-kpi-icon-wrap">
                  <q-icon name="schedule" size="28px" color="warning" />
                  <q-icon
                    v-if="dashboardData.pending_count > 5"
                    name="warning"
                    size="18px"
                    color="warning"
                  />
                </div>
                <div class="text-caption text-weight-medium q-mt-sm dashboard-kpi-label">
                  Pending Applications
                </div>
              </div>
              <div class="stat-value text-warning dashboard-kpi-value">
                <q-spinner v-if="loading" size="32px" color="warning" />
                <template v-else>{{ dashboardData.pending_count }}</template>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-4 dashboard-kpi-col">
        <q-card
          class="stat-card stat-card--interactive bg-white rounded-borders dashboard-kpi-card"
          flat
          elevation="1"
          role="button"
          tabindex="0"
          :style="{ '--stat-card-hover-bg': '#edf8ef' }"
          @click="openApplicationsView('approved')"
          @keyup.enter="openApplicationsView('approved')"
          @keyup.space.prevent="openApplicationsView('approved')"
        >
          <q-card-section class="stat-card-content dashboard-kpi-content">
            <div class="stat-card-main dashboard-kpi-main">
              <div class="stat-card-left dashboard-kpi-left">
                <div class="row items-center no-wrap q-gutter-xs dashboard-kpi-icon-wrap">
                  <q-icon name="check_circle" size="28px" color="primary" />
                </div>
                <div class="text-caption text-weight-medium q-mt-sm dashboard-kpi-label">
                  Total Approved
                </div>
              </div>
              <div class="stat-value text-primary dashboard-kpi-value">
                <q-spinner v-if="loading" size="32px" color="primary" />
                <template v-else>{{ dashboardData.total_approved }}</template>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <AdminAnalyticsCharts v-if="!props.applicationsOnly" :applications="applicationRows" />

    <q-card v-if="props.applicationsOnly" flat bordered class="rounded-borders">
      <q-card-section>
        <div class="row items-center justify-between q-col-gutter-sm application-toolbar">
          <div class="col application-toolbar__search">
            <q-input
              v-model="statusSearch"
              dense
              outlined
              clearable
              placeholder="Search all application columns"
              class="application-status-search application-status-search--left"
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
          <div class="col-auto row items-center q-gutter-sm application-toolbar__actions">
            <q-btn
              unelevated
              no-caps
              color="blue-grey-7"
              icon="print"
              label="Print Applications"
              size="sm"
              @click="printApplicationsPdf"
            />
          </div>
        </div>
      </q-card-section>
      <q-table
        :rows="applicationsForTable"
        :columns="applicationTableColumns"
        row-key="id"
        flat
        v-model:pagination="applicationsPagination"
        :rows-per-page-options="[5, 10, 15, 20]"
        :loading="loading"
        class="applications-table applications-table--interactive"
        @row-click="handleApplicationRowClick"
      >
        <template #body-cell-employee="props">
          <q-td>
            <div class="text-weight-medium">{{ props.row.employeeName }}</div>
            <div class="text-caption text-grey-7">{{ props.row.employee_id }}</div>
          </q-td>
        </template>
        <template #body-cell-leaveBalance="props">
          <q-td>
            <div class="leave-balance-cell">
              <q-badge
                v-for="(item, index) in getLeaveBalanceTextItems(props.row)"
                :key="`${props.row.id}-leave-balance-text-${index}`"
                color="grey-2"
                text-color="grey-7"
                rounded
                class="leave-balance-badge"
                :label="item.label"
              >
                <q-tooltip>{{ item.tooltip }}</q-tooltip>
              </q-badge>
            </div>
          </q-td>
        </template>
        <template #body-cell-inclusiveDates="props">
          <q-td>
            <div class="application-details-cell">
              <span
                v-for="(line, index) in getApplicationInclusiveDateLines(props.row)"
                :key="`${props.row.id}-inclusive-${index}`"
                class="text-weight-medium text-grey-9"
              >
                {{ line }}
              </span>
            </div>
          </q-td>
        </template>
        <template #body-cell-dateFiled="props">
          <q-td>
            <span class="text-weight-medium text-grey-9">{{
              formatDate(props.row.dateFiled) || 'N/A'
            }}</span>
          </q-td>
        </template>
        <template #body-cell-status="props">
          <q-td class="application-status-cell">
            <q-badge
              :color="getApplicationStatusColor(props.row)"
              :label="getApplicationStatusLabel(props.row)"
              rounded
              class="text-weight-medium q-pa-xs application-status-badge"
              style="padding-left: 10px; padding-right: 10px"
            />
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td class="pending-actions-cell text-center">
            <div class="row no-wrap justify-center items-center q-gutter-x-xs">
              <q-btn
                flat
                dense
                round
                size="sm"
                icon="visibility"
                @click.stop="openDetails(props.row)"
              >
                <q-tooltip>View</q-tooltip>
              </q-btn>
              <q-btn
                v-if="canPrintApplication(props.row)"
                flat
                dense
                round
                size="sm"
                icon="print"
                color="blue-grey-7"
                @click.stop="printApplication(props.row)"
              >
                <q-tooltip>Print PDF</q-tooltip>
              </q-btn>
              <template v-if="props.row.rawStatus === 'PENDING_ADMIN'">
                <q-btn
                  unelevated
                  dense
                  size="sm"
                  icon="close"
                  color="blue-grey-7"
                  text-color="white"
                  class="pending-actions-icon-btn pending-actions-icon-btn--cancel"
                  @click.stop="openActionConfirm('cancel', props.row)"
                >
                  <q-tooltip>Cancel</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  dense
                  round
                  size="sm"
                  icon="cancel"
                  color="negative"
                  @click.stop="openActionConfirm('disapprove', props.row)"
                >
                  <q-tooltip>Disapprove</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  dense
                  round
                  size="sm"
                  icon="check_circle"
                  color="green-7"
                  @click.stop="openActionConfirm('approve', props.row)"
                >
                  <q-tooltip>Approve</q-tooltip>
                </q-btn>
              </template>
              <template v-else-if="props.row.rawStatus === 'PENDING_HR'">
                <q-btn
                  unelevated
                  dense
                  size="sm"
                  icon="close"
                  color="blue-grey-7"
                  text-color="white"
                  class="pending-actions-icon-btn pending-actions-icon-btn--cancel"
                  @click.stop="openActionConfirm('cancel', props.row)"
                >
                  <q-tooltip>Cancel</q-tooltip>
                </q-btn>
              </template>
            </div>
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width text-center q-pa-md text-grey-7">
            <q-icon name="warning" size="24px" class="q-mr-sm" />
            <span>No Applications Submitted</span>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- View dialog -->
    <q-dialog v-model="showDetailsDialog" persistent position="standard">
      <q-card
        v-if="selectedApp"
        class="application-timeline-card"
        style="width: 560px; max-width: 94vw"
      >
        <q-card-section class="row items-start no-wrap application-timeline-header">
          <div class="application-timeline-header-copy">
            <div class="text-h6 application-timeline-header-title">Application Timeline</div>
            <div class="application-timeline-header-caption">
              Track your leave request through department and HR review
            </div>
          </div>
          <q-space />
          <q-btn flat dense round icon="close" color="grey-8" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="application-timeline-content">
          <div class="application-timeline-panel">
            <div
              v-for="(entry, index) in selectedAppTimeline"
              :key="`${entry.title}-${index}`"
              class="application-timeline-item"
            >
              <div class="application-timeline-marker-column">
                <div
                  class="application-timeline-marker"
                  :class="`application-timeline-marker--${getTimelineEntryTone(entry)}`"
                >
                  <q-icon :name="getTimelineEntryIcon(entry)" size="16px" />
                </div>
                <div
                  v-if="index < selectedAppTimeline.length - 1"
                  class="application-timeline-line"
                  :class="`application-timeline-line--${getTimelineEntryTone(entry)}`"
                />
              </div>

              <div class="application-timeline-body">
                <div v-if="entry.subtitle" class="application-timeline-meta">
                  {{ entry.subtitle }}
                </div>
                <div class="application-timeline-title">
                  {{ entry.title }}
                </div>
                <div v-if="entry.actor" class="application-timeline-actor">
                  Action by: {{ entry.actor }}
                </div>
                <div v-else-if="entry.description" class="application-timeline-actor">
                  {{ entry.description }}
                </div>
              </div>
            </div>
          </div>
        </q-card-section>
        <q-card-actions
          v-if="
            $q.screen.lt.sm &&
            selectedApp &&
            (hasMobileApplicationActions(selectedApp) || canPrintApplication(selectedApp))
          "
          align="right"
          class="application-timeline-actions"
        >
          <q-btn
            v-if="canPrintApplication(selectedApp)"
            unelevated
            no-caps
            color="blue-grey-7"
            label="Print"
            @click="printApplication(selectedApp)"
          />
          <template v-if="selectedApp.rawStatus === 'PENDING_ADMIN'">
            <q-btn
              unelevated
              no-caps
              color="blue-grey-7"
              label="Cancel"
              @click="openActionConfirm('cancel', selectedApp)"
            />
            <q-btn
              unelevated
              no-caps
              color="negative"
              label="Disapprove"
              @click="openActionConfirm('disapprove', selectedApp)"
            />
            <q-btn
              unelevated
              no-caps
              color="green-7"
              label="Approve"
              @click="openActionConfirm('approve', selectedApp)"
            />
          </template>
          <template v-else-if="selectedApp.rawStatus === 'PENDING_HR'">
            <q-btn
              unelevated
              no-caps
              color="blue-grey-7"
              label="Cancel"
              @click="openActionConfirm('cancel', selectedApp)"
            />
          </template>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Action confirmation dialog -->
    <q-dialog v-model="showConfirmActionDialog">
      <q-card
        class="admin-action-dialog-card"
        :class="
          confirmActionType === 'approve'
            ? 'admin-action-dialog-card--approve'
            : 'admin-action-dialog-card--reject'
        "
      >
        <q-card-section class="row justify-end admin-action-dialog-card__top">
          <q-btn
            flat
            round
            dense
            icon="close"
            color="grey-6"
            aria-label="Close confirmation"
            v-close-popup
          />
        </q-card-section>
        <q-card-section class="text-center admin-action-dialog-card__content">
          <div class="admin-action-dialog-card__title">
            {{ getConfirmActionTitle(confirmActionType) }}
          </div>
          <div class="admin-action-dialog-card__message">
            {{ getConfirmActionMessage(confirmActionType) }}
          </div>
        </q-card-section>
        <q-card-actions class="admin-action-dialog-card__actions">
          <q-btn
            outline
            no-caps
            label="Cancel"
            color="grey-7"
            class="admin-action-dialog-card__button admin-action-dialog-card__button--cancel"
            v-close-popup
          />
          <q-btn
            unelevated
            no-caps
            label="Confirm"
            :color="
              confirmActionType === 'approve'
                ? 'green-7'
                : confirmActionType === 'cancel'
                  ? 'blue-grey-7'
                  : 'negative'
            "
            class="admin-action-dialog-card__button"
            @click="confirmPendingAction"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Disapprove dialog -->
    <q-dialog v-model="showDisapproveDialog" persistent>
      <q-card
        class="admin-action-dialog-card admin-action-dialog-card--reject"
        style="min-width: 360px"
      >
        <q-card-section>
          <div class="text-h6">{{ rejectionDialogTitle }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input
            v-model="remarks"
            type="textarea"
            :label="rejectionDialogLabel"
            rows="4"
            outlined
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            unelevated
            :color="rejectionMode === 'cancel' ? 'blue-grey-7' : 'negative'"
            :label="rejectionMode === 'cancel' ? 'Confirm Cancel' : 'Submit'"
            :loading="actionLoading"
            @click="confirmDisapprove"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Action Result dialog -->
    <q-dialog v-model="showActionResultDialog" persistent>
      <q-card style="min-width: 420px; max-width: 520px">
        <q-card-section class="row items-center">
          <q-icon
            :name="actionResultType === 'approved' ? 'check_circle' : 'cancel'"
            :color="
              actionResultType === 'approved'
                ? 'green-7'
                : actionResultType === 'cancelled'
                  ? 'blue-grey-7'
                  : 'negative'
            "
            size="28px"
            class="q-mr-sm"
          />
          <div class="text-h6">Application {{ getActionResultLabel(actionResultType) }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="text-body2 text-grey-8">
            The application has been {{ getActionResultVerb(actionResultType) }}. You can print the
            finalized form now.
          </div>
          <div v-if="actionResultApp" class="text-caption text-grey-7 q-mt-sm">
            {{ actionResultApp.employeeName }} - {{ actionResultApp.leaveType }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            unelevated
            color="primary"
            icon="print"
            label="Print PDF"
            :disable="!actionResultApp"
            @click="printActionResult"
          />
          <q-btn flat label="Close" color="grey-7" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { api } from 'src/boot/axios'
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { generateLeaveFormPdf } from 'src/utils/leave-form-pdf'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'
import { useAuthStore } from 'stores/auth-store'
import { useNotificationStore } from 'stores/notification-store'
import AdminApplySelf from 'pages/admin/AdminApplySelf.vue'
import AdminAnalyticsCharts from 'src/components/admin/AdminAnalyticsCharts.vue'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const notifStore = useNotificationStore()
const props = defineProps({
  applicationsOnly: {
    type: Boolean,
    default: false,
  },
})
pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

function emptyEmploymentBreakdown() {
  return {
    elective: 0,
    co_terminous: 0,
    regular: 0,
    casual: 0,
  }
}

const loading = ref(true)
const actionLoading = ref(false)
const departmentEmployees = ref([])
const applicationRows = ref([])
const dashboardData = ref({
  pending_count: 0,
  approved_today: 0,
  total_approved: 0,
  total_count: 0,
  kpi_breakdown: {
    pending: emptyEmploymentBreakdown(),
    approved_today: emptyEmploymentBreakdown(),
    total_approved: emptyEmploymentBreakdown(),
    total: emptyEmploymentBreakdown(),
  },
  applications: [],
})

const kpiBreakdown = computed(() => {
  const source = dashboardData.value.kpi_breakdown ?? {}
  return {
    pending: { ...emptyEmploymentBreakdown(), ...(source.pending ?? {}) },
    approved_today: { ...emptyEmploymentBreakdown(), ...(source.approved_today ?? {}) },
    total_approved: { ...emptyEmploymentBreakdown(), ...(source.total_approved ?? {}) },
    total: { ...emptyEmploymentBreakdown(), ...(source.total ?? {}) },
  }
})

const EMPLOYMENT_TYPE_BREAKDOWN_CARDS = [
  { key: 'elective', label: 'Elective', accent: '#8e24aa', bg: '#f3e5f5' },
  { key: 'co_terminous', label: 'Co-term', accent: '#0277bd', bg: '#e1f5fe' },
  { key: 'regular', label: 'Regular', accent: '#2e7d32', bg: '#e8f5e9' },
  { key: 'casual', label: 'Casual', accent: '#e65100', bg: '#fff3e0' },
]

const statusSearch = ref('')
const employmentTypeFilter = ref('')
const applicationsPagination = ref({
  page: 1,
  rowsPerPage: 10,
})
const adminDepartmentId = computed(
  () => authStore.user?.department_id ?? authStore.user?.department?.id,
)
const totalApplicationBreakdownCards = computed(() =>
  EMPLOYMENT_TYPE_BREAKDOWN_CARDS.map((card) => ({
    ...card,
    value: kpiBreakdown.value.total[card.key] ?? 0,
  })),
)
const applicationsForTable = computed(() => {
  const queryTokens = getSearchTokens(statusSearch.value)
  const applications = (applicationRows.value ?? []).filter((app) =>
    matchesEmploymentTypeFilter(app),
  )
  const filteredApplications = queryTokens.length
    ? applications.filter((app) => {
        const searchText = getApplicationSearchText(app)
        return queryTokens.every((token) => searchText.includes(token))
      })
    : applications

  return [...filteredApplications].sort(compareApplicationsForTable)
})

watch([statusSearch, employmentTypeFilter], () => {
  applicationsPagination.value.page = 1
})

watch(
  () => route.query.search,
  (value) => {
    statusSearch.value = props.applicationsOnly ? String(value || '') : ''
  },
  { immediate: true },
)

const latestLeaveBalanceEntriesByEmployee = computed(() => {
  const entriesByEmployee = new Map()
  const applications = [...(applicationRows.value ?? [])].sort(compareApplicationsByRecencyDesc)

  for (const app of applications) {
    const employeeKey = getEmployeeBalanceLookupKey(app)
    if (!employeeKey) continue

    const latestEntries = getLeaveBalanceEntriesFromSnapshot(app)
    if (!latestEntries.length) continue

    let employeeEntries = entriesByEmployee.get(employeeKey)
    if (!employeeEntries) {
      employeeEntries = new Map()
      entriesByEmployee.set(employeeKey, employeeEntries)
    }

    for (const entry of latestEntries) {
      const leaveTypeKey = getLeaveBalanceTypeKey(entry.label)
      if (!leaveTypeKey || employeeEntries.has(leaveTypeKey)) continue
      employeeEntries.set(leaveTypeKey, entry)
    }
  }

  return entriesByEmployee
})

const columns = [
  { name: 'employee', label: 'Employee', align: 'left' },
  {
    name: 'leaveType',
    label: 'Leave Type',
    field: (row) => (row.is_monetization ? `${row.leaveType} (Monetization)` : row.leaveType),
    align: 'left',
  },
  {
    name: 'dateFiled',
    label: 'Date Filed',
    field: (row) => (row.dateFiled ? formatDate(row.dateFiled) : 'N/A'),
    align: 'left',
  },
  {
    name: 'inclusiveDates',
    label: 'Inclusive Dates',
    field: (row) => getApplicationDurationLabel(row),
    align: 'left',
  },
  {
    name: 'leaveBalance',
    label: 'Leave Balance',
    field: (row) => getLeaveBalanceDisplay(row),
    align: 'left',
  },
  { name: 'days', label: 'Days', field: (row) => getApplicationDayCount(row), align: 'center' },
  {
    name: 'status',
    label: 'Status',
    field: (row) => getApplicationStatusLabel(row),
    align: 'left',
  },
  {
    name: 'actions',
    label: 'Actions',
    align: 'center',
    style: 'width: 190px',
    headerStyle: 'width: 190px',
  },
]
const mobileApplicationColumnWidths = {
  employee: '180px',
  status: '134px',
  leaveType: '148px',
}
const applicationTableColumns = computed(() => {
  if (!$q.screen.lt.sm) return columns

  return ['employee', 'status', 'leaveType']
    .map((name) => {
      const column = columns.find((entry) => entry.name === name)
      if (!column) return null

      const mobileWidth = mobileApplicationColumnWidths[name]
      if (!mobileWidth) return column

      return {
        ...column,
        style: `min-width: ${mobileWidth};`,
        headerStyle: `min-width: ${mobileWidth}; text-align: left;`,
      }
    })
    .filter(Boolean)
})
const showApplyLeaveDialog = ref(false)
const showPendingReminderDialog = ref(false)
const showDetailsDialog = ref(false)
const showDisapproveDialog = ref(false)
const selectedApp = ref(null)
const disapproveId = ref('')
const remarks = ref('')
const rejectionMode = ref('disapprove')
const disapproveTargetApp = ref(null)
const showConfirmActionDialog = ref(false)
const confirmActionType = ref('approve')
const confirmActionTarget = ref(null)
const showActionResultDialog = ref(false)
const actionResultType = ref('approved')
const actionResultApp = ref(null)
const selectedAppTimeline = computed(() => buildApplicationTimeline(selectedApp.value))
const rejectionDialogTitle = computed(() =>
  rejectionMode.value === 'cancel' ? 'Cancel Application' : 'Disapprove Application',
)
const rejectionDialogLabel = computed(() =>
  rejectionMode.value === 'cancel' ? 'Reason for cancellation' : 'Reason for disapproval',
)

function pendingReminderSeenSessionKey() {
  return `lms_pending_reminder_seen:admin:${authStore.user?.id ?? 'unknown'}`
}

function pendingReminderNotificationId() {
  return `local-pending-reminder-admin:${authStore.user?.id ?? 'unknown'}`
}

function hasSeenPendingReminderThisLogin() {
  if (typeof sessionStorage === 'undefined') return false
  const token = authStore.getToken?.()
  if (!token) return false
  return sessionStorage.getItem(pendingReminderSeenSessionKey()) === token
}

function markPendingReminderSeenThisLogin() {
  if (typeof sessionStorage === 'undefined') return
  const token = authStore.getToken?.()
  if (!token) return
  sessionStorage.setItem(pendingReminderSeenSessionKey(), token)
}

function syncPendingReminderNotification(pendingCount) {
  const id = pendingReminderNotificationId()
  if (pendingCount <= 0) {
    notifStore.removeLocalNotification(id)
    return
  }

  const noun = pendingCount === 1 ? 'application' : 'applications'
  notifStore.upsertLocalNotification({
    id,
    type: 'reminder',
    title: 'Pending Leave Applications',
    message: `You have ${pendingCount} pending leave ${noun} that need review and approval.`,
  })
}

function openApplyLeaveDialog() {
  showApplyLeaveDialog.value = true
}

function closeApplyLeaveDialog() {
  showApplyLeaveDialog.value = false
}

async function handleApplyLeaveSubmitted() {
  closeApplyLeaveDialog()
  await fetchDashboard()
}

async function fetchDashboard() {
  loading.value = true
  try {
    employmentTypeFilter.value = ''
    const [dashboardResponse, leaveApplicationsResponse] = await Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/leave-applications').catch(() => null),
    ])

    const data = dashboardResponse?.data ?? {}
    dashboardData.value = data
    applicationRows.value = mergeApplications(
      extractApplicationsFromPayload(data),
      extractApplicationsFromPayload(leaveApplicationsResponse?.data),
    )
    maybeShowPendingReminder()
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load dashboard data right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
    applicationRows.value = []
  } finally {
    loading.value = false
  }
}

async function fetchDepartmentEmployees() {
  if (!adminDepartmentId.value) {
    departmentEmployees.value = []
    return
  }

  const employees = []
  let page = 1
  let lastPage = 1

  try {
    do {
      const { data } = await api.get('/employees', {
        params: {
          department_id: adminDepartmentId.value,
          per_page: 100,
          page,
        },
      })

      const pageData = data?.employees ?? {}
      const rows = Array.isArray(pageData?.data) ? pageData.data : []
      employees.push(...rows)

      const currentPage = Number(pageData?.current_page ?? page)
      const resolvedLastPage = Number(pageData?.last_page ?? currentPage)
      lastPage =
        Number.isFinite(resolvedLastPage) && resolvedLastPage > 0 ? resolvedLastPage : currentPage
      page = currentPage + 1
    } while (page <= lastPage)

    departmentEmployees.value = employees
  } catch {
    departmentEmployees.value = []
  }
}

onMounted(fetchDashboard)

watch(
  adminDepartmentId,
  () => {
    fetchDepartmentEmployees()
  },
  { immediate: true },
)

function maybeShowPendingReminder() {
  const pendingCount = Number(dashboardData.value.pending_count || 0)
  syncPendingReminderNotification(pendingCount)

  if (props.applicationsOnly) {
    showPendingReminderDialog.value = false
    return
  }

  if (pendingCount <= 0) {
    showPendingReminderDialog.value = false
    return
  }

  if (hasSeenPendingReminderThisLogin()) return

  showPendingReminderDialog.value = true
  markPendingReminderSeenThisLogin()
}

function openApplicationsView(search = '') {
  const normalizedSearch = String(search || '').trim()
  const query = normalizedSearch ? { search: normalizedSearch } : {}

  router.push({
    name: 'admin-applications',
    query,
  })
}

function focusPendingApplications() {
  showPendingReminderDialog.value = false
  openApplicationsView('pending')
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(dateStr) {
  if (!dateStr) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr).trim())) {
    return formatDate(dateStr)
  }

  const parsedDate = new Date(dateStr)
  if (Number.isNaN(parsedDate.getTime())) return ''

  return parsedDate.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDayValue(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return '0'
  return Number.isInteger(numericValue) ? String(numericValue) : String(numericValue)
}

function formatLeaveBalanceValue(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return ''
  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(2)
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

function normalizeLookupValue(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function normalizeEmployeeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizeEmploymentTypeKey(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[_\s]+/g, '-')

  if (!normalized) return ''
  if (normalized.includes('ELECTIVE')) return 'elective'
  if (
    normalized.includes('CO-TER') ||
    normalized.includes('CO-TERM') ||
    normalized.includes('COTER')
  )
    return 'co_terminous'
  if (normalized.includes('REGULAR')) return 'regular'
  if (normalized.includes('CASUAL')) return 'casual'
  return ''
}

function getEmployeeLookupCandidates(employee) {
  return [employee?.control_no, employee?.controlNo, employee?.employee_id, employee?.employeeId]
    .map((value) => normalizeLookupValue(value))
    .filter(Boolean)
}

function getEmployeeNameCandidates(employee) {
  const nameVariants = [
    employee?.name,
    employee?.full_name,
    [employee?.firstname, employee?.middlename, employee?.surname].filter(Boolean).join(' '),
    [employee?.firstname, employee?.surname].filter(Boolean).join(' '),
    [employee?.surname, employee?.firstname, employee?.middlename].filter(Boolean).join(' '),
    [employee?.surname, employee?.firstname].filter(Boolean).join(' '),
  ]

  return [...new Set(nameVariants.map((value) => normalizeEmployeeName(value)).filter(Boolean))]
}

function getApplicationEmployeeDisplayName(application) {
  return (
    application?.employeeName ||
    application?.employee_name ||
    application?.employee?.name ||
    application?.employee?.full_name ||
    application?.employee?.employee_name ||
    application?.name ||
    application?.full_name ||
    [
      application?.employee?.firstname,
      application?.employee?.middlename,
      application?.employee?.surname,
    ]
      .filter(Boolean)
      .join(' ') ||
    [application?.firstname, application?.middlename, application?.surname]
      .filter(Boolean)
      .join(' ')
  )
}

function getApplicationEmployeeLookupCandidates(application) {
  return [
    application?.employee_id,
    application?.employeeId,
    application?.control_no,
    application?.controlNo,
    application?.employee?.control_no,
    application?.employee?.controlNo,
    application?.employee?.employee_id,
    application?.employee?.employeeId,
    application?.user?.control_no,
    application?.user?.controlNo,
  ]
    .map((value) => normalizeLookupValue(value))
    .filter(Boolean)
}

function getApplicationEmployeeNameCandidates(application) {
  const nameVariants = [
    getApplicationEmployeeDisplayName(application),
    application?.employeeName,
    application?.employee_name,
    application?.employee?.name,
    application?.employee?.full_name,
    application?.employee?.employee_name,
    application?.name,
    application?.full_name,
    [application?.firstname, application?.middlename, application?.surname]
      .filter(Boolean)
      .join(' '),
    [application?.firstname, application?.surname].filter(Boolean).join(' '),
    [application?.surname, application?.firstname, application?.middlename]
      .filter(Boolean)
      .join(' '),
    [application?.surname, application?.firstname].filter(Boolean).join(' '),
    [
      application?.employee?.firstname,
      application?.employee?.middlename,
      application?.employee?.surname,
    ]
      .filter(Boolean)
      .join(' '),
    [application?.employee?.firstname, application?.employee?.surname].filter(Boolean).join(' '),
    [
      application?.employee?.surname,
      application?.employee?.firstname,
      application?.employee?.middlename,
    ]
      .filter(Boolean)
      .join(' '),
    [application?.employee?.surname, application?.employee?.firstname].filter(Boolean).join(' '),
  ]

  return [...new Set(nameVariants.map((value) => normalizeEmployeeName(value)).filter(Boolean))]
}

function applicationMatchesEmployeeName(application, employee) {
  const applicationName = normalizeEmployeeName(getApplicationEmployeeDisplayName(application))
  if (!applicationName) return false

  const employeeFirstName = normalizeEmployeeName(employee?.firstname)
  const employeeSurname = normalizeEmployeeName(employee?.surname)
  if (
    employeeFirstName &&
    employeeSurname &&
    applicationName.includes(employeeFirstName) &&
    applicationName.includes(employeeSurname)
  ) {
    return true
  }

  const employeeNameTokens = [
    employeeFirstName,
    normalizeEmployeeName(employee?.middlename),
    employeeSurname,
  ]
    .filter(Boolean)
    .flatMap((value) => value.split(' '))
    .filter(Boolean)

  if (!employeeNameTokens.length) return false

  return employeeNameTokens.every((token) => applicationName.includes(token))
}

const employeeEmploymentTypeLookup = computed(() => {
  const byLookupValue = new Map()
  const byName = new Map()

  for (const employee of departmentEmployees.value) {
    const employmentTypeKey = normalizeEmploymentTypeKey(employee?.status)
    if (!employmentTypeKey) continue

    for (const lookupValue of getEmployeeLookupCandidates(employee)) {
      if (!byLookupValue.has(lookupValue)) {
        byLookupValue.set(lookupValue, employmentTypeKey)
      }
    }

    for (const nameValue of getEmployeeNameCandidates(employee)) {
      if (!byName.has(nameValue)) {
        byName.set(nameValue, employmentTypeKey)
      }
    }
  }

  return { byLookupValue, byName }
})

function getApplicationEmploymentTypeFromEmployees(application) {
  for (const lookupValue of getApplicationEmployeeLookupCandidates(application)) {
    const matched = employeeEmploymentTypeLookup.value.byLookupValue.get(lookupValue)
    if (matched) return matched
  }

  for (const nameValue of getApplicationEmployeeNameCandidates(application)) {
    const matched = employeeEmploymentTypeLookup.value.byName.get(nameValue)
    if (matched) return matched
  }

  for (const employee of departmentEmployees.value) {
    if (!applicationMatchesEmployeeName(application, employee)) continue
    const matched = normalizeEmploymentTypeKey(employee?.status)
    if (matched) return matched
  }

  return ''
}

function getApplicationMergeKey(application, index) {
  const explicitId =
    application?.id ?? application?.application_id ?? application?.leave_application_id

  if (explicitId !== undefined && explicitId !== null && String(explicitId).trim() !== '') {
    return `id:${String(explicitId).trim()}`
  }

  const employeeKey = getApplicationEmployeeLookupCandidates(application)[0]
  const employeeName = normalizeEmployeeName(getApplicationEmployeeDisplayName(application))
  const leaveTypeKey = normalizeEmployeeName(
    application?.leaveType ??
      application?.leave_type ??
      application?.leaveTypeName ??
      application?.leave_type_name,
  )
  const filedDateKey = normalizeLookupValue(
    application?.dateFiled ??
      application?.date_filed ??
      application?.filed_at ??
      application?.filedAt ??
      application?.created_at ??
      application?.createdAt,
  )
  const inclusiveDatesKey = normalizeEmployeeName(getApplicationDurationLabel(application))

  const fallbackKey = [employeeKey || employeeName, leaveTypeKey, filedDateKey, inclusiveDatesKey]
    .filter(Boolean)
    .join('|')

  return fallbackKey ? `fallback:${fallbackKey}` : `index:${index}`
}

function getApplicationCompletenessScore(application) {
  const candidates = [
    getApplicationEmployeeDisplayName(application),
    application?.employee_id,
    application?.employeeId,
    application?.leaveType,
    application?.leave_type,
    application?.leaveTypeName,
    application?.dateFiled,
    application?.date_filed,
    application?.status,
    application?.rawStatus,
    application?.remarks,
    application?.updated_at,
    application?.updatedAt,
    application?.selected_dates,
    application?.selectedDates,
    application?.startDate,
    application?.start_date,
    application?.endDate,
    application?.end_date,
  ]

  return candidates.filter((value) => {
    if (Array.isArray(value)) return value.length > 0
    return value !== undefined && value !== null && String(value).trim() !== ''
  }).length
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

function choosePreferredApplication(existingApplication, incomingApplication) {
  if (!existingApplication) return incomingApplication

  const incomingCompleteness = getApplicationCompletenessScore(incomingApplication)
  const existingCompleteness = getApplicationCompletenessScore(existingApplication)
  if (incomingCompleteness !== existingCompleteness) {
    return incomingCompleteness > existingCompleteness ? incomingApplication : existingApplication
  }

  const incomingTimestamp = getApplicationTimestampValue(incomingApplication)
  const existingTimestamp = getApplicationTimestampValue(existingApplication)
  if (incomingTimestamp !== existingTimestamp) {
    return incomingTimestamp > existingTimestamp ? incomingApplication : existingApplication
  }

  return incomingApplication
}

function mergeApplications(...sources) {
  const mergedApplications = new Map()

  sources.flat().forEach((application, index) => {
    const key = getApplicationMergeKey(application, index)
    const existingApplication = mergedApplications.get(key)
    mergedApplications.set(key, choosePreferredApplication(existingApplication, application))
  })

  return Array.from(mergedApplications.values())
}

function getApplicationEmploymentTypeKey(application) {
  const employeeMatchedKey = getApplicationEmploymentTypeFromEmployees(application)
  if (employeeMatchedKey) return employeeMatchedKey

  const candidates = [
    application?.employment_status,
    application?.employmentStatus,
    application?.appointment_status,
    application?.appointmentStatus,
    application?.employee_status,
    application?.employeeStatus,
    application?.status_type,
    application?.statusType,
    application?.employee?.status,
    application?.employee?.employment_status,
    application?.employee?.employmentStatus,
    application?.user?.status,
    application?.user?.employment_status,
    application?.user?.employmentStatus,
  ]

  for (const candidate of candidates) {
    const normalizedKey = normalizeEmploymentTypeKey(candidate)
    if (normalizedKey) return normalizedKey
  }

  return ''
}

function matchesEmploymentTypeFilter(application) {
  if (!employmentTypeFilter.value) return true
  return getApplicationEmploymentTypeKey(application) === employmentTypeFilter.value
}

function getEmploymentTypeCardStyle(card) {
  return {
    '--stat-mini-card-accent': card.accent,
    '--stat-mini-card-hover-bg': card.bg,
  }
}

const REQUIRED_LEAVE_BALANCE_TYPES = [
  'Mandatory / Forced Leave',
  'MCO6 Leave',
  'Sick Leave',
  'Vacation Leave',
  'Wellness Leave',
]

const EVENT_BASED_LEAVE_BALANCE_TYPES = [
  'Maternity Leave',
  'Paternity Leave',
  'Special Privilege Leave',
  'Solo Parent Leave',
  'Study Leave',
  '10-Day VAWC Leave',
  'Rehabilitation Privilege',
  'Special Leave Benefits for Women',
  'Special Emergency (Calamity) Leave',
  'Adoption Leave',
]

function prettifyLeaveBalanceLabel(value) {
  const label = String(value || '').trim()
  if (!label) return ''

  const normalized = label
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const lower = normalized.toLowerCase()
  if (lower === 'mandatory' || lower === 'forced' || lower === 'mandatory forced leave')
    return 'Mandatory / Forced Leave'
  if (lower === 'mandatory / forced leave') return 'Mandatory / Forced Leave'
  if (lower === 'mco6' || lower === 'mco6 leave') return 'MCO6 Leave'
  if (lower === 'vacation') return 'Vacation Leave'
  if (lower === 'sick') return 'Sick Leave'
  if (lower === 'vacation leave') return 'Vacation Leave'
  if (lower === 'sick leave') return 'Sick Leave'
  if (lower === 'wellness' || lower === 'wellness leave') return 'Wellness Leave'

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase())
}

function toLeaveBalanceAcronym(value) {
  const label = prettifyLeaveBalanceLabel(value)
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

function addLeaveBalanceEntry(entries, seen, label, value) {
  const formattedValue = formatLeaveBalanceValue(value)
  const formattedLabel = prettifyLeaveBalanceLabel(label)
  if (!formattedLabel || formattedValue === '') return

  const key = formattedLabel.toLowerCase()
  if (seen.has(key)) return

  seen.add(key)
  entries.push({ label: formattedLabel, value: formattedValue })
}

function getEmployeeBalanceLookupKey(app) {
  const explicitKey = app?.employee_id ?? app?.employeeId ?? app?.control_no ?? app?.controlNo
  if (explicitKey !== undefined && explicitKey !== null && String(explicitKey).trim() !== '') {
    return String(explicitKey).trim().toLowerCase()
  }

  const nameKey = [app?.surname, app?.firstname, app?.middlename, app?.employeeName]
    .map((value) =>
      String(value || '')
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean)
    .join('|')

  return nameKey || ''
}

function getLeaveBalanceTypeKey(value) {
  return prettifyLeaveBalanceLabel(value).trim().toLowerCase()
}

function isEventBasedLeaveBalanceType(value) {
  const typeKey = getLeaveBalanceTypeKey(value)
  return EVENT_BASED_LEAVE_BALANCE_TYPES.some((label) => getLeaveBalanceTypeKey(label) === typeKey)
}

function collectLeaveBalanceEntriesFromValue(entries, seen, source, fallbackLabel = '') {
  if (!source) return

  if (Array.isArray(source)) {
    for (const item of source) {
      if (item == null) continue
      if (typeof item !== 'object') continue

      addLeaveBalanceEntry(
        entries,
        seen,
        item.leave_type_name ||
          item.leave_type ||
          item.type_name ||
          item.type ||
          item.name ||
          item.label ||
          fallbackLabel,
        item.balance ??
          item.remaining_balance ??
          item.available_balance ??
          item.credits ??
          item.value,
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
        value.leave_type_name ||
          value.leave_type ||
          value.type_name ||
          value.type ||
          value.name ||
          value.label ||
          key,
        value.balance ??
          value.remaining_balance ??
          value.available_balance ??
          value.credits ??
          value.value,
      )
      continue
    }

    addLeaveBalanceEntry(entries, seen, key, value)
  }
}

function getLeaveBalanceEntriesFromSnapshot(app) {
  const entries = []
  const seen = new Set()

  collectLeaveBalanceEntriesFromValue(entries, seen, app?.certificationLeaveCredits)
  collectLeaveBalanceEntriesFromValue(entries, seen, app?.certification_leave_credits)
  collectLeaveBalanceEntriesFromValue(entries, seen, app?.leaveBalances)
  collectLeaveBalanceEntriesFromValue(entries, seen, app?.leave_balances)
  collectLeaveBalanceEntriesFromValue(entries, seen, app?.leaveCredits)
  collectLeaveBalanceEntriesFromValue(entries, seen, app?.leave_credits)
  collectLeaveBalanceEntriesFromValue(entries, seen, app?.balances)
  collectLeaveBalanceEntriesFromValue(entries, seen, app?.leave_balance)
  collectLeaveBalanceEntriesFromValue(entries, seen, app?.leave_balance_summary)
  collectLeaveBalanceEntriesFromValue(entries, seen, app?.employee_leave_balances)
  collectLeaveBalanceEntriesFromValue(entries, seen, app?.leaveBalance)

  if (!entries.length) {
    addLeaveBalanceEntry(
      entries,
      seen,
      app?.leaveType || 'Leave Balance',
      app?.balance ?? app?.leave_balance ?? app?.remaining_balance ?? app?.available_balance,
    )
  }

  return entries
}

function resolveLatestLeaveBalanceEntries(app) {
  const employeeKey = getEmployeeBalanceLookupKey(app)
  if (!employeeKey) return getLeaveBalanceEntriesFromSnapshot(app)

  const employeeEntries = latestLeaveBalanceEntriesByEmployee.value.get(employeeKey)
  if (!employeeEntries || employeeEntries.size === 0) {
    return getLeaveBalanceEntriesFromSnapshot(app)
  }

  return Array.from(employeeEntries.values())
}

function getLeaveBalanceEntries(app) {
  const resolvedEntries = resolveLatestLeaveBalanceEntries(app).filter(
    (entry) => !isEventBasedLeaveBalanceType(entry.label),
  )
  const requiredTypeKeys = new Set(
    REQUIRED_LEAVE_BALANCE_TYPES.map((label) => getLeaveBalanceTypeKey(label)),
  )
  const entriesByType = new Map(
    resolvedEntries.map((entry) => [getLeaveBalanceTypeKey(entry.label), entry]),
  )

  const orderedEntries = REQUIRED_LEAVE_BALANCE_TYPES.map((label) => {
    const existingEntry = entriesByType.get(getLeaveBalanceTypeKey(label))
    return existingEntry || { label, value: '0' }
  })

  for (const entry of resolvedEntries) {
    const leaveTypeKey = getLeaveBalanceTypeKey(entry.label)
    if (requiredTypeKeys.has(leaveTypeKey)) continue
    orderedEntries.push(entry)
  }

  return orderedEntries
}

function getLeaveBalanceLines(app) {
  return getLeaveBalanceEntries(app).map((entry) => {
    const acronym = toLeaveBalanceAcronym(entry.label)
    return `${acronym || entry.label}: ${entry.value}`
  })
}

function getLeaveBalanceTextItems(app) {
  return getLeaveBalanceEntries(app).map((entry) => {
    const acronym = toLeaveBalanceAcronym(entry.label)
    return {
      label: `${acronym || entry.label}: ${entry.value}`,
      tooltip: entry.label,
    }
  })
}

function getLeaveBalanceDisplay(app) {
  return getLeaveBalanceLines(app).join(', ')
}

function toIsoDateString(dateValue) {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function enumerateInclusiveDateRange(startDateValue, endDateValue) {
  const startDate = new Date(startDateValue)
  const endDate = new Date(endDateValue)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return []

  const firstDate = new Date(startDate)
  const lastDate = new Date(endDate)
  if (firstDate > lastDate) {
    const tempDate = new Date(firstDate)
    firstDate.setTime(lastDate.getTime())
    lastDate.setTime(tempDate.getTime())
  }

  const dates = []
  const cursor = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate())
  const last = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate())

  while (cursor <= last) {
    dates.push(toIsoDateString(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates.filter(Boolean)
}

function formatGroupedInclusiveDateLines(dateValues) {
  if (!Array.isArray(dateValues) || dateValues.length === 0) return []

  const groupedByMonthYear = new Map()
  const sortedDates = [...new Set(dateValues.filter(Boolean))].sort(
    (left, right) => Date.parse(left) - Date.parse(right),
  )

  for (const rawDate of sortedDates) {
    const parsedDate = new Date(rawDate)
    if (Number.isNaN(parsedDate.getTime())) continue

    const monthName = parsedDate.toLocaleDateString('en-US', { month: 'short' })
    const year = parsedDate.getFullYear()
    const day = parsedDate.getDate()
    const groupKey = `${year}-${parsedDate.getMonth()}`

    if (!groupedByMonthYear.has(groupKey)) {
      groupedByMonthYear.set(groupKey, { monthName, year, days: [] })
    }

    groupedByMonthYear.get(groupKey).days.push(day)
  }

  return Array.from(groupedByMonthYear.values()).map((group) => {
    const uniqueDays = [...new Set(group.days)].sort((a, b) => a - b)
    return `${group.monthName} ${uniqueDays.join(',')} ${group.year}`
  })
}

function getApplicationInclusiveDateLines(app) {
  if (!app) return ['N/A']

  if (app.is_monetization) {
    return [`${formatDayValue(app.days)} day(s)`]
  }

  if (Array.isArray(app.selected_dates) && app.selected_dates.length > 0) {
    const groupedSelectedDates = formatGroupedInclusiveDateLines(app.selected_dates)
    if (groupedSelectedDates.length > 0) return groupedSelectedDates
  }

  if (app.startDate || app.endDate) {
    const startDate = app.startDate || app.endDate
    const endDate = app.endDate || app.startDate
    const rangedDates = enumerateInclusiveDateRange(startDate, endDate)
    const groupedRangeDates = formatGroupedInclusiveDateLines(rangedDates)
    if (groupedRangeDates.length > 0) return groupedRangeDates
  }

  const start = app.startDate ? formatDate(app.startDate) : 'N/A'
  const end = app.endDate ? formatDate(app.endDate) : 'N/A'
  return [`${start} - ${end}`]
}

function getApplicationDayCount(app) {
  if (!app) return '0'

  const parsedDays = Number(app?.days)
  if (Number.isFinite(parsedDays) && parsedDays > 0) {
    return formatDayValue(parsedDays)
  }

  if (Array.isArray(app.selected_dates) && app.selected_dates.length > 0) {
    const uniqueSelectedDates = [...new Set(app.selected_dates.filter(Boolean))]
    if (uniqueSelectedDates.length > 0) return String(uniqueSelectedDates.length)
  }

  if (app.startDate || app.endDate) {
    const startDate = app.startDate || app.endDate
    const endDate = app.endDate || app.startDate
    const rangedDates = enumerateInclusiveDateRange(startDate, endDate)
    if (rangedDates.length > 0) return String(rangedDates.length)
  }

  return formatDayValue(app.days)
}

function getApplicationDurationLabel(app) {
  return getApplicationInclusiveDateLines(app).join(' ')
}

function isCancelledByUser(app) {
  const remarksText = String(app?.remarks || '').trim()
  return /^cancelled\b/i.test(remarksText)
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizeSearchToken(token) {
  if (!token) return ''
  if (/^\d+$/.test(token)) {
    return String(Number(token))
  }
  return token
}

function tokenizeSearchValue(value) {
  const normalized = normalizeSearchText(value)
  if (!normalized) return []

  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => normalizeSearchToken(token))
}

function getSearchTokens(value) {
  return tokenizeSearchValue(value)
}

function getApplicationStatusLabel(app) {
  if (isCancelledByUser(app)) return 'Cancelled'
  if (app?.status) return app.status

  if (app?.rawStatus === 'PENDING_ADMIN') return 'Pending Admin'
  if (app?.rawStatus === 'PENDING_HR') return 'Pending HR'
  if (app?.rawStatus === 'APPROVED') return 'Approved'
  if (app?.rawStatus === 'REJECTED') return 'Rejected'
  return 'Unknown'
}

function getApplicationStatusColor(app) {
  if (isCancelledByUser(app)) return 'grey-7'
  if (app?.rawStatus === 'PENDING_ADMIN') return 'warning'
  if (app?.rawStatus === 'PENDING_HR') return 'blue-6'
  if (app?.rawStatus === 'APPROVED') return 'green'
  if (app?.rawStatus === 'REJECTED') return 'negative'
  return 'grey-6'
}

function canPrintApplication(app) {
  return getApplicationStatusLabel(app) !== 'Pending Admin'
}

function getDateSearchValues(dateValue) {
  if (!dateValue) return []
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return [String(dateValue)]

  const monthLong = date.toLocaleDateString('en-US', { month: 'long' })
  const monthShort = date.toLocaleDateString('en-US', { month: 'short' })
  const day = date.getDate()
  const year = date.getFullYear()

  return [
    monthLong,
    monthShort,
    `${monthLong} ${day}`,
    `${monthLong} ${day} ${year}`,
    `${monthShort} ${day}`,
    `${monthShort} ${day} ${year}`,
    `day ${day}`,
    String(day),
    String(year),
  ]
}

function getApplicationSearchText(app) {
  const dateTerms = getDateSearchValues(app?.dateFiled)
  const inclusiveDateTerms = getApplicationInclusiveDateLines(app)

  const searchValues = [
    'application',
    app?.id,
    app?.rawStatus,
    app?.status,
    getApplicationStatusLabel(app),
    isCancelledByUser(app) ? 'cancelled' : '',
    app?.leaveType,
    app?.employeeName,
    app?.firstname,
    app?.middlename,
    app?.surname,
    app?.employee_id,
    getApplicationDurationLabel(app),
    ...inclusiveDateTerms,
    getLeaveBalanceDisplay(app),
    getApplicationDayCount(app),
    ...dateTerms,
  ]

  return searchValues
    .map((value) => normalizeSearchText(value))
    .filter(Boolean)
    .join(' ')
}

function buildApplicationTimeline(app) {
  if (!app) return []

  const entries = [
    {
      title: 'Application Filed',
      subtitle:
        formatDateTime(resolveFiledDateValue(app)) ||
        formatDate(app.dateFiled) ||
        'Date unavailable',
      description: `${app.employeeName || 'Employee'} submitted this leave request.`,
      icon: 'check_circle',
      color: 'positive',
      actor: resolveFiledByActor(app),
    },
  ]

  if (isCancelledByUser(app)) {
    entries.push({
      title: 'Application Cancelled',
      subtitle: formatDateTime(resolveCancelledDateValue(app)) || 'Application closed',
      description: formatRecentRemarks(app) || 'Application was cancelled by the requester.',
      icon: 'cancel',
      color: 'negative',
      actor: resolveCancelledActor(app),
    })
    entries.push({
      title: 'Application Closed',
      subtitle: formatDateTime(resolveCancelledDateValue(app)) || 'Completed',
      description: 'Application workflow is complete.',
      icon: 'task_alt',
      color: 'positive',
      actor: resolveCancelledActor(app),
    })
    return entries
  }

  if (app.rawStatus === 'PENDING_ADMIN') {
    entries.push({
      title: 'Department Admin Review Pending',
      subtitle: 'Current stage',
      description: 'Waiting for department admin approval or disapproval.',
      icon: 'pending_actions',
      color: 'warning',
    })
    entries.push({
      title: 'Pending HR Review',
      subtitle: 'Upcoming',
      description: 'This stage starts after department admin approval.',
      icon: 'radio_button_unchecked',
      color: 'grey-5',
    })
    entries.push({
      title: 'Application Closed',
      subtitle: 'Upcoming',
      description: 'Application will be closed after final HR action.',
      icon: 'radio_button_unchecked',
      color: 'grey-5',
    })
    return entries
  }

  if (app.rawStatus === 'REJECTED') {
    const disapprovedAt = formatDateTime(resolveDisapprovedDateValue(app)) || 'Application closed'
    const disapprovedBy = resolveDisapprovalActor(app)

    if (resolveDepartmentAdminActionDateValue(app)) {
      entries.push({
        title: 'Department Admin Review Completed',
        subtitle: formatDateTime(resolveDepartmentAdminActionDateValue(app)) || 'Completed',
        description: 'Application was reviewed and forwarded to HR.',
        icon: 'check_circle',
        color: 'positive',
        actor: resolveDepartmentAdminActor(app),
      })
    }

    entries.push({
      title: 'Application Disapproved',
      subtitle: disapprovedAt,
      description: formatRecentRemarks(app) || 'Application was disapproved.',
      icon: 'cancel',
      color: 'negative',
      actor: disapprovedBy,
    })
    entries.push({
      title: 'Application Closed',
      subtitle: disapprovedAt,
      description: 'Application workflow is complete.',
      icon: 'task_alt',
      color: 'positive',
      actor: disapprovedBy,
    })
    return entries
  }

  entries.push({
    title: 'Department Admin Review Completed',
    subtitle: formatDateTime(resolveDepartmentAdminActionDateValue(app)) || 'Completed',
    description: 'Application was reviewed and forwarded to HR.',
    icon: 'check_circle',
    color: 'positive',
    actor: resolveDepartmentAdminActor(app),
  })

  if (app.rawStatus === 'PENDING_HR') {
    entries.push({
      title: 'Pending HR Review',
      subtitle: 'Current stage',
      description: 'Waiting for HR final evaluation and approval.',
      icon: 'pending_actions',
      color: 'warning',
    })
    entries.push({
      title: 'Application Closed',
      subtitle: 'Upcoming',
      description: 'Application will be closed after final HR action.',
      icon: 'radio_button_unchecked',
      color: 'grey-5',
    })
    return entries
  }

  if (app.rawStatus === 'APPROVED') {
    const approvedAt = formatDateTime(resolveFinalApprovalDateValue(app)) || 'Completed'
    const approvedBy = resolveHrActor(app)

    entries.push({
      title: 'Approved by HR',
      subtitle: approvedAt,
      description: 'Application is fully approved.',
      icon: 'task_alt',
      color: 'positive',
      actor: approvedBy,
    })
    entries.push({
      title: 'Application Closed',
      subtitle: approvedAt,
      description: 'Application workflow is complete.',
      icon: 'task_alt',
      color: 'positive',
      actor: approvedBy,
    })
    return entries
  }

  entries.push({
    title: 'Current Status',
    subtitle: getApplicationStatusLabel(app),
    description: 'Latest application status.',
    icon: 'info',
    color: getApplicationStatusColor(app),
  })

  return entries
}

function getTimelineEntryTone(entry) {
  const color = String(entry?.color || '').toLowerCase()
  const icon = String(entry?.icon || '').toLowerCase()

  if (color.includes('negative') || icon.includes('cancel')) return 'negative'
  if (color.includes('warning') || icon.includes('pending')) return 'warning'
  if (color.includes('grey') || icon.includes('radio_button_unchecked')) return 'neutral'
  return 'positive'
}

function getTimelineEntryIcon(entry) {
  const tone = getTimelineEntryTone(entry)

  if (tone === 'negative') return 'close'
  if (tone === 'warning') return 'schedule'
  if (tone === 'neutral') return 'radio_button_unchecked'
  return 'check'
}

function resolveFiledByActor(app) {
  return app?.filedBy || app?.employeeName || 'Unknown'
}

function resolveFiledDateValue(app) {
  return (
    app?.filed_at ||
    app?.filedAt ||
    app?.created_at ||
    app?.createdAt ||
    app?.submitted_at ||
    app?.submittedAt ||
    app?.dateFiled ||
    app?.date_filed ||
    null
  )
}

function resolveDepartmentAdminActor(app) {
  return app?.adminActionBy || 'Unknown'
}

function resolveDepartmentAdminActionDateValue(app) {
  return app?.adminActionAt || app?.admin_action_at || null
}

function resolveHrActor(app) {
  return app?.hrActionBy || 'Unknown'
}

function resolveFinalApprovalDateValue(app) {
  return app?.hrActionAt || app?.hr_action_at || app?.reviewedAt || app?.reviewed_at || null
}

function resolveCancelledActor(app) {
  return app?.cancelledBy || app?.employeeName || 'Unknown'
}

function resolveCancelledDateValue(app) {
  return app?.cancelledAt || app?.cancelled_at || app?.disapprovedAt || app?.disapproved_at || null
}

function resolveDisapprovalActor(app) {
  if (isCancelledByUser(app)) return resolveCancelledActor(app)
  return app?.disapprovedBy || app?.hrActionBy || app?.adminActionBy || 'Unknown'
}

function resolveDisapprovedDateValue(app) {
  return (
    app?.disapprovedAt ||
    app?.disapproved_at ||
    app?.hrActionAt ||
    app?.hr_action_at ||
    app?.adminActionAt ||
    app?.admin_action_at ||
    null
  )
}

function resolveProcessedBy(app) {
  if (app?.processedBy) return app.processedBy
  if (isCancelledByUser(app)) return resolveCancelledActor(app)
  if (app?.rawStatus === 'PENDING_HR') return resolveDepartmentAdminActor(app)
  if (app?.rawStatus === 'APPROVED') return resolveHrActor(app)
  if (app?.rawStatus === 'REJECTED') return resolveDisapprovalActor(app)
  return 'N/A'
}

function resolveReviewedDateValue(app) {
  if (app?.reviewedAt) return app.reviewedAt
  if (isCancelledByUser(app)) return app?.cancelledAt || app?.disapprovedAt || null
  if (app?.rawStatus === 'PENDING_HR') return app?.adminActionAt || null
  if (app?.rawStatus === 'APPROVED') return app?.hrActionAt || app?.adminActionAt || null
  if (app?.rawStatus === 'REJECTED')
    return app?.disapprovedAt || app?.hrActionAt || app?.adminActionAt || null
  return null
}

function formatReviewedDate(app) {
  const reviewedDate = resolveReviewedDateValue(app)
  return reviewedDate ? formatDate(reviewedDate) : 'N/A'
}

function getApplicationStatusPriority(app) {
  if (app?.rawStatus === 'PENDING_ADMIN') return 0
  if (app?.rawStatus === 'PENDING_HR') return 1
  if (app?.rawStatus === 'APPROVED') return 2
  if (app?.rawStatus === 'REJECTED' && !isCancelledByUser(app)) return 3
  if (isCancelledByUser(app)) return 4
  return 5
}

function compareApplicationsForTable(a, b) {
  const statusPriorityDiff = getApplicationStatusPriority(a) - getApplicationStatusPriority(b)
  if (statusPriorityDiff !== 0) return statusPriorityDiff

  const dateA = getApplicationRecencyTimestamp(a)
  const dateB = getApplicationRecencyTimestamp(b)
  if (dateA !== dateB) return dateB - dateA

  const idA = Number(a?.id) || 0
  const idB = Number(b?.id) || 0
  return idB - idA
}

function getApplicationRecencyTimestamp(app) {
  const candidateDates = [
    app?.created_at,
    app?.createdAt,
    app?.submitted_at,
    app?.submittedAt,
    app?.filed_at,
    app?.filedAt,
    app?.dateFiled,
  ]

  for (const candidate of candidateDates) {
    const timestamp = Date.parse(candidate || '')
    if (Number.isFinite(timestamp)) return timestamp
  }

  return 0
}

function compareApplicationsByRecencyDesc(a, b) {
  const timestampDiff = getApplicationRecencyTimestamp(b) - getApplicationRecencyTimestamp(a)
  if (timestampDiff !== 0) return timestampDiff

  const idDiff = (Number(b?.id) || 0) - (Number(a?.id) || 0)
  if (idDiff !== 0) return idDiff

  return 0
}

function formatRecentRemarks(app) {
  const remarksText = String(app?.remarks || '').trim()
  if (!remarksText) return ''
  return remarksText.replace(/^cancelled(?:\s+via\s+erms)?\b:?\s*/i, '').trim()
}

function getConfirmActionTitle(type) {
  if (type === 'approve') return 'Approve'
  if (type === 'cancel') return 'Cancel'
  return 'Disapprove'
}

function getConfirmActionMessage(type) {
  if (type === 'approve') {
    return 'This will forward the leave request to HR for final review.'
  }
  if (type === 'cancel') {
    return 'You will continue to the cancellation form.'
  }
  return 'You will continue to the disapproval form.'
}

function getActionResultLabel(type) {
  if (type === 'approved') return 'Approved'
  if (type === 'cancelled') return 'Cancelled'
  return 'Disapproved'
}

function getActionResultVerb(type) {
  if (type === 'approved') return 'approved'
  if (type === 'cancelled') return 'cancelled'
  return 'disapproved'
}

function openDetails(app) {
  selectedApp.value = app
  showDetailsDialog.value = true
}

function hasMobileApplicationActions(app) {
  return app?.rawStatus === 'PENDING_ADMIN' || app?.rawStatus === 'PENDING_HR'
}

function handleApplicationRowClick(_evt, row) {
  if (!row) return
  openDetails(row)
}

function openActionConfirm(type, target) {
  confirmActionType.value = type
  confirmActionTarget.value = target
  showConfirmActionDialog.value = true
}

function confirmPendingAction() {
  const target = confirmActionTarget.value
  const type = confirmActionType.value
  showConfirmActionDialog.value = false

  if (type === 'approve') {
    handleApprove(target)
    return
  }

  openDisapprove(target, type === 'cancel' ? 'cancel' : 'disapprove')
}

async function printApplication(app) {
  if (!canPrintApplication(app)) return

  try {
    const { data } = await api.get('/admin/dashboard')
    dashboardData.value = data
    const updated = data.applications?.find((a) => a.id === app.id)
    await generateLeaveFormPdf(updated || app)
  } catch {
    await generateLeaveFormPdf(app)
  }
}

function printApplicationsPdf() {
  const rowsToPrint = applicationsForTable.value

  if (!rowsToPrint.length) {
    $q.notify({ type: 'warning', message: 'No applications available to print.', position: 'top' })
    return
  }

  const searchText = statusSearch.value.trim()
  const title = searchText
    ? `Applications Report (Filtered: ${searchText})`
    : 'Applications Report (All)'

  const printedAt = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const tableBody = [
    [
      { text: 'Employee', style: 'tableHeader' },
      { text: 'Leave Type', style: 'tableHeader' },
      { text: 'Date Filed', style: 'tableHeader' },
      { text: 'Inclusive Dates', style: 'tableHeader' },
      { text: 'Days', style: 'tableHeader' },
      { text: 'Status', style: 'tableHeader' },
      { text: 'Processed By', style: 'tableHeader' },
      { text: 'Reviewed Date', style: 'tableHeader' },
    ],
    ...rowsToPrint.map((app) => [
      `${app.employeeName || ''}${app.employee_id ? `\n${app.employee_id}` : ''}`,
      app.is_monetization ? `${app.leaveType || 'N/A'} (Monetization)` : app.leaveType || 'N/A',
      formatDate(app.dateFiled) || 'N/A',
      getApplicationInclusiveDateLines(app).join('\n'),
      formatDayValue(app.days),
      getApplicationStatusLabel(app),
      resolveProcessedBy(app),
      formatReviewedDate(app),
    ]),
  ]

  const docDefinition = {
    pageOrientation: 'landscape',
    pageSize: 'A4',
    pageMargins: [24, 24, 24, 24],
    content: [
      { text: title, style: 'title' },
      { text: `Printed: ${printedAt}`, style: 'meta' },
      { text: `Total Applications: ${rowsToPrint.length}`, style: 'meta', margin: [0, 0, 0, 10] },
      {
        table: {
          headerRows: 1,
          widths: ['*', '*', 72, 125, 38, 68, 100, 82],
          body: tableBody,
        },
        layout: {
          fillColor: (rowIndex) => (rowIndex === 0 ? '#ECEFF1' : null),
          hLineColor: () => '#CFD8DC',
          vLineColor: () => '#CFD8DC',
        },
      },
    ],
    styles: {
      title: { fontSize: 15, bold: true, color: '#263238', margin: [0, 0, 0, 4] },
      meta: { fontSize: 10, color: '#455A64', margin: [0, 0, 0, 2] },
      tableHeader: { bold: true, color: '#263238', fontSize: 10 },
    },
    defaultStyle: {
      fontSize: 9,
    },
  }

  pdfMake.createPdf(docDefinition).open()
}

function resolveApp(target) {
  if (target && typeof target === 'object') return target
  const id = Number(target)
  if (!id) return null
  return applicationRows.value.find((a) => Number(a.id) === id) || null
}

function mapStatusAfterAction(app, type) {
  if (!app) return null
  if (type === 'approved') {
    return {
      ...app,
      rawStatus: 'PENDING_HR',
      status: 'Pending HR',
    }
  }
  if (type === 'cancelled') {
    return {
      ...app,
      rawStatus: 'REJECTED',
      status: 'Cancelled',
      remarks: app.remarks || remarks.value,
    }
  }
  return {
    ...app,
    rawStatus: 'REJECTED',
    status: 'Rejected',
    remarks: app.remarks || remarks.value,
  }
}

function showPostActionDialog(type, id, fallbackApp = null) {
  const updated = applicationRows.value.find((a) => Number(a.id) === Number(id))
  actionResultApp.value = updated || mapStatusAfterAction(fallbackApp, type)
  actionResultType.value = type
  showActionResultDialog.value = true
}

function printActionResult() {
  if (!actionResultApp.value) return
  printApplication(actionResultApp.value)
}

async function handleApprove(target) {
  const app = resolveApp(target)
  const id = app?.id ?? target
  actionLoading.value = true
  try {
    await api.post(`/admin/leave-applications/${id}/approve`)
    $q.notify({
      type: 'positive',
      message: 'Leave application approved and forwarded to HR!',
      position: 'top',
    })
    showDetailsDialog.value = false
    await fetchDashboard()
    showPostActionDialog('approved', id, app)
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to approve this application right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    actionLoading.value = false
  }
}

function openDisapprove(target, mode = 'disapprove') {
  const app = resolveApp(target)
  disapproveId.value = app?.id ?? target
  disapproveTargetApp.value = app || null
  rejectionMode.value = mode
  remarks.value = ''
  showDisapproveDialog.value = true
}

async function confirmDisapprove() {
  if (!remarks.value.trim()) {
    const message =
      rejectionMode.value === 'cancel'
        ? 'Please provide a reason for cancellation'
        : 'Please provide a reason for disapproval'
    $q.notify({ type: 'warning', message, position: 'top' })
    return
  }
  actionLoading.value = true
  try {
    const actionType = rejectionMode.value === 'cancel' ? 'cancelled' : 'disapproved'
    const payloadRemarks =
      rejectionMode.value === 'cancel'
        ? `Cancelled by Department Admin: ${remarks.value.trim()}`
        : remarks.value

    await api.post(`/admin/leave-applications/${disapproveId.value}/reject`, {
      remarks: payloadRemarks,
    })
    const successMessage =
      rejectionMode.value === 'cancel'
        ? 'Leave application cancelled with remarks'
        : 'Leave application rejected with remarks'
    $q.notify({ type: 'info', message: successMessage, position: 'top' })
    showDisapproveDialog.value = false
    await fetchDashboard()
    const fallback = disapproveTargetApp.value
      ? { ...disapproveTargetApp.value, remarks: payloadRemarks }
      : null
    showPostActionDialog(actionType, disapproveId.value, fallback)
  } catch (err) {
    const fallbackError =
      rejectionMode.value === 'cancel'
        ? 'Unable to cancel this application right now.'
        : 'Unable to reject this application right now.'
    const msg = resolveApiErrorMessage(err, fallbackError)
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    actionLoading.value = false
  }
}
</script>

<style scoped>
.stat-cards-row .col {
  display: flex;
}
.stat-card {
  width: 100%;
  height: 100%;
  min-height: 116px;
}
.stat-card--interactive {
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}
.stat-card--interactive:hover,
.stat-card--interactive:focus-visible {
  background: var(--stat-card-hover-bg, #f5f7fa) !important;
  box-shadow: 0 10px 24px rgba(38, 50, 56, 0.1);
  transform: translateY(-2px);
}
.stat-card-content {
  height: 100%;
  padding: 12px 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.stat-card-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.stat-card-left {
  flex: 1 1 auto;
}
.stat-value {
  flex: 0 0 auto;
  align-self: flex-start;
  margin-top: 2px;
  min-width: 64px;
  text-align: right;
  font-size: clamp(2.2rem, 3.2vw, 2.8rem);
  font-weight: 500;
  line-height: 1;
}
.stat-breakdown {
  margin-top: 4px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}
.stat-mini-card {
  width: 100%;
  min-width: 0;
  padding: 4px 6px;
  border-radius: 7px;
  border: 1px solid #ebeff3;
  background: #f7f9fb;
  appearance: none;
  font: inherit;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  cursor: default;
}
.stat-mini-label {
  min-width: 0;
  font-size: 0.62rem;
  color: #9aa3ad;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stat-mini-value {
  flex: 0 0 auto;
  font-size: 0.72rem;
  color: #7f8b97;
  font-weight: 600;
}

.dashboard-kpi-main {
  align-items: center;
}

.dashboard-kpi-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.dashboard-kpi-label {
  margin-top: 0 !important;
}

.apply-leave-dialog-card {
  width: min(1280px, 96vw);
  max-width: none;
  max-height: calc(100vh - 24px);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.apply-leave-dialog-header {
  min-height: 56px;
  padding: 0 10px 0 14px;
  position: sticky;
  top: 0;
  z-index: 3;
}
.apply-leave-dialog-close {
  width: 38px;
  height: 38px;
}
.apply-leave-dialog :deep(.q-dialog__inner--minimized) {
  padding: 12px;
}
.apply-leave-dialog :deep(.q-dialog__inner--minimized > div) {
  max-width: none !important;
}
.apply-leave-dialog-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
}
.pending-reminder-card {
  min-width: 360px;
  max-width: 480px;
  width: min(480px, calc(100vw - 32px));
  border-radius: 18px;
}
.pending-reminder-card__header {
  padding: 20px 24px 0;
}
.pending-reminder-card__title {
  font-weight: 700;
}
.pending-reminder-card__body {
  padding: 14px 24px 10px;
}
.pending-reminder-card__message {
  line-height: 1.5;
}
.pending-reminder-card__actions {
  gap: 10px;
  padding: 6px 24px 22px;
}
.pending-reminder-card__button {
  min-height: 44px;
  padding-inline: 18px;
}
.pending-actions-cell {
  width: 190px;
  padding-right: 8px;
}
.pending-actions-icon-btn {
  width: 14px;
  min-width: 14px;
  height: 14px;
  min-height: 14px;
  padding: 0 !important;
  border-radius: 0;
}
.pending-actions-icon-btn :deep(.q-btn__content) {
  width: 100%;
  height: 100%;
  min-width: 0;
}
.pending-actions-icon-btn :deep(.q-icon) {
  font-size: 10px;
}
.application-status-search {
  width: min(440px, 84vw);
}
.application-toolbar {
  row-gap: 8px;
}
.application-toolbar__search {
  min-width: 0;
  flex: 1 1 auto;
}
.application-status-search--left {
  width: min(440px, 100%);
}
.application-status-search--left :deep(.q-field) {
  width: 100%;
}
.application-status-cell {
  text-align: left;
  white-space: nowrap;
}
.application-status-badge {
  display: inline-flex;
  justify-content: flex-start;
  margin-left: 0;
  max-width: none;
}
.applications-table--interactive :deep(tbody tr) {
  cursor: pointer;
}
.admin-action-dialog-card {
  width: min(560px, calc(100vw - 24px));
  max-width: calc(100vw - 24px);
  border-radius: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.18);
}
.admin-action-dialog-card--approve {
  border-color: #b7ddc1;
}
.admin-action-dialog-card--reject {
  border-color: #e6b8b8;
}
.admin-action-dialog-card__top {
  padding: 12px 12px 0;
}
.admin-action-dialog-card__content {
  padding: 8px 28px 12px;
}
.admin-action-dialog-card__title {
  font-size: 2rem;
  line-height: 1.1;
  font-weight: 500;
  color: #111827;
}
.admin-action-dialog-card__message {
  margin-top: 20px;
  font-size: 1.15rem;
  line-height: 1.45;
  color: #6b7280;
}
.admin-action-dialog-card__actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 16px;
  padding: 0 28px 28px;
}
.admin-action-dialog-card__button {
  flex: 1 1 0;
  min-height: 56px;
  border-radius: 18px;
  font-size: 1rem;
  font-weight: 700;
}
.admin-action-dialog-card__button--cancel {
  background: #ffffff;
  border-color: #d6dbe1;
  color: #111827;
}
.leave-balance-cell {
  min-width: 150px;
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
.application-details-cell {
  min-width: 260px;
  white-space: normal;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.application-timeline-card {
  border-radius: 12px;
  overflow: hidden;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
}
.application-timeline-header {
  padding: 12px 14px 10px;
  background: #fff;
}
.application-timeline-header-copy {
  min-width: 0;
}
.application-timeline-header-title {
  color: #111827;
  font-weight: 700;
}
.application-timeline-header-caption {
  margin-top: 2px;
  font-size: 0.78rem;
  color: #6b7280;
}
.application-timeline-content {
  padding: 14px;
  background: #fff;
  overflow-y: auto;
}
.application-timeline-actions {
  padding: 0 14px 14px;
  gap: 8px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}
.application-timeline-panel {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: linear-gradient(180deg, #f7f8fb 0%, #f4f5f8 100%);
  padding: 10px 12px;
}
.application-timeline-item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 12px;
}
.application-timeline-item + .application-timeline-item {
  margin-top: 2px;
}
.application-timeline-marker-column {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.application-timeline-marker {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}
.application-timeline-marker--positive {
  background: #22c55e;
}
.application-timeline-marker--warning {
  background: #f59e0b;
}
.application-timeline-marker--negative {
  background: #ef4444;
}
.application-timeline-marker--neutral {
  background: #cbd5e1;
  color: #475569;
}
.application-timeline-line {
  width: 2px;
  flex: 1 1 auto;
  min-height: 42px;
  margin-top: 4px;
  border-radius: 999px;
}
.application-timeline-line--positive {
  background: #22c55e;
}
.application-timeline-line--warning {
  background: #f59e0b;
}
.application-timeline-line--negative {
  background: #ef4444;
}
.application-timeline-line--neutral {
  background: #cbd5e1;
}
.application-timeline-body {
  padding-bottom: 18px;
}
.application-timeline-meta {
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}
.application-timeline-title {
  margin-top: 2px;
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.3;
}
.application-timeline-actor {
  margin-top: 4px;
  font-size: 0.78rem;
  color: #64748b;
  line-height: 1.45;
}
@media (max-width: 599px) {
  .admin-action-dialog-card {
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
    border-radius: 20px;
  }

  .admin-action-dialog-card__content {
    padding: 4px 20px 10px;
  }

  .admin-action-dialog-card__title {
    font-size: 1.55rem;
  }

  .admin-action-dialog-card__message {
    margin-top: 14px;
    font-size: 1rem;
  }

  .admin-action-dialog-card__actions {
    gap: 12px;
    padding: 0 20px 20px;
  }

  .admin-action-dialog-card__button {
    min-height: 50px;
    border-radius: 16px;
  }

  .apply-leave-dialog-card {
    width: min(100vw, 100vw);
    max-height: calc(100vh - 8px);
    border-radius: 10px;
  }

  .apply-leave-dialog :deep(.q-dialog__inner--minimized) {
    padding: 4px;
  }

  .apply-leave-dialog-header {
    min-height: 52px;
    padding: 0 8px 0 10px;
  }

  .applications-page-header {
    align-items: flex-start;
    row-gap: 14px;
  }

  .applications-page-cta {
    margin-top: 10px;
  }

  .pending-reminder-card {
    min-width: 0;
    width: calc(100vw - 18px);
    max-width: calc(100vw - 18px);
    border-radius: 16px;
  }

  .pending-reminder-card__header {
    padding: 16px 18px 0;
  }

  .pending-reminder-card__icon {
    font-size: 22px !important;
  }

  .pending-reminder-card__title {
    font-size: 1rem;
    line-height: 1.2;
  }

  .pending-reminder-card__body {
    padding: 12px 18px 8px;
  }

  .pending-reminder-card__message {
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .pending-reminder-card__actions {
    gap: 8px;
    padding: 2px 18px 16px;
  }

  .pending-reminder-card__button {
    min-height: 40px;
    padding-inline: 14px;
    font-size: 0.88rem;
  }

  .applications-table :deep(th),
  .applications-table :deep(td) {
    padding-left: 8px;
    padding-right: 8px;
  }

  .application-status-cell {
    padding-left: 8px !important;
    padding-right: 8px !important;
  }

  .application-toolbar__search,
  .application-toolbar__actions {
    width: 100%;
    flex: 0 0 100%;
  }

  .application-toolbar__actions {
    justify-content: flex-start;
  }

  .application-toolbar {
    display: block;
  }

  .application-status-search--left {
    width: 100%;
  }

  .application-status-search--left :deep(.q-field) {
    width: 100%;
  }

  .dashboard-kpi-row {
    margin-bottom: 10px !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  .dashboard-kpi-col {
    width: 100%;
    flex: 0 0 100%;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  .dashboard-kpi-card {
    min-height: 68px;
  }

  .dashboard-kpi-content {
    padding: 8px 10px 7px;
    gap: 0;
  }

  .dashboard-kpi-main {
    align-items: center;
    gap: 8px;
  }

  .dashboard-kpi-left {
    gap: 6px;
  }

  .dashboard-kpi-icon-wrap :deep(.q-icon) {
    font-size: 18px !important;
  }

  .dashboard-kpi-label {
    font-size: 0.64rem;
    line-height: 1;
    letter-spacing: 0.03em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dashboard-kpi-value {
    min-width: 0;
    margin-top: 0;
    font-size: 1.75rem;
    line-height: 1;
  }

  .dashboard-kpi-breakdown {
    margin-top: 4px;
    gap: 4px;
  }

  .dashboard-kpi-breakdown .stat-mini-card {
    padding: 2px 4px;
    border-radius: 6px;
  }

  .dashboard-kpi-breakdown .stat-mini-label {
    font-size: 0.5rem;
  }

  .dashboard-kpi-breakdown .stat-mini-value {
    font-size: 0.6rem;
  }

  .application-timeline-content {
    padding: 12px;
  }

  .application-timeline-actions {
    padding: 0 12px 12px;
    justify-content: stretch;
  }

  .application-timeline-actions .q-btn {
    flex: 1 1 auto;
    min-width: 0;
  }
  .application-timeline-panel {
    padding: 10px;
  }
  .application-timeline-item {
    grid-template-columns: 30px minmax(0, 1fr);
    gap: 10px;
  }
  .application-timeline-marker {
    width: 24px;
    height: 24px;
  }
}
</style>
