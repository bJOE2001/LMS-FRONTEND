<template>
  <q-card flat bordered :class="['rounded-borders bg-white data-table-card', cardClass]">
    <slot name="before-table" />

    <q-table
      v-bind="tableBindings"
      :rows="rows"
      :columns="columns"
      :row-key="rowKey"
      flat
      :dense="dense"
      :separator="separator"
      :loading="loading"
      :binary-state-sort="binaryStateSort"
      :rows-per-page-options="rowsPerPageOptions"
      :class="tableClass"
      :table-style="tableStyle"
      @request="(props) => $emit('request', props)"
      @row-click="(evt, row, index) => $emit('row-click', evt, row, index)"
    >
      <template v-for="slotName in passThroughSlotNames" #[slotName]="slotProps">
        <slot :name="slotName" v-bind="slotProps || {}" />
      </template>

      <template v-if="!$slots['no-data']" #no-data>
        <div class="full-width text-center q-py-xl q-px-md text-grey-6">
          <template v-if="loading && rows.length === 0">
            <q-spinner-dots :color="spinnerColor" size="40px" />
            <div class="text-caption text-grey-7 q-mt-sm">{{ loadingText }}</div>
          </template>
          <template v-else>
            <q-icon :name="emptyIcon" size="48px" color="grey-4" />
            <div class="text-subtitle2 text-weight-bold text-grey-8 q-mt-sm">
              {{ noDataLabel }}
            </div>
            <div v-if="emptySubtext" class="text-caption text-grey-6 q-mt-xs">
              {{ emptySubtext }}
            </div>
            <div v-if="$slots['empty-actions']" class="q-mt-md row justify-center q-gutter-sm">
              <slot name="empty-actions" />
            </div>
          </template>
        </div>
      </template>
    </q-table>

    <slot name="after-table" />
  </q-card>
</template>

<script setup>
import { computed, useAttrs, useSlots } from 'vue'

defineOptions({
  inheritAttrs: false,
})

const RESERVED_SLOTS = new Set(['before-table', 'after-table', 'empty-actions', 'no-data'])

const props = defineProps({
  rows: {
    type: Array,
    default: () => [],
  },
  columns: {
    type: Array,
    default: () => [],
  },
  rowKey: {
    type: [String, Function],
    default: 'id',
  },
  pagination: {
    type: Object,
    default: undefined,
  },
  expanded: {
    type: Array,
    default: undefined,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  dense: {
    type: Boolean,
    default: false,
  },
  separator: {
    type: String,
    default: 'horizontal',
  },
  binaryStateSort: {
    type: Boolean,
    default: true,
  },
  rowsPerPageOptions: {
    type: Array,
    default: () => [10, 20, 50, 100],
  },
  noDataLabel: {
    type: String,
    default: 'No records found.',
  },
  emptySubtext: {
    type: String,
    default: '',
  },
  emptyIcon: {
    type: String,
    default: 'inbox',
  },
  loadingText: {
    type: String,
    default: 'Loading records...',
  },
  spinnerColor: {
    type: String,
    default: 'primary',
  },
  cardClass: {
    type: [String, Array, Object],
    default: '',
  },
  tableClass: {
    type: [String, Array, Object],
    default: '',
  },
  tableStyle: {
    type: [String, Object],
    default: undefined,
  },
})

const emit = defineEmits(['update:pagination', 'update:expanded', 'request', 'row-click'])

const attrs = useAttrs()
const slots = useSlots()

const passThroughSlotNames = computed(() =>
  Object.keys(slots).filter((name) => !RESERVED_SLOTS.has(name))
)

const tableBindings = computed(() => {
  const bindings = { ...attrs }

  if (props.pagination !== undefined) {
    bindings.pagination = props.pagination
    bindings['onUpdate:pagination'] = (value) => emit('update:pagination', value)
  }

  if (props.expanded !== undefined) {
    bindings.expanded = props.expanded
    bindings['onUpdate:expanded'] = (value) => emit('update:expanded', value)
  }

  return bindings
})
</script>

