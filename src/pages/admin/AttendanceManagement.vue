<template>
  <q-page class="q-pa-md attendance-overview-page">
    <!-- Page Header -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h1 class="text-h5 text-weight-bold text-dark q-my-none">Attendance Management</h1>
        <div class="text-caption text-grey-7 q-mt-xs">
          Monitor daily time records, biometric punches, and Civil Service Form No. 48
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
          <q-card flat bordered class="rounded-borders bg-white stat-card">
            <q-card-section class="q-py-md q-px-md">
              <div class="row items-center no-wrap">
                <q-skeleton type="QAvatar" size="40px" class="q-mr-sm flex-shrink-0" animation="wave" />
                <div class="col">
                  <q-skeleton type="text" width="75px" height="14px" animation="wave" />
                  <q-skeleton type="text" width="42px" height="28px" class="q-mt-xs" animation="wave" />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Skeleton Main Table Card -->
      <q-card flat bordered class="rounded-borders bg-white table-card">
        <q-card-section class="q-py-sm q-px-md row items-center q-col-gutter-sm border-bottom">
          <div class="col-auto"><q-skeleton type="rect" width="195px" height="40px" class="rounded-borders" animation="wave" /></div>
          <div class="col-auto"><q-skeleton type="rect" width="180px" height="40px" class="rounded-borders" animation="wave" /></div>
          <div class="col"><q-skeleton type="rect" width="100%" height="40px" class="rounded-borders" animation="wave" /></div>
          <div class="col-auto"><q-skeleton type="rect" width="150px" height="40px" class="rounded-borders" animation="wave" /></div>
        </q-card-section>

        <!-- Skeleton Table Body -->
        <div class="q-pa-md">
          <!-- Columns Header Placeholder -->
          <div class="row items-center q-pb-sm border-bottom q-col-gutter-sm text-grey-5">
            <div class="col-1"><q-skeleton type="text" width="70%" height="16px" animation="wave" /></div>
            <div class="col-3"><q-skeleton type="text" width="50%" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="70%" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="70%" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="70%" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="70%" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="60%" height="16px" animation="wave" /></div>
            <div class="col-2 text-center"><q-skeleton type="text" width="65%" height="16px" class="q-mx-auto" animation="wave" /></div>
            <div class="col-1 text-center"><q-skeleton type="text" width="50%" height="16px" class="q-mx-auto" animation="wave" /></div>
          </div>

          <!-- 8 Skeleton Rows -->
          <div
            v-for="r in 8"
            :key="'sk-row-' + r"
            class="row items-center q-py-md border-bottom q-col-gutter-sm"
            :class="{ 'bg-grey-1': r % 2 === 0 }"
          >
            <div class="col-1"><q-skeleton type="text" width="60px" height="16px" animation="wave" /></div>
            <div class="col-3">
              <q-skeleton type="text" width="145px" height="18px" animation="wave" />
              <q-skeleton type="text" width="95px" height="14px" class="q-mt-xs" animation="wave" />
            </div>
            <div class="col-1"><q-skeleton type="text" width="55px" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="55px" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="55px" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="55px" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="42px" height="16px" animation="wave" /></div>
            <div class="col-2 text-center"><q-skeleton type="rect" width="72px" height="22px" class="rounded-borders q-mx-auto" animation="wave" /></div>
            <div class="col-1 text-center">
              <q-skeleton type="QAvatar" size="26px" class="q-mx-auto" animation="wave" />
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
      <!-- Interactive Summary KPI Stat Cards (Click to Filter) -->
      <div class="row q-col-gutter-sm q-mb-md">
        <!-- Total Personnel -->
        <div class="col-12 col-sm-6 col-md">
          <q-card
            flat
            bordered
            role="button"
            tabindex="0"
            class="rounded-borders bg-white stat-card cursor-pointer"
            :class="{ 'stat-card-active-all': selectedAttendanceStatus === 'ALL' }"
            @click="setAttendanceStatusFilter('ALL')"
            @keydown.enter.prevent="setAttendanceStatusFilter('ALL')"
            @keydown.space.prevent="setAttendanceStatusFilter('ALL')"
          >
            <q-card-section class="q-py-md q-px-md">
              <div class="row items-center no-wrap">
                <q-avatar size="40px" color="blue-1" text-color="blue-9" class="q-mr-sm flex-shrink-0">
                  <q-icon name="groups" size="21px" />
                </q-avatar>
                <div class="ellipsis">
                  <div class="text-caption text-weight-medium text-grey-7 ellipsis">Total Personnel</div>
                  <div class="text-h5 text-weight-bolder text-dark leading-tight">{{ stats.total }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Present -->
        <div class="col-12 col-sm-6 col-md">
          <q-card
            flat
            bordered
            role="button"
            tabindex="0"
            class="rounded-borders bg-white stat-card cursor-pointer"
            :class="{ 'stat-card-active-present': selectedAttendanceStatus === 'PRESENT' }"
            @click="toggleAttendanceStatusFilter('PRESENT')"
            @keydown.enter.prevent="toggleAttendanceStatusFilter('PRESENT')"
            @keydown.space.prevent="toggleAttendanceStatusFilter('PRESENT')"
          >
            <q-card-section class="q-py-md q-px-md">
              <div class="row items-center no-wrap">
                <q-avatar size="40px" color="green-1" text-color="green-9" class="q-mr-sm flex-shrink-0">
                  <q-icon name="check_circle" size="21px" />
                </q-avatar>
                <div class="ellipsis">
                  <div class="text-caption text-weight-medium text-grey-7 ellipsis">Present</div>
                  <div class="text-h5 text-weight-bolder text-positive leading-tight">{{ stats.present }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Tardy / Late -->
        <div class="col-12 col-sm-6 col-md">
          <q-card
            flat
            bordered
            role="button"
            tabindex="0"
            class="rounded-borders bg-white stat-card cursor-pointer"
            :class="{ 'stat-card-active-late': selectedAttendanceStatus === 'LATE' }"
            @click="toggleAttendanceStatusFilter('LATE')"
            @keydown.enter.prevent="toggleAttendanceStatusFilter('LATE')"
            @keydown.space.prevent="toggleAttendanceStatusFilter('LATE')"
          >
            <q-card-section class="q-py-md q-px-md">
              <div class="row items-center no-wrap">
                <q-avatar size="40px" color="amber-1" text-color="amber-9" class="q-mr-sm flex-shrink-0">
                  <q-icon name="history_toggle_off" size="21px" />
                </q-avatar>
                <div class="ellipsis">
                  <div class="text-caption text-weight-medium text-grey-7 ellipsis">Tardy / Late</div>
                  <div class="text-h5 text-weight-bolder text-amber-9 leading-tight">{{ stats.late }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- On Leave -->
        <div class="col-12 col-sm-6 col-md">
          <q-card
            flat
            bordered
            role="button"
            tabindex="0"
            class="rounded-borders bg-white stat-card cursor-pointer"
            :class="{ 'stat-card-active-leave': selectedAttendanceStatus === 'ON_LEAVE' }"
            @click="toggleAttendanceStatusFilter('ON_LEAVE')"
            @keydown.enter.prevent="toggleAttendanceStatusFilter('ON_LEAVE')"
            @keydown.space.prevent="toggleAttendanceStatusFilter('ON_LEAVE')"
          >
            <q-card-section class="q-py-md q-px-md">
              <div class="row items-center no-wrap">
                <q-avatar size="40px" color="indigo-1" text-color="indigo-9" class="q-mr-sm flex-shrink-0">
                  <q-icon name="beach_access" size="21px" />
                </q-avatar>
                <div class="ellipsis">
                  <div class="text-caption text-weight-medium text-grey-7 ellipsis">On Leave</div>
                  <div class="text-h5 text-weight-bolder text-indigo-9 leading-tight">{{ stats.on_leave }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Absent -->
        <div class="col-12 col-sm-6 col-md">
          <q-card
            flat
            bordered
            role="button"
            tabindex="0"
            class="rounded-borders bg-white stat-card cursor-pointer"
            :class="{ 'stat-card-active-absent': selectedAttendanceStatus === 'ABSENT' }"
            @click="toggleAttendanceStatusFilter('ABSENT')"
            @keydown.enter.prevent="toggleAttendanceStatusFilter('ABSENT')"
            @keydown.space.prevent="toggleAttendanceStatusFilter('ABSENT')"
          >
            <q-card-section class="q-py-md q-px-md">
              <div class="row items-center no-wrap">
                <q-avatar size="40px" color="red-1" text-color="red-9" class="q-mr-sm flex-shrink-0">
                  <q-icon name="event_busy" size="21px" />
                </q-avatar>
                <div class="ellipsis">
                  <div class="text-caption text-weight-medium text-grey-7 ellipsis">Absent</div>
                  <div class="text-h5 text-weight-bolder text-negative leading-tight">{{ stats.absent }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Main Attendance Management Card -->
      <q-card flat bordered class="rounded-borders bg-white table-card">
        <!-- Balanced Toolbar Section: Date Navigator + Filter + Search + Batch Print -->
        <q-card-section class="q-py-sm q-px-md border-bottom">
          <div class="row items-center q-col-gutter-sm">
            <!-- Date Navigator + Quick Jump to Today -->
            <div class="col-12 col-sm-auto row items-center no-wrap q-gutter-x-xs">
              <div class="row items-center no-wrap rounded-borders q-px-xs date-nav-box">
                <q-btn
                  flat
                  dense
                  round
                  icon="chevron_left"
                  size="sm"
                  color="grey-8"
                  @click="changeDate(-1)"
                >
                  <q-tooltip class="bg-dark">Previous Day</q-tooltip>
                </q-btn>

                <div class="row items-center no-wrap cursor-pointer q-px-sm date-display-trigger">
                  <q-icon name="calendar_month" size="16px" color="green-9" class="q-mr-xs" />
                  <span class="text-body2 text-weight-bold text-dark date-nav-text">
                    {{ formatFullDate(selectedDate) }}
                  </span>

                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date
                      v-model="selectedDate"
                      mask="YYYY-MM-DD"
                      color="green-9"
                      @update:model-value="fetchAttendanceOverview"
                    >
                      <div class="row items-center justify-between">
                        <q-btn
                          v-if="selectedDate !== todayStr"
                          v-close-popup
                          label="Today"
                          color="green-9"
                          flat
                          no-caps
                          @click="goToToday"
                        />
                        <q-space />
                        <q-btn v-close-popup label="Close" color="grey-7" flat no-caps />
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
                  color="grey-8"
                  @click="changeDate(1)"
                >
                  <q-tooltip class="bg-dark">Next Day</q-tooltip>
                </q-btn>
              </div>

              <q-btn
                v-if="selectedDate !== todayStr"
                outline
                dense
                no-caps
                color="green-9"
                label="Today"
                class="q-px-sm text-weight-bold toolbar-action-btn"
                @click="goToToday"
              >
                <q-tooltip class="bg-dark">Jump back to today</q-tooltip>
              </q-btn>
            </div>

            <!-- Employment Status Filter Dropdown -->
            <div class="col-12 col-sm-auto">
              <q-select
                v-model="selectedEmploymentStatus"
                :options="employmentStatusOptions"
                emit-value
                map-options
                outlined
                dense
                options-dense
                class="status-filter-select"
              >
                <template #prepend>
                  <q-icon name="filter_list" size="18px" color="grey-6" />
                </template>
              </q-select>
            </div>

            <!-- Search Input -->
            <div class="col-12 col-md">
              <q-input
                v-model="searchTerm"
                outlined
                dense
                placeholder="Search by employee name, position, or ID..."
                class="search-employee-input"
                clearable
                @update:model-value="onSearchInput"
              >
                <template #prepend>
                  <q-icon name="search" size="18px" color="grey-6" />
                </template>
              </q-input>
            </div>

            <!-- Batch Print DTR Action -->
            <div class="col-12 col-sm-auto row items-center justify-end no-wrap">
              <q-btn
                outline
                color="green-9"
                icon="print"
                label="Batch Print DTR"
                no-caps
                class="text-weight-bold q-px-md toolbar-action-btn"
                :disable="employeeRows.length === 0"
                @click="openBatchPrintDialog"
              >
                <q-tooltip class="bg-dark">Open batch CS Form 48 print setup</q-tooltip>
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
          :rows-per-page-options="[10, 15, 25, 50, 100]"
          v-model:pagination="pagination"
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
                <div class="text-caption text-grey-7 ellipsis" style="max-width: 260px;">
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
            <q-td :props="props" class="text-left font-mono tabular-nums">
              <span class="text-weight-bold text-grey-9">{{ props.row.control_no }}</span>
            </q-td>
          </template>

          <!-- AM In (Morning Arrival) -->
          <template #body-cell-am_in="props">
            <q-td :props="props" class="text-center font-mono tabular-nums">
              <span
                v-if="props.row.dtr?.am_arrival"
                :class="getRowSlotLateMinutes(props.row, 'am_arrival') > 0 ? 'text-negative text-weight-bold' : 'text-dark text-weight-medium'"
              >
                {{ formatPunchTime(props.row.dtr.am_arrival) }}
              </span>
              <span v-else class="text-grey-4">—</span>
            </q-td>
          </template>

          <!-- AM Out (Lunch Out) -->
          <template #body-cell-am_out="props">
            <q-td :props="props" class="text-center font-mono tabular-nums">
              <span v-if="props.row.dtr?.am_departure" class="text-dark text-weight-medium">
                {{ formatPunchTime(props.row.dtr.am_departure) }}
              </span>
              <span v-else class="text-grey-4">—</span>
            </q-td>
          </template>

          <!-- PM In (Lunch In) -->
          <template #body-cell-pm_in="props">
            <q-td :props="props" class="text-center font-mono tabular-nums">
              <span
                v-if="props.row.dtr?.pm_arrival"
                :class="getRowSlotLateMinutes(props.row, 'pm_arrival') > 0 ? 'text-negative text-weight-bold' : 'text-dark text-weight-medium'"
              >
                {{ formatPunchTime(props.row.dtr.pm_arrival) }}
              </span>
              <span v-else class="text-grey-4">—</span>
            </q-td>
          </template>

          <!-- PM Out (Afternoon Departure) -->
          <template #body-cell-pm_out="props">
            <q-td :props="props" class="text-center font-mono tabular-nums">
              <span v-if="props.row.dtr?.pm_departure" class="text-dark text-weight-medium">
                {{ formatPunchTime(props.row.dtr.pm_departure) }}
              </span>
              <span v-else class="text-grey-4">—</span>
            </q-td>
          </template>

          <!-- Rendered Hours -->
          <template #body-cell-hours="props">
            <q-td :props="props" class="text-center font-mono tabular-nums">
              <span
                v-if="Number(props.row.dtr?.rendered_hours || 0) > 0"
                class="text-weight-bold text-dark"
              >
                {{ Number(props.row.dtr.rendered_hours).toFixed(1) }}h
              </span>
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

          <!-- DTR Action Column -->
          <template #body-cell-actions="props">
            <q-td :props="props" class="text-center" @click.stop>
              <q-btn
                flat
                round
                dense
                size="sm"
                color="green-9"
                icon="description"
                class="dtr-row-action-btn"
                @click="openEmployeeDtr(props.row)"
              >
                <q-tooltip class="bg-dark">View / Print CS Form 48</q-tooltip>
              </q-btn>
            </q-td>
          </template>

          <!-- Empty State -->
          <template #no-data>
            <div class="full-width text-center q-py-xl text-grey-6">
              <q-icon name="person_off" size="48px" color="grey-4" />
              <div class="text-subtitle1 text-weight-bold text-grey-8 q-mt-sm">No Attendance Records Found</div>
              <div class="text-caption q-mb-md">
                No personnel attendance records match your filter criteria for {{ formatFullDate(selectedDate) }}.
              </div>
              <q-btn
                v-if="hasActiveFilters"
                outline
                dense
                no-caps
                color="green-9"
                label="Reset Filters"
                class="q-px-md text-weight-bold"
                @click="resetAllFilters"
              />
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
      <q-card class="dtr-setup-dialog column no-wrap bg-white">
        <!-- Dialog Header Toolbar -->
        <div class="dtr-dialog-header bg-green-9 text-white row items-center no-wrap q-px-md">
          <div class="dtr-header-icon-box row items-center justify-center q-mr-sm">
            <q-icon name="event_note" size="20px" color="white" />
          </div>
          <div class="col ellipsis">
            <div class="text-subtitle1 text-weight-bold leading-tight">Civil Service Form No. 48</div>
            <div class="text-caption text-green-2 leading-tight">Daily Time Record Coverage Setup</div>
          </div>
          <q-btn icon="close" flat round dense text-color="white" v-close-popup>
            <q-tooltip class="bg-dark">Close</q-tooltip>
          </q-btn>
        </div>

        <!-- Dialog Body -->
        <q-card-section class="col scroll q-pa-md bg-grey-1 column no-wrap dtr-dialog-body">
          <!-- Personnel Identity Card -->
          <div class="dtr-employee-card bg-white q-py-xs q-px-sm rounded-borders row items-center no-wrap justify-between flex-shrink-0">
            <div class="row items-center no-wrap col ellipsis q-pr-sm">
              <q-avatar
                size="36px"
                class="dtr-employee-avatar text-weight-bolder q-mr-sm flex-shrink-0"
              >
                {{ getInitials(singleDtrEmployee?.employee_name) }}
              </q-avatar>
              <div class="column ellipsis">
                <div class="row items-center no-wrap q-gutter-x-xs">
                  <span class="text-weight-bolder text-dark text-body2 ellipsis">
                    {{ singleDtrEmployee?.employee_name || 'Selected Personnel' }}
                  </span>
                  <q-badge
                    v-if="singleDtrEmployee?.employment_status"
                    :color="isEmployeeContractual(singleDtrEmployee) ? 'amber-1' : 'green-1'"
                    :text-color="isEmployeeContractual(singleDtrEmployee) ? 'amber-10' : 'green-10'"
                    class="text-weight-bold dtr-emp-status-pill"
                  >
                    {{ formatEmploymentStatus(singleDtrEmployee.employment_status) }}
                  </q-badge>
                </div>
                <span class="text-caption text-grey-7 ellipsis">
                  {{ singleDtrEmployee?.designation || 'Staff Member' }}
                </span>
              </div>
            </div>

            <div class="dtr-control-badge text-right font-mono flex-shrink-0">
              <span class="dtr-control-label block">Control No</span>
              <span class="text-weight-bolder text-green-9 text-caption">{{ singleDtrEmployee?.control_no || '—' }}</span>
            </div>
          </div>

          <!-- Coverage Date Range Card -->
          <div class="dtr-coverage-card bg-white q-pa-sm rounded-borders flex-shrink-0">
            <!-- Section Header + Active Calendar Month Label -->
            <div class="row items-center justify-between q-mb-xs q-px-xs">
              <div class="row items-center q-gutter-x-xs">
                <q-icon name="date_range" color="green-9" size="17px" />
                <span class="text-weight-bold text-caption text-dark">Coverage Date Range</span>
              </div>
              <span class="text-caption text-weight-medium text-grey-6">
                {{ singleDtrActiveCalendarLabel }}
              </span>
            </div>

            <!-- Selected Range Summary Banner -->
            <div
              class="dtr-range-summary-bar row items-center justify-between no-wrap q-px-sm q-mb-xs rounded-borders"
              :class="normalizedSingleDtrCustomRange ? 'is-active' : 'is-empty'"
            >
              <div class="row items-center no-wrap ellipsis">
                <q-icon
                  :name="normalizedSingleDtrCustomRange ? 'check_circle' : 'touch_app'"
                  :color="normalizedSingleDtrCustomRange ? 'green-9' : 'grey-5'"
                  size="15px"
                  class="q-mr-xs flex-shrink-0"
                />
                <span
                  class="font-mono text-caption text-weight-bold ellipsis"
                  :class="normalizedSingleDtrCustomRange ? 'text-green-10' : 'text-grey-6'"
                >
                  {{ singleDtrRangeDisplayLabel }}
                </span>
              </div>

              <div class="row items-center no-wrap q-gutter-x-xs flex-shrink-0">
                <q-badge
                  v-if="singleDtrRangeDayCount > 0"
                  color="green-9"
                  text-color="white"
                  class="text-weight-bold font-mono dtr-days-count-badge"
                >
                  {{ singleDtrRangeDayCount }} {{ singleDtrRangeDayCount === 1 ? 'day' : 'days' }}
                </q-badge>
                <q-btn
                  v-if="singleDtrDateRange"
                  flat
                  dense
                  round
                  icon="close"
                  size="xs"
                  color="grey-7"
                  @click="singleDtrDateRange = null"
                >
                  <q-tooltip class="bg-dark">Clear date range</q-tooltip>
                </q-btn>
              </div>
            </div>

            <!-- Segmented Quick Preset Cutoff Selector -->
            <div class="dtr-preset-segmented row no-wrap items-center q-mb-xs">
              <button
                type="button"
                class="dtr-preset-btn col"
                :class="{ 'is-active': isDateRangeMatchingPreset(singleDtrDateRange, 'month') }"
                @click="applySingleDtrPreset('month')"
              >
                <span class="dtr-preset-title">Full Month</span>
                <span class="dtr-preset-sub">1st – End</span>
              </button>
              <button
                type="button"
                class="dtr-preset-btn col"
                :class="{ 'is-active': isDateRangeMatchingPreset(singleDtrDateRange, '11-25') }"
                @click="applySingleDtrPreset('11-25')"
              >
                <span class="dtr-preset-title">11th – 25th</span>
                <span class="dtr-preset-sub">1st Cutoff</span>
              </button>
              <button
                type="button"
                class="dtr-preset-btn col"
                :class="{ 'is-active': isDateRangeMatchingPreset(singleDtrDateRange, '26-10') }"
                @click="applySingleDtrPreset('26-10')"
              >
                <span class="dtr-preset-title">26th – 10th</span>
                <span class="dtr-preset-sub">2nd Cutoff</span>
              </button>
            </div>

            <!-- Refined Range Calendar -->
            <q-date
              ref="singleDtrDateRef"
              v-model="singleDtrDatePickerModel"
              range
              mask="YYYY-MM-DD"
              color="green-9"
              minimal
              flat
              class="full-width no-shadow bg-white dtr-range-calendar"
              @navigation="onSingleDtrCalendarNav"
            />
          </div>
        </q-card-section>

        <!-- Dialog Footer Actions -->
        <q-card-actions align="right" class="bg-white q-px-md q-py-sm dtr-dialog-footer">
          <q-btn
            unelevated
            color="green-9"
            text-color="white"
            icon="description"
            label="Generate & View DTR"
            no-caps
            class="text-weight-bolder q-px-md dtr-generate-btn"
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
      <q-card style="width: 820px; max-width: 96vw; max-height: 92vh;" class="dtr-setup-dialog column no-wrap bg-white">
        <!-- Dialog Header Toolbar -->
        <div class="dtr-dialog-header bg-green-9 text-white row items-center no-wrap q-px-md">
          <div class="dtr-header-icon-box row items-center justify-center q-mr-sm">
            <q-icon name="print" size="20px" color="white" />
          </div>
          <div class="col ellipsis">
            <div class="text-subtitle1 text-weight-bold leading-tight">Batch Print DTR — Civil Service Form No. 48</div>
            <div class="text-caption text-green-2 leading-tight">Configure coverage period and personnel roster</div>
          </div>
          <q-btn icon="close" flat round dense text-color="white" v-close-popup>
            <q-tooltip class="bg-dark">Close</q-tooltip>
          </q-btn>
        </div>

        <!-- Dialog Body: Two-Column Layout -->
        <q-card-section class="col scroll q-pa-md bg-grey-1">
          <div class="row q-col-gutter-md">
            <!-- Left Column: Coverage Date Range -->
            <div class="col-12 col-sm-6">
              <div class="dtr-coverage-card bg-white q-pa-md rounded-borders full-height">
                <div class="row items-center justify-between q-mb-sm">
                  <div class="row items-center q-gutter-x-xs">
                    <q-icon name="date_range" color="green-9" size="18px" />
                    <span class="text-weight-bold text-body2 text-dark">Coverage Date Range</span>
                  </div>
                  <span class="text-caption text-grey-6">
                    {{ batchActiveCalendarLabel }}
                  </span>
                </div>

                <!-- Selected Range Summary Banner -->
                <div
                  class="dtr-range-summary-bar row items-center justify-between no-wrap q-px-sm q-py-xs q-mb-sm rounded-borders"
                  :class="normalizedBatchCustomRange ? 'is-active' : 'is-empty'"
                >
                  <div class="row items-center no-wrap ellipsis">
                    <q-icon
                      :name="normalizedBatchCustomRange ? 'check_circle' : 'touch_app'"
                      :color="normalizedBatchCustomRange ? 'green-9' : 'grey-5'"
                      size="16px"
                      class="q-mr-xs flex-shrink-0"
                    />
                    <span
                      class="font-mono text-caption text-weight-bold ellipsis"
                      :class="normalizedBatchCustomRange ? 'text-green-10' : 'text-grey-6'"
                    >
                      {{ batchRangeDisplayLabel }}
                    </span>
                  </div>

                  <div class="row items-center no-wrap q-gutter-x-xs flex-shrink-0">
                    <q-badge
                      v-if="batchRangeDayCount > 0"
                      color="green-9"
                      text-color="white"
                      class="text-weight-bold font-mono dtr-days-count-badge"
                    >
                      {{ batchRangeDayCount }} {{ batchRangeDayCount === 1 ? 'day' : 'days' }}
                    </q-badge>
                    <q-btn
                      v-if="batchDateRange"
                      flat
                      dense
                      round
                      icon="close"
                      size="xs"
                      color="grey-7"
                      @click="batchDateRange = null"
                    >
                      <q-tooltip class="bg-dark">Clear date range</q-tooltip>
                    </q-btn>
                  </div>
                </div>

                <!-- Segmented Quick Preset Cutoff Selector -->
                <div class="dtr-preset-segmented row no-wrap items-center q-mb-sm">
                  <button
                    type="button"
                    class="dtr-preset-btn col"
                    :class="{ 'is-active': isDateRangeMatchingPreset(batchDateRange, 'month') }"
                    @click="applyBatchPreset('month')"
                  >
                    <span class="dtr-preset-title">Full Month</span>
                    <span class="dtr-preset-sub">1st – End</span>
                  </button>
                  <button
                    type="button"
                    class="dtr-preset-btn col"
                    :class="{ 'is-active': isDateRangeMatchingPreset(batchDateRange, '11-25') }"
                    @click="applyBatchPreset('11-25')"
                  >
                    <span class="dtr-preset-title">11th – 25th</span>
                    <span class="dtr-preset-sub">1st Cutoff</span>
                  </button>
                  <button
                    type="button"
                    class="dtr-preset-btn col"
                    :class="{ 'is-active': isDateRangeMatchingPreset(batchDateRange, '26-10') }"
                    @click="applyBatchPreset('26-10')"
                  >
                    <span class="dtr-preset-title">26th – 10th</span>
                    <span class="dtr-preset-sub">2nd Cutoff</span>
                  </button>
                </div>

                <q-date
                  ref="batchDateRef"
                  v-model="batchDatePickerModel"
                  range
                  mask="YYYY-MM-DD"
                  color="green-9"
                  minimal
                  flat
                  class="full-width no-shadow bg-white dtr-range-calendar"
                  @navigation="onBatchCalendarNav"
                />
              </div>
            </div>

            <!-- Right Column: Selected Personnel -->
            <div class="col-12 col-sm-6 column">
              <div class="dtr-coverage-card bg-white q-pa-md rounded-borders column full-height" style="min-height: 380px;">
                <div class="row items-center justify-between q-mb-sm">
                  <div class="row items-center q-gutter-x-xs">
                    <q-icon name="people" color="green-9" size="18px" />
                    <span class="text-weight-bold text-body2 text-dark">Selected Personnel</span>
                    <q-badge color="green-1" text-color="green-9" class="q-ml-xs text-weight-bold">
                      {{ selectedEmployees.length }}
                    </q-badge>
                  </div>
                  <div class="row items-center q-gutter-x-xs">
                    <q-btn
                      v-if="selectedEmployees.length < employeeRows.length"
                      flat
                      dense
                      no-caps
                      size="xs"
                      color="green-9"
                      class="text-weight-bold"
                      label="Select All"
                      @click="selectAllBatchEmployees"
                    />
                    <q-btn
                      v-if="selectedEmployees.length > 0"
                      flat
                      dense
                      no-caps
                      size="xs"
                      color="negative"
                      class="text-weight-bold"
                      label="Clear"
                      @click="selectedEmployees = []"
                    />
                  </div>
                </div>

                <!-- Multi-Select Employment Status Selector -->
                <div
                  v-if="batchEmploymentStatusOptions.length > 0"
                  class="batch-status-selector q-mb-sm"
                >
                  <div class="row items-center justify-between q-mb-xs">
                    <span class="batch-status-label">Select by Status</span>
                    <span class="batch-status-hint">Multi-select</span>
                  </div>
                  <div class="batch-status-chips-wrap">
                    <button
                      v-for="opt in batchEmploymentStatusOptions"
                      :key="opt.value"
                      type="button"
                      class="batch-status-chip"
                      :class="{
                        'is-selected': opt.isAllSelected,
                        'is-partial': opt.isPartial,
                      }"
                      @click="toggleBatchStatusSelection(opt.value)"
                    >
                      <q-icon
                        :name="
                          opt.isAllSelected
                            ? 'check_box'
                            : opt.isPartial
                              ? 'indeterminate_check_box'
                              : 'check_box_outline_blank'
                        "
                        size="15px"
                        class="batch-status-chip-icon"
                      />
                      <span class="batch-status-chip-text">{{ opt.label }}</span>
                      <span class="batch-status-chip-count font-mono tabular-nums">
                        {{ opt.isPartial ? `${opt.selectedCount}/${opt.total}` : opt.total }}
                      </span>
                    </button>
                  </div>
                </div>

                <!-- Empty State -->
                <div
                  v-if="selectedEmployees.length === 0"
                  class="col column items-center justify-center text-center q-pa-md text-grey-6"
                >
                  <q-icon name="touch_app" size="34px" color="grey-4" class="q-mb-xs" />
                  <div class="text-subtitle2 text-weight-bold text-grey-8">No Personnel Selected</div>
                  <div class="text-caption text-grey-6 q-mb-sm">
                    Select one or more statuses above to include personnel.
                  </div>
                  <q-btn
                    outline
                    dense
                    color="green-9"
                    label="Select All Personnel"
                    no-caps
                    size="sm"
                    class="q-px-sm"
                    @click="selectAllBatchEmployees"
                  />
                </div>

                <!-- List of Selected Employees -->
                <q-list v-else separator dense class="col scroll rounded-borders" style="max-height: 290px;">
                  <q-item
                    v-for="emp in selectedEmployees"
                    :key="emp.control_no"
                    class="q-py-xs q-px-xs items-center"
                  >
                    <q-item-section avatar style="min-width: 34px;">
                      <q-avatar size="28px" class="dtr-employee-avatar text-caption text-weight-bold">
                        {{ getInitials(emp.employee_name) }}
                      </q-avatar>
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-caption text-weight-bold ellipsis" style="max-width: 210px;">
                        {{ emp.employee_name }}
                      </q-item-label>
                      <q-item-label caption class="ellipsis text-grey-6" style="max-width: 210px;">
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
        <q-card-actions align="between" class="bg-white q-px-md q-py-sm no-print dtr-dialog-footer">
          <q-btn
            flat
            no-caps
            color="grey-7"
            label="Cancel"
            class="text-weight-bold q-px-md"
            v-close-popup
          />
          <q-btn
            unelevated
            color="green-9"
            text-color="white"
            icon="print"
            :label="`Generate & Preview (${selectedEmployees.length})`"
            no-caps
            class="text-weight-bolder q-px-md dtr-generate-btn"
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
                  @adjust-saved="onBatchDtrOverrideSaved(item)"
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
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAttendanceStore } from 'stores/attendance-store'
import DailyTimeRecordTable from 'src/components/admin/DailyTimeRecordTable.vue'
import { printBatchCscForm48 } from 'src/utils/csc-form-48-print'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const attendanceStore = useAttendanceStore()

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
  {
    name: 'hours',
    label: 'Hours',
    field: (row) => Number(row.dtr?.rendered_hours || 0),
    align: 'center',
    sortable: true,
  },
  { name: 'status', label: 'Status', field: 'attendance_status', align: 'center', sortable: true },
  { name: 'actions', label: 'Action', align: 'center' },
]

const selectedAttendanceStatus = ref('ALL')
const selectedEmploymentStatus = ref('ALL')

function setAttendanceStatusFilter(statusKey) {
  selectedAttendanceStatus.value = statusKey || 'ALL'
  pagination.value.page = 1
}

function toggleAttendanceStatusFilter(statusKey) {
  selectedAttendanceStatus.value =
    selectedAttendanceStatus.value === statusKey ? 'ALL' : statusKey
  pagination.value.page = 1
}

watch(selectedEmploymentStatus, () => {
  pagination.value.page = 1
})

const hasActiveFilters = computed(() => {
  return (
    selectedAttendanceStatus.value !== 'ALL' ||
    selectedEmploymentStatus.value !== 'ALL' ||
    Boolean(searchTerm.value && String(searchTerm.value).trim() !== '')
  )
})

function resetAllFilters() {
  selectedAttendanceStatus.value = 'ALL'
  selectedEmploymentStatus.value = 'ALL'
  const hadSearch = Boolean(searchTerm.value && String(searchTerm.value).trim() !== '')
  searchTerm.value = ''
  pagination.value.page = 1
  if (hadSearch) {
    fetchAttendanceOverview()
  }
}

function matchesAttendanceStatusFilter(row, filterKey) {
  if (!filterKey || filterKey === 'ALL') return true
  const norm = String(row.attendance_status || '').toLowerCase().trim()
  const rawDtrStatus = String(row.dtr?.status || '').toLowerCase().trim()

  if (filterKey === 'PRESENT') {
    return (
      rawDtrStatus === 'present' ||
      norm === 'present' ||
      norm === 'on time' ||
      norm === 'late'
    )
  }
  if (filterKey === 'LATE') {
    return norm === 'late' || isRowLate(row)
  }
  if (filterKey === 'ON_LEAVE') {
    return (
      norm.startsWith('on leave') ||
      norm.startsWith('on_leave') ||
      norm === 'half day'
    )
  }
  if (filterKey === 'ABSENT') {
    return norm === 'absent'
  }
  return true
}

function formatEmploymentStatus(status) {
  if (!status) return ''
  const s = String(status).toUpperCase().trim()
  if (s === 'CASUAL') return 'Casual'
  if (s === 'REGULAR') return 'Permanent'
  if (s === 'CONTRACTUAL') return 'Job Order'
  if (s === 'CO-TERMINOUS') return 'Co-terminous'
  if (s === 'ELECTIVE') return 'Elective'
  if (s === 'HONORARIUM') return 'Honorarium'
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

const employmentStatusOptions = computed(() => {
  const counts = {}
  employeeRows.value.forEach((row) => {
    const raw = (row.employment_status || 'OTHER').toUpperCase().trim()
    counts[raw] = (counts[raw] || 0) + 1
  })

  const baseOptions = [
    { label: `All Statuses (${employeeRows.value.length})`, value: 'ALL' },
    { label: `Casual (${counts['CASUAL'] || 0})`, value: 'CASUAL' },
    { label: `Permanent (${counts['REGULAR'] || 0})`, value: 'REGULAR' },
  ]

  if (counts['CONTRACTUAL']) {
    baseOptions.push({ label: `Job Order (${counts['CONTRACTUAL']})`, value: 'CONTRACTUAL' })
  }
  if (counts['CO-TERMINOUS']) {
    baseOptions.push({ label: `Co-terminous (${counts['CO-TERMINOUS']})`, value: 'CO-TERMINOUS' })
  }
  if (counts['ELECTIVE']) {
    baseOptions.push({ label: `Elective (${counts['ELECTIVE']})`, value: 'ELECTIVE' })
  }

  Object.keys(counts).forEach((key) => {
    if (!['CASUAL', 'REGULAR', 'CONTRACTUAL', 'CO-TERMINOUS', 'ELECTIVE', 'OTHER'].includes(key)) {
      baseOptions.push({
        label: `${formatEmploymentStatus(key)} (${counts[key]})`,
        value: key,
      })
    }
  })

  return baseOptions
})

const filteredEmployeeRows = computed(() => {
  const empTarget =
    selectedEmploymentStatus.value && selectedEmploymentStatus.value !== 'ALL'
      ? selectedEmploymentStatus.value.toUpperCase().trim()
      : null
  const attTarget = selectedAttendanceStatus.value

  return employeeRows.value.filter((row) => {
    if (empTarget) {
      const s = String(row.employment_status || '').toUpperCase().trim()
      if (s !== empTarget) return false
    }
    if (!matchesAttendanceStatusFilter(row, attTarget)) {
      return false
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
  return Number(row?.dtr?.late_minutes || 0) > 0
}

function parsePunchMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null
  const parts = timeStr.trim().split(':')
  if (parts.length < 2) return null
  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return hours * 60 + minutes
}

function getRowSlotLateMinutes(row, slotKey) {
  if (!row?.dtr || Number(row.dtr.late_minutes || 0) <= 0) return 0
  const rawStatus = String(row.dtr.status || '').toUpperCase().trim()
  if (rawStatus === 'ON_LEAVE' || rawStatus === 'HOLIDAY' || rawStatus === 'ABSENT') return 0

  const actualMinutes = parsePunchMinutes(row.dtr[slotKey])
  if (actualMinutes === null) return 0

  if (slotKey === 'am_arrival') {
    if (rawStatus === 'ON_LEAVE_AM') return 0
    const scheduleStart = parsePunchMinutes(row.schedule?.work_start_time) ?? 480
    return actualMinutes > scheduleStart ? actualMinutes - scheduleStart : 0
  }

  if (slotKey === 'pm_arrival') {
    if (rawStatus === 'ON_LEAVE_PM') return 0
    const scheduleBreakEnd = parsePunchMinutes(row.schedule?.break_end_time) ?? 780
    return actualMinutes > scheduleBreakEnd ? actualMinutes - scheduleBreakEnd : 0
  }

  return 0
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
  pagination.value.page = 1
  fetchAttendanceOverview()
}

function goToToday() {
  const currentToday = getLocalTodayStr()
  if (selectedDate.value === currentToday) return
  selectedDate.value = currentToday
  pagination.value.page = 1
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
    const data = await attendanceStore.fetchAttendanceOverview({
      date: selectedDate.value,
      search: searchTerm.value,
    })

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
// CUTOFF DATE RANGE HELPERS (CONTRACTUAL VS OTHERS)
// =========================================================
function isEmployeeContractual(emp) {
  if (!emp) return false
  if (emp.is_contractual !== undefined && emp.is_contractual !== null) {
    return Boolean(emp.is_contractual)
  }
  const status = String(emp.employment_status || emp.status || '').toUpperCase().trim()
  if (status === 'CONTRACTUAL') return true
  const designation = String(emp.designation || '').toUpperCase()
  return designation.includes('JOB ORDER') || designation.includes('CONTRACTUAL')
}

function areSelectedEmployeesContractual() {
  if (selectedEmploymentStatus.value === 'CONTRACTUAL') {
    return true
  }
  if (selectedEmployees.value.length > 0) {
    return selectedEmployees.value.some((emp) => isEmployeeContractual(emp))
  }
  return false
}

function getCutoffRange(type, baseDateStr) {
  const parts = (baseDateStr || getLocalTodayStr()).split('-').map(Number)
  const year = parts[0]
  const month = parts[1]
  const day = parts[2]
  const curMStr = String(month).padStart(2, '0')

  if (type === 'month') {
    const lastDay = String(new Date(year, month, 0).getDate()).padStart(2, '0')
    return {
      from: `${year}-${curMStr}-01`,
      to: `${year}-${curMStr}-${lastDay}`,
    }
  }

  if (type === '11-25') {
    return {
      from: `${year}-${curMStr}-11`,
      to: `${year}-${curMStr}-25`,
    }
  }

  if (type === '26-10') {
    if (day <= 15) {
      const prevD = new Date(year, month - 2, 26)
      const prevY = prevD.getFullYear()
      const prevM = String(prevD.getMonth() + 1).padStart(2, '0')
      return {
        from: `${prevY}-${prevM}-26`,
        to: `${year}-${curMStr}-10`,
      }
    } else {
      const nextD = new Date(year, month, 10)
      const nextY = nextD.getFullYear()
      const nextM = String(nextD.getMonth() + 1).padStart(2, '0')
      return {
        from: `${year}-${curMStr}-26`,
        to: `${nextY}-${nextM}-10`,
      }
    }
  }

  return null
}

function computeDefaultRange(isContractual, baseDateStr) {
  if (!isContractual) {
    return getCutoffRange('month', baseDateStr)
  }

  const parts = (baseDateStr || getLocalTodayStr()).split('-').map(Number)
  const day = parts[2]

  if (day >= 11 && day <= 25) {
    return getCutoffRange('11-25', baseDateStr)
  }

  return getCutoffRange('26-10', baseDateStr)
}

function isDateRangeMatchingPreset(rangeVal, type) {
  if (!rangeVal) return false
  const from = typeof rangeVal === 'string' ? rangeVal : rangeVal.from
  const to = typeof rangeVal === 'string' ? rangeVal : (rangeVal.to || from)
  if (!from || !to) return false

  const [fromY, fromM, fromD] = from.split('-').map(Number)
  const [toY, toM, toD] = to.split('-').map(Number)
  if (!fromY || !fromM || !fromD || !toY || !toM || !toD) return false

  if (type === 'month') {
    const lastDay = new Date(fromY, fromM, 0).getDate()
    return fromY === toY && fromM === toM && fromD === 1 && toD === lastDay
  }

  if (type === '11-25') {
    return fromY === toY && fromM === toM && fromD === 11 && toD === 25
  }

  if (type === '26-10') {
    if (fromD !== 26 || toD !== 10) return false
    const nextD = new Date(fromY, fromM, 10)
    return nextD.getFullYear() === toY && nextD.getMonth() + 1 === toM
  }

  return false
}

function getRangeDayCount(rangeVal) {
  if (!rangeVal?.from || !rangeVal?.to) return 0
  try {
    const d1 = new Date(`${rangeVal.from}T00:00:00`)
    const d2 = new Date(`${rangeVal.to}T00:00:00`)
    const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1
    return diff > 0 ? diff : 0
  } catch {
    return 0
  }
}

function parseYearMonthFromDate(dateStr) {
  const parts = (dateStr || getLocalTodayStr()).split('-').map(Number)
  return {
    year: parts[0] || new Date().getFullYear(),
    month: parts[1] || new Date().getMonth() + 1,
    day: parts[2] || new Date().getDate(),
  }
}

function buildPresetRangeForCalendarView(type, calVm, currentRange, baseDateStr) {
  const baseParts = parseYearMonthFromDate(baseDateStr)
  const year = calVm?.year || baseParts.year
  const month = calVm?.month || baseParts.month
  const curMStr = String(month).padStart(2, '0')

  if (type === 'month') {
    const lastDay = String(new Date(year, month, 0).getDate()).padStart(2, '0')
    return {
      from: `${year}-${curMStr}-01`,
      to: `${year}-${curMStr}-${lastDay}`,
    }
  }

  if (type === '11-25') {
    return {
      from: `${year}-${curMStr}-11`,
      to: `${year}-${curMStr}-25`,
    }
  }

  if (type === '26-10') {
    const prevD = new Date(year, month - 2, 26)
    const prevY = prevD.getFullYear()
    const prevM = String(prevD.getMonth() + 1).padStart(2, '0')
    const firstOption = {
      from: `${prevY}-${prevM}-26`,
      to: `${year}-${curMStr}-10`,
    }

    const nextD = new Date(year, month, 10)
    const nextY = nextD.getFullYear()
    const nextM = String(nextD.getMonth() + 1).padStart(2, '0')
    const secondOption = {
      from: `${year}-${curMStr}-26`,
      to: `${nextY}-${nextM}-10`,
    }

    const curFrom = typeof currentRange === 'string' ? currentRange : currentRange?.from
    const curTo = typeof currentRange === 'string' ? currentRange : currentRange?.to

    if (curFrom === firstOption.from && curTo === firstOption.to) {
      return secondOption
    }
    if (curFrom === secondOption.from && curTo === secondOption.to) {
      return firstOption
    }

    const isSameAsBaseMonth = year === baseParts.year && month === baseParts.month
    if (isSameAsBaseMonth && baseParts.day <= 15) {
      return firstOption
    }
    return secondOption
  }

  return null
}

function applySingleDtrPreset(type) {
  const targetYm = { ...singleDtrCalendarYm.value }
  singleDtrDateRange.value = buildPresetRangeForCalendarView(
    type,
    targetYm,
    singleDtrDateRange.value,
    selectedDate.value
  )
}

function applyBatchPreset(type) {
  const targetYm = { ...batchCalendarYm.value }
  batchDateRange.value = buildPresetRangeForCalendarView(
    type,
    targetYm,
    batchDateRange.value,
    selectedDate.value
  )
}

// =========================================================
// DTR MODAL & TIME OVERRIDE STATE & LOGIC
// =========================================================
const showSingleDtrSetupDialog = ref(false)
const singleDtrEmployee = ref(null)
const singleDtrDateRange = ref(null)
const singleDtrDateRef = ref(null)
const singleDtrCalendarYm = ref(parseYearMonthFromDate(todayStr))

function onSingleDtrCalendarNav(view) {
  if (view?.year && view?.month) {
    singleDtrCalendarYm.value = { year: view.year, month: view.month }
  }
}

const singleDtrActiveCalendarLabel = computed(() => {
  const { year, month } = singleDtrCalendarYm.value
  return `${getMonthName(month)} ${year}`
})

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

const singleDtrRangeDayCount = computed(() => {
  return getRangeDayCount(normalizedSingleDtrCustomRange.value)
})

const singleDtrRangeDisplayLabel = computed(() => {
  const range = normalizedSingleDtrCustomRange.value
  if (!range) return 'Select start & end date below'
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
  return isEmployeeContractual(emp)
})

const dtrModalHeaderTitle = computed(() => {
  const formTitle = isDtrEmployeeContractual.value
    ? 'Civil Service Form No. 48 & Accomplishment Report'
    : 'Civil Service Form No. 48 (Daily Time Record)'
  return `${formTitle} — ${dtrModalEmployeeName.value} (${dtrCustomRangeLabel.value})`
})

let isOpeningSingleDtr = false

watch(
  () => [normalizedDtrCustomRange.value.from, normalizedDtrCustomRange.value.to],
  () => {
    if (isOpeningSingleDtr) return
    if (showDtrModal.value && selectedDtrEmployee.value?.control_no && !dtrLoading.value) {
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
    const { from } = normalizedDtrCustomRange.value
    const [fromY, fromM] = from.split('-').map(Number)

    const year = fromY || new Date().getFullYear()
    const month = fromM || new Date().getMonth() + 1

    const res = await attendanceStore.fetchEmployeeDtr(controlNo, normalizedDtrCustomRange.value)

    if (res?.period) {
      res.period.year = year
      res.period.month = month
      res.period.month_name = getMonthName(month)
      res.period.days_in_month = new Date(year, month, 0).getDate()
    }

    dtrData.value = res
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
  const isContractual = isEmployeeContractual(employee)
  singleDtrCalendarYm.value = parseYearMonthFromDate(selectedDate.value)
  singleDtrDateRange.value = computeDefaultRange(isContractual, selectedDate.value)
  showSingleDtrSetupDialog.value = true
}

/**
 * Confirm Single DTR Date Range & Open Preview Modal (Step 2: Generate DTR)
 */
async function confirmSingleDtrSetup() {
  if (!singleDtrEmployee.value || !normalizedSingleDtrCustomRange.value) return
  const range = normalizedSingleDtrCustomRange.value
  selectedDtrEmployee.value = singleDtrEmployee.value
  isOpeningSingleDtr = true
  dtrCustomRange.value = { from: range.from, to: range.to }
  dtrData.value = null
  showSingleDtrSetupDialog.value = false
  showDtrModal.value = true

  try {
    await fetchEmployeeDtr(singleDtrEmployee.value.control_no)
  } finally {
    await nextTick()
    isOpeningSingleDtr = false
  }
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
const batchDateRef = ref(null)
const batchCalendarYm = ref(parseYearMonthFromDate(todayStr))

function onBatchCalendarNav(view) {
  if (view?.year && view?.month) {
    batchCalendarYm.value = { year: view.year, month: view.month }
  }
}

const batchActiveCalendarLabel = computed(() => {
  const { year, month } = batchCalendarYm.value
  return `${getMonthName(month)} ${year}`
})

function initBatchDateRange() {
  const isContractual = areSelectedEmployeesContractual()
  batchCalendarYm.value = parseYearMonthFromDate(selectedDate.value)
  batchDateRange.value = computeDefaultRange(isContractual, selectedDate.value)
}

function openBatchPrintDialog() {
  initBatchDateRange()
  showBulkDialog.value = true
}

// Automatically default coverage date range when bulk print dialog opens
watch(showBulkDialog, (isOpen) => {
  if (isOpen) {
    initBatchDateRange()
  }
})

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

const batchRangeDayCount = computed(() => {
  return getRangeDayCount(normalizedBatchCustomRange.value)
})

const batchRangeDisplayLabel = computed(() => {
  const range = normalizedBatchCustomRange.value
  if (!range) return 'Select start & end date below'
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

const selectedControlNoSet = computed(() => {
  return new Set(selectedEmployees.value.map((e) => e.control_no))
})

function getEmployeeStatusKey(emp) {
  const raw = String(emp?.employment_status || '').toUpperCase().trim()
  if (raw) return raw
  if (isEmployeeContractual(emp)) return 'CONTRACTUAL'
  return 'OTHER'
}

const batchEmploymentStatusOptions = computed(() => {
  const buckets = new Map()
  employeeRows.value.forEach((row) => {
    const key = getEmployeeStatusKey(row)
    if (!buckets.has(key)) {
      buckets.set(key, [])
    }
    buckets.get(key).push(row)
  })

  const priorityOrder = [
    'REGULAR',
    'CASUAL',
    'CONTRACTUAL',
    'CO-TERMINOUS',
    'ELECTIVE',
    'HONORARIUM',
  ]

  const orderedKeys = [
    ...priorityOrder.filter((k) => buckets.has(k)),
    ...Array.from(buckets.keys()).filter((k) => !priorityOrder.includes(k) && k !== 'OTHER'),
    ...(buckets.has('OTHER') ? ['OTHER'] : []),
  ]

  const selectedSet = selectedControlNoSet.value

  return orderedKeys.map((key) => {
    const rows = buckets.get(key) || []
    const selectedCount = rows.reduce(
      (acc, r) => acc + (selectedSet.has(r.control_no) ? 1 : 0),
      0
    )
    const total = rows.length
    return {
      value: key,
      label: key === 'OTHER' ? 'Unspecified' : formatEmploymentStatus(key),
      total,
      selectedCount,
      isAllSelected: total > 0 && selectedCount === total,
      isPartial: selectedCount > 0 && selectedCount < total,
    }
  })
})

function syncBatchCutoffIfStandardPreset() {
  if (selectedEmployees.value.length === 0) return
  const currentRange = batchDateRange.value
  const isOnStandardPreset =
    isDateRangeMatchingPreset(currentRange, 'month') ||
    isDateRangeMatchingPreset(currentRange, '11-25') ||
    isDateRangeMatchingPreset(currentRange, '26-10')

  if (!isOnStandardPreset) return

  const allContractual = selectedEmployees.value.every((emp) => isEmployeeContractual(emp))
  batchDateRange.value = computeDefaultRange(allContractual, selectedDate.value)
}

function toggleBatchStatusSelection(statusKey) {
  const matchingRows = employeeRows.value.filter(
    (row) => getEmployeeStatusKey(row) === statusKey
  )
  if (matchingRows.length === 0) return

  const selectedSet = selectedControlNoSet.value
  const allCurrentlySelected = matchingRows.every((r) => selectedSet.has(r.control_no))

  if (allCurrentlySelected) {
    const removeSet = new Set(matchingRows.map((r) => r.control_no))
    selectedEmployees.value = selectedEmployees.value.filter(
      (e) => !removeSet.has(e.control_no)
    )
  } else {
    const toAdd = matchingRows.filter((r) => !selectedSet.has(r.control_no))
    selectedEmployees.value = [...selectedEmployees.value, ...toAdd]
  }

  syncBatchCutoffIfStandardPreset()
}

function selectAllBatchEmployees() {
  selectedEmployees.value = [...employeeRows.value]
  syncBatchCutoffIfStandardPreset()
}

function removeEmployeeFromBatch(emp) {
  selectedEmployees.value = selectedEmployees.value.filter(
    (e) => e.control_no !== emp.control_no
  )
}


async function onBatchDtrOverrideSaved(item) {
  const controlNo = item?.employee?.control_no
  if (controlNo && normalizedBatchCustomRange.value) {
    try {
      const { from, to } = normalizedBatchCustomRange.value
      const [fromY, fromM] = from.split('-').map(Number)
      const res = await attendanceStore.fetchBulkDtr({
        controlNos: [controlNo],
        startDate: from,
        endDate: to,
        year: fromY,
        month: fromM,
      })
      const updatedEntry = res?.employees_dtr?.[0]
      if (updatedEntry) {
        const idx = batchEmployeesDtr.value.findIndex(
          (e) => e.employee?.control_no === controlNo
        )
        if (idx !== -1) {
          batchEmployeesDtr.value[idx] = updatedEntry
        }
      }
    } catch (err) {
      console.error('Failed to refresh employee DTR in batch preview:', err)
    }
  }

  fetchAttendanceOverview()
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

    const res = await attendanceStore.fetchBulkDtr({
      controlNos: selectedEmployees.value.map((e) => e.control_no),
      startDate: from,
      endDate: to,
      year: fromY,
      month: fromM,
    })
    batchPeriod.value = res?.period || {}
    batchDepartmentHeads.value = res?.department_heads || []
    batchEmployeesDtr.value = res?.employees_dtr || []
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

/* Interactive KPI Stat Cards */
.stat-card {
  border-color: #e5e7eb;
  transition: all 0.18s ease;
  user-select: none;
}

.stat-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
}

.stat-card:focus-visible {
  outline: 2px solid #15803d;
  outline-offset: 2px;
}

.stat-card-active-all {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.stat-card-active-present {
  border-color: #10b981;
  box-shadow: 0 0 0 1px #10b981;
}

.stat-card-active-late {
  border-color: #f59e0b;
  box-shadow: 0 0 0 1px #f59e0b;
}

.stat-card-active-leave {
  border-color: #6366f1;
  box-shadow: 0 0 0 1px #6366f1;
}

.stat-card-active-absent {
  border-color: #ef4444;
  box-shadow: 0 0 0 1px #ef4444;
}

/* Main Table Card & Toolbar */
.table-card {
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.border-bottom {
  border-bottom: 1px solid #f1f5f9;
}

.border-top {
  border-top: 1px solid #f1f5f9;
}

.status-filter-select {
  min-width: 185px;
}

.status-filter-select :deep(.q-field__control),
.search-employee-input :deep(.q-field__control) {
  border-radius: 6px;
}

.search-employee-input {
  min-width: 220px;
}

.date-nav-box {
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  height: 40px;
  border-radius: 6px;
}

.date-display-trigger {
  height: 30px;
  line-height: 30px;
  border-radius: 4px;
  transition: background-color 0.15s ease;
  user-select: none;
}

.date-display-trigger:hover {
  background-color: #f1f5f9;
}

.date-nav-text {
  font-size: 0.84rem;
  letter-spacing: -0.01em;
}

.toolbar-action-btn {
  height: 40px;
  border-radius: 6px;
}

.tabular-nums {
  font-variant-numeric: tabular-nums;
}

.font-mono {
  font-family: monospace;
}

/* Table Styling */
.attendance-pro-table :deep(thead tr th) {
  background-color: #f8fafc;
  color: #475569;
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 12px 14px;
  border-bottom: 1px solid #e2e8f0;
}

.attendance-pro-table :deep(tbody tr td) {
  font-size: 0.875rem;
  color: #1e293b;
  padding: 10px 14px;
  border-bottom: 1px solid #f1f5f9;
}

.attendance-pro-table :deep(tbody tr) {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.attendance-pro-table :deep(tbody tr:hover td) {
  background-color: #f8fafc !important;
}

.employee-name-text {
  font-size: 0.9rem;
  line-height: 1.25;
}

.status-badge {
  padding: 2px 8px;
}

.dtr-row-action-btn {
  opacity: 0.78;
  transition: opacity 0.15s ease, background-color 0.15s ease;
}

.attendance-pro-table :deep(tbody tr:hover) .dtr-row-action-btn,
.dtr-row-action-btn:hover {
  opacity: 1;
  background-color: #ecfdf5;
}

/* ========================================================= */
/* CS FORM NO. 48 COVERAGE DATE RANGE DIALOG UI/UX           */
/* ========================================================= */
.dtr-setup-dialog {
  width: 460px;
  max-width: 95vw;
  border-radius: 12px !important;
  overflow: hidden;
  box-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.28), 0 8px 18px -6px rgba(15, 23, 42, 0.14) !important;
}

.dtr-dialog-header {
  min-height: 58px;
  padding-top: 10px;
  padding-bottom: 10px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.dtr-dialog-body {
  gap: 12px;
  margin-top: 0 !important;
}

.dtr-header-icon-box {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.24);
  flex-shrink: 0;
}

.leading-tight {
  line-height: 1.25;
}

.flex-shrink-0 {
  flex-shrink: 0;
}

.dtr-employee-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.dtr-employee-avatar {
  background: #e8f5e9;
  color: #1b5e20;
  border: 1px solid #c8e6c9;
  font-size: 0.85rem;
}

.dtr-emp-status-pill {
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.02em;
}

.dtr-control-badge {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 4px 10px;
}

.dtr-control-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  line-height: 1.1;
}

.dtr-coverage-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

/* Selected Range Summary Banner */
.dtr-range-summary-bar {
  min-height: 32px;
  padding-top: 3px;
  padding-bottom: 3px;
  border-radius: 8px;
  transition: all 0.18s ease;
}

.dtr-range-summary-bar.is-active {
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.dtr-range-summary-bar.is-empty {
  background-color: #f8fafc;
  border: 1px dashed #cbd5e1;
}

.dtr-days-count-badge {
  font-size: 0.7rem;
  padding: 2px 7px;
  border-radius: 6px;
}

/* Segmented Cutoff Preset Bar */
.dtr-preset-segmented {
  background-color: #f1f5f9;
  padding: 3px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  gap: 4px;
}

.dtr-preset-btn {
  appearance: none;
  border: none;
  background: transparent;
  border-radius: 6px;
  padding: 5px 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.16s ease;
  color: #475569;
  user-select: none;
}

.dtr-preset-btn:hover:not(.is-active) {
  background-color: rgba(255, 255, 255, 0.65);
  color: #0f172a;
}

.dtr-preset-btn.is-active {
  background-color: #1b5e20;
  color: #ffffff;
  box-shadow: 0 2px 5px rgba(27, 94, 32, 0.25);
}

.dtr-preset-title {
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.dtr-preset-sub {
  font-size: 0.62rem;
  font-weight: 500;
  opacity: 0.78;
  line-height: 1.1;
  margin-top: 1px;
}

/* High-Contrast QDate Range Calendar */
.dtr-range-calendar {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.dtr-range-calendar :deep(.q-date__view) {
  padding: 6px 8px 6px;
  min-height: 224px;
}

.dtr-range-calendar :deep(.q-date__calendar-days-container) {
  min-height: 168px;
}

.dtr-range-calendar :deep(.q-date__navigation) {
  margin-bottom: 4px;
}

.dtr-range-calendar :deep(.q-date__navigation .q-btn) {
  font-weight: 700;
  color: #1e293b;
  font-size: 0.85rem;
}

.dtr-range-calendar :deep(.q-date__calendar-weekdays > div) {
  opacity: 1;
  color: #64748b;
  font-weight: 700;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* Soft emerald track for in-range days with high-contrast forest green text */
.dtr-range-calendar :deep(.q-date__range:before),
.dtr-range-calendar :deep(.q-date__range-from:before),
.dtr-range-calendar :deep(.q-date__range-to:before) {
  background-color: #dcfce7 !important;
  opacity: 1 !important;
  top: 2px;
  bottom: 2px;
}

.dtr-range-calendar :deep(.q-date__range .q-btn) {
  color: #14532d !important;
  font-weight: 700 !important;
}

.dtr-range-calendar :deep(.q-date__range .q-btn:hover) {
  background-color: rgba(21, 128, 61, 0.14) !important;
}

/* Solid dark green endpoints (Start & End dates) */
.dtr-range-calendar :deep(.q-date__range-from .q-btn),
.dtr-range-calendar :deep(.q-date__range-to .q-btn) {
  background-color: #1b5e20 !important;
  color: #ffffff !important;
  font-weight: 800 !important;
  box-shadow: 0 2px 6px rgba(27, 94, 32, 0.3);
}

/* Interactive range selection preview (when picking start -> end date) */
.dtr-range-calendar :deep(.q-date__edit-range-from .q-btn),
.dtr-range-calendar :deep(.q-date__edit-range-from-to .q-btn),
.dtr-range-calendar :deep(.q-date__edit-range-to .q-btn) {
  background-color: #dcfce7 !important;
  color: #1b5e20 !important;
  font-weight: 800 !important;
}

/* Today indicator ring */
.dtr-range-calendar :deep(.q-date__today) {
  box-shadow: inset 0 0 0 1.5px #15803d !important;
  font-weight: 800 !important;
}

.dtr-dialog-footer {
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.dtr-generate-btn {
  border-radius: 8px;
  height: 36px;
  box-shadow: 0 2px 6px rgba(27, 94, 32, 0.22);
}

/* Batch Multi-Select Status Bar */
.batch-status-selector {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 7px 9px;
  flex-shrink: 0;
}

.batch-status-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #475569;
}

.batch-status-hint {
  font-size: 0.68rem;
  color: #94a3b8;
  font-weight: 500;
}

.batch-status-chips-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.batch-status-chip {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  color: #334155;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
  line-height: 1.2;
}

.batch-status-chip:hover:not(.is-selected) {
  border-color: #86efac;
  background-color: #f0fdf4;
  color: #14532d;
}

.batch-status-chip:focus-visible {
  outline: 2px solid #15803d;
  outline-offset: 1px;
}

.batch-status-chip-icon {
  color: #94a3b8;
  flex-shrink: 0;
}

.batch-status-chip:hover:not(.is-selected) .batch-status-chip-icon {
  color: #15803d;
}

.batch-status-chip-text {
  font-size: 0.76rem;
  font-weight: 700;
}

.batch-status-chip-count {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background-color: #f1f5f9;
  color: #64748b;
}

.batch-status-chip.is-partial {
  background-color: #f0fdf4;
  border-color: #86efac;
  color: #166534;
}

.batch-status-chip.is-partial .batch-status-chip-icon {
  color: #15803d;
}

.batch-status-chip.is-partial .batch-status-chip-count {
  background-color: #dcfce7;
  color: #14532d;
}

.batch-status-chip.is-selected {
  background-color: #1b5e20;
  border-color: #1b5e20;
  color: #ffffff;
  box-shadow: 0 1px 4px rgba(27, 94, 32, 0.22);
}

.batch-status-chip.is-selected .batch-status-chip-icon {
  color: #ffffff;
}

.batch-status-chip.is-selected .batch-status-chip-count {
  background-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

</style>
