<template>
  <div :class="rowClass">
    <div v-for="n in count" :key="n" :class="resolvedColClass">
      <q-card flat bordered class="rounded-borders bg-white full-height app-skeleton-card">
        <q-card-section
          v-if="variant === 'dashboard'"
          class="app-skeleton-kpi-dashboard column justify-between full-height"
        >
          <div class="row items-start justify-between no-wrap q-gutter-x-sm">
            <div class="col">
              <q-skeleton
                type="rect"
                width="28px"
                height="28px"
                class="rounded-borders app-skeleton-element"
                :animation="animation"
              />
              <q-skeleton
                type="text"
                :width="labelWidths[(n - 1) % labelWidths.length]"
                height="13px"
                class="q-mt-sm app-skeleton-element"
                :animation="animation"
              />
            </div>
            <q-skeleton
              type="text"
              :width="valueWidths[(n - 1) % valueWidths.length]"
              height="28px"
              class="app-skeleton-element flex-shrink-0"
              :animation="animation"
            />
          </div>

          <div
            v-if="hasFirstCardBreakdown && n === 1"
            class="app-skeleton-kpi-breakdown q-mt-xs"
            :style="{ '--breakdown-cols': breakdownCount }"
          >
            <q-skeleton
              v-for="b in breakdownCount"
              :key="b"
              type="rect"
              width="100%"
              height="20px"
              class="rounded-borders app-skeleton-element"
              :animation="animation"
            />
          </div>
        </q-card-section>

        <q-card-section v-else class="app-skeleton-kpi-compact">
          <div class="row items-center no-wrap q-gutter-sm">
            <q-skeleton
              type="QAvatar"
              size="38px"
              class="app-skeleton-element flex-shrink-0"
              :animation="animation"
            />
            <div class="col">
              <q-skeleton
                type="text"
                :width="labelWidths[(n - 1) % labelWidths.length]"
                height="12px"
                class="app-skeleton-element"
                :animation="animation"
              />
              <q-skeleton
                type="text"
                :width="valueWidths[(n - 1) % valueWidths.length]"
                height="22px"
                class="q-mt-xs app-skeleton-element"
                :animation="animation"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  count: {
    type: Number,
    default: 4,
  },
  variant: {
    type: String,
    default: 'compact',
    validator: (value) => ['compact', 'dashboard'].includes(value),
  },
  animation: {
    type: String,
    default: 'wave',
  },
  hasFirstCardBreakdown: {
    type: Boolean,
    default: false,
  },
  breakdownCount: {
    type: Number,
    default: 4,
  },
  rowClass: {
    type: [String, Array, Object],
    default: 'row q-col-gutter-md q-mb-md',
  },
  colClass: {
    type: [String, Array, Object],
    default: '',
  },
})

const labelWidths = ['66%', '78%', '62%', '74%', '70%']
const valueWidths = ['32px', '28px', '34px', '28px', '30px']

const resolvedColClass = computed(() => {
  if (props.colClass) {
    return props.colClass
  }

  if (props.count === 2) {
    return 'col-12 col-sm-6'
  }

  if (props.count === 3) {
    return 'col-12 col-sm-4'
  }

  if (props.count === 4) {
    return 'col-12 col-sm-6 col-md-3'
  }

  return 'col-12 col-sm-6 col-md'
})
</script>

<style scoped>
.app-skeleton-kpi-dashboard {
  padding: 10px 12px 8px;
}

.app-skeleton-kpi-breakdown {
  display: grid;
  grid-template-columns: repeat(var(--breakdown-cols, 4), minmax(0, 1fr));
  gap: 6px;
}

.app-skeleton-kpi-compact {
  padding: 12px 14px;
}
</style>
