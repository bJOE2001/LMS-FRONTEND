<template>
  <q-dialog v-model="dialogModel" persistent>
    <q-card style="min-width: 360px; max-width: 540px; width: 95vw;" class="rounded-borders">
      <q-card-section class="bg-primary text-white row items-center justify-between q-py-sm">
        <div class="row items-center text-subtitle1 text-weight-bold">
          <q-icon name="print" class="q-mr-sm" size="sm" />
          Print Leave Application (CS Form No. 6)
        </div>
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-pt-md q-pb-xs">
        <!-- Applicant & Office Summary Card -->
        <div class="q-pa-sm q-mb-md rounded-borders" style="background: #f1f5f9; border: 1px solid #cbd5e1;">
          <div class="row items-center justify-between q-col-gutter-xs">
            <div class="col-12 col-sm-7">
              <div class="text-caption text-grey-7">Applicant</div>
              <div class="text-body2 text-weight-bold text-grey-9 text-ellipsis">
                {{ applicantName || 'N/A' }}
              </div>
            </div>
            <div class="col-12 col-sm-5 text-sm-right">
              <div class="text-caption text-grey-7">Leave Type</div>
              <q-badge color="primary" :label="leaveTypeName || 'Leave Application'" />
            </div>
          </div>
          <div class="q-mt-xs">
            <div class="text-caption text-grey-7">Assigned Office</div>
            <div class="text-caption text-weight-medium text-grey-9">
              {{ officeName || 'No Office Assigned' }}
            </div>
          </div>
        </div>

        <!-- Signatory Selection Section -->
        <div class="text-weight-bold text-grey-9 q-mb-xs row items-center">
          <q-icon name="draw" class="q-mr-xs text-primary" size="18px" />
          Recommending Official (Box 7.B)
        </div>
        <div class="text-caption text-grey-7 q-mb-sm">
          Select who will sign as the recommending authority for this application.
        </div>

        <q-option-group
          v-model="signatoryMode"
          :options="[
            { label: 'Default Signatory', value: 'default' },
            { label: 'Designate OIC / Replacement', value: 'custom' },
          ]"
          color="primary"
          class="q-mb-sm"
        />

        <!-- Default Signatory Info Box -->
        <div
          v-if="signatoryMode === 'default'"
          class="q-pa-sm rounded-borders q-mb-sm"
          style="background: #f8fafc; border: 1px dashed #94a3b8;"
        >
          <div v-if="loadingDefault" class="row items-center text-grey-7 q-pa-xs">
            <q-spinner-dots size="18px" color="primary" class="q-mr-sm" />
            Resolving default signatory...
          </div>
          <div v-else>
            <div class="text-caption text-grey-6 text-uppercase text-weight-bold">Default Signatory:</div>
            <div class="text-body2 text-weight-bold text-primary">
              {{ defaultSignatoryDisplay.fullName || 'No registered signatory found' }}
            </div>
            <div class="text-caption text-grey-8">
              {{ defaultSignatoryDisplay.designation || 'Authorized Official' }}
            </div>
          </div>
        </div>

        <!-- Custom Replacement Picker -->
        <div v-if="signatoryMode === 'custom'" class="q-gutter-y-sm q-mt-xs">
          <div>
            <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">
              Select Personnel from {{ officeName || 'Department' }} *
            </div>
            <q-select
              v-model="selectedEmployee"
              :options="employeeOptions"
              :loading="searchingEmployees"
              use-input
              fill-input
              hide-selected
              input-debounce="300"
              outlined
              dense
              option-label="label"
              placeholder="Type name to search personnel..."
              @filter="filterOfficeEmployees"
              @update:model-value="handleEmployeeSelected"
            >
              <template #no-option>
                <q-item>
                  <q-item-section class="text-grey-7">
                    No assigned active personnel found in {{ officeName }}.
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>

          <div v-if="selectedEmployee">
            <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">
              Official Designation / Title *
            </div>
            <q-input
              v-model="customDesignation"
              outlined
              dense
              placeholder="e.g. OIC - City Health Officer"
            />
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md q-pt-none">
        <q-btn flat label="Cancel" color="grey-8" v-close-popup />
        <q-btn
          unelevated
          color="primary"
          label="Print PDF"
          icon="print"
          :disable="signatoryMode === 'custom' && !selectedEmployee"
          @click="handlePrintClick"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import { resolveDefaultRecommendationSignatory } from 'src/utils/leave-form-pdf'

const $q = useQuasar()

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  application: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const dialogModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const signatoryMode = ref('default')
const loadingDefault = ref(false)
const defaultSignatoryDisplay = ref({ fullName: '', designation: '' })
const selectedEmployee = ref(null)
const employeeOptions = ref([])
const searchingEmployees = ref(false)
const customDesignation = ref('')

const applicantName = computed(() => {
  const app = props.application
  if (!app) return ''
  return (
    app.full_name ||
    app.fullName ||
    app.name ||
    [app.firstname, app.middlename, app.surname].filter(Boolean).join(' ') ||
    app.employee_name ||
    ''
  )
})

const officeName = computed(() => {
  const app = props.application
  if (!app) return ''
  return String(
    app.office ||
      app.department_name ||
      app.department?.name ||
      app.assigned_department_name ||
      app.applicantAdmin?.department?.name ||
      '',
  ).trim()
})

const departmentId = computed(() => {
  const app = props.application
  if (!app) return null
  return (
    app.department_id ||
    app.departmentId ||
    app.department?.id ||
    app.applicantAdmin?.department_id ||
    null
  )
})

const leaveTypeName = computed(() => {
  const app = props.application
  if (!app) return ''
  return (
    app.leave_type_name ||
    app.leave_type ||
    app.leaveType ||
    app.leave_type_code ||
    'Leave Application'
  )
})

async function resolveDefaultSignatory() {
  const app = props.application
  if (!app) return

  loadingDefault.value = true
  try {
    const signatory = await resolveDefaultRecommendationSignatory(app)
    defaultSignatoryDisplay.value = {
      fullName: signatory.fullName || 'Authorized Official',
      designation: signatory.designation || 'Authorized Official',
    }
  } catch {
    defaultSignatoryDisplay.value = {
      fullName: 'Authorized Official',
      designation: 'Authorized Official',
    }
  } finally {
    loadingDefault.value = false
  }
}

async function searchOfficeEmployees(searchTerm = '') {
  const office = officeName.value
  const deptId = departmentId.value
  if (!office && !deptId) {
    employeeOptions.value = []
    return
  }

  searchingEmployees.value = true
  try {
    const { data } = await api.get('/office-signatory-options', {
      params: {
        office: office || undefined,
        department_id: deptId || undefined,
        search: searchTerm || undefined,
        limit: 25,
      },
    })
    employeeOptions.value = Array.isArray(data?.employees) ? data.employees : []
  } catch {
    employeeOptions.value = []
  } finally {
    searchingEmployees.value = false
  }
}

async function filterOfficeEmployees(val, update, abort) {
  try {
    await searchOfficeEmployees(val)
    update()
  } catch {
    abort()
  }
}

watch(
  () => signatoryMode.value,
  async (mode) => {
    if (mode === 'custom' && employeeOptions.value.length === 0) {
      await searchOfficeEmployees('')
    }
  },
)

function handleEmployeeSelected(emp) {
  if (emp) {
    customDesignation.value = emp.designation || 'Authorized Official'
  } else {
    customDesignation.value = ''
  }
}

function handlePrintClick() {
  if (signatoryMode.value === 'custom') {
    if (!selectedEmployee.value) {
      $q.notify({
        type: 'warning',
        message: 'Please select a replacement employee from the office.',
        position: 'top',
      })
      return
    }
  }

  // Open the blank PDF target window immediately within this direct user gesture
  const pdfWindow = window.open('', '_blank')
  if (pdfWindow) {
    try {
      pdfWindow.document.title = 'Preparing PDF...'
      pdfWindow.document.body.innerHTML =
        '<div style="font-family: Arial, sans-serif; padding: 24px;">Preparing PDF...</div>'
    } catch {
      // Ignore interim window write errors
    }
  }

  let override = null
  if (signatoryMode.value === 'custom' && selectedEmployee.value) {
    override = {
      fullName: selectedEmployee.value.full_name,
      designation:
        customDesignation.value.trim() ||
        selectedEmployee.value.designation ||
        'Authorized Official',
    }
  }

  emit('confirm', {
    targetWindow: pdfWindow,
    override,
    application: props.application,
  })

  dialogModel.value = false
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      signatoryMode.value = 'default'
      selectedEmployee.value = null
      customDesignation.value = ''
      employeeOptions.value = []
      resolveDefaultSignatory()
    }
  },
)
</script>
