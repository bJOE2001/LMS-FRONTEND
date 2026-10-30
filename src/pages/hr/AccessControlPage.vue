<template>
  <q-page class="q-pa-lg access-control-page">
    <!-- Header Section -->
    <div class="row items-center justify-between q-mb-lg page-header-row">
      <div>
        <div class="row items-center q-gutter-sm">
          <q-icon name="security" size="32px" color="primary" />
          <h1 class="text-h4 text-weight-bold q-my-none text-grey-9">Access Control</h1>
        </div>
        <p class="text-subtitle2 text-grey-7 q-mb-none q-mt-xs">
          Manage system privileges, module boundaries, and permission scopes for HR personnel.
        </p>
      </div>

      <div class="row items-center q-gutter-sm">
        <q-btn
          outline
          color="primary"
          icon="refresh"
          label="Refresh"
          :loading="loading"
          @click="loadAccessControlData"
          class="rounded-borders"
        >
          <q-tooltip>Reload accounts and permissions from server</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- Top KPI Metrics Row -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card rounded-borders">
          <q-card-section class="row items-center no-wrap">
            <div class="kpi-avatar bg-blue-1 text-primary q-mr-md">
              <q-icon name="group" size="24px" />
            </div>
            <div>
              <div class="text-caption text-weight-medium text-grey-7">Total HR Accounts</div>
              <div class="text-h5 text-weight-bolder text-grey-9">{{ stats.total }}</div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card rounded-borders">
          <q-card-section class="row items-center no-wrap">
            <div class="kpi-avatar bg-positive-1 text-positive q-mr-md">
              <q-icon name="verified_user" size="24px" />
            </div>
            <div>
              <div class="text-caption text-weight-medium text-grey-7">Full Access Admins</div>
              <div class="text-h5 text-weight-bolder text-positive">{{ stats.fullAccess }}</div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card rounded-borders">
          <q-card-section class="row items-center no-wrap">
            <div class="kpi-avatar bg-amber-1 text-amber-9 q-mr-md">
              <q-icon name="tune" size="24px" />
            </div>
            <div>
              <div class="text-caption text-weight-medium text-grey-7">Custom Scoped Staff</div>
              <div class="text-h5 text-weight-bolder text-amber-9">{{ stats.customScope }}</div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="kpi-card rounded-borders">
          <q-card-section class="row items-center no-wrap">
            <div class="kpi-avatar bg-purple-1 text-purple-9 q-mr-md">
              <q-icon name="shield" size="24px" />
            </div>
            <div>
              <div class="text-caption text-weight-medium text-grey-7">Protected Owners</div>
              <div class="text-h5 text-weight-bolder text-purple-9">{{ stats.protectedOwners }}</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <q-card flat bordered class="rounded-borders q-mb-md filter-toolbar">
      <q-card-section class="q-py-sm">
        <div class="row items-center q-col-gutter-sm">
          <!-- Search box -->
          <div class="col-12 col-sm-6 col-md-4">
            <q-input
              v-model="searchQuery"
              dense
              outlined
              placeholder="Search by name or username..."
              clearable
              class="bg-white"
            >
              <template #prepend>
                <q-icon name="search" size="20px" color="grey-6" />
              </template>
            </q-input>
          </div>

          <!-- Role Filter -->
          <div class="col-6 col-sm-3 col-md-3">
            <q-select
              v-model="roleFilter"
              dense
              outlined
              emit-value
              map-options
              :options="roleFilterOptions"
              label="Role"
              class="bg-white"
            />
          </div>

          <!-- Scope Filter -->
          <div class="col-6 col-sm-3 col-md-3">
            <q-select
              v-model="scopeFilter"
              dense
              outlined
              emit-value
              map-options
              :options="scopeFilterOptions"
              label="Scope"
              class="bg-white"
            />
          </div>

          <!-- Filter Summary / Reset -->
          <div class="col-12 col-md-2 text-right">
            <q-btn
              v-if="hasActiveFilters"
              flat
              dense
              color="grey-7"
              icon="clear_all"
              label="Reset Filters"
              @click="resetFilters"
            />
            <div v-else class="text-caption text-grey-6 text-right">
              Showing {{ filteredAccounts.length }} of {{ accounts.length }}
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Main Accounts Table -->
    <q-card flat bordered class="rounded-borders main-table-card">
      <q-table
        :rows="filteredAccounts"
        :columns="columns"
        row-key="id"
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 10 }"
        class="access-table"
      >
        <!-- Personnel Column -->
        <template #body-cell-full_name="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <q-avatar
                size="38px"
                :class="props.row.is_access_control_owner ? 'bg-primary text-white' : 'bg-grey-3 text-grey-8'"
                class="text-weight-bold text-caption q-mr-sm shadow-1"
              >
                {{ getInitials(props.row.full_name) }}
              </q-avatar>
              <div>
                <div class="row items-center q-gutter-xs">
                  <span class="text-weight-bold text-grey-9 text-body2">
                    {{ props.row.full_name || '-' }}
                  </span>
                  <q-badge
                    v-if="isCurrentUser(props.row)"
                    color="primary"
                    text-color="white"
                    rounded
                    class="q-px-xs text-caption text-weight-bolder"
                  >
                    YOU
                  </q-badge>
                </div>
                <div class="text-caption text-grey-6">@{{ props.row.username || '-' }}</div>
              </div>
            </div>
          </q-td>
        </template>

        <!-- Role Column -->
        <template #body-cell-role="props">
          <q-td :props="props" class="text-center">
            <div v-if="props.row.is_access_control_owner">
              <q-badge color="primary" class="q-py-xs q-px-sm text-weight-bold shadow-1">
                <q-icon name="shield" size="13px" class="q-mr-xs" />
                System Owner
              </q-badge>
              <div class="text-caption text-grey-6 text-italic q-mt-xs" style="font-size: 0.68rem">
                Root Protected
              </div>
            </div>
            <div v-else>
              <q-badge color="grey-2" text-color="grey-9" class="q-py-xs q-px-sm text-weight-medium">
                <q-icon name="person" size="13px" class="q-mr-xs text-grey-7" />
                HR Staff Admin
              </q-badge>
            </div>
          </q-td>
        </template>

        <!-- Module Access Column -->
        <template #body-cell-module_keys="props">
          <q-td :props="props">
            <!-- Full Access State -->
            <div
              v-if="props.row.module_keys?.length >= moduleKeys.length"
              class="row items-center q-gutter-xs"
            >
              <q-badge
                color="positive"
                class="q-py-xs q-px-sm text-weight-bold cursor-pointer hover-scale"
              >
                <q-icon name="verified_user" size="14px" class="q-mr-xs" />
                Full Access ({{ moduleKeys.length }}/{{ moduleKeys.length }} Modules)
                <q-tooltip class="bg-grey-9 text-caption">Click to inspect module breakdown</q-tooltip>
              </q-badge>

              <q-menu anchor="bottom left" self="top left" class="q-pa-md permissions-popover">
                <div class="text-subtitle2 text-weight-bold text-grey-9 q-mb-xs">
                  Full System Permissions ({{ moduleKeys.length }})
                </div>
                <div class="text-caption text-grey-6 q-mb-sm">
                  Granted unrestricted access to all HR ALMS modules.
                </div>
                <q-separator class="q-mb-sm" />
                <div class="row q-col-gutter-xs" style="max-width: 440px">
                  <div v-for="key in props.row.module_keys" :key="key" class="col-auto">
                    <q-chip dense size="xs" color="positive-1" text-color="positive" class="text-weight-medium">
                      <q-icon :name="getModuleIcon(key)" size="11px" class="q-mr-xs" />
                      {{ resolveModuleLabel(key) }}
                    </q-chip>
                  </div>
                </div>
              </q-menu>
            </div>

            <!-- Custom / Scoped Access State -->
            <div
              v-else-if="props.row.module_keys?.length > 0"
              class="row items-center q-gutter-xs"
            >
              <q-badge
                color="primary"
                outline
                class="q-py-xs q-px-sm text-weight-bold cursor-pointer"
              >
                <q-icon name="vpn_key" size="12px" class="q-mr-xs" />
                {{ props.row.module_keys.length }} of {{ moduleKeys.length }} Modules
                <q-tooltip class="bg-grey-9 text-caption">Click to view all granted modules</q-tooltip>
              </q-badge>

              <!-- Prominent module chips (up to 2) -->
              <q-chip
                v-for="key in props.row.module_keys.slice(0, 2)"
                :key="key"
                dense
                size="sm"
                color="grey-2"
                text-color="grey-8"
              >
                <q-icon :name="getModuleIcon(key)" size="12px" class="q-mr-xs text-grey-6" />
                {{ resolveModuleLabel(key) }}
              </q-chip>

              <!-- "+X more" chip with popover -->
              <q-chip
                v-if="props.row.module_keys.length > 2"
                dense
                size="sm"
                color="blue-1"
                text-color="primary"
                class="cursor-pointer text-weight-bold"
              >
                +{{ props.row.module_keys.length - 2 }} more
              </q-chip>

              <!-- Popover detailing all modules -->
              <q-menu anchor="bottom left" self="top left" class="q-pa-md permissions-popover">
                <div class="text-subtitle2 text-weight-bold text-grey-9 q-mb-xs">
                  Active Permissions ({{ props.row.module_keys.length }})
                </div>
                <div class="text-caption text-grey-6 q-mb-sm">
                  Specific modules assigned to this user.
                </div>
                <q-separator class="q-mb-sm" />
                <div class="row q-col-gutter-xs" style="max-width: 420px">
                  <div v-for="key in props.row.module_keys" :key="key" class="col-auto">
                    <q-chip dense size="xs" color="grey-2" text-color="grey-9">
                      <q-icon :name="getModuleIcon(key)" size="11px" class="q-mr-xs text-primary" />
                      {{ resolveModuleLabel(key) }}
                    </q-chip>
                  </div>
                </div>
              </q-menu>
            </div>

            <!-- Zero Access State -->
            <div v-else>
              <q-badge color="negative" outline class="q-py-xs q-px-sm">
                <q-icon name="block" size="12px" class="q-mr-xs" />
                No Modules Assigned
              </q-badge>
            </div>
          </q-td>
        </template>

        <!-- Actions Column -->
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <q-btn
              v-if="props.row.can_edit_permissions"
              unelevated
              size="sm"
              color="primary"
              icon="tune"
              label="Edit Access"
              class="rounded-borders q-px-sm action-edit-btn"
              @click="openEditDialog(props.row)"
            />
            <q-btn
              v-else
              flat
              dense
              round
              icon="lock"
              color="grey-5"
              disable
            >
              <q-tooltip class="bg-grey-9 text-caption">
                Root system owner access is protected and cannot be modified.
              </q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <!-- No Data State -->
        <template #no-data>
          <div class="full-width text-center q-pa-xl text-grey-6">
            <q-icon name="search_off" size="48px" class="q-mb-sm text-grey-4" />
            <div class="text-subtitle1 text-weight-medium">No HR Accounts Found</div>
            <div class="text-caption text-grey-5 q-mb-md">
              No accounts match the current filter criteria.
            </div>
            <q-btn
              v-if="hasActiveFilters"
              flat
              dense
              color="primary"
              label="Clear Filters"
              @click="resetFilters"
            />
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Polished Edit Module Access Dialog -->
    <q-dialog v-model="showEditDialog" persistent transition-show="scale" transition-hide="scale">
      <q-card style="width: 780px; max-width: 96vw" class="rounded-borders dialog-card">
        <!-- Dialog Header -->
        <q-card-section class="row items-center q-pb-sm border-bottom bg-grey-1">
          <div class="row items-center q-gutter-sm">
            <q-avatar
              size="42px"
              class="bg-primary text-white text-weight-bold shadow-1"
            >
              {{ getInitials(selectedAccount?.full_name) }}
            </q-avatar>
            <div>
              <div class="row items-center q-gutter-xs">
                <span class="text-h6 text-weight-bold text-grey-9">
                  {{ selectedAccount?.full_name || '-' }}
                </span>
                <q-badge color="primary" outline rounded class="q-px-xs text-caption">
                  {{ selectedAccount?.is_access_control_owner ? 'System Owner' : 'HR Staff' }}
                </q-badge>
              </div>
              <div class="text-caption text-grey-6">@{{ selectedAccount?.username || '-' }}</div>
            </div>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense :disable="saving" v-close-popup />
        </q-card-section>

        <!-- Self-Edit Alert Banner -->
        <q-banner
          v-if="isEditingSelf"
          dense
          rounded
          class="bg-blue-1 text-blue-10 q-mx-md q-mt-md"
        >
          <template #avatar>
            <q-icon name="info" color="primary" />
          </template>
          <div class="text-caption">
            <strong>Notice:</strong> You are editing your own permissions. Changes will immediately take effect and refresh your active session upon saving.
          </div>
        </q-banner>

        <!-- Quick Presets & Global Select Toolbar -->
        <q-card-section class="q-pt-md q-pb-xs">
          <div class="row items-center justify-between q-col-gutter-sm">
            <!-- Global Select All -->
            <div>
              <q-checkbox
                :model-value="allModulesSelected"
                :indeterminate="partiallySelected"
                color="primary"
                label="Select All Modules"
                class="text-weight-bold"
                :disable="saving || moduleKeys.length === 0"
                @update:model-value="toggleSelectAll"
              />
              <span class="text-caption text-grey-7 q-ml-xs">
                ({{ selectedModuleCount }} of {{ moduleKeys.length }} granted)
              </span>
            </div>

            <!-- Quick Preset Buttons -->
            <div class="row items-center q-gutter-xs">
              <span class="text-caption text-grey-6 q-mr-xs">Presets:</span>
              <q-btn
                dense
                flat
                size="sm"
                color="primary"
                label="Leave Specialist"
                :disable="saving"
                @click="applyPreset('leave_specialist')"
              >
                <q-tooltip>Select core Leave processing modules</q-tooltip>
              </q-btn>
              <q-btn
                dense
                flat
                size="sm"
                color="indigo"
                label="Employee & Ledger"
                :disable="saving"
                @click="applyPreset('employee_ledger')"
              >
                <q-tooltip>Select Employee management and all ledger permissions</q-tooltip>
              </q-btn>
              <q-btn
                dense
                flat
                size="sm"
                color="grey-7"
                label="Clear All"
                :disable="saving"
                @click="applyPreset('clear')"
              />
            </div>
          </div>
        </q-card-section>

        <!-- Categorized Permission Groups -->
        <q-card-section class="scroll modal-scroll-area q-pt-none" style="max-height: 60vh">
          <div class="q-gutter-y-md q-mt-xs">
            <!-- Iterate over Categories -->
            <q-card
              v-for="category in MODULE_CATEGORIES"
              :key="category.id"
              flat
              bordered
              class="category-group-card rounded-borders"
            >
              <!-- Category Header -->
              <div class="category-header row items-center justify-between q-px-md q-py-sm bg-grey-1 border-bottom">
                <div class="row items-center q-gutter-sm">
                  <q-icon :name="category.icon" size="20px" :color="category.color" />
                  <div>
                    <span class="text-subtitle2 text-weight-bold text-grey-9">
                      {{ category.label }}
                    </span>
                    <span class="text-caption text-grey-6 q-ml-sm">
                      ({{ getCategorySelectedCount(category) }} of {{ getCategoryTotalCount(category) }})
                    </span>
                  </div>
                </div>

                <q-btn
                  dense
                  flat
                  size="xs"
                  color="primary"
                  :label="isCategoryFullySelected(category) ? 'Deselect Section' : 'Select Section'"
                  :disable="saving"
                  @click="toggleCategory(category, !isCategoryFullySelected(category))"
                />
              </div>

              <!-- Category Module Items -->
              <div class="q-pa-sm">
                <!-- Standard Modules List -->
                <div v-if="category.keys" class="row q-col-gutter-xs">
                  <div
                    v-for="moduleKey in category.keys"
                    :key="moduleKey"
                    class="col-12 col-md-6"
                  >
                    <q-item
                      tag="label"
                      clickable
                      v-ripple
                      dense
                      class="module-item rounded-borders"
                      :class="{ 'module-item-selected': selectedModuleKeys.includes(moduleKey) }"
                    >
                      <q-item-section avatar class="q-pr-none" style="min-width: 36px">
                        <q-checkbox
                          v-model="selectedModuleKeys"
                          :val="moduleKey"
                          color="primary"
                          dense
                          :disable="saving"
                        />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="text-weight-medium text-grey-9">
                          <q-icon :name="getModuleIcon(moduleKey)" size="16px" class="q-mr-xs text-grey-7" />
                          {{ resolveModuleLabel(moduleKey) }}
                        </q-item-label>
                        <q-item-label caption class="text-grey-6">
                          {{ getModuleDescription(moduleKey) }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </div>
                </div>

                <!-- Special Layout for Employee & Ledger Category -->
                <div v-if="category.mainKey" class="q-gutter-y-sm">
                  <!-- Main Employee Management Module -->
                  <q-item
                    tag="label"
                    clickable
                    v-ripple
                    dense
                    class="module-item rounded-borders"
                    :class="{ 'module-item-selected': selectedModuleKeys.includes(category.mainKey) }"
                  >
                    <q-item-section avatar class="q-pr-none" style="min-width: 36px">
                      <q-checkbox
                        v-model="selectedModuleKeys"
                        :val="category.mainKey"
                        color="primary"
                        dense
                        :disable="saving"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-weight-bold text-grey-9">
                        <q-icon :name="getModuleIcon(category.mainKey)" size="16px" class="q-mr-xs text-primary" />
                        {{ resolveModuleLabel(category.mainKey) }}
                        <q-badge color="primary" outline class="q-ml-sm text-caption">Core Module</q-badge>
                      </q-item-label>
                      <q-item-label caption class="text-grey-6">
                        {{ getModuleDescription(category.mainKey) }}
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <!-- Nested Ledger Sub-permissions Box -->
                  <div class="ledger-sub-box rounded-borders q-pa-sm q-ml-md">
                    <div class="row items-center justify-between q-mb-xs q-px-xs">
                      <div class="text-caption text-weight-bold text-indigo-9 row items-center">
                        <q-icon name="subdirectory_arrow_right" size="16px" class="q-mr-xs" />
                        Granular Leave Ledger Privileges
                      </div>
                      <div class="text-caption text-grey-6" style="font-size: 0.72rem">
                        Requires Employee Management
                      </div>
                    </div>

                    <div class="row q-col-gutter-xs">
                      <div
                        v-for="subKey in category.subKeys"
                        :key="subKey"
                        class="col-12 col-md-6"
                      >
                        <q-item
                          tag="label"
                          clickable
                          v-ripple
                          dense
                          class="module-item ledger-item rounded-borders"
                          :class="{
                            'module-item-selected': selectedModuleKeys.includes(subKey),
                            'text-grey-5': !selectedModuleKeys.includes(category.mainKey),
                          }"
                        >
                          <q-item-section avatar class="q-pr-none" style="min-width: 36px">
                            <q-checkbox
                              v-model="selectedModuleKeys"
                              :val="subKey"
                              color="indigo"
                              dense
                              :disable="saving"
                            />
                          </q-item-section>
                          <q-item-section>
                            <q-item-label class="text-weight-medium text-grey-9">
                              <q-icon :name="getModuleIcon(subKey)" size="15px" class="q-mr-xs text-indigo-7" />
                              {{ resolveModuleLabel(subKey) }}
                            </q-item-label>
                            <q-item-label caption class="text-grey-6">
                              {{ getModuleDescription(subKey) }}
                            </q-item-label>
                          </q-item-section>
                        </q-item>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </q-card>
          </div>
        </q-card-section>

        <!-- Dialog Footer with Changes Diff Summary -->
        <q-card-actions class="q-px-lg q-py-md border-top bg-grey-1 row items-center justify-between">
          <div>
            <div v-if="changeSummary.hasChanges" class="row items-center q-gutter-xs">
              <span class="text-caption text-weight-medium text-grey-8">Changes:</span>
              <q-badge v-if="changeSummary.addedCount > 0" color="positive" class="text-weight-bold">
                +{{ changeSummary.addedCount }} to grant
              </q-badge>
              <q-badge v-if="changeSummary.removedCount > 0" color="negative" class="text-weight-bold">
                -{{ changeSummary.removedCount }} to revoke
              </q-badge>
            </div>
            <div v-else class="text-caption text-grey-6">
              No permission changes made
            </div>
          </div>

          <div class="row items-center q-gutter-sm">
            <q-btn flat label="Cancel" :disable="saving" v-close-popup class="text-weight-medium" />
            <q-btn
              unelevated
              color="primary"
              icon="save"
              label="Save Access"
              :loading="saving"
              class="rounded-borders q-px-md text-weight-bold"
              @click="saveModuleAccess"
            />
          </div>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
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
const initialModuleKeys = ref([])

// Filtering state
const searchQuery = ref('')
const roleFilter = ref('all')
const scopeFilter = ref('all')

const roleFilterOptions = [
  { label: 'All Roles', value: 'all' },
  { label: 'System Owners', value: 'owner' },
  { label: 'HR Staff Admins', value: 'staff' },
]

const scopeFilterOptions = [
  { label: 'All Scopes', value: 'all' },
  { label: 'Full Access (All)', value: 'full' },
  { label: 'Custom Scope Only', value: 'custom' },
]

const columns = [
  { name: 'full_name', label: 'HR Personnel', field: 'full_name', align: 'left', sortable: true },
  { name: 'role', label: 'Role & Security', field: 'is_access_control_owner', align: 'center', sortable: true },
  { name: 'module_keys', label: 'Module Access', field: 'module_keys', align: 'left' },
  { name: 'actions', label: 'Action', field: 'actions', align: 'center' },
]

// Category Definitions matching LMS architecture
const MODULE_CATEGORIES = [
  {
    id: 'overview',
    label: 'Overview & Analytics',
    icon: 'dashboard',
    color: 'teal-7',
    keys: ['dashboard'],
  },
  {
    id: 'leave',
    label: 'Leave Management Workflow',
    icon: 'assignment',
    color: 'primary',
    keys: ['applications', 'receiving', 'releasing', 'cancelled_applications', 'coc_applications'],
  },
  {
    id: 'employee_ledger',
    label: 'Employee & Leave Ledger Controls',
    icon: 'people_alt',
    color: 'indigo-7',
    mainKey: 'employee_management',
    subKeys: [
      'ledger_restore_edit',
      'ledger_restore_delete',
      'ledger_late_deduction_edit',
      'ledger_late_deduction_delete',
      'ledger_accrual_edit',
    ],
  },
  {
    id: 'admin',
    label: 'System Administration',
    icon: 'admin_panel_settings',
    color: 'deep-purple-7',
    keys: ['user_management', 'reports_monitoring', 'access_control'],
  },
  {
    id: 'libraries',
    label: 'Libraries & Scheduling Settings',
    icon: 'tune',
    color: 'amber-9',
    keys: ['office_library', 'leave_types', 'illness_library', 'work_schedules', 'signatories'],
  },
]

const MODULE_ICONS = {
  dashboard: 'space_dashboard',
  applications: 'description',
  receiving: 'move_to_inbox',
  releasing: 'outbox',
  cancelled_applications: 'cancel',
  coc_applications: 'schedule',
  employee_management: 'badge',
  ledger_restore_edit: 'edit_note',
  ledger_restore_delete: 'delete_sweep',
  ledger_late_deduction_edit: 'schedule_send',
  ledger_late_deduction_delete: 'remove_done',
  ledger_accrual_edit: 'trending_up',
  user_management: 'manage_accounts',
  reports_monitoring: 'insights',
  access_control: 'security',
  office_library: 'apartment',
  leave_types: 'category',
  illness_library: 'medical_services',
  work_schedules: 'event_repeat',
  signatories: 'draw',
}

const MODULE_DESCRIPTIONS = {
  dashboard: 'Access to HR analytics dashboard overview and calendar.',
  applications: 'Review and process employee leave applications.',
  receiving: 'Receive and log incoming application routing documents.',
  releasing: 'Approve and release processed leave records.',
  cancelled_applications: 'Review and manage cancelled or revoked filings.',
  coc_applications: 'Manage Certificate of Overtime Credit (COC) requests.',
  employee_management: 'Employee profiles, records directory, and leave ledgers.',
  ledger_restore_edit: 'Edit restored leave credit entries in employee ledger.',
  ledger_restore_delete: 'Delete restored leave credit entries in employee ledger.',
  ledger_late_deduction_edit: 'Adjust late arrival leave credit deductions.',
  ledger_late_deduction_delete: 'Remove late deduction entries from employee ledger.',
  ledger_accrual_edit: 'Manually edit monthly earned leave credit accrual rows.',
  user_management: 'Manage user accounts, roles, and password credentials.',
  reports_monitoring: 'Generate analytical reports, summaries, and data exports.',
  access_control: 'Manage HR Administrator module permissions and privileges.',
  office_library: 'Maintain city departments, divisions, and office units.',
  leave_types: 'Configure leave classifications and credit policies.',
  illness_library: 'Manage medical condition and illness classifications.',
  work_schedules: 'Configure official shift hours and schedules.',
  signatories: 'Configure department heads and official approving signatories.',
}

const LEDGER_SUB_PERMISSIONS = [
  'ledger_restore_edit',
  'ledger_restore_delete',
  'ledger_late_deduction_edit',
  'ledger_late_deduction_delete',
  'ledger_accrual_edit',
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

// Statistics for KPI Cards
const stats = computed(() => {
  const total = accounts.value.length
  const totalModCount = moduleKeys.value.length
  let fullAccess = 0
  let customScope = 0
  let protectedOwners = 0

  for (const acc of accounts.value) {
    if (acc.is_access_control_owner) {
      protectedOwners++
    }
    const accModCount = Array.isArray(acc.module_keys) ? acc.module_keys.length : 0
    if (totalModCount > 0 && accModCount >= totalModCount) {
      fullAccess++
    } else if (!acc.is_access_control_owner) {
      customScope++
    }
  }

  return { total, fullAccess, customScope, protectedOwners }
})

// Filtered Accounts
const hasActiveFilters = computed(() => {
  return searchQuery.value !== '' || roleFilter.value !== 'all' || scopeFilter.value !== 'all'
})

const filteredAccounts = computed(() => {
  return accounts.value.filter((account) => {
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase().trim()
      const name = (account.full_name || '').toLowerCase()
      const uname = (account.username || '').toLowerCase()
      if (!name.includes(q) && !uname.includes(q)) return false
    }

    if (roleFilter.value === 'owner' && !account.is_access_control_owner) return false
    if (roleFilter.value === 'staff' && account.is_access_control_owner) return false

    const accModCount = Array.isArray(account.module_keys) ? account.module_keys.length : 0
    const totalModCount = moduleKeys.value.length
    if (scopeFilter.value === 'full' && (totalModCount === 0 || accModCount < totalModCount)) return false
    if (scopeFilter.value === 'custom' && totalModCount > 0 && accModCount >= totalModCount) return false

    return true
  })
})

const isEditingSelf = computed(() => {
  return Number(selectedAccount.value?.id) === Number(authStore.user?.id)
})

// Changes Diff Summary
const changeSummary = computed(() => {
  const initial = new Set(initialModuleKeys.value)
  const current = new Set(selectedModuleKeys.value)

  let addedCount = 0
  let removedCount = 0

  for (const k of current) {
    if (!initial.has(k)) addedCount++
  }
  for (const k of initial) {
    if (!current.has(k)) removedCount++
  }

  return {
    addedCount,
    removedCount,
    hasChanges: addedCount > 0 || removedCount > 0,
  }
})

function isCurrentUser(account) {
  return Number(account?.id) === Number(authStore.user?.id)
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

function getModuleDescription(moduleKey) {
  return MODULE_DESCRIPTIONS[moduleKey] || 'Module permission access.'
}

function resetFilters() {
  searchQuery.value = ''
  roleFilter.value = 'all'
  scopeFilter.value = 'all'
}

// Category selection helpers
function getCategoryAllKeys(category) {
  if (category.keys) return category.keys
  if (category.mainKey) return [category.mainKey, ...(category.subKeys || [])]
  return []
}

function getCategoryTotalCount(category) {
  return getCategoryAllKeys(category).length
}

function getCategorySelectedCount(category) {
  const all = getCategoryAllKeys(category)
  const selected = new Set(selectedModuleKeys.value)
  return all.filter((k) => selected.has(k)).length
}

function isCategoryFullySelected(category) {
  const all = getCategoryAllKeys(category)
  if (all.length === 0) return false
  const selected = new Set(selectedModuleKeys.value)
  return all.every((k) => selected.has(k))
}

function toggleCategory(category, checkAll) {
  const all = getCategoryAllKeys(category)
  const current = new Set(selectedModuleKeys.value)

  if (checkAll) {
    all.forEach((k) => current.add(k))
  } else {
    all.forEach((k) => current.delete(k))
  }

  selectedModuleKeys.value = Array.from(current)
}

// Quick Presets
function applyPreset(preset) {
  if (preset === 'leave_specialist') {
    const leaveKeys = [
      'dashboard',
      'applications',
      'receiving',
      'releasing',
      'cancelled_applications',
      'coc_applications',
      'reports_monitoring',
    ].filter((k) => moduleKeys.value.includes(k))
    selectedModuleKeys.value = leaveKeys
  } else if (preset === 'employee_ledger') {
    const empKeys = [
      'dashboard',
      'employee_management',
      'ledger_restore_edit',
      'ledger_restore_delete',
      'ledger_late_deduction_edit',
      'ledger_late_deduction_delete',
      'ledger_accrual_edit',
      'reports_monitoring',
    ].filter((k) => moduleKeys.value.includes(k))
    selectedModuleKeys.value = empKeys
  } else if (preset === 'clear') {
    selectedModuleKeys.value = []
  }
}

let prevModuleKeys = []

watch(
  selectedModuleKeys,
  (newKeys) => {
    const current = new Set(newKeys || [])
    const prev = new Set(prevModuleKeys || [])

    const hadEmpMgmt = prev.has('employee_management')
    const hasEmpMgmt = current.has('employee_management')

    let next = [...(newKeys || [])]
    let changed = false

    // Check if user just added any ledger sub-permission
    const newlyAddedLedgerSub = LEDGER_SUB_PERMISSIONS.some(
      (perm) => !prev.has(perm) && current.has(perm),
    )

    // If any ledger sub-permission is newly checked and employee_management is not checked, auto-check employee_management
    if (newlyAddedLedgerSub && !hasEmpMgmt) {
      next.push('employee_management')
      changed = true
    }

    // If employee_management was unchecked, automatically uncheck all ledger sub-permissions
    if (hadEmpMgmt && !hasEmpMgmt) {
      const hasAnySub = LEDGER_SUB_PERMISSIONS.some((perm) => current.has(perm))
      if (hasAnySub) {
        next = next.filter((k) => !LEDGER_SUB_PERMISSIONS.includes(k))
        changed = true
      }
    }

    // Fallback safety: no ledger sub-permission can exist without employee_management
    const hasAnySubLeft = LEDGER_SUB_PERMISSIONS.some((perm) => next.includes(perm))
    if (hasAnySubLeft && !next.includes('employee_management')) {
      next.push('employee_management')
      changed = true
    }

    prevModuleKeys = [...next]

    if (changed) {
      selectedModuleKeys.value = next
    }
  },
  { deep: true },
)

function openEditDialog(account) {
  selectedAccount.value = account
  const allowedModuleKeys = new Set(moduleKeys.value)
  const initialKeys = Array.isArray(account?.module_keys)
    ? account.module_keys
        .map((moduleKey) => String(moduleKey || '').trim())
        .filter((moduleKey) => moduleKey !== '' && allowedModuleKeys.has(moduleKey))
    : []

  initialModuleKeys.value = [...initialKeys]
  prevModuleKeys = [...initialKeys]
  selectedModuleKeys.value = initialKeys
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

async function saveModuleAccess() {
  if (!selectedAccount.value?.id) return

  saving.value = true
  try {
    await api.post(`/hr/access-control/hr-admins/${selectedAccount.value.id}/modules`, {
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

<style scoped>
.access-control-page {
  max-width: 1400px;
  margin: 0 auto;
}

.kpi-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  background: #ffffff;
}
.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.kpi-avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-toolbar {
  background: #ffffff;
}

.main-table-card {
  background: #ffffff;
  overflow: hidden;
}

.access-table :deep(th) {
  font-weight: 700;
  color: #374151;
  background-color: #f9fafb;
}

.permissions-popover {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
  border-radius: 8px;
}

.dialog-card {
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.16);
  border-radius: 8px;
}

.border-bottom {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.border-top {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.category-group-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
}

.category-header {
  border-bottom: 1px solid #f3f4f6;
}

.module-item {
  border: 1px solid #f3f4f6;
  margin-bottom: 4px;
  transition: all 0.15s ease;
  padding: 6px 10px;
}

.module-item:hover {
  background-color: #f9fafb;
  border-color: #e5e7eb;
}

.module-item-selected {
  background-color: #f0fdf4;
  border-color: #bbf7d0;
}

.ledger-sub-box {
  background-color: #f8fafc;
  border: 1px dashed #cbd5e1;
}

.ledger-item {
  background-color: #ffffff;
}

.ledger-item.module-item-selected {
  background-color: #eef2ff;
  border-color: #c7d2fe;
}

.action-edit-btn {
  font-weight: 600;
}
</style>
