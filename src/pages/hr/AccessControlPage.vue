<template>
  <q-page class="q-pa-md access-control-page">
    <!-- Header Section -->
    <div class="row items-center justify-between q-col-gutter-sm q-mb-md">
      <div class="col-12 col-md-auto">
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs ac-page-title">Access Control</h1>
      </div>

      <div class="col-12 col-md-auto row items-center q-gutter-sm justify-start justify-md-end">
        <q-btn-toggle
          v-model="viewMode"
          no-caps
          unelevated
          toggle-color="primary"
          color="grey-2"
          text-color="grey-8"
          class="ac-view-toggle"
          :options="[
            { label: 'Directory', value: 'directory', icon: 'view_list' },
            { label: 'Matrix', value: 'matrix', icon: 'grid_on' },
          ]"
        />
      </div>
    </div>

    <!-- Interactive KPI Summary Row -->
    <KpiCardsSkeleton
      v-if="loading && accounts.length === 0"
      :count="4"
      variant="dashboard"
      row-class="row q-col-gutter-sm q-mb-md"
    />
    <div
      v-else
      class="row q-col-gutter-sm q-mb-md ac-kpi-row"
      :class="{ 'content-reloading': loading && accounts.length > 0 }"
    >
      <div
        v-for="card in kpiCards"
        :key="card.key"
        class="col-12 col-sm-6 col-md-3"
      >
        <div
          role="button"
          tabindex="0"
          class="ac-kpi-card"
          :class="[`ac-kpi-card--${card.variant}`, { 'is-active': card.active }]"
          :aria-pressed="card.active"
          @click="card.onSelect"
          @keydown.enter.prevent="card.onSelect"
          @keydown.space.prevent="card.onSelect"
        >
          <div class="ac-kpi-card__top">
            <div class="ac-kpi-card__identity">
              <span class="ac-kpi-card__icon-box" aria-hidden="true">
                <q-icon :name="card.icon" size="17px" />
              </span>
              <span class="ac-kpi-card__title">{{ card.label }}</span>
            </div>
            <span class="ac-kpi-card__value tabular-nums">{{ card.value }}</span>
          </div>

          <div class="ac-kpi-card__footer">
            <span class="ac-kpi-card__hint">{{ card.hint }}</span>
            <span v-if="card.active" class="ac-kpi-card__filter-tag">Filtered</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <DataFilterBar
      v-model:search="searchQuery"
      search-class="col-12 col-sm-6 col-md-5"
      search-placeholder="Search by name, @username, or granted module..."
      :show-reset="hasActiveFilters"
      :loading="loading && accounts.length === 0"
      :skeleton-filter-count="2"
      :skeleton-has-action="false"
      @reset="resetFilters"
    >
      <div class="col-6 col-sm-3 col-md-2">
        <q-select
          v-model="filters.role"
          dense
          outlined
          options-dense
          emit-value
          map-options
          :options="roleFilterOptions"
          label="Role"
        />
      </div>

      <div class="col-6 col-sm-3 col-md-3">
        <q-select
          v-model="filters.scope"
          dense
          outlined
          options-dense
          emit-value
          map-options
          :options="scopeFilterOptions"
          label="Permission Scope"
        />
      </div>

      <template #actions>
        <span class="text-caption ac-text-muted tabular-nums" role="status" aria-atomic="true">
          Showing {{ filteredAccounts.length }} of {{ accounts.length }}
        </span>
      </template>
    </DataFilterBar>

    <!-- Directory View -->
    <DataTableCard
      v-if="viewMode === 'directory'"
      v-model:pagination="pagination"
      :rows="filteredAccounts"
      :columns="columns"
      row-key="id"
      :loading="loading"
      :rows-per-page-options="[10, 20, 50]"
      card-class="ac-table-card"
      table-header-class="ac-table-header"
      table-class="ac-table"
      empty-icon="search_off"
      no-data-label="No HR accounts found"
      empty-subtext="No accounts match the active search or filter criteria."
    >
      <template #empty-actions>
        <q-btn
          v-if="hasActiveFilters"
          flat
          dense
          no-caps
          color="primary"
          label="Clear Filters"
          @click="resetFilters"
        />
      </template>

      <!-- Personnel Column -->
      <template #body-cell-full_name="props">
        <q-td :props="props">
          <div class="row items-center no-wrap q-gutter-sm">
            <q-avatar
              size="38px"
              :class="[
                props.row.is_access_control_owner ? 'bg-primary text-white' : 'ac-staff-avatar',
                { 'ac-self-avatar-ring': isCurrentUser(props.row) },
              ]"
              class="text-weight-bold text-caption flex-shrink-0"
            >
              {{ getInitials(props.row.full_name) }}
            </q-avatar>
            <div class="min-width-0">
              <div class="row items-center q-gutter-xs no-wrap">
                <span class="text-weight-bold ac-text-primary text-body2 ellipsis">
                  {{ props.row.full_name || '-' }}
                </span>
                <span v-if="isCurrentUser(props.row)" class="ac-you-pill flex-shrink-0">
                  YOU
                </span>
              </div>
              <div class="text-caption ac-text-muted font-mono">
                @{{ props.row.username || '-' }}
              </div>
            </div>
          </div>
        </q-td>
      </template>

      <!-- Role & Security Column -->
      <template #body-cell-role="props">
        <q-td :props="props" class="text-center">
          <div class="column items-center">
            <span
              class="ac-role-badge"
              :class="props.row.is_access_control_owner ? 'ac-role-badge--owner' : 'ac-role-badge--staff'"
            >
              <q-icon
                :name="props.row.is_access_control_owner ? 'shield' : 'person'"
                size="13px"
                aria-hidden="true"
              />
              {{ props.row.is_access_control_owner ? 'System Owner' : 'HR Staff Admin' }}
            </span>
            <span
              v-if="props.row.is_access_control_owner"
              class="text-caption ac-text-muted q-mt-xs"
              style="font-size: 0.69rem"
            >
              Root Protected
            </span>
          </div>
        </q-td>
      </template>

      <!-- Module Access Column -->
      <template #body-cell-module_keys="props">
        <q-td :props="props" class="ac-modules-cell">
          <!-- Full Access -->
          <div v-if="isFullAccess(props.row)" class="ac-access-summary">
            <div class="row items-center q-gutter-sm no-wrap">
              <button type="button" class="ac-scope-trigger ac-scope-trigger--full">
                <q-icon name="verified_user" size="14px" aria-hidden="true" />
                <span class="tabular-nums">
                  Full Access ({{ moduleKeys.length }}/{{ moduleKeys.length }})
                </span>
                <q-tooltip>Click to inspect all modules</q-tooltip>
                <q-menu anchor="bottom left" self="top left" class="q-pa-md ac-popover">
                  <div class="text-subtitle2 text-weight-bold ac-text-primary q-mb-xs">
                    Full System Permissions ({{ moduleKeys.length }})
                  </div>
                  <div class="text-caption ac-text-muted q-mb-sm">
                    Granted unrestricted access across all HR ALMS modules.
                  </div>
                  <q-separator class="q-mb-sm" />
                  <div class="ac-popover-groups">
                    <div
                      v-for="group in groupAccountModules(props.row.module_keys)"
                      :key="group.id"
                      class="ac-popover-group"
                    >
                      <div class="ac-popover-group__title">{{ group.label }}</div>
                      <div class="row q-gutter-xs">
                        <q-chip
                          v-for="key in group.keys"
                          :key="key"
                          dense
                          size="sm"
                          class="ac-module-chip"
                        >
                          <q-icon :name="getModuleIcon(key)" size="12px" class="q-mr-xs text-primary" aria-hidden="true" />
                          {{ resolveModuleLabel(key) }}
                        </q-chip>
                      </div>
                    </div>
                  </div>
                </q-menu>
              </button>

              <div class="ac-progress-track" aria-hidden="true">
                <div class="ac-progress-fill ac-progress-fill--full" style="width: 100%" />
              </div>
            </div>
          </div>

          <!-- Custom Scoped Access -->
          <div v-else-if="props.row.module_keys.length > 0" class="ac-access-summary">
            <div class="row items-center q-gutter-xs wrap">
              <button type="button" class="ac-scope-trigger ac-scope-trigger--custom">
                <q-icon name="vpn_key" size="13px" aria-hidden="true" />
                <span class="tabular-nums">
                  {{ props.row.module_keys.length }}/{{ moduleKeys.length }}
                </span>
                <q-tooltip>Click to inspect all granted modules</q-tooltip>
                <q-menu anchor="bottom left" self="top left" class="q-pa-md ac-popover">
                  <div class="text-subtitle2 text-weight-bold ac-text-primary q-mb-xs">
                    Granted Permissions ({{ props.row.module_keys.length }})
                  </div>
                  <div class="text-caption ac-text-muted q-mb-sm">
                    Active modules grouped by workflow area.
                  </div>
                  <q-separator class="q-mb-sm" />
                  <div class="ac-popover-groups">
                    <div
                      v-for="group in groupAccountModules(props.row.module_keys)"
                      :key="group.id"
                      class="ac-popover-group"
                    >
                      <div class="ac-popover-group__title">{{ group.label }}</div>
                      <div class="row q-gutter-xs">
                        <q-chip
                          v-for="key in group.keys"
                          :key="key"
                          dense
                          size="sm"
                          class="ac-module-chip"
                        >
                          <q-icon :name="getModuleIcon(key)" size="12px" class="q-mr-xs text-primary" aria-hidden="true" />
                          {{ resolveModuleLabel(key) }}
                        </q-chip>
                      </div>
                    </div>
                  </div>
                </q-menu>
              </button>

              <div class="ac-progress-track" aria-hidden="true">
                <div
                  class="ac-progress-fill ac-progress-fill--custom"
                  :style="{ width: `${getCoveragePercent(props.row)}%` }"
                />
              </div>

              <q-chip
                v-for="key in props.row.module_keys.slice(0, 2)"
                :key="key"
                dense
                size="sm"
                class="ac-module-chip"
              >
                <q-icon :name="getModuleIcon(key)" size="12px" class="q-mr-xs ac-text-muted" aria-hidden="true" />
                {{ resolveModuleLabel(key) }}
              </q-chip>

              <span
                v-if="props.row.module_keys.length > 2"
                class="text-caption text-weight-bold text-primary cursor-pointer q-ml-xs"
              >
                +{{ props.row.module_keys.length - 2 }} more
                <q-menu anchor="bottom left" self="top left" class="q-pa-md ac-popover">
                  <div class="text-subtitle2 text-weight-bold ac-text-primary q-mb-xs">
                    Granted Permissions ({{ props.row.module_keys.length }})
                  </div>
                  <q-separator class="q-mb-sm" />
                  <div class="ac-popover-groups">
                    <div
                      v-for="group in groupAccountModules(props.row.module_keys)"
                      :key="group.id"
                      class="ac-popover-group"
                    >
                      <div class="ac-popover-group__title">{{ group.label }}</div>
                      <div class="row q-gutter-xs">
                        <q-chip
                          v-for="key in group.keys"
                          :key="key"
                          dense
                          size="sm"
                          class="ac-module-chip"
                        >
                          <q-icon :name="getModuleIcon(key)" size="12px" class="q-mr-xs text-primary" aria-hidden="true" />
                          {{ resolveModuleLabel(key) }}
                        </q-chip>
                      </div>
                    </div>
                  </div>
                </q-menu>
              </span>
            </div>
          </div>

          <!-- Zero Access -->
          <div v-else>
            <span class="ac-scope-trigger ac-scope-trigger--none">
              <q-icon name="block" size="13px" aria-hidden="true" />
              No Modules Assigned
            </span>
          </div>
        </q-td>
      </template>

      <!-- Actions Column -->
      <template #body-cell-actions="props">
        <q-td :props="props" class="text-center">
          <q-btn
            v-if="props.row.can_edit_permissions"
            unelevated
            no-caps
            size="sm"
            color="primary"
            icon="tune"
            label="Configure"
            class="rounded-borders q-px-sm text-weight-bold"
            @click="openPermissionDialog(props.row)"
          />
          <q-btn
            v-else
            outline
            no-caps
            size="sm"
            color="grey-7"
            icon="visibility"
            label="View Scope"
            class="rounded-borders q-px-sm text-weight-medium"
            @click="openPermissionDialog(props.row)"
          >
            <q-tooltip>Inspect protected root owner scope</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </DataTableCard>

    <!-- Permission Matrix Comparison View -->
    <q-card v-else flat bordered class="rounded-borders ac-matrix-card">
      <q-card-section v-if="loading && accounts.length === 0" class="q-pa-lg text-center">
        <q-spinner-dots color="primary" size="40px" />
        <div class="text-caption ac-text-muted q-mt-sm">Loading permission matrix...</div>
      </q-card-section>

      <q-card-section v-else-if="filteredAccounts.length === 0" class="q-py-xl text-center">
        <q-icon name="search_off" size="48px" class="ac-text-muted" aria-hidden="true" />
        <div class="text-subtitle2 text-weight-bold ac-text-primary q-mt-sm">
          No HR accounts match current filters
        </div>
        <q-btn
          v-if="hasActiveFilters"
          flat
          dense
          no-caps
          color="primary"
          label="Clear Filters"
          class="q-mt-sm"
          @click="resetFilters"
        />
      </q-card-section>

      <div v-else class="ac-matrix-scroll">
        <table class="ac-matrix-table">
          <thead>
            <tr>
              <th class="ac-matrix-sticky-col ac-matrix-corner">
                <div class="text-caption text-weight-bold ac-text-primary">Module / Permission</div>
                <div class="text-caption ac-text-muted" style="font-size: 0.7rem">
                  Click any staff column to configure
                </div>
              </th>
              <th
                v-for="acc in filteredAccounts"
                :key="acc.id"
                class="ac-matrix-account-th"
              >
                <button
                  type="button"
                  class="ac-matrix-account-btn"
                  @click="openPermissionDialog(acc)"
                >
                  <div class="row items-center justify-center q-gutter-xs no-wrap">
                    <q-avatar
                      size="26px"
                      :class="acc.is_access_control_owner ? 'bg-primary text-white' : 'ac-staff-avatar'"
                      class="text-weight-bold"
                      style="font-size: 0.68rem"
                    >
                      {{ getInitials(acc.full_name) }}
                    </q-avatar>
                    <q-icon
                      v-if="!acc.can_edit_permissions"
                      name="lock"
                      size="13px"
                      color="primary"
                      aria-hidden="true"
                    />
                  </div>
                  <div class="ac-matrix-account-name ellipsis">
                    {{ acc.full_name }}
                  </div>
                  <div class="ac-matrix-account-meta font-mono">
                    @{{ acc.username }} · {{ acc.module_keys.length }}/{{ moduleKeys.length }}
                  </div>
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            <template v-for="category in categorizedModules" :key="category.id">
              <tr class="ac-matrix-category-row">
                <td :colspan="filteredAccounts.length + 1" class="ac-matrix-category-cell">
                  <div class="row items-center q-gutter-xs">
                    <q-icon :name="category.icon" size="15px" :color="category.color" aria-hidden="true" />
                    <span class="text-caption text-weight-bold ac-text-primary">{{ category.label }}</span>
                  </div>
                </td>
              </tr>

              <tr
                v-for="moduleKey in getCategoryKeysForDisplay(category)"
                :key="moduleKey"
                class="ac-matrix-row"
              >
                <td class="ac-matrix-sticky-col ac-matrix-module-td">
                  <div class="row items-center no-wrap q-gutter-xs">
                    <q-icon
                      :name="getModuleIcon(moduleKey)"
                      size="15px"
                      class="ac-text-muted flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span class="text-body2 text-weight-medium ac-text-primary">
                      {{ resolveModuleLabel(moduleKey) }}
                    </span>
                    <span
                      v-if="LEDGER_SUB_PERMISSIONS.includes(moduleKey)"
                      class="ac-matrix-sub-tag"
                    >
                      Ledger
                    </span>
                  </div>
                </td>

                <td
                  v-for="acc in filteredAccounts"
                  :key="`${moduleKey}-${acc.id}`"
                  class="ac-matrix-cell text-center"
                >
                  <span
                    v-if="accountHasModule(acc, moduleKey)"
                    class="ac-matrix-dot ac-matrix-dot--granted"
                    :title="`${acc.full_name}: Granted`"
                  >
                    <q-icon name="check" size="14px" aria-hidden="true" />
                  </span>
                  <span
                    v-else
                    class="ac-matrix-dot ac-matrix-dot--denied"
                    :title="`${acc.full_name}: Not granted`"
                  >
                    —
                  </span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </q-card>

    <!-- Permission Editor / Scope Inspector Dialog -->
    <AccessControlPermissionDialog
      v-model="showEditDialog"
      :account="selectedAccount"
      :module-keys="moduleKeys"
      :module-label-by-key="moduleLabelByKey"
      :is-editing-self="isEditingSelf"
      :saving="saving"
      @save="handleSaveModuleAccess"
    />
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { useAuthStore } from 'stores/auth-store'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'
import DataFilterBar from 'src/components/common/DataFilterBar.vue'
import DataTableCard from 'src/components/common/DataTableCard.vue'
import AccessControlPermissionDialog from 'src/components/hr/AccessControlPermissionDialog.vue'
import { useDataTable } from 'src/composables/useDataTable'
import {
  LEDGER_SUB_PERMISSIONS,
  MODULE_ICONS,
  buildCategorizedModules,
  getCategoryAllKeys,
} from 'src/constants/access-control'

const $q = useQuasar()
const authStore = useAuthStore()

const {
  search: searchQuery,
  filters,
  loading,
  pagination,
  hasActiveFilters,
  resetFilters,
} = useDataTable({
  initialFilters: {
    role: 'all',
    scope: 'all',
  },
  initialPagination: {
    rowsPerPage: 10,
  },
})

const viewMode = ref('directory')
const saving = ref(false)
const showEditDialog = ref(false)
const modules = ref([])
const accounts = ref([])
const selectedAccount = ref(null)

const roleFilterOptions = [
  { label: 'All Roles', value: 'all' },
  { label: 'System Owners', value: 'owner' },
  { label: 'HR Staff Admins', value: 'staff' },
]

const scopeFilterOptions = [
  { label: 'All Scopes', value: 'all' },
  { label: 'Full Access', value: 'full' },
  { label: 'Custom Scoped', value: 'custom' },
  { label: 'No Access (0)', value: 'none' },
]

const columns = [
  { name: 'full_name', label: 'HR Personnel', field: 'full_name', align: 'left', sortable: true },
  { name: 'role', label: 'Role & Security', field: 'is_access_control_owner', align: 'center', sortable: true },
  { name: 'module_keys', label: 'Module Coverage', field: 'module_keys', align: 'left' },
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

const categorizedModules = computed(() => buildCategorizedModules(moduleKeys.value))

const stats = computed(() => {
  const total = accounts.value.length
  const totalModCount = moduleKeys.value.length
  let fullAccess = 0
  let customScope = 0
  let noAccess = 0
  let protectedOwners = 0

  for (const acc of accounts.value) {
    if (acc.is_access_control_owner) {
      protectedOwners++
    }
    const count = acc.module_keys.length
    if (totalModCount > 0 && count >= totalModCount) {
      fullAccess++
    } else if (!acc.is_access_control_owner) {
      customScope++
      if (count === 0) {
        noAccess++
      }
    }
  }

  return { total, fullAccess, customScope, noAccess, protectedOwners }
})

const kpiCards = computed(() => [
  {
    key: 'total',
    label: 'Total HR Accounts',
    value: stats.value.total,
    hint: `${moduleKeys.value.length} configurable modules`,
    icon: 'group',
    variant: 'primary',
    active: filters.role === 'all' && filters.scope === 'all',
    onSelect: () => {
      filters.role = 'all'
      filters.scope = 'all'
    },
  },
  {
    key: 'full',
    label: 'Full Access',
    value: stats.value.fullAccess,
    hint: `All ${moduleKeys.value.length} modules granted`,
    icon: 'verified_user',
    variant: 'green',
    active: filters.scope === 'full',
    onSelect: () => {
      filters.role = 'all'
      filters.scope = filters.scope === 'full' ? 'all' : 'full'
    },
  },
  {
    key: 'custom',
    label: 'Custom Scoped',
    value: stats.value.customScope,
    hint: stats.value.noAccess > 0
      ? `${stats.value.noAccess} with zero modules`
      : 'Partial module scopes',
    icon: 'tune',
    variant: 'amber',
    active: filters.scope === 'custom',
    onSelect: () => {
      filters.role = 'all'
      filters.scope = filters.scope === 'custom' ? 'all' : 'custom'
    },
  },
  {
    key: 'owners',
    label: 'Protected Owners',
    value: stats.value.protectedOwners,
    hint: 'Root access locked',
    icon: 'shield',
    variant: 'slate',
    active: filters.role === 'owner',
    onSelect: () => {
      filters.scope = 'all'
      filters.role = filters.role === 'owner' ? 'all' : 'owner'
    },
  },
])

const filteredAccounts = computed(() => {
  const q = String(searchQuery.value || '').toLowerCase().trim()
  const totalModCount = moduleKeys.value.length

  return accounts.value.filter((account) => {
    if (q) {
      const name = (account.full_name || '').toLowerCase()
      const uname = (account.username || '').toLowerCase()
      const moduleMatch = account.module_keys.some((key) => {
        const label = resolveModuleLabel(key).toLowerCase()
        return label.includes(q) || key.toLowerCase().includes(q)
      })
      if (!name.includes(q) && !uname.includes(q) && !moduleMatch) return false
    }

    if (filters.role === 'owner' && !account.is_access_control_owner) return false
    if (filters.role === 'staff' && account.is_access_control_owner) return false

    const accModCount = account.module_keys.length
    if (filters.scope === 'full' && (totalModCount === 0 || accModCount < totalModCount)) return false
    if (filters.scope === 'custom' && totalModCount > 0 && accModCount >= totalModCount) return false
    if (filters.scope === 'none' && accModCount > 0) return false

    return true
  })
})

const isEditingSelf = computed(
  () => Number(selectedAccount.value?.id) === Number(authStore.user?.id),
)

function isCurrentUser(account) {
  return Number(account?.id) === Number(authStore.user?.id)
}

function isFullAccess(account) {
  return moduleKeys.value.length > 0 && account.module_keys.length >= moduleKeys.value.length
}

function getCoveragePercent(account) {
  if (moduleKeys.value.length === 0) return 0
  return Math.min(100, Math.round((account.module_keys.length / moduleKeys.value.length) * 100))
}

function accountHasModule(account, moduleKey) {
  return Array.isArray(account?.module_keys) && account.module_keys.includes(moduleKey)
}

function getCategoryKeysForDisplay(category) {
  const allowed = new Set(moduleKeys.value)
  return getCategoryAllKeys(category).filter((key) => allowed.has(key))
}

function groupAccountModules(accountKeys = []) {
  const granted = new Set(accountKeys)
  return categorizedModules.value
    .map((category) => ({
      id: category.id,
      label: category.label,
      keys: getCategoryAllKeys(category).filter((key) => granted.has(key)),
    }))
    .filter((group) => group.keys.length > 0)
}

function getInitials(name) {
  if (!name) return 'HR'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function resolveModuleLabel(moduleKey) {
  return moduleLabelByKey.value[moduleKey] || moduleKey
}

function getModuleIcon(moduleKey) {
  return MODULE_ICONS[moduleKey] || 'check_circle'
}

function openPermissionDialog(account) {
  selectedAccount.value = account
  showEditDialog.value = true
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
    await Promise.all([fetchModules(), fetchAccounts()])
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

async function handleSaveModuleAccess(nextModuleKeys) {
  if (!selectedAccount.value?.id) return

  saving.value = true
  try {
    await api.post(`/hr/access-control/hr-admins/${selectedAccount.value.id}/modules`, {
      module_keys: nextModuleKeys,
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
        // Updated permissions remain enforced by backend even if session refresh fails.
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

<style scoped>
.access-control-page {
  max-width: 1400px;
  margin: 0 auto;
}

.ac-page-title {
  color: #0f172a;
}

.ac-text-primary {
  color: #0f172a;
}

.ac-text-muted {
  color: #64748b;
}

.ac-view-toggle {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

/* KPI Cards matching ApplicationKpiCards language */
.ac-kpi-row > div {
  display: flex;
}

.ac-kpi-card {
  --kpi-accent: #2e7d32;
  --kpi-icon-bg: #dcfce7;
  --kpi-icon-fg: #166534;
  --kpi-hover-border: #86efac;

  width: 100%;
  min-height: 88px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    border-color 0.16s ease;
}

.ac-kpi-card:hover {
  transform: translateY(-2px);
  border-color: var(--kpi-hover-border);
  box-shadow: 0 10px 22px -8px rgba(15, 23, 42, 0.12);
}

.ac-kpi-card:focus-visible {
  outline: 2px solid var(--kpi-accent);
  outline-offset: 2px;
}

.ac-kpi-card.is-active {
  border-color: var(--kpi-accent);
  box-shadow: 0 0 0 1px var(--kpi-accent);
}

.ac-kpi-card--green {
  --kpi-accent: #16a34a;
  --kpi-icon-bg: #dcfce7;
  --kpi-icon-fg: #15803d;
  --kpi-hover-border: #86efac;
}

.ac-kpi-card--amber {
  --kpi-accent: #d97706;
  --kpi-icon-bg: #fef3c7;
  --kpi-icon-fg: #b45309;
  --kpi-hover-border: #fcd34d;
}

.ac-kpi-card--slate {
  --kpi-accent: #475569;
  --kpi-icon-bg: #f1f5f9;
  --kpi-icon-fg: #334155;
  --kpi-hover-border: #cbd5e1;
}

.ac-kpi-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ac-kpi-card__identity {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.ac-kpi-card__icon-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--kpi-icon-bg);
  color: var(--kpi-icon-fg);
  flex-shrink: 0;
}

.ac-kpi-card__title {
  font-size: 0.78rem;
  font-weight: 700;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ac-kpi-card__value {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1;
  color: var(--kpi-accent);
}

.ac-kpi-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ac-kpi-card__hint {
  font-size: 0.71rem;
  color: #64748b;
}

.ac-kpi-card__filter-tag {
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 700;
  background: var(--kpi-icon-bg);
  color: var(--kpi-icon-fg);
}

/* Directory Table */
.ac-table-card {
  overflow: hidden;
}

.access-control-page :deep(.ac-table-header th) {
  color: #334155;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: #f8fafc;
}

.ac-staff-avatar {
  background: #e2e8f0;
  color: #334155;
}

.ac-self-avatar-ring {
  box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #2e7d32;
}

.ac-you-pill {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  background: #2e7d32;
  color: #ffffff;
}

.ac-role-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

.ac-role-badge--owner {
  background: #dcfce7;
  color: #166534;
}

.ac-role-badge--staff {
  background: #f1f5f9;
  color: #334155;
}

.ac-modules-cell {
  min-width: 300px;
}

.ac-scope-trigger {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
  background: #f1f5f9;
  color: #334155;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.ac-scope-trigger--full {
  background: #dcfce7;
  color: #166534;
  border-color: #bbf7d0;
}

.ac-scope-trigger--custom {
  background: #eff6ff;
  color: #1d4ed8;
  border-color: #bfdbfe;
}

.ac-scope-trigger--none {
  cursor: default;
  background: #fef2f2;
  color: #b91c1c;
  border-color: #fecaca;
}

.ac-progress-track {
  width: 68px;
  height: 6px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
  flex-shrink: 0;
}

.ac-progress-fill {
  height: 100%;
  border-radius: 999px;
}

.ac-progress-fill--full {
  background: #16a34a;
}

.ac-progress-fill--custom {
  background: #2563eb;
}

.ac-module-chip {
  background: #f1f5f9;
  color: #334155;
  font-weight: 500;
}

.ac-popover {
  max-width: 460px;
  border-radius: 10px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
}

.ac-popover-groups {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 320px;
  overflow-y: auto;
}

.ac-popover-group__title {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  margin-bottom: 4px;
}

/* Permission Matrix View */
.ac-matrix-card {
  overflow: hidden;
  background: #ffffff;
}

.ac-matrix-scroll {
  overflow-x: auto;
}

.ac-matrix-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.ac-matrix-table th,
.ac-matrix-table td {
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #f1f5f9;
  padding: 8px 12px;
}

.ac-matrix-sticky-col {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #ffffff;
  min-width: 260px;
  border-right: 1px solid #cbd5e1 !important;
}

.ac-matrix-corner {
  background: #f8fafc;
  text-align: left;
  z-index: 3;
}

.ac-matrix-account-th {
  background: #f8fafc;
  min-width: 148px;
  vertical-align: middle;
}

.ac-matrix-account-btn {
  width: 100%;
  border: 0;
  background: transparent;
  padding: 4px;
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  transition: background-color 0.15s ease;
}

.ac-matrix-account-btn:hover {
  background: #e2e8f0;
}

.ac-matrix-account-btn:focus-visible {
  outline: 2px solid #2e7d32;
  outline-offset: 2px;
}

.ac-matrix-account-name {
  margin-top: 4px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #0f172a;
  max-width: 140px;
}

.ac-matrix-account-meta {
  font-size: 0.68rem;
  color: #64748b;
}

.ac-matrix-category-row td {
  background: #f8fafc;
  padding: 6px 12px;
}

.ac-matrix-row:hover td {
  background: #f8fafc;
}

.ac-matrix-sub-tag {
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 700;
  background: #e0e7ff;
  color: #3730a3;
}

.ac-matrix-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  font-size: 0.8rem;
}

.ac-matrix-dot--granted {
  background: #dcfce7;
  color: #15803d;
}

.ac-matrix-dot--denied {
  color: #94a3b8;
}

.min-width-0 {
  min-width: 0;
}

/* Dark Mode Parity */
:global(body.body--dark) .ac-page-title,
:global(body.body--dark) .ac-text-primary,
:global(body.body--dark) .ac-kpi-card__title,
:global(body.body--dark) .ac-matrix-account-name {
  color: var(--dm-text-primary, #e6edf5);
}

:global(body.body--dark) .ac-text-muted,
:global(body.body--dark) .ac-kpi-card__hint,
:global(body.body--dark) .ac-popover-group__title,
:global(body.body--dark) .ac-matrix-account-meta {
  color: var(--dm-text-muted, #a4b1c2);
}

:global(body.body--dark) .ac-view-toggle {
  border-color: var(--dm-border, #324258);
}

:global(body.body--dark) .ac-kpi-card {
  background: var(--dm-surface, #1b2330);
  border-color: var(--dm-border, #324258);
  box-shadow: none;
}

:global(body.body--dark) .ac-kpi-card:hover {
  background: var(--dm-surface-2, #212b3a);
}

:global(body.body--dark) .ac-kpi-card__icon-box {
  background: var(--dm-surface-3, #283446);
  color: var(--dm-text-secondary, #cad5e4);
}

:global(body.body--dark) .ac-kpi-card__value {
  color: var(--dm-text-primary, #e6edf5);
}

:global(body.body--dark) .access-control-page :deep(.ac-table-header th) {
  background: var(--dm-surface-2, #212b3a);
  color: var(--dm-text-secondary, #cad5e4);
}

:global(body.body--dark) .ac-staff-avatar,
:global(body.body--dark) .ac-role-badge--staff,
:global(body.body--dark) .ac-module-chip {
  background: var(--dm-surface-3, #283446);
  color: var(--dm-text-secondary, #cad5e4);
}

:global(body.body--dark) .ac-role-badge--owner,
:global(body.body--dark) .ac-scope-trigger--full,
:global(body.body--dark) .ac-matrix-dot--granted {
  background: rgba(34, 197, 94, 0.18);
  border-color: rgba(74, 222, 128, 0.35);
  color: #86efac;
}

:global(body.body--dark) .ac-scope-trigger--custom {
  background: rgba(59, 130, 246, 0.18);
  border-color: rgba(96, 165, 250, 0.35);
  color: #93c5fd;
}

:global(body.body--dark) .ac-scope-trigger--none {
  background: rgba(239, 68, 68, 0.18);
  border-color: rgba(248, 113, 113, 0.35);
  color: #fca5a5;
}

:global(body.body--dark) .ac-progress-track {
  background: var(--dm-surface-3, #283446);
}

:global(body.body--dark) .ac-matrix-card,
:global(body.body--dark) .ac-matrix-sticky-col {
  background: var(--dm-surface, #1b2330);
}

:global(body.body--dark) .ac-matrix-corner,
:global(body.body--dark) .ac-matrix-account-th,
:global(body.body--dark) .ac-matrix-category-row td {
  background: var(--dm-surface-2, #212b3a);
}

:global(body.body--dark) .ac-matrix-table th,
:global(body.body--dark) .ac-matrix-table td {
  border-color: var(--dm-border, #324258);
}

:global(body.body--dark) .ac-matrix-sticky-col {
  border-right-color: var(--dm-border, #324258) !important;
}

:global(body.body--dark) .ac-matrix-row:hover td,
:global(body.body--dark) .ac-matrix-account-btn:hover {
  background: var(--dm-surface-3, #283446);
}

:global(body.body--dark) .ac-matrix-sub-tag {
  background: rgba(99, 102, 241, 0.22);
  color: #c7d2fe;
}

@media (prefers-reduced-motion: reduce) {
  .ac-kpi-card,
  .ac-scope-trigger,
  .ac-matrix-account-btn {
    transition: none;
  }

  .ac-kpi-card:hover {
    transform: none;
  }
}
</style>
