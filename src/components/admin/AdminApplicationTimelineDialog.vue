<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    position="standard"
    @update:model-value="onDialogModelUpdate"
  >
    <q-card v-if="selectedApp" class="application-timeline-card" style="width: 560px; max-width: 94vw">
      <q-card-section class="row items-start no-wrap application-timeline-header">
        <div class="application-timeline-header-copy">
          <div class="text-h6 application-timeline-header-title">Application Timeline</div>
          <div class="application-timeline-header-caption">
            Track this application through department and HR review
          </div>
        </div>
        <q-space />
        <q-btn flat dense round icon="close" color="grey-8" v-close-popup />
      </q-card-section>
      <q-separator />
      <q-card-section class="application-timeline-content">
        <template v-if="loadingTimeline">
          <div class="application-timeline-panel">
            <div
              v-for="index in 5"
              :key="`timeline-skeleton-${index}`"
              class="application-timeline-item"
            >
              <div class="application-timeline-marker-column">
                <q-skeleton type="circle" size="28px" class="application-timeline-skeleton-marker" />
                <div
                  v-if="index < 5"
                  class="application-timeline-line application-timeline-line--neutral application-timeline-skeleton-line"
                />
              </div>

              <div class="application-timeline-body">
                <q-skeleton type="text" width="34%" class="application-timeline-skeleton-meta" />
                <q-skeleton type="text" width="72%" class="application-timeline-skeleton-title" />
                <q-skeleton type="text" width="56%" class="application-timeline-skeleton-actor" />
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="application-timeline-panel">
            <div
              v-for="(entry, index) in timelineEntries"
              :key="`${entry.title}-${index}`"
              class="application-timeline-item"
            >
              <div class="application-timeline-marker-column">
                <div
                  class="application-timeline-marker"
                  :class="`application-timeline-marker--${resolveEntryTone(entry)}`"
                >
                  <q-icon :name="resolveEntryIcon(entry)" size="16px" />
                </div>
                <div
                  v-if="index < timelineEntries.length - 1"
                  class="application-timeline-line"
                  :class="`application-timeline-line--${resolveEntryTone(entry)}`"
                />
              </div>

              <div class="application-timeline-body">
                <div v-if="entry.subtitle" class="application-timeline-meta">
                  {{ entry.subtitle }}
                </div>
                <div class="application-timeline-title">
                  {{ entry.title }}
                </div>
                <div v-if="resolveEntryActor(entry)" class="application-timeline-actor">
                  Action by: {{ resolveEntryActor(entry) }}
                </div>
                <div v-else-if="entry.description" class="application-timeline-actor">
                  {{ entry.description }}
                </div>
              </div>
            </div>
          </div>
        </template>
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
  selectedApp: {
    type: Object,
    default: null,
  },
  loadingTimeline: {
    type: Boolean,
    default: false,
  },
  timelineEntries: {
    type: Array,
    default: () => [],
  },
  hasApplicationAttachment: {
    type: Function,
    default: () => false,
  },
  viewApplicationAttachment: {
    type: Function,
    default: null,
  },
  getTimelineEntryTone: {
    type: Function,
    default: () => 'neutral',
  },
  getTimelineEntryIcon: {
    type: Function,
    default: () => 'schedule',
  },
})

const emit = defineEmits(['update:modelValue'])

function onDialogModelUpdate(value) {
  emit('update:modelValue', value)
}

function resolveEntryTone(entry) {
  return props.getTimelineEntryTone(entry) || 'neutral'
}

function resolveEntryIcon(entry) {
  return props.getTimelineEntryIcon(entry) || 'schedule'
}

function resolveEntryActor(entry) {
  const actor = String(entry?.actor || '').trim()
  if (!actor) return ''
  if (actor.toLowerCase() === 'unknown') return ''
  return actor
}
</script>

<style scoped>
.application-timeline-card {
  border-radius: 12px;
  overflow: hidden;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
}

.application-timeline-header {
  padding: 12px 14px 10px;
  background: #fff;
}

.application-timeline-header-copy {
  min-width: 0;
}

.application-timeline-header-title {
  color: #111827;
  font-weight: 700;
}

.application-timeline-header-caption {
  margin-top: 2px;
  font-size: 0.78rem;
  color: #6b7280;
}

.application-timeline-content {
  padding: 14px;
  background: #fff;
  overflow-y: auto;
}

.application-timeline-panel {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: linear-gradient(180deg, #f7f8fb 0%, #f4f5f8 100%);
  padding: 10px 12px;
}

.application-timeline-item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 12px;
}

.application-timeline-item + .application-timeline-item {
  margin-top: 2px;
}

.application-timeline-marker-column {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.application-timeline-marker {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.application-timeline-marker--positive {
  background: #22c55e;
}

.application-timeline-marker--warning {
  background: #f59e0b;
}

.application-timeline-marker--recalled {
  background: #2563eb;
}

.application-timeline-marker--negative {
  background: #ef4444;
}

.application-timeline-marker--neutral {
  background: #cbd5e1;
  color: #475569;
}

.application-timeline-line {
  width: 2px;
  flex: 1 1 auto;
  min-height: 42px;
  margin-top: 4px;
  border-radius: 999px;
}

.application-timeline-line--positive {
  background: #22c55e;
}

.application-timeline-line--warning {
  background: #f59e0b;
}

.application-timeline-line--recalled {
  background: #2563eb;
}

.application-timeline-line--negative {
  background: #ef4444;
}

.application-timeline-line--neutral {
  background: #cbd5e1;
}

.application-timeline-body {
  padding-bottom: 18px;
}

.application-timeline-meta {
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.application-timeline-title {
  margin-top: 2px;
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.3;
}

.application-timeline-actor {
  margin-top: 4px;
  font-size: 0.78rem;
  color: #64748b;
  line-height: 1.45;
}

.application-timeline-skeleton-attachment {
  width: 172px;
  height: 30px;
  border-radius: 8px;
}

.application-timeline-skeleton-marker {
  border-radius: 50%;
}

.application-timeline-skeleton-line {
  min-height: 42px;
}

.application-timeline-skeleton-meta {
  margin-top: 2px;
}

.application-timeline-skeleton-title {
  margin-top: 4px;
}

.application-timeline-skeleton-actor {
  margin-top: 6px;
}

@media (max-width: 599px) {
  .application-timeline-content {
    padding: 12px;
  }

  .application-timeline-panel {
    padding: 10px;
  }

  .application-timeline-item {
    grid-template-columns: 30px minmax(0, 1fr);
    gap: 10px;
  }

  .application-timeline-marker {
    width: 24px;
    height: 24px;
  }
}
</style>
