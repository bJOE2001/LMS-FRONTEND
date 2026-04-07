<template>
  <q-dialog
    :model-value="modelValue"
    @show="handleDialogShow"
    @update:model-value="onDialogModelUpdate"
  >
    <q-card class="application-calendar-card">
      <q-card-section class="row items-start no-wrap application-calendar-header">
        <div class="application-calendar-header-copy">
          <div class="text-h6 application-calendar-caption">{{ calendarPreviewEmployeeName }}</div>
        </div>
        <q-space />
        <q-btn flat dense round icon="close" color="grey-8" v-close-popup />
      </q-card-section>
      <q-separator />
      <q-card-section class="application-calendar-body">
        <div class="application-calendar-legend">
          <div class="application-calendar-legend-item">
            <span class="application-calendar-legend-swatch application-calendar-legend-swatch--pending" />
            <span>Pending ({{ calendarPreviewStateCounts.pending }})</span>
          </div>
          <div class="application-calendar-legend-item">
            <span class="application-calendar-legend-swatch application-calendar-legend-swatch--approved" />
            <span>Approved ({{ calendarPreviewStateCounts.approved }})</span>
          </div>
          <div class="application-calendar-legend-item">
            <span class="application-calendar-legend-swatch application-calendar-legend-swatch--request-update" />
            <span>Request Update ({{ calendarPreviewStateCounts.requestUpdate }})</span>
          </div>
        </div>

        <div
          :ref="handleSurfaceRef"
          class="leave-date-calendar application-calendar-surface"
          @pointerdown.capture="handleSurfacePointerDown"
          @click.capture="handleSurfaceClick"
        >
          <q-date
            :key="calendarPreviewKey"
            :model-value="calendarPreviewModel"
            multiple
            mask="YYYY-MM-DD"
            color="primary"
            :default-year-month="calendarPreviewYearMonth"
            @navigation="onNavigation"
            @update:model-value="onCalendarModelUpdate"
          />

          <div
            v-if="calendarPreviewDateWarning && calendarPreviewWarningStyle.left"
            :class="[
              'leave-date-warning-popover',
              `leave-date-warning-popover--${calendarPreviewWarningState}`,
            ]"
            :style="calendarPreviewWarningStyle"
          >
            <span>{{ calendarPreviewDateWarning }}</span>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  calendarPreviewModel: {
    type: [Array, String],
    default: () => [],
  },
  calendarPreviewKey: {
    type: Number,
    default: 0,
  },
  calendarPreviewYearMonth: {
    type: String,
    default: '',
  },
  calendarPreviewEmployeeName: {
    type: String,
    default: 'Employee',
  },
  calendarPreviewStateCounts: {
    type: Object,
    default: () => ({ pending: 0, approved: 0, requestUpdate: 0 }),
  },
  calendarPreviewDateWarning: {
    type: String,
    default: '',
  },
  calendarPreviewWarningStyle: {
    type: Object,
    default: () => ({}),
  },
  calendarPreviewWarningState: {
    type: String,
    default: 'pending',
  },
  onShow: {
    type: Function,
    default: null,
  },
  onNavigation: {
    type: Function,
    default: null,
  },
  onCalendarModelChange: {
    type: Function,
    default: null,
  },
  onSurfacePointerDown: {
    type: Function,
    default: null,
  },
  onSurfaceClick: {
    type: Function,
    default: null,
  },
  setCalendarPreviewRef: {
    type: Function,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'update:calendarPreviewModel'])

function onDialogModelUpdate(value) {
  emit('update:modelValue', value)
}

function onCalendarModelUpdate(value, reason, details) {
  emit('update:calendarPreviewModel', value)
  if (!props.onCalendarModelChange) return
  props.onCalendarModelChange(value, reason, details)
}

function handleDialogShow(event) {
  if (!props.onShow) return
  props.onShow(event)
}

function handleSurfacePointerDown(event) {
  if (!props.onSurfacePointerDown) return
  props.onSurfacePointerDown(event)
}

function handleSurfaceClick(event) {
  if (!props.onSurfaceClick) return
  props.onSurfaceClick(event)
}

function handleSurfaceRef(element) {
  if (!props.setCalendarPreviewRef) return
  props.setCalendarPreviewRef(element)
}
</script>

<style scoped>
.application-calendar-card {
  width: min(840px, 96vw);
  max-width: 96vw;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
}

.application-calendar-header {
  padding: 12px 14px 10px;
  background: #fff;
}

.application-calendar-header-copy {
  min-width: 0;
}

.application-calendar-title {
  color: #111827;
  font-weight: 700;
}

.application-calendar-caption {
  color: #374151;
  font-weight: 700;
}

.application-calendar-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #fff;
}

.application-calendar-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.application-calendar-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  color: #4b5563;
}

.application-calendar-legend-swatch {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid #d1d5db;
}

.application-calendar-legend-swatch--pending {
  background: #ffe29a;
  border-color: rgba(214, 154, 0, 0.85);
}

.application-calendar-legend-swatch--approved {
  background: #a8dcae;
  border-color: rgba(46, 125, 50, 0.85);
}

.application-calendar-legend-swatch--request-update {
  background: #d8ccff;
  border-color: rgba(109, 40, 217, 0.72);
}

.application-calendar-surface {
  position: relative;
  display: flex;
  justify-content: stretch;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  overflow: visible;
}

.application-calendar-actions {
  padding: 0 14px 14px;
  background: #fff;
}

.leave-date-calendar {
  position: relative;
}

.leave-date-warning-popover {
  position: absolute;
  z-index: 20;
  display: inline-flex;
  align-items: flex-start;
  padding: 8px 10px;
  border: 1px solid;
  border-radius: 12px;
  background: var(--leave-date-warning-bg, #fff1c9);
  border-color: var(--leave-date-warning-border, rgba(225, 192, 106, 0.8));
  color: var(--leave-date-warning-text, #9a6700);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.35;
}

.leave-date-warning-popover::after {
  content: '';
  position: absolute;
  left: var(--leave-date-warning-arrow-left, 24px);
  bottom: -7px;
  width: 12px;
  height: 12px;
  transform: rotate(45deg);
  border-right: 1px solid var(--leave-date-warning-border, rgba(225, 192, 106, 0.8));
  border-bottom: 1px solid var(--leave-date-warning-border, rgba(225, 192, 106, 0.8));
  background: var(--leave-date-warning-bg, #fff1c9);
}

.leave-date-warning-popover--pending {
  --leave-date-warning-bg: #ffe9b3;
  --leave-date-warning-border: rgba(214, 154, 0, 0.85);
  --leave-date-warning-text: #8a5700;
}

.leave-date-warning-popover--approved {
  --leave-date-warning-bg: #d0ebd4;
  --leave-date-warning-border: rgba(46, 125, 50, 0.85);
  --leave-date-warning-text: #20642b;
}

.leave-date-warning-popover--request-update {
  --leave-date-warning-bg: #eee7ff;
  --leave-date-warning-border: rgba(109, 40, 217, 0.72);
  --leave-date-warning-text: #4c1d95;
}

.leave-date-calendar :deep(.leave-date-calendar__day--locked) {
  opacity: 1 !important;
}

.leave-date-calendar :deep(.leave-date-calendar__day--locked > div),
.leave-date-calendar :deep(.leave-date-calendar__day--locked .q-btn) {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #2b2f33 !important;
  opacity: 1 !important;
  border-radius: 999px !important;
}

.leave-date-calendar :deep(.leave-date-calendar__day--locked .q-btn__content) {
  color: #2b2f33 !important;
  font-weight: 700;
}

.leave-date-calendar :deep(.leave-date-calendar__day--locked-pending > div),
.leave-date-calendar :deep(.leave-date-calendar__day--locked-pending .q-btn) {
  background: #ffe29a;
}

.leave-date-calendar :deep(.leave-date-calendar__day--locked-approved > div),
.leave-date-calendar :deep(.leave-date-calendar__day--locked-approved .q-btn) {
  background: #a8dcae;
}

.leave-date-calendar :deep(.leave-date-calendar__day--locked-request-update > div),
.leave-date-calendar :deep(.leave-date-calendar__day--locked-request-update .q-btn) {
  background: #d8ccff;
}

.application-calendar-surface :deep(.q-date) {
  box-shadow: none;
  width: 100%;
  max-width: none;
  font-size: 1rem;
}

.application-calendar-surface :deep(.q-date__header) {
  display: none;
}

.application-calendar-surface :deep(.q-date--portrait-standard .q-date__content) {
  height: 100%;
}

.application-calendar-surface :deep(.q-date__content) {
  width: 100%;
}

.application-calendar-surface :deep(.q-date__navigation) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto minmax(0, 1fr) auto auto auto;
  align-items: center;
  column-gap: 8px;
  height: auto;
  min-height: 48px;
  margin-bottom: 10px;
}

.application-calendar-surface :deep(.q-date__navigation > div) {
  width: auto;
  min-width: 0;
}

.application-calendar-surface :deep(.q-date__navigation > div:nth-child(1)) {
  grid-column: 2;
  justify-content: center;
}

.application-calendar-surface :deep(.q-date__navigation > div:nth-child(2)) {
  grid-column: 3;
  justify-content: center;
}

.application-calendar-surface :deep(.q-date__navigation > div:nth-child(3)) {
  grid-column: 4;
  justify-content: center;
}

.application-calendar-surface :deep(.q-date__navigation > div:nth-child(4)) {
  grid-column: 6;
  justify-content: center;
}

.application-calendar-surface :deep(.q-date__navigation > div:nth-child(5)) {
  grid-column: 7;
  justify-content: center;
}

.application-calendar-surface :deep(.q-date__navigation > div:nth-child(6)) {
  grid-column: 8;
  justify-content: center;
}

.application-calendar-surface :deep(.q-date__navigation .q-btn) {
  min-height: 0;
}

.application-calendar-surface :deep(.q-date__navigation > div:nth-child(2) .q-btn),
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(5) .q-btn) {
  padding: 2px 8px;
}

.application-calendar-surface :deep(.q-date__navigation > div:nth-child(2) .q-btn) {
  min-width: clamp(240px, 34vw, 340px);
}

.application-calendar-surface :deep(.q-date__navigation > div:nth-child(2) .q-btn__content),
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(5) .q-btn__content) {
  font-size: 1.24rem;
  font-weight: 600;
  line-height: 1.2;
}

.application-calendar-surface :deep(.q-date__navigation > div:nth-child(1) .q-btn),
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(3) .q-btn),
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(4) .q-btn),
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(6) .q-btn) {
  width: 34px;
  height: 34px;
}

.application-calendar-surface :deep(.q-date__navigation > div:nth-child(1) .q-icon),
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(3) .q-icon),
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(4) .q-icon),
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(6) .q-icon) {
  font-size: 1.4rem;
}

.application-calendar-surface :deep(.q-date__view) {
  min-height: 360px;
  padding: 12px 20px 14px;
  overflow: visible;
}

.application-calendar-surface :deep(.q-date__calendar-days-container) {
  min-height: 280px;
  overflow: visible;
}

.application-calendar-surface :deep(.q-date__calendar-item) {
  height: 40px;
  overflow: visible;
}

.application-calendar-surface :deep(.q-date__calendar-item > div),
.application-calendar-surface :deep(.q-date__calendar-item .q-btn) {
  min-width: 32px;
  height: 32px;
  border-radius: 999px !important;
}

@media (max-width: 599px) {
  .application-calendar-body {
    padding: 12px;
  }

  .application-calendar-surface {
    padding: 10px;
  }

  .application-calendar-surface :deep(.q-date) {
    width: 100%;
    max-width: 100%;
  }

  .application-calendar-surface :deep(.q-date__navigation) {
    column-gap: 4px;
    min-height: 42px;
  }

  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(2) .q-btn__content),
  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(5) .q-btn__content) {
    font-size: 1.08rem;
  }

  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(2) .q-btn) {
    min-width: min(180px, 46vw);
  }

  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(1) .q-btn),
  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(3) .q-btn),
  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(4) .q-btn),
  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(6) .q-btn) {
    width: 30px;
    height: 30px;
  }

  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(1) .q-icon),
  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(3) .q-icon),
  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(4) .q-icon),
  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(6) .q-icon) {
    font-size: 1.2rem;
  }

  .application-calendar-surface :deep(.q-date__view) {
    min-height: 250px;
    padding: 8px 10px 10px;
  }

  .application-calendar-surface :deep(.q-date__calendar-item) {
    height: 30px;
  }

  .application-calendar-surface :deep(.q-date__calendar-item > div),
  .application-calendar-surface :deep(.q-date__calendar-item .q-btn) {
    min-width: 28px;
    min-height: 28px;
  }

  .leave-date-warning-popover {
    font-size: 0.82rem;
  }
}
</style>
