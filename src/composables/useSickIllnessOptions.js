import { ref } from 'vue'
import { api } from 'boot/axios'

export const defaultSickIllnessOptions = [
  { label: 'Flu', value: 'Flu' },
  { label: 'Fever', value: 'Fever' },
  { label: 'Cough and Cold', value: 'Cough and Cold' },
  { label: 'Hypertension', value: 'Hypertension' },
  { label: 'Migraine', value: 'Migraine' },
  { label: 'Asthma', value: 'Asthma' },
  { label: 'Dengue', value: 'Dengue' },
  { label: 'Diarrhea', value: 'Diarrhea' },
  { label: 'Urinary Tract Infection (UTI)', value: 'Urinary Tract Infection (UTI)' },
  { label: 'Other', value: 'Other' },
]

function normalizeIllnessOption(option) {
  if (!option) return null

  if (typeof option === 'string') {
    const value = String(option || '').trim()
    return value ? { label: value, value } : null
  }

  const label = String(option.label ?? option.name ?? option.value ?? '').trim()
  const value = String(option.value ?? option.name ?? option.label ?? '').trim()
  const resolvedLabel = label || value
  const resolvedValue = value || label

  if (!resolvedLabel || !resolvedValue) return null

  return {
    label: resolvedLabel,
    value: resolvedValue,
  }
}

function ensureOtherOption(options) {
  if (options.some((option) => option.value === 'Other')) {
    return options
  }

  return [...options, { label: 'Other', value: 'Other' }]
}

export function useSickIllnessOptions() {
  const sickIllnessOptions = ref([...defaultSickIllnessOptions])

  async function fetchSickIllnessOptions() {
    try {
      const { data } = await api.get('/illnesses/options')
      const sourceOptions = Array.isArray(data?.illnesses) ? data.illnesses : []
      const normalizedOptions = sourceOptions
        .map((option) => normalizeIllnessOption(option))
        .filter(Boolean)

      sickIllnessOptions.value = ensureOtherOption(
        normalizedOptions.length > 0 ? normalizedOptions : [...defaultSickIllnessOptions],
      )
    } catch {
      sickIllnessOptions.value = [...defaultSickIllnessOptions]
    }
  }

  return {
    sickIllnessOptions,
    fetchSickIllnessOptions,
  }
}
