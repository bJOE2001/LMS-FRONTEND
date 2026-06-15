<template>
  <q-page class="analytics-page">
    <div class="analytics-content">
      <div class="analytics-page-header">
        <div>
          <h1 class="analytics-page-header__title">Leave Analytics Dashboard</h1>
          <p class="analytics-page-header__subtitle">
            Workforce demographics and employment status insights for leave monitoring.
          </p>
        </div>
        <div class="analytics-page-header__actions">
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="refresh"
            label="Refresh"
            :loading="analyticsStore.loading"
            @click="analyticsStore.fetchAnalytics"
          />
        </div>
      </div>

      <q-banner v-if="analyticsStore.error" rounded class="bg-red-1 text-negative q-mb-md">
        <template #avatar>
          <q-icon name="error_outline" />
        </template>
        {{ analyticsStore.error }}
      </q-banner>

      <q-card flat bordered class="analytics-filter-card q-mb-md">
        <q-card-section>
          <div class="row items-center justify-between q-col-gutter-md">
            <div class="col-12 col-md">
              <div class="row q-col-gutter-sm">
                <div class="col-12 col-md-6">
                  <q-input dense outlined readonly label="Date Range" :model-value="dateRangeLabel">
                    <template #prepend>
                      <q-icon name="event" />
                    </template>
                    <template #append>
                      <q-icon name="arrow_drop_down" class="cursor-pointer">
                        <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                          <q-date
                            :model-value="filters.dateRange"
                            mask="YYYY-MM-DD"
                            range
                            today-btn
                            @update:model-value="setDateRangeFilter"
                          />
                        </q-popup-proxy>
                      </q-icon>
                    </template>
                  </q-input>
                </div>
                <div class="col-12 col-md-6">
                  <q-select
                    v-model="selectedChart"
                    dense
                    outlined
                    emit-value
                    map-options
                    label="Chart"
                    :options="chartFilterOptions"
                  >
                    <template #prepend>
                      <q-icon name="insert_chart" />
                    </template>
                  </q-select>
                </div>
              </div>
            </div>
            <div class="col-12 col-lg-auto">
              <div class="analytics-filter-actions">
                <q-btn
                  flat
                  no-caps
                  color="primary"
                  icon="restart_alt"
                  label="Reset"
                  @click="analyticsStore.resetFilters"
                />
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <section class="analytics-section">
        <AnalyticsSectionHeader
          title="Employee Demographics Analytics"
          caption="Generation, age, and gender patterns across leave activity"
          icon="diversity_3"
        />
        <div v-if="sectionMatches(demographicChartLabels)" class="row q-col-gutter-md">
          <div
            v-if="chartMatches('Generation Distribution', 'generation workforce')"
            :class="chartColumn('col-12 col-md-6 col-xl-4')"
          >
            <GenerationDistributionChart
              :chart="charts.generationDistribution"
              :loading="analyticsStore.loading"
            />
          </div>
          <div
            v-if="chartMatches('Leave Usage by Generation', 'generation leave usage')"
            :class="chartColumn('col-12 col-md-6 col-xl-4')"
          >
            <LeaveUsageByGenerationChart
              :chart="charts.leaveUsageByGeneration"
              :loading="analyticsStore.loading"
            />
          </div>
          <div
            v-if="chartMatches('Generation Leave Trend', 'monthly generation requests')"
            :class="chartColumn('col-12 col-xl-4')"
          >
            <GenerationLeaveTrendChart
              :chart="charts.generationLeaveTrend"
              :loading="analyticsStore.loading"
            />
          </div>
          <div
            v-if="chartMatches('Age Group Distribution', 'age employees')"
            :class="chartColumn('col-12 col-md-4')"
          >
            <AgeGroupDistributionChart
              :chart="charts.ageGroupDistribution"
              :loading="analyticsStore.loading"
            />
          </div>
          <div
            v-if="chartMatches('Leave Usage by Age Group', 'age leave usage')"
            :class="chartColumn('col-12 col-md-4')"
          >
            <LeaveUsageByAgeGroupChart
              :chart="charts.leaveUsageByAgeGroup"
              :loading="analyticsStore.loading"
            />
          </div>
          <div
            v-if="chartMatches('Gender Distribution', 'gender profile')"
            :class="chartColumn('col-12 col-md-4')"
          >
            <GenderDistributionChart
              :chart="charts.genderDistribution"
              :loading="analyticsStore.loading"
            />
          </div>
          <div
            v-if="chartMatches('Leave Type by Gender', 'gender leave type stacked')"
            :class="chartColumn('col-12 col-md-4')"
          >
            <LeaveTypeByGenderChart
              :chart="charts.leaveTypeByGender"
              :loading="analyticsStore.loading"
            />
          </div>
          <div
            v-if="chartMatches('Gender Leave Trend', 'monthly gender requests')"
            :class="chartColumn('col-12 col-md-4')"
          >
            <GenderLeaveTrendChart
              :chart="charts.genderLeaveTrend"
              :loading="analyticsStore.loading"
            />
          </div>
        </div>
      </section>

      <section v-if="sectionMatches(workforceChartLabels)" class="analytics-section">
        <AnalyticsSectionHeader
          title="Workforce Analytics"
          caption="Employment status distribution and leave usage behavior"
          icon="workspaces"
        />
        <div class="row q-col-gutter-md">
          <div
            v-if="chartMatches('Employment Status Distribution', 'employment status employees')"
            :class="chartColumn('col-12 col-md-4')"
          >
            <EmploymentStatusDistributionChart
              :chart="charts.employmentStatusDistribution"
              :loading="analyticsStore.loading"
            />
          </div>
          <div
            v-if="chartMatches('Leave Usage by Employment Status', 'employment status leave usage')"
            :class="chartColumn('col-12 col-md-4')"
          >
            <LeaveUsageByEmploymentStatusChart
              :chart="charts.leaveUsageByEmploymentStatus"
              :loading="analyticsStore.loading"
            />
          </div>
          <div
            v-if="chartMatches('Employment Status Trend', 'employment status monthly trend')"
            :class="chartColumn('col-12 col-md-4')"
          >
            <EmploymentStatusTrendChart
              :chart="charts.employmentStatusTrend"
              :loading="analyticsStore.loading"
            />
          </div>
        </div>
      </section>

      <q-card
        v-if="isChartSearchActive && !hasChartSearchMatches"
        flat
        bordered
        class="analytics-empty-search"
      >
        <q-card-section class="text-center">
          <q-icon name="manage_search" size="34px" color="grey-6" />
          <div class="text-subtitle2 text-weight-bold q-mt-sm">No chart found</div>
          <div class="text-caption text-grey-7">
            Select All Charts to show the complete dashboard.
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, ref } from 'vue'
import { useAnalyticsStore } from 'stores/analyticsStore'
import EmploymentStatusDistributionChart from 'components/charts/analytics/EmploymentStatusDistributionChart.vue'
import LeaveUsageByEmploymentStatusChart from 'components/charts/analytics/LeaveUsageByEmploymentStatusChart.vue'
import EmploymentStatusTrendChart from 'components/charts/analytics/EmploymentStatusTrendChart.vue'
import GenerationDistributionChart from 'components/charts/analytics/GenerationDistributionChart.vue'
import LeaveUsageByGenerationChart from 'components/charts/analytics/LeaveUsageByGenerationChart.vue'
import GenerationLeaveTrendChart from 'components/charts/analytics/GenerationLeaveTrendChart.vue'
import AgeGroupDistributionChart from 'components/charts/analytics/AgeGroupDistributionChart.vue'
import LeaveUsageByAgeGroupChart from 'components/charts/analytics/LeaveUsageByAgeGroupChart.vue'
import GenderDistributionChart from 'components/charts/analytics/GenderDistributionChart.vue'
import LeaveTypeByGenderChart from 'components/charts/analytics/LeaveTypeByGenderChart.vue'
import GenderLeaveTrendChart from 'components/charts/analytics/GenderLeaveTrendChart.vue'

const analyticsStore = useAnalyticsStore()
const charts = computed(() => analyticsStore.charts)
const filters = computed(() => analyticsStore.filters)
const selectedChart = ref('all')
const dateRangeLabel = computed(() => {
  const range = filters.value.dateRange
  const from = formatDateLabel(range?.from)
  const to = formatDateLabel(range?.to)
  if (from && to && from !== to) return `${from} - ${to}`
  return from || to || 'Select date range'
})

const demographicChartLabels = [
  'Generation Distribution',
  'Leave Usage by Generation',
  'Generation Leave Trend',
  'Age Group Distribution',
  'Leave Usage by Age Group',
  'Gender Distribution',
  'Leave Type by Gender',
  'Gender Leave Trend',
]

const workforceChartLabels = [
  'Employment Status Distribution',
  'Leave Usage by Employment Status',
  'Employment Status Trend',
]

const allChartLabels = [...demographicChartLabels, ...workforceChartLabels]
const chartFilterOptions = computed(() => [
  { label: 'All Charts', value: 'all' },
  ...allChartLabels.map((label) => ({ label, value: label })),
])
const isChartSearchActive = computed(() => selectedChart.value !== 'all')
const hasChartSearchMatches = computed(() => sectionMatches(allChartLabels))
const matchingChartCount = computed(
  () => allChartLabels.filter((label) => chartMatches(label)).length,
)

const AnalyticsSectionHeader = defineComponent({
  name: 'AnalyticsSectionHeader',
  props: {
    title: { type: String, required: true },
    caption: { type: String, default: '' },
    icon: { type: String, default: 'analytics' },
  },
  setup(props) {
    return () =>
      h('div', { class: 'analytics-section-header' }, [
        h('div', { class: 'analytics-section-header__icon' }, [
          h('i', { class: 'q-icon material-icons', 'aria-hidden': 'true' }, props.icon),
        ]),
        h('div', [
          h('h2', { class: 'analytics-section-header__title' }, props.title),
          props.caption
            ? h('p', { class: 'analytics-section-header__caption' }, props.caption)
            : null,
        ]),
      ])
  },
})

function setDateRangeFilter(value) {
  if (typeof value === 'string') {
    analyticsStore.setFilter('dateRange', { from: value, to: value })
    return
  }

  analyticsStore.setFilter('dateRange', {
    from: value?.from ?? value?.to ?? '',
    to: value?.to ?? value?.from ?? '',
  })
}

function formatDateLabel(value) {
  if (!value) return ''
  const parsedDate = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) return value
  return parsedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function chartMatches(...terms) {
  if (!isChartSearchActive.value) return true
  return terms.some((term) => term === selectedChart.value)
}

function sectionMatches(labels) {
  if (!isChartSearchActive.value) return true
  return labels.some((label) => chartMatches(label))
}

function chartColumn(defaultClass) {
  if (!isChartSearchActive.value) return defaultClass
  if (matchingChartCount.value === 1) return 'col-12'
  if (matchingChartCount.value === 2) return 'col-12 col-md-6'
  return 'col-12 col-md-6 col-xl-4'
}

onMounted(() => {
  analyticsStore.fetchAnalytics()
})
</script>

<style scoped>
.analytics-page {
  min-height: 100%;
  background:
    radial-gradient(circle at top left, rgba(31, 122, 77, 0.13), transparent 32rem),
    linear-gradient(180deg, #f8fafc 0%, #eef3f0 100%);
}

.analytics-content {
  width: min(1560px, calc(100% - 32px));
  margin: 0 auto;
  padding-top: 16px;
  padding-bottom: 32px;
}

.analytics-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.analytics-page-header__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.analytics-chart-search {
  width: min(320px, 100vw);
}

.analytics-page-header__title {
  margin: 0;
  color: #102033;
  font-size: 1.5rem;
  line-height: 1.2;
  font-weight: 800;
}

.analytics-page-header__subtitle {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.analytics-filter-card {
  border-radius: 8px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.analytics-filter-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.analytics-empty-search {
  margin-top: 22px;
  border-radius: 8px;
}

.analytics-section {
  margin-top: 28px;
}

:global(.analytics-section-header) {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

:global(.analytics-section-header__icon) {
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: #1f7a4d;
  background: #dcfce7;
}

:global(.analytics-section-header__icon .q-icon) {
  font-size: 22px;
}

:global(.analytics-section-header__title) {
  margin: 0;
  color: #102033;
  font-size: 1.2rem;
  line-height: 1.2;
  font-weight: 800;
}

:global(.analytics-section-header__caption) {
  margin: 3px 0 0;
  color: #64748b;
  font-size: 0.88rem;
}

@media (max-width: 900px) {
  .analytics-content {
    width: min(100% - 20px, 1560px);
  }

  .analytics-page-header {
    flex-direction: column;
  }

  .analytics-page-header__actions,
  .analytics-filter-actions,
  .analytics-chart-search {
    width: 100%;
  }

  .analytics-filter-actions {
    flex-direction: column;
    align-items: stretch;
  }
}

:global(body.body--dark) .analytics-page {
  background:
    radial-gradient(circle at top left, rgba(34, 197, 94, 0.08), transparent 32rem), #11161d;
}

:global(body.body--dark) .analytics-section-header__title {
  color: var(--dm-text-primary);
}

:global(body.body--dark) .analytics-page-header__title {
  color: var(--dm-text-primary);
}

:global(body.body--dark) .analytics-section-header__caption {
  color: var(--dm-text-secondary);
}

:global(body.body--dark) .analytics-page-header__subtitle {
  color: var(--dm-text-secondary);
}
</style>
