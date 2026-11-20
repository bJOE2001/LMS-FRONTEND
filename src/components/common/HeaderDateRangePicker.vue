<template>
  <div
    class="header-date-picker"
    :class="{
      'is-active': hasRange,
      'is-open': menuOpen,
      'is-full-width': fullWidth,
      'is-dense': dense,
    }"
  >
    <button
      type="button"
      class="date-range-trigger"
      :aria-expanded="menuOpen"
      aria-haspopup="dialog"
      :aria-label="accessibleLabel"
    >
      <span class="date-range-trigger__icon-badge" aria-hidden="true">
        <q-icon name="calendar_month" size="18px" />
      </span>

      <span class="date-range-trigger__text">
        <span class="date-range-trigger__label">{{ label }}</span>
        <span
          class="date-range-trigger__value tabular-nums"
          :class="{ 'is-placeholder': !hasRange }"
        >
          {{ triggerDisplayValue }}
        </span>
      </span>

      <q-icon
        v-if="!clearable || !hasRange"
        name="expand_more"
        size="18px"
        class="date-range-trigger__chevron"
        :class="{ 'is-rotated': menuOpen }"
        aria-hidden="true"
      />

      <q-menu
        v-model="menuOpen"
        :anchor="menuAnchor"
        :self="menuSelf"
        :offset="[0, 8]"
        transition-show="jump-down"
        transition-hide="jump-up"
        class="date-range-menu"
        @hide="onMenuHide"
      >
        <div class="date-range-popover">
          <!-- Selected Range Summary Strip -->
          <div class="date-range-popover__summary">
            <div class="date-range-summary-boxes">
              <div
                class="date-range-summary-box"
                :class="{ 'is-filled': Boolean(pendingStart || startDate), 'is-selecting': Boolean(pendingStart) }"
              >
                <span class="date-range-summary-box__kicker">From</span>
                <span class="date-range-summary-box__date tabular-nums">
                  {{ summaryFromText }}
                </span>
              </div>

              <q-icon
                name="east"
                size="15px"
                class="date-range-summary-arrow"
                aria-hidden="true"
              />

              <div
                class="date-range-summary-box"
                :class="{ 'is-filled': !pendingStart && Boolean(endDate || startDate), 'is-awaiting': Boolean(pendingStart) }"
              >
                <span class="date-range-summary-box__kicker">To</span>
                <span class="date-range-summary-box__date tabular-nums">
                  {{ summaryToText }}
                </span>
              </div>
            </div>

            <span v-if="rangeDurationLabel" class="date-range-duration-pill tabular-nums">
              {{ rangeDurationLabel }}
            </span>
          </div>

          <!-- Presets + Calendar Grid -->
          <div class="date-range-popover__body">
            <div class="date-range-popover__presets" role="group" aria-label="Quick date presets">
              <button
                v-for="preset in presets"
                :key="preset.key"
                type="button"
                class="date-preset-btn"
                :class="{ 'is-active': activePresetKey === preset.key }"
                @click="applyPreset(preset)"
              >
                <span class="date-preset-btn__label">{{ preset.label }}</span>
                <q-icon
                  v-if="activePresetKey === preset.key"
                  name="check"
                  size="14px"
                  class="date-preset-btn__check"
                />
              </button>
            </div>

            <div class="date-range-popover__calendar-wrap">
              <q-date
                ref="calendarRef"
                :model-value="pickerModel"
                mask="YYYY-MM-DD"
                range
                minimal
                flat
                :color="color"
                class="header-q-date"
                @update:model-value="onRangeChange"
                @range-start="onRangeStart"
              />
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="date-range-popover__footer">
            <q-btn
              v-if="clearable && (hasRange || pendingStart)"
              flat
              dense
              no-caps
              size="sm"
              icon="restart_alt"
              label="All Dates"
              class="date-footer-reset-btn"
              @click="clearAndReset"
            />
            <span v-else class="date-footer-hint">
              Click start &amp; end day to filter
            </span>

            <div class="row items-center q-gutter-xs">
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                label="Today"
                class="date-footer-today-btn"
                @click="selectTodayAndStay"
              />
              <q-btn
                v-close-popup
                unelevated
                dense
                no-caps
                size="sm"
                color="green-9"
                label="Done"
                class="date-footer-done-btn q-px-md"
              />
            </div>
          </div>
        </div>
      </q-menu>
    </button>

    <button
      v-if="clearable && hasRange"
      type="button"
      class="date-range-clear-btn"
      aria-label="Clear date range"
      @click.stop="clearDates"
    >
      <q-icon name="close" size="15px" />
      <q-tooltip>Clear date range</q-tooltip>
    </button>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { date as quasarDate } from 'quasar'

const props = defineProps({
  startDate: {
    type: String,
    default: '',
  },
  endDate: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: 'Date Range',
  },
  placeholder: {
    type: String,
    default: 'All Dates',
  },
  color: {
    type: String,
    default: 'green-9',
  },
  clearable: {
    type: Boolean,
    default: true,
  },
  fullWidth: {
    type: Boolean,
    default: false,
  },
  dense: {
    type: Boolean,
    default: false,
  },
  menuAnchor: {
    type: String,
    default: 'bottom right',
  },
  menuSelf: {
    type: String,
    default: 'top right',
  },
})

const emit = defineEmits(['update:startDate', 'update:endDate'])

const menuOpen = ref(false)
const calendarRef = ref(null)
const pendingStart = ref('')

const hasRange = computed(() => Boolean(props.startDate || props.endDate))

const normalizedStart = computed(() => props.startDate || props.endDate || '')
const normalizedEnd = computed(() => props.endDate || props.startDate || '')

const pickerModel = computed(() => {
  if (!hasRange.value) return null
  return normalizedStart.value === normalizedEnd.value
    ? normalizedStart.value
    : { from: normalizedStart.value, to: normalizedEnd.value }
})

const triggerDisplayValue = computed(() => {
  if (!hasRange.value) return props.placeholder
  const from = normalizedStart.value
  const to = normalizedEnd.value
  if (from === to) return formatShortDate(from)

  const fromParsed = parseIsoDate(from)
  const toParsed = parseIsoDate(to)
  if (fromParsed && toParsed && fromParsed.getFullYear() === toParsed.getFullYear()) {
    return `${quasarDate.formatDate(fromParsed, 'MMM D')} – ${quasarDate.formatDate(toParsed, 'MMM D, YYYY')}`
  }

  return `${formatShortDate(from)} – ${formatShortDate(to)}`
})

const accessibleLabel = computed(() => `${props.label}: ${triggerDisplayValue.value}`)

const summaryFromText = computed(() => {
  if (pendingStart.value) return formatShortDate(pendingStart.value)
  if (normalizedStart.value) return formatShortDate(normalizedStart.value)
  return 'Start date'
})

const summaryToText = computed(() => {
  if (pendingStart.value) return 'Select end…'
  if (normalizedEnd.value) return formatShortDate(normalizedEnd.value)
  return 'End date'
})

const rangeDurationLabel = computed(() => {
  if (pendingStart.value || !hasRange.value) return ''
  const from = parseIsoDate(normalizedStart.value)
  const to = parseIsoDate(normalizedEnd.value)
  if (!from || !to) return ''
  const diffDays = Math.round((to.getTime() - from.getTime()) / 86400000) + 1
  if (diffDays <= 1) return '1 day'
  return `${diffDays} days`
})

const presets = computed(() => {
  const now = new Date()
  const todayIso = toIso(now)
  const yesterdayIso = toIso(quasarDate.subtractFromDate(now, { days: 1 }))
  const last7Start = toIso(quasarDate.subtractFromDate(now, { days: 6 }))
  const last30Start = toIso(quasarDate.subtractFromDate(now, { days: 29 }))
  const thisMonthStart = toIso(new Date(now.getFullYear(), now.getMonth(), 1))
  const thisMonthEnd = toIso(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  const prevMonthStart = toIso(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const prevMonthEnd = toIso(new Date(now.getFullYear(), now.getMonth(), 0))

  const allPresets = [
    { key: 'all', label: 'All Dates', from: '', to: '' },
    { key: 'today', label: 'Today', from: todayIso, to: todayIso },
    { key: 'yesterday', label: 'Yesterday', from: yesterdayIso, to: yesterdayIso },
    { key: 'last7', label: 'Last 7 Days', from: last7Start, to: todayIso },
    { key: 'last30', label: 'Last 30 Days', from: last30Start, to: todayIso },
    { key: 'thisMonth', label: 'This Month', from: thisMonthStart, to: thisMonthEnd },
    { key: 'lastMonth', label: 'Last Month', from: prevMonthStart, to: prevMonthEnd },
  ]

  return props.clearable ? allPresets : allPresets.slice(1)
})

const activePresetKey = computed(() => {
  if (pendingStart.value) return ''
  if (!hasRange.value) return 'all'
  const match = presets.value.find(
    (preset) => preset.from === normalizedStart.value && preset.to === normalizedEnd.value,
  )
  return match ? match.key : ''
})

function parseIsoDate(value) {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function toIso(dateObj) {
  return quasarDate.formatDate(dateObj, 'YYYY-MM-DD')
}

function formatShortDate(value) {
  const parsed = parseIsoDate(value)
  if (!parsed) return value || ''
  return quasarDate.formatDate(parsed, 'MMM D, YYYY')
}

function navigateCalendarToIso(iso) {
  const parsed = parseIsoDate(iso)
  if (!parsed || !calendarRef.value?.setCalendarTo) return
  calendarRef.value.setCalendarTo(parsed.getFullYear(), parsed.getMonth() + 1)
}

function onRangeStart({ from }) {
  if (!from?.year || !from?.month || !from?.day) return
  const mm = String(from.month).padStart(2, '0')
  const dd = String(from.day).padStart(2, '0')
  pendingStart.value = `${from.year}-${mm}-${dd}`
}

function onRangeChange(value) {
  pendingStart.value = ''
  if (!value) {
    clearDates()
    return
  }

  if (typeof value === 'string') {
    emit('update:startDate', value)
    emit('update:endDate', value)
    return
  }

  const from = value.from || value.to || ''
  const to = value.to || value.from || ''
  if (from && to && from > to) {
    emit('update:startDate', to)
    emit('update:endDate', from)
  } else {
    emit('update:startDate', from)
    emit('update:endDate', to)
  }
}

function applyPreset(preset) {
  pendingStart.value = ''
  emit('update:startDate', preset.from)
  emit('update:endDate', preset.to)
  if (preset.from) {
    navigateCalendarToIso(preset.from)
  }
  menuOpen.value = false
}

function selectTodayAndStay() {
  pendingStart.value = ''
  const todayIso = toIso(new Date())
  emit('update:startDate', todayIso)
  emit('update:endDate', todayIso)
  navigateCalendarToIso(todayIso)
}

function clearDates() {
  pendingStart.value = ''
  emit('update:startDate', '')
  emit('update:endDate', '')
}

function clearAndReset() {
  clearDates()
  navigateCalendarToIso(toIso(new Date()))
}

function onMenuHide() {
  pendingStart.value = ''
}
</script>

<style scoped>
.header-date-picker {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    background-color 0.16s ease;
}

.header-date-picker:hover {
  border-color: #94a3b8;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
}

.header-date-picker.is-open {
  border-color: #2e7d32;
  box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.14);
}

.header-date-picker.is-active {
  border-color: #86efac;
  background-color: #f0fdf4;
}

.header-date-picker.is-active:hover {
  border-color: #4ade80;
}

.header-date-picker.is-full-width {
  width: 100%;
}

.header-date-picker.is-full-width .date-range-trigger {
  width: 100%;
  min-width: 0;
}

.header-date-picker.is-dense {
  border-radius: 4px;
  height: 40px;
}

.header-date-picker.is-dense .date-range-trigger {
  height: 38px;
  padding: 2px 10px 2px 6px;
  gap: 8px;
  border-radius: 3px;
}

.header-date-picker.is-dense .date-range-trigger__icon-badge {
  width: 26px;
  height: 26px;
  border-radius: 6px;
}

.header-date-picker.is-dense .date-range-trigger__text {
  line-height: 1.05;
}

.header-date-picker.is-dense .date-range-trigger__label {
  font-size: 0.62rem;
}

.header-date-picker.is-dense .date-range-trigger__value {
  font-size: 0.8rem;
}

.date-range-trigger {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 5px 10px 5px 7px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
  min-width: 235px;
  border-radius: 9px;
}

.date-range-trigger:focus-visible,
.date-range-clear-btn:focus-visible,
.date-preset-btn:focus-visible {
  outline: 2px solid #2e7d32;
  outline-offset: 2px;
}

.date-range-trigger__icon-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: #f1f5f9;
  color: #475569;
  flex-shrink: 0;
  transition:
    background-color 0.16s ease,
    color 0.16s ease;
}

.header-date-picker.is-active .date-range-trigger__icon-badge,
.header-date-picker.is-open .date-range-trigger__icon-badge {
  background-color: #dcfce7;
  color: #1b5e20;
}

.date-range-trigger__text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  flex: 1 1 auto;
  min-width: 0;
}

.date-range-trigger__label {
  font-size: 0.67rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
}

.header-date-picker.is-active .date-range-trigger__label {
  color: #15803d;
}

.date-range-trigger__value {
  font-size: 0.84rem;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.date-range-trigger__value.is-placeholder {
  color: #475569;
  font-weight: 500;
}

.date-range-trigger__chevron {
  color: #64748b;
  flex-shrink: 0;
  transition: transform 0.18s ease;
}

.date-range-trigger__chevron.is-rotated {
  transform: rotate(180deg);
}

.date-range-clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  margin: 4px 5px 4px 0;
  border: 0;
  border-radius: 7px;
  background-color: rgba(22, 163, 74, 0.1);
  color: #166534;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background-color 0.14s ease,
    color 0.14s ease;
}

.date-range-clear-btn:hover {
  background-color: #fee2e2;
  color: #b91c1c;
}

/* Popover Card */
.date-range-popover {
  width: 468px;
  max-width: calc(100vw - 24px);
  background-color: #ffffff;
  color: #0f172a;
}

.date-range-popover__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.date-range-summary-boxes {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
}

.date-range-summary-box {
  display: flex;
  flex-direction: column;
  padding: 4px 9px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background-color: #ffffff;
  min-width: 110px;
  flex: 1 1 0;
}

.date-range-summary-box.is-filled {
  border-color: #bbf7d0;
  background-color: #f0fdf4;
}

.date-range-summary-box.is-selecting {
  border-color: #1b5e20;
  box-shadow: 0 0 0 2px rgba(27, 94, 32, 0.12);
}

.date-range-summary-box.is-awaiting {
  border-style: dashed;
  border-color: #86efac;
}

.date-range-summary-box__kicker {
  font-size: 0.64rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  line-height: 1.1;
}

.date-range-summary-box__date {
  font-size: 0.78rem;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.date-range-summary-box.is-awaiting .date-range-summary-box__date,
.date-range-summary-box:not(.is-filled) .date-range-summary-box__date {
  color: #64748b;
  font-weight: 500;
}

.date-range-summary-arrow {
  color: #94a3b8;
  flex-shrink: 0;
}

.date-range-duration-pill {
  padding: 4px 8px;
  border-radius: 999px;
  background-color: #dcfce7;
  color: #14532d;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.date-range-popover__body {
  display: flex;
  align-items: stretch;
}

.date-range-popover__presets {
  width: 144px;
  flex-shrink: 0;
  padding: 10px 8px;
  border-right: 1px solid #e2e8f0;
  background-color: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.date-preset-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
  padding: 7px 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #334155;
  font-size: 0.8rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.14s ease,
    color 0.14s ease;
}

.date-preset-btn:hover {
  background-color: #e2e8f0;
  color: #0f172a;
}

.date-preset-btn.is-active {
  background-color: #dcfce7;
  color: #14532d;
  font-weight: 700;
}

.date-preset-btn__check {
  color: #15803d;
  flex-shrink: 0;
}

.date-range-popover__calendar-wrap {
  flex: 1 1 auto;
  min-width: 0;
  padding: 4px 6px;
}

.header-q-date {
  width: 100%;
  min-width: 280px;
  background: transparent;
}

.header-q-date :deep(.q-date__view) {
  padding: 6px 8px;
  min-height: 218px;
}

.header-q-date :deep(.q-date__calendar-days-container) {
  min-height: 162px;
}

.header-q-date :deep(.q-date__navigation) {
  margin-bottom: 6px;
}

.header-q-date :deep(.q-date__navigation .q-btn) {
  font-weight: 700;
  font-size: 0.86rem;
  color: #1e293b;
}

.header-q-date :deep(.q-date__calendar-weekdays > div) {
  opacity: 1;
  color: #64748b;
  font-weight: 700;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.header-q-date :deep(.q-date__calendar-item .q-btn) {
  border-radius: 8px;
  font-weight: 500;
}

.header-q-date :deep(.q-date__range:before),
.header-q-date :deep(.q-date__range-from:before),
.header-q-date :deep(.q-date__range-to:before) {
  background-color: #dcfce7 !important;
  opacity: 1 !important;
  top: 2px;
  bottom: 2px;
}

.header-q-date :deep(.q-date__range .q-btn) {
  color: #14532d !important;
  font-weight: 700 !important;
}

.header-q-date :deep(.q-date__range .q-btn:hover) {
  background-color: rgba(21, 128, 61, 0.14) !important;
}

.header-q-date :deep(.q-date__range-from .q-btn),
.header-q-date :deep(.q-date__range-to .q-btn) {
  background-color: #1b5e20 !important;
  color: #ffffff !important;
  font-weight: 800 !important;
  box-shadow: 0 2px 6px rgba(27, 94, 32, 0.3);
}

.header-q-date :deep(.q-date__edit-range-from .q-btn),
.header-q-date :deep(.q-date__edit-range-from-to .q-btn),
.header-q-date :deep(.q-date__edit-range-to .q-btn) {
  background-color: #dcfce7 !important;
  color: #1b5e20 !important;
  font-weight: 800 !important;
}

.header-q-date :deep(.q-date__today) {
  box-shadow: inset 0 0 0 1.5px #15803d !important;
  font-weight: 800 !important;
}

.date-range-popover__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid #e2e8f0;
  background-color: #f8fafc;
}

.date-footer-hint {
  font-size: 0.74rem;
  color: #64748b;
}

.date-footer-reset-btn {
  color: #64748b;
  font-weight: 600;
}

.date-footer-today-btn {
  color: #1b5e20;
  font-weight: 700;
}

.date-footer-done-btn {
  border-radius: 7px;
  font-weight: 700;
}

@media (max-width: 599.98px) {
  .header-date-picker {
    width: 100%;
  }

  .date-range-trigger {
    width: 100%;
    min-width: 0;
  }

  .date-range-popover {
    width: calc(100vw - 24px);
  }

  .date-range-popover__body {
    flex-direction: column;
  }

  .date-range-popover__presets {
    width: 100%;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    border-right: 0;
    border-bottom: 1px solid #e2e8f0;
    padding: 8px;
    gap: 6px;
  }

  .date-preset-btn {
    width: auto;
    white-space: nowrap;
    padding: 5px 10px;
    border: 1px solid #cbd5e1;
    background-color: #ffffff;
  }

  .date-preset-btn.is-active {
    border-color: #86efac;
    background-color: #dcfce7;
  }

  .header-q-date {
    min-width: 0;
  }
}
</style>

<style>
.date-range-menu {
  border-radius: 14px !important;
  border: 1px solid #e2e8f0;
  box-shadow:
    0 14px 32px -6px rgba(15, 23, 42, 0.16),
    0 4px 10px -2px rgba(15, 23, 42, 0.08) !important;
  overflow: hidden;
}

body.body--dark .header-date-picker {
  background-color: var(--dm-surface-2, #212b3a);
  border-color: var(--dm-border, #324258);
}

body.body--dark .header-date-picker:hover {
  border-color: #456180;
}

body.body--dark .header-date-picker.is-open {
  border-color: #81c784;
  box-shadow: 0 0 0 3px rgba(129, 199, 132, 0.18);
}

body.body--dark .header-date-picker.is-active {
  border-color: rgba(74, 222, 128, 0.45);
  background-color: rgba(22, 101, 52, 0.24);
}

body.body--dark .date-range-trigger__icon-badge {
  background-color: var(--dm-surface-3, #283446);
  color: var(--dm-text-secondary, #cad5e4);
}

body.body--dark .header-date-picker.is-active .date-range-trigger__icon-badge,
body.body--dark .header-date-picker.is-open .date-range-trigger__icon-badge {
  background-color: rgba(34, 197, 94, 0.2);
  color: #86efac;
}

body.body--dark .date-range-trigger__label {
  color: var(--dm-text-muted, #a4b1c2);
}

body.body--dark .header-date-picker.is-active .date-range-trigger__label {
  color: #86efac;
}

body.body--dark .date-range-trigger__value {
  color: var(--dm-text-primary, #e6edf5);
}

body.body--dark .date-range-trigger__value.is-placeholder {
  color: var(--dm-text-secondary, #cad5e4);
}

body.body--dark .date-range-clear-btn {
  background-color: rgba(134, 239, 172, 0.14);
  color: #86efac;
}

body.body--dark .date-range-clear-btn:hover {
  background-color: rgba(239, 68, 68, 0.22);
  color: #fca5a5;
}

body.body--dark .date-range-menu {
  border-color: var(--dm-border, #324258);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.45) !important;
}

body.body--dark .date-range-popover {
  background-color: var(--dm-surface, #1b2330);
  color: var(--dm-text-primary, #e6edf5);
}

body.body--dark .date-range-popover__summary,
body.body--dark .date-range-popover__presets,
body.body--dark .date-range-popover__footer {
  background-color: var(--dm-surface-2, #212b3a);
  border-color: var(--dm-border, #324258);
}

body.body--dark .date-range-summary-box {
  background-color: var(--dm-surface, #1b2330);
  border-color: var(--dm-border, #324258);
}

body.body--dark .date-range-summary-box.is-filled {
  background-color: rgba(22, 101, 52, 0.24);
  border-color: rgba(74, 222, 128, 0.4);
}

body.body--dark .date-range-summary-box__kicker,
body.body--dark .date-footer-hint {
  color: var(--dm-text-muted, #a4b1c2);
}

body.body--dark .date-range-summary-box__date {
  color: var(--dm-text-primary, #e6edf5);
}

body.body--dark .date-range-duration-pill {
  background-color: rgba(34, 197, 94, 0.22);
  color: #86efac;
}

body.body--dark .date-preset-btn {
  color: var(--dm-text-secondary, #cad5e4);
  border-color: var(--dm-border, #324258);
}

@media (max-width: 599.98px) {
  body.body--dark .date-preset-btn {
    background-color: var(--dm-surface, #1b2330);
    border-color: var(--dm-border, #324258);
  }
}

body.body--dark .date-preset-btn:hover {
  background-color: rgba(255, 255, 255, 0.08);
  color: var(--dm-text-primary, #e6edf5);
}

body.body--dark .date-preset-btn.is-active {
  background-color: rgba(34, 197, 94, 0.22);
  color: #86efac;
}

body.body--dark .header-q-date .q-date__navigation .q-btn {
  color: var(--dm-text-primary, #e6edf5);
}

body.body--dark .header-q-date .q-date__calendar-weekdays > div {
  color: var(--dm-text-muted, #a4b1c2);
}

body.body--dark .header-q-date .q-date__range:before,
body.body--dark .header-q-date .q-date__range-from:before,
body.body--dark .header-q-date .q-date__range-to:before {
  background-color: rgba(34, 197, 94, 0.22) !important;
}

body.body--dark .header-q-date .q-date__range .q-btn {
  color: #bbf7d0 !important;
}

body.body--dark .header-q-date .q-date__range-from .q-btn,
body.body--dark .header-q-date .q-date__range-to .q-btn {
  background-color: #2e7d32 !important;
  color: #ffffff !important;
}

body.body--dark .header-q-date .q-date__today {
  box-shadow: inset 0 0 0 1.5px #4ade80 !important;
}

body.body--dark .date-footer-today-btn {
  color: #86efac;
}

body.body--dark .date-footer-reset-btn {
  color: var(--dm-text-muted, #a4b1c2);
}
</style>
