<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="val => $emit('update:modelValue', val)">
    <q-card class="override-dialog-card rounded-borders">
      <!-- Green Header Banner -->
      <div class="override-dialog-header row items-center justify-between q-px-md q-py-sm">
        <div class="text-subtitle1 text-weight-bold text-white">Override Time</div>
        <q-btn icon="close" flat round dense text-color="white" @click="closeDialog" />
      </div>

      <q-card-section class="q-pa-md">
        <!-- Date Summary Box -->
        <div class="date-summary-box row items-center q-pa-sm q-mb-md">
          <div class="calendar-icon-box flex flex-center q-mr-md">
            <q-icon name="event_available" size="26px" color="white" />
          </div>
          <div>
            <div class="text-h6 text-weight-bolder text-green-9 line-height-tight">
              {{ dayOfWeek }}
            </div>
            <div class="text-caption text-grey-7">
              {{ formattedDate }}
            </div>
          </div>
        </div>

        <!-- Form Inputs Grid -->
        <div class="q-gutter-y-sm">
          <!-- Morning Time Section -->
          <div>
            <div class="section-heading q-mb-xs">Morning Time</div>
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input
                  v-model="form.am_arrival"
                  dense
                  outlined
                  placeholder="8:00 AM"
                  class="time-box-input"
                >
                  <template #prepend>
                    <span class="prefix-text">In</span>
                  </template>
                  <template #append>
                    <q-icon name="access_time" size="18px" class="cursor-pointer text-grey-6">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-time v-model="form.am_arrival" mask="h:mm A" />
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
              </div>

              <div class="col-6">
                <q-input
                  v-model="form.am_departure"
                  dense
                  outlined
                  placeholder="12:00 PM"
                  class="time-box-input"
                >
                  <template #prepend>
                    <span class="prefix-text">Out</span>
                  </template>
                  <template #append>
                    <q-icon name="access_time" size="18px" class="cursor-pointer text-grey-6">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-time v-model="form.am_departure" mask="h:mm A" />
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
              </div>
            </div>
          </div>

          <!-- Afternoon Time Section -->
          <div>
            <div class="section-heading q-mb-xs">Afternoon Time</div>
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input
                  v-model="form.pm_arrival"
                  dense
                  outlined
                  placeholder="1:00 PM"
                  class="time-box-input"
                >
                  <template #prepend>
                    <span class="prefix-text">In</span>
                  </template>
                  <template #append>
                    <q-icon name="access_time" size="18px" class="cursor-pointer text-grey-6">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-time v-model="form.pm_arrival" mask="h:mm A" />
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
              </div>

              <div class="col-6">
                <q-input
                  v-model="form.pm_departure"
                  dense
                  outlined
                  placeholder="5:00 PM"
                  class="time-box-input"
                >
                  <template #prepend>
                    <span class="prefix-text">Out</span>
                  </template>
                  <template #append>
                    <q-icon name="access_time" size="18px" class="cursor-pointer text-grey-6">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-time v-model="form.pm_departure" mask="h:mm A" />
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
              </div>
            </div>
          </div>

          <!-- Overtime Section -->
          <div>
            <div class="section-heading q-mb-xs">Overtime</div>
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input
                  v-model="form.ot_arrival"
                  dense
                  outlined
                  placeholder="5:00 PM"
                  class="time-box-input"
                >
                  <template #prepend>
                    <span class="prefix-text">In</span>
                  </template>
                  <template #append>
                    <q-icon name="access_time" size="18px" class="cursor-pointer text-grey-6">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-time v-model="form.ot_arrival" mask="h:mm A" />
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
              </div>

              <div class="col-6">
                <q-input
                  v-model="form.ot_departure"
                  dense
                  outlined
                  placeholder="10:00 PM"
                  class="time-box-input"
                >
                  <template #prepend>
                    <span class="prefix-text">Out</span>
                  </template>
                  <template #append>
                    <q-icon name="access_time" size="18px" class="cursor-pointer text-grey-6">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-time v-model="form.ot_departure" mask="h:mm A" />
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>

      <!-- Bottom Action Section -->
      <q-card-actions align="right" class="q-pa-md q-pt-none">
        <q-btn
          unelevated
          no-caps
          label="Override"
          class="override-submit-btn"
          :loading="submitting"
          @click="submitOverride"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  controlNo: {
    type: String,
    required: true,
  },
  employeeName: {
    type: String,
    default: '',
  },
  date: {
    type: String,
    required: true,
  },
  dtr: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'saved'])
const $q = useQuasar()
const submitting = ref(false)

const form = reactive({
  am_arrival: '',
  am_departure: '',
  pm_arrival: '',
  pm_departure: '',
  ot_arrival: '',
  ot_departure: '',
})

function formatTo12Hour(timeStr) {
  if (!timeStr || timeStr === '—' || timeStr === '-') return ''
  if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) {
    return timeStr.trim()
  }
  const parts = timeStr.split(':')
  if (parts.length >= 2) {
    let h = parseInt(parts[0], 10)
    const m = parts[1]
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12
    h = h ? h : 12
    return `${h}:${m} ${ampm}`
  }
  return timeStr
}

// Populate form whenever dialog opens or dtr changes
watch(
  () => [props.modelValue, props.dtr, props.date],
  ([isOpen]) => {
    if (!isOpen) return
    form.am_arrival = formatTo12Hour(props.dtr?.am_arrival)
    form.am_departure = formatTo12Hour(props.dtr?.am_departure)
    form.pm_arrival = formatTo12Hour(props.dtr?.pm_arrival)
    form.pm_departure = formatTo12Hour(props.dtr?.pm_departure)
    form.ot_arrival = formatTo12Hour(props.dtr?.ot_arrival)
    form.ot_departure = formatTo12Hour(props.dtr?.ot_departure)
  },
  { immediate: true }
)

const dayOfWeek = computed(() => {
  if (!props.date) return 'Day'
  try {
    const d = new Date(props.date + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'long' })
  } catch {
    return 'Day'
  }
})

const formattedDate = computed(() => {
  if (!props.date) return ''
  try {
    const d = new Date(props.date + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return props.date
  }
})

function closeDialog() {
  emit('update:modelValue', false)
}

async function submitOverride() {
  if (!props.controlNo || !props.date) {
    $q.notify({
      type: 'warning',
      message: 'Missing employee or date information.',
    })
    return
  }

  submitting.value = true
  try {
    const payload = {
      employee_control_no: props.controlNo,
      date: props.date,
      am_arrival: form.am_arrival || null,
      am_departure: form.am_departure || null,
      pm_arrival: form.pm_arrival || null,
      pm_departure: form.pm_departure || null,
      ot_arrival: form.ot_arrival || null,
      ot_departure: form.ot_departure || null,
    }

    const res = await api.post('/attendance/dtr/override', payload)

    $q.notify({
      type: 'positive',
      message: 'Attendance time overridden successfully.',
      position: 'top-right',
    })

    emit('saved', res.data?.dtr)
    closeDialog()
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to override attendance time.'
    $q.notify({
      type: 'negative',
      message: msg,
      position: 'top-right',
    })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.override-dialog-card {
  width: 480px;
  max-width: 95vw;
  background-color: #ffffff;
  border-radius: 6px;
  overflow: hidden;
}

.override-dialog-header {
  background-color: #2e7d32; /* Solid Forest Green */
  color: #ffffff;
}

.date-summary-box {
  border: 1px solid #dcdcdc;
  border-radius: 4px;
  background-color: #ffffff;
}

.calendar-icon-box {
  width: 42px;
  height: 42px;
  background-color: #2e7d32;
  border-radius: 4px;
}

.section-heading {
  font-size: 0.88rem;
  font-weight: 700;
  color: #1a1a1a;
}

.prefix-text {
  font-size: 0.85rem;
  color: #757575;
  margin-right: 4px;
}

.time-box-input :deep(.q-field__control) {
  border-radius: 4px;
}

.override-submit-btn {
  background-color: #2e7d32 !important;
  color: #ffffff !important;
  font-weight: 600;
  font-size: 0.92rem;
  padding: 8px 24px;
  border-radius: 4px;
}

.line-height-tight {
  line-height: 1.2;
}
</style>
