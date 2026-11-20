<template>
  <q-page class="report-page q-pa-md">
    <div class="page-header q-mb-lg">
      <div>
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Office Leave Applications Report</h1>
        <div class="text-body2 text-grey-7 q-mt-xs">
          View and monitor leave applications submitted within your office.
        </div>
      </div>

      <div class="header-actions row q-gutter-sm">
        <q-btn outline color="primary" icon="refresh" label="Refresh" no-caps @click="refreshReport" :loading="loading" />
        <q-btn outline color="primary" icon="print" label="Print" no-caps />
        <q-btn color="primary" icon="file_download" label="Export" no-caps />
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- SKELETON LOADING STATE (Initial Page Load)               -->
    <!-- ========================================================= -->
    <div v-if="loading && rows.length === 0" class="skeleton-suite">
      <KpiCardsSkeleton :count="4" col-class="col-12 col-sm-6 col-lg-3" />
      <TableSkeletonCard
        :columns="7"
        :rows="6"
        :show-toolbar="true"
        :toolbar-filter-count="0"
        :show-avatar-column="false"
        :show-subtitle-on-first-column="false"
      />
    </div>

    <!-- ========================================================= -->
    <!-- REAL CONTENT SUITE                                        -->
    <!-- ========================================================= -->
    <div v-else :class="{ 'content-reloading': loading && rows.length > 0 }">
      <q-banner rounded class="bg-blue-1 text-primary q-mb-md">
        <q-icon name="apartment" class="q-mr-sm" />
        This report page is for office admin monitoring only. HR review and HR actions are not shown here.
      </q-banner>

      <DataFilterBar
        v-model:search="filters.search"
        search-label="Search employee"
        search-placeholder=""
        search-class="col-12 col-md-3"
        actions-class="col-12 col-md-auto q-ml-auto"
        :show-reset="true"
        reset-label="Reset"
        @reset="resetFilters"
      >
        <div class="col-12 col-md-3">
          <q-select
            v-model="filters.office"
            :options="officeOptions"
            label="Office"
            outlined
            dense
            emit-value
            map-options
            clearable
          />
        </div>

        <div class="col-12 col-md-2">
          <q-select
            v-model="filters.status"
            :options="statusOptions"
            label="Status"
            outlined
            dense
            emit-value
            map-options
            clearable
          />
        </div>

        <div class="col-12 col-md-2">
          <q-select
            v-model="filters.leaveType"
            :options="leaveTypeOptions"
            label="Leave Type"
            outlined
            dense
            emit-value
            map-options
            clearable
          />
        </div>

        <template #actions>
          <q-btn color="primary" label="Apply Filters" icon="filter_alt" no-caps />
        </template>

        <template #secondary>
          <div class="col-12 col-md-4">
            <HeaderDateRangePicker
              v-model:start-date="filters.dateFrom"
              v-model:end-date="filters.dateTo"
              dense
              full-width
              menu-anchor="bottom left"
              menu-self="top left"
            />
          </div>
        </template>
      </DataFilterBar>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-6 col-lg-3" v-for="card in summaryCards" :key="card.title">
        <q-card flat bordered class="summary-card">
          <q-card-section class="row items-center justify-between">
            <div>
              <div class="text-caption text-grey-7">{{ card.title }}</div>
              <div class="text-h5 text-weight-bold q-mt-xs">{{ card.value }}</div>
            </div>
            <q-avatar size="48px" color="primary" text-color="white" :icon="card.icon" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <DataTableCard
      :rows="rows"
      :columns="columns"
      row-key="id"
      :visible-columns="visibleColumns"
      v-model:pagination="pagination"
      card-class="report-table"
      table-class="report-table"
      empty-icon="assignment"
      no-data-label="No leave applications found."
    >
      <template #before-table>
        <q-card-section class="row items-center justify-between q-pb-sm">
          <div>
            <div class="text-subtitle1 text-weight-medium">Leave Application Records</div>
            <div class="text-caption text-grey-7">Office admin monitoring table layout</div>
          </div>

          <div class="row q-gutter-sm">
            <q-btn-dropdown outline color="primary" label="Columns" no-caps>
              <q-list dense style="min-width: 200px">
                <q-item v-for="column in toggleableColumns" :key="column.name" tag="label">
                  <q-item-section avatar>
                    <q-checkbox v-model="visibleColumns" :val="column.name" />
                  </q-item-section>
                  <q-item-section>{{ column.label }}</q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
          </div>
        </q-card-section>

        <q-separator />
      </template>
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="statusColor(props.value)" rounded>
              {{ props.value }}
            </q-badge>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props">
            <div class="row q-gutter-xs">
              <q-btn flat round dense icon="visibility" color="primary" />
              <q-btn flat round dense icon="print" color="secondary" />
            </div>
          </q-td>
        </template>
    </DataTableCard>
  </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import DataFilterBar from 'src/components/common/DataFilterBar.vue'
import DataTableCard from 'src/components/common/DataTableCard.vue'
import HeaderDateRangePicker from 'src/components/common/HeaderDateRangePicker.vue'

const loading = ref(false)

const refreshReport = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 400)
}

const filters = ref({
  office: null,
  status: null,
  leaveType: null,
  search: '',
  dateFrom: '',
  dateTo: '',
})

const officeOptions = [
  { label: 'My Office', value: 'my_office' },
]

const statusOptions = [
  { label: 'Draft', value: 'Draft' },
  { label: 'Submitted', value: 'Submitted' },
  { label: 'Returned', value: 'Returned' },
  { label: 'Forwarded to HR', value: 'Forwarded to HR' },
]

const leaveTypeOptions = [
  { label: 'Vacation Leave', value: 'Vacation Leave' },
  { label: 'Sick Leave', value: 'Sick Leave' },
  { label: 'CTO', value: 'CTO' },
  { label: 'Wellness Leave', value: 'Wellness Leave' },
]

const summaryCards = [
  { title: 'Total Office Applications', value: 128, icon: 'assignment' },
  { title: 'Submitted', value: 21, icon: 'send' },
  { title: 'Returned', value: 8, icon: 'reply' },
  { title: 'Forwarded to HR', value: 99, icon: 'forward' },
]

const columns = [
  { name: 'employeeName', label: 'Employee Name', field: 'employeeName', align: 'left', sortable: true },
  { name: 'office', label: 'Office', field: 'office', align: 'left', sortable: true },
  { name: 'leaveType', label: 'Leave Type', field: 'leaveType', align: 'left', sortable: true },
  { name: 'dateFiled', label: 'Date Filed', field: 'dateFiled', align: 'left', sortable: true },
  { name: 'dateRange', label: 'Date Range', field: 'dateRange', align: 'left', sortable: true },
  { name: 'totalDays', label: 'Total Days', field: 'totalDays', align: 'center', sortable: true },
  { name: 'status', label: 'Office Status', field: 'status', align: 'center', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const toggleableColumns = columns.filter((column) => column.name !== 'actions')

const visibleColumns = ref([
  'employeeName',
  'office',
  'leaveType',
  'dateFiled',
  'dateRange',
  'totalDays',
  'status',
  'actions',
])

const rows = [
  {
    id: 1,
    employeeName: 'Jograd Mascariñas Mahusay',
    office: 'ICTMO',
    leaveType: 'Vacation Leave',
    dateFiled: 'Mar 26, 2026',
    dateRange: 'Apr 15, 2026',
    totalDays: '1 day',
    status: 'Submitted',
  },
  {
    id: 2,
    employeeName: 'Maria Santos',
    office: 'ICTMO',
    leaveType: 'Sick Leave',
    dateFiled: 'Mar 24, 2026',
    dateRange: 'Mar 28–29, 2026',
    totalDays: '2 days',
    status: 'Forwarded to HR',
  },
  {
    id: 3,
    employeeName: 'John Dela Cruz',
    office: 'ICTMO',
    leaveType: 'CTO',
    dateFiled: 'Mar 21, 2026',
    dateRange: 'Mar 30, 2026',
    totalDays: '4 hours',
    status: 'Returned',
  },
]

const pagination = ref({
  sortBy: 'dateFiled',
  descending: true,
  page: 1,
  rowsPerPage: 10,
})

function resetFilters() {
  filters.value = {
    office: null,
    status: null,
    leaveType: null,
    search: '',
    dateFrom: '',
    dateTo: '',
  }
}

function statusColor(status) {
  if (status === 'Forwarded to HR') return 'primary'
  if (status === 'Returned') return 'negative'
  if (status === 'Submitted') return 'warning'
  if (status === 'Draft') return 'grey'
  return 'grey'
}
</script>

<style scoped>
.report-page {
  background: #f8fafc;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.header-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.filter-card,
.summary-card,
.report-table {
  border-radius: 16px;
}

.summary-card {
  height: 100%;
}

.report-table :deep(.q-table thead tr th) {
  font-weight: 700;
  background: #f1f5f9;
}

.report-table :deep(.q-table tbody tr:hover) {
  background: #f8fbff;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }
}

.content-reloading {
  opacity: 0.55;
  pointer-events: none;
  transition: opacity 0.25s ease-in-out;
}

.skeleton-suite {
  animation: fadeIn 0.2s ease-in;
}

.border-bottom {
  border-bottom: 1px solid #f1f5f9;
}

.border-top {
  border-top: 1px solid #f1f5f9;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
