<template>
  <div :class="rowClass">
    <div v-for="n in count" :key="n" :class="resolvedColClass">
      <q-card
        flat
        bordered
        :class="[
          'bg-white full-height app-skeleton-card',
          variant === 'dashboard' ? 'app-skeleton-kpi-card' : 'rounded-borders',
        ]"
      >
        <q-card-section
          v-if="variant === 'dashboard'"
          class="app-skeleton-kpi-dashboard column justify-between full-height"
        >
          <div class="row items-center justify-between no-wrap q-gutter-x-sm">
            <div class="row items-center no-wrap q-gutter-x-sm col">
              <q-skeleton
                type="rect"
                width="26px"
                height="26px"
                class="app-skeleton-kpi-icon app-skeleton-element flex-shrink-0"
                :animation="animation"
              />
              <q-skeleton
                type="text"
                :width="labelWidths[(n - 1) % labelWidths.length]"
                height="13px"
                class="app-skeleton-element"
                :animation="animation"
              />
            </div>
            <q-skeleton
              type="text"
              :width="valueWidths[(n - 1) % valueWidths.length]"
              height="24px"
              class="app-skeleton-element flex-shrink-0"
              :animation="animation"
            />
          </div>

          <div
            v-if="hasFirstCardBreakdown && n === 1"
            class="app-skeleton-kpi-breakdown"
            :style="{ '--breakdown-cols': Math.min(breakdownCount, 2) }"
          >
            <q-skeleton
              v-for="b in breakdownCount"
              :key="b"
              type="rect"
              width="100%"
              height="20px"
              class="app-skeleton-kpi-pill app-skeleton-element"
              :animation="animation"
            />
          </div>

          <div v-else class="row items-center no-wrap">
            <q-skeleton
              type="text"
              :width="hintWidths[(n - 1) % hintWidths.length]"
              height="11px"
              class="app-skeleton-element"
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

const labelWidths = ['64%', '74%', '58%', '68%', '66%']
const hintWidths = ['52%', '56%', '62%', '44%', '48%']
const valueWidths = ['26px', '24px', '26px', '24px', '26px']

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
.app-skeleton-kpi-card {
  min-height: 92px;
  border-radius: 10px;
}

.app-skeleton-kpi-dashboard {
  padding: 9px 11px 8px;
  gap: 7px;
}

.app-skeleton-kpi-icon {
  border-radius: 7px;
}

.app-skeleton-kpi-breakdown {
  display: grid;
  grid-template-columns: repeat(var(--breakdown-cols, 2), minmax(0, 1fr));
  gap: 4px;
}

.app-skeleton-kpi-pill {
  border-radius: 6px;
}

.app-skeleton-kpi-compact {
  padding: 12px 14px;
}
</style>
