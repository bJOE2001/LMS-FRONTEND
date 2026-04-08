<template>
  <q-dialog v-model="dialogModel" persistent position="standard">
    <q-card
      v-if="application"
      class="application-timeline-card"
      style="width: 560px; max-width: 94vw"
    >
      <q-card-section class="row items-start no-wrap application-timeline-header">
        <div class="application-timeline-header-copy">
          <div class="text-h6 application-timeline-header-title">Application Timeline</div>
          <div class="application-timeline-header-caption">
            Track this application through department and HR review
          </div>
          <!-- <div v-if="isReceivedState" class="application-timeline-header-received">
            {{ receivedSummaryText }}
          </div>
          <div v-if="isReleasedState && releasedSummaryText" class="application-timeline-header-released">
            {{ releasedSummaryText }}
          </div> -->
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
            :label="receiveActionLabel"
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
            :label="receivedActionLabel"
            class="application-timeline-footer-button application-timeline-footer-button--completed"
          />
          <q-btn
            v-if="canReleaseState"
            unelevated
            dense
            no-caps
            icon="outbox"
            color="secondary"
            :label="releaseActionLabel"
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
            :label="releasedActionLabel"
            class="application-timeline-footer-button application-timeline-footer-button--completed"
          />
        </div>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const REQUEST_ACTION_UPDATE = 'REQUEST_UPDATE'
const REQUEST_ACTION_CANCEL = 'REQUEST_CANCEL'

function normalizeLeaveRequestActionTypeToken(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  if (!normalized) return ''

  if (
    normalized === REQUEST_ACTION_CANCEL ||
    normalized === 'CANCEL_REQUEST' ||
    normalized === 'REQUEST_CANCELLATION' ||
    normalized === 'CANCELLATION_REQUEST' ||
    normalized === 'LEAVE_CANCELLATION_REQUEST'
  ) {
    return REQUEST_ACTION_CANCEL
  }

  if (
    normalized === REQUEST_ACTION_UPDATE ||
    normalized === 'UPDATE_REQUEST' ||
    normalized === 'EDIT_REQUEST' ||
    normalized === 'REQUEST_EDIT'
  ) {
    return REQUEST_ACTION_UPDATE
  }

  return ''
}

function resolveLeaveRequestActionTypeFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return ''

  const candidates = [
    payload?.action_type,
    payload?.actionType,
    payload?.request_action_type,
    payload?.requestActionType,
    payload?.type,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeLeaveRequestActionTypeToken(candidate)
    if (normalized) return normalized
  }

  return ''
}

function parsePendingUpdatePayload(application) {
  const payloadCandidates = [
    application?.pending_update,
    application?.pendingUpdate,
    application?.latest_update_request_payload,
    application?.latestUpdateRequestPayload,
  ]

  for (const candidate of payloadCandidates) {
    if (!candidate) continue
    if (candidate && typeof candidate === 'object') return candidate

    if (typeof candidate === 'string') {
      const trimmed = candidate.trim()
      if (!trimmed) continue

      try {
        const parsed = JSON.parse(trimmed)
        if (parsed && typeof parsed === 'object') return parsed
      } catch {
        // Ignore malformed payload strings.
      }
    }
  }

  return null
}

function resolveLeaveRequestActionType(application = null) {
  if (!application || typeof application !== 'object') return ''

  const explicitCandidates = [
    application?.pending_update_action_type,
    application?.pendingUpdateActionType,
    application?.latest_update_request_action_type,
    application?.latestUpdateRequestActionType,
  ]

  for (const candidate of explicitCandidates) {
    const normalized = normalizeLeaveRequestActionTypeToken(candidate)
    if (normalized) return normalized
  }

  const payloadType = resolveLeaveRequestActionTypeFromPayload(parsePendingUpdatePayload(application))
  if (payloadType) return payloadType

  const remarksToken = String(application?.remarks || '').toLowerCase()
  if (remarksToken.includes('cancel request') || remarksToken.includes('cancellation request')) {
    return REQUEST_ACTION_CANCEL
  }
  if (remarksToken.includes('edit request') || remarksToken.includes('request update')) {
    return REQUEST_ACTION_UPDATE
  }

  return ''
}

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
const currentUpdateRequestCycleStartAt = computed(() =>
  resolveCurrentUpdateRequestCycleStartAt(props.application),
)
const isUpdateRequestCycle = computed(() => Boolean(currentUpdateRequestCycleStartAt.value))
const currentRequestActionType = computed(() => resolveLeaveRequestActionType(props.application))
const isCancellationRequestCycle = computed(
  () => isUpdateRequestCycle.value && currentRequestActionType.value === REQUEST_ACTION_CANCEL,
)
const requestCycleDocumentLabel = computed(() => {
  if (!isUpdateRequestCycle.value) return ''
  return isCancellationRequestCycle.value ? 'Cancellation Form' : 'Update'
})
const receiveActionLabel = computed(() =>
  requestCycleDocumentLabel.value
    ? 'Receive ' + requestCycleDocumentLabel.value
    : 'Receive',
)
const receivedActionLabel = computed(() =>
  requestCycleDocumentLabel.value
    ? requestCycleDocumentLabel.value + ' Received'
    : 'Received',
)
const releaseActionLabel = computed(() =>
  requestCycleDocumentLabel.value
    ? 'Release ' + requestCycleDocumentLabel.value
    : 'Released',
)
const releasedActionLabel = computed(() =>
  requestCycleDocumentLabel.value
    ? requestCycleDocumentLabel.value + ' Released'
    : 'Released',
)

const isCocApplicationType = computed(() => {
  const appType = String(props.application?.application_type || '')
    .trim()
    .toUpperCase()
  if (appType) return appType === 'COC'

  const leaveTypeName = String(
    props.application?.leaveType || props.application?.leave_type_name || '',
  )
    .trim()
    .toLowerCase()
  return leaveTypeName === 'coc application' || leaveTypeName === 'coc'
})

const timelineEntries = computed(() => {
  const baseTimeline = getBaseTimelineEntries()

  const existingReceivedApplicationEntry = baseTimeline.find((entry) =>
    isEntryTitle(entry, 'Received Application'),
  )
  const existingUpdateReceivedEntry = baseTimeline.find((entry) =>
    isEntryTitle(entry, 'Update Received') || isEntryTitle(entry, 'Cancellation Form Received'),
  )
  const existingReleasedApplicationEntry = baseTimeline.find((entry) =>
    isEntryTitle(entry, 'Released Application'),
  )
  const existingUpdateReleasedEntry = baseTimeline.find((entry) =>
    isEntryTitle(entry, 'Update Released') || isEntryTitle(entry, 'Cancellation Form Released'),
  )
  const cleanedTimeline = baseTimeline.filter(
    (entry) => !isReceivedTimelineEntryTitle(entry) && !isReleasedTimelineEntryTitle(entry),
  )
  const existingClosedEntries = cleanedTimeline.filter((entry) =>
    isEntryTitle(entry, 'Application Closed'),
  )
  const coreEntries = cleanedTimeline.filter((entry) => !isEntryTitle(entry, 'Application Closed'))

  const hasUpdateCycle = isUpdateRequestCycle.value
  const historicalReceivedEntry = hasUpdateCycle
    ? buildHistoricalReceivedTimelineEntry(existingReceivedApplicationEntry)
    : null
  const historicalReleasedEntry = hasUpdateCycle
    ? buildHistoricalReleasedTimelineEntry(existingReleasedApplicationEntry)
    : null

  const cycleReceivedSourceEntry = hasUpdateCycle
    ? existingUpdateReceivedEntry || existingReceivedApplicationEntry
    : existingReceivedApplicationEntry || existingUpdateReceivedEntry
  const cycleReleasedSourceEntry = hasUpdateCycle
    ? existingUpdateReleasedEntry || existingReleasedApplicationEntry
    : existingReleasedApplicationEntry || existingUpdateReleasedEntry

  const cycleReceivedEntry = buildReceivedTimelineEntry(cycleReceivedSourceEntry)
  const cycleReleasedEntry = buildReleasedTimelineEntry(cycleReleasedSourceEntry)
  const receivedInsertEntry = historicalReceivedEntry || cycleReceivedEntry
  const receivedInsertIndex = getReceivedInsertionIndex(coreEntries)
  coreEntries.splice(receivedInsertIndex, 0, receivedInsertEntry)

  const closedEntry = buildClosedTimelineEntry(existingClosedEntries[0] || null)

  const finalizedEntries = [...coreEntries]
  if (hasUpdateCycle) {
    if (historicalReleasedEntry) {
      const historicalReleaseInsertIndex = getHistoricalReleasedInsertionIndex(finalizedEntries)
      finalizedEntries.splice(historicalReleaseInsertIndex, 0, historicalReleasedEntry)
    }
    if (historicalReceivedEntry) {
      const updateReceivedInsertIndex = getUpdateReceivedInsertionIndex(finalizedEntries)
      finalizedEntries.splice(updateReceivedInsertIndex, 0, cycleReceivedEntry)
    }
    finalizedEntries.push(cycleReleasedEntry)
  } else {
    finalizedEntries.push(cycleReleasedEntry)
  }

  if (closedEntry) {
    finalizedEntries.push(closedEntry)
  }

  return finalizedEntries.map((entry) => adjustPendingHrReviewTimelineEntry(entry))
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
  return backendReceivedState.value || isLocalActionStateActive(localReceivedState.value)
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
    return Boolean(
      props.isApplicationReleased(props.application) ||
      isLocalActionStateActive(localReleasedState.value),
    )
  }

  return Boolean(props.isReleased || isLocalActionStateActive(localReleasedState.value))
})

// const receivedSummaryText = computed(() => {
//   if (typeof props.getReceivedByHrSummary === 'function') {
//     const summary = String(props.getReceivedByHrSummary(props.application) || '').trim()
//     if (summary) return summary
//   }

//   if (localReceivedState.value) {
//     return `Received by ${localReceivedState.value.actor} on ${formatDateTime(localReceivedState.value.at)}`
//   }

//   return String(props.receivedSummary || '').trim()
// })

// const releasedSummaryText = computed(() => {
//   if (typeof props.getReleasedByHrSummary === 'function') {
//     const summary = String(props.getReleasedByHrSummary(props.application) || '').trim()
//     if (summary) return summary
//   }

//   if (localReleasedState.value) {
//     return `Released by ${localReleasedState.value.actor} on ${formatDateTime(localReleasedState.value.at)}`
//   }

//   return String(props.releasedSummary || '').trim()
// })

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

function getStatusHistoryEntries(application) {
  const statusHistory = application?.status_history
  if (!statusHistory) return []
  if (Array.isArray(statusHistory)) return statusHistory

  if (typeof statusHistory === 'string') {
    const trimmed = statusHistory.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return []
}

function normalizeStatusHistoryToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function normalizeStatusHistoryActionToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
}

function resolveStatusHistoryTimestamp(entry) {
  if (!entry || typeof entry !== 'object') return null
  return entry?.created_at || entry?.updated_at || null
}

function resolveStatusHistoryActor(entry) {
  if (!entry || typeof entry !== 'object') return ''
  return String(entry?.actor_name || entry?.action_by_name || entry?.action_by || '').trim()
}

function resolveCurrentUpdateRequestCycleStartAt(application) {
  if (!application || typeof application !== 'object') return null

  const explicitValue = String(
    application?.latest_update_requested_at ?? application?.latestUpdateRequestedAt ?? '',
  ).trim()
  if (explicitValue) return explicitValue

  const requestActionType = resolveLeaveRequestActionType(application)
  const entries = getStatusHistoryEntries(application)
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index] || {}
    const actionToken = normalizeStatusHistoryActionToken(entry?.action)
    const stageToken = normalizeStatusHistoryToken(entry?.stage)
    const remarksToken = normalizeStatusHistoryToken(entry?.remarks)

    const isUpdateRequestAction =
      [
        'REQUEST_UPDATE',
        'UPDATE_REQUESTED',
        'EDIT_REQUEST_SUBMITTED',
        'REQUESTED_UPDATE',
        'EDIT_REQUESTED',
      ].includes(actionToken)
    const isCancelRequestAction =
      [
        'REQUEST_CANCEL',
        'CANCEL_REQUESTED',
        'CANCELLATION_REQUEST_SUBMITTED',
        'REQUESTED_CANCELLATION',
        'REQUEST_CANCELLATION',
      ].includes(actionToken)

    if (requestActionType === REQUEST_ACTION_CANCEL) {
      if (isCancelRequestAction) return resolveStatusHistoryTimestamp(entry)
    } else if (isUpdateRequestAction || isCancelRequestAction) {
      return resolveStatusHistoryTimestamp(entry)
    }

    const stageIsUpdateSignal =
      stageToken.includes('edit request submitted') || stageToken.includes('edit requested')
    const stageIsCancelSignal =
      stageToken.includes('cancel request submitted') ||
      stageToken.includes('cancellation request submitted') ||
      stageToken.includes('cancellation requested')

    if (requestActionType === REQUEST_ACTION_CANCEL) {
      if (stageIsCancelSignal) return resolveStatusHistoryTimestamp(entry)
    } else if (stageIsUpdateSignal || stageIsCancelSignal) {
      return resolveStatusHistoryTimestamp(entry)
    }

    const remarksHasUpdateSignal =
      remarksToken.includes('edit request') || remarksToken.includes('request update')
    const remarksHasCancelSignal =
      remarksToken.includes('cancel request') || remarksToken.includes('cancellation request')

    if (requestActionType === REQUEST_ACTION_CANCEL && !remarksHasCancelSignal) {
      continue
    }

    if (requestActionType !== REQUEST_ACTION_CANCEL && !remarksHasUpdateSignal && !remarksHasCancelSignal) {
      continue
    }

    if (
      actionToken === '' ||
      actionToken.includes('REQUEST') ||
      actionToken.includes('SUBMIT') ||
      actionToken.includes('EDIT') ||
      actionToken.includes('CANCEL')
    ) {
      return resolveStatusHistoryTimestamp(entry)
    }
  }

  return null
}

function toComparableTimestamp(value) {
  const parsedDate = new Date(String(value || '').trim())
  const timestamp = parsedDate.getTime()
  return Number.isNaN(timestamp) ? Number.NaN : timestamp
}

function isTimestampOnOrAfter(value, reference) {
  if (!value) return false
  if (!reference) return true

  const valueTimestamp = toComparableTimestamp(value)
  const referenceTimestamp = toComparableTimestamp(reference)
  if (Number.isNaN(valueTimestamp) || Number.isNaN(referenceTimestamp)) return false
  return valueTimestamp >= referenceTimestamp
}

function isLocalActionStateActive(state) {
  if (!state) return false
  const cycleStart = currentUpdateRequestCycleStartAt.value
  if (!cycleStart) return true
  return isTimestampOnOrAfter(state.at, cycleStart)
}

function findLatestStatusHistoryEntryBefore(application, matcher, beforeValue) {
  const beforeTimestamp = toComparableTimestamp(beforeValue)
  if (Number.isNaN(beforeTimestamp)) return null

  const entries = getStatusHistoryEntries(application)
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const candidate = entries[index] || {}
    if (!matcher(candidate)) continue

    const candidateTimestamp = toComparableTimestamp(resolveStatusHistoryTimestamp(candidate))
    if (Number.isNaN(candidateTimestamp)) continue
    if (candidateTimestamp < beforeTimestamp) return candidate
  }

  return null
}

function resolveHistoricalReceivedBeforeCurrentUpdateMeta(application) {
  const cycleStart = currentUpdateRequestCycleStartAt.value
  if (!cycleStart) return null

  const historyEntry = findLatestStatusHistoryEntryBefore(
    application,
    (entry) => normalizeStatusHistoryActionToken(entry?.action) === 'HR_RECEIVED',
    cycleStart,
  )
  if (!historyEntry) return null

  return {
    at: resolveStatusHistoryTimestamp(historyEntry),
    actor: resolveStatusHistoryActor(historyEntry) || 'Unknown',
  }
}

function resolveHistoricalReleasedBeforeCurrentUpdateMeta(application) {
  const cycleStart = currentUpdateRequestCycleStartAt.value
  if (!cycleStart) return null

  const historyEntry = findLatestStatusHistoryEntryBefore(
    application,
    (entry) => {
      const actionToken = normalizeStatusHistoryActionToken(entry?.action)
      const stageToken = normalizeStatusHistoryToken(entry?.stage)
      return (
        actionToken === 'HR_RELEASED' ||
        stageToken === 'hr released' ||
        stageToken === 'released application'
      )
    },
    cycleStart,
  )
  if (!historyEntry) return null

  return {
    at: resolveStatusHistoryTimestamp(historyEntry),
    actor: resolveStatusHistoryActor(historyEntry) || 'Unknown',
  }
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
  return (
    normalizeEntryTitle(entry) ===
    String(title || '')
      .trim()
      .toLowerCase()
  )
}

function isReceivedTimelineEntryTitle(entry) {
  const normalizedTitle = normalizeEntryTitle(entry)
  return (
    normalizedTitle === 'received application' ||
    normalizedTitle === 'update received' ||
    normalizedTitle === 'cancellation form received'
  )
}

function isReleasedTimelineEntryTitle(entry) {
  const normalizedTitle = normalizeEntryTitle(entry)
  return (
    normalizedTitle === 'released application' ||
    normalizedTitle === 'update released' ||
    normalizedTitle === 'cancellation form released'
  )
}

function getReceivedTimelineTitle() {
  if (!isUpdateRequestCycle.value) return 'Received Application'
  return requestCycleDocumentLabel.value + ' Received'
}

function getReleasedTimelineTitle() {
  if (!isUpdateRequestCycle.value) return 'Released Application'
  return requestCycleDocumentLabel.value + ' Released'
}

function isHrPhaseEntry(entry) {
  const normalizedTitle = normalizeEntryTitle(entry)
  return (
    normalizedTitle.includes('pending hr review') ||
    normalizedTitle.includes('approved by hr') ||
    normalizedTitle.includes('application disapproved') ||
    normalizedTitle.includes('recalled by hr') ||
    normalizedTitle.includes('pending edit review (hr)') ||
    normalizedTitle.includes('pending cancellation review (hr)') ||
    normalizedTitle.includes('edit request approved') ||
    normalizedTitle.includes('edit request rejected') ||
    normalizedTitle.includes('cancellation request approved') ||
    normalizedTitle.includes('cancellation request rejected') ||
    normalizedTitle.includes('current status')
  )
}

function isUpdateRequestTimelineEntry(entry) {
  const normalizedTitle = normalizeEntryTitle(entry)
  return (
    normalizedTitle.includes('edit request submitted') ||
    normalizedTitle.includes('pending edit review') ||
    normalizedTitle.includes('edit request approved') ||
    normalizedTitle.includes('edit request rejected') ||
    normalizedTitle.includes('cancellation request submitted') ||
    normalizedTitle.includes('pending cancellation review') ||
    normalizedTitle.includes('cancellation request approved') ||
    normalizedTitle.includes('cancellation request rejected')
  )
}

function getReceivedInsertionIndex(entries) {
  if (isCocApplicationType.value) {
    const pendingHrIndex = entries.findIndex((entry) =>
      isEntryTitle(entry, 'Pending HR Review') ||
      isEntryTitle(entry, 'Pending Edit Review (HR)') ||
      isEntryTitle(entry, 'Pending Cancellation Review (HR)'),
    )
    if (pendingHrIndex >= 0) return pendingHrIndex + 1

    const approvedByHrIndex = entries.findIndex((entry) =>
      isEntryTitle(entry, 'Approved by HR'),
    )
    if (approvedByHrIndex >= 0) return approvedByHrIndex + 1
  }

  const adminCompletedIndex = entries.findIndex((entry) =>
    isEntryTitle(entry, 'Admin Review Completed'),
  )
  if (adminCompletedIndex >= 0) return adminCompletedIndex + 1

  const adminPendingIndex = entries.findIndex((entry) =>
    isEntryTitle(entry, 'Department Admin Review Pending'),
  )
  if (adminPendingIndex >= 0) return adminPendingIndex + 1

  const hrPhaseIndex = entries.findIndex((entry) => isHrPhaseEntry(entry))
  if (hrPhaseIndex >= 0) return hrPhaseIndex

  return entries.length
}

function getHistoricalReleasedInsertionIndex(entries) {
  const approvedByHrIndex = entries.findIndex((entry) => isEntryTitle(entry, 'Approved by HR'))
  if (approvedByHrIndex >= 0) return approvedByHrIndex + 1

  const updateTimelineIndex = entries.findIndex((entry) => isUpdateRequestTimelineEntry(entry))
  if (updateTimelineIndex >= 0) return updateTimelineIndex

  const receivedIndex = entries.findIndex((entry) => isEntryTitle(entry, 'Received Application'))
  if (receivedIndex >= 0) return receivedIndex + 1

  return entries.length
}

function getUpdateReceivedInsertionIndex(entries) {
  const pendingAdminReviewIndex = entries.findIndex((entry) =>
    isEntryTitle(entry, 'Pending Edit Review (Admin)') ||
    isEntryTitle(entry, 'Pending Cancellation Review (Admin)'),
  )
  if (pendingAdminReviewIndex >= 0) return pendingAdminReviewIndex + 1

  const adminApprovedIndex = entries.findIndex((entry) =>
    isEntryTitle(entry, 'Edit Request Approved by Admin') ||
    isEntryTitle(entry, 'Cancellation Request Approved by Admin'),
  )
  if (adminApprovedIndex >= 0) return adminApprovedIndex + 1

  const pendingHrReviewIndex = entries.findIndex((entry) =>
    isEntryTitle(entry, 'Pending Edit Review (HR)') ||
    isEntryTitle(entry, 'Pending Cancellation Review (HR)'),
  )
  if (pendingHrReviewIndex >= 0) return pendingHrReviewIndex

  const requestSubmittedIndex = entries.findIndex((entry) =>
    isEntryTitle(entry, 'Edit Request Submitted') ||
    isEntryTitle(entry, 'Cancellation Request Submitted'),
  )
  if (requestSubmittedIndex >= 0) return requestSubmittedIndex + 1

  const updateTimelineIndex = entries.findIndex((entry) => isUpdateRequestTimelineEntry(entry))
  if (updateTimelineIndex >= 0) return updateTimelineIndex

  return entries.length
}

function buildReceivedTimelineEntry(existingEntry = null) {
  const entryTitle = getReceivedTimelineTitle()
  const isCompleted = isReceivedState.value
  const isUpdateCycle = isUpdateRequestCycle.value
  const isCancellationCycle = isCancellationRequestCycle.value
  const isCoc = isCocApplicationType.value

  if (!isCompleted) {
    if (canReceiveState.value) {
      return {
        title: entryTitle,
        subtitle: 'Current stage',
        description: isCoc
          ? 'Waiting for HR to acknowledge this COC application.'
          : isUpdateCycle
            ? isCancellationCycle
              ? 'Waiting for HR to confirm receipt of the cancellation form.'
              : 'Waiting for HR to confirm receipt of the updated hard copy leave application form.'
            : 'Waiting for HR to confirm receipt of the hard copy leave application form.',
        icon: 'pending_actions',
        color: 'warning',
      }
    }

    return {
      title: entryTitle,
      subtitle: 'Upcoming',
      description: isCoc
        ? 'HR will acknowledge this COC application for review.'
        : isUpdateCycle
          ? isCancellationCycle
            ? 'HR will confirm receipt of the cancellation form.'
            : 'HR will confirm receipt of the updated hard copy leave application form.'
          : 'HR will confirm receipt of the hard copy leave application form.',
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
    title: entryTitle,
    subtitle,
    description:
      String(existingEntry?.description || '').trim() ||
      (isCoc
        ? 'HR acknowledged this COC application for review.'
        : isUpdateCycle
          ? isCancellationCycle
            ? 'HR confirmed receipt of the cancellation form.'
            : 'HR confirmed receipt of the updated hard copy leave application form.'
          : 'HR confirmed receipt of the hard copy leave application form.'),
    icon: String(existingEntry?.icon || '').trim() || 'inventory_2',
    color: String(existingEntry?.color || '').trim() || 'positive',
    actor: actor || undefined,
  }
}

function adjustPendingHrReviewTimelineEntry(entry) {
  if (
    !entry ||
    (!isEntryTitle(entry, 'Pending HR Review') &&
      !isEntryTitle(entry, 'Pending Edit Review (HR)') &&
      !isEntryTitle(entry, 'Pending Cancellation Review (HR)'))
  ) {
    return entry
  }
  if (!canReceiveState.value || isReceivedState.value) return entry

  const isPendingEditHrReviewEntry = isEntryTitle(entry, 'Pending Edit Review (HR)')
  const isPendingCancellationHrReviewEntry = isEntryTitle(entry, 'Pending Cancellation Review (HR)')
  const pendingDescription = isPendingEditHrReviewEntry
    ? 'This stage starts after HR confirms receipt of the updated hard copy leave application form.'
    : isPendingCancellationHrReviewEntry
      ? 'This stage starts after HR confirms receipt of the cancellation form.'
      : 'This stage starts after HR confirms receipt of the hard copy leave application form.'

  return {
    ...entry,
    subtitle: 'Upcoming',
    description: pendingDescription,
    icon: 'radio_button_unchecked',
    color: 'grey-5',
    actor: undefined,
  }
}

function buildReleasedTimelineEntry(existingEntry = null) {
  const entryTitle = getReleasedTimelineTitle()
  const isCompleted = isReleasedState.value
  const isUpdateCycle = isUpdateRequestCycle.value
  const isCancellationCycle = isCancellationRequestCycle.value
  const isCoc = isCocApplicationType.value

  if (!isCompleted) {
    const isCurrent = canReleaseState.value
    return {
      title: entryTitle,
      subtitle: isCurrent ? 'Current stage' : 'Upcoming',
      description: isCurrent
        ? isCoc
          ? 'Waiting for HR to release this COC application.'
          : isUpdateCycle
            ? isCancellationCycle
              ? 'Waiting for HR to release the cancellation form.'
              : 'Waiting for HR to release the updated physical leave document.'
            : 'Waiting for HR to release the physical leave document.'
        : isCoc
          ? 'COC application release will follow final HR action.'
          : isUpdateCycle
            ? isCancellationCycle
              ? 'The cancellation form will be released before final closure.'
              : 'The updated physical document will be released before final closure.'
            : 'The physical document will be released before final closure.',
      icon: isCurrent ? 'pending_actions' : 'radio_button_unchecked',
      color: isCurrent ? 'warning' : 'grey-5',
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
    title: entryTitle,
    subtitle,
    description:
      String(existingEntry?.description || '').trim() ||
      (isCoc
        ? 'COC application has been finalized and released.'
        : isUpdateCycle
          ? isCancellationCycle
            ? 'Cancellation form has been released.'
            : 'Updated physical leave document has been released.'
          : 'Physical leave document has been released.'),
    icon: String(existingEntry?.icon || '').trim() || 'outbox',
    color: String(existingEntry?.color || '').trim() || 'positive',
    actor: actor || undefined,
  }
}

function buildHistoricalReceivedTimelineEntry(existingEntry = null) {
  const meta = resolveHistoricalReceivedBeforeCurrentUpdateMeta(props.application)
  if (!meta?.at) return null

  return {
    title: 'Received Application',
    subtitle: formatDateTime(meta.at) || 'Completed',
    description:
      String(existingEntry?.description || '').trim() ||
      'HR confirmed receipt of the hard copy leave application form.',
    icon: 'inventory_2',
    color: 'positive',
    actor: meta.actor && meta.actor !== 'Unknown' ? meta.actor : undefined,
  }
}

function buildHistoricalReleasedTimelineEntry(existingEntry = null) {
  const meta = resolveHistoricalReleasedBeforeCurrentUpdateMeta(props.application)
  if (!meta?.at) return null

  return {
    title: 'Released Application',
    subtitle: formatDateTime(meta.at) || 'Completed',
    description:
      String(existingEntry?.description || '').trim() ||
      'Physical leave document has been released.',
    icon: 'outbox',
    color: 'positive',
    actor: meta.actor && meta.actor !== 'Unknown' ? meta.actor : undefined,
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
