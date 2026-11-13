<template>
  <q-page class="q-pa-md">
    <!-- Header Section -->
    <div class="q-mb-md">
      <div class="row items-center justify-between q-gutter-sm">
        <div>
          <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Office Divisions</h1>
        </div>
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="add_link"
          label="Assign Divisions"
          @click="openAssignDialog"
        />
      </div>
    </div>

    <!-- Search Bar Card -->
    <q-card flat bordered class="rounded-borders q-mb-md">
      <q-card-section class="q-py-sm">
        <q-input
          v-model="search"
          outlined
          dense
          clearable
          debounce="250"
          label="Search main offices or divisions"
          placeholder="Type office or division name..."
        >
          <template #prepend>
            <q-icon name="search" color="grey-6" />
          </template>
        </q-input>
      </q-card-section>
    </q-card>

    <!-- Master-Detail Office & Division Table -->
    <q-card flat bordered class="rounded-borders">
      <q-table
        v-model:expanded="expandedRows"
        :rows="filteredOffices"
        :columns="columns"
        row-key="id"
        flat
        :loading="loading"
        :pagination="pagination"
        :rows-per-page-options="[10, 20, 50, 0]"
      >
        <!-- Custom Body Rendering with Master-Detail Subtable -->
        <template #body="props">
          <q-tr :props="props" :class="{ 'bg-blue-1 text-grey-9': props.expand }">
            <!-- Main Office Name -->
            <q-td key="name" :props="props" class="office-name-cell">
              <span
                class="text-weight-bold text-body2 ellipsis block"
                :class="{
                  'cursor-pointer text-primary': props.row.divisions && props.row.divisions.length > 0,
                }"
                @click="props.row.divisions && props.row.divisions.length > 0 ? (props.expand = !props.expand) : null"
              >
                {{ props.row.name }}
                <q-tooltip anchor="top middle" self="bottom middle" :offset="[0, 6]" max-width="320px">
                  {{ props.row.name }}
                </q-tooltip>
              </span>
            </q-td>

            <!-- Linked Divisions Toggle Badge Button -->
            <q-td key="divisions_count" :props="props">
              <q-btn
                v-if="props.row.divisions_count > 0"
                unelevated
                rounded
                dense
                no-caps
                size="sm"
                color="primary"
                class="q-px-sm"
                :icon-right="props.expand ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
                @click.stop="props.expand = !props.expand"
              >
                <q-icon name="lan" size="13px" class="q-mr-xs" />
                <span>{{ props.row.divisions_count }} {{ props.row.divisions_count === 1 ? 'Division' : 'Divisions' }}</span>
                <q-tooltip>{{ props.expand ? 'Hide divisions' : 'View divisions' }}</q-tooltip>
              </q-btn>
              <span v-else class="text-grey-5 q-px-xs text-weight-medium">—</span>
            </q-td>

            <!-- Actions -->
            <q-td key="actions" :props="props" class="text-center">
              <q-btn
                flat
                dense
                round
                icon="add"
                color="primary"
                @click="openAssignDialogForMain(props.row)"
              >
                <q-tooltip>Attach division</q-tooltip>
              </q-btn>
            </q-td>
          </q-tr>

          <!-- Sub-table for attached divisions -->
          <q-tr v-show="props.expand" :props="props" class="bg-grey-1 subtable-row">
            <q-td colspan="100%" class="q-py-md q-px-md">
              <div class="subtable-container bg-white rounded-borders q-pa-md">
                <div class="row items-center justify-between q-mb-sm">
                  <div class="row items-center q-gutter-xs">
                    <q-icon name="lan" color="primary" size="xs" />
                    <span class="text-caption text-weight-bold text-grey-8 uppercase tracking-wide">
                      Attached Divisions under {{ props.row.name }} ({{ props.row.divisions.length }})
                    </span>
                  </div>
                  <q-btn
                    flat
                    dense
                    no-caps
                    size="sm"
                    color="primary"
                    icon="add"
                    label="Attach Another Division"
                    @click="openAssignDialogForMain(props.row)"
                  />
                </div>

                <q-markup-table dense flat bordered separator="horizontal" class="division-subtable">
                  <thead>
                    <tr class="bg-grey-2 text-grey-8">
                      <th class="text-left">Division Name</th>
                      <th class="text-center" style="width: 80px">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="div in props.row.divisions" :key="div.id">
                      <td class="text-left">
                        <span class="text-weight-medium text-body2">{{ div.name }}</span>
                      </td>
                      <td class="text-center">
                        <q-btn
                          flat
                          round
                          dense
                          icon="link_off"
                          color="negative"
                          size="sm"
                          :loading="detachingId === div.id"
                          :disable="detachingId === div.id"
                          @click="confirmDetach(div, props.row)"
                        >
                          <q-tooltip>Detach division</q-tooltip>
                        </q-btn>
                      </td>
                    </tr>
                  </tbody>
                </q-markup-table>
              </div>
            </q-td>
          </q-tr>
        </template>

        <!-- No Data Template -->
        <template #no-data>
          <div class="full-width text-center q-pa-xl">
            <template v-if="loading">
              <q-spinner color="primary" size="44px" />
              <div class="text-grey-6 q-mt-sm">Loading offices and divisions...</div>
            </template>
            <template v-else>
              <q-icon name="lan" size="48px" color="grey-4" />
              <div class="text-h6 text-grey-6 q-mt-sm">No offices found matching your criteria.</div>
            </template>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Assign Divisions Dialog -->
    <q-dialog v-model="showAssignDialog" persistent>
      <q-card style="width: 95vw; max-width: 580px" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Assign Divisions to Office</div>
          <q-space />
          <q-btn icon="close" flat round dense :disable="saving" v-close-popup />
        </q-card-section>

        <q-form ref="assignFormRef" @submit.prevent="submitAssignment">
          <q-card-section class="q-pt-md q-gutter-y-md">
            <!-- Main Office Select -->
            <q-select
              v-model="assignForm.main_department_id"
              outlined
              dense
              emit-value
              map-options
              label="Main Office *"
              :options="filteredMainOptions"
              option-value="id"
              option-label="name"
              use-input
              input-debounce="150"
              :rules="[(val) => Boolean(val) || 'Main office is required.']"
              :disable="saving"
              @filter="filterMainOptions"
            >
              <template #no-option>
                <q-item>
                  <q-item-section class="text-grey">No matching main offices found</q-item-section>
                </q-item>
              </template>
            </q-select>

            <!-- Divisions Multi-Select -->
            <q-select
              v-model="assignForm.division_ids"
              outlined
              dense
              multiple
              use-chips
              emit-value
              map-options
              label="Select Divisions to Attach *"
              :options="filteredDivisionOptions"
              option-value="id"
              option-label="name"
              use-input
              input-debounce="150"
              :rules="[(val) => (Array.isArray(val) && val.length > 0) || 'Please select at least one division.']"
              :disable="saving"
              hint="Only offices that are not currently main offices or attached to another office are available."
              @filter="filterDivisionOptions"
            >
              <template #no-option>
                <q-item>
                  <q-item-section class="text-grey">No available candidate divisions</q-item-section>
                </q-item>
              </template>
            </q-select>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat no-caps label="Cancel" color="grey-7" :disable="saving" v-close-popup />
            <q-btn
              unelevated
              no-caps
              color="primary"
              label="Save Assignment"
              :loading="saving"
              type="submit"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const $q = useQuasar()

const loading = ref(false)
const saving = ref(false)
const detachingId = ref(null)
const search = ref('')
const expandedRows = ref([])

const pagination = ref({
  rowsPerPage: 20,
  sortBy: 'name',
  descending: false,
})

const columns = [
  {
    name: 'name',
    label: 'Main Office',
    field: 'name',
    align: 'left',
    sortable: true,
  },
  {
    name: 'divisions_count',
    label: 'Divisions',
    field: 'divisions_count',
    align: 'left',
    sortable: true,
    style: 'width: 180px',
  },
  {
    name: 'actions',
    label: 'Actions',
    field: 'actions',
    align: 'center',
    style: 'width: 80px',
  },
]

const offices = ref([])
const mainCandidates = ref([])
const availableDivisions = ref([])

const showAssignDialog = ref(false)
const assignFormRef = ref(null)
const assignForm = ref({
  main_department_id: null,
  division_ids: [],
})

const mainFilterText = ref('')
const divisionFilterText = ref('')

const filteredMainOptions = computed(() => {
  const term = String(mainFilterText.value || '').trim().toLowerCase()
  if (!term) return mainCandidates.value
  return mainCandidates.value.filter((p) => p.name.toLowerCase().includes(term))
})

const filteredDivisionOptions = computed(() => {
  const term = String(divisionFilterText.value || '').trim().toLowerCase()
  const selectedMainId = assignForm.value.main_department_id

  let candidates = availableDivisions.value
  if (selectedMainId) {
    candidates = candidates.filter((d) => d.id !== selectedMainId)
  }

  if (!term) return candidates
  return candidates.filter((d) => d.name.toLowerCase().includes(term))
})

const filteredOffices = computed(() => {
  const term = String(search.value || '').trim().toLowerCase()
  const list = offices.value

  if (!term) return list

  return list.filter((o) => {
    const matchOffice = o.name.toLowerCase().includes(term)
    const matchDivision = Array.isArray(o.divisions) && o.divisions.some((d) => d.name.toLowerCase().includes(term))
    return matchOffice || matchDivision
  })
})

onMounted(() => {
  fetchOfficeDivisions()
})

async function fetchOfficeDivisions() {
  loading.value = true
  try {
    const { data } = await api.get('/hr/office-divisions')
    offices.value = Array.isArray(data?.offices) ? data.offices : []
    mainCandidates.value = Array.isArray(data?.main_candidates) ? data.main_candidates : []
    availableDivisions.value = Array.isArray(data?.available_divisions) ? data.available_divisions : []

    // Automatically expand offices that have divisions for quick visibility
    const withDivs = offices.value
      .filter((o) => Array.isArray(o.divisions) && o.divisions.length > 0)
      .map((o) => o.id)
    expandedRows.value = withDivs
  } catch (err) {
    offices.value = []
    $q.notify({
      type: 'negative',
      message: resolveApiErrorMessage(err, 'Unable to load office divisions right now.'),
    })
  } finally {
    loading.value = false
  }
}

function openAssignDialog() {
  assignForm.value = {
    main_department_id: null,
    division_ids: [],
  }
  mainFilterText.value = ''
  divisionFilterText.value = ''
  showAssignDialog.value = true
}

function openAssignDialogForMain(office) {
  assignForm.value = {
    main_department_id: office.id,
    division_ids: [],
  }
  mainFilterText.value = ''
  divisionFilterText.value = ''
  showAssignDialog.value = true
}

function filterMainOptions(val, update) {
  update(() => {
    mainFilterText.value = val
  })
}

function filterDivisionOptions(val, update) {
  update(() => {
    divisionFilterText.value = val
  })
}

async function submitAssignment() {
  if (saving.value) return

  const isValid = await assignFormRef.value?.validate?.()
  if (isValid === false) return

  saving.value = true
  try {
    const payload = {
      main_department_id: assignForm.value.main_department_id,
      division_ids: assignForm.value.division_ids,
    }

    const { data } = await api.post('/hr/office-divisions/assign', payload)
    $q.notify({
      type: 'positive',
      message: data?.message || 'Divisions assigned to main office successfully.',
    })
    showAssignDialog.value = false
    await fetchOfficeDivisions()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: resolveApiErrorMessage(err, 'Unable to assign divisions right now.'),
    })
  } finally {
    saving.value = false
  }
}

function confirmDetach(division, mainOffice) {
  $q.dialog({
    title: 'Detach Division',
    message: `Detach "${division.name}" from "${mainOffice.name}"? It will revert to a standalone office.`,
    cancel: true,
    persistent: true,
    ok: {
      label: 'Detach Division',
      color: 'negative',
      unelevated: true,
      noCaps: true,
    },
    cancelOptions: {
      flat: true,
      noCaps: true,
    },
  }).onOk(() => {
    detachDivision(division)
  })
}

async function detachDivision(division) {
  detachingId.value = division.id
  try {
    const { data } = await api.post(`/hr/office-divisions/${division.id}/detach`)
    $q.notify({
      type: 'positive',
      message: data?.message || 'Division detached successfully.',
    })
    await fetchOfficeDivisions()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: resolveApiErrorMessage(err, 'Unable to detach division right now.'),
    })
  } finally {
    detachingId.value = null
  }
}

function resolveApiErrorMessage(error, fallback) {
  const data = error?.response?.data
  if (typeof data?.message === 'string' && data.message.trim() !== '') {
    return data.message
  }

  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors).flat().find(Boolean)
    if (typeof first === 'string' && first.trim() !== '') {
      return first
    }
  }

  return fallback
}
</script>

<style scoped>
.subtable-container {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.division-subtable {
  border-radius: 6px;
  overflow: hidden;
}

.division-subtable th {
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #455a64;
}

.tracking-wide {
  letter-spacing: 0.05em;
}
</style>
