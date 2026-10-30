<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="onDialogModelUpdate">
    <q-card class="rounded-borders coc-import-dialog">
      <q-card-section class="row items-center q-pb-none">
        <q-icon name="event_available" size="sm" color="primary" class="q-mr-sm" />
        <div class="text-h6">Manage COC Entries</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup :disable="saving" />
      </q-card-section>

      <q-card-section class="q-pt-sm">
        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-12">
            <q-input
              :model-value="employeeLabel || employeeControlNo"
              outlined
              dense
              readonly
              label="Employee"
            />
          </div>
        </div>

        <div class="row q-col-gutter-md">
          <div class="col-12">
            <div class="row items-center justify-between">
              <div class="text-subtitle2 text-weight-medium">COC Entries</div>
              <div class="row items-center q-gutter-xs">
                <q-btn
                  flat
                  dense
                  no-caps
                  icon="add"
                  color="primary"
                  label="Add Row"
                  :disable="saving || loading || form.entries.length >= 200"
                  @click="addEntry"
                />
              </div>
            </div>
          </div>

          <div v-if="loading" class="col-12">
            <div class="row items-center q-gutter-sm text-grey-7">
              <q-spinner color="primary" size="18px" />
              <span>Loading existing COC entries...</span>
            </div>
          </div>

          <template v-for="(entry, index) in form.entries" :key="`coc-entry-${index}`">
            <div class="col-12">
              <div class="coc-import-entry">
                <div class="row items-center justify-between q-mb-sm">
                  <div class="row items-center q-gutter-sm">
                    <div class="text-subtitle2 text-weight-medium">Entry #{{ index + 1 }}</div>
                    <q-badge
                      v-if="isExistingEntry(entry)"
                      color="blue-8"
                      text-color="white"
                      label="Saved"
                    />
                  </div>
                  <q-btn
                    flat
                    dense
                    round
                    icon="delete"
                    color="negative"
                    :disable="
                      saving ||
                      loading ||
                      form.entries.length <= 1 ||
                      isExistingEntry(entry)
                    "
                    @click="removeEntry(index)"
                  >
                    <q-tooltip>
                      {{
                        isExistingEntry(entry)
                          ? 'Saved entries cannot be removed here.'
                          : 'Remove row'
                      }}
                    </q-tooltip>
                  </q-btn>
                </div>

                <div class="row q-col-gutter-sm">
                  <div class="col-12 col-sm-4">
                    <q-input
                      v-model="entry.hours"
                      outlined
                      dense
                      type="number"
                      min="0"
                      step="0.01"
                      label="COC Hours *"
                    />
                  </div>
                  <div class="col-12 col-sm-4">
                    <q-input
                      v-model="entry.credited_at"
                      outlined
                      dense
                      type="date"
                      label="Earned Date *"
                      @update:model-value="handleEarnedDateChange(index)"
                    />
                  </div>
                  <div class="col-12 col-sm-4">
                    <q-input
                      v-model="entry.expires_on"
                      outlined
                      dense
                      type="date"
                      label="Expiration Date *"
                      readonly
                    />
                  </div>
                </div>
              </div>
            </div>
          </template>
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
          label="Save"
          color="primary"
          icon="save"
          :loading="saving"
          :disable="loading"
          @click="submitSave"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import { useEmployeeStore } from 'src/stores/employee-store'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  employeeControlNo: {
    type: String,
    default: '',
  },
  employeeLabel: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const $q = useQuasar()
const employeeStore = useEmployeeStore()

const loading = ref(false)
const saving = ref(false)

function buildDefaultEntry() {
  return {
    id: null,
    hours: '',
    credited_at: '',
    expires_on: '',
  }
}

function defaultForm(controlNo = '') {
  return {
    employee_control_no: String(controlNo ?? '').trim(),
    entries: [buildDefaultEntry()],
  }
}

const form = ref(defaultForm())

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      const controlNo = String(props.employeeControlNo ?? '').trim()
      form.value = defaultForm(controlNo)
      if (/^\d+$/.test(controlNo)) {
        await loadEntries(controlNo)
      }
    }
  },
)

function addEntry() {
  if (form.value.entries.length >= 200) return
  form.value.entries.push(buildDefaultEntry())
}

function removeEntry(index) {
  if (form.value.entries.length <= 1) return
  form.value.entries.splice(index, 1)
}

function isExistingEntry(entry) {
  const entryId = Number(entry?.id)
  return Number.isInteger(entryId) && entryId > 0
}

function resolveExpiryDate(creditedAtRaw) {
  const creditedAt = String(creditedAtRaw ?? '').trim()
  if (!creditedAt) return ''

  const match = creditedAt.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ''

  const parsedDate = new Date(`${creditedAt}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) return ''

  const expiryYear = parsedDate.getFullYear() + 1
  return `${expiryYear}-12-31`
}

function handleEarnedDateChange(index) {
  const entries = Array.isArray(form.value.entries) ? form.value.entries : []
  const entry = entries[index]
  if (!entry) return
  entry.expires_on = resolveExpiryDate(entry.credited_at) || ''
}

function isEditableImportedCocApplication(application) {
  const rawStatus = String(
    application?.rawStatus ?? application?.raw_status ?? application?.status ?? '',
  )
    .trim()
    .toUpperCase()
  if (rawStatus !== 'APPROVED') return false

  const remarks = String(application?.remarks ?? '')
    .trim()
    .toLowerCase()
  if (!remarks.startsWith('coc balance import (hr)')) return false

  const creditedHours = Number(application?.credited_hours)
  if (!Number.isFinite(creditedHours) || creditedHours <= 0) return false

  const expiresOn = String(application?.cto_expires_on ?? '').trim()
  if (!expiresOn) return false

  return true
}

function buildEntryFromApplication(application) {
  const creditedAtRaw = String(application?.cto_credited_at ?? '').trim()
  let creditedAtDate = ''
  if (creditedAtRaw) {
    const dateMatch = creditedAtRaw.match(/^(\d{4}-\d{2}-\d{2})/)
    if (dateMatch?.[1]) {
      creditedAtDate = dateMatch[1]
    } else {
      const parsedDate = new Date(creditedAtRaw)
      if (!Number.isNaN(parsedDate.getTime())) {
        const year = parsedDate.getFullYear()
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
        const day = String(parsedDate.getDate()).padStart(2, '0')
        creditedAtDate = `${year}-${month}-${day}`
      }
    }
  }

  const expiresOnFromApi = String(application?.cto_expires_on ?? '').trim()
  const resolvedExpiry = expiresOnFromApi || resolveExpiryDate(creditedAtDate)
  const hours = Number(application?.credited_hours)
  return {
    id: Number(application?.id) > 0 ? Number(application.id) : null,
    hours: Number.isFinite(hours) && hours > 0 ? String(hours) : '',
    credited_at: creditedAtDate,
    expires_on: resolvedExpiry,
  }
}

async function loadEntries(controlNo) {
  loading.value = true
  try {
    const data = await employeeStore.fetchCocImportEntries(controlNo)
    const applications = Array.isArray(data?.applications) ? data.applications : []
    const editableEntries = applications
      .filter((app) => isEditableImportedCocApplication(app))
      .map((app) => buildEntryFromApplication(app))
      .filter((entry) => entry.expires_on && entry.hours !== '')

    form.value = {
      employee_control_no: controlNo,
      entries: editableEntries.length ? editableEntries : [buildDefaultEntry()],
    }
  } catch (err) {
    const message = resolveApiErrorMessage(err, 'Unable to load existing COC entries right now.')
    $q.notify({ type: 'negative', message, position: 'top' })
    form.value = defaultForm(controlNo)
  } finally {
    loading.value = false
  }
}

function normalizeVal(value) {
  if (value === null || value === undefined) return ''
  return typeof value === 'string' ? value.trim() : value
}

function validateForm() {
  const employeeControlNo = String(form.value.employee_control_no ?? '').trim()
  if (!employeeControlNo) return 'Employee is required.'
  if (!/^\d+$/.test(employeeControlNo)) return 'Select a valid employee.'

  const entries = Array.isArray(form.value.entries) ? form.value.entries : []
  if (!entries.length) return 'Add at least one COC entry.'

  for (let index = 0; index < entries.length; index += 1) {
    const rowNo = index + 1
    const entry = entries[index] ?? {}
    const hoursRaw = normalizeVal(entry.hours)
    if (hoursRaw === '') return `Entry #${rowNo}: hours are required.`

    const hours = Number(hoursRaw)
    if (!Number.isFinite(hours)) return `Entry #${rowNo}: hours must be a number.`
    if (hours <= 0) return `Entry #${rowNo}: hours must be greater than zero.`

    const creditedAtRaw = String(entry.credited_at ?? '').trim()
    const expiresOnRaw = String(entry.expires_on ?? '').trim()
    if (!creditedAtRaw) return `Entry #${rowNo}: earned date is required.`
    if (!expiresOnRaw) return `Entry #${rowNo}: expiration date is required.`

    const creditedAt = new Date(`${creditedAtRaw}T00:00:00`)
    const expiresOn = new Date(`${expiresOnRaw}T00:00:00`)
    if (Number.isNaN(creditedAt.getTime())) return `Entry #${rowNo}: credited date is invalid.`
    if (Number.isNaN(expiresOn.getTime())) return `Entry #${rowNo}: expiration date is invalid.`
    if (expiresOn < creditedAt) {
      return `Entry #${rowNo}: expiration date cannot be earlier than credited date.`
    }
  }

  return ''
}

async function submitSave() {
  if (loading.value) return

  const validationError = validateForm()
  if (validationError) {
    $q.notify({ type: 'warning', message: validationError, position: 'top' })
    return
  }

  saving.value = true
  try {
    const employeeControlNo = String(form.value.employee_control_no ?? '').trim()
    const payload = {
      employee_control_no: employeeControlNo,
      entries: form.value.entries.map((entry) => ({
        id: isExistingEntry(entry) ? Number(entry.id) : undefined,
        hours: Number(normalizeVal(entry.hours)),
        credited_at: String(entry.credited_at ?? '').trim(),
        expires_on: String(entry.expires_on ?? '').trim(),
      })),
    }

    const { data } = await api.post('/hr/coc-balances/import', payload)
    const createdCount = Number(data?.created_count ?? data?.imported_count ?? 0)
    const updatedCount = Number(data?.updated_count ?? 0)
    const savedCount = Number(data?.saved_count ?? payload.entries.length)
    const normalizedSavedCount =
      Number.isFinite(savedCount) && savedCount > 0 ? savedCount : payload.entries.length
    const updatedBalance = Number(data?.updated_balance)
    const balanceLabel = Number.isFinite(updatedBalance)
      ? ` Updated CTO balance: ${updatedBalance}.`
      : ''
    const detailParts = []
    if (createdCount > 0) detailParts.push(`${createdCount} added`)
    if (updatedCount > 0) detailParts.push(`${updatedCount} updated`)
    const detailLabel = detailParts.length ? ` (${detailParts.join(', ')})` : ''

    $q.notify({
      type: 'positive',
      message: `${normalizedSavedCount} COC entr${normalizedSavedCount === 1 ? 'y' : 'ies'} saved successfully${detailLabel}.${balanceLabel}`,
      position: 'top',
    })

    employeeStore.invalidateEmployee(employeeControlNo)

    emit('saved', {
      employeeControlNo,
      updatedBalance,
      savedCount: normalizedSavedCount,
    })

    emit('update:modelValue', false)
  } catch (err) {
    const message = resolveApiErrorMessage(err, 'Unable to save COC entries right now.')
    $q.notify({ type: 'negative', message, position: 'top' })
  } finally {
    saving.value = false
  }
}

function onDialogModelUpdate(val) {
  emit('update:modelValue', val)
}
</script>

<style scoped>
.coc-import-dialog {
  width: min(780px, 96vw);
}

.coc-import-entry {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  background-color: #fafafa;
}
</style>

