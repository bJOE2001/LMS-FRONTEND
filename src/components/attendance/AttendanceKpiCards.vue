<template>
  <div class="row q-col-gutter-sm q-mb-md attendance-kpi-row">
    <div v-for="card in cards" :key="card.key" class="col-6 col-sm-4 col-md">
      <div
        role="button"
        tabindex="0"
        :class="['attendance-kpi-card', { 'attendance-kpi-card--active': isActive(card) }]"
        :style="getCardStyle(card)"
        @click="selectCard(card)"
        @keydown.enter.prevent="selectCard(card)"
        @keydown.space.prevent="selectCard(card)"
      >
        <div class="attendance-kpi-card__top">
          <div class="attendance-kpi-card__identity">
            <span class="attendance-kpi-card__icon-box" aria-hidden="true">
              <q-icon :name="card.icon" size="17px" />
            </span>
            <span class="attendance-kpi-card__label">{{ card.label }}</span>
          </div>
          <span class="attendance-kpi-card__value tabular-nums">
            {{ card.value }}
          </span>
        </div>

        <div class="attendance-kpi-card__bottom">
          <span class="attendance-kpi-card__hint">{{ card.hint }}</span>
          <span v-if="card.key !== 'ALL' && isActive(card)" class="attendance-kpi-card__pill">
            Filtered
          </span>
        </div>

        <q-tooltip>{{ getCardTooltip(card) }}</q-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  stats: {
    type: Object,
    default: () => ({
      total: 0,
      present: 0,
      late: 0,
      on_leave: 0,
      absent: 0,
    }),
  },
  modelValue: {
    type: String,
    default: 'ALL',
  },
})

const emit = defineEmits(['update:modelValue'])

const cards = computed(() => [
  {
    key: 'ALL',
    label: 'Total Personnel',
    value: props.stats?.total || 0,
    hint: 'All scheduled staff',
    icon: 'groups',
    accent: '#1565c0',
    iconBg: '#e0f2fe',
  },
  {
    key: 'PRESENT',
    label: 'Present',
    value: props.stats?.present || 0,
    hint: 'Logged attendance',
    icon: 'check_circle',
    accent: '#15803d',
    iconBg: '#dcfce7',
  },
  {
    key: 'LATE',
    label: 'Tardy / Late',
    value: props.stats?.late || 0,
    hint: 'Arrived past schedule',
    icon: 'history_toggle_off',
    accent: '#b45309',
    iconBg: '#fef3c7',
  },
  {
    key: 'ON_LEAVE',
    label: 'On Leave',
    value: props.stats?.on_leave || 0,
    hint: 'Approved leave',
    icon: 'beach_access',
    accent: '#4338ca',
    iconBg: '#e0e7ff',
  },
  {
    key: 'ABSENT',
    label: 'Absent',
    value: props.stats?.absent || 0,
    hint: 'No attendance log',
    icon: 'event_busy',
    accent: '#b91c1c',
    iconBg: '#fee2e2',
  },
])

function isActive(card) {
  return props.modelValue === card.key
}

function selectCard(card) {
  const nextStatus =
    card.key === 'ALL' ? 'ALL' : props.modelValue === card.key ? 'ALL' : card.key
  emit('update:modelValue', nextStatus)
}

function getCardStyle(card) {
  return {
    '--att-kpi-accent': card.accent,
    '--att-kpi-icon-bg': card.iconBg,
  }
}

function getCardTooltip(card) {
  if (card.key === 'ALL') {
    return 'Show all personnel'
  }
  return isActive(card) ? 'Click to show all personnel' : `Filter by ${card.label}`
}
</script>

<style scoped>
.attendance-kpi-row > div {
  display: flex;
}

.attendance-kpi-card {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 86px;
  padding: 10px 12px 9px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background-color: #ffffff;
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
    border-color 0.16s ease,
    background-color 0.16s ease;
}

.attendance-kpi-card:hover {
  transform: translateY(-2px);
  border-color: var(--att-kpi-accent, #1565c0);
  box-shadow: 0 10px 22px -8px rgba(15, 23, 42, 0.12);
}

.attendance-kpi-card:focus-visible {
  outline: 2px solid var(--att-kpi-accent, #1565c0);
  outline-offset: 2px;
}

.attendance-kpi-card--active {
  border-color: var(--att-kpi-accent, #1565c0);
  background-color: #f8fafc;
  box-shadow:
    0 8px 20px -8px rgba(15, 23, 42, 0.14),
    inset 0 0 0 1px var(--att-kpi-accent, #1565c0);
}

.attendance-kpi-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.attendance-kpi-card__identity {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.attendance-kpi-card__icon-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background-color: var(--att-kpi-icon-bg, #e2e8f0);
  color: var(--att-kpi-accent, #1565c0);
  flex-shrink: 0;
}

.attendance-kpi-card__label {
  font-size: 0.74rem;
  font-weight: 700;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attendance-kpi-card--active .attendance-kpi-card__label {
  color: var(--att-kpi-accent, #1565c0);
}

.attendance-kpi-card__value {
  font-size: clamp(1.3rem, 1.75vw, 1.55rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--att-kpi-accent, #1565c0);
  flex-shrink: 0;
}

.attendance-kpi-card__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 18px;
}

.attendance-kpi-card__hint {
  font-size: 0.67rem;
  font-weight: 500;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attendance-kpi-card__pill {
  padding: 2px 7px;
  border-radius: 999px;
  background-color: var(--att-kpi-accent, #1565c0);
  color: #ffffff;
  font-size: 0.66rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}

:global(body.body--dark) .attendance-kpi-card {
  background-color: var(--dm-surface, #1b2330);
  border-color: var(--dm-border, #324258);
  box-shadow: none;
}

:global(body.body--dark) .attendance-kpi-card:hover,
:global(body.body--dark) .attendance-kpi-card--active {
  background-color: var(--dm-surface-2, #212b3a);
}

:global(body.body--dark) .attendance-kpi-card__label,
:global(body.body--dark) .attendance-kpi-card__value {
  color: var(--dm-text-primary, #e6edf5);
}

:global(body.body--dark) .attendance-kpi-card__hint {
  color: var(--dm-text-muted, #a4b1c2);
}

:global(body.body--dark) .attendance-kpi-card__icon-box {
  background-color: var(--dm-surface-3, #283446);
  color: var(--dm-text-secondary, #cad5e4);
}
</style>
