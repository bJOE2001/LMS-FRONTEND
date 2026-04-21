<template>
  <q-dialog v-model="dialogModel">
    <q-card class="rounded-borders leave-ledger-dialog" :style="dialogStyle">
      <q-card-section class="row items-center q-pb-none">
        <q-icon name="receipt_long" size="sm" color="secondary" class="q-mr-sm" />
        <div class="text-h6">Leave Credits Ledger</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="leave-ledger-dialog__body q-pt-sm">
        <q-banner v-if="error" dense rounded class="bg-orange-1 text-orange-9 q-mb-md">
          <template #avatar>
            <q-icon name="warning" color="orange-8" />
          </template>
          {{ error }}
        </q-banner>

        <div
          v-if="loading"
          class="leave-ledger-dialog__loading row items-center justify-center q-pa-xl text-grey-7"
        >
          <q-spinner color="secondary" size="28px" class="q-mr-sm" />
          <span>Loading leave credits ledger...</span>
        </div>

        <div v-else class="ledger-preview-stage">
          <div class="ledger-preview-pages">
            <div
              v-for="(pageRows, pageIndex) in renderedPages"
              :key="`ledger-page-${pageIndex}`"
              class="ledger-sheet"
              :class="paperSizeClass"
              :style="sheetStyle"
            >
              <div class="ledger-sheet__identity">
                <div class="ledger-sheet__identity-name" :style="identityNameStyle">
                  {{ employeeHeadingName }}
                </div>
                <div class="ledger-sheet__identity-office" :style="identityOfficeStyle">
                  {{ employeeHeadingOffice }}
                </div>
                <div class="ledger-sheet__identity-service">
                  <span
                    class="ledger-sheet__identity-service-value"
                    :style="identityServiceValueStyle"
                  >
                    {{ employeeFirstDayOfService }}
                  </span>
                </div>
              </div>

              <div class="ledger-sheet__header">
                <div class="ledger-sheet__field">
                  <div class="ledger-sheet__label">Name</div>
                </div>
                <div class="ledger-sheet__field">
                  <div class="ledger-sheet__label">Division Office</div>
                </div>
                <div class="ledger-sheet__field ledger-sheet__field--service">
                  <div class="ledger-sheet__label">1st Day of Service</div>
                </div>
              </div>

              <div class="ledger-table-wrap">
                <table class="ledger-table">
                  <colgroup>
                    <col
                      v-for="(width, index) in columnWidths"
                      :key="`ledger-col-${index}`"
                      :style="{ width }"
                    />
                  </colgroup>
                  <thead>
                    <tr>
                      <th rowspan="2" class="ledger-table__primary-head">
                        <span class="ledger-table__stacked-head">Period</span>
                      </th>
                      <th
                        rowspan="2"
                        class="ledger-table__primary-head ledger-table__primary-head--particulars"
                      >
                        <span class="ledger-table__stacked-head">Particulars</span>
                      </th>
                      <th colspan="4" class="ledger-table__section-head">
                        <span class="ledger-table__stacked-head">Vacation Leave</span>
                      </th>
                      <th colspan="4" class="ledger-table__section-head">
                        <span class="ledger-table__stacked-head">Sick Leave</span>
                      </th>
                      <th colspan="4" class="ledger-table__section-head">
                        <span class="ledger-table__stacked-head">Other Type of Leave</span>
                      </th>
                      <th
                        rowspan="2"
                        class="ledger-table__primary-head ledger-table__primary-head--action"
                      >
                        <span class="ledger-table__stacked-head">
                          Date &amp;<br />
                          Action<br />
                          Taken on<br />
                          Application<br />
                          for Leave
                        </span>
                      </th>
                    </tr>
                    <tr>
                      <th><span class="ledger-table__stacked-head">Earned</span></th>
                      <th>
                        <span class="ledger-table__stacked-head">
                          Abs.<br />
                          Und.<br />
                          W/P
                        </span>
                      </th>
                      <th><span class="ledger-table__stacked-head">Bal.</span></th>
                      <th>
                        <span class="ledger-table__stacked-head">
                          Abs.<br />
                          Und.<br />
                          W/oP
                        </span>
                      </th>
                      <th><span class="ledger-table__stacked-head">Earned</span></th>
                      <th>
                        <span class="ledger-table__stacked-head">
                          Abs.<br />
                          Und.
                        </span>
                      </th>
                      <th><span class="ledger-table__stacked-head">Bal.</span></th>
                      <th>
                        <span class="ledger-table__stacked-head">
                          Abs.<br />
                          Und.<br />
                          W/oP
                        </span>
                      </th>
                      <th><span class="ledger-table__stacked-head">Earned</span></th>
                      <th>
                        <span class="ledger-table__stacked-head">
                          Abs.<br />
                          Und.
                        </span>
                      </th>
                      <th><span class="ledger-table__stacked-head">Bal.</span></th>
                      <th>
                        <span class="ledger-table__stacked-head">
                          Abs.<br />
                          Und.<br />
                          W/oP
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="entry in pageRows"
                      :key="entry.key"
                      :class="{ 'ledger-table__row--blank': entry.isBlank }"
                    >
                      <td class="ledger-table__cell--period">{{ entry.period }}</td>
                      <td class="ledger-table__cell--particulars">{{ entry.particulars }}</td>
                      <td>
                        <span :class="valueClassResolver(entry.vacationEarned, entry, 'VL')">
                          {{ entry.vacationEarned }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.vacationAbsUndWp, entry, 'VL')">
                          {{ entry.vacationAbsUndWp }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.vacationBalance, entry, 'VL')">
                          {{ entry.vacationBalance }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.vacationAbsUndWop, entry, 'VL')">
                          {{ entry.vacationAbsUndWop }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.sickEarned, entry, 'SL')">
                          {{ entry.sickEarned }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.sickAbsUnd, entry, 'SL')">
                          {{ entry.sickAbsUnd }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.sickBalance, entry, 'SL')">
                          {{ entry.sickBalance }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.sickAbsUndWop, entry, 'SL')">
                          {{ entry.sickAbsUndWop }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.otherEarned, entry, 'OTHER')">
                          {{ entry.otherEarned }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.otherAbsUndWp, entry, 'OTHER')">
                          {{ entry.otherAbsUndWp }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.otherBalance, entry, 'OTHER')">
                          {{ entry.otherBalance }}
                        </span>
                      </td>
                      <td>
                        <span :class="valueClassResolver(entry.otherAbsUndWop, entry, 'OTHER')">
                          {{ entry.otherAbsUndWop }}
                        </span>
                      </td>
                      <td class="ledger-table__cell--action">{{ entry.actionTaken }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>

      <q-card-actions class="ledger-dialog-actions q-pa-md">
        <q-space />
        <q-btn
          unelevated
          no-caps
          label="Print Ledger"
          color="secondary"
          icon="print"
          :loading="printing"
          :disable="loading || !canPrint"
          @click="emit('print')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  printing: {
    type: Boolean,
    default: false,
  },
  canPrint: {
    type: Boolean,
    default: false,
  },
  paperSize: {
    type: String,
    default: 'A4',
  },
  dialogStyle: {
    type: Object,
    default: () => ({}),
  },
  sheetStyle: {
    type: Object,
    default: () => ({}),
  },
  identityNameStyle: {
    type: Object,
    default: () => ({}),
  },
  identityOfficeStyle: {
    type: Object,
    default: () => ({}),
  },
  identityServiceValueStyle: {
    type: Object,
    default: () => ({}),
  },
  employeeHeadingName: {
    type: String,
    default: 'N/A',
  },
  employeeHeadingOffice: {
    type: String,
    default: 'N/A',
  },
  employeeFirstDayOfService: {
    type: String,
    default: 'N/A',
  },
  columnWidths: {
    type: Array,
    default: () => [],
  },
  renderedPages: {
    type: Array,
    default: () => [[]],
  },
  valueClassResolver: {
    type: Function,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:modelValue', 'print'])

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const paperSizeClass = computed(
  () => `ledger-sheet--${String(props.paperSize || 'A4').toLowerCase()}`,
)
</script>

<style scoped>
.leave-ledger-dialog {
  width: 96vw;
  max-width: 96vw;
  max-height: 96vh;
  background: #f4f4f1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.leave-ledger-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.leave-ledger-dialog__loading {
  flex: 1 1 auto;
  min-height: 0;
}

.ledger-preview-stage {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 4px;
  border-radius: 12px;
  background: #e5e7eb;
}

.ledger-preview-pages {
  display: flex;
  flex-direction: column;
  gap: 32px;
  align-items: center;
  padding: 12px 0 28px;
}

.ledger-sheet {
  margin: 0 auto;
  border: 1px solid #000000;
  overflow: hidden;
  background: #fffdf8;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
  font-family: 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif;
  display: flex;
  flex-direction: column;
}

.ledger-sheet__identity {
  display: grid;
  grid-template-columns: 34% 42% 24%;
  align-items: center;
  column-gap: 8px;
  min-height: 40px;
  padding: 8px 12px 4px;
  border-bottom: 1px solid #000000;
}

.ledger-sheet__identity-name,
.ledger-sheet__identity-office,
.ledger-sheet__identity-service {
  min-width: 0;
  color: #000000;
  font-weight: 700;
  line-height: 1.04;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
}

.ledger-sheet__identity-name {
  letter-spacing: 0.005em;
  text-align: center;
}

.ledger-sheet__identity-office {
  text-align: center;
  letter-spacing: 0.005em;
}

.ledger-sheet__identity-service {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.ledger-sheet__identity-service-value {
  font-size: inherit;
}

.ledger-sheet__header {
  display: grid;
  grid-template-columns: 34% 42% 24%;
  border-bottom: 1px solid #000000;
}

.ledger-sheet__field {
  min-height: 20px;
  padding: 2px 8px 3px;
  border-right: 1px solid #000000;
}

.ledger-sheet__field:last-child {
  border-right: none;
}

.ledger-sheet__label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #000000;
  text-align: center;
}

.ledger-sheet__field--service {
  text-align: center;
}

.ledger-table-wrap {
  overflow: visible;
  flex: 1 1 auto;
  display: flex;
}

.ledger-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  height: 100%;
}

.ledger-table th,
.ledger-table td {
  border: 1px solid #000000;
  padding: 1px 2px;
  font-size: 0.64rem;
  line-height: 1.02;
  vertical-align: middle;
  color: #000000;
  text-align: center;
}

.ledger-table th {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  background: #fffdf8;
  color: #000000;
  padding: 0;
}

.ledger-table thead tr:first-child th {
  height: 20px;
}

.ledger-table thead tr:nth-child(2) th {
  height: 34px;
}

.ledger-table thead tr:nth-child(2) .ledger-table__stacked-head {
  font-size: 0.56rem;
  line-height: 0.96;
  letter-spacing: 0.01em;
  padding: 1px 1px;
}

.ledger-table td {
  padding: 1px 3px;
}

.ledger-table tbody tr {
  height: 20px;
}

.ledger-table__stacked-head {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  line-height: 1.01;
  text-align: center;
  padding: 1px 2px;
}

.ledger-table__value {
  display: inline-block;
  min-width: 2.5ch;
}

.ledger-table__value--emphasis {
  color: #000000;
  font-weight: 700;
}

.ledger-table__value--wl {
  color: #1e5fbf;
}

.ledger-table__value--mco6 {
  color: #1b8f3a;
}

.ledger-table__cell--period,
.ledger-table__cell--particulars,
.ledger-table__cell--action {
  text-align: center !important;
}

.ledger-table__cell--particulars {
  font-size: 0.55rem;
  line-height: 1;
  font-weight: 600;
}

.ledger-table__primary-head--particulars .ledger-table__stacked-head {
  font-size: 0.56rem;
  letter-spacing: 0.01em;
}

.ledger-table__primary-head--action .ledger-table__stacked-head {
  font-size: 0.52rem;
  line-height: 0.94;
  letter-spacing: 0.01em;
  padding: 1px 1px;
}

.ledger-table__cell--period {
  font-weight: 600;
}

.ledger-table__cell--action {
  white-space: pre-line;
  font-weight: 600;
}

.ledger-dialog-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 900px) {
  .leave-ledger-dialog {
    width: min(100vw, 100vw);
  }

  .ledger-preview-stage {
    padding: 4px;
  }

  .ledger-sheet__identity {
    grid-template-columns: 1fr;
    row-gap: 6px;
  }

  .ledger-sheet__identity-name,
  .ledger-sheet__identity-office,
  .ledger-sheet__identity-service {
    text-align: center;
    justify-content: center;
  }

  .ledger-dialog-actions {
    align-items: stretch;
  }
}
</style>
