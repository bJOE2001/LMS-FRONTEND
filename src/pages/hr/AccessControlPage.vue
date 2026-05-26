<template>
  <q-page class="q-pa-md">
    <div class="q-mb-lg">
      <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Access Control</h1>
    </div>

    <q-card flat bordered class="rounded-borders">
      <q-table
        :rows="accounts"
        :columns="columns"
        row-key="id"
        flat
        :loading="loading"
      >
        <template #body-cell-full_name="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.full_name || '-' }}</div>
            <div class="text-caption text-grey-7">{{ props.row.username || '-' }}</div>
          </q-td>
        </template>

        <template #body-cell-role="props">
          <q-td :props="props" class="text-center">
            <q-badge
              v-if="props.row.is_access_control_owner"
              color="primary"
              label="HR Admin"
              rounded
            />
            <q-badge
              v-else
              color="grey-7"
              text-color="white"
              label="Staff"
              rounded
            />
          </q-td>
        </template>

        <template #body-cell-module_keys="props">
          <q-td :props="props">
            <div class="row q-col-gutter-xs">
              <div
                v-for="moduleKey in props.row.module_keys"
                :key="`${props.row.id}-${moduleKey}`"
                class="col-auto"
              >
                <q-chip dense size="sm" color="grey-3" text-color="grey-9">
                  {{ resolveModuleLabel(moduleKey) }}
                </q-chip>
              </div>
            </div>
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
              :disable="!props.row.can_edit_permissions"
              @click="openEditDialog(props.row)"
            >
              <q-tooltip>
                {{ props.row.can_edit_permissions ? 'Edit module access' : 'Seed owner access cannot be edited' }}
              </q-tooltip>
            </q-btn>
          </q-td>
        </template>

      </q-table>
    </q-card>

    <q-dialog v-model="showEditDialog" persistent>
      <q-card style="width: 96vw; max-width: 680px" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Edit Module Access</div>
          <q-space />
          <q-btn icon="close" flat round dense :disable="saving" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-sm">
          <div class="text-subtitle2 text-weight-medium">{{ selectedAccount?.full_name || '-' }}</div>
          <div class="text-caption text-grey-7 q-mb-md">{{ selectedAccount?.username || '-' }}</div>

          <div class="row items-center justify-between q-mb-sm">
            <q-checkbox
              :model-value="allModulesSelected"
              :indeterminate="partiallySelected"
              color="primary"
              label="Select All Modules"
              :disable="saving || moduleKeys.length === 0"
              @update:model-value="toggleSelectAll"
            />
            <div class="text-caption text-grey-7">
              {{ selectedModuleCount }} of {{ moduleKeys.length }} selected
            </div>
          </div>

          <q-list bordered separator class="rounded-borders">
            <q-item v-for="module in modules" :key="module.key" tag="label" clickable>
              <q-item-section avatar>
                <q-checkbox
                  v-model="selectedModuleKeys"
                  :val="module.key"
                  color="primary"
                  :disable="saving"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ module.label }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" :disable="saving" v-close-popup />
          <q-btn
            unelevated
            color="primary"
            icon="save"
            label="Save Access"
            :loading="saving"
            @click="saveModuleAccess"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { useAuthStore } from 'stores/auth-store'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const $q = useQuasar()
const authStore = useAuthStore()

const loading = ref(false)
const saving = ref(false)
const showEditDialog = ref(false)
const modules = ref([])
const accounts = ref([])
const selectedAccount = ref(null)
const selectedModuleKeys = ref([])

const columns = [
  { name: 'full_name', label: 'HR Admin', field: 'full_name', align: 'left', sortable: true },
  { name: 'role', label: 'Role', field: 'is_access_control_owner', align: 'center' },
  { name: 'module_keys', label: 'Module Access', field: 'module_keys', align: 'left' },
  { name: 'actions', label: 'Action', field: 'actions', align: 'center' },
]

const moduleLabelByKey = computed(() =>
  modules.value.reduce((carry, moduleEntry) => {
    const key = String(moduleEntry?.key || '').trim()
    if (key) {
      carry[key] = moduleEntry?.label || key
    }
    return carry
  }, {}),
)

const moduleKeys = computed(() =>
  modules.value
    .map((moduleEntry) => String(moduleEntry?.key || '').trim())
    .filter((moduleKey) => moduleKey !== ''),
)

const selectedModuleCount = computed(() => {
  const selectedKeySet = new Set(
    selectedModuleKeys.value
      .map((moduleKey) => String(moduleKey || '').trim())
      .filter((moduleKey) => moduleKey !== ''),
  )

  return moduleKeys.value.filter((moduleKey) => selectedKeySet.has(moduleKey)).length
})

const allModulesSelected = computed(() =>
  moduleKeys.value.length > 0 && selectedModuleCount.value === moduleKeys.value.length,
)

const partiallySelected = computed(() =>
  selectedModuleCount.value > 0 && !allModulesSelected.value,
)

function resolveModuleLabel(moduleKey) {
  return moduleLabelByKey.value[moduleKey] || moduleKey
}

function openEditDialog(account) {
  selectedAccount.value = account
  const allowedModuleKeys = new Set(moduleKeys.value)
  selectedModuleKeys.value = Array.isArray(account?.module_keys)
    ? account.module_keys
        .map((moduleKey) => String(moduleKey || '').trim())
        .filter((moduleKey) => moduleKey !== '' && allowedModuleKeys.has(moduleKey))
    : []
  showEditDialog.value = true
}

function toggleSelectAll(checked) {
  selectedModuleKeys.value = checked ? [...moduleKeys.value] : []
}

async function fetchModules() {
  const { data } = await api.get('/hr/access-control/modules')
  modules.value = Array.isArray(data?.modules) ? data.modules : []
}

async function fetchAccounts() {
  const { data } = await api.get('/hr/access-control/hr-admins')
  accounts.value = Array.isArray(data?.accounts)
    ? data.accounts.map((account) => ({
        ...account,
        module_keys: Array.isArray(account?.module_keys) ? account.module_keys : [],
      }))
    : []
}

async function loadAccessControlData() {
  loading.value = true
  try {
    await Promise.all([
      fetchModules(),
      fetchAccounts(),
    ])
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: resolveApiErrorMessage(err, 'Unable to load access control data.'),
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}

async function saveModuleAccess() {
  if (!selectedAccount.value?.id) return

  saving.value = true
  try {
    await api.put(`/hr/access-control/hr-admins/${selectedAccount.value.id}/modules`, {
      module_keys: selectedModuleKeys.value,
    })
    $q.notify({
      type: 'positive',
      message: 'HR module access updated successfully.',
      position: 'top',
    })

    if (Number(selectedAccount.value.id) === Number(authStore.user?.id)) {
      try {
        const { data } = await api.get('/me')
        if (data?.user) {
          authStore.setAuth({ token: authStore.getToken(), user: data.user })
        }
      } catch {
        // The updated access will still be enforced by backend even if refresh fails.
      }
    }

    showEditDialog.value = false
    await fetchAccounts()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: resolveApiErrorMessage(err, 'Unable to update HR module access.'),
      position: 'top',
    })
  } finally {
    saving.value = false
  }
}

onMounted(loadAccessControlData)
</script>
