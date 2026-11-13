import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'

/**
 * Reusable table + filter state composable supporting both server-side (@request)
 * and client-side filtering/pagination flows.
 */
export function useDataTable(options = {}) {
  const {
    initialFilters = {},
    initialPagination = {},
    server = false,
    debounceMs = 350,
    onFetch = null,
    onReset = null,
  } = options

  const cloneInitialFilters = () => ({ ...initialFilters })

  const search = ref('')
  const filters = reactive(cloneInitialFilters())
  const rows = ref([])
  const loading = ref(false)

  const pagination = ref({
    sortBy: initialPagination.sortBy ?? null,
    descending: initialPagination.descending ?? false,
    page: initialPagination.page ?? 1,
    rowsPerPage: initialPagination.rowsPerPage ?? 20,
    ...(server ? { rowsNumber: initialPagination.rowsNumber ?? 0 } : {}),
  })

  const hasActiveFilters = computed(() => {
    if (String(search.value || '').trim() !== '') {
      return true
    }

    return Object.keys(initialFilters).some((key) => filters[key] !== initialFilters[key])
  })

  let suppressWatch = false
  let searchTimer = null

  async function fetch() {
    if (typeof onFetch !== 'function') {
      return
    }

    loading.value = true
    try {
      const result = await onFetch({
        page: pagination.value.page,
        rowsPerPage: pagination.value.rowsPerPage,
        sortBy: pagination.value.sortBy,
        descending: pagination.value.descending,
        search: String(search.value || '').trim(),
        filters: { ...filters },
      })

      if (result && typeof result === 'object' && Array.isArray(result.rows)) {
        rows.value = result.rows
        if (server) {
          pagination.value.rowsNumber = result.total ?? result.rows.length
          if (result.currentPage != null) {
            pagination.value.page = result.currentPage
          }
        }
      }
    } finally {
      loading.value = false
    }
  }

  function onRequest(props) {
    if (!props?.pagination) return
    pagination.value.page = props.pagination.page
    pagination.value.rowsPerPage = props.pagination.rowsPerPage
    pagination.value.sortBy = props.pagination.sortBy ?? initialPagination.sortBy ?? null
    pagination.value.descending = props.pagination.descending ?? false
    fetch()
  }

  function resetFilters({ fetchAfter = true } = {}) {
    clearTimeout(searchTimer)
    suppressWatch = true
    search.value = ''
    const defaults = cloneInitialFilters()
    Object.keys(defaults).forEach((key) => {
      filters[key] = defaults[key]
    })
    suppressWatch = false

    if (typeof onReset === 'function') {
      onReset()
    }

    pagination.value.page = 1
    if (server && fetchAfter) {
      fetch()
    }
  }

  watch(search, () => {
    if (suppressWatch) return
    if (!server) {
      pagination.value.page = 1
      return
    }

    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      pagination.value.page = 1
      fetch()
    }, debounceMs)
  })

  watch(
    () => ({ ...filters }),
    () => {
      if (suppressWatch) return
      pagination.value.page = 1
      if (server) {
        fetch()
      }
    }
  )

  onBeforeUnmount(() => {
    clearTimeout(searchTimer)
  })

  return {
    search,
    filters,
    rows,
    loading,
    pagination,
    hasActiveFilters,
    fetch,
    refresh: fetch,
    onRequest,
    resetFilters,
  }
}

