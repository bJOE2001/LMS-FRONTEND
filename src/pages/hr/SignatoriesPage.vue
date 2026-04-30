<template>
  <q-page class="q-pa-md">
    <div class="q-mb-lg">
      <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Signatories</h1>
      <p class="text-grey-7 q-mb-none">Manage leave-form signatory assignments.</p>
    </div>

    <q-card flat bordered class="rounded-borders">
      <q-card-section>
        <div class="row items-center q-mb-lg">
          <q-icon name="draw" size="28px" color="primary" class="q-mr-sm" />
          <div class="text-h6 text-weight-bold">Leave Form Signatories</div>
        </div>

        <div style="max-width: 560px;">
          <q-select
            v-model="chrmoLeaveInChargeSelection"
            :options="chrmoLeaveInChargeOptions"
            :loading="loading || searching"
            use-input
            fill-input
            hide-selected
            input-debounce="300"
            outlined
            dense
            option-label="label"
            label="CHRMO Leave In-charge"
            hint="Type at least 2 characters to search employees."
            @filter="filterChrmoLeaveInChargeOptions"
          >
            <template #no-option>
              <q-item>
                <q-item-section class="text-grey-7">
                  Type a name to search active employees.
                </q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>

        <div class="q-mt-md">
          <q-btn
            unelevated
            color="primary"
            label="Save Signatory"
            icon="save"
            :loading="saving"
            :disable="!chrmoLeaveInChargeSelection"
            @click="handleSaveChrmoLeaveInCharge"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const $q = useQuasar()

const loading = ref(false)
const saving = ref(false)
const searching = ref(false)
const chrmoLeaveInChargeSelection = ref(null)
const chrmoLeaveInChargeOptions = ref([])

function normalizeChrmoEmployeeOption(value) {
  if (!value || typeof value !== 'object') return null
  const controlNo = String(
    value.control_no ??
      value.employee_control_no ??
      value.controlNo ??
      '',
  ).trim()
  const fullName = String(
    value.full_name ??
      value.fullName ??
      value.name ??
      '',
  ).trim()
  const designation = String(
    value.designation ??
      value.position ??
      '',
  ).trim()

  if (!controlNo || !fullName) return null
  return {
    controlNo,
    fullName,
    designation: designation || 'CHRMO Leave In-charge',
    label: designation ? `${fullName} (${designation})` : fullName,
  }
}

function setChrmoLeaveInChargeOptions(options = []) {
  const normalizedOptions = options
    .map((option) => normalizeChrmoEmployeeOption(option))
    .filter(Boolean)

  if (chrmoLeaveInChargeSelection.value) {
    const selectedControlNo = chrmoLeaveInChargeSelection.value.controlNo
    const hasSelected = normalizedOptions.some((option) => option.controlNo === selectedControlNo)
    if (!hasSelected) {
      normalizedOptions.unshift(chrmoLeaveInChargeSelection.value)
    }
  }

  chrmoLeaveInChargeOptions.value = normalizedOptions
}

async function fetchSignatorySettings() {
  loading.value = true
  try {
    const { data } = await api.get('/settings/signatories')
    const assignedSignatory = normalizeChrmoEmployeeOption(
      data?.signatories?.chrmo_leave_in_charge,
    )
    chrmoLeaveInChargeSelection.value = assignedSignatory
    setChrmoLeaveInChargeOptions(assignedSignatory ? [assignedSignatory] : [])
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load signatory settings right now.')
    $q.notify({ type: 'negative', message: msg })
  } finally {
    loading.value = false
  }
}

async function searchChrmoLeaveInChargeOptions(search = '') {
  const normalizedSearch = String(search || '').trim()
  if (normalizedSearch.length < 2) {
    setChrmoLeaveInChargeOptions([])
    return
  }

  searching.value = true
  try {
    const { data } = await api.get('/hr/employee-options', {
      params: {
        search: normalizedSearch,
        limit: 25,
        activity: 'ACTIVE',
      },
    })
    setChrmoLeaveInChargeOptions(Array.isArray(data?.employees) ? data.employees : [])
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to search employees right now.')
    $q.notify({ type: 'negative', message: msg })
  } finally {
    searching.value = false
  }
}

function filterChrmoLeaveInChargeOptions(value, update) {
  update(async () => {
    await searchChrmoLeaveInChargeOptions(value)
  })
}

async function handleSaveChrmoLeaveInCharge() {
  const selected = chrmoLeaveInChargeSelection.value
  if (!selected?.controlNo) {
    $q.notify({ type: 'negative', message: 'Please select a signatory first.' })
    return
  }

  saving.value = true
  try {
    await api.put('/settings/signatories/chrmo-leave-in-charge', {
      employee_control_no: selected.controlNo,
    })
    $q.notify({ type: 'positive', message: 'CHRMO Leave In-charge updated successfully!' })
    await fetchSignatorySettings()
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to save signatory settings right now.')
    $q.notify({ type: 'negative', message: msg })
  } finally {
    saving.value = false
  }
}

onMounted(fetchSignatorySettings)
</script>
