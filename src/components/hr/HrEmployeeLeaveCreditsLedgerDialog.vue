<template>
  <q-dialog
    v-model="dialogModel"
    :maximized="isMaximized"
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card
      class="leave-ledger-dialog"
      :class="{ 'leave-ledger-dialog--maximized': isMaximized }"
      :style="dialogStyle"
    >
      <!-- Tagum Green Header Toolbar -->
      <q-card-section
        class="leave-ledger-dialog__header row items-center justify-between text-white q-py-sm q-px-md"
      >
        <div class="row items-center q-gutter-x-sm">
          <q-icon name="receipt_long" size="sm" class="text-green-2" />
          <span class="text-h6 text-weight-bold tracking-wide">Leave Credits Ledger</span>
        </div>

        <div class="row items-center q-gutter-x-xs">
          <!-- Zoom Controls -->
          <div class="zoom-controls row items-center rounded-borders q-px-xs q-mr-sm gt-xs">
            <q-btn
              flat
              round
              dense
              icon="zoom_out"
              color="white"
              size="sm"
              :disable="zoomLevel <= 70"
              title="Zoom out"
              @click="zoomOut"
            />
            <span class="text-caption text-weight-bold text-white q-px-xs select-none"
              >{{ zoomLevel }}%</span
            >
            <q-btn
              flat
              round
              dense
              icon="zoom_in"
              color="white"
              size="sm"
              :disable="zoomLevel >= 160"
              title="Zoom in"
              @click="zoomIn"
            />
            <q-btn
              flat
              round
              dense
              icon="restart_alt"
              color="white"
              size="xs"
              title="Reset Zoom (100%)"
              @click="resetZoom"
            />
          </div>

          <!-- Maximize Toggle -->
          <q-btn
            flat
            round
            dense
            :icon="isMaximized ? 'fullscreen_exit' : 'fullscreen'"
            color="white"
            :title="isMaximized ? 'Restore window size' : 'Maximize window'"
            @click="isMaximized = !isMaximized"
          />
          <q-btn icon="close" flat round dense color="white" v-close-popup />
        </div>
      </q-card-section>

      <!-- Clean Mint Balance Summary Badges Bar -->
      <div
        v-if="!loading && leaveBalanceBadges.length"
        class="ledger-balance-sticky-bar row no-wrap items-center justify-between q-px-md q-py-xs bg-green-1"
      >
        <div class="ledger-balance-chips-scroll col row items-center q-gutter-xs no-wrap">
          <span
            v-for="badge in leaveBalanceBadges"
            :key="`sticky-badge-${badge.code}`"
            class="ledger-summary-chip text-weight-bold"
            :class="resolveBadgeColorClass(badge.code)"
          >
            <span class="chip-code">{{ badge.label }}:</span>
            <span class="chip-value q-ml-xs">{{ badge.value }}</span>
          </span>
        </div>

        <!-- Page Navigator Indicator -->
        <div
          v-if="renderedPages.length > 1"
          class="ledger-page-nav-pill row items-center q-gutter-x-xs text-caption flex-shrink-0 q-ml-sm"
        >
          <q-btn
            flat
            dense
            round
            icon="chevron_left"
            size="xs"
            color="green-9"
            :disable="activePageIndex <= 0"
            title="Previous page"
            @click="scrollToPage(activePageIndex - 1)"
          />
          <span class="text-weight-bold text-green-10 no-wrap"
            >Page {{ activePageIndex + 1 }} of {{ renderedPages.length }}</span
          >
          <q-btn
            flat
            dense
            round
            icon="chevron_right"
            size="xs"
            color="green-9"
            :disable="activePageIndex >= renderedPages.length - 1"
            title="Next page"
            @click="scrollToPage(activePageIndex + 1)"
          />
        </div>
      </div>

      <!-- Main Stage Body -->
      <q-card-section class="leave-ledger-dialog__body q-pa-none">
        <q-banner v-if="error" dense rounded class="bg-orange-1 text-orange-9 q-ma-md">
          <template #avatar>
            <q-icon name="warning" color="orange-8" />
          </template>
          {{ error }}
        </q-banner>

        <div
          v-if="loading"
          class="leave-ledger-dialog__loading row items-center justify-center q-pa-xl text-grey-8"
        >
          <q-spinner color="primary" size="36px" class="q-mr-sm" />
          <span class="text-subtitle2 text-weight-medium">Loading leave credits ledger...</span>
        </div>

        <div v-else class="ledger-preview-stage" ref="stageContainer" @scroll="onStageScroll">
          <div
            class="ledger-preview-pages"
            :style="{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }"
          >
            <div
              v-for="(pageRows, pageIndex) in renderedPages"
              :id="`ledger-page-${pageIndex}`"
              :key="`ledger-page-${pageIndex}`"
              class="ledger-sheet"
              :class="paperSizeClass"
              :style="sheetStyle"
            >
              <!-- Official Sheet Identity Header -->
              <div class="ledger-sheet__identity">
                <div class="ledger-sheet__identity-name" :style="identityNameStyle">
                  {{ employeeHeadingName }}
                </div>
                <div class="ledger-sheet__identity-status" :style="identityStatusStyle">
                  {{ employeeHeadingStatus }}
                </div>
                <div class="ledger-sheet__identity-office" :style="identityOfficeStyle">
                  {{ employeeHeadingOffice }}
                </div>
                <div class="ledger-sheet__identity-service">
                  <span
                    class="ledger-sheet__identity-service-value"
                    :style="identityServiceValueStyle"
                  >
                    {{ employeeFirstDayOfService }}
                  </span>
                </div>
              </div>

              <div class="ledger-sheet__header">
                <div class="ledger-sheet__field">
                  <div class="ledger-sheet__label">Name</div>
                </div>
                <div class="ledger-sheet__field">
                  <div class="ledger-sheet__label">Status</div>
                </div>
                <div class="ledger-sheet__field">
                  <div class="ledger-sheet__label">Division Office</div>
                </div>
                <div class="ledger-sheet__field ledger-sheet__field--service">
                  <div class="ledger-sheet__label">1st Day of Service</div>
                </div>
              </div>

              <!-- Main Official Ledger Table -->
              <div class="ledger-table-wrap">
                <table class="ledger-table">
                  <colgroup>
                    <col
                      v-for="(width, index) in columnWidths"
                      :key="`ledger-col-${index}`"
                      :style="{ width }"
                    />
                  </colgroup>
                  <thead>
                    <tr>
                      <th rowspan="2" class="ledger-table__primary-head">
                        <span class="ledger-table__stacked-head">
                          Inclusive<br />
                          Dates
                        </span>
                      </th>
                      <th
                        rowspan="2"
                        class="ledger-table__primary-head ledger-table__primary-head--particulars"
                      >
                        <span class="ledger-table__stacked-head">Particulars</span>
                      </th>
                      <th
                        colspan="4"
                        class="ledger-table__section-head ledger-table__section-head--vl"
                      >
                        <span class="ledger-table__stacked-head">Vacation Leave</span>
                      </th>
                      <th
                        colspan="4"
                        class="ledger-table__section-head ledger-table__section-head--sl"
                      >
                        <span class="ledger-table__stacked-head">Sick Leave</span>
                      </th>
                      <th
                        colspan="4"
                        class="ledger-table__section-head ledger-table__section-head--other"
                      >
                        <span class="ledger-table__stacked-head">Other Type of Leave</span>
                      </th>
                      <th
                        rowspan="2"
                        class="ledger-table__primary-head ledger-table__primary-head--action"
                      >
                        <span class="ledger-table__stacked-head">
                          Date &amp;<br />
                          Action<br />
                          Taken on<br />
                          Application<br />
                          for Leave
                        </span>
                      </th>
                    </tr>
                    <tr>
                      <th><span class="ledger-table__stacked-head">Earned</span></th>
                      <th>
                        <span class="ledger-table__stacked-head">
                          Abs.<br />
                          Und.<br />
                          W/P
                        </span>
                      </th>
                      <th><span class="ledger-table__stacked-head">Bal.</span></th>
                      <th>
                        <span class="ledger-table__stacked-head">
                          Abs.<br />
                          Und.<br />
                          W/oP
                        </span>
                      </th>
                      <th><span class="ledger-table__stacked-head">Earned</span></th>
                      <th>
                        <span class="ledger-table__stacked-head">
                          Abs.<br />
                          Und.
                        </span>
                      </th>
                      <th><span class="ledger-table__stacked-head">Bal.</span></th>
                      <th>
                        <span class="ledger-table__stacked-head">
                          Abs.<br />
                          Und.<br />
                          W/oP
                        </span>
                      </th>
                      <th><span class="ledger-table__stacked-head">Earned</span></th>
                      <th>
                        <span class="ledger-table__stacked-head">
                          Abs.<br />
                          Und.
                        </span>
                      </th>
                      <th><span class="ledger-table__stacked-head">Bal.</span></th>
                      <th>
                        <span class="ledger-table__stacked-head">
                          Abs.<br />
                          Und.<br />
                          W/oP
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="entry in pageRows"
                      :key="entry.key"
                      class="ledger-row"
                      :class="{
                        'ledger-table__row--blank': entry.isBlank,
                        'ledger-table__row--balance-forwarded': entry.isBalanceForwarded,
                        'ledger-table__row--restoration': isRestorationEntry(entry),
                      }"
                    >
                      <td class="ledger-table__cell--period">{{ entry.period }}</td>
                      <td class="ledger-table__cell--particulars" :title="entry.particulars">
                        {{ entry.particulars }}
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.vacationEarned, entry, 'VL')">
                          {{ entry.vacationEarned }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.vacationAbsUndWp, entry, 'VL')">
                          {{ entry.vacationAbsUndWp }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.vacationBalance, entry, 'VL')">
                          {{ entry.vacationBalance }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.vacationAbsUndWop, entry, 'VL')">
                          {{ entry.vacationAbsUndWop }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.sickEarned, entry, 'SL')">
                          {{ entry.sickEarned }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.sickAbsUnd, entry, 'SL')">
                          {{ entry.sickAbsUnd }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.sickBalance, entry, 'SL')">
                          {{ entry.sickBalance }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.sickAbsUndWop, entry, 'SL')">
                          {{ entry.sickAbsUndWop }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.otherEarned, entry, 'OTHER')">
                          {{ entry.otherEarned }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.otherAbsUndWp, entry, 'OTHER')">
                          {{ entry.otherAbsUndWp }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.otherBalance, entry, 'OTHER')">
                          {{ entry.otherBalance }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.otherAbsUndWop, entry, 'OTHER')">
                          {{ entry.otherAbsUndWop }}
                        </span>
                      </td>
                      <td class="ledger-table__cell--action">
                        <div class="row items-center justify-center no-wrap">
                          <span style="white-space: pre-line">{{ entry.actionTaken }}</span>
                          <q-btn
                            v-if="entry.isEditableAccrual && isHrAdmin"
                            icon="edit"
                            size="xs"
                            color="primary"
                            flat
                            dense
                            class="q-ml-xs"
                            title="Edit this accrual"
                            @click="emit('edit-accrual', entry)"
                          />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>

      <!-- Clean Light Footer -->
      <q-card-actions align="right" class="ledger-dialog-actions q-pa-sm q-px-md bg-white border-top">
        <div class="row items-center q-gutter-x-xs">
          <q-btn
            unelevated
            no-caps
            label="Late Deduction"
            color="negative"
            icon="timer_off"
            :disable="loading"
            class="text-weight-bold"
            @click="showLateDeductionDialog = true"
          />
          <q-btn
            unelevated
            no-caps
            label="Restore/Cancel/Recall Leave"
            color="primary"
            icon="settings_backup_restore"
            :disable="loading"
            class="text-weight-bold"
            @click="showRestoreDialog = true"
          />
          <q-btn
            unelevated
            no-caps
            label="Print Ledger"
            color="secondary"
            icon="print"
            :loading="printing"
            :disable="loading || !canPrint"
            class="text-weight-bold"
            @click="emit('print')"
          />
        </div>
      </q-card-actions>
    </q-card>

    <HrLeaveRestorationDialog
      v-model="showRestoreDialog"
      :employee="employee"
      @restored="handleRestored"
    />

    <HrLateDeductionDialog
      v-model="showLateDeductionDialog"
      :employee="employee"
      @deducted="handleRestored"
    />
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from 'src/stores/auth-store'
import HrLeaveRestorationDialog from 'src/components/hr/HrLeaveRestorationDialog.vue'
import HrLateDeductionDialog from 'src/components/hr/HrLateDeductionDialog.vue'

const authStore = useAuthStore()
const isHrAdmin = computed(() => Boolean(authStore.user?.is_access_control_owner))
const showRestoreDialog = ref(false)
const showLateDeductionDialog = ref(false)
const isMaximized = ref(false)
const zoomLevel = ref(100)
const activePageIndex = ref(0)
const stageContainer = ref(null)

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  employee: {
    type: Object,
    default: null,
  },
  error: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  printing: {
    type: Boolean,
    default: false,
  },
  canPrint: {
    type: Boolean,
    default: false,
  },
  leaveBalanceBadges: {
    type: Array,
    default: () => [],
  },
  paperSize: {
    type: String,
    default: 'A4',
  },
  dialogStyle: {
    type: Object,
    default: () => ({}),
  },
  sheetStyle: {
    type: Object,
    default: () => ({}),
  },
  identityNameStyle: {
    type: Object,
    default: () => ({}),
  },
  identityStatusStyle: {
    type: Object,
    default: () => ({}),
  },
  identityOfficeStyle: {
    type: Object,
    default: () => ({}),
  },
  identityServiceValueStyle: {
    type: Object,
    default: () => ({}),
  },
  employeeHeadingName: {
    type: String,
    default: 'N/A',
  },
  employeeHeadingStatus: {
    type: String,
    default: 'N/A',
  },
  employeeHeadingOffice: {
    type: String,
    default: 'N/A',
  },
  employeeFirstDayOfService: {
    type: String,
    default: 'N/A',
  },
  columnWidths: {
    type: Array,
    default: () => [],
  },
  renderedPages: {
    type: Array,
    default: () => [[]],
  },
  valueClassResolver: {
    type: Function,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:modelValue', 'print', 'edit-accrual', 'restored'])

function handleRestored(data) {
  emit('restored', data)
}

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const paperSizeClass = computed(
  () => `ledger-sheet--${String(props.paperSize || 'A4').toLowerCase()}`,
)

function zoomIn() {
  if (zoomLevel.value < 160) {
    zoomLevel.value += 15
  }
}

function zoomOut() {
  if (zoomLevel.value > 70) {
    zoomLevel.value -= 15
  }
}

function resetZoom() {
  zoomLevel.value = 100
}

function scrollToPage(index) {
  if (index < 0 || index >= props.renderedPages.length) return
  activePageIndex.value = index
  const el = document.getElementById(`ledger-page-${index}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function onStageScroll(e) {
  const container = e.target
  if (!container) return
  
  const pages = container.querySelectorAll('.ledger-sheet')
  if (!pages || pages.length === 0) return

  let closestIndex = 0
  let minDistance = Infinity
  
  const containerRect = container.getBoundingClientRect()
  const containerCenter = containerRect.top + containerRect.height / 2
  
  pages.forEach((page, index) => {
    const rect = page.getBoundingClientRect()
    const pageCenter = rect.top + rect.height / 2
    const distance = Math.abs(containerCenter - pageCenter)
    if (distance < minDistance) {
      minDistance = distance
      closestIndex = index
    }
  })
  
  if (activePageIndex.value !== closestIndex) {
    activePageIndex.value = closestIndex
  }
}

function isRestorationEntry(entry) {
  if (!entry) return false
  const particulars = String(entry.particulars || '')
  return (
    particulars.toLowerCase().includes('restore leave') ||
    particulars.toLowerCase().includes('restoration')
  )
}

function resolveBadgeColorClass(code) {
  const c = String(code || '').toUpperCase()
  if (c.includes('VL')) return 'badge-vl'
  if (c.includes('SL')) return 'badge-sl'
  if (c.includes('FL')) return 'badge-fl'
  if (c.includes('SPL')) return 'badge-spl'
  if (c.includes('CTO')) return 'badge-cto'
  return 'badge-other'
}
</script>

<style scoped>
.leave-ledger-dialog {
  width: 96vw;
  max-width: 96vw;
  max-height: 96vh;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.25);
}

.leave-ledger-dialog--maximized {
  width: 100vw !important;
  max-width: 100vw !important;
  height: 100vh !important;
  max-height: 100vh !important;
  border-radius: 0 !important;
}

.leave-ledger-dialog__header {
  background: linear-gradient(135deg, #1b5e20 0%, #14532d 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.zoom-controls {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.ledger-balance-sticky-bar {
  border-bottom: 1px solid #dcfce7;
  min-height: 40px;
  background: #f0fdf4;
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 10px;
}

.ledger-balance-chips-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  flex: 1 1 auto;
  min-width: 0;
  scrollbar-width: thin;
  padding-bottom: 2px;
}

.ledger-balance-chips-scroll::-webkit-scrollbar {
  height: 4px;
}

.ledger-balance-chips-scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
}

.ledger-page-nav-pill {
  flex-shrink: 0;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  padding: 2px 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  white-space: nowrap;
}

@media (max-width: 768px) {
  .ledger-balance-sticky-bar {
    padding-left: 8px;
    padding-right: 8px;
    gap: 6px;
  }

  .ledger-page-nav-pill {
    padding: 1px 6px;
    font-size: 0.72rem;
  }
}

.ledger-summary-chip {
  display: inline-flex;
  align-items: center;
  font-size: 0.73rem;
  padding: 3px 10px;
  border-radius: 999px;
  line-height: 1.1;
  white-space: nowrap;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.badge-vl {
  background: #ffffff;
  color: #000000;
  border: 1px solid #cbd5e1;
}

.badge-sl {
  background: #ffffff;
  color: #000000;
  border: 1px solid #cbd5e1;
}

.badge-fl {
  background: #ffffff;
  color: #000000;
  border: 1px solid #cbd5e1;
}

.badge-spl {
  background: #ffffff;
  color: #000000;
  border: 1px solid #cbd5e1;
}


.badge-cto {
  background: #ffffff;
  color: #000000;
  border: 1px solid #cbd5e1;
}

.badge-other {
  background: #ffffff;
  color: #000000;
  border: 1px solid #cbd5e1;
}

.ledger-summary-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.leave-ledger-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #f1f5f9;
}

.leave-ledger-dialog__loading {
  flex: 1 1 auto;
  min-height: 0;
  background: #f1f5f9;
  color: #475569;
}

.ledger-preview-stage {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 16px;
  background: #e2e8f0;
}

.ledger-preview-pages {
  display: flex;
  flex-direction: column;
  gap: 32px;
  align-items: center;
  padding: 8px 0 32px;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.ledger-sheet {
  margin: 0 auto;
  border: 1px solid #000000;
  overflow: hidden;
  background: #ffffff;
  box-shadow:
    0 10px 25px -5px rgba(0, 0, 0, 0.15),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  font-family: 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif;
  display: flex;
  flex-direction: column;
  border-radius: 2px;
}

.ledger-sheet__identity {
  display: grid;
  grid-template-columns: 34% 13% 29% 24%;
  align-items: center;
  column-gap: 0;
  min-height: 40px;
  padding: 8px 12px 4px;
  border-bottom: 1.5px solid #000000;
}

.ledger-sheet__identity-name,
.ledger-sheet__identity-status,
.ledger-sheet__identity-office,
.ledger-sheet__identity-service {
  min-width: 0;
  color: #000000;
  font-weight: 700;
  line-height: 1.04;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
}

.ledger-sheet__identity-name {
  letter-spacing: 0.005em;
  text-align: center;
}

.ledger-sheet__identity-status {
  text-align: center;
  letter-spacing: 0.005em;
}

.ledger-sheet__identity-office {
  text-align: center;
  letter-spacing: 0.005em;
}

.ledger-sheet__identity-service {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.ledger-sheet__identity-service-value {
  font-size: inherit;
}

.ledger-sheet__header {
  display: grid;
  grid-template-columns: 34% 13% 29% 24%;
  border-bottom: 1.5px solid #000000;
}

.ledger-sheet__field {
  min-height: 20px;
  padding: 2px 8px 3px;
  border-right: 1px solid #000000;
}

.ledger-sheet__field:last-child {
  border-right: none;
}

.ledger-sheet__label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #000000;
  text-align: center;
}

.ledger-sheet__field--service {
  text-align: center;
}

.ledger-table-wrap {
  overflow: visible;
  flex: 1 1 auto;
  display: flex;
}

.ledger-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  height: 100%;
}

.ledger-table th,
.ledger-table td {
  border: 1px solid #000000;
  padding: 2px 3px;
  font-size: 0.65rem;
  line-height: 1.05;
  vertical-align: middle;
  color: #000000;
  text-align: center;
}

.ledger-table th {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  background: #f8fafc;
  color: #000000;
  padding: 0;
  border: 1px solid #000000;
}

.ledger-table thead tr:first-child th {
  height: 22px;
}

.ledger-table thead tr:nth-child(2) th {
  height: 36px;
}

.ledger-table thead tr:nth-child(2) .ledger-table__stacked-head {
  font-size: 0.58rem;
  line-height: 0.98;
  letter-spacing: 0.01em;
  padding: 1px 1px;
}

.ledger-table td {
  padding: 2px 4px;
}

.ledger-table tbody tr {
  height: 22px;
  transition: background-color 0.12s ease;
}

.ledger-table tbody tr:hover td {
  background-color: #e6f4ea !important;
}

.ledger-table__row--blank td {
  background: #ffffff;
}

.ledger-table__row--balance-forwarded td {
  background: #f8fafc;
  font-weight: 700;
}

.ledger-table__row--restoration td {
  background: #f0fdf4;
  font-weight: 600;
}

.ledger-table__stacked-head {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  line-height: 1.01;
  text-align: center;
  padding: 1px 2px;
}

.ledger-table__value {
  display: inline-block;
  min-width: 2.5ch;
}

.ledger-table__value--emphasis {
  color: #000000;
  font-weight: 700;
}

.ledger-table__value--wl {
  color: #1d4ed8;
  font-weight: 600;
}

.ledger-table__value--mco6 {
  color: #15803d;
  font-weight: 600;
}

.ledger-table__cell--period,
.ledger-table__cell--particulars,
.ledger-table__cell--action {
  text-align: center !important;
}

.ledger-table__cell--particulars {
  font-size: 0.58rem;
  line-height: 1;
  font-weight: 600;
  word-wrap: break-word;
  word-break: break-word;
}

.ledger-table__primary-head--particulars .ledger-table__stacked-head {
  font-size: 0.58rem;
  letter-spacing: 0.01em;
}

.ledger-table__primary-head--action .ledger-table__stacked-head {
  font-size: 0.54rem;
  line-height: 0.94;
  letter-spacing: 0.01em;
  padding: 1px 1px;
}

.ledger-table__cell--period {
  font-weight: 600;
  white-space: pre-line;
}

.ledger-table__cell--action {
  white-space: pre-line;
  font-weight: 600;
}

.border-top {
  border-top: 1px solid #cbd5e1;
}

@media (max-width: 900px) {
  .leave-ledger-dialog {
    width: min(100vw, 100vw);
  }

  .ledger-preview-stage {
    padding: 4px;
  }

  .ledger-sheet__identity {
    grid-template-columns: 1fr;
    row-gap: 6px;
  }

  .ledger-sheet__identity-name,
  .ledger-sheet__identity-status,
  .ledger-sheet__identity-office,
  .ledger-sheet__identity-service {
    text-align: center;
    justify-content: center;
  }

  .ledger-dialog-actions {
    align-items: stretch;
  }
}
</style>
