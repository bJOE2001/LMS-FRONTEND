<template>
  <AppDialog
    :model-value="modelValue"
    max-width="860px"
    card-class="rounded-borders ac-dialog-card"
    transition-show="scale"
    transition-hide="scale"
    :loading="saving"
    raw-body
    actions-class="ac-dialog-actions q-px-lg q-py-sm row items-center justify-between q-gutter-sm"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #header="{ cancel }">
      <q-card-section class="ac-dialog-header row items-center justify-between no-wrap q-px-lg q-py-md">
        <div class="row items-center no-wrap q-gutter-md min-width-0">
          <q-avatar
            size="44px"
            :class="account?.is_access_control_owner ? 'bg-primary text-white' : 'ac-staff-avatar'"
            class="text-weight-bold shadow-1 flex-shrink-0"
          >
            {{ getInitials(account?.full_name) }}
          </q-avatar>
          <div class="min-width-0">
            <div class="row items-center q-gutter-xs no-wrap">
              <span class="text-subtitle1 text-weight-bold ac-text-primary ellipsis">
                {{ account?.full_name || 'HR Account' }}
              </span>
              <span
                class="ac-role-pill flex-shrink-0"
                :class="account?.is_access_control_owner ? 'ac-role-pill--owner' : 'ac-role-pill--staff'"
              >
                <q-icon
                  :name="account?.is_access_control_owner ? 'shield' : 'person'"
                  size="12px"
                  aria-hidden="true"
                />
                {{ account?.is_access_control_owner ? 'System Owner' : 'HR Staff Admin' }}
              </span>
            </div>
            <div class="text-caption ac-text-muted font-mono q-mt-xs">
              @{{ account?.username || '-' }}
              <span v-if="!canEdit" class="q-ml-sm ac-owner-note">• Read-only scope preview</span>
            </div>
          </div>
        </div>

        <q-btn
          flat
          round
          dense
          icon="close"
          aria-label="Close permission dialog"
          :disable="saving"
          @click="cancel"
        />
      </q-card-section>
    </template>

    <!-- Context Banners -->
    <div v-if="!canEdit || isEditingSelf" class="ac-dialog-banners q-px-lg q-pt-sm">
      <q-banner v-if="!canEdit" dense rounded class="ac-banner ac-banner--owner">
        <template #avatar>
          <q-icon name="lock" color="primary" aria-hidden="true" />
        </template>
        <div class="text-caption">
          <strong>Root System Owner:</strong> All modules and ledger privileges are permanently enabled and protected from modification.
        </div>
      </q-banner>

      <q-banner
        v-else-if="willLockSelfOut"
        dense
        rounded
        role="alert"
        class="ac-banner ac-banner--danger"
      >
        <template #avatar>
          <q-icon name="warning" color="negative" aria-hidden="true" />
        </template>
        <div class="text-caption">
          <strong>Self-lockout warning:</strong> Removing <em>Access Control</em> from your own account will immediately revoke your access to this page after saving.
        </div>
      </q-banner>

      <q-banner v-else-if="isEditingSelf" dense rounded class="ac-banner ac-banner--info">
        <template #avatar>
          <q-icon name="info" color="primary" aria-hidden="true" />
        </template>
        <div class="text-caption">
          <strong>Editing your own account:</strong> Updated permissions apply immediately and refresh your active session.
        </div>
      </q-banner>
    </div>

    <!-- Sticky Search, Select-All & Presets Bar -->
    <div class="ac-dialog-toolbar q-px-lg q-py-sm">
      <div class="row items-center q-col-gutter-sm">
        <div class="col-12 col-sm-6">
          <q-input
            v-model="moduleSearch"
            outlined
            dense
            clearable
            placeholder="Filter permissions by name or description..."
            aria-label="Filter permissions"
          >
            <template #prepend>
              <q-icon name="search" size="18px" class="ac-text-muted" aria-hidden="true" />
            </template>
          </q-input>
        </div>

        <div class="col-12 col-sm-6 row items-center justify-between justify-sm-end q-gutter-sm">
          <div class="row items-center no-wrap">
            <q-checkbox
              v-if="canEdit"
              :model-value="allModulesSelected"
              :indeterminate="partiallySelected"
              color="primary"
              dense
              label="Select All"
              class="text-weight-bold ac-text-primary"
              :disable="saving || moduleKeys.length === 0"
              @update:model-value="toggleSelectAll"
            />
            <span class="ac-coverage-pill tabular-nums q-ml-sm" role="status" aria-atomic="true">
              {{ selectedModuleCount }} / {{ moduleKeys.length }} granted
            </span>
          </div>
        </div>
      </div>

      <div v-if="canEdit" class="row items-center q-gutter-xs q-mt-sm">
        <span class="text-caption ac-text-muted text-weight-medium q-mr-xs">Presets:</span>
        <q-btn
          v-for="preset in ROLE_PRESETS"
          :key="preset.id"
          dense
          no-caps
          size="sm"
          :unelevated="activePresetId === preset.id"
          :outline="activePresetId !== preset.id"
          :color="activePresetId === preset.id ? 'primary' : 'grey-7'"
          :icon="preset.icon"
          :label="preset.label"
          class="ac-preset-btn"
          :disable="saving"
          @click="applyPreset(preset.id)"
        >
          <q-tooltip>{{ preset.tooltip }}</q-tooltip>
        </q-btn>

        <q-btn
          dense
          flat
          no-caps
          size="sm"
          color="grey-7"
          icon="deselect"
          label="Clear All"
          class="ac-preset-btn q-ml-auto"
          :disable="saving || selectedModuleCount === 0"
          @click="applyPreset('clear')"
        />
      </div>
    </div>

    <!-- Scrollable Categorized Permission Matrix -->
    <q-card-section class="ac-dialog-scroll q-px-lg q-py-md">
      <div v-if="visibleCategories.length === 0" class="ac-empty-search text-center q-py-xl">
        <q-icon name="search_off" size="40px" class="ac-text-muted" aria-hidden="true" />
        <div class="text-subtitle2 text-weight-bold ac-text-primary q-mt-sm">
          No matching permissions
        </div>
        <div class="text-caption ac-text-muted q-mt-xs">
          Try a different keyword or clear the filter.
        </div>
        <q-btn
          flat
          dense
          no-caps
          color="primary"
          label="Clear Search"
          class="q-mt-sm"
          @click="moduleSearch = ''"
        />
      </div>

      <div v-else class="q-gutter-y-md">
        <section
          v-for="category in visibleCategories"
          :key="category.id"
          class="ac-category-card rounded-borders"
        >
          <!-- Category Header -->
          <div class="ac-category-header row items-center justify-between q-px-md q-py-sm">
            <div class="row items-center q-gutter-sm min-width-0">
              <span
                class="ac-category-icon"
                :style="{ '--cat-accent': category.accent }"
                aria-hidden="true"
              >
                <q-icon :name="category.icon" size="18px" />
              </span>
              <div class="min-width-0">
                <div class="row items-center q-gutter-xs">
                  <span class="text-subtitle2 text-weight-bold ac-text-primary">
                    {{ category.label }}
                  </span>
                  <span class="ac-section-count tabular-nums">
                    {{ getCategorySelectedCount(category.raw) }}/{{ getCategoryTotalCount(category.raw) }}
                  </span>
                </div>
              </div>
            </div>

            <q-btn
              v-if="canEdit"
              dense
              flat
              no-caps
              size="xs"
              color="primary"
              :label="isCategoryFullySelected(category.raw) ? 'Deselect Section' : 'Select Section'"
              class="text-weight-bold"
              :disable="saving"
              @click="toggleCategory(category.raw, !isCategoryFullySelected(category.raw))"
            />
          </div>

          <!-- Category Modules -->
          <div class="q-pa-sm">
            <div v-if="category.standardKeys.length > 0" class="row q-col-gutter-sm">
              <div
                v-for="moduleKey in category.standardKeys"
                :key="moduleKey"
                class="col-12 col-md-6"
              >
                <label
                  v-ripple="canEdit"
                  class="ac-module-card"
                  :class="{
                    'is-selected': selectedSet.has(moduleKey),
                    'is-readonly': !canEdit,
                  }"
                >
                  <q-checkbox
                    :model-value="selectedSet.has(moduleKey)"
                    color="primary"
                    dense
                    :disable="saving || !canEdit"
                    class="ac-module-card__checkbox"
                    @update:model-value="toggleSingleModule(moduleKey, $event)"
                  />
                  <div class="ac-module-card__body min-width-0">
                    <div class="row items-center justify-between no-wrap q-gutter-xs">
                      <div class="row items-center no-wrap q-gutter-xs min-width-0">
                        <q-icon
                          :name="getModuleIcon(moduleKey)"
                          size="16px"
                          :class="selectedSet.has(moduleKey) ? 'text-primary' : 'ac-text-muted'"
                          aria-hidden="true"
                        />
                        <span class="text-body2 text-weight-medium ac-text-primary ellipsis">
                          {{ resolveModuleLabel(moduleKey) }}
                        </span>
                      </div>
                      <span
                        v-if="isSensitiveModule(moduleKey)"
                        class="ac-sensitive-pill flex-shrink-0"
                      >
                        Elevated
                      </span>
                    </div>
                    <div class="text-caption ac-text-muted ac-module-card__desc">
                      {{ getModuleDescription(moduleKey) }}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <!-- Employee & Nested Ledger Permissions -->
            <div v-if="category.showMainKey || category.subKeys.length > 0" class="q-gutter-y-sm">
              <label
                v-if="category.showMainKey"
                v-ripple="canEdit"
                class="ac-module-card ac-module-card--core"
                :class="{
                  'is-selected': selectedSet.has(category.raw.mainKey),
                  'is-readonly': !canEdit,
                }"
              >
                <q-checkbox
                  :model-value="selectedSet.has(category.raw.mainKey)"
                  color="primary"
                  dense
                  :disable="saving || !canEdit"
                  class="ac-module-card__checkbox"
                  @update:model-value="toggleSingleModule(category.raw.mainKey, $event)"
                />
                <div class="ac-module-card__body min-width-0">
                  <div class="row items-center justify-between no-wrap q-gutter-xs">
                    <div class="row items-center no-wrap q-gutter-xs min-width-0">
                      <q-icon
                        :name="getModuleIcon(category.raw.mainKey)"
                        size="17px"
                        color="primary"
                        aria-hidden="true"
                      />
                      <span class="text-body2 text-weight-bold ac-text-primary">
                        {{ resolveModuleLabel(category.raw.mainKey) }}
                      </span>
                      <span class="ac-core-pill">Core Module</span>
                    </div>
                  </div>
                  <div class="text-caption ac-text-muted ac-module-card__desc">
                    {{ getModuleDescription(category.raw.mainKey) }}
                  </div>
                </div>
              </label>

              <div v-if="category.subKeys.length > 0" class="ac-ledger-rail">
                <div class="row items-center justify-between q-mb-xs q-col-gutter-xs">
                  <div class="text-caption text-weight-bold ac-ledger-heading row items-center q-gutter-xs">
                    <q-icon name="subdirectory_arrow_right" size="16px" aria-hidden="true" />
                    <span>Granular Leave Ledger Privileges</span>
                  </div>
                  <span class="ac-dependency-pill">
                    <q-icon name="link" size="12px" aria-hidden="true" />
                    Requires Employee Management
                  </span>
                </div>

                <div class="row q-col-gutter-sm">
                  <div
                    v-for="subKey in category.subKeys"
                    :key="subKey"
                    class="col-12 col-md-6"
                  >
                    <label
                      v-ripple="canEdit"
                      class="ac-module-card ac-module-card--ledger"
                      :class="{
                        'is-selected': selectedSet.has(subKey),
                        'is-dimmed': !selectedSet.has(category.raw.mainKey),
                        'is-readonly': !canEdit,
                      }"
                    >
                      <q-checkbox
                        :model-value="selectedSet.has(subKey)"
                        color="indigo"
                        dense
                        :disable="saving || !canEdit"
                        class="ac-module-card__checkbox"
                        @update:model-value="toggleSingleModule(subKey, $event)"
                      />
                      <div class="ac-module-card__body min-width-0">
                        <div class="row items-center justify-between no-wrap q-gutter-xs">
                          <div class="row items-center no-wrap q-gutter-xs min-width-0">
                            <q-icon
                              :name="getModuleIcon(subKey)"
                              size="15px"
                              :class="selectedSet.has(subKey) ? 'text-indigo-7' : 'ac-text-muted'"
                              aria-hidden="true"
                            />
                            <span class="text-body2 text-weight-medium ac-text-primary ellipsis">
                              {{ resolveModuleLabel(subKey) }}
                            </span>
                          </div>
                          <span
                            v-if="isSensitiveModule(subKey)"
                            class="ac-sensitive-pill flex-shrink-0"
                          >
                            Elevated
                          </span>
                        </div>
                        <div class="text-caption ac-text-muted ac-module-card__desc">
                          {{ getModuleDescription(subKey) }}
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </q-card-section>

    <template #actions="{ cancel }">
      <div class="row items-center q-gutter-xs min-width-0">
        <template v-if="!canEdit">
          <span class="text-caption ac-text-muted">
            Showing all {{ moduleKeys.length }} protected modules
          </span>
        </template>
        <template v-else-if="changeSummary.hasChanges">
          <span class="text-caption text-weight-medium ac-text-primary">Pending changes:</span>
          <q-badge
            v-if="changeSummary.added.length > 0"
            color="positive"
            class="text-weight-bold tabular-nums cursor-pointer"
          >
            +{{ changeSummary.added.length }} to grant
            <q-tooltip max-width="320px">
              Grant: {{ changeSummary.added.map(resolveModuleLabel).join(', ') }}
            </q-tooltip>
          </q-badge>
          <q-badge
            v-if="changeSummary.removed.length > 0"
            color="negative"
            class="text-weight-bold tabular-nums cursor-pointer"
          >
            -{{ changeSummary.removed.length }} to revoke
            <q-tooltip max-width="320px">
              Revoke: {{ changeSummary.removed.map(resolveModuleLabel).join(', ') }}
            </q-tooltip>
          </q-badge>
        </template>
        <span v-else class="text-caption ac-text-muted">
          No pending changes
        </span>
      </div>

      <div class="row items-center q-gutter-sm">
        <q-btn
          flat
          no-caps
          :label="canEdit ? 'Cancel' : 'Close'"
          color="grey-7"
          :disable="saving"
          @click="cancel"
        />
        <q-btn
          v-if="canEdit"
          unelevated
          no-caps
          color="primary"
          icon="save"
          label="Save Access"
          :loading="saving"
          :disable="!changeSummary.hasChanges"
          class="q-px-md text-weight-bold"
          @click="submitSave"
        />
      </div>
    </template>
  </AppDialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import {
  LEDGER_SUB_PERMISSIONS,
  MODULE_DESCRIPTIONS,
  MODULE_ICONS,
  ROLE_PRESETS,
  SENSITIVE_MODULE_KEYS,
  buildCategorizedModules,
  getCategoryAllKeys,
} from 'src/constants/access-control'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  account: {
    type: Object,
    default: null,
  },
  moduleKeys: {
    type: Array,
    default: () => [],
  },
  moduleLabelByKey: {
    type: Object,
    default: () => ({}),
  },
  isEditingSelf: {
    type: Boolean,
    default: false,
  },
  saving: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'save'])

const moduleSearch = ref('')
const selectedKeys = ref([])
const initialKeys = ref([])

const canEdit = computed(() => Boolean(props.account?.can_edit_permissions))
const selectedSet = computed(() => new Set(selectedKeys.value))

const categorizedModules = computed(() => buildCategorizedModules(props.moduleKeys))

const selectedModuleCount = computed(() =>
  props.moduleKeys.filter((key) => selectedSet.value.has(key)).length,
)

const allModulesSelected = computed(
  () => props.moduleKeys.length > 0 && selectedModuleCount.value === props.moduleKeys.length,
)

const partiallySelected = computed(
  () => selectedModuleCount.value > 0 && !allModulesSelected.value,
)

const willLockSelfOut = computed(
  () => canEdit.value && props.isEditingSelf && !selectedSet.value.has('access_control'),
)

const activePresetId = computed(() => {
  if (!canEdit.value) return ''
  const selected = selectedSet.value
  for (const preset of ROLE_PRESETS) {
    const targetKeys =
      preset.id === 'full_access'
        ? props.moduleKeys
        : preset.keys.filter((key) => props.moduleKeys.includes(key))
    if (
      targetKeys.length > 0 &&
      selected.size === targetKeys.length &&
      targetKeys.every((key) => selected.has(key))
    ) {
      return preset.id
    }
  }
  return ''
})

const changeSummary = computed(() => {
  const initial = new Set(initialKeys.value)
  const current = selectedSet.value
  const added = []
  const removed = []

  for (const key of current) {
    if (!initial.has(key)) added.push(key)
  }
  for (const key of initial) {
    if (!current.has(key)) removed.push(key)
  }

  return {
    added,
    removed,
    hasChanges: added.length > 0 || removed.length > 0,
  }
})

const visibleCategories = computed(() => {
  const query = String(moduleSearch.value || '').trim().toLowerCase()
  const allowed = new Set(props.moduleKeys)

  return categorizedModules.value
    .map((category) => {
      const standardPool = (category.keys || []).filter((key) => allowed.has(key))
      const hasMain = Boolean(category.mainKey && allowed.has(category.mainKey))
      const subPool = (category.subKeys || []).filter((key) => allowed.has(key))

      const matches = (key) => {
        if (!query) return true
        const label = resolveModuleLabel(key).toLowerCase()
        const desc = getModuleDescription(key).toLowerCase()
        return label.includes(query) || desc.includes(query) || key.toLowerCase().includes(query)
      }

      const standardKeys = standardPool.filter(matches)
      const showMainKey = hasMain && matches(category.mainKey)
      const subKeys = subPool.filter(matches)

      return {
        id: category.id,
        label: category.label,
        icon: category.icon,
        accent: category.accent,
        raw: category,
        standardKeys,
        showMainKey,
        subKeys,
      }
    })
    .filter(
      (cat) => cat.standardKeys.length > 0 || cat.showMainKey || cat.subKeys.length > 0,
    )
})

watch(
  () => [props.modelValue, props.account],
  ([isOpen]) => {
    if (!isOpen) return
    moduleSearch.value = ''
    const allowed = new Set(props.moduleKeys)
    const normalized = Array.isArray(props.account?.module_keys)
      ? props.account.module_keys
          .map((key) => String(key || '').trim())
          .filter((key) => key !== '' && allowed.has(key))
      : []

    initialKeys.value = [...normalized]
    selectedKeys.value = [...normalized]
  },
  { immediate: true },
)

function normalizeWithLedgerDependency(nextKeys, toggledKey = null, isAdding = false) {
  const allowed = new Set(props.moduleKeys)
  const next = new Set(nextKeys.filter((key) => allowed.has(key)))

  if (toggledKey === 'employee_management' && !isAdding) {
    for (const sub of LEDGER_SUB_PERMISSIONS) {
      next.delete(sub)
    }
  } else {
    const hasSub = LEDGER_SUB_PERMISSIONS.some((sub) => next.has(sub))
    if (hasSub && allowed.has('employee_management')) {
      next.add('employee_management')
    }
  }

  return props.moduleKeys.filter((key) => next.has(key))
}

function toggleSingleModule(moduleKey, checked) {
  if (!canEdit.value || props.saving) return
  const next = new Set(selectedKeys.value)
  if (checked) {
    next.add(moduleKey)
  } else {
    next.delete(moduleKey)
  }
  selectedKeys.value = normalizeWithLedgerDependency(Array.from(next), moduleKey, Boolean(checked))
}

function toggleSelectAll(checked) {
  if (!canEdit.value || props.saving) return
  selectedKeys.value = checked ? [...props.moduleKeys] : []
}

function getCategoryTotalCount(category) {
  const allowed = new Set(props.moduleKeys)
  return getCategoryAllKeys(category).filter((key) => allowed.has(key)).length
}

function getCategorySelectedCount(category) {
  const allowed = new Set(props.moduleKeys)
  return getCategoryAllKeys(category).filter(
    (key) => allowed.has(key) && selectedSet.value.has(key),
  ).length
}

function isCategoryFullySelected(category) {
  const allowed = new Set(props.moduleKeys)
  const keys = getCategoryAllKeys(category).filter((key) => allowed.has(key))
  return keys.length > 0 && keys.every((key) => selectedSet.value.has(key))
}

function toggleCategory(category, checkAll) {
  if (!canEdit.value || props.saving) return
  const keys = getCategoryAllKeys(category)
  const next = new Set(selectedKeys.value)

  for (const key of keys) {
    if (checkAll) {
      next.add(key)
    } else {
      next.delete(key)
    }
  }

  selectedKeys.value = normalizeWithLedgerDependency(Array.from(next))
}

function applyPreset(presetId) {
  if (!canEdit.value || props.saving) return
  if (presetId === 'clear') {
    selectedKeys.value = []
    return
  }

  if (presetId === 'full_access') {
    selectedKeys.value = [...props.moduleKeys]
    return
  }

  const preset = ROLE_PRESETS.find((entry) => entry.id === presetId)
  if (!preset || !Array.isArray(preset.keys)) return
  selectedKeys.value = normalizeWithLedgerDependency(preset.keys)
}

function submitSave() {
  if (!canEdit.value || props.saving || !changeSummary.value.hasChanges) return
  emit('save', [...selectedKeys.value])
}

function getInitials(name) {
  if (!name) return 'HR'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function resolveModuleLabel(moduleKey) {
  return props.moduleLabelByKey[moduleKey] || moduleKey
}

function getModuleIcon(moduleKey) {
  return MODULE_ICONS[moduleKey] || 'check_circle'
}

function getModuleDescription(moduleKey) {
  return MODULE_DESCRIPTIONS[moduleKey] || 'Module permission access.'
}

function isSensitiveModule(moduleKey) {
  return SENSITIVE_MODULE_KEYS.includes(moduleKey)
}
</script>

<style scoped>
.ac-dialog-card {
  box-shadow: 0 20px 44px rgba(15, 23, 42, 0.18);
}

.ac-dialog-header {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.ac-dialog-toolbar {
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  flex: 0 0 auto;
}

.ac-dialog-banners {
  flex: 0 0 auto;
}

.ac-dialog-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  background: #f8fafc;
}

.ac-dialog-actions {
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
}

.ac-staff-avatar {
  background: #e2e8f0;
  color: #334155;
}

.ac-text-primary {
  color: #0f172a;
}

.ac-text-muted {
  color: #64748b;
}

.ac-owner-note {
  font-family: var(--app-font-sans);
  color: #15803d;
  font-weight: 600;
}

.ac-role-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.3;
}

.ac-role-pill--owner {
  background: #dcfce7;
  color: #166534;
}

.ac-role-pill--staff {
  background: #f1f5f9;
  color: #334155;
}

.ac-banner {
  border: 1px solid transparent;
}

.ac-banner--owner,
.ac-banner--info {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1e3a8a;
}

.ac-banner--danger {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}

.ac-coverage-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  background: #f1f5f9;
  color: #334155;
}

.ac-preset-btn {
  border-radius: 8px;
  font-weight: 600;
}

.ac-category-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.ac-category-header {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.ac-category-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--cat-accent, #2e7d32) 12%, transparent);
  color: var(--cat-accent, #2e7d32);
  flex-shrink: 0;
}

.ac-section-count {
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  background: #e2e8f0;
  color: #334155;
}

.ac-module-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  height: 100%;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  cursor: pointer;
  user-select: none;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease;
}

.ac-module-card:hover:not(.is-readonly) {
  border-color: #94a3b8;
  background: #f8fafc;
}

.ac-module-card:focus-within {
  outline: 2px solid #2e7d32;
  outline-offset: 2px;
}

.ac-module-card.is-selected {
  background: #f0fdf4;
  border-color: #86efac;
}

.ac-module-card.is-selected:hover:not(.is-readonly) {
  background: #dcfce7;
  border-color: #4ade80;
}

.ac-module-card.is-readonly {
  cursor: default;
}

.ac-module-card--core.is-selected {
  background: #f0fdf4;
  border-color: #4ade80;
}

.ac-module-card--ledger.is-selected {
  background: #eef2ff;
  border-color: #a5b4fc;
}

.ac-module-card--ledger.is-selected:hover:not(.is-readonly) {
  background: #e0e7ff;
  border-color: #818cf8;
}

.ac-module-card.is-dimmed {
  opacity: 0.72;
}

.ac-module-card__checkbox {
  margin-top: 1px;
  flex-shrink: 0;
}

.ac-module-card__body {
  flex: 1 1 auto;
}

.ac-module-card__desc {
  line-height: 1.35;
  margin-top: 2px;
}

.ac-core-pill,
.ac-sensitive-pill {
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.ac-core-pill {
  background: #dcfce7;
  color: #166534;
}

.ac-sensitive-pill {
  background: #fef3c7;
  color: #92400e;
}

.ac-ledger-rail {
  margin-left: 14px;
  padding: 10px 12px;
  border-left: 3px solid #6366f1;
  border-radius: 0 8px 8px 0;
  background: #f8fafc;
}

.ac-ledger-heading {
  color: #3730a3;
}

.ac-dependency-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 600;
  background: #e0e7ff;
  color: #3730a3;
}

.ac-empty-search {
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  background: #ffffff;
}

.min-width-0 {
  min-width: 0;
}

/* Dark Mode Overrides */
:global(body.body--dark) .ac-dialog-header,
:global(body.body--dark) .ac-dialog-scroll {
  background: var(--dm-page-bg, #11161d);
  border-color: var(--dm-border, #324258);
}

:global(body.body--dark) .ac-dialog-toolbar,
:global(body.body--dark) .ac-dialog-actions,
:global(body.body--dark) .ac-category-card,
:global(body.body--dark) .ac-empty-search {
  background: var(--dm-surface, #1b2330);
  border-color: var(--dm-border, #324258);
}

:global(body.body--dark) .ac-category-header,
:global(body.body--dark) .ac-ledger-rail {
  background: var(--dm-surface-2, #212b3a);
  border-color: var(--dm-border, #324258);
}

:global(body.body--dark) .ac-staff-avatar {
  background: var(--dm-surface-3, #283446);
  color: var(--dm-text-primary, #e6edf5);
}

:global(body.body--dark) .ac-text-primary {
  color: var(--dm-text-primary, #e6edf5);
}

:global(body.body--dark) .ac-text-muted {
  color: var(--dm-text-muted, #a4b1c2);
}

:global(body.body--dark) .ac-owner-note {
  color: #86efac;
}

:global(body.body--dark) .ac-role-pill--owner,
:global(body.body--dark) .ac-core-pill {
  background: rgba(34, 197, 94, 0.18);
  color: #86efac;
}

:global(body.body--dark) .ac-role-pill--staff,
:global(body.body--dark) .ac-coverage-pill,
:global(body.body--dark) .ac-section-count {
  background: var(--dm-surface-3, #283446);
  color: var(--dm-text-secondary, #cad5e4);
}

:global(body.body--dark) .ac-sensitive-pill {
  background: rgba(245, 158, 11, 0.18);
  color: #fcd34d;
}

:global(body.body--dark) .ac-dependency-pill {
  background: rgba(99, 102, 241, 0.22);
  color: #c7d2fe;
}

:global(body.body--dark) .ac-ledger-heading {
  color: #c7d2fe;
}

:global(body.body--dark) .ac-banner--owner,
:global(body.body--dark) .ac-banner--info {
  background: rgba(59, 130, 246, 0.14);
  border-color: rgba(96, 165, 250, 0.35);
  color: #bfdbfe;
}

:global(body.body--dark) .ac-banner--danger {
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(248, 113, 113, 0.35);
  color: #fecaca;
}

:global(body.body--dark) .ac-module-card {
  background: var(--dm-surface-2, #212b3a);
  border-color: var(--dm-border, #324258);
}

:global(body.body--dark) .ac-module-card:hover:not(.is-readonly) {
  background: var(--dm-surface-3, #283446);
  border-color: #4b617d;
}

:global(body.body--dark) .ac-module-card.is-selected {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(74, 222, 128, 0.45);
}

:global(body.body--dark) .ac-module-card--ledger.is-selected {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(129, 140, 248, 0.5);
}

@media (max-width: 599px) {
  .ac-ledger-rail {
    margin-left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ac-module-card {
    transition: none;
  }
}
</style>
