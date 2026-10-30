<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="onDialogModelUpdate">
    <q-card class="rounded-borders leave-credit-dialog">
      <q-card-section class="row items-center q-pb-none">
        <q-icon :name="dialogIcon" size="sm" color="secondary" class="q-mr-sm" />
        <div class="text-h6">{{ dialogTitle }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup :disable="saving" />
      </q-card-section>

      <q-card-section class="q-pt-sm">
        <q-banner dense rounded class="bg-blue-1 text-blue-9 q-mb-md">
          <template #avatar>
            <q-icon name="info" color="blue-8" />
          </template>
          {{ dialogDescription }}
        </q-banner>

        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-7">
            <q-select
              ref="employeeSelectRef"
              v-model="form.employee_control_no"
              v-model:input-value="employeeSearchText"
              :options="employeeOptions"
              outlined
              dense
              emit-value
              map-options
              option-label="label"
              option-value="value"
              use-input
              fill-input
              hide-selected
              input-debounce="300"
              clearable
              label="Employee Name *"
              :loading="loadingEmployees"
              :disable="isEditMode"
              @filter="onFilterEmployees"
            >
              <template #option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>
                    <q-item-label>{{ scope.opt.label }}</q-item-label>
                    <q-item-label v-if="scope.opt.caption" caption>
                      {{ scope.opt.caption }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </template>
              <template #no-option>
                <q-item>
                  <q-item-section class="text-grey-7">
                    {{ noOptionMessage }}
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>

          <div class="col-12 col-sm-5">
            <q-input
              v-model="form.as_of_date"
              outlined
              dense
              label="As of Date *"
              :rules="[(val) => !!val || 'As of date is required']"
            >
              <template #append>
                <q-icon name="event" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date v-model="form.as_of_date" mask="YYYY-MM-DD">
                      <div class="row items-center justify-end q-gutter-sm q-pa-sm">
                        <q-btn v-close-popup label="Close" color="primary" flat no-caps />
                      </div>
                    </q-date>
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </div>

          <div class="col-12">
            <div class="row items-start justify-between q-col-gutter-sm">
              <div class="col">
                <div class="text-subtitle2 text-weight-medium">Leave Type Balances</div>
                <div class="text-caption text-grey-6">Fill all allowed leave type balances.</div>
              </div>
              <div class="col-auto">
                <q-btn
                  flat
                  no-caps
                  label="COC Credits"
                  color="primary"
                  icon="event_available"
                  :disable="!canOpenCocImport || saving"
                  @click="showCocImportDialog = true"
                />
              </div>
            </div>
          </div>

          <template v-if="loadingLeaveTypes">
            <div class="col-12">
              <div class="row items-center q-gutter-sm text-grey-7">
                <q-spinner color="secondary" size="20px" />
                <span>Loading leave types...</span>
              </div>
            </div>
          </template>

          <template v-else-if="creditLeaveTypes.length">
            <div
              v-for="leaveType in creditLeaveTypes"
              :key="leaveType.id"
              class="col-12 col-sm-6"
            >
              <q-input
                v-model="form.balances[leaveType.id]"
                outlined
                dense
                type="number"
                min="0"
                :max="resolveLeaveTypeMaxDays(leaveType) ?? undefined"
                step="0.001"
                :label="`${getLeaveTypeDisplayName(leaveType)} *`"
                :hint="formatLeaveTypeInputHint(leaveType)"
                :rules="leaveCreditBalanceRules(leaveType)"
                lazy-rules
              />
            </div>
          </template>

          <div v-else class="col-12">
            <q-banner dense rounded class="bg-orange-1 text-orange-9">
              {{ creditLeaveTypesEmptyMessage }}
            </q-banner>
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn
          flat
          no-caps
          label="Cancel"
          color="grey-7"
          v-close-popup
          :disable="saving"
        />
        <q-btn
          unelevated
          no-caps
          :label="saveButtonLabel"
          color="secondary"
          :icon="isEditMode ? 'edit' : 'save'"
          :loading="saving"
          @click="submitSave"
        />
      </q-card-actions>
    </q-card>

    <HrEmployeeCocImportDialog
      v-model="showCocImportDialog"
      :employee-control-no="form.employee_control_no"
      :employee-label="selectedEmployeeLabel"
      @saved="onCocImportSaved"
    />
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import { useEmployeeStore } from 'src/stores/employee-store'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'
import HrEmployeeCocImportDialog from 'src/components/hr/HrEmployeeCocImportDialog.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  mode: {
    type: String,
    default: 'ADD', // 'ADD' or 'EDIT'
  },
  employee: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const $q = useQuasar()
const employeeStore = useEmployeeStore()

const isEditMode = computed(() => props.mode === 'EDIT')
const dialogIcon = computed(() => (isEditMode.value ? 'edit_note' : 'post_add'))
const dialogTitle = computed(() => (isEditMode.value ? 'Edit Leave Balances' : 'Add Leave Credits'))
const saveButtonLabel = computed(() => (isEditMode.value ? 'Update Balances' : 'Save Leave Credits'))
const dialogDescription = computed(() =>
  isEditMode.value
    ? 'Update current leave balances directly. Existing ledger history is preserved.'
    : 'Initialize beginning or manual leave balances for the selected employee.',
)

function getTodayIsoDate() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const form = ref({
  employee_control_no: '',
  as_of_date: getTodayIsoDate(),
  balances: {},
})

const creditLeaveTypes = ref([])
const loadingLeaveTypes = ref(false)
const saving = ref(false)

const employeeSearchText = ref('')
const employeeOptions = ref([])
const loadingEmployees = ref(false)
const showCocImportDialog = ref(false)

const canOpenCocImport = computed(() => {
  const controlNo = String(form.value.employee_control_no ?? '').trim()
  return /^\d+$/.test(controlNo)
})

const selectedEmployeeLabel = computed(() => {
  const controlNo = String(form.value.employee_control_no ?? '').trim()
  if (!controlNo) return ''
  const match = employeeOptions.value.find((opt) => String(opt.value) === controlNo)
  return match?.label || controlNo
})

const noOptionMessage = computed(() => {
  const trimmed = employeeSearchText.value.trim()
  if (!trimmed) return 'Type at least 2 characters to search employee records.'
  if (trimmed.length < 2) return 'Type at least 2 characters to search.'
  return `No employees found matching "${trimmed}".`
})

const creditLeaveTypesEmptyMessage = computed(() => {
  if (!form.value.employee_control_no) {
    return 'Select an employee to load allowed leave types.'
  }
  return 'No credit-based leave types available for this employee.'
})

function getLeaveTypeDisplayName(leaveType) {
  return String(leaveType?.display_name || leaveType?.name || '').trim()
}

function resolveLeaveTypeMaxDays(leaveType) {
  const rawMax = leaveType?.max_days ?? leaveType?.maxDays
  const max = Number(rawMax)
  return Number.isFinite(max) && max >= 0 ? max : null
}

function formatDayLimitLabel(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return ''
  return `${num} day${num === 1 ? '' : 's'}`
}

function normalizeInputVal(val) {
  if (val === null || val === undefined) return ''
  return typeof val === 'string' ? val.trim() : val
}

function leaveCreditBalanceRules(leaveType) {
  const label = getLeaveTypeDisplayName(leaveType)
  return [
    (val) => {
      const raw = normalizeInputVal(val)
      if (raw === '') return `${label} is required.`
      const num = Number(raw)
      if (!Number.isFinite(num)) return `${label} must be a number.`
      if (num < 0) return `${label} cannot be negative.`
      const max = resolveLeaveTypeMaxDays(leaveType)
      if (max !== null && num > max) {
        return `${label} cannot exceed ${formatDayLimitLabel(max)}.`
      }
      return true
    },
  ]
}

function formatLeaveTypeInputHint(leaveType) {
  const max = resolveLeaveTypeMaxDays(leaveType)
  if (max === null) return ''
  return `Max ${formatDayLimitLabel(max)}`
}

// Dialog open/close lifecycle
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      form.value.as_of_date = getTodayIsoDate()
      form.value.balances = {}
      creditLeaveTypes.value = []

      const emp = props.employee
      if (emp?.control_no) {
        const cNo = String(emp.control_no).trim()
        form.value.employee_control_no = cNo
        upsertEmployeeOption(emp)
        await loadAvailableLeaveTypes(cNo, isEditMode.value)
      } else {
        form.value.employee_control_no = ''
        employeeOptions.value = []
      }
    }
  },
)

// Watch employee change in ADD mode
watch(
  () => form.value.employee_control_no,
  async (newVal, oldVal) => {
    if (!props.modelValue) return
    const cNo = String(newVal ?? '').trim()
    if (!cNo) {
      creditLeaveTypes.value = []
      form.value.balances = {}
      return
    }
    if (cNo !== String(oldVal ?? '').trim()) {
      await loadAvailableLeaveTypes(cNo, isEditMode.value)
    }
  },
)

function upsertEmployeeOption(emp) {
  if (!emp?.control_no) return
  const val = String(emp.control_no)
  const lastName = String(emp.last_name || '').trim()
  const firstName = String(emp.first_name || '').trim()
  const middleName = String(emp.middle_name || '').trim()
  const extension = String(emp.name_extension || '').trim()
  const fullName = [lastName, [firstName, middleName].filter(Boolean).join(' '), extension].filter(Boolean).join(', ') || emp.name || val

  const exists = employeeOptions.value.some((opt) => String(opt.value) === val)
  if (!exists) {
    employeeOptions.value = [
      {
        label: `${fullName} (${val})`,
        value: val,
        caption: emp.designation || emp.office || '',
      },
      ...employeeOptions.value,
    ]
  }
}

async function loadAvailableLeaveTypes(controlNo, prefillBalances = false) {
  loadingLeaveTypes.value = true
  try {
    const data = await employeeStore.fetchAvailableLeaveTypes(controlNo)
    const types = Array.isArray(data?.leave_types) ? data.leave_types : []

    creditLeaveTypes.value = types
      .map((t) => ({ ...t, is_credit_based: t?.is_credit_based ?? true }))
      .filter((t) => t.is_credit_based && String(t?.name || '').trim().toLowerCase() !== 'cto leave')

    if (prefillBalances) {
      if (data?.as_of_date) {
        form.value.as_of_date = String(data.as_of_date)
      }
      const balances = {}
      for (const t of creditLeaveTypes.value) {
        const key = String(t.id)
        const editable = Number(t?.editable_balance ?? t?.current_balance ?? 0)
        balances[key] = Number.isFinite(editable) ? editable.toFixed(3) : '0.000'
      }
      form.value.balances = balances
    } else {
      const balances = {}
      for (const t of creditLeaveTypes.value) {
        balances[String(t.id)] = ''
      }
      form.value.balances = balances
    }
  } catch (err) {
    creditLeaveTypes.value = []
    form.value.balances = {}
    const msg = resolveApiErrorMessage(err, 'Unable to load leave types right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    loadingLeaveTypes.value = false
  }
}

async function onFilterEmployees(val, update) {
  employeeSearchText.value = String(val ?? '')
  const query = employeeSearchText.value.trim()

  if (query.length < 2) {
    update(() => {
      if (props.employee?.control_no) {
        upsertEmployeeOption(props.employee)
      }
    })
    return
  }

  loadingEmployees.value = true
  try {
    const data = await employeeStore.fetchEmployeeOptions({
      search: query,
      limit: 20,
    })

    const list = Array.isArray(data?.employees) ? data.employees : []
    const mapped = list.map((emp) => {
      const cNo = String(emp.control_no || emp.id)
      const lName = String(emp.last_name || '').trim()
      const fName = String(emp.first_name || '').trim()
      const mName = String(emp.middle_name || '').trim()
      const ext = String(emp.name_extension || '').trim()
      const name = [lName, [fName, mName].filter(Boolean).join(' '), ext].filter(Boolean).join(', ') || emp.name || cNo

      return {
        label: `${name} (${cNo})`,
        value: cNo,
        caption: emp.designation || emp.office || '',
      }
    })

    update(() => {
      employeeOptions.value = mapped
    })
  } catch (err) {
    console.error('HrEmployeeLeaveCreditsDialog: Failed to search employees', err)
  } finally {
    loadingEmployees.value = false
  }
}

function onCocImportSaved({ employeeControlNo }) {
  if (employeeControlNo && form.value.employee_control_no === employeeControlNo) {
    void loadAvailableLeaveTypes(employeeControlNo, isEditMode.value)
  }
}

function validateSubmission() {
  const cNo = String(form.value.employee_control_no ?? '').trim()
  if (!cNo) return 'Employee is required.'
  if (!/^\d+$/.test(cNo)) return 'Select a valid employee.'

  const asOf = String(form.value.as_of_date ?? '').trim()
  if (!asOf) return 'As of date is required.'

  if (loadingLeaveTypes.value) return 'Leave types are still loading.'
  if (!creditLeaveTypes.value.length) return 'No credit-based leave types are available.'

  let hasPositive = false
  for (const t of creditLeaveTypes.value) {
    const label = getLeaveTypeDisplayName(t)
    const raw = normalizeInputVal(form.value.balances?.[String(t.id)])
    if (raw === '') return `${label} is required.`

    const num = Number(raw)
    if (!Number.isFinite(num)) return `${label} must be a number.`
    if (num < 0) return `${label} cannot be negative.`
    if (num > 0) hasPositive = true

    const max = resolveLeaveTypeMaxDays(t)
    if (max !== null && num > max) {
      return `${label} cannot exceed ${formatDayLimitLabel(max)}.`
    }
  }

  if (!hasPositive && !isEditMode.value) {
    return 'At least one leave type must be greater than 0.'
  }

  return ''
}

async function submitSave() {
  const err = validateSubmission()
  if (err) {
    $q.notify({ type: 'warning', message: err, position: 'top' })
    return
  }

  saving.value = true
  try {
    const employeeControlNo = String(form.value.employee_control_no).trim()
    const asOfDate = String(form.value.as_of_date ?? '').trim()
    const balances = creditLeaveTypes.value.map((t) => ({
      leave_type_id: Number(t.id),
      balance: Number(normalizeInputVal(form.value.balances?.[String(t.id)])),
    }))

    const payload = {
      employee_control_no: employeeControlNo,
      as_of_date: asOfDate || getTodayIsoDate(),
      balances,
    }

    const { data } = isEditMode.value
      ? await api.post('/hr/leave-balances/update', payload)
      : await api.post('/hr/leave-balances', payload)

    const touched = Number(data?.updated_count ?? data?.saved_count ?? balances.length)

    $q.notify({
      type: 'positive',
      message: isEditMode.value
        ? `${touched} leave balance(s) updated successfully.`
        : `${touched} leave balance(s) saved successfully.`,
      position: 'top',
    })

    employeeStore.invalidateEmployee(employeeControlNo)

    emit('saved', {
      employeeControlNo,
      touchedCount: touched,
      isEditMode: isEditMode.value,
    })

    emit('update:modelValue', false)
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to save leave credits right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    saving.value = false
  }
}

function onDialogModelUpdate(val) {
  emit('update:modelValue', val)
}
</script>

<style scoped>
.leave-credit-dialog {
  width: min(780px, 96vw);
}
</style>

