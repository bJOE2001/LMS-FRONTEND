import { ref } from 'vue'
import { api } from 'boot/axios'

export const defaultSpecialPrivilegeReasons = [
  {
    id: 1,
    description: 'Personal milestones',
    label: 'Personal milestones',
    value: 'Personal milestones'
  },
  {
    id: 2,
    description: 'Parental obligations',
    label: 'Parental obligations',
    value: 'Parental obligations'
  },
  {
    id: 3,
    description: 'Filial obligations',
    label: 'Filial obligations',
    value: 'Filial obligations'
  },
  {
    id: 4,
    description: 'Domestic emergencies',
    label: 'Domestic emergencies',
    value: 'Domestic emergencies'
  },
  {
    id: 5,
    description: 'Personal transactions',
    label: 'Personal transactions',
    value: 'Personal transactions'
  },
  {
    id: 6,
    description: 'Calamity',
    label: 'Calamity',
    value: 'Calamity'
  }
]

function normalizeReasonOption(option) {
  if (!option) return null

  if (typeof option === 'string') {
    const value = String(option || '').trim()
    return value ? { label: value, value, description: value } : null
  }

  const label = String(option.label ?? option.name ?? option.description ?? option.value ?? '').trim()
  const value = String(option.value ?? option.name ?? option.description ?? option.label ?? '').trim()
  const description = String(option.description ?? '').trim()
  const id = option.id

  const resolvedLabel = label || value
  const resolvedValue = value || label

  if (!resolvedLabel || !resolvedValue) return null

  return {
    id,
    description,
    label: resolvedLabel,
    value: resolvedValue,
  }
}

export function useSpecialPrivilegeReasons() {
  const specialPrivilegeReasons = ref([...defaultSpecialPrivilegeReasons])

  async function fetchSpecialPrivilegeReasons() {
    try {
      const { data } = await api.get('/special-privilege-reasons/options')
      const sourceOptions = Array.isArray(data?.reasons) ? data.reasons : []
      const normalizedOptions = sourceOptions
        .map((option) => normalizeReasonOption(option))
        .filter(Boolean)

      specialPrivilegeReasons.value = normalizedOptions.length > 0 ? normalizedOptions : [...defaultSpecialPrivilegeReasons]
    } catch {
      specialPrivilegeReasons.value = [...defaultSpecialPrivilegeReasons]
    }
  }

  return {
    specialPrivilegeReasons,
    fetchSpecialPrivilegeReasons,
  }
}
