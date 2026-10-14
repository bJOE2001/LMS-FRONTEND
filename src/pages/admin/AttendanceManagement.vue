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

            <!-- Batch DTR Print Button -->
            <q-btn
              unelevated
              dense
              color="green-9"
              icon="print"
              label="Batch Print DTR"
              no-caps
              class="text-weight-bold q-px-sm"
              style="height: 34px; border-radius: 6px;"
              @click="openBatchPrintSetup"
            >
              <q-tooltip class="bg-dark">Select personnel & print Civil Service Form 48 in batch</q-tooltip>
            </q-btn>
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
          <!-- Employee Column: Avatar initials + Full Name + Control No -->
          <template #body-cell-employee="props">
            <q-td :props="props" class="text-left">
              <div class="row items-center no-wrap">
                <q-avatar size="38px" color="green-1" text-color="green-9" class="q-mr-sm text-weight-bold employee-row-avatar">
                  {{ getInitials(props.row.employee_name) }}
                </q-avatar>
                <div>
                  <div class="text-weight-bold text-dark employee-name-text">
                    {{ props.row.employee_name }}
                  </div>
                  <div class="text-caption text-grey-6 font-mono q-mt-xs">
                    ID: {{ props.row.control_no }}
                  </div>
                </div>
              </div>
            </q-td>
          </template>

          <!-- Designation / Position Column -->
          <template #body-cell-designation="props">
            <q-td :props="props" class="text-left">
              <div class="text-weight-medium text-dark position-text ellipsis cursor-pointer" style="max-width: 180px;">
                {{ props.row.designation || 'Staff Member' }}
                <q-tooltip class="bg-dark text-caption" anchor="top middle" self="bottom middle" :offset="[0, 6]">
                  {{ props.row.designation || 'Staff Member' }}
                </q-tooltip>
              </div>
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
                {{ Number(props.row.dtr.rendered_hours).toFixed(1) }} hrs
              </q-badge>
              <span v-else class="text-grey-4">—</span>
            </q-td>
          </template>

          <!-- Attendance Status Badge -->
          <template #body-cell-status="props">
            <q-td :props="props" class="text-center">
              <div class="row items-center justify-center no-wrap q-gutter-x-xs">
                <q-chip
                  dense
                  class="text-weight-bold text-caption q-my-none status-badge"
                  :color="getStatusBadgeColor(props.row.attendance_status)"
                  :text-color="getStatusBadgeTextColor(props.row.attendance_status)"
                >
                  <q-icon :name="getStatusIcon(props.row.attendance_status)" size="14px" class="q-mr-xs" />
                  {{ props.row.attendance_status || 'Absent' }}
                </q-chip>

                <!-- Adjusted indicator -->
                <q-badge
                  v-if="props.row.dtr?.is_adjusted"
                  color="purple-1"
                  text-color="purple-9"
                  class="q-ml-xs text-caption font-mono"
                  label="Adj"
                >
                  <q-tooltip class="bg-dark">Adjusted: {{ props.row.dtr.adjustment_reason || 'Manual override' }}</q-tooltip>
                </q-badge>
              </div>
            </q-td>
          </template>

          <!-- Action Column -->
          <template #body-cell-action="props">
            <q-td :props="props" class="text-right">
              <div class="row items-center justify-end no-wrap">
                <!-- View Monthly DTR Details & Override -->
                <q-btn
                  flat
                  round
                  dense
                  size="sm"
                  color="green-9"
                  icon="visibility"
                  class="action-icon-btn"
                  @click.stop="openEmployeeDtr(props.row)"
                >
                  <q-tooltip class="bg-dark">View DTR & Override</q-tooltip>
                </q-btn>
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
            Civil Service Form No. 48 & Accomplishment Report — {{ dtrModalEmployeeName }} ({{ dtrCustomRangeLabel }})
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

    <!-- Floating Bottom Bulk Action Bar for Batch DTR Printing -->
    <transition
      appear
      enter-active-class="animated fadeInUp"
      leave-active-class="animated fadeOutDown"
    >
      <div
        v-if="selectedEmployees.length > 0"
        class="bulk-action-bar fixed-bottom row items-center justify-between q-pa-sm q-px-md shadow-10 no-print"
      >
        <div class="row items-center q-gutter-x-md">
          <q-badge color="white" text-color="green-9" class="text-weight-bold text-subtitle2 q-px-sm q-py-xs shadow-1">
            <q-icon name="checklist" size="18px" class="q-mr-xs" />
            {{ selectedEmployees.length }} {{ selectedEmployees.length === 1 ? 'personnel' : 'personnel' }} selected
          </q-badge>

          <!-- Cutoff Range Quick Presets -->
          <div class="row items-center q-gutter-x-xs cutoff-preset-group">
            <span class="text-caption text-white text-weight-medium q-mr-xs">Print Period:</span>
            <q-btn
              dense
              unelevated
              size="sm"
              :color="selectedCutoffPreset === '1st' ? 'white' : 'green-8'"
              :text-color="selectedCutoffPreset === '1st' ? 'green-10' : 'white'"
              label="1st Cutoff (1–15)"
              class="text-weight-bold q-px-sm"
              @click="applyCutoffPreset('1st')"
            />
            <q-btn
              dense
              unelevated
              size="sm"
              :color="selectedCutoffPreset === '2nd' ? 'white' : 'green-8'"
              :text-color="selectedCutoffPreset === '2nd' ? 'green-10' : 'white'"
              label="2nd Cutoff (16–End)"
              class="text-weight-bold q-px-sm"
              @click="applyCutoffPreset('2nd')"
            />
            <q-btn
              dense
              unelevated
              size="sm"
              :color="selectedCutoffPreset === 'month' ? 'white' : 'green-8'"
              :text-color="selectedCutoffPreset === 'month' ? 'green-10' : 'white'"
              label="Full Month"
              class="text-weight-bold q-px-sm"
              @click="applyCutoffPreset('month')"
            />
          </div>

          <!-- Date Range Trigger -->
          <div class="bulk-date-trigger row items-center no-wrap bg-white text-dark q-px-sm rounded-borders cursor-pointer">
            <q-icon name="date_range" size="16px" color="green-9" class="q-mr-xs" />
            <span class="text-caption text-weight-bold font-mono">{{ batchRangeDisplayLabel }}</span>
            <q-icon name="arrow_drop_down" size="18px" color="grey-7" />

            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
              <q-date
                v-model="batchDatePickerModel"
                range
                mask="YYYY-MM-DD"
                color="green-9"
                minimal
                @update:model-value="selectedCutoffPreset = 'custom'"
              >
                <div class="row items-center justify-end">
                  <q-btn v-close-popup label="Apply" color="green-9" flat />
                </div>
              </q-date>
            </q-popup-proxy>
          </div>
        </div>

        <!-- Action Buttons: Print Batch & Clear -->
        <div class="row items-center q-gutter-x-sm">
          <q-btn
            flat
            dense
            color="white"
            label="Clear Selection"
            icon="close"
            no-caps
            size="sm"
            @click="selectedEmployees = []"
          />
          <q-btn
            unelevated
            color="white"
            text-color="green-10"
            icon="print"
            :label="`Print DTR (${selectedEmployees.length})`"
            no-caps
            class="text-weight-bolder q-px-md"
            :loading="batchLoading"
            @click="openBatchPrintModal"
          >
            <q-tooltip>Print CSC Form No. 48 for selected personnel</q-tooltip>
          </q-btn>
        </div>
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
          <div class="text-weight-bold ellipsis" style="max-width: 650px;">
            Batch CSC Form No. 48 Preview — {{ batchEmployeesDtr.length }} Personnel ({{ batchRangeDisplayLabel }})
          </div>
          <q-space />
          <q-btn
            dense
            unelevated
            color="white"
            text-color="green-10"
            icon="print"
            :label="`Print All (${batchEmployeesDtr.length} Copies)`"
            class="q-mr-sm text-weight-bolder"
            no-caps
            size="sm"
            @click="executeBatchPrint"
          />
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
  { name: 'employee', label: 'Employee', field: 'employee_name', align: 'left', sortable: true },
  { name: 'designation', label: 'Position', field: 'designation', align: 'left', sortable: true },
  { name: 'am_in', label: 'AM In', align: 'center' },
  { name: 'am_out', label: 'AM Out', align: 'center' },
  { name: 'pm_in', label: 'PM In', align: 'center' },
  { name: 'pm_out', label: 'PM Out', align: 'center' },
  { name: 'hours', label: 'Hours', align: 'center' },
  { name: 'status', label: 'Status', field: 'attendance_status', align: 'center', sortable: true },
  { name: 'action', label: 'Actions', align: 'right' },
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
      return status === 'on leave' || status === 'half day'
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

function getStatusBadgeColor(status) {
  const norm = String(status || '').toLowerCase().trim()
  if (norm === 'on time' || norm === 'present') return 'green-1'
  if (norm === 'late') return 'amber-1'
  if (norm === 'absent') return 'red-1'
  if (norm === 'on leave') return 'blue-1'
  if (norm === 'half day') return 'orange-1'
  if (norm === 'rest day') return 'grey-2'
  return 'red-1'
}

function getStatusBadgeTextColor(status) {
  const norm = String(status || '').toLowerCase().trim()
  if (norm === 'on time' || norm === 'present') return 'green-9'
  if (norm === 'late') return 'amber-9'
  if (norm === 'absent') return 'red-9'
  if (norm === 'on leave') return 'blue-9'
  if (norm === 'half day') return 'orange-9'
  if (norm === 'rest day') return 'grey-8'
  return 'red-9'
}

function getStatusIcon(status) {
  const norm = String(status || '').toLowerCase().trim()
  if (norm === 'on time' || norm === 'present') return 'check_circle'
  if (norm === 'late') return 'schedule'
  if (norm === 'absent') return 'cancel'
  if (norm === 'on leave') return 'beach_access'
  if (norm === 'half day') return 'timelapse'
  return 'help_outline'
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
 * Open Employee DTR Preview Modal
 */
function openEmployeeDtr(employee) {
  if (!employee || !employee.control_no) return
  selectedDtrEmployee.value = employee
  dtrCustomRange.value = buildMonthRangeForDate(selectedDate.value)
  dtrData.value = null
  showDtrModal.value = true
  fetchEmployeeDtr(employee.control_no)
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
const showBatchDtrModal = ref(false)
const isBatchDialogMaximized = ref(false)
const batchLoading = ref(false)
const batchEmployeesDtr = ref([])
const batchPeriod = ref({})
const batchDepartmentHeads = ref([])
const batchPrintContainerRef = ref(null)

const selectedCutoffPreset = ref('month') // '1st', '2nd', 'month', 'custom'

function getCutoffRange(preset, baseDateStr) {
  const d = baseDateStr ? new Date(baseDateStr + 'T00:00:00') : new Date()
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const mStr = String(m).padStart(2, '0')
  const lastDay = new Date(y, m, 0).getDate()
  const lastDayStr = String(lastDay).padStart(2, '0')

  if (preset === '1st') {
    return { from: `${y}-${mStr}-01`, to: `${y}-${mStr}-15` }
  }
  if (preset === '2nd') {
    return { from: `${y}-${mStr}-16`, to: `${y}-${mStr}-${lastDayStr}` }
  }
  return { from: `${y}-${mStr}-01`, to: `${y}-${mStr}-${lastDayStr}` }
}

const batchDateRange = ref(getCutoffRange('month', todayStr))

const batchDatePickerModel = computed({
  get() {
    return batchDateRange.value || getCutoffRange('month', selectedDate.value)
  },
  set(val) {
    if (!val) return
    batchDateRange.value = typeof val === 'string' ? { from: val, to: val } : val
    selectedCutoffPreset.value = 'custom'
  },
})

function applyCutoffPreset(preset) {
  selectedCutoffPreset.value = preset
  batchDateRange.value = getCutoffRange(preset, selectedDate.value)
}

const normalizedBatchCustomRange = computed(() => {
  const val = batchDateRange.value || getCutoffRange('month', selectedDate.value)
  if (typeof val === 'string') {
    return { from: val, to: val }
  }
  const from = val?.from || getCutoffRange('month', selectedDate.value).from
  const to = val?.to || from
  return from <= to ? { from, to } : { from: to, to: from }
})

const batchRangeDisplayLabel = computed(() => {
  const { from, to } = normalizedBatchCustomRange.value
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

function openBatchPrintSetup() {
  if (selectedEmployees.value.length === 0) {
    selectedEmployees.value = [...filteredEmployeeRows.value]
    $q.notify({
      type: 'info',
      message: `Selected all ${selectedEmployees.value.length} personnel for batch DTR printing.`,
      position: 'top',
    })
  }
  openBatchPrintModal()
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

/* Floating Bottom Bulk Action Bar */
.bulk-action-bar {
  background: #1b5e20;
  color: #ffffff;
  border-top: 1px solid #2e7d32;
  z-index: 2000;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.18);
  height: 52px;
}

.cutoff-preset-group {
  background: rgba(0, 0, 0, 0.16);
  padding: 3px 8px;
  border-radius: 6px;
}

.bulk-date-trigger {
  height: 28px;
  user-select: none;
  border: 1px solid rgba(255, 255, 255, 0.4);
}
</style>
