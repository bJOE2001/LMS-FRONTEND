<template>
  <div class="attendance-record-shell">
    <!-- Top Executive Header -->
    <q-card flat bordered class="header-card q-mb-md no-print bg-white rounded-borders">
      <q-card-section class="q-pa-md">
        <div class="row items-center justify-between q-col-gutter-md">
          <!-- Left: Back Button + Employee Profile Info -->
          <div class="col-12 col-md-auto">
            <div class="row items-center no-wrap q-gutter-x-md">
              <q-btn
                flat
                round
                dense
                color="green-9"
                icon="arrow_back"
                class="back-circle-btn"
                @click="goBack"
              >
                <q-tooltip class="bg-dark">Back to Attendance List</q-tooltip>
              </q-btn>

              <template v-if="loading && !dtrData">
                <q-skeleton type="QAvatar" size="52px" animation="wave" />
                <div class="q-ml-sm">
                  <div class="row items-center q-gutter-x-sm no-wrap">
                    <q-skeleton type="text" width="180px" height="24px" animation="wave" />
                  </div>
                  <div class="row items-center q-gutter-x-sm q-mt-xs">
                    <q-skeleton type="text" width="120px" height="16px" animation="wave" />
                    <q-skeleton type="rect" width="150px" height="18px" class="rounded-borders" animation="wave" />
                  </div>
                </div>
              </template>
              <template v-else>
                <q-avatar size="52px" font-size="20px" color="green-1" text-color="green-9" class="text-weight-bold employee-avatar">
                  {{ getInitials(employeeName) }}
                </q-avatar>

                <div>
                  <div class="row items-center q-gutter-x-sm no-wrap">
                    <h1 class="text-h6 text-weight-bolder text-dark q-my-none ellipsis employee-name-title">
                      {{ employeeName }}
                    </h1>
                  </div>

                  <div class="row items-center q-gutter-x-sm q-mt-xs text-caption text-grey-7">
                    <span class="text-weight-medium text-dark text-uppercase">{{ employeeDesignation }}</span>
                    <span class="text-grey-4">•</span>
                    <q-badge color="green-1" text-color="green-9" class="q-px-sm q-py-xs text-weight-bold">
                      <q-icon name="schedule" size="13px" class="q-mr-xs" />
                      Regular Shift (8:00 AM – 5:00 PM)
                    </q-badge>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- Right: Date Range Picker & Action Buttons -->
          <div class="col-12 col-md-auto">
            <div class="row items-center justify-end q-gutter-sm">
              <template v-if="loading && !dtrData">
                <q-skeleton type="rect" width="165px" height="38px" class="rounded-borders" animation="wave" />
                <q-skeleton type="rect" width="125px" height="38px" class="rounded-borders" animation="wave" />
              </template>
              <template v-else>
                <!-- Single Calendar Date Range Picker -->
                <div
                  class="header-date-range-trigger row items-center no-wrap q-px-md cursor-pointer rounded-borders"
                >
                  <q-icon name="date_range" size="18px" color="green-9" class="q-mr-sm" />
                  <span class="text-body2 text-weight-bold text-dark">{{ customRangeDisplayLabel }}</span>
                  <q-icon name="arrow_drop_down" size="20px" color="grey-7" class="q-ml-xs" />

                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date
                      v-model="datePickerModel"
                      range
                      mask="YYYY-MM-DD"
                      color="green-9"
                      minimal
                    >
                      <div class="row items-center justify-between q-gutter-x-sm">
                        <span class="text-caption text-grey-7">{{ customRangeDisplayLabel }}</span>
                        <q-btn
                          v-close-popup
                          label="Apply"
                          color="green-9"
                          flat
                          dense
                          no-caps
                          class="text-weight-bold"
                        />
                      </div>
                    </q-date>
                  </q-popup-proxy>
                </div>

                <!-- Action Button -->
                <q-btn
                  unelevated
                  no-caps
                  color="green-9"
                  icon="visibility"
                  label="DTR Preview"
                  class="action-btn text-weight-bold"
                  @click="showPreviewDialog = true"
                >
                  <q-tooltip>Preview Civil Service Form No. 48</q-tooltip>
                </q-btn>
              </template>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Indeterminate Top Progress Bar for Background Reloads -->
    <q-linear-progress
      v-if="loading && dtrData"
      indeterminate
      color="green-9"
      size="3px"
      class="q-mb-md rounded-borders no-print top-reload-bar"
    />

    <!-- Initial Loading State: Realistic Skeleton Screen Suite -->
    <div v-if="loading && !dtrData" class="skeleton-suite no-print">
      <!-- 5 Skeleton KPI Stat Cards -->
      <div class="row q-col-gutter-md q-mb-md">
        <div v-for="i in 5" :key="'sk-kpi-' + i" class="col-12 col-sm-6 col-md">
          <q-card flat bordered class="rounded-borders stat-kpi-card bg-white">
            <q-card-section class="q-pa-md">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <q-skeleton type="text" width="75px" height="16px" animation="wave" />
                <q-skeleton type="QAvatar" size="32px" animation="wave" />
              </div>
              <div class="row items-baseline q-gutter-x-xs q-my-xs">
                <q-skeleton type="text" width="55px" height="34px" animation="wave" />
                <q-skeleton type="text" width="28px" height="16px" animation="wave" />
              </div>
              <q-skeleton type="text" width="120px" height="14px" animation="wave" />
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Skeleton Tab Navigation Bar -->
      <div class="q-mb-md">
        <q-card flat bordered class="bg-white rounded-borders q-pa-xs shadow-1">
          <div class="row items-center q-gutter-x-md q-px-sm q-py-xs">
            <q-skeleton type="rect" width="190px" height="36px" class="rounded-borders" animation="wave" />
            <q-skeleton type="rect" width="150px" height="36px" class="rounded-borders" animation="wave" />
          </div>
        </q-card>
      </div>

      <!-- Skeleton Table Card -->
      <q-card flat bordered class="rounded-borders bg-white table-card">
        <q-card-section class="q-pa-md row items-center justify-between border-bottom">
          <div>
            <q-skeleton type="text" width="180px" height="24px" animation="wave" />
            <q-skeleton type="text" width="240px" height="14px" class="q-mt-xs" animation="wave" />
          </div>
          <q-skeleton type="text" width="130px" height="16px" animation="wave" />
        </q-card-section>

        <!-- Skeleton Table Body -->
        <div class="q-pa-md">
          <!-- Table Columns Header Placeholder -->
          <div class="row items-center q-pb-sm border-bottom q-col-gutter-sm text-grey-5">
            <div class="col-2"><q-skeleton type="text" width="60%" height="16px" animation="wave" /></div>
            <div class="col-2"><q-skeleton type="text" width="75%" height="16px" animation="wave" /></div>
            <div class="col-2"><q-skeleton type="text" width="75%" height="16px" animation="wave" /></div>
            <div class="col-2"><q-skeleton type="text" width="75%" height="16px" animation="wave" /></div>
            <div class="col-2"><q-skeleton type="text" width="75%" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="55%" height="16px" animation="wave" /></div>
            <div class="col-1 text-right"><q-skeleton type="text" width="70%" height="16px" class="q-ml-auto" animation="wave" /></div>
          </div>

          <!-- 8 Realistic Skeleton Rows -->
          <div
            v-for="r in 8"
            :key="'sk-row-' + r"
            class="row items-center q-py-md border-bottom q-col-gutter-sm"
            :class="{ 'bg-grey-1': r % 2 === 0 }"
          >
            <div class="col-2">
              <div class="row items-center no-wrap q-gutter-x-sm">
                <q-skeleton type="rect" width="34px" height="22px" class="rounded-borders" animation="wave" />
                <q-skeleton type="text" width="60px" height="18px" animation="wave" />
              </div>
            </div>
            <div class="col-2"><q-skeleton type="text" width="70px" height="18px" animation="wave" /></div>
            <div class="col-2"><q-skeleton type="text" width="70px" height="18px" animation="wave" /></div>
            <div class="col-2"><q-skeleton type="text" width="70px" height="18px" animation="wave" /></div>
            <div class="col-2"><q-skeleton type="text" width="70px" height="18px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="rect" width="50px" height="22px" class="rounded-borders" animation="wave" /></div>
            <div class="col-1 text-right"><q-skeleton type="QAvatar" size="26px" class="q-ml-auto" animation="wave" /></div>
          </div>
        </div>

        <!-- Skeleton Pagination Bar -->
        <div class="q-pa-sm row items-center justify-between bg-grey-1 border-top">
          <q-skeleton type="text" width="110px" height="16px" animation="wave" />
          <q-skeleton type="rect" width="140px" height="30px" class="rounded-borders" animation="wave" />
        </div>
      </q-card>
    </div>

    <!-- Error State -->
    <q-banner v-else-if="errorMessage" class="bg-red-1 text-negative rounded-borders q-my-md shadow-1">
      <template #avatar>
        <q-icon name="error_outline" color="negative" size="28px" />
      </template>
      <div class="text-weight-bold">Unable to load attendance records</div>
      <div class="text-caption">{{ errorMessage }}</div>
      <template #action>
        <q-btn flat no-caps color="negative" label="Retry" @click="fetchMonthlyDtr" />
      </template>
    </q-banner>

    <div v-else :class="{ 'content-reloading': loading && dtrData }">
      <!-- 5 Summary KPI Stat Cards -->
      <div class="row q-col-gutter-md q-mb-md no-print">
        <!-- Present Days -->
        <div class="col-12 col-sm-6 col-md">
          <q-card flat bordered class="rounded-borders stat-kpi-card bg-white">
            <q-card-section class="q-pa-md">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <span class="stat-kpi-label">Present Days</span>
                <div class="stat-icon-wrap bg-green-1 text-green-9">
                  <q-icon name="check_circle" size="20px" />
                </div>
              </div>
              <div class="row items-baseline q-gutter-x-xs">
                <span class="stat-kpi-value text-dark">{{ summaryMetrics.present_days }}</span>
                <span class="stat-kpi-unit text-grey-6">days</span>
              </div>
              <div class="text-caption text-grey-5 q-mt-xs">Standard attendance</div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Absent Days -->
        <div class="col-12 col-sm-6 col-md">
          <q-card flat bordered class="rounded-borders stat-kpi-card bg-white">
            <q-card-section class="q-pa-md">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <span class="stat-kpi-label">Absent Days</span>
                <div class="stat-icon-wrap bg-red-1 text-red-9">
                  <q-icon name="event_busy" size="20px" />
                </div>
              </div>
              <div class="row items-baseline q-gutter-x-xs">
                <span class="stat-kpi-value text-dark">{{ summaryMetrics.absent_days }}</span>
                <span class="stat-kpi-unit text-grey-6">days</span>
              </div>
              <div class="text-caption text-grey-5 q-mt-xs">Unexcused work days</div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Late Incidents -->
        <div class="col-12 col-sm-6 col-md">
          <q-card flat bordered class="rounded-borders stat-kpi-card bg-white">
            <q-card-section class="q-pa-md">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <span class="stat-kpi-label">Late Records</span>
                <div class="stat-icon-wrap bg-amber-1 text-amber-9">
                  <q-icon name="history_toggle_off" size="20px" />
                </div>
              </div>
              <div class="row items-baseline q-gutter-x-xs">
                <span class="stat-kpi-value text-dark">{{ summaryMetrics.late_days }}</span>
                <span class="stat-kpi-unit text-grey-6">days</span>
              </div>
              <div class="text-caption text-grey-5 q-mt-xs">Morning or lunch delay</div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Overtime Days -->
        <div class="col-12 col-sm-6 col-md">
          <q-card flat bordered class="rounded-borders stat-kpi-card bg-white">
            <q-card-section class="q-pa-md">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <span class="stat-kpi-label">Overtime Days</span>
                <div class="stat-icon-wrap bg-indigo-1 text-indigo-9">
                  <q-icon name="more_time" size="20px" />
                </div>
              </div>
              <div class="row items-baseline q-gutter-x-xs">
                <span class="stat-kpi-value text-dark">{{ summaryMetrics.overtime_days }}</span>
                <span class="stat-kpi-unit text-grey-6">days</span>
              </div>
              <div class="text-caption text-grey-5 q-mt-xs">Authorized extensions</div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Total Worked Hours -->
        <div class="col-12 col-sm-6 col-md">
          <q-card flat bordered class="rounded-borders stat-kpi-card bg-white">
            <q-card-section class="q-pa-md">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <span class="stat-kpi-label">Worked Hours</span>
                <div class="stat-icon-wrap bg-teal-1 text-teal-9">
                  <q-icon name="schedule" size="20px" />
                </div>
              </div>
              <div class="row items-baseline q-gutter-x-xs">
                <span class="stat-kpi-value text-dark">{{ summaryMetrics.total_worked_hours }}</span>
                <span class="stat-kpi-unit text-grey-6">hrs</span>
              </div>
              <div class="text-caption text-grey-5 q-mt-xs">Total rendered time</div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Navigation Tabs (DTR vs Overtime) -->
      <div class="q-mb-md no-print">
        <q-tabs
          v-model="activeTab"
          dense
          no-caps
          align="left"
          indicator-color="green-9"
          active-color="green-9"
          class="text-grey-7 attendance-nav-tabs bg-white rounded-borders shadow-1"
        >
          <q-tab name="dtr" class="q-px-lg">
            <template #default>
              <div class="row items-center q-gutter-x-sm">
                <q-icon name="event_note" size="18px" />
                <span class="text-weight-bold">Daily Time Record (DTR)</span>
                <q-badge color="grey-3" text-color="dark" rounded class="font-mono q-ml-xs">
                  {{ monthDayRows.length }}
                </q-badge>
              </div>
            </template>
          </q-tab>

          <q-tab name="overtime" class="q-px-lg">
            <template #default>
              <div class="row items-center q-gutter-x-sm">
                <q-icon name="alarm_on" size="18px" />
                <span class="text-weight-bold">Overtime Records</span>
                <q-badge
                  :color="overtimeRows.length > 0 ? 'indigo-1' : 'grey-3'"
                  :text-color="overtimeRows.length > 0 ? 'indigo-9' : 'grey-7'"
                  rounded
                  class="font-mono q-ml-xs"
                >
                  {{ overtimeRows.length }}
                </q-badge>
              </div>
            </template>
          </q-tab>
        </q-tabs>
      </div>

      <!-- Tab Panels -->
      <q-tab-panels v-model="activeTab" animated class="bg-transparent no-print">
        <!-- Panel 1: Daily Time Record (DTR) -->
        <q-tab-panel name="dtr" class="q-pa-none">
          <q-card flat bordered class="rounded-borders bg-white table-card">
            <q-card-section class="q-pa-md row items-center justify-between q-col-gutter-sm border-bottom">
              <div class="col-12 col-md-auto">
                <div class="text-subtitle1 text-weight-bolder text-dark">
                  Attendance Record Log
                </div>
                <div class="text-caption text-grey-6">
                  Official CSC Form 48 log for {{ customRangeDisplayLabel }}
                </div>
              </div>

              <div class="col-12 col-md-auto">
                <div class="text-caption text-grey-7">
                  Showing <strong>{{ monthDayRows.length }}</strong> days
                </div>
              </div>
            </q-card-section>

            <q-table
              :rows="monthDayRows"
              :columns="dtrColumns"
              row-key="record_date"
              flat
              :loading="loading"
              :rows-per-page-options="[10, 15, 31]"
              v-model:pagination="pagination"
              class="attendance-pro-table"
            >
              <!-- Date Column -->
              <template #body-cell-date="props">
                <q-td :props="props" class="text-left">
                  <div class="row items-center no-wrap q-gutter-x-sm">
                    <span
                      class="day-pill"
                      :class="isWeekendDay(props.row) ? 'weekend-day-pill' : 'weekday-pill'"
                    >
                      {{ getDayShort(props.row.record_date) }}
                    </span>
                    <div>
                      <div class="text-weight-bold text-dark font-mono">
                        {{ formatDateNumeric(props.row.record_date) }}
                      </div>
                      <div class="text-caption text-grey-6" style="font-size: 0.75rem;">
                        {{ formatDateMonthDay(props.row.record_date) }}
                      </div>
                    </div>
                  </div>
                </q-td>
              </template>

              <!-- AM Time In (Morning Arrival) -->
              <template #body-cell-time_in="props">
                <q-td :props="props" class="text-left font-mono">
                  <div v-if="props.row.am_arrival" class="row items-center no-wrap q-gutter-x-xs">
                    <span :class="isRowLate(props.row) ? 'text-negative text-weight-bold' : 'text-dark text-weight-medium'">
                      {{ formatPunchTime(props.row.am_arrival) }}
                    </span>
                    <q-badge
                      v-if="isRowLate(props.row)"
                      color="red-1"
                      text-color="negative"
                      class="q-pa-none q-px-xs text-weight-bold font-mono"
                      size="xs"
                    >
                      +{{ props.row.late_minutes }}m
                      <q-tooltip>Tardy: {{ props.row.late_minutes }} minute(s) late</q-tooltip>
                    </q-badge>
                  </div>
                  <span v-else class="text-grey-4">—</span>
                </q-td>
              </template>

              <!-- AM Time Out (Lunch Out) -->
              <template #body-cell-time_out="props">
                <q-td :props="props" class="text-left font-mono">
                  <span v-if="props.row.am_departure" class="text-dark text-weight-medium">
                    {{ formatPunchTime(props.row.am_departure) }}
                  </span>
                  <span v-else class="text-grey-4">—</span>
                </q-td>
              </template>

              <!-- PM Time In (Lunch In) -->
              <template #body-cell-pm_time_in="props">
                <q-td :props="props" class="text-left font-mono">
                  <span v-if="props.row.pm_arrival" class="text-dark text-weight-medium">
                    {{ formatPunchTime(props.row.pm_arrival) }}
                  </span>
                  <span v-else class="text-grey-4">—</span>
                </q-td>
              </template>

              <!-- PM Time Out (Afternoon Departure) -->
              <template #body-cell-pm_time_out="props">
                <q-td :props="props" class="text-left font-mono">
                  <div v-if="props.row.pm_departure" class="row items-center no-wrap q-gutter-x-xs">
                    <span :class="isRowUndertime(props.row) ? 'text-negative text-weight-bold' : 'text-dark text-weight-medium'">
                      {{ formatPunchTime(props.row.pm_departure) }}
                    </span>
                    <q-badge
                      v-if="isRowUndertime(props.row)"
                      color="orange-1"
                      text-color="deep-orange-9"
                      class="q-pa-none q-px-xs text-weight-bold font-mono"
                      size="xs"
                    >
                      -{{ props.row.undertime_minutes }}m
                      <q-tooltip>Undertime: {{ props.row.undertime_minutes }} minute(s)</q-tooltip>
                    </q-badge>
                  </div>
                  <span v-else class="text-grey-4">—</span>
                </q-td>
              </template>

              <!-- Rendered Hours -->
              <template #body-cell-rendered_hours="props">
                <q-td :props="props" class="text-center font-mono">
                  <span
                    v-if="Number(props.row.rendered_hours || 0) > 0"
                    class="text-weight-bold text-dark"
                  >
                    {{ Number(props.row.rendered_hours).toFixed(1) }} <span class="text-caption text-grey-6">hrs</span>
                  </span>
                  <span v-else class="text-grey-4">—</span>
                </q-td>
              </template>

              <!-- Status & Remarks Column -->
              <template #body-cell-status="props">
                <q-td :props="props" class="text-center">
                  <div class="row inline items-center q-gutter-x-xs no-wrap">
                    <q-chip
                      dense
                      size="sm"
                      :color="getStatusColor(props.row).bg"
                      :text-color="getStatusColor(props.row).text"
                      class="text-weight-bold q-my-none"
                    >
                      <q-icon :name="getStatusColor(props.row).icon" size="12px" class="q-mr-xs" />
                      {{ getStatusLabel(props.row) }}
                    </q-chip>

                    <!-- Adjusted Indicator Chip -->
                    <q-badge
                      v-if="props.row.is_adjusted"
                      color="purple-1"
                      text-color="purple-9"
                      class="q-px-xs text-weight-bold cursor-pointer"
                      rounded
                    >
                      <q-icon name="edit_calendar" size="11px" class="q-mr-xs" />
                      Adjusted
                      <q-tooltip class="bg-dark text-white">
                        Reason: {{ props.row.adjustment_reason || 'Manual override recorded' }}
                      </q-tooltip>
                    </q-badge>
                  </div>
                </q-td>
              </template>

              <!-- Action Column (Clock with Pen) -->
              <template #body-cell-action="props">
                <q-td :props="props" class="text-right">
                  <q-btn
                    flat
                    round
                    dense
                    size="sm"
                    color="primary"
                    icon="edit_calendar"
                    class="action-override-btn"
                    @click="openOverrideDialog(props.row)"
                  >
                    <q-tooltip class="bg-dark">Override / Adjust Time</q-tooltip>
                  </q-btn>
                </q-td>
              </template>

              <template #no-data>
                <div class="full-width text-center q-py-xl text-grey-6">
                  <q-icon name="event_busy" size="48px" color="grey-4" />
                  <div class="text-subtitle1 text-weight-bold q-mt-sm">No Attendance Records Found</div>
                  <div class="text-caption">There are no attendance punches recorded for this period.</div>
                </div>
              </template>
            </q-table>
          </q-card>
        </q-tab-panel>

        <!-- Panel 2: Overtime Records -->
        <q-tab-panel name="overtime" class="q-pa-none">
          <q-card flat bordered class="rounded-borders bg-white table-card">
            <q-card-section class="q-pa-md row items-center justify-between border-bottom">
              <div>
                <div class="text-subtitle1 text-weight-bolder text-dark">
                  Authorized Overtime Records
                </div>
                <div class="text-caption text-grey-6">
                  Overtime entries logged beyond regular shift for {{ customRangeDisplayLabel }}
                </div>
              </div>

              <div class="text-caption text-grey-7">
                Total Overtime Entries: <strong>{{ overtimeRows.length }}</strong>
              </div>
            </q-card-section>

            <q-table
              :rows="overtimeRows"
              :columns="overtimeColumns"
              row-key="record_date"
              flat
              :loading="loading"
              :rows-per-page-options="[10, 15, 31]"
              v-model:pagination="overtimePagination"
              class="attendance-pro-table"
            >
              <!-- Date Column -->
              <template #body-cell-date="props">
                <q-td :props="props" class="text-left">
                  <div class="row items-center no-wrap q-gutter-x-sm">
                    <span class="day-pill weekday-pill">
                      {{ getDayShort(props.row.record_date) }}
                    </span>
                    <div>
                      <div class="text-weight-bold text-dark font-mono">
                        {{ formatDateNumeric(props.row.record_date) }}
                      </div>
                      <div class="text-caption text-grey-6" style="font-size: 0.75rem;">
                        {{ formatDateMonthDay(props.row.record_date) }}
                      </div>
                    </div>
                  </div>
                </q-td>
              </template>

              <!-- OT Time In -->
              <template #body-cell-ot_time_in="props">
                <q-td :props="props" class="text-left font-mono">
                  <span v-if="props.row.ot_arrival" class="text-dark text-weight-bold">
                    {{ formatPunchTime(props.row.ot_arrival) }}
                  </span>
                  <span v-else class="text-grey-4">—</span>
                </q-td>
              </template>

              <!-- OT Time Out -->
              <template #body-cell-ot_time_out="props">
                <q-td :props="props" class="text-left font-mono">
                  <span v-if="props.row.ot_departure" class="text-dark text-weight-bold">
                    {{ formatPunchTime(props.row.ot_departure) }}
                  </span>
                  <span v-else class="text-grey-4">—</span>
                </q-td>
              </template>

              <!-- Overtime Hours -->
              <template #body-cell-ot_hours="props">
                <q-td :props="props" class="text-left font-mono">
                  <q-badge color="indigo-1" text-color="indigo-9" class="q-px-sm q-py-xs text-weight-bold">
                    <q-icon name="timer" size="13px" class="q-mr-xs" />
                    {{ formatOtHours(props.row) }}
                  </q-badge>
                </q-td>
              </template>

              <!-- Action Column -->
              <template #body-cell-action="props">
                <q-td :props="props" class="text-right">
                  <q-btn
                    flat
                    round
                    dense
                    size="sm"
                    color="primary"
                    icon="edit_calendar"
                    class="action-override-btn"
                    @click="openOverrideDialog(props.row)"
                  >
                    <q-tooltip class="bg-dark">Override Overtime</q-tooltip>
                  </q-btn>
                </q-td>
              </template>

              <template #no-data>
                <div class="full-width text-center q-py-xl text-grey-6">
                  <q-icon name="alarm_off" size="48px" color="grey-4" />
                  <div class="text-subtitle1 text-weight-bold q-mt-sm">No Overtime Entries</div>
                  <div class="text-caption">No overtime hours rendered for this period.</div>
                </div>
              </template>
            </q-table>
          </q-card>
        </q-tab-panel>
      </q-tab-panels>
    </div>

    <!-- Override Time Dialog -->
    <DtrOverrideDialog
      v-model="showOverrideDialog"
      :control-no="employeeControlNo"
      :employee-name="employeeName"
      :date="activeOverrideDate"
      :dtr="activeOverrideDtr"
      @saved="onOverrideSaved"
    />

    <!-- CSC Form 48 Preview Dialog -->
    <q-dialog
      v-model="showPreviewDialog"
      :maximized="isDialogMaximized"
      transition-show="scale"
      transition-hide="scale"
    >
      <q-card
        :style="isDialogMaximized ? 'width: 100vw; height: 100vh;' : 'width: 1080px; max-width: 96vw; max-height: 92vh;'"
        class="bg-grey-2 column no-wrap rounded-borders"
      >
        <q-bar class="bg-green-9 text-white q-py-sm no-print">
          <q-icon name="description" class="q-mr-xs" />
          <div class="text-weight-bold ellipsis" style="max-width: 650px;">
            Civil Service Form No. 48 & Accomplishment Report — {{ employeeName }} ({{ customRangeDisplayLabel }})
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
              v-model:custom-date-range="customDateRange"
              :records="dtrData.records"
              :employee="dtrData.employee"
              :period="dtrData.period"
              :summary="dtrData.summary"
              :department-heads="dtrData.department_heads"
              :loading="loading"
              @adjust="openOverrideDialog"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from 'boot/axios'
import DailyTimeRecordTable from 'src/components/admin/DailyTimeRecordTable.vue'
import DtrOverrideDialog from 'src/components/admin/DtrOverrideDialog.vue'

const props = defineProps({
  employeeId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['back'])
const router = useRouter()

const loading = ref(false)
const errorMessage = ref('')
const dtrData = ref(null)

const activeTab = ref('dtr')
const showPreviewDialog = ref(false)
const isDialogMaximized = ref(false)
const showOverrideDialog = ref(false)
const activeOverrideDate = ref('')
const activeOverrideDtr = ref(null)
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

function buildDefaultFullMonthRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const m = String(month).padStart(2, '0')
  const lastDay = String(new Date(year, month, 0).getDate()).padStart(2, '0')
  return {
    from: `${year}-${m}-01`,
    to: `${year}-${m}-${lastDay}`,
  }
}

const customDateRange = ref(buildDefaultFullMonthRange())

const datePickerModel = computed({
  get() {
    return customDateRange.value || buildDefaultFullMonthRange()
  },
  set(val) {
    if (!val) return
    customDateRange.value = typeof val === 'string' ? { from: val, to: val } : val
  },
})

const normalizedCustomRange = computed(() => {
  const val = customDateRange.value || buildDefaultFullMonthRange()
  if (typeof val === 'string') {
    return { from: val, to: val }
  }
  const from = val?.from || buildDefaultFullMonthRange().from
  const to = val?.to || from
  return from <= to ? { from, to } : { from: to, to: from }
})

const customRangeDisplayLabel = computed(() => {
  const { from, to } = normalizedCustomRange.value
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
  () => [normalizedCustomRange.value.from, normalizedCustomRange.value.to],
  () => {
    fetchMonthlyDtr()
  }
)

const pagination = ref({
  page: 1,
  rowsPerPage: 15,
})

const overtimePagination = ref({
  page: 1,
  rowsPerPage: 10,
})

const dtrColumns = [
  { name: 'date', label: 'Date', field: 'record_date', align: 'left', sortable: true },
  { name: 'time_in', label: 'Time In', field: 'am_arrival', align: 'left' },
  { name: 'time_out', label: 'Time Out (AM)', field: 'am_departure', align: 'left' },
  { name: 'pm_time_in', label: 'Time In (PM)', field: 'pm_arrival', align: 'left' },
  { name: 'pm_time_out', label: 'Time Out', field: 'pm_departure', align: 'left' },
  { name: 'rendered_hours', label: 'Rendered Hours', field: 'rendered_hours', align: 'center' },
  { name: 'status', label: 'Status / Remarks', field: 'status', align: 'center' },
  { name: 'action', label: 'Action', field: 'action', align: 'right' },
]

const overtimeColumns = [
  { name: 'date', label: 'Date', field: 'record_date', align: 'left', sortable: true },
  { name: 'ot_time_in', label: 'Overtime In', field: 'ot_arrival', align: 'left' },
  { name: 'ot_time_out', label: 'Overtime Out', field: 'ot_departure', align: 'left' },
  { name: 'ot_hours', label: 'Rendered Overtime', field: 'overtime_minutes', align: 'left' },
  { name: 'action', label: 'Action', field: 'action', align: 'right' },
]

const employeeName = computed(() => {
  return dtrData.value?.employee?.name || 'Employee'
})

const employeeDesignation = computed(() => {
  return dtrData.value?.employee?.designation || 'Staff Member'
})

const employeeControlNo = computed(() => {
  return dtrData.value?.employee?.control_no || props.employeeId || ''
})

// Filtered rows in the active date range
const monthDayRows = computed(() => {
  if (!dtrData.value?.records) return []
  const { from, to } = normalizedCustomRange.value
  return dtrData.value.records.filter((r) => r.record_date >= from && r.record_date <= to)
})

const summaryMetrics = computed(() => {
  const rows = monthDayRows.value
  const presentDays = rows.filter((r) => r.status === 'PRESENT').length
  const absentDays = rows.filter((r) => r.status === 'ABSENT').length
  const lateDays = rows.filter((r) => Number(r.late_minutes || 0) > 0).length
  const overtimeDays = rows.filter(
    (r) => (r.overtime_minutes && r.overtime_minutes > 0) || r.ot_arrival || r.ot_departure
  ).length
  const totalWorkedHours = rows
    .reduce((sum, r) => sum + Number(r.rendered_hours || 0), 0)
    .toFixed(1)

  return {
    present_days: presentDays,
    absent_days: absentDays,
    late_days: lateDays,
    overtime_days: overtimeDays,
    total_worked_hours: totalWorkedHours,
  }
})

// Overtime rows within active date range
const overtimeRows = computed(() => {
  return monthDayRows.value.filter(
    (r) => (r.overtime_minutes && r.overtime_minutes > 0) || r.ot_arrival || r.ot_departure
  )
})

function getInitials(name) {
  if (!name) return 'EM'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getMonthName(monthNumber) {
  return MONTH_NAMES[monthNumber - 1] || ''
}

function getDayShort(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short' })
  } catch {
    return ''
  }
}

function formatDateNumeric(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatDateMonthDay(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function isWeekendDay(row) {
  if (!row?.record_date) return false
  try {
    const d = new Date(row.record_date + 'T00:00:00')
    const day = d.getDay()
    return day === 0 || day === 6
  } catch {
    return false
  }
}

function getStatusLabel(row) {
  if (row.status === 'ON_LEAVE') return 'On Leave'
  if (row.status === 'PRESENT') return 'Present'
  if (row.status === 'ABSENT') return 'Absent'
  if (row.status === 'WEEKEND') return 'Weekend'
  if (row.status === 'HOLIDAY') return 'Holiday'
  if (row.status === 'REST_DAY') return 'Rest Day'
  if (isWeekendDay(row)) return 'Weekend'
  if (row.am_arrival || row.pm_departure) return 'Present'
  return row.status || 'Pending'
}

function getStatusColor(row) {
  const label = getStatusLabel(row)
  switch (label) {
    case 'Present':
      return { bg: 'green-1', text: 'green-9', icon: 'check_circle' }
    case 'Absent':
      return { bg: 'red-1', text: 'red-9', icon: 'cancel' }
    case 'On Leave':
      return { bg: 'blue-1', text: 'blue-9', icon: 'event_note' }
    case 'Weekend':
    case 'Rest Day':
      return { bg: 'grey-2', text: 'grey-7', icon: 'weekend' }
    case 'Holiday':
      return { bg: 'purple-1', text: 'purple-9', icon: 'celebration' }
    default:
      return { bg: 'grey-2', text: 'grey-8', icon: 'help_outline' }
  }
}

function formatPunchTime(timeStr) {
  if (!timeStr || timeStr === '—' || timeStr === '-') return '—'
  if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) {
    return timeStr.trim()
  }
  const parts = timeStr.split(':')
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

function formatOtHours(row) {
  const mins = row.overtime_minutes || 0
  if (mins <= 0) return '—'
  const hrs = (mins / 60).toFixed(1)
  return `${hrs} hr(s) (${mins} mins)`
}

function isRowLate(row) {
  return Number(row.late_minutes || 0) > 0
}

function isRowUndertime(row) {
  return Number(row.undertime_minutes || 0) > 0
}

function goBack() {
  emit('back')
  router.push('/admin/attendance')
}

function openOverrideDialog(row) {
  activeOverrideDate.value = row?.record_date || normalizedCustomRange.value.from
  activeOverrideDtr.value = row?.dtr || row
  showOverrideDialog.value = true
}

function onOverrideSaved() {
  fetchMonthlyDtr()
}

async function fetchMonthlyDtr() {
  if (!props.employeeId) return

  loading.value = true
  errorMessage.value = ''

  try {
    const { from, to } = normalizedCustomRange.value
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

    const res = await api.get(`/attendance/dtr/employee/${props.employeeId}`, {
      params,
    })

    if (res.data?.period) {
      res.data.period.year = year
      res.data.period.month = month
      res.data.period.month_name = getMonthName(month)
      res.data.period.days_in_month = new Date(year, month, 0).getDate()
    }

    dtrData.value = res.data
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Failed to load employee Daily Time Record.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchMonthlyDtr()
})
</script>

<style scoped>
.attendance-record-shell {
  max-width: 1350px;
  margin: 0 auto;
}

.header-date-range-trigger {
  height: 38px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  transition: all 0.15s ease;
  user-select: none;
}

.header-date-range-trigger:hover {
  background: #f1f5f9;
  border-color: #2e7d32;
}

.header-card {
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.back-circle-btn {
  background-color: #f1f5f9;
  transition: all 0.2s ease;
}

.back-circle-btn:hover {
  background-color: #e2e8f0;
  transform: translateX(-2px);
}

.employee-avatar {
  border: 2px solid #bbf7d0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}

.employee-name-title {
  max-width: 420px;
  letter-spacing: -0.01em;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.action-btn {
  height: 38px;
  border-radius: 6px;
  font-size: 0.85rem;
  padding: 0 14px;
  transition: all 0.2s ease;
}

.action-btn:hover {
  transform: translateY(-1px);
}

/* KPI Stat Cards */
.stat-kpi-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.stat-kpi-label {
  font-size: 0.8rem;
  color: #475569;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.stat-icon-wrap {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-kpi-value {
  font-size: 1.85rem;
  font-weight: 800;
  line-height: 1;
}

.stat-kpi-unit {
  font-size: 0.85rem;
  font-weight: 600;
}

/* Nav Tabs */
.attendance-nav-tabs {
  border: 1px solid #e2e8f0;
}

.attendance-nav-tabs :deep(.q-tab__indicator) {
  height: 3px;
  border-radius: 3px 3px 0 0;
}

/* Table Card */
.table-card {
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.border-bottom {
  border-bottom: 1px solid #f1f5f9;
}

.attendance-pro-table :deep(thead tr th) {
  background-color: #f8fafc;
  color: #334155;
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 12px 16px;
  border-bottom: 1.5px solid #e2e8f0;
}

.attendance-pro-table :deep(tbody tr td) {
  font-size: 0.88rem;
  color: #1e293b;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.attendance-pro-table :deep(tbody tr:hover td) {
  background-color: #f8fafc;
}

.day-pill {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  min-width: 36px;
  text-align: center;
}

.weekday-pill {
  background-color: #f1f5f9;
  color: #475569;
}

.weekend-day-pill {
  background-color: #fee2e2;
  color: #991b1b;
}

.action-override-btn {
  background-color: #f1f5f9;
  transition: all 0.2s ease;
}

.action-override-btn:hover {
  background-color: #e2e8f0;
  transform: scale(1.08);
}

.top-reload-bar {
  box-shadow: 0 1px 4px rgba(46, 125, 50, 0.3);
}

.border-green-subtle {
  border: 1px solid #c8e6c9;
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
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media print {
  .no-print {
    display: none !important;
  }

  .print-only {
    display: block !important;
  }
}

@media screen {
  .print-only {
    display: none !important;
  }
}
</style>
