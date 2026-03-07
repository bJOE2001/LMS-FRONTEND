<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row justify-between items-center q-mb-lg">
      <div>
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Employee Attrition Forecast</h1>
        <p class="text-grey-7">Predicted employee departures for the upcoming months</p>
      </div>
      <div class="row q-gutter-sm items-center">
        <q-select
          v-model="selectedYear"
          :options="yearOptions"
          dense
          outlined
          label="Year"
          style="min-width: 120px"
        />
        <q-btn flat round icon="refresh" color="primary">
          <q-tooltip>Refresh Forecast</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="summary-card">
          <q-card-section>
            <div class="row items-center no-wrap">
              <q-icon name="trending_down" size="36px" color="red-5" class="q-mr-md" />
              <div>
                <div class="text-caption text-weight-medium text-grey-7">Predicted This Month</div>
                <div class="text-h4 text-weight-bold text-red-7">5</div>
              </div>
            </div>
            <q-separator class="q-my-sm" />
            <div class="text-caption text-red-5">
              <q-icon name="arrow_upward" size="14px" /> +2 vs last month
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="summary-card">
          <q-card-section>
            <div class="row items-center no-wrap">
              <q-icon name="warning_amber" size="36px" color="orange-7" class="q-mr-md" />
              <div>
                <div class="text-caption text-weight-medium text-grey-7">High Risk Employees</div>
                <div class="text-h4 text-weight-bold text-orange-8">12</div>
              </div>
            </div>
            <q-separator class="q-my-sm" />
            <div class="text-caption text-orange-7">
              <q-icon name="info" size="14px" /> Across 4 departments
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="summary-card">
          <q-card-section>
            <div class="row items-center no-wrap">
              <q-icon name="insights" size="36px" color="blue-7" class="q-mr-md" />
              <div>
                <div class="text-caption text-weight-medium text-grey-7">Avg Monthly Attrition</div>
                <div class="text-h4 text-weight-bold text-blue-8">3.2</div>
              </div>
            </div>
            <q-separator class="q-my-sm" />
            <div class="text-caption text-blue-6">
              <q-icon name="calendar_today" size="14px" /> Based on 12-month avg
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="summary-card">
          <q-card-section>
            <div class="row items-center no-wrap">
              <q-icon name="groups" size="36px" color="green-7" class="q-mr-md" />
              <div>
                <div class="text-caption text-weight-medium text-grey-7">Retention Rate</div>
                <div class="text-h4 text-weight-bold text-green-8">94.2%</div>
              </div>
            </div>
            <q-separator class="q-my-sm" />
            <div class="text-caption text-green-7">
              <q-icon name="arrow_upward" size="14px" /> +1.3% vs last quarter
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Monthly Forecast Chart (bar-style using Quasar components) -->
    <q-card flat bordered class="rounded-borders q-mb-lg">
      <q-card-section>
        <div class="row justify-between items-center q-mb-md">
          <div>
            <div class="text-h6 text-weight-bold">Monthly Departure Forecast</div>
            <div class="text-caption text-grey-7">Predicted number of employees leaving per month</div>
          </div>
          <q-badge :color="currentMonth <= 6 ? 'blue' : 'orange'" outline class="text-weight-medium q-pa-sm">
            {{ selectedYear }}
          </q-badge>
        </div>

        <!-- Bar Chart Visualization -->
        <div class="forecast-chart q-mt-md">
          <div
            v-for="(item, idx) in monthlyForecast"
            :key="item.month"
            class="forecast-bar-row q-mb-sm"
          >
            <div class="row items-center no-wrap">
              <div class="month-label text-weight-medium" :class="idx === currentMonth - 1 ? 'text-primary' : 'text-grey-8'">
                {{ item.month }}
              </div>
              <div class="col q-mx-md">
                <q-linear-progress
                  :value="item.predicted / maxPredicted"
                  :color="getBarColor(item.predicted)"
                  rounded
                  size="28px"
                  class="forecast-bar"
                >
                  <div class="absolute-full flex flex-center">
                    <span class="text-white text-weight-bold" style="font-size: 12px; text-shadow: 0 1px 2px rgba(0,0,0,0.3)">
                      {{ item.predicted }} employee{{ item.predicted !== 1 ? 's' : '' }}
                    </span>
                  </div>
                </q-linear-progress>
              </div>
              <div style="width: 70px; text-align: right">
                <q-badge
                  :color="getTrendColor(item.trend)"
                  text-color="white"
                  class="q-pa-xs"
                >
                  <q-icon :name="item.trend === 'up' ? 'arrow_upward' : item.trend === 'down' ? 'arrow_downward' : 'remove'" size="12px" class="q-mr-xs" />
                  {{ item.change }}
                </q-badge>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <div class="row q-col-gutter-md q-mb-lg">
      <!-- Department Risk Breakdown -->
      <div class="col-12 col-md-6">
        <q-card flat bordered class="rounded-borders full-height">
          <q-card-section>
            <div class="text-h6 text-weight-bold q-mb-xs">Department Risk Breakdown</div>
            <div class="text-caption text-grey-7 q-mb-md">Forecasted departures by department this month</div>

            <div v-for="dept in departmentRisk" :key="dept.name" class="q-mb-md">
              <div class="row justify-between items-center q-mb-xs">
                <div class="text-body2 text-weight-medium">{{ dept.name }}</div>
                <div class="row items-center q-gutter-xs">
                  <q-badge
                    :color="getRiskBadgeColor(dept.risk)"
                    text-color="white"
                    class="text-weight-medium"
                  >
                    {{ dept.risk }}
                  </q-badge>
                  <span class="text-body2 text-weight-bold">{{ dept.predicted }}</span>
                </div>
              </div>
              <q-linear-progress
                :value="dept.predicted / maxDeptPredicted"
                :color="getRiskBarColor(dept.risk)"
                rounded
                size="10px"
                track-color="grey-3"
              />
              <div class="text-caption text-grey-6 q-mt-xs">{{ dept.employees }} total employees</div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Top At-Risk Employees -->
      <div class="col-12 col-md-6">
        <q-card flat bordered class="rounded-borders full-height">
          <q-card-section>
            <div class="text-h6 text-weight-bold q-mb-xs">Top At-Risk Employees</div>
            <div class="text-caption text-grey-7 q-mb-md">Employees with highest predicted departure probability</div>

            <q-list separator>
              <q-item v-for="emp in atRiskEmployees" :key="emp.id" class="q-px-none">
                <q-item-section avatar>
                  <q-avatar :color="getRiskAvatarColor(emp.riskScore)" text-color="white" size="40px">
                    {{ emp.name.charAt(0) }}
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ emp.name }}</q-item-label>
                  <q-item-label caption>{{ emp.department }} &bull; {{ emp.position }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="text-right">
                    <div class="text-weight-bold" :class="getRiskTextColor(emp.riskScore)">
                      {{ emp.riskScore }}%
                    </div>
                    <q-linear-progress
                      :value="emp.riskScore / 100"
                      :color="getRiskScoreBarColor(emp.riskScore)"
                      rounded
                      size="4px"
                      style="width: 60px"
                      track-color="grey-3"
                    />
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Key Factors & Reasons -->
    <q-card flat bordered class="rounded-borders q-mb-lg">
      <q-card-section>
        <div class="text-h6 text-weight-bold q-mb-xs">Key Attrition Factors</div>
        <div class="text-caption text-grey-7 q-mb-md">Common reasons driving predicted employee departures</div>

        <div class="row q-col-gutter-md">
          <div v-for="factor in attritionFactors" :key="factor.label" class="col-12 col-sm-6 col-md-4">
            <q-card flat bordered class="factor-card q-pa-md">
              <div class="row items-center q-mb-sm">
                <q-icon :name="factor.icon" :color="factor.color" size="28px" class="q-mr-sm" />
                <span class="text-body1 text-weight-bold">{{ factor.label }}</span>
              </div>
              <q-linear-progress
                :value="factor.impact / 100"
                :color="factor.color"
                rounded
                size="8px"
                track-color="grey-3"
                class="q-mb-xs"
              />
              <div class="row justify-between">
                <span class="text-caption text-grey-7">Impact score</span>
                <span class="text-caption text-weight-bold">{{ factor.impact }}%</span>
              </div>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Disclaimer -->
    <q-banner rounded class="bg-blue-1 text-blue-9 q-mb-md">
      <template #avatar>
        <q-icon name="info" color="blue-7" />
      </template>
      <div class="text-body2">
        <strong>Disclaimer:</strong> These forecasts are generated using historical patterns and predictive modeling.
        Actual attrition may vary based on external factors. Use this data to support — not replace — HR decision-making.
      </div>
    </q-banner>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'

const selectedYear = ref(2026)
const yearOptions = [2024, 2025, 2026]
const currentMonth = new Date().getMonth() + 1 // 1-based

// ── Mock Data ─────────────────────────────────────────────────────
const monthlyForecast = ref([
  { month: 'Jan', predicted: 3, trend: 'down', change: '-1' },
  { month: 'Feb', predicted: 5, trend: 'up', change: '+2' },
  { month: 'Mar', predicted: 4, trend: 'down', change: '-1' },
  { month: 'Apr', predicted: 6, trend: 'up', change: '+2' },
  { month: 'May', predicted: 3, trend: 'down', change: '-3' },
  { month: 'Jun', predicted: 7, trend: 'up', change: '+4' },
  { month: 'Jul', predicted: 5, trend: 'down', change: '-2' },
  { month: 'Aug', predicted: 4, trend: 'down', change: '-1' },
  { month: 'Sep', predicted: 2, trend: 'down', change: '-2' },
  { month: 'Oct', predicted: 3, trend: 'up', change: '+1' },
  { month: 'Nov', predicted: 1, trend: 'down', change: '-2' },
  { month: 'Dec', predicted: 2, trend: 'up', change: '+1' },
])

const maxPredicted = computed(() => Math.max(...monthlyForecast.value.map((m) => m.predicted)))

const departmentRisk = ref([
  { name: 'Engineering', predicted: 3, risk: 'High', employees: 45 },
  { name: 'Marketing', predicted: 2, risk: 'Medium', employees: 22 },
  { name: 'Finance', predicted: 1, risk: 'Low', employees: 18 },
  { name: 'Human Resources', predicted: 1, risk: 'Low', employees: 12 },
  { name: 'Operations', predicted: 2, risk: 'Medium', employees: 30 },
])

const maxDeptPredicted = computed(() => Math.max(...departmentRisk.value.map((d) => d.predicted)))

const atRiskEmployees = ref([
  { id: 1, name: 'Maria Santos', department: 'Engineering', position: 'Senior Developer', riskScore: 87 },
  { id: 2, name: 'Juan Dela Cruz', department: 'Marketing', position: 'Marketing Lead', riskScore: 78 },
  { id: 3, name: 'Ana Reyes', department: 'Engineering', position: 'QA Analyst', riskScore: 72 },
  { id: 4, name: 'Carlos Garcia', department: 'Operations', position: 'Operations Manager', riskScore: 65 },
  { id: 5, name: 'Patricia Lim', department: 'Finance', position: 'Accountant', riskScore: 58 },
  { id: 6, name: 'Roberto Cruz', department: 'Engineering', position: 'DevOps Engineer', riskScore: 51 },
])

const attritionFactors = ref([
  { label: 'Work-Life Balance', icon: 'balance', color: 'red-7', impact: 82 },
  { label: 'Career Growth', icon: 'trending_up', color: 'orange-7', impact: 75 },
  { label: 'Compensation', icon: 'payments', color: 'amber-9', impact: 68 },
  { label: 'Management', icon: 'supervisor_account', color: 'blue-7', impact: 55 },
  { label: 'Team Culture', icon: 'diversity_3', color: 'purple-7', impact: 42 },
  { label: 'Workload Stress', icon: 'local_fire_department', color: 'deep-orange-7', impact: 38 },
])

// ── Helper Functions ──────────────────────────────────────────────
function getBarColor(value) {
  if (value >= 6) return 'red-6'
  if (value >= 4) return 'orange-7'
  if (value >= 2) return 'blue-7'
  return 'green-7'
}

function getTrendColor(trend) {
  if (trend === 'up') return 'red-5'
  if (trend === 'down') return 'green-6'
  return 'grey-6'
}

function getRiskBadgeColor(risk) {
  if (risk === 'High') return 'red-6'
  if (risk === 'Medium') return 'orange-7'
  return 'green-7'
}

function getRiskBarColor(risk) {
  if (risk === 'High') return 'red-5'
  if (risk === 'Medium') return 'orange-6'
  return 'green-6'
}

function getRiskAvatarColor(score) {
  if (score >= 75) return 'red-6'
  if (score >= 60) return 'orange-7'
  return 'amber-8'
}

function getRiskTextColor(score) {
  if (score >= 75) return 'text-red-7'
  if (score >= 60) return 'text-orange-8'
  return 'text-amber-9'
}

function getRiskScoreBarColor(score) {
  if (score >= 75) return 'red-5'
  if (score >= 60) return 'orange-6'
  return 'amber-7'
}
</script>

<style scoped>
.summary-card {
  transition: box-shadow 0.2s ease;
}
.summary-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
.month-label {
  width: 36px;
  font-size: 13px;
}
.forecast-bar {
  border-radius: 6px;
}
.factor-card {
  border-radius: 12px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.factor-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}
.full-height {
  height: 100%;
}
</style>
