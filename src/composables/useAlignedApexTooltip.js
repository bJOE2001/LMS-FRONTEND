export function buildAlignedApexTooltip({
  isDark = false,
  yFormatter = null,
  labelWidth = 92,
} = {}) {
  const tooltipBg = isDark ? '#1b2330' : '#ffffff'
  const tooltipText = isDark ? '#e6edf5' : '#0f172a'
  const tooltipMuted = isDark ? '#cad5e4' : '#334155'
  const tooltipBorder = isDark ? '#324258' : '#dbe3ec'

  return ({ series, seriesIndex, dataPointIndex, w }) => {
    const category =
      w?.globals?.categoryLabels?.[dataPointIndex] ??
      w?.globals?.labels?.[dataPointIndex] ??
      w?.config?.xaxis?.categories?.[dataPointIndex] ??
      ''
    const chartSeries = w?.config?.series ?? []
    const chartColors = w?.globals?.colors ?? w?.config?.colors ?? []

    const rows = chartSeries
      .map((item, index) => {
        const rawValue = series?.[index]?.[dataPointIndex]
        if (rawValue == null) return ''

        const markerColor = chartColors[index] ?? '#94a3b8'
        const value = yFormatter ? yFormatter(rawValue) : Number(rawValue).toLocaleString()
        const label = item?.name ?? `Series ${index + 1}`
        const activeWeight = index === seriesIndex ? 700 : 600

        return `
          <div style="display:flex;align-items:center;gap:6px;margin-top:7px;color:${tooltipText};font-weight:${activeWeight};">
            <span style="width:10px;height:10px;border-radius:999px;background:${markerColor};display:inline-block;flex:0 0 10px;"></span>
            <span style="width:${labelWidth}px;min-width:${labelWidth}px;max-width:${labelWidth}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${tooltipMuted};">${label}</span>
            <span style="width:8px;text-align:center;color:${tooltipMuted};">:</span>
            <span style="min-width:24px;text-align:right;color:${tooltipText};font-weight:700;">${value}</span>
          </div>
        `
      })
      .join('')

    return `
      <div style="padding:8px 10px;background:${tooltipBg};border:1px solid ${tooltipBorder};box-shadow:0 8px 22px rgba(15,23,42,.14);border-radius:6px;font-family:inherit;">
        <div style="margin-bottom:2px;color:${tooltipText};font-weight:700;">${category}</div>
        ${rows}
      </div>
    `
  }
}
