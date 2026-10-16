<template>
  <q-page class="q-pa-md attendance-overview-page">
    <!-- Top Executive Header -->
    <div class="q-mb-md executive-header">
      <div class="row items-center q-gutter-x-sm">
        <div>
          <h1 class="text-h4 text-weight-bold q-mt-none q-mb-none page-title">
            Attendance Management
          </h1>
        </div>
      </div>
    </div>

    <!-- Indeterminate Top Progress Bar for Background Reloads -->
    <q-linear-progress
      v-if="loading && employeeRows.length > 0"
      indeterminate
      color="green-9"
      size="3px"
      class="q-mb-md rounded-borders top-reload-bar"
    />

    <!-- ========================================================= -->
    <!-- SKELETON LOADING STATE (Initial Page Load)               -->
    <!-- ========================================================= -->
    <div v-if="loading && employeeRows.length === 0" class="skeleton-suite">
      <!-- 5 Skeleton KPI Stat Cards -->
      <div class="row q-col-gutter-sm q-mb-md">
        <div v-for="i in 5" :key="'sk-stat-' + i" class="col-12 col-sm-6 col-md">
          <q-card flat bordered class="rounded-borders bg-white stat-kpi-card">
            <q-card-section class="q-pa-md">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <q-skeleton type="text" width="80px" height="16px" animation="wave" />
                <q-skeleton type="QAvatar" size="32px" animation="wave" />
              </div>
              <div class="q-mt-xs">
                <q-skeleton type="text" width="45px" height="34px" animation="wave" />
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Skeleton Main Table Card -->
      <q-card flat bordered class="rounded-borders bg-white table-card">
        <q-card-section class="q-pa-md row items-center justify-end q-gutter-sm border-bottom">
          <q-skeleton type="rect" width="160px" height="34px" class="rounded-borders" animation="wave" />
          <q-skeleton type="rect" width="220px" height="34px" class="rounded-borders" animation="wave" />
          <q-skeleton type="rect" width="160px" height="34px" class="rounded-borders" animation="wave" />
        </q-card-section>

        <!-- Skeleton Table Body -->
        <div class="q-pa-md">
          <!-- Columns Header Placeholder -->
          <div class="row items-center q-pb-sm border-bottom q-col-gutter-sm text-grey-5">
            <div class="col-3"><q-skeleton type="text" width="50%" height="16px" animation="wave" /></div>
            <div class="col-2"><q-skeleton type="text" width="60%" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="70%" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="70%" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="70%" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="70%" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="60%" height="16px" animation="wave" /></div>
            <div class="col-1 text-center"><q-skeleton type="text" width="80%" height="16px" animation="wave" /></div>
            <div class="col-1 text-right"><q-skeleton type="text" width="60%" height="16px" class="q-ml-auto" animation="wave" /></div>
          </div>

          <!-- 8 Skeleton Rows -->
          <div
            v-for="r in 8"
            :key="'sk-row-' + r"
            class="row items-center q-py-md border-bottom q-col-gutter-sm"
            :class="{ 'bg-grey-1': r % 2 === 0 }"
          >
            <div class="col-3">
              <div class="row items-center no-wrap q-gutter-x-sm">
                <q-skeleton type="QAvatar" size="36px" animation="wave" />
                <div>
                  <q-skeleton type="text" width="130px" height="18px" animation="wave" />
                  <q-skeleton type="text" width="75px" height="14px" class="q-mt-xs" animation="wave" />
                </div>
              </div>
            </div>
            <div class="col-2"><q-skeleton type="text" width="100px" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="55px" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="55px" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="55px" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="55px" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="rect" width="48px" height="20px" class="rounded-borders" animation="wave" /></div>
            <div class="col-1 text-center"><q-skeleton type="rect" width="65px" height="22px" class="rounded-borders" animation="wave" /></div>
            <div class="col-1 text-right">
              <div class="row items-center justify-end">
                <q-skeleton type="QAvatar" size="26px" animation="wave" />
              </div>
            </div>
          </div>
        </div>

        <!-- Skeleton Footer -->
        <div class="q-pa-sm row items-center justify-between bg-grey-1 border-top">
          <q-skeleton type="text" width="120px" height="16px" animation="wave" />
          <q-skeleton type="rect" width="160px" height="30px" class="rounded-borders" animation="wave" />
        </div>
      </q-card>
    </div>

    <!-- ========================================================= -->
    <!-- REAL CONTENT SUITE                                        -->
    <!-- ========================================================= -->
    <div v-else :class="{ 'content-reloading': loading && employeeRows.length > 0 }">
      <!-- 5 Summary KPI Stat Cards -->
      <div class="row q-col-gutter-sm q-mb-md">
        <!-- Total Roster -->
        <div class="col-12 col-sm-6 col-md">
          <q-card
            flat
            bordered
            class="rounded-borders bg-white stat-kpi-card"
          >
            <q-card-section class="q-pa-md">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <span class="stat-kpi-label">Total Personnel</span>
                <div class="stat-icon-wrap bg-blue-1 text-blue-9">
                  <q-icon name="groups" size="20px" />
                </div>
              </div>
              <div class="stat-kpi-value text-dark q-mt-xs">{{ stats.total }}</div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Present Today -->
        <div class="col-12 col-sm-6 col-md">
          <q-card
            flat
            bordered
            class="rounded-borders bg-white stat-kpi-card"
          >
            <q-card-section class="q-pa-md">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <span class="stat-kpi-label">Present</span>
                <div class="stat-icon-wrap bg-green-1 text-green-9">
                  <q-icon name="check_circle" size="20px" />
                </div>
              </div>
              <div class="stat-kpi-value text-positive q-mt-xs">{{ stats.present }}</div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Late Today -->
        <div class="col-12 col-sm-6 col-md">
          <q-card
            flat
            bordered
            class="rounded-borders bg-white stat-kpi-card"
          >
            <q-card-section class="q-pa-md">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <span class="stat-kpi-label">Tardy / Late</span>
                <div class="stat-icon-wrap bg-amber-1 text-amber-9">
                  <q-icon name="history_toggle_off" size="20px" />
                </div>
              </div>
              <div class="stat-kpi-value text-amber-9 q-mt-xs">{{ stats.late }}</div>
            </q-card-section>
          </q-card>
        </div>

        <!-- On Leave Today -->
        <div class="col-12 col-sm-6 col-md">
          <q-card
            flat
            bordered
            class="rounded-borders bg-white stat-kpi-card"
          >
            <q-card-section class="q-pa-md">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <span class="stat-kpi-label">On Leave</span>
                <div class="stat-icon-wrap bg-indigo-1 text-indigo-9">
                  <q-icon name="beach_access" size="20px" />
                </div>
              </div>
              <div class="stat-kpi-value text-indigo-9 q-mt-xs">{{ stats.on_leave }}</div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Absent Today -->
        <div class="col-12 col-sm-6 col-md">
          <q-card
            flat
            bordered
            class="rounded-borders bg-white stat-kpi-card"
          >
            <q-card-section class="q-pa-md">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <span class="stat-kpi-label">Absent</span>
                <div class="stat-icon-wrap bg-red-1 text-red-9">
                  <q-icon name="event_busy" size="20px" />
                </div>
              </div>
              <div class="stat-kpi-value text-negative q-mt-xs">{{ stats.absent }}</div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Main Attendance Management Card -->
      <q-card flat bordered class="rounded-borders bg-white table-card shadow-1">
        <!-- Toolbar Section: Filter Dropdown + Search + Date Navigator -->
        <q-card-section class="q-pa-sm q-px-md border-bottom">
          <div class="row items-center justify-end q-gutter-sm">
            <!-- Filter Dropdown -->
            <q-select
              v-model="activeFilter"
              :options="filterOptions"
              emit-value
              map-options
              outlined
              dense
              options-dense
              class="filter-select"
            >
              <template #prepend>
                <q-icon name="filter_list" size="18px" color="grey-6" />
              </template>
            </q-select>

            <!-- Search Input -->
            <q-input
              v-model="searchTerm"
              outlined
              dense
              placeholder="Search name, position, ID..."
              class="search-employee-input"
              clearable
              @update:model-value="onSearchInput"
            >
              <template #prepend>
                <q-icon name="search" size="18px" color="grey-6" />
              </template>
            </q-input>

            <!-- Date Navigator Pill -->
            <div class="row items-center no-wrap bg-grey-1 rounded-borders q-pa-xs border-light date-nav-box">
              <q-btn
                flat
                dense
                round
                icon="chevron_left"
                size="sm"
                color="grey-7"
                @click="changeDate(-1)"
              >
                <q-tooltip class="bg-dark">Previous Day</q-tooltip>
              </q-btn>

              <div class="row items-center no-wrap cursor-pointer q-px-sm date-display-trigger">
                <span class="text-caption text-weight-bold font-mono text-dark date-nav-text">
                  {{ selectedDate }}
                </span>
                <q-icon name="calendar_month" size="16px" color="grey-7" class="q-ml-xs" />

                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date
                    v-model="selectedDate"
                    mask="YYYY-MM-DD"
                    @update:model-value="fetchAttendanceOverview"
                  >
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Close" color="primary" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </div>

              <q-btn
                flat
                dense
                round
                icon="chevron_right"
                size="sm"
                color="grey-7"
                @click="changeDate(1)"
              >
                <q-tooltip class="bg-dark">Next Day</q-tooltip>
              </q-btn>
            </div>
          </div>
        </q-card-section>

        <!-- Attendance Data Table with Detailed Punch Sessions -->
        <q-table
          :rows="filteredEmployeeRows"
          :columns="columns"
          row-key="control_no"
          flat
          :loading="loading"
          :rows-per-page-options="[10, 20, 50, 100]"
          v-model:pagination="pagination"
          v-model:selected="selectedEmployees"
          selection="multiple"
          class="attendance-pro-table"
          @row-click="handleEmployeeRowClick"
        >
          <!-- Employee Column: Full Name + Position -->
          <template #body-cell-employee="props">
            <q-td :props="props" class="text-left">
              <div>
                <div class="text-weight-bold text-dark employee-name-text">
                  {{ props.row.employee_name }}
                </div>
                <div class="text-caption text-grey-7 ellipsis" style="max-width: 220px;">
                  {{ props.row.designation || 'Staff Member' }}
                  <q-tooltip v-if="props.row.designation" class="bg-dark text-caption">
                    {{ props.row.designation }}
                  </q-tooltip>
                </div>
              </div>
            </q-td>
          </template>

          <!-- ControlNo(ID) Column -->
          <template #body-cell-control_no="props">
            <q-td :props="props" class="text-left font-mono">
              <span class="text-weight-bold text-grey-9">{{ props.row.control_no }}</span>
            </q-td>
          </template>

          <!-- AM In (Morning Arrival) -->
          <template #body-cell-am_in="props">
            <q-td :props="props" class="text-center font-mono">
              <div v-if="props.row.dtr?.am_arrival" class="row items-center justify-center no-wrap q-gutter-x-xs">
                <span :class="isRowLate(props.row) ? 'text-negative text-weight-bold' : 'text-dark text-weight-medium'">
                  {{ formatPunchTime(props.row.dtr.am_arrival) }}
                </span>
                <q-badge
                  v-if="isRowLate(props.row)"
                  color="red-1"
                  text-color="red-9"
                  class="q-px-xs font-mono text-weight-bold"
                  size="xs"
                >
                  +{{ props.row.dtr.late_minutes }}m
                </q-badge>
              </div>
              <span v-else class="text-grey-4">—</span>
            </q-td>
          </template>

          <!-- AM Out (Lunch Out) -->
          <template #body-cell-am_out="props">
            <q-td :props="props" class="text-center font-mono">
              <span v-if="props.row.dtr?.am_departure" class="text-dark text-weight-medium">
                {{ formatPunchTime(props.row.dtr.am_departure) }}
              </span>
              <span v-else class="text-grey-4">—</span>
            </q-td>
          </template>

          <!-- PM In (Lunch In) -->
          <template #body-cell-pm_in="props">
            <q-td :props="props" class="text-center font-mono">
              <span v-if="props.row.dtr?.pm_arrival" class="text-dark text-weight-medium">
                {{ formatPunchTime(props.row.dtr.pm_arrival) }}
              </span>
              <span v-else class="text-grey-4">—</span>
            </q-td>
          </template>

          <!-- PM Out (Afternoon Departure) -->
          <template #body-cell-pm_out="props">
            <q-td :props="props" class="text-center font-mono">
              <span v-if="props.row.dtr?.pm_departure" class="text-dark text-weight-medium">
                {{ formatPunchTime(props.row.dtr.pm_departure) }}
              </span>
              <span v-else class="text-grey-4">—</span>
            </q-td>
          </template>

          <!-- Rendered Hours -->
          <template #body-cell-hours="props">
            <q-td :props="props" class="text-center font-mono">
              <q-badge
                v-if="Number(props.row.dtr?.rendered_hours || 0) > 0"
                color="teal-1"
                text-color="teal-9"
                class="q-px-sm q-py-xs text-weight-bold"
              >
                {{ Number(props.row.dtr.rendered_hours).toFixed(1) }}
              </q-badge>
              <span v-else class="text-grey-4">—</span>
            </q-td>
          </template>

          <!-- Attendance Status Badge -->
          <template #body-cell-status="props">
            <q-td :props="props" class="text-center">
              <div class="row items-center justify-center no-wrap">
                <q-chip
                  dense
                  class="text-weight-bold text-caption q-my-none status-badge text-uppercase"
                  :color="getStatusBadgeColor(props.row.attendance_status)"
                  :text-color="getStatusBadgeTextColor(props.row.attendance_status)"
                >
                  {{ formatStatusText(props.row.attendance_status) }}
                  <q-tooltip v-if="props.row.dtr?.leave_type_code" class="bg-dark text-white">
                    Leave Type: {{ props.row.dtr.leave_type_code }}
                  </q-tooltip>
                </q-chip>
              </div>
            </q-td>
          </template>


          <!-- Empty State -->
          <template #no-data>
            <div class="full-width text-center q-py-xl text-grey-6">
              <q-icon name="person_off" size="48px" color="grey-4" />
              <div class="text-subtitle1 text-weight-bold q-mt-sm">No Attendance Records Found</div>
              <div class="text-caption">
                No personnel attendance records match your filter criteria for {{ formatFullDate(selectedDate) }}.
              </div>
            </div>
          </template>
        </q-table>
      </q-card>
    </div>

    <!-- Step 1: Quick Date Setup Dialog for Individual Employee DTR -->
    <q-dialog
      v-model="showSingleDtrSetupDialog"
      transition-show="scale"
      transition-hide="scale"
    >
      <q-card style="width: 440px; max-width: 95vw;" class="column no-wrap rounded-borders shadow-10 bg-white">
        <!-- Dialog Header Toolbar -->
        <q-toolbar class="bg-green-9 text-white q-py-xs shadow-1" style="height: 52px; min-height: 52px;">
          <q-avatar size="32px" color="white" text-color="green-10" icon="date_range" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold">Civil Service Form No. 48</div>
          <q-space />
          <q-btn icon="close" flat round dense text-color="white" v-close-popup>
            <q-tooltip class="bg-dark">Close</q-tooltip>
          </q-btn>
        </q-toolbar>

        <!-- Dialog Body -->
        <q-card-section class="q-pa-md bg-grey-1 column q-gutter-y-sm">
          <!-- Personnel Summary Chip/Card -->
          <div class="bg-white q-pa-sm rounded-borders shadow-1 row items-center justify-between" style="border: 1px solid #e0e0e0;">
            <div class="column">
              <span class="text-weight-bold text-dark text-body2">
                {{ singleDtrEmployee?.employee_name || 'Selected Personnel' }}
              </span>
              <span class="text-caption text-grey-7">
                {{ singleDtrEmployee?.designation || 'Staff Member' }}
              </span>
            </div>
            <div class="text-right font-mono">
              <span class="text-caption text-grey-6 block">Control No</span>
              <span class="text-weight-bold text-green-9 text-caption">{{ singleDtrEmployee?.control_no || '—' }}</span>
            </div>
          </div>

          <!-- Date Range Selector -->
          <div class="bg-white q-pa-sm rounded-borders shadow-1" style="border: 1px solid #e0e0e0;">
            <div class="row items-center justify-between q-mb-xs q-px-xs">
              <div class="row items-center text-weight-bold text-caption text-grey-9">
                <q-icon name="event" color="green-9" size="18px" class="q-mr-xs" />
                Coverage Date Range
              </div>
              <div class="row items-center q-gutter-x-xs">
                <q-badge
                  :color="normalizedSingleDtrCustomRange ? 'green-9' : 'grey-6'"
                  text-color="white"
                  class="font-mono text-caption text-weight-bold q-px-xs q-py-xs"
                >
                  {{ singleDtrRangeDisplayLabel }}
                </q-badge>
                <q-btn
                  v-if="singleDtrDateRange"
                  flat
                  dense
                  round
                  icon="close"
                  size="xs"
                  color="grey-6"
                  @click="singleDtrDateRange = null"
                >
                  <q-tooltip class="bg-dark">Clear date range</q-tooltip>
                </q-btn>
              </div>
            </div>

            <q-date
              v-model="singleDtrDatePickerModel"
              range
              mask="YYYY-MM-DD"
              color="green-9"
              minimal
              class="full-width no-shadow bg-white rounded-borders"
              style="border: 1px solid #e8f5e9;"
            />
          </div>
        </q-card-section>

        <!-- Dialog Footer Actions -->
        <q-card-actions align="right" class="bg-white q-pa-md" style="border-top: 1px solid #e0e0e0;">
          <q-btn
            unelevated
            color="green-9"
            text-color="white"
            icon="description"
            label="Generate & View DTR"
            no-caps
            class="text-weight-bolder q-px-md"
            :disable="!normalizedSingleDtrCustomRange"
            @click="confirmSingleDtrSetup"
          >
            <q-tooltip class="bg-dark">
              {{ !normalizedSingleDtrCustomRange ? 'Please select a coverage date range first' : 'Generate and preview Civil Service Form No. 48' }}
            </q-tooltip>
          </q-btn>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Civil Service Form No. 48 (DTR) Preview & Override Modal Dialog -->
    <q-dialog
      v-model="showDtrModal"
      :maximized="isDialogMaximized"
      transition-show="scale"
      transition-hide="scale"
      @hide="onDtrModalClose"
    >
      <q-card
        :style="isDialogMaximized ? 'width: 100vw; height: 100vh;' : 'width: 1080px; max-width: 96vw; max-height: 92vh;'"
        class="bg-grey-2 column no-wrap rounded-borders"
      >
        <q-bar class="bg-green-9 text-white q-py-sm no-print">
          <q-icon name="description" class="q-mr-xs" />
          <div class="text-weight-bold ellipsis" style="max-width: 650px;">
            {{ dtrModalHeaderTitle }}
          </div>
          <q-space />
          <q-btn
            dense
            flat
            :icon="isDialogMaximized ? 'fullscreen_exit' : 'fullscreen'"
            class="q-mr-xs"
            @click="isDialogMaximized = !isDialogMaximized"
          >
            <q-tooltip>{{ isDialogMaximized ? 'Exit Full Screen' : 'Toggle Full Screen' }}</q-tooltip>
          </q-btn>
          <q-btn dense flat icon="close" v-close-popup />
        </q-bar>

        <q-card-section class="col scroll q-pa-md flex flex-center">
          <div style="width: 100%; max-width: 1000px;" class="bg-white q-pa-md rounded-borders shadow-2">
            <DailyTimeRecordTable
              v-if="dtrData"
              ref="previewDtrRef"
              v-model:custom-date-range="dtrCustomRange"
              :records="dtrData.records"
              :employee="dtrData.employee"
              :period="dtrData.period"
              :summary="dtrData.summary"
              :department-heads="dtrData.department_heads"
              :loading="dtrLoading"
              @adjust-saved="onDtrOverrideSaved"
            />
            <div v-else-if="dtrLoading" class="q-pa-xl text-center">
              <q-spinner-dots color="green-9" size="48px" />
              <div class="text-subtitle2 text-grey-7 q-mt-md">Loading Daily Time Record...</div>
            </div>
            <div v-else-if="dtrErrorMessage" class="q-pa-xl text-center text-negative">
              <q-icon name="error_outline" size="48px" />
              <div class="text-subtitle1 text-weight-bold q-mt-sm">Unable to Load DTR</div>
              <div class="text-caption text-grey-7">{{ dtrErrorMessage }}</div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Centered Two-Column Modal Dialog for Batch DTR Printing -->
    <q-dialog
      v-model="showBulkDialog"
      transition-show="scale"
      transition-hide="scale"
    >
      <q-card style="width: 780px; max-width: 96vw; max-height: 92vh;" class="column no-wrap rounded-borders shadow-10 bg-white">
        <!-- Dialog Header Toolbar with balanced margins and vertical centering -->
        <q-toolbar class="bg-green-9 text-white q-py-xs shadow-1" style="height: 52px; min-height: 52px;">
          <q-avatar size="32px" color="white" text-color="green-10" icon="print" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold">Batch Print DTR — Civil Service Form No. 48</div>
          <q-space />
          <q-btn icon="close" flat round dense text-color="white" v-close-popup>
            <q-tooltip class="bg-dark">Close</q-tooltip>
          </q-btn>
        </q-toolbar>

        <!-- Dialog Body: Two-Column Layout -->
        <q-card-section class="col scroll q-pa-md bg-grey-1">
          <div class="row q-col-gutter-md">
            <!-- Left Column: Coverage Date Range -->
            <div class="col-12 col-sm-6">
              <div class="bg-white q-pa-sm rounded-borders shadow-1" style="border: 1px solid #e0e0e0;">
                <div class="row items-center justify-between q-mb-xs q-px-xs">
                  <div class="row items-center text-weight-bold text-caption text-grey-9">
                    <q-icon name="date_range" color="green-9" size="18px" class="q-mr-xs" />
                    Coverage Date Range
                  </div>
                  <div class="row items-center q-gutter-x-xs">
                    <q-badge
                      :color="normalizedBatchCustomRange ? 'green-9' : 'grey-6'"
                      text-color="white"
                      class="font-mono text-caption text-weight-bold q-px-xs q-py-xs"
                    >
                      {{ batchRangeDisplayLabel }}
                    </q-badge>
                    <q-btn
                      v-if="batchDateRange"
                      flat
                      dense
                      round
                      icon="close"
                      size="xs"
                      color="grey-6"
                      @click="batchDateRange = null"
                    >
                      <q-tooltip class="bg-dark">Clear date range</q-tooltip>
                    </q-btn>
                  </div>
                </div>

                <q-date
                  v-model="batchDatePickerModel"
                  range
                  mask="YYYY-MM-DD"
                  color="green-9"
                  minimal
                  class="full-width no-shadow bg-white rounded-borders"
                  style="border: 1px solid #e8f5e9;"
                />
              </div>
            </div>

            <!-- Right Column: Selected Personnel -->
            <div class="col-12 col-sm-6 column">
              <div class="bg-white q-pa-sm rounded-borders shadow-1 column full-height" style="border: 1px solid #e0e0e0; min-height: 350px;">
                <div class="row items-center justify-between q-mb-xs q-px-xs">
                  <div class="row items-center text-weight-bold text-caption text-grey-9">
                    <q-icon name="people" color="green-9" size="18px" class="q-mr-xs" />
                    Selected Personnel
                    <q-badge color="green-1" text-color="green-9" class="q-ml-xs text-weight-bold">
                      {{ selectedEmployees.length }}
                    </q-badge>
                  </div>
                  <div class="row items-center q-gutter-x-xs">
                    <q-btn
                      v-if="selectedEmployees.length < filteredEmployeeRows.length"
                      flat
                      dense
                      no-caps
                      size="xs"
                      color="green-9"
                      label="Select All"
                      @click="selectAllFilteredEmployees"
                    />
                    <q-btn
                      v-if="selectedEmployees.length > 0"
                      flat
                      dense
                      no-caps
                      size="xs"
                      color="negative"
                      label="Clear"
                      @click="selectedEmployees = []"
                    />
                  </div>
                </div>

                <!-- Empty State -->
                <div
                  v-if="selectedEmployees.length === 0"
                  class="col column items-center justify-center text-center q-pa-lg text-grey-6"
                >
                  <q-icon name="touch_app" size="36px" color="grey-4" class="q-mb-sm" />
                  <div class="text-subtitle2 text-weight-bold text-grey-8">No Personnel Selected</div>
                  <div class="text-caption text-grey-6 q-mb-md">Check personnel in the table to include them.</div>
                  <q-btn
                    outline
                    dense
                    color="green-9"
                    label="Select All Filtered"
                    no-caps
                    size="sm"
                    class="q-px-sm"
                    @click="selectAllFilteredEmployees"
                  />
                </div>

                <!-- List of Selected Employees -->
                <q-list v-else separator dense class="col scroll rounded-borders" style="max-height: 310px;">
                  <q-item
                    v-for="emp in selectedEmployees"
                    :key="emp.control_no"
                    class="q-py-xs q-px-xs items-center"
                  >
                    <q-item-section avatar style="min-width: 32px;">
                      <q-avatar size="26px" color="green-8" text-color="white" class="text-caption text-weight-bold">
                        {{ getInitials(emp.employee_name) }}
                      </q-avatar>
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-caption text-weight-bold ellipsis" style="max-width: 200px;">
                        {{ emp.employee_name }}
                      </q-item-label>
                      <q-item-label caption class="ellipsis text-grey-6" style="max-width: 200px;">
                        {{ emp.designation || `ID: ${emp.control_no}` }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-btn
                        flat
                        round
                        dense
                        icon="close"
                        size="xs"
                        color="grey-6"
                        @click.stop="removeEmployeeFromBatch(emp)"
                      >
                        <q-tooltip class="bg-dark">Remove from batch</q-tooltip>
                      </q-btn>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>
            </div>
          </div>
        </q-card-section>

        <!-- Dialog Footer Actions -->
        <q-card-actions align="right" class="bg-white q-pa-md no-print" style="border-top: 1px solid #e0e0e0;">
          <q-btn
            unelevated
            color="green-9"
            text-color="white"
            icon="print"
            :label="`Generate & Preview (${selectedEmployees.length})`"
            no-caps
            class="text-weight-bolder q-px-md"
            :loading="batchLoading"
            :disable="selectedEmployees.length === 0 || !normalizedBatchCustomRange"
            @click="openBatchPrintModal"
          >
            <q-tooltip class="bg-dark">
              {{ !normalizedBatchCustomRange ? 'Please select a coverage date range first' : 'Generate and preview CSC Form No. 48 for selected personnel' }}
            </q-tooltip>
          </q-btn>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Floating Re-open Button when Dialog is closed but personnel are selected -->
    <transition
      appear
      enter-active-class="animated fadeInRight"
      leave-active-class="animated fadeOutRight"
    >
      <div
        v-if="!showBulkDialog && selectedEmployees.length > 0"
        class="fixed-bottom-right q-ma-lg no-print"
        style="z-index: 1999;"
      >
        <q-btn
          elevated
          rounded
          color="green-9"
          text-color="white"
          icon="print"
          :label="`Print Selected DTR (${selectedEmployees.length})`"
          class="text-weight-bold shadow-6 q-px-md q-py-sm"
          no-caps
          @click="showBulkDialog = true"
        >
          <q-tooltip class="bg-dark">Open batch print configuration</q-tooltip>
        </q-btn>
      </div>
    </transition>

    <!-- Batch Civil Service Form No. 48 Print Preview Modal Dialog -->
    <q-dialog
      v-model="showBatchDtrModal"
      :maximized="isBatchDialogMaximized"
      transition-show="scale"
      transition-hide="scale"
    >
      <q-card
        :style="isBatchDialogMaximized ? 'width: 100vw; height: 100vh;' : 'width: 1100px; max-width: 98vw; max-height: 94vh;'"
        class="bg-grey-2 column no-wrap rounded-borders"
      >
        <q-bar class="bg-green-9 text-white q-py-sm no-print">
          <q-icon name="print" class="q-mr-xs" />
          <div class="row items-center no-wrap text-weight-bold ellipsis" style="max-width: 650px;">
            <q-spinner-dots v-if="batchLoading" size="16px" class="q-mr-xs" />
            <span>
              Batch CSC Form No. 48 Preview —
              <template v-if="batchLoading">
                Preparing {{ selectedEmployees.length }} Personnel...
              </template>
              <template v-else>
                {{ batchEmployeesDtr.length }} Personnel
              </template>
              ({{ batchRangeDisplayLabel }})
            </span>
          </div>
          <q-space />
          <q-btn
            dense
            unelevated
            color="white"
            text-color="green-10"
            icon="print"
            :loading="batchLoading"
            :disable="batchLoading || batchEmployeesDtr.length === 0"
            :label="batchLoading ? 'Preparing...' : `Print All (${batchEmployeesDtr.length} Copies)`"
            class="q-mr-sm text-weight-bolder"
            no-caps
            size="sm"
            @click="executeBatchPrint"
          >
            <template #loading>
              <q-spinner-dots size="16px" />
              <span class="q-ml-xs">Generating...</span>
            </template>
          </q-btn>
          <q-btn
            dense
            flat
            :icon="isBatchDialogMaximized ? 'fullscreen_exit' : 'fullscreen'"
            class="q-mr-xs"
            @click="isBatchDialogMaximized = !isBatchDialogMaximized"
          >
            <q-tooltip>{{ isBatchDialogMaximized ? 'Exit Full Screen' : 'Toggle Full Screen' }}</q-tooltip>
          </q-btn>
          <q-btn dense flat icon="close" v-close-popup />
        </q-bar>

        <q-card-section class="col scroll q-pa-md">
          <div v-if="batchLoading" class="full-width q-pa-xl text-center">
            <q-spinner-dots color="green-9" size="48px" />
            <div class="text-subtitle1 text-weight-bold text-grey-8 q-mt-md">
              Generating CSC Form No. 48 for {{ selectedEmployees.length }} Personnel...
            </div>
            <div class="text-caption text-grey-6">Calculating punches, rendered hours, and accomplishments</div>
          </div>

          <div v-else-if="batchEmployeesDtr.length === 0" class="full-width q-pa-xl text-center text-grey-7">
            <q-icon name="error_outline" size="48px" color="grey-5" />
            <div class="text-subtitle1 text-weight-bold q-mt-md">No Records Found</div>
            <div class="text-caption">No attendance logs found for the selected personnel and date range.</div>
          </div>

          <!-- Printable Container with All Sheets -->
          <div v-else id="batch-print-container" ref="batchPrintContainerRef" class="batch-sheets-list">
            <div
              v-for="(item, idx) in batchEmployeesDtr"
              :key="item.employee?.control_no || idx"
              class="batch-employee-sheet-wrapper q-mb-lg"
            >
              <!-- Screen sheet header badge -->
              <div class="no-print row items-center justify-between q-px-sm q-py-xs q-mb-xs bg-grey-3 rounded-borders text-caption text-weight-bold text-dark">
                <span>
                  <q-badge color="green-9" text-color="white" class="q-mr-xs">#{{ idx + 1 }}</q-badge>
                  {{ item.employee?.name }} (ID: {{ item.employee?.control_no }})
                </span>
                <span>{{ item.employee?.office || item.employee?.designation }}</span>
              </div>

              <div style="background: #ffffff; padding: 12px; border-radius: 6px;" class="shadow-1">
                <DailyTimeRecordTable
                  :records="item.records"
                  :employee="item.employee"
                  :period="batchPeriod"
                  :summary="item.summary"
                  :department-heads="batchDepartmentHeads"
                  :custom-date-range="normalizedBatchCustomRange"
                  :hide-toolbar="true"
                />
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import DailyTimeRecordTable from 'src/components/admin/DailyTimeRecordTable.vue'
import { printBatchCscForm48 } from 'src/utils/csc-form-48-print'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()

function getLocalTodayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const loading = ref(false)
const todayStr = getLocalTodayStr()
const selectedDate = ref(todayStr)
const searchTerm = ref('')
const activeFilter = ref('ALL') // 'ALL', 'PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE'

const stats = reactive({
  total: 0,
  present: 0,
  late: 0,
  on_leave: 0,
  absent: 0,
})

const employeeRows = ref([])

const pagination = ref({
  page: 1,
  rowsPerPage: 15,
  sortBy: 'employee_name',
  descending: false,
})

const columns = [
  { name: 'control_no', label: 'Control No', field: 'control_no', align: 'left', sortable: true },
  { name: 'employee', label: 'Employee', field: 'employee_name', align: 'left', sortable: true },
  { name: 'am_in', label: 'AM In', align: 'center' },
  { name: 'am_out', label: 'AM Out', align: 'center' },
  { name: 'pm_in', label: 'PM In', align: 'center' },
  { name: 'pm_out', label: 'PM Out', align: 'center' },
  { name: 'hours', label: 'Hours', align: 'center' },
  { name: 'status', label: 'Status', field: 'attendance_status', align: 'center', sortable: true },
]

const filterOptions = computed(() => [
  { label: `All (${stats.total})`, value: 'ALL' },
  { label: `Present (${stats.present})`, value: 'PRESENT' },
  { label: `Late (${stats.late})`, value: 'LATE' },
  { label: `Absent (${stats.absent})`, value: 'ABSENT' },
  { label: `On Leave (${stats.on_leave})`, value: 'ON_LEAVE' },
])

/**
 * Filtered rows based on active segmented filter
 */
const filteredEmployeeRows = computed(() => {
  if (activeFilter.value === 'ALL') return employeeRows.value

  return employeeRows.value.filter((row) => {
    const status = String(row.attendance_status || '').toLowerCase().trim()
    if (activeFilter.value === 'PRESENT') {
      return status === 'on time' || status === 'present' || status === 'late'
    }
    if (activeFilter.value === 'LATE') {
      return status === 'late'
    }
    if (activeFilter.value === 'ABSENT') {
      return status === 'absent'
    }
    if (activeFilter.value === 'ON_LEAVE') {
      return (
        status === 'on leave' ||
        status.startsWith('on leave') ||
        status.startsWith('on_leave') ||
        status === 'half day'
      )
    }
    return true
  })
})

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatFullDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatPunchTime(timeStr) {
  if (!timeStr || String(timeStr).trim() === '') return '—'
  const parts = String(timeStr).split(':')
  if (parts.length >= 2) {
    let h = parseInt(parts[0], 10)
    const m = parts[1]
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12
    h = h ? h : 12
    return `${h}:${m} ${ampm}`
  }
  return timeStr
}

function isRowLate(row) {
  return Number(row.dtr?.late_minutes || 0) > 0
}

function formatStatusText(status) {
  const norm = String(status || 'ABSENT').trim().toUpperCase()
  if (norm === 'ON TIME') return 'PRESENT'
  if (norm === 'ON_LEAVE_AM' || norm === 'ON LEAVE (AM)' || norm === 'ON LEAVE AM') return 'ON LEAVE (AM)'
  if (norm === 'ON_LEAVE_PM' || norm === 'ON LEAVE (PM)' || norm === 'ON LEAVE PM') return 'ON LEAVE (PM)'
  return norm
}

function getStatusBadgeColor(status) {
  const norm = String(status || '').toLowerCase().trim()
  if (norm === 'on time' || norm === 'present') return 'green-1'
  if (norm === 'late') return 'amber-1'
  if (norm === 'absent') return 'red-1'
  if (norm.startsWith('on leave') || norm.startsWith('on_leave')) return 'blue-1'
  if (norm === 'half day') return 'orange-1'
  if (norm === 'rest day') return 'grey-2'
  return 'red-1'
}

function getStatusBadgeTextColor(status) {
  const norm = String(status || '').toLowerCase().trim()
  if (norm === 'on time' || norm === 'present') return 'green-9'
  if (norm === 'late') return 'amber-9'
  if (norm === 'absent') return 'red-9'
  if (norm.startsWith('on leave') || norm.startsWith('on_leave')) return 'blue-9'
  if (norm === 'half day') return 'orange-9'
  if (norm === 'rest day') return 'grey-8'
  return 'red-9'
}

function changeDate(deltaDays) {
  if (!selectedDate.value) {
    selectedDate.value = getLocalTodayStr()
  }
  const parts = selectedDate.value.split('-').map(Number)
  const d = new Date(parts[0], parts[1] - 1, parts[2] + deltaDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  selectedDate.value = `${y}-${m}-${day}`
  fetchAttendanceOverview()
}

let searchTimer = null
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchAttendanceOverview()
  }, 300)
}

/**
 * Fetch Department Attendance Overview
 */
async function fetchAttendanceOverview() {
  loading.value = true
  try {
    const params = {
      date: selectedDate.value,
    }
    if (searchTerm.value) {
      params.search = searchTerm.value
    }

    const response = await api.get('/attendance/dtr', { params })
    const data = response.data

    employeeRows.value = data.employees || []
    stats.total = data.stats?.total || 0
    stats.present = data.stats?.present || 0
    stats.late = data.stats?.late || 0
    stats.on_leave = data.stats?.on_leave || 0
    stats.absent = data.stats?.absent || 0
  } catch (err) {
    console.error('Failed to fetch attendance overview:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to load attendance records.',
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}

// =========================================================
// DTR MODAL & TIME OVERRIDE STATE & LOGIC
// =========================================================
const showSingleDtrSetupDialog = ref(false)
const singleDtrEmployee = ref(null)
const singleDtrDateRange = ref(null)

const singleDtrDatePickerModel = computed({
  get() {
    return singleDtrDateRange.value
  },
  set(val) {
    if (!val) {
      singleDtrDateRange.value = null
      return
    }
    singleDtrDateRange.value = typeof val === 'string' ? { from: val, to: val } : val
  },
})

const normalizedSingleDtrCustomRange = computed(() => {
  const val = singleDtrDateRange.value
  if (!val) return null
  if (typeof val === 'string') {
    return { from: val, to: val }
  }
  const from = val?.from
  const to = val?.to || from
  if (!from) return null
  return from <= to ? { from, to } : { from: to, to: from }
})

const singleDtrRangeDisplayLabel = computed(() => {
  const range = normalizedSingleDtrCustomRange.value
  if (!range) return 'Select Date Range'
  const { from, to } = range
  try {
    const d1 = new Date(`${from}T00:00:00`)
    const d2 = new Date(`${to}T00:00:00`)
    const sameYear = d1.getFullYear() === d2.getFullYear()
    const f1 = d1.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' }),
    })
    const f2 = d2.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return from === to ? f2 : `${f1} – ${f2}`
  } catch {
    return `${from} – ${to}`
  }
})

const showDtrModal = ref(false)
const isDialogMaximized = ref(false)
const selectedDtrEmployee = ref(null)
const dtrLoading = ref(false)
const dtrErrorMessage = ref('')
const dtrData = ref(null)
const previewDtrRef = ref(null)

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function getMonthName(monthNumber) {
  return MONTH_NAMES[(Number(monthNumber) || 1) - 1] || 'January'
}

function buildMonthRangeForDate(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date()
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const m = String(month).padStart(2, '0')
  const lastDay = String(new Date(year, month, 0).getDate()).padStart(2, '0')
  return {
    from: `${year}-${m}-01`,
    to: `${year}-${m}-${lastDay}`,
  }
}

const dtrCustomRange = ref(buildMonthRangeForDate(todayStr))

const normalizedDtrCustomRange = computed(() => {
  const val = dtrCustomRange.value || buildMonthRangeForDate(todayStr)
  if (typeof val === 'string') {
    return { from: val, to: val }
  }
  const from = val?.from || buildMonthRangeForDate(todayStr).from
  const to = val?.to || from
  return from <= to ? { from, to } : { from: to, to: from }
})

const dtrModalEmployeeName = computed(() => {
  return dtrData.value?.employee?.name || selectedDtrEmployee.value?.employee_name || 'Employee'
})

const dtrCustomRangeLabel = computed(() => {
  const { from, to } = normalizedDtrCustomRange.value
  try {
    const d1 = new Date(`${from}T00:00:00`)
    const d2 = new Date(`${to}T00:00:00`)
    const sameYear = d1.getFullYear() === d2.getFullYear()
    const f1 = d1.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' }),
    })
    const f2 = d2.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return from === to ? f2 : `${f1} – ${f2}`
  } catch {
    return `${from} – ${to}`
  }
})

const isDtrEmployeeContractual = computed(() => {
  const emp = dtrData.value?.employee || selectedDtrEmployee.value
  if (!emp) return false
  if (emp.is_contractual !== undefined) {
    return Boolean(emp.is_contractual)
  }
  const status = String(emp.employment_status || emp.status || '').toUpperCase().trim()
  return status === 'CONTRACTUAL'
})

const dtrModalHeaderTitle = computed(() => {
  const formTitle = isDtrEmployeeContractual.value
    ? 'Civil Service Form No. 48 & Accomplishment Report'
    : 'Civil Service Form No. 48 (Daily Time Record)'
  return `${formTitle} — ${dtrModalEmployeeName.value} (${dtrCustomRangeLabel.value})`
})

watch(
  () => [normalizedDtrCustomRange.value.from, normalizedDtrCustomRange.value.to],
  () => {
    if (showDtrModal.value && selectedDtrEmployee.value?.control_no) {
      fetchEmployeeDtr(selectedDtrEmployee.value.control_no)
    }
  }
)

/**
 * Fetch Employee Monthly DTR Record
 */
async function fetchEmployeeDtr(controlNo) {
  if (!controlNo) return
  dtrLoading.value = true
  dtrErrorMessage.value = ''

  try {
    const { from, to } = normalizedDtrCustomRange.value
    const [fromY, fromM] = from.split('-').map(Number)
    const [toY, toM] = to.split('-').map(Number)

    const year = fromY || new Date().getFullYear()
    const month = fromM || new Date().getMonth() + 1

    const params = {
      month,
      year,
    }

    if (fromY && fromM && toY && toM) {
      const startPadM = String(fromM).padStart(2, '0')
      const endPadM = String(toM).padStart(2, '0')
      const endMaxDay = String(new Date(toY, toM, 0).getDate()).padStart(2, '0')
      params.start_date = `${fromY}-${startPadM}-01`
      params.end_date = `${toY}-${endPadM}-${endMaxDay}`
    }

    const res = await api.get(`/attendance/dtr/employee/${controlNo}`, { params })

    if (res.data?.period) {
      res.data.period.year = year
      res.data.period.month = month
      res.data.period.month_name = getMonthName(month)
      res.data.period.days_in_month = new Date(year, month, 0).getDate()
    }

    dtrData.value = res.data
  } catch (err) {
    console.error('Failed to fetch employee DTR:', err)
    dtrErrorMessage.value = err.response?.data?.message || 'Failed to load employee Daily Time Record.'
    $q.notify({
      type: 'negative',
      message: dtrErrorMessage.value,
      position: 'top',
    })
  } finally {
    dtrLoading.value = false
  }
}

/**
 * Open Employee DTR Setup Dialog (Step 1: Choose Date Range)
 */
function openEmployeeDtr(employee) {
  if (!employee || !employee.control_no) return
  singleDtrEmployee.value = employee
  singleDtrDateRange.value = null
  showSingleDtrSetupDialog.value = true
}

/**
 * Confirm Single DTR Date Range & Open Preview Modal (Step 2: Generate DTR)
 */
function confirmSingleDtrSetup() {
  if (!singleDtrEmployee.value || !normalizedSingleDtrCustomRange.value) return
  const range = normalizedSingleDtrCustomRange.value
  selectedDtrEmployee.value = singleDtrEmployee.value
  dtrCustomRange.value = { from: range.from, to: range.to }
  dtrData.value = null
  showSingleDtrSetupDialog.value = false
  showDtrModal.value = true
  fetchEmployeeDtr(singleDtrEmployee.value.control_no)
}

/**
 * Handle Employee Row Click in Attendance Table
 */
function handleEmployeeRowClick(evt, row) {
  if (
    evt?.target?.closest('.q-btn') ||
    evt?.target?.closest('.q-menu') ||
    evt?.target?.closest('.q-checkbox') ||
    evt?.target?.closest('.q-table__select')
  ) {
    return
  }
  openEmployeeDtr(row)
}

/**
 * Callback when DTR Override is Saved
 */
function onDtrOverrideSaved() {
  $q.notify({
    type: 'positive',
    message: 'Attendance time override saved successfully.',
    position: 'top',
  })
  if (selectedDtrEmployee.value?.control_no) {
    fetchEmployeeDtr(selectedDtrEmployee.value.control_no)
  }
  fetchAttendanceOverview()
}

/**
 * Close DTR Modal & Clean Query Params
 */
function onDtrModalClose() {
  showDtrModal.value = false
  if (route.query.employeeId) {
    router.replace({ name: 'admin-attendance' })
  }
}

// =========================================================
// BATCH DTR PRINTING STATE & LOGIC
// =========================================================
const selectedEmployees = ref([])
const showBulkDialog = ref(false)
const showBatchDtrModal = ref(false)
const isBatchDialogMaximized = ref(false)
const batchLoading = ref(false)
const batchEmployeesDtr = ref([])
const batchPeriod = ref({})
const batchDepartmentHeads = ref([])
const batchPrintContainerRef = ref(null)

// Close bulk dialog if selection is cleared
watch(
  () => selectedEmployees.value.length,
  (newLen) => {
    if (newLen === 0) {
      showBulkDialog.value = false
    }
  }
)

const batchDateRange = ref(null)

const batchDatePickerModel = computed({
  get() {
    return batchDateRange.value
  },
  set(val) {
    if (!val) {
      batchDateRange.value = null
      return
    }
    batchDateRange.value = typeof val === 'string' ? { from: val, to: val } : val
  },
})

const normalizedBatchCustomRange = computed(() => {
  const val = batchDateRange.value
  if (!val) return null
  if (typeof val === 'string') {
    return { from: val, to: val }
  }
  const from = val?.from
  const to = val?.to || from
  if (!from) return null
  return from <= to ? { from, to } : { from: to, to: from }
})

const batchRangeDisplayLabel = computed(() => {
  const range = normalizedBatchCustomRange.value
  if (!range) return 'Select Date Range'
  const { from, to } = range
  try {
    const d1 = new Date(`${from}T00:00:00`)
    const d2 = new Date(`${to}T00:00:00`)
    const sameYear = d1.getFullYear() === d2.getFullYear()
    const f1 = d1.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' }),
    })
    const f2 = d2.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return from === to ? f2 : `${f1} – ${f2}`
  } catch {
    return `${from} – ${to}`
  }
})

function selectAllFilteredEmployees() {
  selectedEmployees.value = [...filteredEmployeeRows.value]
}

function removeEmployeeFromBatch(emp) {
  selectedEmployees.value = selectedEmployees.value.filter(
    (e) => e.control_no !== emp.control_no
  )
}


async function openBatchPrintModal() {
  if (selectedEmployees.value.length === 0) {
    $q.notify({
      type: 'warning',
      message: 'Please select at least one employee to print DTR.',
      position: 'top',
    })
    return
  }

  if (!normalizedBatchCustomRange.value) {
    $q.notify({
      type: 'warning',
      message: 'Please select a coverage date range first.',
      position: 'top',
    })
    return
  }

  showBatchDtrModal.value = true
  batchLoading.value = true
  batchEmployeesDtr.value = []

  try {
    const { from, to } = normalizedBatchCustomRange.value
    const [fromY, fromM] = from.split('-').map(Number)

    const payload = {
      control_nos: selectedEmployees.value.map((e) => e.control_no),
      start_date: from,
      end_date: to,
      year: fromY,
      month: fromM,
    }

    const res = await api.post('/attendance/dtr/bulk-print', payload)
    batchPeriod.value = res.data?.period || {}
    batchDepartmentHeads.value = res.data?.department_heads || []
    batchEmployeesDtr.value = res.data?.employees_dtr || []
  } catch (err) {
    console.error('Failed to load batch DTR records:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to generate batch DTR records.',
      position: 'top',
    })
  } finally {
    batchLoading.value = false
  }
}

function executeBatchPrint() {
  if (!batchPrintContainerRef.value) return
  const sheets = batchPrintContainerRef.value.querySelectorAll('.csc-sheet-wrapper')
  if (sheets.length === 0) {
    $q.notify({
      type: 'warning',
      message: 'No printable DTR sheets available to print.',
      position: 'top',
    })
    return
  }
  printBatchCscForm48({
    elements: Array.from(sheets),
    title: `CSC Form 48 Batch (${batchEmployeesDtr.value.length} Personnel)`,
  })
}

onMounted(() => {
  fetchAttendanceOverview()
  if (route.query.employeeId) {
    openEmployeeDtr({ control_no: String(route.query.employeeId) })
  }
})
</script>

<style scoped>
.attendance-overview-page {
  max-width: 1400px;
  margin: 0 auto;
}

.executive-header {
  padding-bottom: 4px;
}

.header-icon-avatar {
  border-radius: 8px;
}

.page-title {
  letter-spacing: -0.02em;
}

.top-reload-bar {
  box-shadow: 0 1px 4px rgba(46, 125, 50, 0.25);
}

.content-reloading {
  opacity: 0.55;
  pointer-events: none;
  transition: opacity 0.25s ease-in-out;
}

.skeleton-suite {
  animation: fadeIn 0.2s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* KPI Cards */
.stat-kpi-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.stat-kpi-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-kpi-value {
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.2;
  font-family: inherit;
}

/* Main Table Card */
.table-card {
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.border-bottom {
  border-bottom: 1px solid #f1f5f9;
}

.border-top {
  border-top: 1px solid #f1f5f9;
}

.filter-select {
  min-width: 170px;
}

.filter-select :deep(.q-field__control) {
  height: 34px;
  border-radius: 6px;
}

.search-employee-input {
  min-width: 220px;
}

.search-employee-input :deep(.q-field__control) {
  height: 34px;
  border-radius: 6px;
}

.date-nav-box {
  border: 1px solid #e2e8f0;
  height: 34px;
}

.date-display-trigger {
  height: 26px;
  line-height: 26px;
  border-radius: 4px;
  transition: background-color 0.15s ease;
  user-select: none;
}

.date-display-trigger:hover {
  background-color: #e2e8f0;
}

.date-nav-text {
  font-size: 0.85rem;
  letter-spacing: -0.01em;
}

/* Table Styling */
.attendance-pro-table :deep(thead tr th) {
  background-color: #f8fafc;
  color: #334155;
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 12px 14px;
  border-bottom: 1.5px solid #e2e8f0;
}

.attendance-pro-table :deep(tbody tr td) {
  font-size: 0.88rem;
  color: #1e293b;
  padding: 10px 14px;
  border-bottom: 1px solid #f1f5f9;
}

.attendance-pro-table :deep(tbody tr) {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.attendance-pro-table :deep(tbody tr:hover td) {
  background-color: #f0fdf4 !important;
}

.employee-row-avatar {
  border-radius: 8px;
}

.employee-name-text {
  font-size: 0.92rem;
  line-height: 1.25;
}

.position-text {
  font-size: 0.85rem;
}

.status-badge {
  padding: 2px 8px;
}

.action-icon-btn {
  background-color: #f8fafc;
  transition: all 0.2s ease;
}

.action-icon-btn:hover {
  background-color: #e2e8f0;
  transform: scale(1.08);
}

</style>
