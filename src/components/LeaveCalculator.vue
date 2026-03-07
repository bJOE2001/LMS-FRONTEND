<template>
  <q-card flat bordered class="rounded-borders">
    <q-card-section>
      <div class="row items-center q-mb-md">
        <q-icon name="calculate" color="primary" size="sm" class="q-mr-sm" />
        <div class="text-h6">Leave Calculator</div>
      </div>
      <p class="text-caption text-grey-7 q-mb-md">
        Calculate working days and preview your remaining leave credits
      </p>
      <div class="q-gutter-y-md">
        <div>
          <q-select
            v-model="leaveType"
            :options="leaveTypeOptions"
            label="Leave Type"
            dense
            outlined
            emit-value
            map-options
          />
        </div>
        <div class="row q-col-gutter-sm">
          <div class="col-6">
            <q-input v-model="startDate" label="Start Date" type="date" dense outlined />
          </div>
          <div class="col-6">
            <q-input v-model="endDate" label="End Date" type="date" dense outlined />
          </div>
        </div>
        <q-btn
          unelevated
          color="primary"
          icon="calculate"
          label="Calculate"
          class="full-width"
          @click="calculate"
        />
        <div v-if="calculation" class="q-gutter-y-md">
          <q-card flat bordered class="bg-blue-1 rounded-borders">
            <q-card-section>
              <div class="row q-col-gutter-md">
                <div class="col-6">
                  <div class="text-caption text-grey-7">Total Days</div>
                  <div class="text-h6">{{ calculation.totalDays }}</div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-7">Working Days</div>
                  <div class="text-h6 text-primary">{{ calculation.workingDays }}</div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-7">Weekends</div>
                  <div class="text-weight-medium">{{ calculation.weekends }}</div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-7">Holidays</div>
                  <div class="text-weight-medium">{{ calculation.holidays }}</div>
                </div>
              </div>
              <div v-if="calculation.holidaysList.length" class="q-mt-md q-pt-md" style="border-top: 1px solid rgba(0,0,0,0.12)">
                <div class="text-caption text-weight-medium q-mb-xs">Holidays included:</div>
                <ul class="q-ma-none q-pl-md text-caption">
                  <li v-for="(h, i) in calculation.holidaysList" :key="i">{{ h }}</li>
                </ul>
              </div>
            </q-card-section>
          </q-card>
          <q-card flat bordered :class="hasEnoughCredits ? 'bg-green-1' : 'bg-red-1'" class="rounded-borders">
            <q-card-section>
              <div class="row justify-between items-center q-mb-sm">
                <span class="text-caption">Current Credits:</span>
                <span class="text-weight-bold">{{ getAvailableCredits() }} days</span>
              </div>
              <div class="row justify-between items-center q-mb-sm">
                <span class="text-caption">Required:</span>
                <span class="text-weight-bold">-{{ calculation.workingDays }} days</span>
              </div>
              <div class="row justify-between items-center">
                <span class="text-weight-medium">Remaining:</span>
                <span class="text-h6" :class="hasEnoughCredits ? 'text-green-8' : 'text-red-8'">{{ remainingCredits }} days</span>
              </div>
              <p v-if="!hasEnoughCredits" class="text-caption text-red-8 q-mt-sm q-mb-none">
                Insufficient leave credits. You need {{ Math.abs(remainingCredits) }} more day(s).
              </p>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useLeaveStore } from 'stores/leave-store'
import { publicHolidays2026 } from 'src/data/holidays'

const leaveStore = useLeaveStore()
const credits = computed(() => leaveStore.leaveCredits)

const leaveType = ref('vacationLeave')
const startDate = ref('')
const endDate = ref('')
const calculation = ref(null)

const leaveTypeOptions = [
  { label: `Vacation Leave (${credits.value.vacationLeave} days)`, value: 'vacationLeave' },
  { label: `Sick Leave (${credits.value.sickLeave} days)`, value: 'sickLeave' },
  { label: `MCO6 Leave (${credits.value.mco6Leave} days)`, value: 'mco6Leave' },
  { label: `Wellness Leave (${credits.value.wellnessLeave} days)`, value: 'wellnessLeave' },
]

function getAvailableCredits() {
  const map = {
    vacationLeave: credits.value.vacationLeave,
    sickLeave: credits.value.sickLeave,
    mco6Leave: credits.value.mco6Leave,
    wellnessLeave: credits.value.wellnessLeave,
  }
  return map[leaveType.value] ?? 0
}

const remainingCredits = computed(() =>
  calculation.value ? getAvailableCredits() - calculation.value.workingDays : getAvailableCredits()
)
const hasEnoughCredits = computed(() => (calculation.value ? remainingCredits.value >= 0 : true))

function isSameDay(d1, d2) {
  return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear()
}

function calculate() {
  if (!startDate.value || !endDate.value) return
  const start = new Date(startDate.value)
  const end = new Date(endDate.value)
  const $q = useQuasar()
  if (start > end) {
    $q.notify({ type: 'warning', message: 'End date must be after start date', position: 'top' })
    return
  }
  let totalDays = 0
  let workingDays = 0
  let weekends = 0
  let holidays = 0
  const holidaysList = []
  const current = new Date(start)
  while (current <= end) {
    totalDays++
    const dayOfWeek = current.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekends++
    } else {
      const holiday = publicHolidays2026.find((h) => isSameDay(current, new Date(h.date)))
      if (holiday) {
        holidays++
        holidaysList.push(holiday.name)
      } else {
        workingDays++
      }
    }
    current.setDate(current.getDate() + 1)
  }
  calculation.value = { totalDays, workingDays, weekends, holidays, holidaysList }
}
</script>
