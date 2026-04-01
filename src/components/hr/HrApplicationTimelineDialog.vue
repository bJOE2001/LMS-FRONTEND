<template>
  <q-dialog v-model="dialogModel" persistent position="standard">
    <q-card v-if="application" class="application-timeline-card" style="width: 560px; max-width: 94vw">
      <q-card-section class="row items-start no-wrap application-timeline-header">
        <div class="application-timeline-header-copy">
          <div class="text-h6 application-timeline-header-title">Application Timeline</div>
          <div class="application-timeline-header-caption">
            Track this application through department and HR review
          </div>
          <div v-if="isReceivedState" class="application-timeline-header-received">
            {{ receivedSummaryText }}
          </div>
          <div v-if="isReleasedState && releasedSummaryText" class="application-timeline-header-released">
            {{ releasedSummaryText }}
          </div>
        </div>
        <q-space />
        <div class="row items-center no-wrap q-gutter-xs application-timeline-header-actions">
          <q-btn flat dense round icon="close" color="grey-8" v-close-popup />
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="application-timeline-content">
        <div v-if="hasAttachmentState" class="q-mb-md">
          <div class="text-caption text-grey-7 q-mb-xs">Attachment</div>
          <q-btn
            flat
            dense
            no-caps
            icon="attach_file"
            color="primary"
            label="View Attachment"
            @click="handleViewAttachmentClick"
          />
        </div>

        <div class="application-timeline-panel">
          <div
            v-for="(entry, index) in timelineEntries"
            :key="`${entry.title}-${index}`"
            class="application-timeline-item"
          >
            <div class="application-timeline-marker-column">
              <div
                class="application-timeline-marker"
                :class="`application-timeline-marker--${getTimelineEntryTone(entry)}`"
              >
                <q-icon :name="getTimelineEntryIcon(entry)" size="16px" />
              </div>
              <div
                v-if="index < timelineEntries.length - 1"
                class="application-timeline-line"
                :class="`application-timeline-line--${getTimelineEntryTone(entry)}`"
              />
            </div>

            <div class="application-timeline-body">
              <div v-if="entry.subtitle" class="application-timeline-meta">
                {{ entry.subtitle }}
              </div>
              <div class="application-timeline-title">
                {{ entry.title }}
              </div>
              <div v-if="entry.actor" class="application-timeline-actor">
                Action by: {{ entry.actor }}
              </div>
              <div v-else-if="entry.description" class="application-timeline-actor">
                {{ entry.description }}
              </div>
            </div>
          </div>
        </div>
      </q-card-section>
      <q-separator />
      <q-card-actions class="application-timeline-footer">
        <div class="application-timeline-footer-actions">
          <q-btn
            v-if="canReceiveState"
            unelevated
            dense
            no-caps
            icon="inventory_2"
            color="primary"
            label="Receive"
            :loading="receiveLoading"
            class="application-timeline-footer-button"
            @click="handleReceiveClick"
          />
          <q-btn
            v-else-if="isReceivedState"
            flat
            dense
            no-caps
            disable
            icon="inventory_2"
            color="positive"
            label="Received"
            class="application-timeline-footer-button application-timeline-footer-button--completed"
          />
          <q-btn
            v-if="canReleaseState"
            unelevated
            dense
            no-caps
            icon="outbox"
            color="secondary"
            label="Released"
            :loading="releaseLoading"
            class="application-timeline-footer-button"
            @click="handleReleaseClick"
          />
          <q-btn
            v-else-if="isReleasedState"
            flat
            dense
            no-caps
            disable
            icon="outbox"
            color="positive"
            label="Released"
            class="application-timeline-footer-button application-timeline-footer-button--completed"
          />
        </div>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  application: {
    type: Object,
    default: null,
  },
  timeline: {
    type: Array,
    default: () => [],
  },
  buildTimeline: {
    type: Function,
    default: null,
  },
  canReceive: {
    type: Boolean,
    default: false,
  },
  canReceiveApplication: {
    type: Function,
    default: null,
  },
  isReceived: {
    type: Boolean,
    default: false,
  },
  isApplicationReceivedByHr: {
    type: Function,
    default: null,
  },
  receivedSummary: {
    type: String,
    default: '',
  },
  getReceivedByHrSummary: {
    type: Function,
    default: null,
  },
  hasAttachment: {
    type: Boolean,
    default: false,
  },
  hasApplicationAttachment: {
    type: Function,
    default: null,
  },
  receiveLoading: {
    type: Boolean,
    default: false,
  },
  canRelease: {
    type: Boolean,
    default: false,
  },
  canReleaseApplication: {
    type: Function,
    default: null,
  },
  isReleased: {
    type: Boolean,
    default: false,
  },
  isApplicationReleased: {
    type: Function,
    default: null,
  },
  releasedSummary: {
    type: String,
    default: '',
  },
  getReleasedByHrSummary: {
    type: Function,
    default: null,
  },
  releaseLoading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'receive', 'release', 'view-attachment'])
const localReceivedStateByKey = ref({})
const localReleasedStateByKey = ref({})
const lastRequestedReceiveKey = ref('')
const lastRequestedReleaseKey = ref('')

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const applicationKey = computed(() => getApplicationKey(props.application))

const localReceivedState = computed(() => {
  const key = applicationKey.value
  if (!key) return null
  return localReceivedStateByKey.value[key] || null
})

const localReleasedState = computed(() => {
  const key = applicationKey.value
  if (!key) return null
  return localReleasedStateByKey.value[key] || null
})

const backendReceivedState = computed(() => isBackendReceivedState(props.application))
const backendReleasedState = computed(() => isBackendReleasedState(props.application))

const isPaperFlowApplication = computed(() => {
  const appType = String(props.application?.application_type || '')
    .trim()
    .toUpperCase()
  if (appType) return appType !== 'COC'

  const leaveTypeName = String(props.application?.leaveType || props.application?.leave_type_name || '')
    .trim()
    .toLowerCase()
  return leaveTypeName !== 'coc application' && leaveTypeName !== 'coc'
})

const timelineEntries = computed(() => {
  const baseTimeline = getBaseTimelineEntries()
  if (!isPaperFlowApplication.value) return baseTimeline

  const existingReceivedEntry = baseTimeline.find((entry) => isEntryTitle(entry, 'Received Application'))
  const existingReleasedEntry = baseTimeline.find((entry) => isEntryTitle(entry, 'Released Application'))
  const cleanedTimeline = baseTimeline.filter(
    (entry) =>
      !isEntryTitle(entry, 'Received Application') && !isEntryTitle(entry, 'Released Application'),
  )
  const existingClosedEntries = cleanedTimeline.filter((entry) =>
    isEntryTitle(entry, 'Application Closed'),
  )
  const coreEntries = cleanedTimeline.filter((entry) => !isEntryTitle(entry, 'Application Closed'))

  const receivedEntry = buildReceivedTimelineEntry(existingReceivedEntry)
  const receivedInsertIndex = getReceivedInsertionIndex(coreEntries)
  coreEntries.splice(receivedInsertIndex, 0, receivedEntry)

  const releasedEntry = buildReleasedTimelineEntry(existingReleasedEntry)
  const closedEntry = buildClosedTimelineEntry(existingClosedEntries[0] || null)

  const finalizedEntries = [...coreEntries, releasedEntry]
  if (closedEntry) {
    finalizedEntries.push(closedEntry)
  }

  return finalizedEntries
})

const canReceiveState = computed(() => {
  if (!props.application) return false
  if (isReceivedState.value) return false

  if (typeof props.canReceiveApplication === 'function') {
    return Boolean(props.canReceiveApplication(props.application))
  }

  return props.canReceive
})

const isReceivedState = computed(() => {
  return backendReceivedState.value || Boolean(localReceivedState.value)
})

const canReleaseState = computed(() => {
  if (!props.application) return false
  if (isReleasedState.value) return false

  if (typeof props.canReleaseApplication === 'function') {
    return Boolean(props.canReleaseApplication(props.application))
  }

  if (props.canRelease) return true

  return isReceivedState.value
})

const isReleasedState = computed(() => {
  if (typeof props.isApplicationReleased === 'function') {
    return Boolean(props.isApplicationReleased(props.application) || localReleasedState.value)
  }

  return Boolean(props.isReleased || localReleasedState.value)
})

const receivedSummaryText = computed(() => {
  if (typeof props.getReceivedByHrSummary === 'function') {
    const summary = String(props.getReceivedByHrSummary(props.application) || '').trim()
    if (summary) return summary
  }

  if (localReceivedState.value) {
    return `Received by ${localReceivedState.value.actor} on ${formatDateTime(localReceivedState.value.at)}`
  }

  return String(props.receivedSummary || '').trim()
})

const releasedSummaryText = computed(() => {
  if (typeof props.getReleasedByHrSummary === 'function') {
    const summary = String(props.getReleasedByHrSummary(props.application) || '').trim()
    if (summary) return summary
  }

  if (localReleasedState.value) {
    return `Released by ${localReleasedState.value.actor} on ${formatDateTime(localReleasedState.value.at)}`
  }

  return String(props.releasedSummary || '').trim()
})

const hasAttachmentState = computed(() => {
  if (typeof props.hasApplicationAttachment === 'function') {
    return Boolean(props.hasApplicationAttachment(props.application))
  }

  return props.hasAttachment
})

function handleReceiveClick() {
  if (!props.application || !canReceiveState.value) return

  lastRequestedReceiveKey.value = applicationKey.value
  markLocalActionAsCompleted(localReceivedStateByKey, 'HR')
  emit('receive', props.application)
}

function handleReleaseClick() {
  if (!props.application || !canReleaseState.value) return
  lastRequestedReleaseKey.value = applicationKey.value
  markLocalActionAsCompleted(localReleasedStateByKey, 'HR')
  emit('release', props.application)
}

function handleViewAttachmentClick() {
  if (!props.application) return
  emit('view-attachment', props.application)
}

function getBaseTimelineEntries() {
  if (typeof props.buildTimeline === 'function') {
    const computedTimeline = props.buildTimeline(props.application)
    return Array.isArray(computedTimeline) ? computedTimeline.map((entry) => ({ ...entry })) : []
  }

  return Array.isArray(props.timeline) ? props.timeline.map((entry) => ({ ...entry })) : []
}

function markLocalActionAsCompleted(stateByKeyRef, actor = 'HR') {
  const key = applicationKey.value
  if (!key) return

  stateByKeyRef.value = {
    ...stateByKeyRef.value,
    [key]: {
      actor: String(actor || 'HR').trim() || 'HR',
      at: new Date().toISOString(),
    },
  }
}

function clearLocalActionState(stateByKeyRef, key) {
  if (!key || !stateByKeyRef.value[key]) return

  const nextState = { ...stateByKeyRef.value }
  delete nextState[key]
  stateByKeyRef.value = nextState
}

function getApplicationKey(application) {
  if (!application || typeof application !== 'object') return ''

  const id = String(application?.id ?? '').trim()
  if (!id) return ''

  const type = String(application?.application_type || 'LEAVE')
    .trim()
    .toUpperCase()
  return `${type || 'LEAVE'}:${id}`
}

function normalizeEntryTitle(entry) {
  return String(entry?.title || '')
    .trim()
    .toLowerCase()
}

function isEntryTitle(entry, title) {
  return normalizeEntryTitle(entry) === String(title || '').trim().toLowerCase()
}

function isHrPhaseEntry(entry) {
  const normalizedTitle = normalizeEntryTitle(entry)
  return (
    normalizedTitle.includes('pending hr review') ||
    normalizedTitle.includes('approved by hr') ||
    normalizedTitle.includes('application disapproved') ||
    normalizedTitle.includes('recalled by hr') ||
    normalizedTitle.includes('pending edit review (hr)') ||
    normalizedTitle.includes('edit request approved') ||
    normalizedTitle.includes('edit request rejected') ||
    normalizedTitle.includes('current status')
  )
}

function getReceivedInsertionIndex(entries) {
  const adminCompletedIndex = entries.findIndex((entry) => isEntryTitle(entry, 'Admin Review Completed'))
  if (adminCompletedIndex >= 0) return adminCompletedIndex + 1

  const adminPendingIndex = entries.findIndex((entry) =>
    isEntryTitle(entry, 'Department Admin Review Pending'),
  )
  if (adminPendingIndex >= 0) return adminPendingIndex + 1

  const hrPhaseIndex = entries.findIndex((entry) => isHrPhaseEntry(entry))
  if (hrPhaseIndex >= 0) return hrPhaseIndex

  return entries.length
}

function buildReceivedTimelineEntry(existingEntry = null) {
  const isCompleted = isReceivedState.value
  if (!isCompleted) {
    return {
      title: 'Received Application',
      subtitle: 'Upcoming',
      description: 'HR will confirm receipt of the hard copy leave application form.',
      icon: 'radio_button_unchecked',
      color: 'grey-5',
    }
  }

  const localState = localReceivedState.value
  const subtitle =
    String(existingEntry?.subtitle || '').trim() ||
    (localState ? formatDateTime(localState.at) : '') ||
    'Completed'
  const actor =
    String(existingEntry?.actor || '').trim() ||
    (localState ? String(localState.actor || '').trim() : '') ||
    null

  return {
    title: 'Received Application',
    subtitle,
    description:
      String(existingEntry?.description || '').trim() ||
      'HR confirmed receipt of the hard copy leave application form.',
    icon: String(existingEntry?.icon || '').trim() || 'inventory_2',
    color: String(existingEntry?.color || '').trim() || 'positive',
    actor: actor || undefined,
  }
}

function buildReleasedTimelineEntry(existingEntry = null) {
  const isCompleted = isReleasedState.value
  if (!isCompleted) {
    return {
      title: 'Released Application',
      subtitle: 'Upcoming',
      description: 'The physical document will be released before final closure.',
      icon: 'radio_button_unchecked',
      color: 'grey-5',
    }
  }

  const localState = localReleasedState.value
  const subtitle =
    String(existingEntry?.subtitle || '').trim() ||
    (localState ? formatDateTime(localState.at) : '') ||
    'Completed'
  const actor =
    String(existingEntry?.actor || '').trim() ||
    (localState ? String(localState.actor || '').trim() : '') ||
    null

  return {
    title: 'Released Application',
    subtitle,
    description:
      String(existingEntry?.description || '').trim() ||
      'Physical leave document has been released.',
    icon: String(existingEntry?.icon || '').trim() || 'outbox',
    color: String(existingEntry?.color || '').trim() || 'positive',
    actor: actor || undefined,
  }
}

function getDefaultClosedTimelineEntry() {
  return {
    title: 'Application Closed',
    subtitle: 'Upcoming',
    description: 'Application workflow is complete.',
    icon: 'radio_button_unchecked',
    color: 'grey-5',
  }
}

function buildClosedTimelineEntry(existingEntry = null) {
  const baseEntry = existingEntry ? { ...existingEntry } : getDefaultClosedTimelineEntry()
  if (isReleasedState.value) return baseEntry

  return {
    ...baseEntry,
    subtitle: 'Upcoming',
    description: 'Application will be closed after document release.',
    icon: 'radio_button_unchecked',
    color: 'grey-5',
    actor: undefined,
  }
}

function formatDateTime(value) {
  if (!value) return ''

  const raw = String(value).trim()
  if (!raw) return ''

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw

  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getTimelineEntryTone(entry) {
  const color = String(entry?.color || '').toLowerCase()
  const icon = String(entry?.icon || '').toLowerCase()

  if (color.includes('negative') || icon.includes('cancel')) return 'negative'
  if (color.includes('warning') || icon.includes('pending')) return 'warning'
  if (color.includes('grey') || icon.includes('radio_button_unchecked')) return 'neutral'
  return 'positive'
}

function getTimelineEntryIcon(entry) {
  const tone = getTimelineEntryTone(entry)
  if (tone === 'negative') return 'close'
  if (tone === 'warning') return 'schedule'
  if (tone === 'neutral') return 'radio_button_unchecked'
  return 'check'
}

function isBackendReceivedState(application) {
  if (typeof props.isApplicationReceivedByHr === 'function') {
    return Boolean(props.isApplicationReceivedByHr(application))
  }

  return Boolean(props.isReceived)
}

function isBackendReleasedState(application) {
  if (typeof props.isApplicationReleased === 'function') {
    return Boolean(props.isApplicationReleased(application))
  }

  return Boolean(props.isReleased)
}

watch(
  () => props.receiveLoading,
  (isLoading, wasLoading) => {
    if (isLoading || !wasLoading) return

    const key = String(lastRequestedReceiveKey.value || '').trim()
    if (!key) return

    const isCurrentApplicationKey = applicationKey.value === key
    if (isCurrentApplicationKey && !backendReceivedState.value) {
      clearLocalActionState(localReceivedStateByKey, key)
    }

    lastRequestedReceiveKey.value = ''
  },
)

watch(
  () => props.releaseLoading,
  (isLoading, wasLoading) => {
    if (isLoading || !wasLoading) return

    const key = String(lastRequestedReleaseKey.value || '').trim()
    if (!key) return

    const isCurrentApplicationKey = applicationKey.value === key
    if (isCurrentApplicationKey && !backendReleasedState.value) {
      clearLocalActionState(localReleasedStateByKey, key)
    }

    lastRequestedReleaseKey.value = ''
  },
)
</script>

<!-- Unscoped: q-dialog teleports to <body>, so scoped styles won't reliably apply -->
<style>
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

.application-timeline-header-received {
  margin-top: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #166534;
}

.application-timeline-header-released {
  margin-top: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #0f766e;
}

.application-timeline-header-actions {
  flex: 0 0 auto;
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

.application-timeline-footer {
  padding: 10px 14px 12px;
  background: #fff;
  justify-content: flex-start;
}

.application-timeline-footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.application-timeline-footer-button {
  min-height: 34px;
  font-weight: 700;
}

.application-timeline-footer-button--completed {
  opacity: 1 !important;
}
</style>
