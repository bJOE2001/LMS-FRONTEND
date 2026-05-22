<template>
  <q-card flat bordered class="analytics-chart-card full-height">
    <q-card-section class="analytics-chart-card__section">
      <div class="row items-start justify-between q-mb-sm no-wrap">
        <div class="analytics-chart-card__heading">
          <div class="text-subtitle1 text-weight-bold">{{ title }}</div>
          <div v-if="subtitle" class="text-caption text-grey-7">{{ subtitle }}</div>
        </div>
        <q-chip v-if="badge" dense square color="green-1" text-color="primary" class="analytics-chart-card__badge">
          {{ badge }}
        </q-chip>
      </div>

      <div
        class="analytics-chart-card__body"
        :style="{ minHeight: `${height}px`, '--analytics-chart-height': `${height}px` }"
      >
        <q-skeleton v-if="loading" type="rect" class="analytics-chart-card__skeleton" />
        <div v-else-if="isEmpty" class="analytics-chart-card__empty">
          <q-icon name="insights" size="34px" color="grey-5" />
          <div class="text-body2 text-grey-7 q-mt-sm">No analytics data available.</div>
        </div>
        <q-no-ssr v-else>
          <component
            :is="chartComponent"
            :data="chartData"
            :options="chartJsOptions"
          />
        </q-no-ssr>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from 'chart.js'
import { Bar, Doughnut, Line, PolarArea } from 'vue-chartjs'

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
)

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
  badge: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    required: true,
  },
  height: {
    type: Number,
    default: 300,
  },
  options: {
    type: Object,
    required: true,
  },
  series: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const isEmpty = computed(() => {
  if (!Array.isArray(props.series) || props.series.length === 0) return true
  return props.series.every((entry) => {
    if (typeof entry === 'number') return entry <= 0
    if (!Array.isArray(entry?.data)) return true
    return entry.data.every((value) => Number(value || 0) <= 0)
  })
})

const defaultColors = [
  '#1f7a4d',
  '#2563eb',
  '#f59e0b',
  '#0891b2',
  '#7c3aed',
  '#94a3b8',
]

const chartComponent = computed(() => {
  if (props.type === 'donut') return Doughnut
  if (props.type === 'polarArea') return PolarArea
  if (props.type === 'line' || props.type === 'area') return Line
  return Bar
})

const chartLabels = computed(() => props.options?.labels ?? props.options?.xaxis?.categories ?? [])
  const chartColors = computed(() => {
  const colors = props.options?.colors
  return Array.isArray(colors) && colors.length ? colors : defaultColors
})
const isHorizontalBar = computed(() => props.options?.plotOptions?.bar?.horizontal === true)
const isStacked = computed(() => props.options?.chart?.stacked === true)
const hideCategoryLabels = computed(() => props.options?.hideCategoryLabels === true)

function alphaColor(color, alpha = 0.18) {
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) return color
  let hex = color.replace('#', '')
  if (hex.length === 3) {
    hex = hex.split('').map((value) => value + value).join('')
  }
  const red = parseInt(hex.slice(0, 2), 16)
  const green = parseInt(hex.slice(2, 4), 16)
  const blue = parseInt(hex.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function resolveTooltipValue(item) {
  const value = item?.parsed?.x ?? item?.parsed?.y ?? item?.raw ?? 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed.toLocaleString() : String(value)
}

function resolveTooltipColor(item) {
  const backgroundColor = item?.dataset?.backgroundColor
  if (Array.isArray(backgroundColor)) {
    return backgroundColor[item.dataIndex] ?? '#94a3b8'
  }
  return backgroundColor ?? item?.dataset?.borderColor ?? '#94a3b8'
}

function renderExternalTooltip(context) {
  const { chart, tooltip } = context
  const parent = chart.canvas.parentNode
  if (!parent) return

  let tooltipEl = parent.querySelector('.analytics-chart-tooltip')
  if (!tooltipEl) {
    tooltipEl = document.createElement('div')
    tooltipEl.className = 'analytics-chart-tooltip'
    parent.appendChild(tooltipEl)
  }

  if (tooltip.opacity === 0) {
    tooltipEl.style.opacity = '0'
    return
  }

  const title = tooltip.title?.[0] ?? ''
  const rows = tooltip.dataPoints
    .map((item) => {
      const label = item.dataset?.label || item.label || ''
      const value = resolveTooltipValue(item)
      const color = resolveTooltipColor(item)

      return `
        <div class="analytics-chart-tooltip__row">
          <span class="analytics-chart-tooltip__dot" style="background:${escapeHtml(color)}"></span>
          <span class="analytics-chart-tooltip__label">${escapeHtml(label)}</span>
          <span class="analytics-chart-tooltip__value">: ${escapeHtml(value)}</span>
        </div>
      `
    })
    .join('')

  tooltipEl.innerHTML = `
    <div class="analytics-chart-tooltip__title">${escapeHtml(title)}</div>
    ${rows}
  `

  const canvasRect = chart.canvas.getBoundingClientRect()
  const parentRect = parent.getBoundingClientRect()
  const tooltipWidth = tooltipEl.offsetWidth || 180
  const left = canvasRect.left - parentRect.left + tooltip.caretX
  const top = canvasRect.top - parentRect.top + tooltip.caretY
  const clampedLeft = Math.max(8, Math.min(left, parent.clientWidth - tooltipWidth - 8))

  tooltipEl.style.opacity = '1'
  tooltipEl.style.left = `${clampedLeft}px`
  tooltipEl.style.top = `${Math.max(8, top)}px`
}

const chartData = computed(() => {
  if (props.type === 'donut' || props.type === 'polarArea') {
    const data = props.type === 'polarArea' && props.series.some((item) => Array.isArray(item?.data))
      ? chartLabels.value.map((_label, labelIndex) =>
          props.series.reduce((sum, item) => sum + Number(item?.data?.[labelIndex] || 0), 0),
        )
      : props.series

    return {
      labels: chartLabels.value,
      datasets: [
        {
          data,
          backgroundColor: chartLabels.value.map((_label, index) => chartColors.value[index % chartColors.value.length]),
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 6,
          sourceSeries: props.series,
        },
      ],
    }
  }

  return {
    labels: chartLabels.value,
    datasets: props.series.map((item, index) => {
      const color = chartColors.value[index % chartColors.value.length]
      const backgroundColor = item?.backgroundColor ?? (props.type === 'area' ? alphaColor(color, 0.2) : color)
      const borderColor = item?.borderColor ?? color
      return {
        type: item?.type,
        label: item?.name ?? `Series ${index + 1}`,
        data: item?.data ?? [],
        borderColor,
        backgroundColor,
        borderWidth: item?.type === 'line' || props.type === 'line' || props.type === 'area' ? 3 : 0,
        borderRadius: item?.type === 'bar' || props.type === 'bar' ? 8 : 0,
        fill: props.type === 'area',
        pointRadius: item?.type === 'line' || props.type === 'line' || props.type === 'area' ? 4 : 0,
        pointHoverRadius: item?.type === 'line' || props.type === 'line' || props.type === 'area' ? 6 : 0,
        tension: item?.type === 'line' || props.type === 'line' || props.type === 'area' ? 0.38 : 0,
        stack: item?.type === 'line' ? undefined : item?.stack,
        order: item?.type === 'line' ? 0 : 1,
      }
    }),
  }
})

const chartJsOptions = computed(() => {
  const isDonut = props.type === 'donut'
  const isPolarArea = props.type === 'polarArea'
  const textColor = props.options?.theme?.mode === 'dark' ? '#cad5e4' : '#475569'
  const gridColor = props.options?.theme?.mode === 'dark' ? '#334155' : '#e2e8f0'

  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: isHorizontalBar.value ? 'y' : 'x',
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: props.options?.legend?.show !== false,
        position: props.options?.legend?.position ?? 'bottom',
        labels: {
          color: textColor,
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
        },
      },
      tooltip: {
        enabled: false,
        external: renderExternalTooltip,
        callbacks: {
          title: (items) => {
            const firstItem = items?.[0]
            const titleLabels = props.options?.tooltipTitleLabels
            if (Array.isArray(titleLabels) && firstItem?.dataIndex != null) {
              return titleLabels[firstItem.dataIndex] ?? firstItem.label
            }
            return firstItem?.label ?? ''
          },
          label: (context) => {
            const label = context.dataset?.label || context.label || ''
            const value = Number(context.parsed?.x ?? context.parsed?.y ?? context.raw ?? 0)
            return `${label}: ${Number.isFinite(value) ? value.toLocaleString() : context.raw}`
          },
          afterLabel: (context) => {
            if (!isPolarArea) return []
            const sourceSeries = context.dataset?.sourceSeries
            if (!Array.isArray(sourceSeries) || !sourceSeries.some((item) => Array.isArray(item?.data))) {
              return []
            }

            return sourceSeries.map((item) => {
              const value = Number(item?.data?.[context.dataIndex] || 0)
              return `${item?.name || 'Series'}: ${value.toLocaleString()}`
            })
          },
        },
      },
    },
    scales: isDonut
      ? {}
      : isPolarArea
        ? {
            r: {
              grid: {
                color: gridColor,
              },
              angleLines: {
                color: gridColor,
              },
              ticks: {
                display: false,
              },
              pointLabels: {
                display: false,
                centerPointLabels: true,
                color: textColor,
                font: {
                  size: 11,
                  weight: '600',
                },
              },
            },
          }
      : {
          x: {
            stacked: isStacked.value,
            grid: {
              display: !isHorizontalBar.value,
              color: gridColor,
            },
            ticks: {
              color: textColor,
              display: !hideCategoryLabels.value,
              maxRotation: isHorizontalBar.value ? 0 : 45,
              minRotation: 0,
            },
          },
          y: {
            stacked: isStacked.value,
            grid: {
              display: isHorizontalBar.value,
              color: gridColor,
            },
            ticks: {
              color: textColor,
              display: !hideCategoryLabels.value,
            },
          },
        },
  }
})
</script>

<style scoped>
.analytics-chart-card {
  border-radius: 8px;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.analytics-chart-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
  border-color: rgba(31, 122, 77, 0.24) !important;
}

.analytics-chart-card__section {
  padding: 18px;
}

.analytics-chart-card__heading {
  min-width: 0;
}

.analytics-chart-card__badge {
  flex: 0 0 auto;
}

.analytics-chart-card__body {
  position: relative;
  width: 100%;
  height: var(--analytics-chart-height, 300px);
}

.analytics-chart-card__skeleton {
  height: 100%;
  min-height: inherit;
  border-radius: 8px;
}

.analytics-chart-card__empty {
  min-height: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  border: 1px dashed #d7dee8;
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.72);
}

.analytics-chart-card__body :deep(canvas:focus),
.analytics-chart-card__body :deep(canvas:focus-visible) {
  outline: none !important;
  box-shadow: none !important;
}

.analytics-chart-card__body :deep(.analytics-chart-tooltip) {
  position: absolute;
  z-index: 20;
  min-width: 168px;
  padding: 8px 10px;
  pointer-events: none;
  transform: translate(-50%, 8px);
  border: 1px solid #dbe3ec;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.14);
  color: #0f172a;
  opacity: 0;
  transition: opacity 0.12s ease;
}

.analytics-chart-card__body :deep(.analytics-chart-tooltip__title) {
  margin-bottom: 4px;
  font-weight: 700;
  font-size: 12px;
  color: #0f172a;
}

.analytics-chart-card__body :deep(.analytics-chart-tooltip__row) {
  display: grid;
  grid-template-columns: 10px 78px max-content;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.2;
}

.analytics-chart-card__body :deep(.analytics-chart-tooltip__dot) {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.analytics-chart-card__body :deep(.analytics-chart-tooltip__label) {
  overflow: hidden;
  color: #334155;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analytics-chart-card__body :deep(.analytics-chart-tooltip__value) {
  color: #0f172a;
  text-align: left;
  font-weight: 700;
  white-space: nowrap;
}

:global(body.body--dark) .analytics-chart-card__body :deep(.analytics-chart-tooltip) {
  border-color: #324258;
  background: #1b2330;
  color: #e6edf5;
}

:global(body.body--dark) .analytics-chart-card__body :deep(.analytics-chart-tooltip__title),
:global(body.body--dark) .analytics-chart-card__body :deep(.analytics-chart-tooltip__value) {
  color: #e6edf5;
}

:global(body.body--dark) .analytics-chart-card__body :deep(.analytics-chart-tooltip__label) {
  color: #cad5e4;
}
</style>
