export function resolveOfficeAcronymLabel(source) {
  if (source && typeof source === 'object') {
    const directCandidates = [
      source.hrisOfficeAcronym,
      source.hris_office_acronym,
      source.officeAcronym,
      source.office_acronym,
      source.assignedDepartmentAcronym,
      source.assigned_department_acronym,
      source.employee?.hrisOfficeAcronym,
      source.employee?.hris_office_acronym,
      source.employee?.officeAcronym,
      source.employee?.office_acronym,
      source.employee?.assignedDepartmentAcronym,
      source.employee?.assigned_department_acronym,
    ]

    for (const candidate of directCandidates) {
      const text = String(candidate || '').trim()
      if (text) return text
    }

    return ''
  }

  return String(source || '').trim()
}
