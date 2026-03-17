<template>
  <q-page class="q-pa-md">
    <div class="q-mb-lg">
      <div class="row items-center justify-between q-gutter-sm">
        <div>
          <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Leave Types</h1>
        </div>
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="add"
          label="Add Leave Type"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <q-card flat bordered class="rounded-borders q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md items-end">
          <div class="col-12 col-md-6">
            <q-input
              v-model="search"
              outlined
              dense
              clearable
              debounce="300"
              label="Search leave type"
              placeholder="Type name..."
            >
              <template #prepend>
                <q-icon name="search" color="grey-6" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-md-3">
            <q-select
              v-model="filterCategory"
              :options="categoryFilterOptions"
              emit-value
              map-options
              outlined
              dense
              clearable
              label="Category"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="rounded-borders">
      <q-table
        :rows="filteredRows"
        :columns="columns"
        row-key="id"
        flat
        :loading="loading"
        :rows-per-page-options="[10, 20, 50]"
      >
        <template #body-cell-category="props">
          <q-td :props="props">
            <q-badge
              :color="categoryColor(props.value)"
              text-color="white"
              :label="props.value"
              rounded
            />
          </q-td>
        </template>

        <template #body-cell-credit="props">
          <q-td :props="props" class="text-center">
            <q-badge :color="props.row.is_credit_based ? 'green-7' : 'grey-6'" :label="props.row.is_credit_based ? 'Yes' : 'No'" rounded />
          </q-td>
        </template>

        <template #body-cell-max_days="props">
          <q-td :props="props" class="text-center">
            {{ props.row.max_days !== null ? props.row.max_days : 'No Limit' }}
          </q-td>
        </template>

        <template #body-cell-accrual="props">
          <q-td :props="props">
            <span v-if="props.row.category === 'ACCRUED'">
              {{ Number(props.row.accrual_rate).toFixed(2) }} / day {{ props.row.accrual_day_of_month }}
            </span>
            <span v-else class="text-grey-6">-</span>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <q-btn flat dense round icon="edit" color="primary" @click="openEditDialog(props.row)">
              <q-tooltip>Edit</q-tooltip>
            </q-btn>
            <q-btn
              flat
              dense
              round
              icon="delete"
              color="negative"
              :loading="deletingId === props.row.id"
              @click="confirmDelete(props.row)"
            >
              <q-tooltip>Delete</q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <template #no-data>
          <div class="full-width text-center q-pa-lg text-grey-7">
            <q-icon name="inbox" size="36px" />
            <div class="q-mt-sm">No leave types found.</div>
          </div>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="showFormDialog" seamless>
      <q-card style="width: 95vw; max-width: 620px">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ isEditMode ? 'Edit Leave Type' : 'Add Leave Type' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup :disable="saving" />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input v-model="form.name" outlined dense label="Name *" maxlength="255" />
            </div>
            <div class="col-12 col-md-6">
              <q-select
                v-model="form.category"
                :options="categoryOptions"
                emit-value
                map-options
                outlined
                dense
                label="Category *"
              />
            </div>

            <div v-if="form.category === 'ACCRUED'" class="col-12 col-md-6">
              <q-input v-model.number="form.accrual_rate" type="number" outlined dense label="Accrual Rate *" min="0.01" step="0.01" />
            </div>
            <div v-if="form.category === 'ACCRUED'" class="col-12 col-md-6">
              <q-input v-model.number="form.accrual_day_of_month" type="number" outlined dense label="Accrual Day (1-31) *" min="1" max="31" />
            </div>

            <div class="col-12 col-md-6">
              <q-input v-model.number="form.max_days" type="number" outlined dense label="Max Days (optional)" min="0" />
            </div>
            <div class="col-12 col-md-6">
              <q-toggle v-model="form.is_credit_based" label="Credit-Based" color="green-8" />
            </div>
            <div class="col-12 col-md-6">
              <q-toggle v-model="form.resets_yearly" label="Resets Yearly" color="blue-7" />
            </div>
            <div class="col-12">
              <q-input v-model="form.description" type="textarea" rows="3" outlined dense label="Description (optional)" maxlength="2000" />
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup :disable="saving" />
          <q-btn
            unelevated
            no-caps
            color="primary"
            :label="isEditMode ? 'Save Changes' : 'Create Leave Type'"
            :loading="saving"
            @click="saveLeaveType"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const $q = useQuasar()

const loading = ref(false)
const saving = ref(false)
const deletingId = ref(null)

const leaveTypes = ref([])
const search = ref('')
const filterCategory = ref(null)

const showFormDialog = ref(false)
const isEditMode = ref(false)
const editingId = ref(null)

const categoryOptions = [
  { label: 'ACCRUED', value: 'ACCRUED' },
  { label: 'RESETTABLE', value: 'RESETTABLE' },
  { label: 'EVENT', value: 'EVENT' },
]

const categoryFilterOptions = [
  { label: 'ACCRUED', value: 'ACCRUED' },
  { label: 'RESETTABLE', value: 'RESETTABLE' },
  { label: 'EVENT', value: 'EVENT' },
]

const form = ref(defaultForm())

const columns = [
  { name: 'name', label: 'Name', align: 'left', field: 'name', sortable: true },
  { name: 'category', label: 'Category', align: 'left', field: 'category', sortable: true },
  { name: 'credit', label: 'Credit-Based', align: 'center', field: 'is_credit_based', sortable: true },
  { name: 'max_days', label: 'Max Days', align: 'center', field: 'max_days', sortable: true },
  { name: 'accrual', label: 'Accrual', align: 'left', field: 'accrual_rate' },
  { name: 'actions', label: 'Actions', align: 'center' },
]

const filteredRows = computed(() => {
  const needle = search.value.trim().toLowerCase()
  return leaveTypes.value.filter((row) => {
    const matchCategory = !filterCategory.value || row.category === filterCategory.value
    if (!matchCategory) return false
    if (!needle) return true
    return row.name.toLowerCase().includes(needle)
  })
})

watch(
  () => form.value.category,
  (category) => {
    if (category !== 'ACCRUED') {
      form.value.accrual_rate = null
      form.value.accrual_day_of_month = null
    } else {
      if (!form.value.accrual_rate) form.value.accrual_rate = 1.25
      if (!form.value.accrual_day_of_month) form.value.accrual_day_of_month = 1
    }

    if (category === 'EVENT') {
      form.value.is_credit_based = false
      form.value.resets_yearly = false
    } else if (category === 'RESETTABLE') {
      form.value.is_credit_based = true
      form.value.resets_yearly = true
    } else if (category === 'ACCRUED') {
      form.value.is_credit_based = true
    }
  }
)

onMounted(fetchLeaveTypes)

function defaultForm() {
  return {
    name: '',
    category: 'ACCRUED',
    accrual_rate: 1.25,
    accrual_day_of_month: 1,
    max_days: null,
    is_credit_based: true,
    resets_yearly: false,
    requires_documents: false,
    description: '',
  }
}

function categoryColor(category) {
  if (category === 'ACCRUED') return 'green-7'
  if (category === 'RESETTABLE') return 'blue-7'
  return 'orange-8'
}

async function fetchLeaveTypes() {
  loading.value = true
  try {
    const { data } = await api.get('/hr/leave-types')
    leaveTypes.value = data.leave_types || []
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to load leave types.'
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  isEditMode.value = false
  editingId.value = null
  form.value = defaultForm()
  showFormDialog.value = true
}

function openEditDialog(row) {
  isEditMode.value = true
  editingId.value = row.id
  form.value = {
    name: row.name || '',
    category: row.category || 'ACCRUED',
    accrual_rate: row.accrual_rate ?? null,
    accrual_day_of_month: row.accrual_day_of_month ?? null,
    max_days: row.max_days ?? null,
    is_credit_based: !!row.is_credit_based,
    resets_yearly: !!row.resets_yearly,
    requires_documents: !!row.requires_documents,
    description: row.description || '',
  }
  showFormDialog.value = true
}

function firstValidationError() {
  if (!form.value.name || !form.value.name.trim()) return 'Leave type name is required.'
  if (!form.value.category) return 'Category is required.'

  if (form.value.category === 'ACCRUED') {
    if (form.value.accrual_rate === null || form.value.accrual_rate === '' || Number(form.value.accrual_rate) <= 0) {
      return 'Accrual rate is required for ACCRUED leave types.'
    }
    if (
      form.value.accrual_day_of_month === null ||
      form.value.accrual_day_of_month === '' ||
      Number(form.value.accrual_day_of_month) < 1 ||
      Number(form.value.accrual_day_of_month) > 31
    ) {
      return 'Accrual day must be from 1 to 31.'
    }
  }

  if (form.value.max_days !== null && form.value.max_days !== '' && Number(form.value.max_days) < 0) {
    return 'Max days cannot be negative.'
  }

  return ''
}

function buildPayload() {
  return {
    name: form.value.name.trim(),
    category: form.value.category,
    accrual_rate: form.value.category === 'ACCRUED' ? Number(form.value.accrual_rate) : null,
    accrual_day_of_month: form.value.category === 'ACCRUED' ? Number(form.value.accrual_day_of_month) : null,
    max_days:
      form.value.max_days === null || form.value.max_days === ''
        ? null
        : Number(form.value.max_days),
    is_credit_based: !!form.value.is_credit_based,
    resets_yearly: !!form.value.resets_yearly,
    requires_documents: !!form.value.requires_documents,
    description: form.value.description ? form.value.description.trim() : null,
  }
}

async function saveLeaveType() {
  const validationError = firstValidationError()
  if (validationError) {
    $q.notify({ type: 'warning', message: validationError, position: 'top' })
    return
  }

  saving.value = true
  try {
    const payload = buildPayload()
    if (isEditMode.value && editingId.value) {
      await api.put(`/hr/leave-types/${editingId.value}`, payload)
      $q.notify({ type: 'positive', message: 'Leave type updated successfully.', position: 'top' })
    } else {
      await api.post('/hr/leave-types', payload)
      $q.notify({ type: 'positive', message: 'Leave type created successfully.', position: 'top' })
    }

    showFormDialog.value = false
    await fetchLeaveTypes()
  } catch (err) {
    const backendErrors = err.response?.data?.errors
    const firstKey = backendErrors ? Object.keys(backendErrors)[0] : null
    const firstMsg = firstKey ? backendErrors[firstKey]?.[0] : null
    const msg = firstMsg || err.response?.data?.message || 'Unable to save leave type.'
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    saving.value = false
  }
}

function confirmDelete(row) {
  const usageTotal = Number(row.usage?.total || 0)
  if (usageTotal > 0) {
    $q.notify({
      type: 'warning',
      message: `Cannot delete "${row.name}" because it is already used in ${usageTotal} record(s).`,
      position: 'top',
    })
    return
  }

  $q.dialog({
    title: 'Delete Leave Type',
    message: `Delete "${row.name}" permanently?`,
    persistent: true,
    ok: { label: 'Delete', color: 'negative', unelevated: true, noCaps: true },
    cancel: { label: 'Cancel', flat: true, noCaps: true },
  }).onOk(async () => {
    deletingId.value = row.id
    try {
      await api.delete(`/hr/leave-types/${row.id}`)
      $q.notify({ type: 'positive', message: 'Leave type deleted successfully.', position: 'top' })
      await fetchLeaveTypes()
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to delete leave type.'
      $q.notify({ type: 'negative', message: msg, position: 'top' })
    } finally {
      deletingId.value = null
    }
  })
}
</script>
