<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="onDialogModelUpdate">
    <q-card style="width: 500px; max-width: 95vw;" class="rounded-borders">
      <q-card-section class="row items-center justify-between bg-primary text-white q-py-sm">
        <div class="row items-center q-gutter-x-sm">
          <q-icon name="fingerprint" size="22px" />
          <div class="text-subtitle1 text-weight-bold">Push to Biometric Device</div>
        </div>
        <q-btn flat round dense icon="close" text-color="white" v-close-popup :disable="pushing" />
      </q-card-section>

      <q-card-section class="q-pt-md">
        <div v-if="employee" class="q-mb-md">
          <div class="text-caption text-grey-6 text-uppercase text-weight-bold">Employee</div>
          <div class="text-weight-bold text-subtitle2 text-grey-9">
            {{ employeeFullName }}
          </div>
          <div class="text-caption text-grey-7">
            Control No: {{ employee.control_no }} • {{ officeLabel }}
          </div>
        </div>

        <div class="q-mb-sm">
          <div class="text-caption text-grey-7 q-mb-xs">Select Biometric Terminal:</div>
          <q-select
            v-model="selectedDeviceSn"
            :options="deviceOptions"
            emit-value
            map-options
            outlined
            dense
            :loading="loadingDevices"
            label="Biometric Terminal *"
            hint="The employee record will be sent to this terminal for registration."
          >
            <template #prepend>
              <q-icon name="devices" />
            </template>
          </q-select>
        </div>
      </q-card-section>

      <q-card-actions align="right" class="q-px-md q-pb-md q-gutter-sm">
        <q-btn flat no-caps color="grey-7" label="Cancel" v-close-popup :disable="pushing" />
        <q-btn
          unelevated
          no-caps
          color="primary"
          class="text-weight-bold q-px-md"
          icon="send"
          label="Push to Device"
          :loading="pushing"
          :disable="!selectedDeviceSn"
          @click="submitPush"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import { useBiometricDeviceStore } from 'src/stores/biometric-device-store'
import { useEmployeeStore } from 'src/stores/employee-store'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'
import { resolveOfficeAcronymLabel } from 'src/utils/office-acronym'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  employee: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'registered'])

const $q = useQuasar()
const bioStore = useBiometricDeviceStore()
const employeeStore = useEmployeeStore()

const selectedDeviceSn = ref(null)
const deviceOptions = ref([])
const loadingDevices = ref(false)
const pushing = ref(false)

const employeeFullName = computed(() => {
  const emp = props.employee
  if (!emp) return ''
  const lastName = String(emp.last_name || '').trim()
  const firstName = String(emp.first_name || '').trim()
  const middleName = String(emp.middle_name || '').trim()
  const extension = String(emp.name_extension || '').trim()

  const nameParts = [firstName, middleName, lastName, extension].filter(Boolean)
  return nameParts.join(' ') || emp.full_name || emp.name || emp.control_no || '-'
})

const officeLabel = computed(() => {
  if (!props.employee) return 'No office'
  return resolveOfficeAcronymLabel(props.employee) || props.employee.office || 'No office'
})

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      await loadDevices()
    }
  },
)

async function loadDevices() {
  if (deviceOptions.value.length > 0) {
    if (!selectedDeviceSn.value && deviceOptions.value.length > 0) {
      selectedDeviceSn.value = deviceOptions.value[0].value
    }
    return
  }

  loadingDevices.value = true
  try {
    const list = await bioStore.fetchDevices()
    deviceOptions.value = (Array.isArray(list) ? list : []).map((dev) => ({
      label: `${dev.device_name || dev.serial_number} (${dev.department_name || dev.ip_address || 'Terminal'})`,
      value: dev.serial_number,
    }))
    if (deviceOptions.value.length > 0 && !selectedDeviceSn.value) {
      selectedDeviceSn.value = deviceOptions.value[0].value
    }
  } catch (err) {
    console.error('HrEmployeePushToBioDialog: Failed to load devices', err)
  } finally {
    loadingDevices.value = false
  }
}

async function submitPush() {
  if (!props.employee || !selectedDeviceSn.value) return

  pushing.value = true
  try {
    const { data } = await api.post('/hr/biometric-registration/register', {
      employee_control_no: props.employee.control_no,
      device_serial_number: selectedDeviceSn.value,
    })

    $q.notify({
      type: 'positive',
      message:
        data?.message || `Registration command sent for ${employeeFullName.value}.`,
      position: 'top',
    })

    employeeStore.invalidate(false)

    emit('registered', {
      employee: props.employee,
      deviceSn: selectedDeviceSn.value,
    })

    emit('update:modelValue', false)
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Failed to push employee to biometric device.')
    $q.notify({
      type: 'negative',
      message: msg,
      position: 'top',
    })
  } finally {
    pushing.value = false
  }
}

function onDialogModelUpdate(val) {
  emit('update:modelValue', val)
}
</script>

