<template>
  <q-page class="q-pa-md illness-library-page">
    <div class="q-mb-lg">
      <div class="row items-center justify-between q-gutter-sm">
        <div>
          <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Illness Library</h1>
          <p class="text-grey-7 q-mb-none">Manage sickness options used in leave applications.</p>
        </div>
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="add"
          label="Create Illness"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-4">
        <q-card flat bordered class="rounded-borders">
          <q-card-section>
            <div class="row items-center no-wrap">
              <q-icon name="medical_services" size="md" color="primary" class="q-mr-sm" />
              <div>
                <div class="text-caption text-weight-medium">Total Illnesses</div>
                <div class="text-h4 text-primary">{{ totalIllnesses }}</div>
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
          label="Search illnesses"
          placeholder="Type illness name..."
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
              <q-tooltip>Edit Illness</q-tooltip>
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
              <q-tooltip>Mark Illness Inactive</q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <template #no-data>
          <div class="full-width text-center q-pa-lg text-grey-7">
            <template v-if="loading">
              <q-spinner color="primary" size="32px" />
              <div class="q-mt-sm">Loading illnesses...</div>
            </template>
            <template v-else>
              <q-icon name="medical_services" size="36px" />
              <div class="q-mt-sm">No illnesses found.</div>
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

        <q-form ref="formRef" @submit.prevent="saveIllness">
          <q-card-section class="q-pt-sm">
            <q-input
              v-model="form.name"
              outlined
              dense
              autofocus
              label="Illness Name *"
              :disable="saving"
              :rules="[requiredRule('Illness name')]"
            />
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat no-caps label="Cancel" color="grey-7" :disable="saving" v-close-popup />
            <q-btn
              unelevated
              no-caps
              color="primary"
              :label="dialogMode === 'edit' ? 'Update Illness' : 'Create Illness'"
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
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

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
  { name: 'name', label: 'Illness', field: 'name', align: 'left', sortable: true },
  { name: 'updated_at', label: 'Last Updated', field: 'updated_at', align: 'left', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const totalIllnesses = computed(() => rows.value.length)

const filteredRows = computed(() => {
  const term = normalizeSearch(search.value)
  if (!term) return rows.value

  return rows.value.filter((row) => normalizeSearch(row.name).includes(term))
})

const dialogTitle = computed(() => (dialogMode.value === 'edit' ? 'Edit Illness' : 'Create Illness'))

onMounted(() => {
  fetchIllnesses()
})

async function fetchIllnesses() {
  loading.value = true
  try {
    const { data } = await api.get('/hr/illnesses')
    rows.value = Array.isArray(data?.illnesses) ? data.illnesses : []
  } catch (err) {
    rows.value = []
    $q.notify({
      type: 'negative',
      message: resolveApiErrorMessage(err, 'Unable to load illnesses right now.'),
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

async function saveIllness() {
  if (saving.value) return

  const isValid = await formRef.value?.validate?.()
  if (isValid === false) return

  const name = String(form.value.name || '').trim()
  if (!name) return

  saving.value = true
  try {
    const payload = { name }
    const response = dialogMode.value === 'edit'
      ? await api.post(`/hr/illnesses/${editingId.value}/update`, payload)
      : await api.post('/hr/illnesses', payload)

    $q.notify({
      type: 'positive',
      message: response?.data?.message || 'Illness saved successfully.',
    })
    showDialog.value = false
    await fetchIllnesses()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: resolveApiErrorMessage(err, 'Unable to save illness right now.'),
    })
  } finally {
    saving.value = false
  }
}

function confirmDelete(row) {
  if (deletingId.value === row.id) {
    return
  }

  $q.dialog({
    title: 'Mark Illness Inactive',
    message: `Mark "${row.name}" as inactive? It will be hidden from active illness lists.`,
    cancel: true,
    persistent: true,
    ok: {
      label: 'Mark Inactive',
      color: 'negative',
      unelevated: true,
      noCaps: true,
    },
    cancelOptions: {
      flat: true,
      noCaps: true,
    },
  }).onOk(() => {
    deleteIllness(row)
  })
}

async function deleteIllness(row) {
  deletingId.value = row.id
  try {
    const { data } = await api.post(`/hr/illnesses/${row.id}/delete`)
    $q.notify({
      type: 'positive',
      message: data?.message || 'Illness marked inactive successfully.',
    })
    await fetchIllnesses()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: resolveApiErrorMessage(err, 'Unable to mark illness inactive right now.'),
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
</script>
