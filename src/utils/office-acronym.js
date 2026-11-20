/**
 * Normalize a raw office string fallback when no backend HRIS yOffice acronym is present.
 */
export function formatOfficeAbbreviation(value) {
  if (!value) return '—'
  const text = String(value).trim()
  if (!text || text === '—') return '—'

  return text
}

/**
 * Resolve the display acronym from a backend payload (sourced from HRIS yOffice)
 * or fall back to the trimmed string value.
 */
export function resolveOfficeAcronymLabel(source) {
  if (source && typeof source === 'object') {
    const directCandidates = [
      source.hrisOfficeAcronym,
      source.hris_office_acronym,
      source.officeAcronym,
      source.office_acronym,
      source.assignedDepartmentAcronym,
      source.assigned_department_acronym,
      source.acronym,
      source.employee?.hrisOfficeAcronym,
      source.employee?.hris_office_acronym,
      source.employee?.officeAcronym,
      source.employee?.office_acronym,
      source.employee?.assignedDepartmentAcronym,
      source.employee?.assigned_department_acronym,
      source.employee?.acronym,
    ]

    for (const candidate of directCandidates) {
      const text = String(candidate || '').trim()
      if (text) return text
    }

    return ''
  }

  return formatOfficeAbbreviation(source)
}
