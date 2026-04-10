import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export function useApexChartTitleCleanup(watchSources = []) {
  const chartRoot = ref(null)
  let chartTitleCleanupObserver = null

  function removeNativeChartTitleTooltip() {
    if (!chartRoot.value) return

    chartRoot.value
      .querySelectorAll('[title]')
      .forEach((node) => {
        if (String(node.getAttribute('title') || '').trim().toLowerCase() === 'chart') {
          node.removeAttribute('title')
        }
      })

    chartRoot.value
      .querySelectorAll('title')
      .forEach((node) => {
        if (String(node.textContent || '').trim().toLowerCase() === 'chart') {
          node.remove()
        }
      })
  }

  function syncNativeChartTitleCleanup() {
    nextTick(removeNativeChartTitleTooltip)
  }

  onMounted(() => {
    syncNativeChartTitleCleanup()

    if (chartRoot.value) {
      chartTitleCleanupObserver = new MutationObserver(syncNativeChartTitleCleanup)
      chartTitleCleanupObserver.observe(chartRoot.value, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['title'],
      })
    }
  })

  if (Array.isArray(watchSources) && watchSources.length > 0) {
    watch(watchSources, syncNativeChartTitleCleanup, {
      deep: true,
    })
  }

  onBeforeUnmount(() => {
    chartTitleCleanupObserver?.disconnect()
    chartTitleCleanupObserver = null
  })

  return {
    chartRoot,
    syncNativeChartTitleCleanup,
  }
}
