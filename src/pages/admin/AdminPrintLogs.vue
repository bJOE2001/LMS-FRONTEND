<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-lg">
      <h1 class="text-h4 text-weight-bold q-mt-none q-mb-none">
        Print Logs
      </h1>
      <q-space />
    </div>

    <q-card flat bordered class="rounded-borders">
      <q-card-section>
        <div class="row justify-between items-center q-mb-md">
          <div class="text-h6">Print History</div>
          <q-input
            v-model="search"
            outlined
            dense
            debounce="400"
            placeholder="Search logs..."
            clearable
            @update:model-value="onSearch"
          >
            <template #prepend>
              <q-icon name="search" size="sm" color="grey-6" />
            </template>
          </q-input>
        </div>

        <q-table
          :rows="logs"
          :columns="columns"
          row-key="id"
          flat
          :loading="loading"
          :rows-per-page-options="[15, 30, 50]"
          v-model:pagination="pagination"
          @request="onRequest"
        >
          <template #body-cell-tracking_no="props">
            <q-td :props="props">
              <div class="text-weight-bold text-primary">
                {{ props.row.leave_application ? '#' + props.row.leave_application.id : (props.row.leave_application_id ? '#' + props.row.leave_application_id : '-') }}
              </div>
            </q-td>
          </template>

          <template #body-cell-applicant="props">
            <q-td :props="props">
              <div>
                {{ props.row.leave_application?.employee_name || props.row.leave_application?.employee_control_no || '-' }}
              </div>
            </q-td>
          </template>

          <template #body-cell-printed_by="props">
            <q-td :props="props">
              <div>{{ props.row.printed_by_name || '-' }}</div>
              <q-badge
                :color="props.row.printed_by_type === 'ADMIN' ? 'negative' : 'primary'"
                class="q-mt-xs"
              >
                {{ props.row.printed_by_type }}
              </q-badge>
            </q-td>
          </template>

          <template #body-cell-created_at="props">
            <q-td :props="props">
              <div>{{ formatDate(props.row.created_at) }}</div>
              <div class="text-caption text-grey">{{ formatTime(props.row.created_at) }}</div>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from 'boot/axios'
import { date } from 'quasar'

const route = useRoute()
const loading = ref(false)
const logs = ref([])
const search = ref('')

const pagination = ref({
  sortBy: 'created_at',
  descending: true,
  page: 1,
  rowsPerPage: 15,
  rowsNumber: 0
})

const columns = [
  { name: 'tracking_no', label: 'ID', align: 'left', sortable: false },
  { name: 'applicant', label: 'Applicant', align: 'left', sortable: false },
  { name: 'printed_by', label: 'Printed By', align: 'left', sortable: true, field: 'printed_by_name' },
  { name: 'ip_address', label: 'IP Address', align: 'left', field: 'ip_address', sortable: false },
  { name: 'created_at', label: 'Date/Time Printed', align: 'left', field: 'created_at', sortable: true },
  { name: 'remarks', label: 'Remarks', align: 'left', field: 'remarks', sortable: false }
]

const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  
  loading.value = true
  const endpoint = route.path.startsWith('/hr') ? '/hr/application-print-logs' : '/admin/application-print-logs'
  
  try {
    const response = await api.get(endpoint, {
      params: {
        page,
        rowsPerPage,
        sortBy,
        descending,
        search: search.value
      }
    })
    
    logs.value = response.data.data
    
    pagination.value.rowsNumber = response.data.total
    pagination.value.page = response.data.current_page
    pagination.value.rowsPerPage = response.data.per_page
    pagination.value.sortBy = sortBy
    pagination.value.descending = descending
  } catch (error) {
    console.error('Error fetching print logs:', error)
  } finally {
    loading.value = false
  }
}

const onSearch = () => {
  pagination.value.page = 1
  onRequest({ pagination: pagination.value })
}

const formatDate = (val) => {
  if (!val) return '-'
  return date.formatDate(val, 'MMM D, YYYY')
}

const formatTime = (val) => {
  if (!val) return '-'
  return date.formatDate(val, 'hh:mm A')
}

onMounted(() => {
  onRequest({ pagination: pagination.value })
})
</script>

<style scoped>
</style>
