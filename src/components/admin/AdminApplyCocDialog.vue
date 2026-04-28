<template>
  <q-dialog
    v-model="dialogModel"
    persistent
    position="standard"
    transition-show="scale"
    transition-hide="scale"
  >
    <q-card class="apply-coc-dialog">
      <q-bar class="apply-coc-dialog__bar text-white">
        <div class="text-subtitle1 text-weight-bold">Application for COC</div>
        <q-space />
        <q-btn
          v-close-popup
          dense
          flat
          round
          icon="close"
          :disable="submitting"
          aria-label="Close COC application dialog"
        />
      </q-bar>

      <div class="apply-coc-dialog__content">
        <q-form
          class="apply-coc-dialog__form"
          greedy
          @submit.prevent="submitForm"
        >
          <div class="apply-coc-dialog__body q-pa-md">
            <div class="coc-entry-list">
              <div class="coc-entry-table-wrap">
                <table class="coc-entry-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Nature of Overtime</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Raw Overtime</th>
                      <th class="coc-entry-table__action-col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(entry, index) in rows" :key="entry.id">
                      <td>
                        <q-input
                          :model-value="formatDateDisplay(entry.date)"
                          dense
                          outlined
                          readonly
                          class="form-input coc-cell-input coc-cell-input--picker"
                          placeholder="Select date"
                        >
                          <template #prepend>
                            <q-icon name="event" size="16px" color="green-8" />
                          </template>
                          <template #append>
                            <q-btn
                              v-if="entry.date"
                              flat
                              round
                              dense
                              size="sm"
                              icon="close"
                              color="grey-6"
                              type="button"
                              @click.stop="entry.date = ''"
                            />
                            <q-icon
                              name="calendar_month"
                              class="cursor-pointer"
                              color="grey-7"
                            >
                              <q-popup-proxy
                                transition-show="scale"
                                transition-hide="scale"
                              >
                                <q-date
                                  v-model="entry.date"
                                  mask="YYYY-MM-DD"
                                  color="green-8"
                                >
                                  <div
                                    class="row items-center justify-between q-pa-sm"
                                  >
                                    <q-btn
                                      flat
                                      no-caps
                                      color="grey-7"
                                      label="Clear"
                                      type="button"
                                      @click="entry.date = ''"
                                    />
                                    <q-btn
                                      v-close-popup
                                      flat
                                      no-caps
                                      color="green-8"
                                      label="Done"
                                      type="button"
                                    />
                                  </div>
                                </q-date>
                              </q-popup-proxy>
                            </q-icon>
                          </template>
                        </q-input>
                      </td>
                      <td>
                        <q-input
                          v-model="entry.nature"
                          dense
                          outlined
                          type="text"
                          class="form-input coc-cell-input"
                          placeholder="Enter overtime details"
                        />
                      </td>
                      <td>
                        <q-input
                          v-model="entry.timeFrom"
                          dense
                          outlined
                          type="text"
                          class="form-input coc-cell-input coc-cell-input--typed-time"
                          placeholder="e.g. 5:01 PM"
                          @blur="normalizeTypedTimeField(entry, 'timeFrom')"
                          @keyup.enter="
                            normalizeTypedTimeField(entry, 'timeFrom')
                          "
                        >
                          <template #prepend>
                            <q-icon
                              name="schedule"
                              size="16px"
                              color="green-8"
                            />
                          </template>
                          <template #append>
                            <q-btn
                              v-if="entry.timeFrom"
                              flat
                              round
                              dense
                              size="sm"
                              icon="close"
                              color="grey-6"
                              type="button"
                              @click.stop="entry.timeFrom = ''"
                            />
                          </template>
                        </q-input>
                      </td>
                      <td>
                        <q-input
                          v-model="entry.timeTo"
                          dense
                          outlined
                          type="text"
                          class="form-input coc-cell-input coc-cell-input--typed-time"
                          placeholder="e.g. 9:00 PM"
                          @blur="normalizeTypedTimeField(entry, 'timeTo')"
                          @keyup.enter="
                            normalizeTypedTimeField(entry, 'timeTo')
                          "
                        >
                          <template #prepend>
                            <q-icon
                              name="schedule"
                              size="16px"
                              color="green-8"
                            />
                          </template>
                          <template #append>
                            <q-btn
                              v-if="entry.timeTo"
                              flat
                              round
                              dense
                              size="sm"
                              icon="close"
                              color="grey-6"
                              type="button"
                              @click.stop="entry.timeTo = ''"
                            />
                          </template>
                        </q-input>
                      </td>
                      <td class="coc-entry-table__summary-cell">
                        <div class="coc-entry-summary">
                          <span
                            :class="{
                              'coc-grid__placeholder-text': isNoTotalMinutes(
                                rowPolicyDetails[index]?.displayMinutes
                              ),
                              'coc-entry-summary__value--error': Boolean(
                                rowPolicyDetails[index]?.errorMessage
                              ),
                            }"
                          >
                            {{
                              formatMinutes(
                                rowPolicyDetails[index]?.displayMinutes
                              )
                            }}
                          </span>
                          <div
                            v-if="rowPolicyDetails[index]?.isOvernight"
                            class="coc-entry-summary__meta"
                          >
                            Overnight overtime
                          </div>
                          <div
                            v-if="rowPolicyDetails[index]?.errorMessage"
                            class="coc-entry-summary__error"
                          >
                            {{ rowPolicyDetails[index]?.errorMessage }}
                          </div>
                        </div>
                      </td>
                      <td class="coc-entry-table__action-cell">
                        <q-btn
                          dense
                          flat
                          round
                          color="negative"
                          icon="delete"
                          type="button"
                          :disable="submitting || rows.length <= 1"
                          @click="deleteRowByIndex(index)"
                        />
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="4" class="coc-entry-table__total-label">
                        Total Overtime
                      </td>
                      <td
                        class="coc-entry-table__total-value"
                        :class="{
                          'coc-grid__placeholder-text':
                            isNoTotalMinutes(totalDisplayMinutes),
                        }"
                      >
                        {{ formatMinutes(totalDisplayMinutes) }}
                      </td>
                      <td class="coc-entry-table__total-action-cell"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          <q-separator />

          <div class="apply-coc-dialog__footer q-pa-md">
            <div class="apply-coc-dialog__footer-actions">
              <q-btn
                flat
                no-caps
                color="green-8"
                icon="add"
                label="Add Row"
                :disable="submitting"
                type="button"
                @click="addRow"
              />
              <q-space />
              <q-btn
                flat
                no-caps
                color="grey-7"
                label="Reset"
                :disable="submitting"
                type="button"
                @click="resetForm"
              />
              <q-btn
                unelevated
                no-caps
                color="green-8"
                label="Submit COC"
                type="submit"
                :loading="submitting"
                :disable="submitting"
              />
            </div>
          </div>
        </q-form>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useQuasar } from "quasar";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  submitHandler: {
    type: Function,
    default: null,
  },
  employeeControlNo: {
    type: [String, Number],
    default: "",
  },
  draftKeySuffix: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:modelValue", "submitted"]);
const $q = useQuasar();

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const COC_ROW_COUNT = 1;
const minimumOvertimeMinutes = 120;
const minimumCreditableExcessMinutes = 20;
const mandatoryMealBreakMinutes = 60;
const mandatoryMealBreakTriggerMinutes = 240;
const maximumConsecutiveOvernightNights = 2;
const maximumCreditableMinutesPerRow = 8 * 60;
const submitting = ref(false);
const rowSeed = ref(COC_ROW_COUNT);
const isClient = typeof window !== "undefined";

const buildEmptyRow = (index) => ({
  id: `coc-row-${index + 1}`,
  date: "",
  nature: "",
  timeFrom: "",
  timeTo: "",
});

const buildRows = () =>
  Array.from({ length: COC_ROW_COUNT }, (_, index) => buildEmptyRow(index));

const rows = ref(buildRows());

const toSafeText = (value) => String(value ?? "").trim();

const buildDraftStorageKey = () => {
  const controlNo = toSafeText(props.employeeControlNo) || "admin";
  const suffix = toSafeText(props.draftKeySuffix);
  return suffix ? `apply-coc-draft:${controlNo}:${suffix}` : `apply-coc-draft:${controlNo}`;
};

const serializeRowsForDraft = (sourceRows) =>
  sourceRows.map((entry) => ({
    date: String(entry?.date ?? ""),
    nature: String(entry?.nature ?? ""),
    timeFrom: String(entry?.timeFrom ?? ""),
    timeTo: String(entry?.timeTo ?? ""),
  }));

const restoreDraft = () => {
  if (!isClient) return false;

  try {
    const raw = window.localStorage.getItem(buildDraftStorageKey());
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.rows)) return false;

    const restoredRows = parsed.rows.map((entry, index) => ({
      ...buildEmptyRow(index),
      date: String(entry?.date ?? ""),
      nature: String(entry?.nature ?? ""),
      timeFrom: String(entry?.timeFrom ?? ""),
      timeTo: String(entry?.timeTo ?? ""),
    }));

    const hasAnyValue = restoredRows.some(
      (entry) =>
        String(entry.date).trim() ||
        String(entry.nature).trim() ||
        String(entry.timeFrom).trim() ||
        String(entry.timeTo).trim()
    );

    if (!hasAnyValue) return false;

    rows.value = restoredRows;
    rowSeed.value = restoredRows.length;
    return true;
  } catch (error) {
    console.warn("Failed to restore COC draft:", error);
    return false;
  }
};

const saveDraft = () => {
  if (!isClient) return;

  try {
    const payload = { rows: serializeRowsForDraft(rows.value) };
    window.localStorage.setItem(
      buildDraftStorageKey(),
      JSON.stringify(payload)
    );
  } catch (error) {
    console.warn("Failed to save COC draft:", error);
  }
};

const clearDraft = () => {
  if (!isClient) return;

  try {
    window.localStorage.removeItem(buildDraftStorageKey());
  } catch (error) {
    console.warn("Failed to clear COC draft:", error);
  }
};

const parseTimeToMinutes = (value) => {
  const parsed = parseTypedTime(value);
  if (!parsed) return null;
  return parsed.hour24 * 60 + parsed.minute;
};

const isOvertimeRangeOvernight = (timeFrom, timeTo) => {
  const startMinutes = parseTimeToMinutes(timeFrom);
  const endMinutes = parseTimeToMinutes(timeTo);
  if (startMinutes == null || endMinutes == null) return false;
  return endMinutes <= startMinutes;
};

const calculateMandatoryBreakMinutes = (minutes) =>
  Number(minutes || 0) >= mandatoryMealBreakTriggerMinutes
    ? mandatoryMealBreakMinutes
    : 0;

const calculateCreditableMinutes = (minutes) => {
  const normalizedMinutes = Math.max(0, Number(minutes || 0));
  if (!Number.isFinite(normalizedMinutes) || normalizedMinutes <= 0) return 0;

  const wholeHoursMinutes = Math.floor(normalizedMinutes / 60) * 60;
  const excessMinutes = normalizedMinutes % 60;
  const creditableExcessMinutes =
    excessMinutes >= minimumCreditableExcessMinutes ? excessMinutes : 0;

  return Math.min(
    maximumCreditableMinutesPerRow,
    wholeHoursMinutes + creditableExcessMinutes
  );
};

const monthShortNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const formatDateDisplay = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  )
    return raw;
  if (month < 1 || month > 12 || day < 1 || day > 31) return raw;

  return `${monthShortNames[month - 1]} ${String(day).padStart(
    2,
    "0"
  )}, ${year}`;
};

const parseTypedTime = (value, defaultMeridiem = "PM") => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  let working = raw.toUpperCase().replace(/\./g, "").replace(/\s+/g, "");
  let meridiem = "";

  const meridiemMatch = working.match(/(AM|PM|A|P)$/);
  if (meridiemMatch) {
    meridiem = meridiemMatch[1].startsWith("A") ? "AM" : "PM";
    working = working.slice(0, -meridiemMatch[1].length);
  }

  if (!working) return null;

  let hour = null;
  let minute = null;

  if (working.includes(":")) {
    const parts = working.split(":");
    if (parts.length !== 2) return null;
    if (!/^\d{1,2}$/.test(parts[0]) || !/^\d{1,2}$/.test(parts[1])) return null;

    hour = Number(parts[0]);
    minute = Number(parts[1]);
  } else if (/^\d+$/.test(working)) {
    if (working.length <= 2) {
      hour = Number(working);
      minute = 0;
    } else if (working.length === 3) {
      hour = Number(working.slice(0, 1));
      minute = Number(working.slice(1));
    } else if (working.length === 4) {
      hour = Number(working.slice(0, 2));
      minute = Number(working.slice(2));
    } else {
      return null;
    }
  } else {
    return null;
  }

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (minute < 0 || minute > 59) return null;

  let hour24 = null;
  let resolvedMeridiem = meridiem;

  if (resolvedMeridiem) {
    if (hour < 1 || hour > 12) return null;
    hour24 =
      resolvedMeridiem === "PM"
        ? hour === 12
          ? 12
          : hour + 12
        : hour === 12
        ? 0
        : hour;
  } else {
    if (hour < 0 || hour > 23) return null;

    if (hour === 0) {
      hour24 = 0;
      resolvedMeridiem = "AM";
    } else if (hour > 12) {
      hour24 = hour;
      resolvedMeridiem = hour24 >= 12 ? "PM" : "AM";
    } else {
      resolvedMeridiem = defaultMeridiem;
      hour24 =
        resolvedMeridiem === "PM"
          ? hour === 12
            ? 12
            : hour + 12
          : hour === 12
          ? 0
          : hour;
    }
  }

  const hour12 = hour24 % 12 || 12;
  const minuteText = String(minute).padStart(2, "0");

  return {
    hour24,
    minute,
    display: `${hour12}:${minuteText} ${resolvedMeridiem}`,
    value24: `${String(hour24).padStart(2, "0")}:${minuteText}`,
  };
};

const minutesBetween = (startValue, endValue) => {
  const start = parseTimeToMinutes(startValue);
  const end = parseTimeToMinutes(endValue);
  if (start == null || end == null) return 0;

  if (end >= start) return end - start;
  return 24 * 60 - start + end;
};

const rowPolicyDetails = computed(() =>
  rows.value.map((entry) => {
    const filled = hasRowData(entry);
    const complete = isRowComplete(entry);
    const parsedFrom = hasValue(entry?.timeFrom)
      ? parseTypedTime(entry?.timeFrom)
      : null;
    const parsedTo = hasValue(entry?.timeTo)
      ? parseTypedTime(entry?.timeTo)
      : null;
    const hasInvalidTimeFormat =
      (hasValue(entry?.timeFrom) && !parsedFrom) ||
      (hasValue(entry?.timeTo) && !parsedTo);
    const rawMinutes =
      parsedFrom && parsedTo ? minutesBetween(entry.timeFrom, entry.timeTo) : 0;
    const hasInvalidDuration =
      complete && !hasInvalidTimeFormat && rawMinutes <= 0;
    const belowMinimum =
      complete &&
      !hasInvalidTimeFormat &&
      Number.isFinite(rawMinutes) &&
      rawMinutes > 0 &&
      rawMinutes < minimumOvertimeMinutes;
    const breakMinutes =
      rawMinutes > 0 ? calculateMandatoryBreakMinutes(rawMinutes) : 0;
    const creditableBaseMinutes =
      rawMinutes > 0
        ? calculateCreditableMinutes(Math.max(rawMinutes - breakMinutes, 0))
        : 0;
    const displayMinutes = rawMinutes > 0 ? creditableBaseMinutes : 0;
    const isOvernight =
      rawMinutes > 0 && isOvertimeRangeOvernight(entry.timeFrom, entry.timeTo);
    const periodKey = hasValue(entry?.date)
      ? String(entry.date).slice(0, 7)
      : "";

    let errorMessage = "";
    if (filled) {
      if (!complete) {
        errorMessage = "Complete date, nature, and time range.";
      } else if (hasInvalidTimeFormat) {
        errorMessage = "Use a valid time like 7:30 PM.";
      } else if (hasInvalidDuration) {
        errorMessage = "Invalid overtime duration.";
      } else if (belowMinimum) {
        errorMessage = "Minimum of 2 hours.";
      }
    }

    return {
      filled,
      complete,
      hasInvalidTimeFormat,
      hasInvalidDuration,
      belowMinimum,
      rawMinutes,
      breakMinutes,
      creditableBaseMinutes,
      displayMinutes,
      isOvernight,
      periodKey,
      errorMessage,
    };
  })
);

const rowMinutes = computed(() =>
  rowPolicyDetails.value.map((detail) => detail.rawMinutes)
);

const totalMinutes = computed(() =>
  rowMinutes.value.reduce((sum, minutes) => sum + Number(minutes || 0), 0)
);

const totalDisplayMinutes = computed(() =>
  rowPolicyDetails.value.reduce(
    (sum, detail) => sum + Number(detail?.displayMinutes || 0),
    0
  )
);

const formatMinutes = (value) => {
  const total = Number(value || 0);
  if (!Number.isFinite(total) || total <= 0) return "-";

  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
};

const isNoTotalMinutes = (value) => {
  const total = Number(value || 0);
  return !Number.isFinite(total) || total <= 0;
};

const hasValue = (value) => String(value ?? "").trim() !== "";

const normalizeTypedTimeField = (entry, field) => {
  const parsed = parseTypedTime(entry?.[field]);
  if (!parsed || !entry) return;
  entry[field] = parsed.display;
};

const hasRowData = (entry) =>
  [entry?.date, entry?.nature, entry?.timeFrom, entry?.timeTo].some((value) =>
    hasValue(value)
  );

const isRowComplete = (entry) =>
  [entry?.date, entry?.nature, entry?.timeFrom, entry?.timeTo].every((value) =>
    hasValue(value)
  );

const resolveOvernightLimitExceededDate = (details = []) => {
  const overnightDates = [
    ...new Set(
      details
        .filter(
          (detail, index) =>
            detail?.filled &&
            detail?.complete &&
            !detail?.hasInvalidTimeFormat &&
            !detail?.hasInvalidDuration &&
            rows.value[index]?.date &&
            detail?.isOvernight
        )
        .map((detail, index) => String(rows.value[index]?.date || "").trim())
        .filter(Boolean)
    ),
  ].sort();

  let previousDate = null;
  let consecutiveNights = 0;

  for (const dateValue of overnightDates) {
    const currentDate = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(currentDate.getTime())) continue;

    if (previousDate) {
      const dayDiff = Math.round(
        (currentDate.getTime() - previousDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      consecutiveNights = dayDiff === 1 ? consecutiveNights + 1 : 1;
    } else {
      consecutiveNights = 1;
    }

    if (consecutiveNights > maximumConsecutiveOvernightNights) {
      return dateValue;
    }

    previousDate = currentDate;
  }

  return "";
};

const collectValidationMessages = ({ includeEmpty = false } = {}) => {
  const details = rowPolicyDetails.value;
  const filledDetails = details.filter((detail) => detail.filled);
  const messages = [];

  if (!filledDetails.length) {
    if (includeEmpty) {
      messages.push("Please add at least one COC overtime entry.");
    }
    return messages;
  }

  if (filledDetails.some((detail) => !detail.complete)) {
    messages.push(
      "Please complete date, nature, and time range for each filled row."
    );
  }

  if (filledDetails.some((detail) => detail.hasInvalidTimeFormat)) {
    messages.push(
      "Use a valid time format like 7, 730, 7:30, 7pm, or 7:30pm (default is PM)."
    );
  }

  if (filledDetails.some((detail) => detail.hasInvalidDuration)) {
    messages.push("Each filled row must have a valid overtime duration.");
  }

  if (filledDetails.some((detail) => detail.belowMinimum)) {
    messages.push("Each COC overtime row must be at least 2 hours.");
  }

  const completedPeriodKeys = filledDetails
    .filter((detail) => detail.complete)
    .map((detail) => detail.periodKey)
    .filter(Boolean);
  if (new Set(completedPeriodKeys).size > 1) {
    messages.push("All COC rows must belong to the same month and year.");
  }

  const overnightLimitExceededDate = resolveOvernightLimitExceededDate(details);
  if (overnightLimitExceededDate) {
    messages.push(
      `Overnight overtime beyond two consecutive nights is not allowed. The limit is exceeded on ${formatDateDisplay(
        overnightLimitExceededDate
      )}.`
    );
  }

  return [...new Set(messages)];
};

const resetForm = ({ clearSavedDraft = true } = {}) => {
  rowSeed.value = COC_ROW_COUNT;
  rows.value = buildRows();
  if (clearSavedDraft) {
    clearDraft();
  }
};

const addRow = () => {
  const next = rowSeed.value;
  rows.value.push(buildEmptyRow(next));
  rowSeed.value += 1;
};

const deleteRowByIndex = (index) => {
  if (rows.value.length <= 1) return;
  rows.value.splice(index, 1);
};

const buildSubmitPayload = () => {
  const submittedRows = rows.value
    .map((entry, index) => ({
      date: entry.date,
      nature_of_overtime: entry.nature,
      time_from: parseTypedTime(entry.timeFrom)?.value24 || "",
      time_to: parseTypedTime(entry.timeTo)?.value24 || "",
      no_of_hours_and_minutes: rowPolicyDetails.value[index]?.rawMinutes || 0,
      total_no_of_hours_and_minutes:
        rowPolicyDetails.value[index]?.rawMinutes || 0,
    }))
    .filter((entry) =>
      [
        entry.date,
        entry.nature_of_overtime,
        entry.time_from,
        entry.time_to,
      ].some((value) => hasValue(value))
    );

  const payload = {
    rows: submittedRows,
    total_no_of_coc_applied_minutes: totalMinutes.value,
  };

  const employeeControlNo = toSafeText(props.employeeControlNo);
  if (employeeControlNo) {
    payload.employee_control_no = employeeControlNo;
  }

  return payload;
};

const getSubmitErrorMessage = (error) =>
  String(error?.response?.data?.message || error?.message || "").trim();

const isPendingLateHrApplication = (application) =>
  String(application?.raw_status ?? application?.rawStatus ?? "")
    .trim()
    .toUpperCase() === "PENDING_LATE_HR";

const submitForm = async () => {
  if (submitting.value) return;

  const validationMessages = collectValidationMessages({ includeEmpty: true });
  if (validationMessages.length) {
    $q.notify({
      type: "negative",
      position: "top",
      message: validationMessages[0],
    });
    return;
  }

  try {
    submitting.value = true;
    const payload = buildSubmitPayload();
    let result = null;

    if (typeof props.submitHandler === "function") {
      result = await props.submitHandler(payload);
    } else {
      emit("submitted", payload);
    }

    const submittedApplication = result?.application;
    const isLateFilingPendingHr =
      isPendingLateHrApplication(submittedApplication);

    $q.notify({
      type: isLateFilingPendingHr ? "warning" : "positive",
      position: "top",
      message:
        result?.message ||
        (typeof props.submitHandler === "function"
          ? "COC application submitted."
          : "COC application draft prepared."),
    });

    clearDraft();
    dialogModel.value = false;
    resetForm({ clearSavedDraft: false });
  } catch (error) {
    const message =
      getSubmitErrorMessage(error) || "Unable to submit COC application.";
    $q.notify({
      type: "negative",
      position: "top",
      message,
    });
  } finally {
    submitting.value = false;
  }
};

watch(
  rows,
  () => {
    saveDraft();
  },
  { deep: true }
);

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      restoreDraft();
    }
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
.apply-coc-dialog {
  background: #fff;
  width: min(1120px, 96vw);
  max-width: 1180px;
  max-height: 70vh;
  margin-top: -12px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}

.apply-coc-dialog__bar {
  min-height: 54px;
  background-color: #2e7d32;
}

.apply-coc-dialog__content {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  -webkit-overflow-scrolling: touch;
}

.apply-coc-dialog__form {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.apply-coc-dialog__body {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.coc-entry-list {
  min-width: 0;
}

.coc-entry-table-wrap {
  width: 100%;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid #d5dde6;
  border-radius: 12px;
  background: #fff;
}

.coc-entry-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
}

.coc-entry-table th {
  padding: 8px 8px;
  text-align: left;
  border-bottom: 1px solid #dfe7f0;
  background: linear-gradient(180deg, #f8fbff 0%, #f3f7fb 100%);
  color: #5b6b7b;
  font-size: 0.69rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  white-space: nowrap;
}

.coc-entry-table td {
  padding: 8px 8px;
  border-bottom: 1px solid #e6ecf3;
  vertical-align: middle;
}

.coc-entry-table th:nth-child(1),
.coc-entry-table td:nth-child(1) {
  width: 16%;
}

.coc-entry-table th:nth-child(2),
.coc-entry-table td:nth-child(2) {
  width: 20%;
}

.coc-entry-table th:nth-child(3),
.coc-entry-table td:nth-child(3) {
  width: 18%;
}

.coc-entry-table th:nth-child(4),
.coc-entry-table td:nth-child(4) {
  width: 18%;
}

.coc-entry-table th:nth-child(5),
.coc-entry-table td:nth-child(5) {
  width: 14%;
}

.coc-entry-table__action-col {
  width: 6%;
  text-align: center;
}

.coc-entry-table__summary-cell {
  min-width: 0;
}

.coc-entry-summary {
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 2px;
  padding: 0 8px;
  border: 1px solid #d5dde6;
  border-radius: 8px;
  background: #f8fafc;
  color: #1f2f3f;
  font-size: 0.85rem;
  font-weight: 700;
  text-align: center;
}

.coc-entry-summary__value--error {
  color: #d32f2f;
}

.coc-entry-summary__meta {
  font-size: 0.68rem;
  line-height: 1.25;
  color: #5f6b7a;
  font-weight: 600;
}

.coc-entry-summary__error {
  font-size: 0.68rem;
  line-height: 1.25;
  color: #d32f2f;
  font-weight: 700;
}

.coc-entry-table__action-cell {
  text-align: center;
}

.coc-grid__placeholder-text {
  color: #97a4b4;
  font-weight: 500;
}

.coc-entry-table tfoot td {
  border-bottom: 0;
  background: linear-gradient(180deg, #f8fbff 0%, #f3f7fb 100%);
}

.coc-entry-table__total-label {
  text-align: right;
  color: #5b6b7b;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.coc-entry-table__total-value {
  text-align: center;
  color: #17324c;
  font-size: 1rem;
  font-weight: 800;
}

.coc-entry-table__total-action-cell {
  width: 72px;
}

.form-input :deep(.q-field--outlined .q-field__control) {
  border-radius: 8px;
}

.coc-cell-input :deep(.q-field__control) {
  min-height: 40px;
}

.coc-cell-input :deep(.q-field__native),
.coc-cell-input :deep(input) {
  font-size: 0.8rem;
}

.coc-cell-input--picker :deep(.q-field__native) {
  cursor: pointer;
  color: #1f2f3f;
}

.coc-cell-input--picker :deep(.q-placeholder) {
  color: #8a97a8;
}

.coc-cell-input--typed-time :deep(input) {
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.coc-cell-input--typed-time :deep(input::placeholder) {
  text-transform: none;
  font-weight: 400;
}

.coc-category-toggle {
  width: 100%;
}

.coc-category-toggle :deep(.q-btn) {
  font-size: 0.7rem;
  min-height: 36px;
}

.apply-coc-dialog__footer {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  gap: 8px;
}

.apply-coc-dialog__footer-actions {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  gap: 8px;
}

@media (max-width: 1023px) {
  .apply-coc-dialog {
    width: 97vw;
    max-height: 94vh;
  }
}

@media (max-width: 599px) {
  .apply-coc-dialog {
    margin-top: -8px;
    border-radius: 10px;
  }

  .apply-coc-dialog__body {
    padding: 12px;
  }

  .apply-coc-dialog__footer {
    flex-wrap: wrap;
  }

  .apply-coc-dialog__footer-actions {
    flex-wrap: wrap;
  }

  .coc-entry-table th {
    white-space: normal;
  }
}
</style>
