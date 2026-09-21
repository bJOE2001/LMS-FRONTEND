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

export function isSangguniangPanlungsodMemberIApplicant(app) {
  return isElectiveApplicant(app)
}
