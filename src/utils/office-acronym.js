export function resolveOfficeAcronymLabel(source) {
  if (source && typeof source === 'object') {
    const directCandidates = [
      source.hrisOfficeAcronym,
      source.hris_office_acronym,
      source.officeAcronym,
      source.office_acronym,
      source.employee?.hrisOfficeAcronym,
      source.employee?.hris_office_acronym,
      source.employee?.officeAcronym,
      source.employee?.office_acronym,
    ]

    for (const candidate of directCandidates) {
      const text = String(candidate || '').trim()
      if (text) return text
    }

    const officeTextCandidates = [
      source.hris_office,
      source.employee?.hris_office,
      source.office,
      source.employee?.office,
      source.assigned_department_name,
      source.department,
    ]

    for (const candidate of officeTextCandidates) {
      const text = String(candidate || '').trim()
      if (text) return text
    }

    return ''
  }

  return String(source || '').trim()
}
