<template>
  <q-badge
    :color="color"
    :text-color="textColor"
    class="q-px-sm q-py-xs"
  >
    {{ displayLabel }}
    <q-tooltip v-if="tooltipText">{{ tooltipText }}</q-tooltip>
  </q-badge>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true,
  },
  tooltip: {
    type: String,
    default: '',
  },
})

const DISAPPROVED_STATUS_COLOR = 'red'

const color = computed(() => {
  const normalized = String(props.status || '').trim().toUpperCase()
  if (!normalized) return 'grey'

  if (normalized.includes('PENDING') && normalized.includes('LATE')) return 'orange-8'
  if (
    normalized.includes('DEPARTMENT RECOMMENDATION') ||
    normalized.includes('ADMIN RECOMMENDATION')
  ) {
    return 'warning'
  }
  if (normalized.includes('HR CERTIFICATION') || normalized.includes('CHRMO CERTIFICATION')) {
    return 'blue-6'
  }
  if (normalized.includes('CMO') || normalized.includes('CBMO')) return 'deep-purple-6'
  if (normalized === 'RELEASE' || normalized.includes('PENDING RELEASE')) return 'indigo-6'
  if (normalized.includes('PENDING ADMIN')) return 'warning'
  if (normalized.includes('PENDING HR RECEIVE')) return 'teal-6'
  if (normalized.includes('PENDING HR REVIEW')) return 'blue-6'
  if (normalized.includes('PENDING HR')) return 'blue-6'
  if (normalized.includes('PENDING RELEASE')) return 'indigo-6'
  if (normalized.includes('PENDING RECEIVE')) return 'teal-6'
  if (normalized.includes('PENDING')) return 'warning'
  if (
    normalized.includes('REJECTED') ||
    normalized.includes('DISAPPROVED') ||
    normalized.includes('NOT CERTIFIED')
  ) {
    return DISAPPROVED_STATUS_COLOR
  }
  if (normalized.includes('RELEASED')) return 'positive'
  if (normalized.includes('APPROVED')) return 'positive'
  if (normalized.includes('RECALLED')) return 'blue-grey-7'

  return 'grey'
})

const textColor = computed(() => 'white')

const displayLabel = computed(() => {
  const rawLabel = String(props.status || '').trim()
  if (!rawLabel) return ''

  return rawLabel.replace(/rejected/gi, 'Disapproved')
})

const tooltipText = computed(() => String(props.tooltip || '').trim())
</script>
