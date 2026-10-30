<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="onDialogModelUpdate">
    <q-card class="rounded-borders employee-details-dialog">
      <q-card-section class="row items-center q-pb-none employee-details-dialog__toolbar">
        <div class="text-h6">Employee Details</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section v-if="employee" class="employee-details-dialog__content">
        <div class="employee-details-header">
          <div class="employee-details-header__profile">
            <div class="employee-details-header__identity">
              <div class="text-h6 employee-details-header__name">
                {{ employeeFullName }}
              </div>
              <div class="text-caption text-grey-6 employee-details-header__designation">
                {{ employee.designation || '-' }}
              </div>
            </div>
          </div>

          <div class="employee-details-header__meta">
            <div class="employee-details-header__meta-item">
              <div class="text-caption text-grey-6">Monthly Rate</div>
              <div class="text-body2 text-weight-medium employee-details-header__meta-value">
                {{ monthlyRateLabel }}
              </div>
            </div>
            <div class="employee-details-header__meta-item">
              <div class="text-caption text-grey-6">Estimated Terminal Leave</div>
              <div class="text-body2 text-weight-medium employee-details-header__meta-value">
                {{ terminalLeaveLabel }}
              </div>
            </div>
            <div class="employee-details-header__meta-item">
              <div class="text-caption text-grey-6">Office</div>
              <div class="text-body2 text-weight-medium employee-details-header__meta-value">
                {{ officeLabel }}
              </div>
            </div>
            <div class="employee-details-header__meta-item">
              <div class="text-caption text-grey-6">Status</div>
              <q-badge
                class="employee-details-header__status-badge"
                :color="statusColor"
                :label="statusLabel"
                rounded
              />
            </div>
          </div>
        </div>

        <div class="employee-details-leave-credits" aria-label="Employee leave credits">
          <div class="employee-details-leave-credits__badges">
            <template v-if="loadingBadges">
              <q-spinner color="secondary" size="16px" />
              <span class="employee-details-leave-credits__loading-text">
                Loading leave credits...
              </span>
            </template>
            <template v-else>
              <span
                v-for="badge in leaveBadges"
                :key="`employee-details-leave-badge-${badge.code}`"
                class="employee-details-leave-badge"
                :style="badge.style || {}"
              >
                <span class="employee-details-leave-badge__code">{{ badge.label }}</span>
                <span class="employee-details-leave-badge__value">{{ badge.value }}</span>
              </span>
            </template>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <div class="row items-center q-mb-sm">
          <div class="text-subtitle2 text-weight-medium">Leave History</div>
          <q-space />
          <q-spinner v-if="loadingHistory" color="primary" size="20px" />
        </div>

        <q-table
          class="leave-history-table"
          flat
          dense
          :rows="leaveHistory"
          :columns="columns"
          row-key="id"
          :rows-per-page-options="[5, 10, 20]"
          :loading="loadingHistory"
          table-style="table-layout: fixed; width: 100%"
        >
          <template #header-cell="props">
            <q-th :props="props" class="leave-history-table__header-cell">
              <span class="leave-history-table__header-label">
                {{ props.col.label }}
              </span>
            </q-th>
          </template>

          <template #body-cell-status="props">
            <q-td :props="props" class="leave-history-table__status-cell">
              <q-badge
                :color="getLeaveStatusColor(props.row.raw_status)"
                :label="props.row.status"
                rounded
              />
            </q-td>
          </template>

          <template #body-cell-leave_type="props">
            <q-td :props="props" class="leave-history-table__leave-type-cell">
              <span class="leave-history-table__leave-type-text">
                {{ props.row.leave_type || '-' }}
              </span>
            </q-td>
          </template>

          <template #body-cell-inclusive_date="props">
            <q-td :props="props" class="leave-history-table__inclusive-date-cell">
              <div class="row items-center justify-center no-wrap q-gutter-xs">
                <q-btn
                  flat
                  dense
                  no-caps
                  color="primary"
                  class="leave-history-table__inclusive-date-trigger"
                  :disable="!canOpenCalendar(props.row)"
                  @click.stop="$emit('open-calendar-preview', props.row)"
                >
                  <span class="leave-history-table__inclusive-date-text">
                    {{ getInclusiveDateLabel(props.row) }}
                  </span>
                </q-btn>
                <q-btn
                  flat
                  dense
                  round
                  icon="calendar_today"
                  color="primary"
                  :disable="!canOpenCalendar(props.row)"
                  @click.stop="$emit('open-calendar-preview', props.row)"
                >
                  <q-tooltip>View calendar</q-tooltip>
                </q-btn>
              </div>
            </q-td>
          </template>

          <template #body-cell-date_filed="props">
            <q-td :props="props">{{ formatDate(props.row.date_filed) }}</q-td>
          </template>

          <template #no-data>
            <div class="full-width text-center q-pa-md text-grey-6">
              <template v-if="loadingHistory">
                <q-spinner color="primary" size="24px" class="q-mr-sm" />
                <span>Loading leave history...</span>
              </template>
              <template v-else> No leave history found for this employee. </template>
            </div>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { resolveOfficeAcronymLabel } from 'src/utils/office-acronym'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  employee: {
    type: Object,
    default: null,
  },
  monthlyRate: {
    type: String,
    default: '-',
  },
  terminalLeaveEstimate: {
    type: String,
    default: '-',
  },
  leaveBadges: {
    type: Array,
    default: () => [],
  },
  loadingBadges: {
    type: Boolean,
    default: false,
  },
  leaveHistory: {
    type: Array,
    default: () => [],
  },
  loadingHistory: {
    type: Boolean,
    default: false,
  },
  inclusiveDateBuilder: {
    type: Function,
    default: null,
  },
  canOpenCalendarChecker: {
    type: Function,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'open-calendar-preview'])

const employeeFullName = computed(() => {
  const emp = props.employee
  if (!emp) return ''
  const lastName = String(emp.last_name || '').trim()
  const firstName = String(emp.first_name || '').trim()
  const middleName = String(emp.middle_name || '').trim()
  const extension = String(emp.name_extension || '').trim()
  const fullName = [lastName, [firstName, middleName].filter(Boolean).join(' '), extension].filter(Boolean).join(', ')
  return fullName || emp.name || emp.control_no || '-'
})

const officeLabel = computed(() => {
  if (!props.employee) return '-'
  return resolveOfficeAcronymLabel(props.employee) || props.employee.office || '-'
})

const monthlyRateLabel = computed(() => props.monthlyRate || '-')
const terminalLeaveLabel = computed(() => props.terminalLeaveEstimate || '-')

const statusLabel = computed(() => {
  const s = String(props.employee?.status || '').toUpperCase()
  if (s === 'REGULAR') return 'Permanent'
  if (s === 'CASUAL') return 'Casual'
  if (s === 'CO-TERMINUS') return 'Co-terminus'
  if (s === 'ELECTIVE') return 'Elective'
  return props.employee?.status || 'Unknown'
})

const statusColor = computed(() => {
  const s = String(props.employee?.status || '').toUpperCase()
  if (s === 'REGULAR') return 'green-8'
  if (s === 'CASUAL') return 'blue-8'
  if (s === 'CO-TERMINUS') return 'orange-8'
  if (s === 'ELECTIVE') return 'purple-8'
  return 'grey-7'
})

function getLeaveStatusColor(status) {
  const map = {
    PENDING_ADMIN: 'orange-8',
    PENDING_HR: 'amber-8',
    APPROVED: 'positive',
    REJECTED: 'negative',
    CANCELLED: 'grey-7',
    WITHDRAWN: 'grey-8',
  }
  return map[status] || 'grey-7'
}

function formatDate(val) {
  if (!val) return '-'
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return String(val)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getInclusiveDateLabel(row) {
  if (typeof props.inclusiveDateBuilder === 'function') {
    return props.inclusiveDateBuilder(row)
  }
  return row?.inclusive_dates || '-'
}

function canOpenCalendar(row) {
  if (typeof props.canOpenCalendarChecker === 'function') {
    return props.canOpenCalendarChecker(row)
  }
  return true
}

const columns = [
  {
    name: 'date_filed',
    label: 'Date Filed',
    align: 'center',
    field: 'date_filed',
    sortable: true,
    style: 'width: 15%; white-space: nowrap;',
    headerStyle: 'width: 15%; white-space: nowrap;',
  },
  {
    name: 'leave_type',
    label: 'Leave Type',
    align: 'center',
    field: 'leave_type',
    sortable: true,
    classes: 'leave-history-table__leave-type-cell',
    headerClasses: 'leave-history-table__leave-type-cell',
    style: 'white-space: normal;',
    headerStyle: 'white-space: normal;',
  },
  {
    name: 'inclusive_date',
    label: 'Inclusive Date',
    align: 'center',
    field: 'inclusive_dates',
    sortable: true,
    classes: 'leave-history-table__inclusive-date-cell',
    headerClasses: 'leave-history-table__inclusive-date-cell',
    style: 'width: 29%; white-space: normal;',
    headerStyle: 'width: 29%; white-space: normal;',
  },
  {
    name: 'total_days',
    label: 'Days',
    align: 'center',
    field: 'total_days',
    sortable: true,
    classes: 'leave-history-table__days-cell',
    headerClasses: 'leave-history-table__days-cell',
    style: 'width: 10%; white-space: nowrap;',
    headerStyle: 'width: 10%; white-space: nowrap;',
  },
  {
    name: 'status',
    label: 'Status',
    align: 'center',
    field: 'status',
    sortable: true,
    classes: 'leave-history-table__status-cell',
    headerClasses: 'leave-history-table__status-cell',
    style: 'width: 21%; white-space: nowrap;',
    headerStyle: 'width: 21%; white-space: nowrap;',
  },
]

function onDialogModelUpdate(val) {
  emit('update:modelValue', val)
}
</script>

<style scoped>
.employee-details-dialog {
  width: min(860px, 90vw);
  max-width: 90vw;
}

.employee-details-dialog__toolbar {
  padding-bottom: 0;
}

.employee-details-dialog__content {
  padding-top: 12px;
  padding-bottom: 12px;
}

.employee-details-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.employee-details-header__profile {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1 1 auto;
}

.employee-details-header__identity {
  min-width: 0;
}

.employee-details-header__name {
  margin: 0;
  line-height: 1.15;
}

.employee-details-header__designation {
  margin-top: 2px;
  line-height: 1.3;
}

.employee-details-header__meta {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 20px;
  flex-wrap: wrap;
}

.employee-details-header__meta-item {
  min-width: 110px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.employee-details-header__meta-value {
  line-height: 1.25;
}

.employee-details-header__status-badge {
  align-self: flex-start;
}

.employee-details-leave-credits {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.employee-details-leave-credits__badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-height: 20px;
}

.employee-details-leave-credits__loading-text {
  font-size: 0.76rem;
  color: #6b7280;
}

.employee-details-leave-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--badge-accent, #475569);
  background: var(--badge-bg, #f1f5f9);
  color: var(--badge-accent, #475569);
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
}

.employee-details-leave-badge__code {
  opacity: 0.88;
}

.employee-details-leave-badge__value {
  color: #111827;
  font-weight: 800;
}

.leave-history-table :deep(.q-table__middle) {
  overflow-x: auto;
}

.leave-history-table :deep(table) {
  table-layout: fixed;
  width: 100%;
}

.leave-history-table :deep(th),
.leave-history-table :deep(td) {
  white-space: nowrap;
  text-align: center;
}

.leave-history-table :deep(th.leave-history-table__header-cell) {
  position: relative;
  vertical-align: middle;
}

.leave-history-table :deep(.leave-history-table__header-label) {
  display: block;
  width: 100%;
  text-align: center;
}

.leave-history-table :deep(th.leave-history-table__header-cell .q-table__sort-icon) {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
}

.leave-history-table :deep(th.leave-history-table__header-cell.sort-desc .q-table__sort-icon) {
  transform: translateY(-50%) rotate(180deg);
}

.leave-history-table :deep(td.leave-history-table__leave-type-cell),
.leave-history-table :deep(th.leave-history-table__leave-type-cell),
.leave-history-table :deep(td.leave-history-table__inclusive-date-cell),
.leave-history-table :deep(th.leave-history-table__inclusive-date-cell) {
  white-space: normal;
}

.leave-history-table :deep(.leave-history-table__leave-type-text) {
  display: block;
  line-height: 1.35;
  overflow-wrap: anywhere;
  text-align: center;
}

.leave-history-table :deep(.leave-history-table__inclusive-date-text) {
  display: block;
  line-height: 1.35;
  white-space: pre-line;
  text-align: center;
}

.leave-history-table :deep(.leave-history-table__inclusive-date-trigger) {
  min-height: auto;
  padding: 4px 8px;
}

.leave-history-table :deep(.leave-history-table__inclusive-date-trigger .q-btn__content) {
  white-space: normal;
}

@media (max-width: 900px) {
  .employee-details-dialog {
    width: min(96vw, 96vw);
    max-width: 96vw;
  }

  .employee-details-header__profile {
    align-items: flex-start;
  }

  .employee-details-header__meta {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .employee-details-header__meta-item {
    min-width: 0;
  }
}
</style>

