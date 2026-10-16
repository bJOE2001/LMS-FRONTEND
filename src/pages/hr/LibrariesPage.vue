<template>
  <q-page class="q-pa-md libraries-page">
    <!-- Top Header Banner -->
    <div class="q-mb-md">
      <h1 class="text-h5 text-weight-bolder text-dark q-my-none">System Libraries</h1>
    </div>

    <!-- Navigation Tabs -->
    <q-card flat bordered class="rounded-borders q-mb-md bg-white">
      <q-tabs
        v-model="currentTab"
        dense
        no-caps
        align="left"
        active-color="green-9"
        indicator-color="green-9"
        class="text-grey-8"
        narrow-indicator
      >
        <q-tab name="remarks" icon="edit_note" label="Remarks Library" />
        <q-tab name="holidays" icon="event" label="Holiday Library" />
        <q-tab name="leave_types" icon="playlist_add" label="Leave Types" />
        <q-tab name="offices" icon="apartment" label="Office Library" />
        <q-tab name="illnesses" icon="medical_services" label="Illness Library" />
        <q-tab name="work_schedules" icon="schedule" label="Work Schedules" />
        <q-tab name="signatories" icon="draw" label="Signatories" />
      </q-tabs>
    </q-card>

    <!-- Tab Panels Container -->
    <q-tab-panels v-model="currentTab" animated keep-alive class="bg-transparent">
      <!-- ========================================================= -->
      <!-- TAB 1: REMARKS LIBRARY (DTR OVERRIDES)                     -->
      <!-- ========================================================= -->
      <q-tab-panel name="remarks" class="q-pa-none">
        <!-- Remarks Toolbar -->
        <q-card flat bordered class="rounded-borders q-mb-md bg-white">
          <q-card-section class="q-pa-sm">
            <div class="row items-center justify-between q-col-gutter-sm">
              <div class="col-12 col-md-5">
                <q-input
                  v-model="remarksSearch"
                  outlined
                  dense
                  clearable
                  placeholder="Search abbreviation or description..."
                >
                  <template #prepend>
                    <q-icon name="search" color="grey-6" />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-auto">
                <div class="row items-center q-gutter-x-sm">
                  <q-badge color="green-1" text-color="green-9" class="q-pa-xs text-weight-bold">
                    {{ remarksList.length }} Total Remarks
                  </q-badge>
                  <q-btn
                    unelevated
                    no-caps
                    color="green-9"
                    icon="add"
                    label="Add Remark"
                    class="text-weight-bold q-px-md"
                    @click="openAddRemarkDialog"
                  />
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Remarks Table -->
        <q-card flat bordered class="rounded-borders bg-white">
          <q-table
            :rows="filteredRemarks"
            :columns="remarkColumns"
            row-key="id"
            flat
            dense
            :loading="loadingRemarks"
            :pagination="{ rowsPerPage: 15 }"
            no-data-label="No remarks found. Click '+ Add Remark' to create one."
          >
            <template #body-cell-abbrv="props">
              <q-td :props="props">
                <span v-if="props.row.abbrv" class="text-weight-bolder text-green-9 text-body2">
                  {{ props.row.abbrv }}
                </span>
                <span v-else class="text-grey-5 italic">—</span>
              </q-td>
            </template>

            <template #body-cell-description="props">
              <q-td :props="props">
                <span class="text-weight-medium text-dark">{{ props.row.description }}</span>
              </q-td>
            </template>

            <template #body-cell-is_active="props">
              <q-td :props="props">
                <q-badge
                  :color="props.row.is_active ? 'positive' : 'grey-5'"
                  :label="props.row.is_active ? 'ACTIVE' : 'INACTIVE'"
                  class="text-bold"
                />
              </q-td>
            </template>

            <template #body-cell-actions="props">
              <q-td :props="props" class="q-gutter-x-xs">
                <q-btn
                  flat
                  round
                  dense
                  color="green-9"
                  icon="edit"
                  @click="openEditRemarkDialog(props.row)"
                >
                  <q-tooltip class="bg-dark text-white">Edit Remark</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  round
                  dense
                  color="negative"
                  icon="delete"
                  @click="confirmDeleteRemark(props.row)"
                >
                  <q-tooltip class="bg-dark text-white">Delete Remark</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </q-tab-panel>

      <!-- ========================================================= -->
      <!-- TAB 2: HOLIDAY LIBRARY                                    -->
      <!-- ========================================================= -->
      <q-tab-panel name="holidays" class="q-pa-none">
        <!-- Holidays Toolbar -->
        <q-card flat bordered class="rounded-borders q-mb-md bg-white">
          <q-card-section class="q-pa-sm">
            <div class="row items-center justify-between q-col-gutter-sm">
              <div class="col-12 col-md-7">
                <div class="row items-center q-gutter-sm">
                  <q-input
                    v-model="holidaysSearch"
                    outlined
                    dense
                    clearable
                    placeholder="Search holiday name..."
                    style="min-width: 260px;"
                  >
                    <template #prepend>
                      <q-icon name="search" color="grey-6" />
                    </template>
                  </q-input>

                  <q-select
                    v-model="selectedHolidayYear"
                    :options="holidayYearOptions"
                    outlined
                    dense
                    emit-value
                    map-options
                    label="Filter Year"
                    style="width: 140px;"
                    @update:model-value="fetchHolidays"
                  />
                </div>
              </div>

              <div class="col-12 col-md-auto">
                <div class="row items-center q-gutter-x-sm">
                  <q-badge color="blue-1" text-color="blue-9" class="q-pa-xs text-weight-bold">
                    {{ holidaysList.length }} Holidays
                  </q-badge>
                  <q-btn
                    unelevated
                    no-caps
                    color="green-9"
                    icon="add"
                    label="Add Holiday"
                    class="text-weight-bold q-px-md"
                    @click="openAddHolidayDialog"
                  />
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Holidays Table -->
        <q-card flat bordered class="rounded-borders bg-white">
          <q-table
            :rows="filteredHolidays"
            :columns="holidayColumns"
            row-key="id"
            flat
            dense
            :loading="loadingHolidays"
            :pagination="{ rowsPerPage: 15 }"
            no-data-label="No holidays found for this year. Click '+ Add Holiday' to register one."
          >
            <template #body-cell-holiday_date="props">
              <q-td :props="props">
                <div class="row items-center no-wrap q-gutter-x-xs">
                  <q-icon name="event" size="16px" color="green-9" />
                  <span class="text-weight-bold text-dark">{{ formatHolidayDate(props.row.holiday_date) }}</span>
                </div>
              </q-td>
            </template>

            <template #body-cell-name="props">
              <q-td :props="props">
                <div class="text-weight-bold text-dark">{{ props.row.name }}</div>
                <div v-if="props.row.description" class="text-caption text-grey-7">{{ props.row.description }}</div>
              </q-td>
            </template>

            <template #body-cell-type="props">
              <q-td :props="props">
                <q-badge
                  :color="getHolidayTypeBadge(props.row.type).color"
                  :text-color="getHolidayTypeBadge(props.row.type).textColor"
                  class="text-weight-bold q-pa-xs"
                >
                  {{ getHolidayTypeBadge(props.row.type).label }}
                </q-badge>
              </q-td>
            </template>

            <template #body-cell-is_recurring="props">
              <q-td :props="props">
                <q-chip
                  v-if="props.row.is_recurring"
                  dense
                  color="purple-1"
                  text-color="purple-9"
                  icon="repeat"
                  size="sm"
                  class="text-weight-bold"
                >
                  Annually
                </q-chip>
                <span v-else class="text-grey-6 text-caption">One-time</span>
              </q-td>
            </template>

            <template #body-cell-is_active="props">
              <q-td :props="props">
                <q-badge
                  :color="props.row.is_active ? 'positive' : 'grey-5'"
                  :label="props.row.is_active ? 'ACTIVE' : 'INACTIVE'"
                  class="text-bold"
                />
              </q-td>
            </template>

            <template #body-cell-actions="props">
              <q-td :props="props" class="q-gutter-x-xs">
                <q-btn
                  flat
                  round
                  dense
                  color="green-9"
                  icon="edit"
                  @click="openEditHolidayDialog(props.row)"
                >
                  <q-tooltip class="bg-dark text-white">Edit Holiday</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  round
                  dense
                  color="negative"
                  icon="delete"
                  @click="confirmDeleteHoliday(props.row)"
                >
                  <q-tooltip class="bg-dark text-white">Delete Holiday</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </q-tab-panel>

      <!-- ========================================================= -->
      <!-- TAB 3: LEAVE TYPES                                        -->
      <!-- ========================================================= -->
      <q-tab-panel name="leave_types" class="q-pa-none">
        <LeaveTypesView :embedded="true" />
      </q-tab-panel>

      <!-- ========================================================= -->
      <!-- TAB 4: OFFICE LIBRARY                                     -->
      <!-- ========================================================= -->
      <q-tab-panel name="offices" class="q-pa-none">
        <DepartmentsLibraryView :embedded="true" />
      </q-tab-panel>

      <!-- ========================================================= -->
      <!-- TAB 5: ILLNESS LIBRARY                                    -->
      <!-- ========================================================= -->
      <q-tab-panel name="illnesses" class="q-pa-none">
        <IllnessLibraryView :embedded="true" />
      </q-tab-panel>

      <!-- ========================================================= -->
      <!-- TAB 6: WORK SCHEDULES                                     -->
      <!-- ========================================================= -->
      <q-tab-panel name="work_schedules" class="q-pa-none">
        <WorkSchedulesView :embedded="true" />
      </q-tab-panel>

      <!-- ========================================================= -->
      <!-- TAB 7: SIGNATORIES                                        -->
      <!-- ========================================================= -->
      <q-tab-panel name="signatories" class="q-pa-none">
        <SignatoriesView :embedded="true" />
      </q-tab-panel>
    </q-tab-panels>

    <!-- ========================================================= -->
    <!-- DIALOG: ADD / EDIT REMARK                                 -->
    <!-- ========================================================= -->
    <q-dialog v-model="remarkDialog.show" persistent>
      <q-card style="width: 440px; max-width: 95vw;" class="rounded-borders">
        <q-card-section class="row items-center justify-between bg-green-9 text-white q-py-sm">
          <div class="row items-center q-gutter-x-sm">
            <q-icon name="edit_note" size="20px" />
            <span class="text-subtitle1 text-weight-bold">
              {{ remarkDialog.isEdit ? 'Edit Remark' : 'Add New Remark' }}
            </span>
          </div>
          <q-btn dense flat round icon="close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-md q-gutter-y-md">
          <q-input
            v-model="remarkForm.abbrv"
            outlined
            dense
            label="Abbreviation (Optional)"
            hint="e.g. O.B., O.F., RESTDAY, ABSENT"
            autofocus
          />

          <q-input
            v-model="remarkForm.description"
            outlined
            dense
            label="Description *"
            hint="e.g. OFFICIAL BUSINESS, ON FIELD, UNDERTIME"
            :rules="[val => !!val && val.trim().length > 0 || 'Description is required']"
          />

          <q-toggle
            v-model="remarkForm.is_active"
            color="green-9"
            label="Active in DTR Override options"
            class="text-weight-medium"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat no-caps label="Cancel" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="green-9"
            label="Save Remark"
            class="text-weight-bold q-px-md"
            :loading="savingRemark"
            @click="saveRemark"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ========================================================= -->
    <!-- DIALOG: ADD / EDIT HOLIDAY                                -->
    <!-- ========================================================= -->
    <q-dialog v-model="holidayDialog.show" persistent>
      <q-card style="width: 480px; max-width: 95vw;" class="rounded-borders">
        <q-card-section class="row items-center justify-between bg-green-9 text-white q-py-sm">
          <div class="row items-center q-gutter-x-sm">
            <q-icon name="event" size="20px" />
            <span class="text-subtitle1 text-weight-bold">
              {{ holidayDialog.isEdit ? 'Edit Holiday' : 'Add New Holiday' }}
            </span>
          </div>
          <q-btn dense flat round icon="close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-md q-gutter-y-md">
          <!-- Holiday Date Input with Popup Calendar -->
          <q-input
            v-model="holidayForm.holiday_date"
            outlined
            dense
            label="Holiday Date *"
            mask="####-##-##"
            hint="Format: YYYY-MM-DD"
            :rules="[val => !!val || 'Holiday date is required']"
          >
            <template #append>
              <q-icon name="event" class="cursor-pointer text-green-9">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="holidayForm.holiday_date" mask="YYYY-MM-DD" color="green-9">
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Close" color="green-9" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>

          <q-input
            v-model="holidayForm.name"
            outlined
            dense
            label="Holiday Name *"
            hint="e.g. Independence Day, Charter Day"
            :rules="[val => !!val && val.trim().length > 0 || 'Holiday name is required']"
          />

          <q-select
            v-model="holidayForm.type"
            :options="holidayTypeOptions"
            outlined
            dense
            emit-value
            map-options
            label="Holiday Classification *"
          />

          <q-input
            v-model="holidayForm.description"
            outlined
            dense
            label="Description / Notes (Optional)"
            hint="e.g. Proclamation No. or special instructions"
          />

          <div class="row q-gutter-x-md">
            <q-checkbox
              v-model="holidayForm.is_recurring"
              color="green-9"
              label="Recurs annually (repeats every year on this month/day)"
              class="text-weight-medium text-caption"
            />
            <q-checkbox
              v-model="holidayForm.is_active"
              color="green-9"
              label="Active"
              class="text-weight-medium text-caption"
            />
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat no-caps label="Cancel" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="green-9"
            label="Save Holiday"
            class="text-weight-bold q-px-md"
            :loading="savingHoliday"
            @click="saveHoliday"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'

// Embedded Existing Library Views
import LeaveTypesView from 'pages/hr/LeaveTypesPage.vue'
import DepartmentsLibraryView from 'pages/hr/DepartmentsLibraryPage.vue'
import IllnessLibraryView from 'pages/hr/IllnessLibraryPage.vue'
import WorkSchedulesView from 'pages/hr/WorkSchedulesPage.vue'
import SignatoriesView from 'pages/hr/SignatoriesPage.vue'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()

const currentTab = ref('remarks')

// Sync tab with URL query parameter
watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab && typeof newTab === 'string') {
      currentTab.value = newTab
    }
  },
  { immediate: true }
)

watch(currentTab, (val) => {
  if (route.query.tab !== val) {
    router.replace({ query: { ...route.query, tab: val } })
  }
})

// =========================================================
// REMARKS LIBRARY LOGIC
// =========================================================
const remarksList = ref([])
const remarksSearch = ref('')
const loadingRemarks = ref(false)
const savingRemark = ref(false)

const remarkColumns = [
  { name: 'abbrv', label: 'ABBRV.', field: 'abbrv', align: 'left', sortable: true },
  { name: 'description', label: 'DESCRIPTION', field: 'description', align: 'left', sortable: true },
  { name: 'is_active', label: 'STATUS', field: 'is_active', align: 'center', sortable: true },
  { name: 'actions', label: 'ACTIONS', align: 'right' },
]

const filteredRemarks = computed(() => {
  const q = remarksSearch.value.trim().toLowerCase()
  if (!q) return remarksList.value
  return remarksList.value.filter(
    r => (r.abbrv && r.abbrv.toLowerCase().includes(q)) ||
         (r.description && r.description.toLowerCase().includes(q))
  )
})

const remarkDialog = reactive({
  show: false,
  isEdit: false,
  id: null,
})

const remarkForm = reactive({
  abbrv: '',
  description: '',
  order_no: 0,
  is_active: true,
})

async function fetchRemarks() {
  loadingRemarks.value = true
  try {
    const { data } = await api.get('/hr/dtr-remarks')
    remarksList.value = data.remarks || []
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to load remarks library.',
    })
  } finally {
    loadingRemarks.value = false
  }
}

function openAddRemarkDialog() {
  remarkDialog.isEdit = false
  remarkDialog.id = null
  remarkForm.abbrv = ''
  remarkForm.description = ''
  remarkForm.order_no = remarksList.value.length + 1
  remarkForm.is_active = true
  remarkDialog.show = true
}

function openEditRemarkDialog(row) {
  remarkDialog.isEdit = true
  remarkDialog.id = row.id
  remarkForm.abbrv = row.abbrv || ''
  remarkForm.description = row.description || ''
  remarkForm.order_no = row.order_no ?? 0
  remarkForm.is_active = Boolean(row.is_active)
  remarkDialog.show = true
}

async function saveRemark() {
  if (!remarkForm.description || remarkForm.description.trim() === '') {
    $q.notify({ type: 'warning', message: 'Description is required.' })
    return
  }

  savingRemark.value = true
  try {
    const payload = {
      abbrv: remarkForm.abbrv ? remarkForm.abbrv.trim().toUpperCase() : null,
      description: remarkForm.description.trim().toUpperCase(),
      order_no: remarkForm.order_no,
      is_active: remarkForm.is_active,
    }

    if (remarkDialog.isEdit) {
      await api.post(`/hr/dtr-remarks/${remarkDialog.id}/update`, payload)
      $q.notify({ type: 'positive', message: 'Remark updated successfully.' })
    } else {
      await api.post('/hr/dtr-remarks', payload)
      $q.notify({ type: 'positive', message: 'Remark created successfully.' })
    }

    remarkDialog.show = false
    await fetchRemarks()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to save remark.',
    })
  } finally {
    savingRemark.value = false
  }
}

function confirmDeleteRemark(row) {
  $q.dialog({
    title: 'Delete Remark',
    message: `Are you sure you want to delete remark "${row.description}"?`,
    cancel: true,
    persistent: true,
    ok: { label: 'Delete', color: 'negative', unelevated: true },
  }).onOk(async () => {
    try {
      await api.post(`/hr/dtr-remarks/${row.id}/delete`)
      $q.notify({ type: 'positive', message: 'Remark deleted successfully.' })
      await fetchRemarks()
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: err.response?.data?.message || 'Failed to delete remark.',
      })
    }
  })
}

// =========================================================
// HOLIDAY LIBRARY LOGIC
// =========================================================
const holidaysList = ref([])
const holidaysSearch = ref('')
const loadingHolidays = ref(false)
const savingHoliday = ref(false)
const currentYear = new Date().getFullYear()
const selectedHolidayYear = ref(currentYear)

const holidayYearOptions = [
  { label: 'All Years', value: '' },
  { label: String(currentYear - 1), value: currentYear - 1 },
  { label: `${currentYear} (Current)`, value: currentYear },
  { label: String(currentYear + 1), value: currentYear + 1 },
]

const holidayTypeOptions = [
  { label: 'Regular Holiday', value: 'REGULAR' },
  { label: 'Special Non-Working Holiday', value: 'SPECIAL_NON_WORKING' },
  { label: 'Special Working Holiday', value: 'SPECIAL_WORKING' },
]

const holidayColumns = [
  { name: 'holiday_date', label: 'DATE', field: 'holiday_date', align: 'left', sortable: true },
  { name: 'name', label: 'HOLIDAY NAME', field: 'name', align: 'left', sortable: true },
  { name: 'type', label: 'CLASSIFICATION', field: 'type', align: 'center', sortable: true },
  { name: 'is_recurring', label: 'RECURRING', field: 'is_recurring', align: 'center', sortable: true },
  { name: 'is_active', label: 'STATUS', field: 'is_active', align: 'center', sortable: true },
  { name: 'actions', label: 'ACTIONS', align: 'right' },
]

const filteredHolidays = computed(() => {
  const q = holidaysSearch.value.trim().toLowerCase()
  if (!q) return holidaysList.value
  return holidaysList.value.filter(
    h => (h.name && h.name.toLowerCase().includes(q)) ||
         (h.holiday_date && h.holiday_date.includes(q)) ||
         (h.type && h.type.toLowerCase().includes(q))
  )
})

const holidayDialog = reactive({
  show: false,
  isEdit: false,
  id: null,
})

const holidayForm = reactive({
  holiday_date: '',
  name: '',
  type: 'REGULAR',
  is_recurring: false,
  is_active: true,
  description: '',
})

async function fetchHolidays() {
  loadingHolidays.value = true
  try {
    const params = {}
    if (selectedHolidayYear.value) {
      params.year = selectedHolidayYear.value
    }
    const { data } = await api.get('/hr/holidays', { params })
    holidaysList.value = data.holidays || []
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to load holidays.',
    })
  } finally {
    loadingHolidays.value = false
  }
}

function formatHolidayDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(`${dateStr}T00:00:00`)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function getHolidayTypeBadge(type) {
  switch (type) {
    case 'REGULAR':
      return { label: 'Regular Holiday', color: 'blue-1', textColor: 'blue-9' }
    case 'SPECIAL_NON_WORKING':
      return { label: 'Special Non-Working', color: 'amber-1', textColor: 'amber-10' }
    case 'SPECIAL_WORKING':
      return { label: 'Special Working', color: 'purple-1', textColor: 'purple-9' }
    default:
      return { label: type || 'Holiday', color: 'grey-2', textColor: 'grey-9' }
  }
}

function openAddHolidayDialog() {
  holidayDialog.isEdit = false
  holidayDialog.id = null
  holidayForm.holiday_date = new Date().toISOString().slice(0, 10)
  holidayForm.name = ''
  holidayForm.type = 'REGULAR'
  holidayForm.is_recurring = false
  holidayForm.is_active = true
  holidayForm.description = ''
  holidayDialog.show = true
}

function openEditHolidayDialog(row) {
  holidayDialog.isEdit = true
  holidayDialog.id = row.id
  holidayForm.holiday_date = row.holiday_date || ''
  holidayForm.name = row.name || ''
  holidayForm.type = row.type || 'REGULAR'
  holidayForm.is_recurring = Boolean(row.is_recurring)
  holidayForm.is_active = Boolean(row.is_active)
  holidayForm.description = row.description || ''
  holidayDialog.show = true
}

async function saveHoliday() {
  if (!holidayForm.name || holidayForm.name.trim() === '') {
    $q.notify({ type: 'warning', message: 'Holiday name is required.' })
    return
  }
  if (!holidayForm.holiday_date) {
    $q.notify({ type: 'warning', message: 'Holiday date is required.' })
    return
  }

  savingHoliday.value = true
  try {
    const payload = {
      holiday_date: holidayForm.holiday_date,
      name: holidayForm.name.trim(),
      type: holidayForm.type,
      is_recurring: holidayForm.is_recurring,
      is_active: holidayForm.is_active,
      description: holidayForm.description ? holidayForm.description.trim() : null,
    }

    if (holidayDialog.isEdit) {
      await api.post(`/hr/holidays/${holidayDialog.id}/update`, payload)
      $q.notify({ type: 'positive', message: 'Holiday updated successfully.' })
    } else {
      await api.post('/hr/holidays', payload)
      $q.notify({ type: 'positive', message: 'Holiday created successfully.' })
    }

    holidayDialog.show = false
    await fetchHolidays()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to save holiday.',
    })
  } finally {
    savingHoliday.value = false
  }
}

function confirmDeleteHoliday(row) {
  $q.dialog({
    title: 'Delete Holiday',
    message: `Are you sure you want to delete "${row.name}" (${row.holiday_date})?`,
    cancel: true,
    persistent: true,
    ok: { label: 'Delete', color: 'negative', unelevated: true },
  }).onOk(async () => {
    try {
      await api.post(`/hr/holidays/${row.id}/delete`)
      $q.notify({ type: 'positive', message: 'Holiday deleted successfully.' })
      await fetchHolidays()
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: err.response?.data?.message || 'Failed to delete holiday.',
      })
    }
  })
}

onMounted(() => {
  fetchRemarks()
  fetchHolidays()
})
</script>

<style scoped>
.libraries-page {
  max-width: 1300px;
  margin: 0 auto;
}
</style>
