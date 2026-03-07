<template>
  <q-page class="q-pa-md">
    <q-btn flat dense icon="arrow_back" label="Back to Dashboard" color="primary" :to="{ path: '/admin/dashboard' }" class="q-mb-md" />

    <q-card v-if="application" flat bordered class="rounded-borders">
      <q-card-section class="bg-primary text-white">
        <div class="row items-center">
          <div class="text-h5">Application #{{ application.id }}</div>
          <q-space />
          <q-btn
            flat
            dense
            icon="print"
            label="Print"
            class="text-white"
            @click="printApplication"
          />
        </div>
      </q-card-section>
      <q-card-section>
        <div class="text-h6 q-mb-md">Employee Information</div>
        <div class="row q-col-gutter-md q-mb-lg">
          <div class="col-12 col-md-6"><div class="text-caption text-grey-7">Name</div><div class="text-weight-medium">{{ application.employeeName }}</div></div>
          <div class="col-12 col-md-6"><div class="text-caption text-grey-7">Control No</div><div class="text-weight-medium">{{ application.employee_id }}</div></div>
          <div class="col-12"><div class="text-caption text-grey-7">Department</div><div class="text-weight-medium">{{ application.office }}</div></div>
        </div>

        <div class="text-h6 q-mb-md">{{ application.is_monetization ? 'Monetization Details' : 'Leave Details' }}</div>
        <div class="row q-col-gutter-md">
          <div class="col-12">
            <div class="text-caption text-grey-7">Leave Type</div>
            <div class="text-weight-medium">{{ application.leaveType }}{{ application.is_monetization ? ' (Monetization)' : '' }}</div>
          </div>
          <template v-if="!application.is_monetization">
            <div class="col-12 col-md-6"><div class="text-caption text-grey-7">Start Date</div><div class="text-weight-medium">{{ application.startDate ? formatDate(application.startDate) : 'N/A' }}</div></div>
            <div class="col-12 col-md-6"><div class="text-caption text-grey-7">End Date</div><div class="text-weight-medium">{{ application.endDate ? formatDate(application.endDate) : 'N/A' }}</div></div>
          </template>
          <div class="col-12 col-md-6">
            <div class="text-caption text-grey-7">{{ application.is_monetization ? 'Days to Monetize' : 'Number of Days' }}</div>
            <div class="text-weight-medium">{{ application.days }} day(s)</div>
          </div>
          <div v-if="application.is_monetization && application.equivalent_amount" class="col-12 col-md-6">
            <div class="text-caption text-grey-7">Estimated Amount</div>
            <div class="text-weight-medium">&#8369;{{ Number(application.equivalent_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</div>
          </div>
          <div class="col-12 col-md-6"><div class="text-caption text-grey-7">Date Filed</div><div class="text-weight-medium">{{ formatDate(application.dateFiled) }}</div></div>
          <div class="col-12"><div class="text-caption text-grey-7">Reason</div><div class="bg-grey-3 q-pa-sm rounded-borders">{{ application.reason }}</div></div>
          <div class="col-12"><div class="text-caption text-grey-7">Status</div><StatusBadge :status="application.status" /></div>
        </div>

        <div v-if="application.status === 'Pending'" class="q-mt-lg q-pt-lg" style="border-top: 1px solid rgba(0,0,0,0.12)">
          <div class="text-h6 q-mb-md">Action Required</div>
          <div class="row q-gutter-md">
            <q-btn unelevated color="green-7" label="Approve Application" icon="check_circle" @click="handleApprove" />
            <q-btn unelevated color="negative" label="Disapprove Application" icon="cancel" @click="showDisapprove = true" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <div v-else class="text-center q-pa-xl text-grey-7">Application not found</div>

    <q-dialog v-model="showDisapprove" persistent>
      <q-card style="min-width: 360px">
        <q-card-section><div class="text-h6">Disapprove Application</div></q-card-section>
        <q-card-section class="q-pt-none">
          <q-input v-model="remarks" type="textarea" label="Reason for disapproval" rows="4" outlined />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn unelevated color="negative" label="Submit" @click="handleDisapprove" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLeaveStore } from 'stores/leave-store'
import StatusBadge from 'components/StatusBadge.vue'
import { generateLeaveFormPdf } from 'src/composables/useLeaveFormPdf'

const route = useRoute()
const router = useRouter()
const leaveStore = useLeaveStore()

const application = computed(() => leaveStore.getApplicationById(route.params.id))
const showDisapprove = ref(false)
const remarks = ref('')

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
function handleApprove() {
  leaveStore.updateApplicationStatus(application.value.id, 'Approved')
  router.push('/admin/dashboard')
}
function handleDisapprove() {
  if (!remarks.value.trim()) return
  leaveStore.updateApplicationStatus(application.value.id, 'Disapproved', remarks.value)
  router.push('/admin/dashboard')
}
function printApplication() {
  generateLeaveFormPdf(application.value)
}
</script>
