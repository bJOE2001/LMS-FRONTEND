<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Dashboard</h1>
        <p class="text-grey-7">Welcome back, {{ displayName }}</p>
      </div>
      <div class="row q-gutter-sm">
        <q-btn
          v-if="!leaveStore.leaveInitialized && dashboardReady"
          unelevated
          color="orange-8"
          icon="playlist_add_check"
          label="Initialize My Leave Balances"
          @click="openInitModal"
        />
        <q-btn-dropdown
          unelevated
          color="green-7"
          icon="download"
          label="Download Form"
          dropdown-icon="arrow_drop_down"
        >
          <q-list>
            <q-item clickable v-close-popup @click="download('PDF')">
              <q-item-section avatar><q-icon name="picture_as_pdf" color="red" /></q-item-section>
              <q-item-section>PDF Format</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="download('Word')">
              <q-item-section avatar><q-icon name="description" color="primary" /></q-item-section>
              <q-item-section>Word Document</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="download('Excel')">
              <q-item-section avatar><q-icon name="table_chart" color="green" /></q-item-section>
              <q-item-section>Excel Format</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </div>

    <!-- ==================== 4 LEAVE CARDS ==================== -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- CARD 1 — Vacation Leave -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="rounded-borders leave-card-fixed">
          <q-card-section>
            <div class="row items-center no-wrap" style="margin-bottom: 4px;">
              <q-icon name="beach_access" size="sm" color="primary" class="q-mr-sm" />
              <div class="text-caption text-weight-bold text-uppercase">Vacation Leave</div>
            </div>
            <div class="text-h5 text-weight-bold text-primary">{{ vacationLeave.balance }}</div>
            <div class="text-caption text-grey-7">Accrual: {{ vacationLeave.accrual_rate }}/mo</div>
            <div v-if="vacationLeave.last_accrual_date" class="text-caption text-grey-6">
              Last accrual: {{ vacationLeave.last_accrual_date }}
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- CARD 2 — Sick Leave -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="rounded-borders leave-card-fixed">
          <q-card-section>
            <div class="row items-center no-wrap" style="margin-bottom: 4px;">
              <q-icon name="local_hospital" size="sm" color="green-8" class="q-mr-sm" />
              <div class="text-caption text-weight-bold text-uppercase">Sick Leave</div>
            </div>
            <div class="text-h5 text-weight-bold text-green-8">{{ sickLeave.balance }}</div>
            <div class="text-caption text-grey-7">Accrual: {{ sickLeave.accrual_rate }}/mo</div>
            <div v-if="sickLeave.last_accrual_date" class="text-caption text-grey-6">
              Last accrual: {{ sickLeave.last_accrual_date }}
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- CARD 3 — Resettable Leaves (dropdown) -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="rounded-borders leave-card-fixed">
          <q-card-section>
            <div class="row items-center no-wrap" style="margin-bottom: 4px;">
              <q-icon name="autorenew" size="sm" color="purple-8" class="q-mr-sm" />
              <div class="text-caption text-weight-bold text-uppercase" style="white-space: nowrap;">Resettable Leaves</div>
              <q-space />
              <q-select
                v-model="selectedResettable"
                :options="resettableOptions"
                label="Select type"
                emit-value
                map-options
                dense
                outlined
                class="leave-type-select"
              />
            </div>
            <div v-if="selectedResettableData">
              <div class="text-h5 text-weight-bold text-purple-8">
                {{ selectedResettableData.balance }}
              </div>
              <div class="text-caption text-grey-7">
                Max: {{ selectedResettableData.max_days }} days/yr
              </div>
            </div>
            <div v-else class="text-caption text-grey-5 q-mt-sm">Select a leave type above</div>
          </q-card-section>
        </q-card>
      </div>

      <!-- CARD 4 — Event-Based Leaves (dropdown) -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="rounded-borders leave-card-fixed">
          <q-card-section>
            <div class="row items-center no-wrap" style="margin-bottom: 4px;">
              <q-icon name="event" size="sm" color="orange-8" class="q-mr-sm" />
              <div class="text-caption text-weight-bold text-uppercase" style="white-space: nowrap;">Event-Based Leaves</div>
              <q-space />
              <q-select
                v-model="selectedEvent"
                :options="eventOptions"
                label="Select type"
                emit-value
                map-options
                dense
                outlined
                class="leave-type-select"
              />
            </div>
            <div v-if="selectedEventData">
              <div v-if="selectedEventData.max_days" class="text-h5 text-weight-bold text-orange-8">
                {{ selectedEventData.max_days }} days
              </div>
              <div v-else class="text-body1 text-weight-medium text-orange-8">
                Per applicable law
              </div>
              <div
                v-if="selectedEventData.requires_documents"
                class="text-caption text-red-7 q-mt-xs"
              >
                <q-icon name="warning" size="xs" /> Documents required
              </div>
            </div>
            <div v-else class="text-caption text-grey-5 q-mt-sm">Select a leave type above</div>
          </q-card-section>
        </q-card>
      </div>
    </div>



    <!-- Recent Applications -->
    <q-card flat bordered class="rounded-borders">
      <q-card-section>
        <div class="text-h6 q-mb-md">Recent Applications</div>
      </q-card-section>
      <q-table
        :rows="myApplications.slice(0, 5)"
        :columns="columns"
        row-key="id"
        flat
        hide-pagination
        :rows-per-page-options="[0]"
      >
        <template #no-data>
          <div class="full-width row justify-center items-center text-grey-7 q-gutter-sm q-pa-lg">
            <q-icon name="inbox" size="2em" />
            <span>No applications yet</span>
          </div>
        </template>
        <template #body-cell-status="props">
          <q-td><StatusBadge :status="props.row.status" /></q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td>
            <q-btn flat dense round size="sm" icon="visibility" @click="viewDetails(props.row)">
              <q-tooltip>View</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Details dialog -->
    <q-dialog v-model="showDetailsDialog" position="standard">
      <q-card v-if="selectedApp" style="min-width: 400px; max-width: 560px">
        <q-card-section>
          <div class="text-h6">Application Details</div>
        </q-card-section>
        <q-card-section class="q-pt-none q-gutter-y-md">
          <div>
            <div class="text-caption text-grey-7">Application ID</div>
            <div class="text-weight-medium">{{ selectedApp.id }}</div>
          </div>
          <div>
            <div class="text-caption text-grey-7">Leave Type</div>
            <div class="text-weight-medium">{{ selectedApp.leaveType }}</div>
          </div>
          <div>
            <div class="text-caption text-grey-7">Duration</div>
            <div class="text-weight-medium">
              {{ formatDate(selectedApp.startDate) }} - {{ formatDate(selectedApp.endDate) }} ({{
                selectedApp.days
              }}
              days)
            </div>
          </div>
          <div>
            <div class="text-caption text-grey-7">Reason</div>
            <div>{{ selectedApp.reason }}</div>
          </div>
          <div>
            <div class="text-caption text-grey-7">Status</div>
            <StatusBadge :status="selectedApp.status" />
          </div>
          <div v-if="selectedApp.remarks">
            <div class="text-caption text-grey-7">Remarks</div>
            <div>{{ selectedApp.remarks }}</div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ==================== INITIALIZATION MODAL ==================== -->
    <q-dialog v-model="showInitModal" persistent>
      <q-card style="min-width: 560px; max-width: 700px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Initialize Leave Balances</div>
          <div class="text-caption" style="opacity: 0.8">
            Enter your current leave balances. This can only be done once.
          </div>
        </q-card-section>
        <q-card-section v-if="initLoading" class="text-center q-pa-xl">
          <q-spinner size="3em" color="primary" />
          <div class="text-grey-7 q-mt-sm">Loading leave types...</div>
        </q-card-section>
        <q-card-section v-else>
          <q-form ref="initFormRef" @submit.prevent="submitInit">
            <div class="q-gutter-md">
              <template v-for="type in initLeaveTypes" :key="type.id">
                <div class="row items-center q-col-gutter-sm">
                  <div class="col-7">
                    <div class="text-weight-medium">{{ type.name }}</div>
                    <div class="text-caption text-grey-6">
                      {{
                        type.category === 'ACCRUED'
                          ? `Accrual: ${type.accrual_rate}/mo`
                          : `Max: ${type.max_days} days/yr`
                      }}
                    </div>
                  </div>
                  <div class="col-5">
                    <q-input
                      v-model.number="initBalances[type.id]"
                      type="number"
                      step="0.01"
                      min="0"
                      :max="getLeaveTypeMax(type.name)"
                      outlined
                      dense
                      :label="`${type.name} balance`"
                      :rules="[
                        (val) => (val !== null && val !== '' && val !== undefined) || 'Required',
                        (val) => Number(val) >= 0 || 'Min 0',
                        (val) => !getLeaveTypeMax(type.name) || Number(val) <= getLeaveTypeMax(type.name) || `Max ${getLeaveTypeMax(type.name)}`,
                      ]"
                    />
                  </div>
                </div>
              </template>
            </div>
            <div class="row justify-end q-mt-lg q-gutter-sm">
              <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup />
              <q-btn
                unelevated
                no-caps
                label="Save Balances"
                color="primary"
                icon="save"
                type="submit"
                :loading="initSaving"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, ref, onMounted, reactive } from 'vue'
import { useQuasar } from 'quasar'
import { useLeaveStore } from 'stores/leave-store'
import { useAuthStore } from 'stores/auth-store'
import { api } from 'src/boot/axios'
import StatusBadge from 'components/StatusBadge.vue'

const $q = useQuasar()
const leaveStore = useLeaveStore()
const authStore = useAuthStore()
const myApplications = computed(() => leaveStore.myApplications)
const displayName = computed(() => authStore.user?.name ?? 'Employee')
const dashboardReady = ref(false)

// ─── Leave summary computed ──────────────────────────────────────────────────
const vacationLeave = computed(
  () =>
    leaveStore.leaveSummary.accrued?.vacation_leave ?? {
      balance: 0,
      accrual_rate: 0,
      last_accrual_date: null,
    },
)
const sickLeave = computed(
  () =>
    leaveStore.leaveSummary.accrued?.sick_leave ?? {
      balance: 0,
      accrual_rate: 0,
      last_accrual_date: null,
    },
)

// Resettable dropdown
const selectedResettable = ref(null)
const resettableOptions = computed(() =>
  (leaveStore.leaveSummary.resettable || []).map((t) => ({ label: t.name, value: t.id })),
)
const selectedResettableData = computed(
  () =>
    (leaveStore.leaveSummary.resettable || []).find((t) => t.id === selectedResettable.value) ??
    null,
)

// Event-based dropdown
const selectedEvent = ref(null)
const eventOptions = computed(() =>
  (leaveStore.leaveSummary.event_based || []).map((t) => ({ label: t.name, value: t.id })),
)
const selectedEventData = computed(
  () =>
    (leaveStore.leaveSummary.event_based || []).find((t) => t.id === selectedEvent.value) ?? null,
)

// ─── Initialization modal ────────────────────────────────────────────────────
const showInitModal = ref(false)
const initLoading = ref(false)
const initSaving = ref(false)
const initLeaveTypes = ref([])
const initBalances = reactive({})
const initFormRef = ref(null)

// Default values and maximum limits for specific leave types
const leaveTypeDefaults = {
  'Mandatory / Forced Leave': { default: 5, max: 5 },
  'MCO6 Leave':               { default: 3, max: 3 },
  'Solo Parent Leave':        { default: 7, max: 7 },
  'Special Emergency (Calamity) Leave': { default: 5, max: 5 },
  'Special Privilege Leave':  { default: 3, max: 3 },
}

function getLeaveTypeMax(name) {
  return leaveTypeDefaults[name]?.max ?? null
}

async function openInitModal() {
  showInitModal.value = true
  initLoading.value = true
  try {
    const { data } = await api.get('/employee/leave-balances/init-types')
    if (data.leave_initialized) {
      $q.notify({ type: 'info', message: 'Leave balances already initialized.' })
      showInitModal.value = false
      leaveStore.leaveInitialized = true
      return
    }
    initLeaveTypes.value = data.leave_types ?? []
    for (const t of initLeaveTypes.value) {
      initBalances[t.id] = 0
    }
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to load leave types.' })
    showInitModal.value = false
  } finally {
    initLoading.value = false
  }
}

async function submitInit() {
  const valid = await initFormRef.value.validate()
  if (!valid) return

  initSaving.value = true
  try {
    const balances = {}
    for (const t of initLeaveTypes.value) {
      balances[t.id] = Number(initBalances[t.id]) || 0
    }
    await api.post('/employee/leave-balances/initialize', { balances })
    $q.notify({ type: 'positive', message: 'Leave balances initialized successfully!' })
    showInitModal.value = false
    leaveStore.leaveInitialized = true
    await leaveStore.fetchLeaveSummary()
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to initialize balances.'
    $q.notify({ type: 'negative', message: msg })
  } finally {
    initSaving.value = false
  }
}

// ─── Table ───────────────────────────────────────────────────────────────────
const columns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left' },
  { name: 'leaveType', label: 'Leave Type', field: 'leaveType', align: 'left' },
  {
    name: 'startDate',
    label: 'Start Date',
    field: (row) => formatDate(row.startDate),
    align: 'left',
  },
  { name: 'days', label: 'Days', field: 'days', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'actions', label: 'Actions', align: 'right' },
]

const showDetailsDialog = ref(false)
const selectedApp = ref(null)

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
function viewDetails(app) {
  selectedApp.value = app
  showDetailsDialog.value = true
}
function download(format) {
  $q.notify({ message: `Downloading ${format}...`, type: 'info', position: 'top' })
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────
onMounted(async () => {
  if (authStore.user?.role === 'employee') {
    await Promise.all([
      leaveStore.fetchDashboard(),
      leaveStore.fetchLeaveSummary(),
      leaveStore.fetchMyApplications(),
    ])
  }
  dashboardReady.value = true
})
</script>

<style scoped>
.leave-card-fixed {
  height: 120px;
  overflow: hidden;
}
.leave-card-fixed .q-card__section {
  padding: 10px 14px;
}
.leave-type-select {
  width: 150px;
  min-width: 150px;
  max-width: 150px;
}
.leave-type-select :deep(.q-field__native) {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
</style>
