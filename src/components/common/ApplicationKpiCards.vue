<template>
  <div
    :class="[rowClass, { 'content-reloading': reloading }]"
  >
    <!-- Primary Card: Applications + Employment Type Breakdown -->
    <div :class="colClass">
      <div
        role="button"
        tabindex="0"
        class="app-kpi-card app-kpi-card--primary"
        @click="emit('select', 'total')"
        @keydown.enter.prevent="emit('select', 'total')"
        @keydown.space.prevent="emit('select', 'total')"
      >
        <div class="app-kpi-card__top">
          <div class="app-kpi-card__identity">
            <span class="app-kpi-card__icon-box" aria-hidden="true">
              <q-icon name="description" size="17px" />
            </span>
            <span class="app-kpi-card__title">Applications</span>
          </div>
          <span class="app-kpi-card__value tabular-nums">
            {{ totalCount }}
          </span>
        </div>

        <div class="app-kpi-breakdown">
          <div
            v-for="card in breakdownCards"
            :key="card.key"
            class="app-kpi-breakdown__item"
            :style="getBreakdownCardStyle(card)"
          >
            <span class="app-kpi-breakdown__dot" aria-hidden="true" />
            <span class="app-kpi-breakdown__label">{{ card.label }}</span>
            <span class="app-kpi-breakdown__value tabular-nums">{{ card.value }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Status KPI Cards -->
    <div
      v-for="card in statusCards"
      :key="card.key"
      :class="colClass"
    >
      <div
        role="button"
        tabindex="0"
        class="app-kpi-card"
        :class="[`app-kpi-card--${card.variant}`, { 'is-urgent': card.isUrgent }]"
        @click="emit('select', card.routeStatus)"
        @keydown.enter.prevent="emit('select', card.routeStatus)"
        @keydown.space.prevent="emit('select', card.routeStatus)"
      >
        <div class="app-kpi-card__top">
          <div class="app-kpi-card__identity">
            <span class="app-kpi-card__icon-box" aria-hidden="true">
              <q-icon :name="card.icon" size="17px" />
            </span>
            <span class="app-kpi-card__title">{{ card.label }}</span>
            <span v-if="card.isUrgent" class="app-kpi-card__alert-badge">
              <q-icon name="priority_high" size="11px" />
            </span>
          </div>
          <span class="app-kpi-card__value tabular-nums">
            {{ card.value }}
          </span>
        </div>

        <div class="app-kpi-card__footer">
          <div class="app-kpi-card__meta-row">
            <span class="app-kpi-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  totalCount: {
    type: Number,
    default: 0,
  },
  breakdownCards: {
    type: Array,
    default: () => [],
  },
  statusCards: {
    type: Array,
    default: () => [],
  },
  colClass: {
    type: String,
    default: 'col-12 col-sm-6 col-md',
  },
  rowClass: {
    type: String,
    default: 'row q-col-gutter-sm q-mb-sm stat-cards-row',
  },
  reloading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select'])

function getBreakdownCardStyle(card) {
  return {
    '--app-mini-accent': card.accent || '#64748b',
    '--app-mini-hover-bg': card.bg || '#f1f5f9',
  }
}
</script>

<style scoped>
.stat-cards-row > div {
  display: flex;
}

.app-kpi-card {
  --kpi-accent: #15803d;
  --kpi-icon-bg: #dcfce7;
  --kpi-icon-fg: #166534;
  --kpi-pill-bg: #f1f5f9;
  --kpi-pill-fg: #475569;
  --kpi-hover-border: #86efac;

  position: relative;
  width: 100%;
  height: 100%;
  min-height: 92px;
  padding: 9px 11px 8px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background-color: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 7px;
  cursor: pointer;
  user-select: none;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    border-color 0.16s ease,
    background-color 0.16s ease;
}

.app-kpi-card:hover {
  transform: translateY(-2px);
  border-color: var(--kpi-hover-border);
  box-shadow: 0 10px 22px -8px rgba(15, 23, 42, 0.12);
}

.app-kpi-card:focus-visible {
  outline: 2px solid var(--kpi-accent);
  outline-offset: 2px;
}

.app-kpi-card--primary {
  --kpi-accent: #2e7d32;
  --kpi-icon-bg: #e8f5e9;
  --kpi-icon-fg: #1b5e20;
  --kpi-hover-border: #86efac;
}

.app-kpi-card--amber {
  --kpi-accent: #d97706;
  --kpi-icon-bg: #fef3c7;
  --kpi-icon-fg: #b45309;
  --kpi-pill-bg: #fffbeb;
  --kpi-pill-fg: #b45309;
  --kpi-hover-border: #fcd34d;
}

.app-kpi-card--green {
  --kpi-accent: #16a34a;
  --kpi-icon-bg: #dcfce7;
  --kpi-icon-fg: #15803d;
  --kpi-pill-bg: #f0fdf4;
  --kpi-pill-fg: #15803d;
  --kpi-hover-border: #86efac;
}

.app-kpi-card--red {
  --kpi-accent: #dc2626;
  --kpi-icon-bg: #fee2e2;
  --kpi-icon-fg: #b91c1c;
  --kpi-pill-bg: #fef2f2;
  --kpi-pill-fg: #b91c1c;
  --kpi-hover-border: #fca5a5;
}

.app-kpi-card--slate {
  --kpi-accent: #475569;
  --kpi-icon-bg: #f1f5f9;
  --kpi-icon-fg: #334155;
  --kpi-pill-bg: #f8fafc;
  --kpi-pill-fg: #475569;
  --kpi-hover-border: #cbd5e1;
}

.app-kpi-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.app-kpi-card__identity {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.app-kpi-card__icon-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background-color: var(--kpi-icon-bg);
  color: var(--kpi-icon-fg);
  flex-shrink: 0;
}

.app-kpi-card__title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #334155;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-kpi-card__alert-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background-color: #f59e0b;
  color: #ffffff;
  flex-shrink: 0;
}

.app-kpi-card__value {
  font-size: clamp(1.35rem, 1.8vw, 1.6rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
  color: #1b5e20;
  flex-shrink: 0;
}

.app-kpi-card--amber .app-kpi-card__value {
  color: #b45309;
}

.app-kpi-card--green .app-kpi-card__value {
  color: #15803d;
}

.app-kpi-card--red .app-kpi-card__value {
  color: #b91c1c;
}

.app-kpi-card--slate .app-kpi-card__value {
  color: #334155;
}

.app-kpi-breakdown {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
}

.app-kpi-breakdown__item {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: 2px 6px;
  border-radius: 6px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  transition: background-color 0.14s ease;
}

.app-kpi-breakdown__item:hover {
  background-color: var(--app-mini-hover-bg, #f1f5f9);
}

.app-kpi-breakdown__dot {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background-color: var(--app-mini-accent, #64748b);
  flex-shrink: 0;
}

.app-kpi-breakdown__label {
  font-size: 0.64rem;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1 1 auto;
}

.app-kpi-breakdown__value {
  font-size: 0.68rem;
  font-weight: 700;
  color: #0f172a;
  flex-shrink: 0;
}

.app-kpi-card__footer {
  margin-top: auto;
}

.app-kpi-card__meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.app-kpi-card__hint {
  font-size: 0.67rem;
  font-weight: 500;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:global(body.body--dark) .app-kpi-card {
  background-color: var(--dm-surface, #1b2330);
  border-color: var(--dm-border, #324258);
  box-shadow: none;
}

:global(body.body--dark) .app-kpi-card:hover {
  background-color: var(--dm-surface-2, #212b3a);
  box-shadow: 0 10px 22px -8px rgba(0, 0, 0, 0.45);
}

:global(body.body--dark) .app-kpi-card__title,
:global(body.body--dark) .app-kpi-card__value,
:global(body.body--dark) .app-kpi-breakdown__value {
  color: var(--dm-text-primary, #e6edf5);
}

:global(body.body--dark) .app-kpi-card__hint,
:global(body.body--dark) .app-kpi-breakdown__label {
  color: var(--dm-text-muted, #a4b1c2);
}

:global(body.body--dark) .app-kpi-card__icon-box {
  background-color: var(--dm-surface-3, #283446);
  color: var(--dm-text-secondary, #cad5e4);
}

:global(body.body--dark) .app-kpi-breakdown__item {
  background-color: var(--dm-surface-2, #212b3a);
  border-color: var(--dm-border, #324258);
}

@media (max-width: 599px) {
  .stat-cards-row {
    margin: 0 0 4px !important;
  }

  .stat-cards-row > div {
    padding: 4px 0 0 !important;
  }

  .app-kpi-card {
    min-height: 0;
    padding: 10px 12px;
    gap: 6px;
  }

  .app-kpi-card__value {
    font-size: 1.3rem;
  }
}
</style>
