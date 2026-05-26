import { api } from 'src/boot/axios'

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeControlNo(value) {
  return normalizeText(value).replace(/^0+/, '')
}

function normalizeComparableName(value) {
  return normalizeText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function ensureHonorificPrefix(value, honorific = 'HON.') {
  const normalizedName = normalizeText(value)
  if (!normalizedName) return ''
  const honorificPattern = new RegExp(`^${honorific.replace('.', '\\.')}\\s+`, 'i')
  if (honorificPattern.test(normalizedName)) {
    return normalizedName
  }
  return `${honorific} ${normalizedName}`
}

function normalizeDesignationToken(value) {
  return normalizeText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isCityViceMayorDesignation(value) {
  const designationToken = normalizeDesignationToken(value)
  if (!designationToken) return false
  return (
    designationToken.includes('CITY VICE MAYOR') ||
    (designationToken.includes('VICE MAYOR') && designationToken.includes('CITY'))
  )
}

function buildFullName(person) {
  const directName = normalizeText(person?.full_name || person?.name)
  if (directName) return directName

  const parts = [
    normalizeText(person?.firstname),
    normalizeText(person?.middlename),
    normalizeText(person?.surname),
  ].filter(Boolean)

  return parts.join(' ').trim()
}

export function getDepartmentHeadSignature(app) {
  const head = app?.departmentHead || app?.department_head || {}

  return {
    fullName: buildFullName(head),
    designation: normalizeText(head?.designation || head?.position) || 'Executive Assistant III',
  }
}

export function isDepartmentHeadApplicant(app) {
  const head = app?.departmentHead || app?.department_head || {}
  const headControlNo = normalizeControlNo(head?.control_no)
  const applicantControlNo = normalizeControlNo(
    app?.employee_control_no || app?.employeeControlNo || app?.employee?.control_no,
  )

  if (headControlNo && applicantControlNo) {
    return headControlNo === applicantControlNo
  }

  const headName = normalizeComparableName(buildFullName(head))
  const applicantName = normalizeComparableName(
    app?.employeeName || app?.employee_name || app?.applicantName || app?.applicant_name,
  )

  return Boolean(headName) && Boolean(applicantName) && headName === applicantName
}

export function getMayorSignature(app) {
  const candidate =
    app?.cityMayor ||
    app?.city_mayor ||
    app?.cityMayorSignatory ||
    app?.city_mayor_signatory ||
    {}
  const fallbackName = normalizeText(app?.cityMayorName || app?.city_mayor_name) || ''
  const fallbackDesignation =
    normalizeText(candidate?.designation || candidate?.position || app?.cityMayorPosition) || ''
  const candidateFullName = buildFullName(candidate) || fallbackName
  if (candidateFullName) {
    return {
      fullName: ensureHonorificPrefix(candidateFullName, 'HON.'),
      designation: fallbackDesignation || 'City Mayor',
    }
  }

  return {
    fullName: 'HON. REY T. UY',
    designation: 'City Mayor',
  }
}

export function getCityViceMayorSignature(app) {
  const candidate =
    app?.cityViceMayor ||
    app?.city_vice_mayor ||
    app?.cityViceMayorSignatory ||
    app?.city_vice_mayor_signatory ||
    {}
  const fallbackName = normalizeText(app?.cityViceMayorName || app?.city_vice_mayor_name) || ''
  const fallbackDesignation =
    normalizeText(candidate?.designation || candidate?.position || app?.cityViceMayorPosition) ||
    ''
  const candidateFullName = buildFullName(candidate) || fallbackName
  if (candidateFullName) {
    return {
      fullName: candidateFullName,
      designation: fallbackDesignation || 'City Vice Mayor',
    }
  }

  const head = app?.departmentHead || app?.department_head || {}
  const headFullName = buildFullName(head)
  const headDesignation = normalizeText(head?.designation || head?.position)
  if (isCityViceMayorDesignation(headDesignation)) {
    return {
      fullName: headFullName,
      designation: headDesignation || 'City Vice Mayor',
    }
  }

  return {
    fullName: headFullName,
    designation: fallbackDesignation || 'City Vice Mayor',
  }
}

export function getCityAdministratorSignature(app) {
  const candidate =
    app?.cityAdministrator ||
    app?.city_administrator ||
    app?.cityAdministratorSignatory ||
    app?.city_administrator_signatory ||
    {}

  const fallbackName =
    normalizeText(app?.cityAdministratorName || app?.city_administrator_name) || ''

  return {
    fullName: buildFullName(candidate) || fallbackName,
    designation:
      normalizeText(candidate?.designation || candidate?.position || app?.cityAdministratorPosition) ||
      'City Administrator',
  }
}

export function getChrmoLeaveInChargeSignatory(app) {
  const candidate =
    app?.chrmoLeaveInChargeSignatory ||
    app?.chrmo_leave_in_charge_signatory ||
    app?.chrmoLeaveInCharge ||
    app?.chrmo_leave_in_charge ||
    {}

  const fallbackName =
    normalizeText(app?.chrmoLeaveInChargeName || app?.chrmo_leave_in_charge_name) || ''

  return {
    fullName: buildFullName(candidate) || fallbackName,
    designation:
      normalizeText(candidate?.designation || candidate?.position || app?.chrmoLeaveInChargePosition) ||
      'CHRMO Leave In-charge',
  }
}

export function getRecommendationSignatory(app) {
  return isDepartmentHeadApplicant(app)
    ? getCityAdministratorSignature(app)
    : getDepartmentHeadSignature(app)
}

export async function enrichAppWithDepartmentHead(app) {
  if (!app) return app
  const hasDepartmentHead = Boolean(app.departmentHead || app.department_head)
  const hasCityAdministrator = Boolean(
    app.cityAdministrator ||
      app.city_administrator ||
      app.cityAdministratorSignatory ||
      app.city_administrator_signatory ||
      app.cityAdministratorName ||
      app.city_administrator_name,
  )
  const hasCityMayor = Boolean(
    app.cityMayor ||
      app.city_mayor ||
      app.cityMayorSignatory ||
      app.city_mayor_signatory ||
      app.cityMayorName ||
      app.city_mayor_name,
  )
  const hasCityViceMayor = Boolean(
    app.cityViceMayor ||
      app.city_vice_mayor ||
      app.cityViceMayorSignatory ||
      app.city_vice_mayor_signatory ||
      app.cityViceMayorName ||
      app.city_vice_mayor_name,
  )
  const hasChrmoLeaveInCharge = Boolean(
    app.chrmoLeaveInChargeSignatory ||
      app.chrmo_leave_in_charge_signatory ||
      app.chrmoLeaveInCharge ||
      app.chrmo_leave_in_charge ||
      app.chrmoLeaveInChargeName ||
      app.chrmo_leave_in_charge_name,
  )
  if (hasDepartmentHead && hasCityAdministrator && hasCityMayor && hasCityViceMayor && hasChrmoLeaveInCharge) return app

  let nextApp = app

  if (!hasDepartmentHead) {
    const departmentId = app?.department_id ?? app?.departmentId ?? app?.department?.id ?? null
    const departmentName = normalizeText(app?.office || app?.department_name || app?.department?.name)

    try {
      const params = {}
      if (departmentId) params.department_id = departmentId
      if (departmentName) params.department_name = departmentName
      const requestConfig = Object.keys(params).length ? { params } : undefined
      const { data } = await api.get('/admin/department-head', requestConfig)
      const departmentHead = data?.department_head

      if (departmentHead) {
        nextApp = {
          ...nextApp,
          departmentHead,
        }
      }
    } catch {
      // Ignore lookup errors and keep existing app payload.
    }
  }

  if (!hasCityAdministrator) {
    try {
      const { data } = await api.get('/city-administrator')
      const cityAdministrator = data?.city_administrator
      if (cityAdministrator) {
        nextApp = {
          ...nextApp,
          cityAdministrator,
        }
      }
    } catch {
      // Ignore lookup errors and keep existing app payload.
    }
  }

  if (!hasCityMayor) {
    try {
      const { data } = await api.get('/city-mayor')
      const cityMayor = data?.city_mayor
      if (cityMayor) {
        nextApp = {
          ...nextApp,
          cityMayor,
        }
      }
    } catch {
      // Ignore lookup errors and keep existing app payload.
    }
  }

  if (!hasCityViceMayor) {
    try {
      const { data } = await api.get('/city-vice-mayor')
      const cityViceMayor = data?.city_vice_mayor
      if (cityViceMayor) {
        nextApp = {
          ...nextApp,
          cityViceMayor,
        }
      }
    } catch {
      // Ignore lookup errors and keep existing app payload.
    }
  }

  if (!hasChrmoLeaveInCharge) {
    try {
      const { data } = await api.get('/settings/signatories')
      const chrmoLeaveInCharge = data?.signatories?.chrmo_leave_in_charge
      if (chrmoLeaveInCharge) {
        nextApp = {
          ...nextApp,
          chrmoLeaveInChargeSignatory: chrmoLeaveInCharge,
        }
      }
    } catch {
      // Ignore lookup errors and keep existing app payload.
    }
  }

  return nextApp
}
