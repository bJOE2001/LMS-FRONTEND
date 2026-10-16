function normalizeRoleToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function getEmploymentStatusCandidates(app) {
  return [
    app?.employment_status,
    app?.employment_status_key,
    app?.employmentStatus,
    app?.employmentStatusKey,
    app?.employment_type,
    app?.employmentType,
    app?.appointment_status,
    app?.appointmentStatus,
    app?.employee_status,
    app?.employeeStatus,
    app?.employee?.employment_status,
    app?.employee?.employment_status_key,
    app?.employee?.employmentStatus,
    app?.employee?.employmentStatusKey,
    app?.employee?.employment_type,
    app?.employee?.employmentType,
    app?.employee?.appointment_status,
    app?.employee?.appointmentStatus,
    app?.employee?.status,
    app?.user?.employment_status,
    app?.user?.employment_status_key,
    app?.user?.employmentStatus,
    app?.user?.employmentStatusKey,
    app?.user?.employment_type,
    app?.user?.employmentType,
    app?.user?.appointment_status,
    app?.user?.appointmentStatus,
  ]
}

function getDesignationCandidates(app) {
  return [
    app?.designation,
    app?.position,
    app?.job_title,
    app?.jobTitle,
    app?.employee?.designation,
    app?.employee?.position,
    app?.employee?.job_title,
    app?.employee?.jobTitle,
    app?.employee_info?.designation,
    app?.employee_info?.position,
    app?.employeeInfo?.designation,
    app?.employeeInfo?.position,
    app?.user?.designation,
    app?.user?.position,
    app?.user_info?.designation,
    app?.user_info?.position,
    app?.userInfo?.designation,
    app?.userInfo?.position,
  ]
}

export function isCityMayorApplicant(app) {
  return getDesignationCandidates(app).some((candidate) => {
    const normalizedDesignation = normalizeRoleToken(candidate)
    if (!normalizedDesignation) return false
    return (
      normalizedDesignation.includes('CITY MAYOR') ||
      (normalizedDesignation.includes('MAYOR') &&
        normalizedDesignation.includes('CITY') &&
        !normalizedDesignation.includes('VICE'))
    )
  })
}

export function isCityViceMayorApplicant(app) {
  return getDesignationCandidates(app).some((candidate) => {
    const normalizedDesignation = normalizeRoleToken(candidate)
    if (!normalizedDesignation) return false
    return (
      normalizedDesignation.includes('CITY VICE MAYOR') ||
      (normalizedDesignation.includes('VICE MAYOR') && normalizedDesignation.includes('CITY'))
    )
  })
}

export function isElectiveApplicant(app) {
  if (isCityMayorApplicant(app) || isCityViceMayorApplicant(app)) {
    return false
  }

  const hasElectiveStatus = getEmploymentStatusCandidates(app).some((candidate) =>
    normalizeRoleToken(candidate).includes('ELECTIVE'),
  )

  const hasSpMemberDesignation = getDesignationCandidates(app).some((candidate) => {
    const normalizedDesignation = normalizeRoleToken(candidate)
    if (!normalizedDesignation) return false
    return (
      normalizedDesignation.includes('SANGGUNIANG PANLUNGSOD MEMBER') ||
      normalizedDesignation.includes('SP MEMBER')
    )
  })

  return hasElectiveStatus || hasSpMemberDesignation
}

export function isSangguniangPanlungsodMemberApplicant(app) {
  return isElectiveApplicant(app)
}

export function isSangguniangPanlungsodMemberIApplicant(app) {
  return isSangguniangPanlungsodMemberApplicant(app)
}

export function getOfficeCandidates(app) {
  return [
    app?.office,
    app?.office_name,
    app?.officeName,
    app?.assignedOffice,
    app?.assigned_office,
    app?.assigned_department_name,
    app?.assignedDepartmentName,
    app?.officeAcronym,
    app?.office_acronym,
    app?.assignedDepartmentAcronym,
    app?.assigned_department_acronym,
    app?.departmentOfficeAbbr,
    app?.department_office_abbr,
    app?.hrisOfficeAcronym,
    app?.hris_office_acronym,
    app?.department_name,
    app?.department?.name,
    app?.employee?.office,
    app?.employee?.office_name,
    app?.employee?.assignedOffice,
    app?.employee?.assigned_office,
    app?.employee?.assigned_department_name,
    app?.employee?.officeAcronym,
    app?.employee?.office_acronym,
    app?.employee?.assignedDepartmentAcronym,
    app?.employee?.assigned_department_acronym,
    app?.employee?.departmentOfficeAbbr,
    app?.employee?.department_office_abbr,
    app?.employee?.hrisOfficeAcronym,
    app?.employee?.hris_office_acronym,
    app?.employee?.department_name,
    app?.raw?.office,
    app?.raw?.officeAcronym,
    app?.raw?.office_acronym,
    app?.raw?.assignedOffice,
    app?.raw?.assigned_office,
    app?.raw?.assignedDepartmentAcronym,
    app?.raw?.assigned_department_acronym,
  ]
}

export function isLegislativeOfficeApplicant(app) {
  const isDesignationMatching = getDesignationCandidates(app).some((candidate) => {
    const token = normalizeRoleToken(candidate)
    return token.includes('SECRETARY TO THE SANGGUNIAN') || token.includes('SP SECRETARY')
  })
  if (isDesignationMatching) {
    return true
  }

  return getOfficeCandidates(app).some((candidate) => {
    const token = normalizeRoleToken(candidate)
    if (!token) return false
    return (
      token === 'SP LEGISLATIVE' ||
      token === 'SP LEG' ||
      token === 'SP SECRETARIAT' ||
      token === 'SP SEC' ||
      token === 'CVMO' ||
      token.includes('SANGGUNIANG PANLUNGSOD') ||
      token.includes('SP SECRETARIAT') ||
      token.includes('SP LEGISLATIVE') ||
      token.includes('CITY VICE MAYOR')
    )
  })
}

export function isLegislativeDepartmentHeadApplicant(app) {
  const isHead = Boolean(
    app?.is_department_head ||
      app?.isDepartmentHead ||
      app?.employee?.is_department_head ||
      app?.employee?.isDepartmentHead,
  )
  if (!isHead) return false

  return isLegislativeOfficeApplicant(app)
}


