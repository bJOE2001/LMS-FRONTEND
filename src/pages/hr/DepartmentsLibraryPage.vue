<template>
  <q-page class="q-pa-md">
    <div class="q-mb-lg">
      <div class="row items-center justify-between q-gutter-sm">
        <div>
          <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Departments Library</h1>
        </div>
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="add_business"
          label="Create Department"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-4">
        <q-card flat bordered class="rounded-borders">
          <q-card-section>
            <div class="row items-center no-wrap">
              <q-icon name="business" size="md" color="primary" class="q-mr-sm" />
              <div>
                <div class="text-caption text-weight-medium">Total Departments</div>
                <div class="text-h4 text-primary">{{ totalDepartments }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card flat bordered class="rounded-borders q-mb-md">
      <q-card-section>
        <q-input
          v-model="search"
          outlined
          dense
          clearable
          debounce="250"
          label="Search departments"
          placeholder="Type department name..."
        >
          <template #prepend>
            <q-icon name="search" color="grey-6" />
          </template>
        </q-input>
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
        <template #body-cell-name="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.name }}</div>
          </q-td>
        </template>

        <template #body-cell-updated_at="props">
          <q-td :props="props">
            {{ formatDateTime(props.row.updated_at) }}
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <q-btn
              flat
              dense
              round
              icon="edit"
              color="primary"
              @click="openEditDialog(props.row)"
            >
              <q-tooltip>Edit Department</q-tooltip>
            </q-btn>
            <q-btn
              flat
              dense
              round
              icon="delete"
              color="negative"
              :disable="props.row.has_admin || props.row.has_department_head || deletingId === props.row.id"
              :loading="deletingId === props.row.id"
              @click="confirmDelete(props.row)"
            >
              <q-tooltip v-if="props.row.has_admin">
                Remove assigned department admin first.
              </q-tooltip>
              <q-tooltip v-else-if="props.row.has_department_head">
                Remove assigned department head first.
              </q-tooltip>
              <q-tooltip v-else>
                Delete Department
              </q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <template #no-data>
          <div class="full-width text-center q-pa-lg">
            <template v-if="loading">
              <q-spinner color="primary" size="40px" />
              <div class="text-grey-6 q-mt-sm">Loading departments...</div>
            </template>
            <template v-else>
              <q-icon name="business" size="48px" color="grey-5" />
              <div class="text-grey-6 q-mt-sm">No departments found.</div>
            </template>
          </div>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="showDialog" persistent>
      <q-card style="width: 95vw; max-width: 520px" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ dialogTitle }}</div>
          <q-space />
          <q-btn icon="close" flat round dense :disable="saving" v-close-popup />
        </q-card-section>

        <q-form ref="formRef" @submit.prevent="saveDepartment">
          <q-card-section class="q-pt-sm">
            <q-input
              v-model="form.name"
              outlined
              dense
              autofocus
              label="Department Name *"
              :disable="saving"
              :rules="[requiredRule('Department name')]"
            />
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat no-caps label="Cancel" color="grey-7" :disable="saving" v-close-popup />
            <q-btn
              unelevated
              no-caps
              color="primary"
              :label="dialogMode === 'edit' ? 'Update Department' : 'Create Department'"
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
const deletingId = ref(null)
const search = ref('')
const rows = ref([])

const showDialog = ref(false)
const dialogMode = ref('create')
const editingId = ref(null)
const formRef = ref(null)
const form = ref({
  name: '',
})

const columns = [
  { name: 'name', label: 'Department', field: 'name', align: 'left', sortable: true },
  { name: 'updated_at', label: 'Last Updated', field: 'updated_at', align: 'left', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const totalDepartments = computed(() => rows.value.length)

const filteredRows = computed(() => {
  const term = normalizeSearch(search.value)
  if (!term) return rows.value

  return rows.value.filter((row) => normalizeSearch(row.name).includes(term))
})

const dialogTitle = computed(() => (dialogMode.value === 'edit' ? 'Edit Department' : 'Create Department'))

onMounted(() => {
  fetchDepartments()
})

async function fetchDepartments() {
  loading.value = true
  try {
    const { data } = await api.get('/hr/departments')
    rows.value = Array.isArray(data?.departments) ? data.departments : []
  } catch (err) {
    rows.value = []
    $q.notify({
      type: 'negative',
      message: resolveApiErrorMessage(err, 'Unable to load departments right now.'),
    })
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  dialogMode.value = 'create'
  editingId.value = null
  form.value = { name: '' }
  showDialog.value = true
}

function openEditDialog(row) {
  dialogMode.value = 'edit'
  editingId.value = row.id
  form.value = { name: String(row?.name || '') }
  showDialog.value = true
}

async function saveDepartment() {
  if (saving.value) return

  const isValid = await formRef.value?.validate?.()
  if (isValid === false) return

  const name = String(form.value.name || '').trim()
  if (!name) return

  saving.value = true
  try {
    const payload = { name }
    const response = dialogMode.value === 'edit'
      ? await api.put(`/hr/departments/${editingId.value}`, payload)
      : await api.post('/hr/departments', payload)

    $q.notify({
      type: 'positive',
      message: response?.data?.message || 'Department saved successfully.',
    })
    showDialog.value = false
    await fetchDepartments()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: resolveApiErrorMessage(err, 'Unable to save department right now.'),
    })
  } finally {
    saving.value = false
  }
}

function confirmDelete(row) {
  if (row.has_admin || row.has_department_head || deletingId.value === row.id) {
    return
  }

  $q.dialog({
    title: 'Delete Department',
    message: `Delete "${row.name}"? This action cannot be undone.`,
    cancel: true,
    persistent: true,
    ok: {
      label: 'Delete',
      color: 'negative',
      unelevated: true,
      noCaps: true,
    },
    cancelOptions: {
      flat: true,
      noCaps: true,
    },
  }).onOk(() => {
    deleteDepartment(row)
  })
}

async function deleteDepartment(row) {
  deletingId.value = row.id
  try {
    const { data } = await api.delete(`/hr/departments/${row.id}`)
    $q.notify({
      type: 'positive',
      message: data?.message || 'Department deleted successfully.',
    })
    await fetchDepartments()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: resolveApiErrorMessage(err, 'Unable to delete department right now.'),
    })
  } finally {
    deletingId.value = null
  }
}

function requiredRule(label) {
  return (value) => String(value || '').trim() !== '' || `${label} is required.`
}

function normalizeSearch(value) {
  return String(value || '').trim().toLowerCase()
}

function formatDateTime(value) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'

  return parsed.toLocaleString('en-PH', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
