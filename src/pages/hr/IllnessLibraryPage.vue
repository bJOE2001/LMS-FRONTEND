<template>
  <component :is="embedded ? 'div' : 'q-page'" :class="embedded ? 'illness-library-panel' : 'q-pa-md illness-library-page'">
    <div v-if="!embedded" class="q-mb-lg">
      <div class="row items-center justify-between q-gutter-sm">
        <div>
          <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Illness Library</h1>
          <p class="text-grey-7 q-mb-none">Manage sickness options used in leave applications.</p>
        </div>
        <q-btn
          unelevated
          no-caps
          color="green-9"
          icon="add"
          label="Add Illness"
          class="text-weight-bold q-px-md"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <!-- Unified Toolbar -->
    <DataFilterBar
      v-model:search="search"
      search-class="col-12 col-md-6"
      :debounce="250"
      search-placeholder="Search illnesses..."
    >
      <template #actions>
        <q-badge color="green-1" text-color="green-9" class="q-pa-xs text-weight-bold">
          {{ totalIllnesses }} Total Illnesses
        </q-badge>
        <q-btn
          unelevated
          no-caps
          color="green-9"
          icon="add"
          label="Add Illness"
          class="text-weight-bold q-px-md"
          @click="openCreateDialog"
        />
      </template>
    </DataFilterBar>

    <DataTableCard
      :rows="filteredRows"
      :columns="columns"
      row-key="id"
      dense
      :loading="loading"
      :rows-per-page-options="[10, 20, 50]"
      empty-icon="medical_services"
      no-data-label="No illnesses found."
      loading-text="Loading illnesses..."
      spinner-color="green-9"
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
              color="green-9"
              @click="openEditDialog(props.row)"
            >
              <q-tooltip class="bg-dark text-white">Edit Illness</q-tooltip>
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
              <q-tooltip class="bg-dark text-white">Mark Illness Inactive</q-tooltip>
            </q-btn>
          </q-td>
        </template>
    </DataTableCard>

    <q-dialog v-model="showDialog" persistent>
      <q-card style="width: 95vw; max-width: 520px" class="rounded-borders">
        <q-card-section class="row items-center bg-green-9 text-white q-py-sm">
          <div class="text-subtitle1 text-weight-bold">{{ dialogTitle }}</div>
          <q-space />
          <q-btn icon="close" flat round dense text-color="white" :disable="saving" v-close-popup />
        </q-card-section>

        <q-form ref="formRef" @submit.prevent="saveIllness">
          <q-card-section class="q-pt-md">
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

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn flat no-caps label="Cancel" color="grey-7" :disable="saving" v-close-popup />
            <q-btn
              unelevated
              no-caps
              color="green-9"
              class="text-weight-bold q-px-md"
              :label="dialogMode === 'edit' ? 'Update Illness' : 'Create Illness'"
              :loading="saving"
              type="submit"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </component>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'
import DataFilterBar from 'src/components/common/DataFilterBar.vue'
import DataTableCard from 'src/components/common/DataTableCard.vue'
import { useDataTable } from 'src/composables/useDataTable'

defineProps({
  embedded: {
    type: Boolean,
    default: false,
  },
})

const $q = useQuasar()

const { search, rows, loading } = useDataTable()
const saving = ref(false)
const deletingId = ref(null)

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
