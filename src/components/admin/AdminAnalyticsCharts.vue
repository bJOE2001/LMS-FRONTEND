<template>
  <div class="row q-col-gutter-md q-mb-lg">
    <div class="col-12 col-md-6">
      <AdminMonthlyLeaveTrendChart
        :applications="applications"
        :analytics="analytics"
        :loading="loading"
      />
    </div>

    <div class="col-12 col-md-6">
      <AdminLeaveTypeTrendChart
        :applications="applications"
        :analytics="analytics"
        :loading="loading"
      />
    </div>
  </div>
</template>

<script setup>
import AdminLeaveTypeTrendChart from 'src/components/admin/charts/AdminLeaveTypeTrendChart.vue'
import AdminMonthlyLeaveTrendChart from 'src/components/admin/charts/AdminMonthlyLeaveTrendChart.vue'

defineProps({
  applications: {
    type: Array,
    default: () => [],
  },
  analytics: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})
</script>
