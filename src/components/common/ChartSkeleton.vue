<template>
  <div v-if="loading" :class="['app-chart-loader', { 'app-chart-loader--overlay': hasData }]" :style="{ minHeight: height }">
    <div v-if="hasData" class="app-chart-loader__overlay">
      <div class="app-chart-loader__pill row items-center no-wrap q-gutter-x-sm">
        <q-spinner color="primary" size="18px" />
        <span class="text-caption text-weight-medium">{{ label }}</span>
      </div>
    </div>

    <div v-else class="app-chart-loader__skeleton column justify-between full-width full-height q-pa-sm">
      <template v-if="variant === 'pie'">
        <div class="col column items-center justify-center">
          <div class="app-chart-loader__donut">
            <q-skeleton type="circle" size="148px" animation="wave" class="app-skeleton-element" />
            <div class="app-chart-loader__donut-hole" />
          </div>
          <div class="row items-center justify-center q-gutter-sm q-mt-md">
            <q-skeleton
              v-for="idx in 4"
              :key="`pie-legend-${idx}`"
              type="QChip"
              width="74px"
              height="20px"
              animation="wave"
              class="app-skeleton-element"
            />
          </div>
        </div>
      </template>

      <template v-else>
        <div class="col column justify-end app-chart-loader__plot">
          <div class="app-chart-loader__bars row items-end justify-between no-wrap q-col-gutter-sm full-width">
            <div
              v-for="(barHeight, idx) in barHeights"
              :key="`chart-bar-${idx}`"
              class="col column justify-end items-center full-height"
            >
              <q-skeleton
                type="rect"
                width="100%"
                :height="barHeight"
                animation="wave"
                class="app-skeleton-element rounded-borders"
                style="max-width: 34px;"
              />
            </div>
          </div>
        </div>
        <div class="row items-center justify-between q-pt-sm q-px-xs">
          <q-skeleton
            v-for="tick in 6"
            :key="`tick-${tick}`"
            type="text"
            width="28px"
            height="12px"
            animation="wave"
            class="app-skeleton-element"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  hasData: {
    type: Boolean,
    default: false,
  },
  variant: {
    type: String,
    default: 'area',
    validator: (value) => ['area', 'line', 'pie', 'bar'].includes(value),
  },
  height: {
    type: String,
    default: '240px',
  },
  label: {
    type: String,
    default: 'Updating chart...',
  },
})

const barHeights = ['42%', '64%', '52%', '78%', '60%', '88%', '55%', '72%']
</script>

