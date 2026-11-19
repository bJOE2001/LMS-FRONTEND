<template>
  <component
    :is="card ? QCard : 'div'"
    v-bind="card ? { flat: true, bordered: true, class: ['rounded-borders bg-white app-skeleton-card', cardClass] } : { class: ['app-skeleton-card', cardClass] }"
  >
    <q-card-section v-if="showToolbar" class="q-pa-md">
      <div class="row q-col-gutter-sm items-center">
        <div class="col-12 col-md-4">
          <q-skeleton type="QInput" height="38px" :animation="animation" class="app-skeleton-element" />
        </div>
        <div
          v-for="f in toolbarFilterCount"
          :key="`filter-${f}`"
          class="col-6 col-md-2"
        >
          <q-skeleton type="QInput" height="38px" :animation="animation" class="app-skeleton-element" />
        </div>
        <div v-if="showToolbarAction" class="col-12 col-md row justify-end">
          <q-skeleton type="QBtn" width="124px" height="36px" :animation="animation" class="app-skeleton-element" />
        </div>
      </div>
    </q-card-section>

    <q-separator v-if="showToolbar" />

    <div class="full-width overflow-hidden">
      <div class="row items-center q-px-md q-py-sm no-wrap app-skeleton-table__head">
        <div
          v-for="(col, idx) in resolvedColumns"
          :key="`hdr-${idx}`"
          :class="col.headerColClass"
        >
          <q-skeleton
            v-if="!showHeaderLabels || !col.label"
            type="text"
            :width="col.headerWidth"
            height="13px"
            :class="[col.alignClass, 'app-skeleton-element']"
            :animation="animation"
          />
          <div v-else class="text-caption text-weight-bold text-grey-7 ellipsis" :class="col.textAlignClass">
            {{ col.label }}
          </div>
        </div>
      </div>

      <div
        v-for="r in rows"
        :key="`row-${r}`"
        :class="[
          'row items-center q-px-md no-wrap app-skeleton-table__row',
          { 'app-skeleton-table__row--alt': r % 2 === 0 },
          dense ? 'q-py-xs' : 'q-py-sm',
        ]"
      >
        <div
          v-for="(col, idx) in resolvedColumns"
          :key="`cell-${r}-${idx}`"
          :class="col.cellColClass"
        >
          <template v-if="idx === 0">
            <div class="row items-center no-wrap q-gutter-sm">
              <q-skeleton
                v-if="showAvatarColumn"
                type="QAvatar"
                :size="dense ? '26px' : '32px'"
                :animation="animation"
                class="app-skeleton-element flex-shrink-0"
              />
              <div class="col">
                <q-skeleton
                  type="text"
                  :width="firstColWidths[(r - 1) % firstColWidths.length]"
                  :height="dense ? '13px' : '15px'"
                  :animation="animation"
                  class="app-skeleton-element"
                />
                <q-skeleton
                  v-if="showSubtitleOnFirstColumn"
                  type="text"
                  :width="subtitleWidths[(r - 1) % subtitleWidths.length]"
                  height="11px"
                  class="q-mt-xs app-skeleton-element"
                  :animation="animation"
                />
              </div>
            </div>
          </template>
          <template v-else-if="col.isBadge">
            <q-skeleton
              type="QChip"
              width="68px"
              :height="dense ? '20px' : '24px'"
              :class="[col.alignClass, 'app-skeleton-element']"
              :animation="animation"
            />
          </template>
          <template v-else-if="col.isAction">
            <q-skeleton
              type="QBtn"
              :width="dense ? '28px' : '32px'"
              :height="dense ? '24px' : '28px'"
              :class="[col.alignClass, 'app-skeleton-element']"
              :animation="animation"
            />
          </template>
          <template v-else>
            <q-skeleton
              type="text"
              :width="cellWidths[(r + idx) % cellWidths.length]"
              :height="dense ? '13px' : '15px'"
              :class="[col.alignClass, 'app-skeleton-element']"
              :animation="animation"
            />
          </template>
        </div>
      </div>
    </div>

    <q-card-section v-if="showFooter" class="row items-center justify-between q-px-md q-py-sm app-skeleton-table__footer">
      <q-skeleton type="text" width="160px" height="14px" :animation="animation" class="app-skeleton-element" />
      <q-skeleton type="rect" width="210px" height="30px" :animation="animation" class="rounded-borders app-skeleton-element" />
    </q-card-section>
  </component>
</template>

<script setup>
import { computed } from 'vue'
import { QCard } from 'quasar'

const props = defineProps({
  columns: {
    type: [Number, Array],
    default: 6,
  },
  rows: {
    type: Number,
    default: 8,
  },
  dense: {
    type: Boolean,
    default: false,
  },
  animation: {
    type: String,
    default: 'wave',
  },
  card: {
    type: Boolean,
    default: true,
  },
  cardClass: {
    type: [String, Array, Object],
    default: '',
  },
  showToolbar: {
    type: Boolean,
    default: false,
  },
  toolbarFilterCount: {
    type: Number,
    default: 2,
  },
  showToolbarAction: {
    type: Boolean,
    default: true,
  },
  showFooter: {
    type: Boolean,
    default: true,
  },
  showHeaderLabels: {
    type: Boolean,
    default: false,
  },
  showAvatarColumn: {
    type: Boolean,
    default: true,
  },
  showSubtitleOnFirstColumn: {
    type: Boolean,
    default: true,
  },
})

const firstColWidths = ['78%', '64%', '84%', '70%']
const subtitleWidths = ['52%', '42%', '58%', '46%']
const cellWidths = ['66%', '78%', '56%', '72%']

const resolvedColumns = computed(() => {
  if (Array.isArray(props.columns) && props.columns.length > 0) {
    return props.columns.map((col, idx) => {
      const name = String(col?.name || col?.field || '').toLowerCase()
      const label = String(col?.label || '')
      const align = col?.align || 'left'
      const isAction = name === 'action' || name === 'actions' || label.toLowerCase() === 'action'
      const isBadge = !isAction && (name.includes('status') || name.includes('type') || name.includes('role') || name.includes('office') || name.includes('state'))

      return {
        label,
        headerColClass: idx === 0 ? 'col-3 q-pr-sm' : 'col q-px-xs',
        cellColClass: idx === 0 ? 'col-3 q-pr-sm' : 'col q-px-xs',
        headerWidth: idx === 0 ? '55%' : '65%',
        isAction,
        isBadge,
        alignClass: align === 'right' ? 'q-ml-auto' : align === 'center' ? 'q-mx-auto' : '',
        textAlignClass: align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
      }
    })
  }

  const total = Math.max(2, Number(props.columns) || 6)
  return Array.from({ length: total }, (_, idx) => {
    const isLast = idx === total - 1
    const isSecondLast = total >= 4 && idx === total - 2
    return {
      label: '',
      headerColClass: idx === 0 ? 'col-3 q-pr-sm' : 'col q-px-xs',
      cellColClass: idx === 0 ? 'col-3 q-pr-sm' : 'col q-px-xs',
      headerWidth: idx === 0 ? '55%' : '60%',
      isAction: isLast,
      isBadge: isSecondLast,
      alignClass: isLast ? 'q-ml-auto' : isSecondLast ? 'q-mx-auto' : '',
      textAlignClass: isLast ? 'text-right' : isSecondLast ? 'text-center' : 'text-left',
    }
  })
})
</script>
