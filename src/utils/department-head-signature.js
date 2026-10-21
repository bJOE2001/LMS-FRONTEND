import { api } from 'src/boot/axios'
import { isLegislativeDepartmentHeadApplicant } from './signatory-rules/applicant-role-utils'

function normalizeText(value) {
  return String(value || '').trim()
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
  return Boolean(app?.is_department_head || app?.isDepartmentHead)
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
  if (isDepartmentHeadApplicant(app)) {
    return isLegislativeDepartmentHeadApplicant(app)
      ? getCityViceMayorSignature(app)
      : getCityAdministratorSignature(app)
  }
  return getDepartmentHeadSignature(app)
}

let cachedCityAdmin = null
let cachedCityMayor = null
let cachedCityViceMayor = null
let cachedChrmoLeaveInCharge = null
const cachedDeptHeads = new Map()

export async function enrichAppWithDepartmentHead(app) {
  if (!app) return app

  let nextApp = app

  // 1. Department Head (check memory cache first)
  let hasDepartmentHead = Boolean(nextApp.departmentHead || nextApp.department_head)
  const departmentId = nextApp?.department_id ?? nextApp?.departmentId ?? nextApp?.department?.id ?? null
  const departmentName = normalizeText(nextApp?.office || nextApp?.department_name || nextApp?.department?.name)
  const deptKey = String(departmentId || departmentName || '').toLowerCase().trim()

  if (!hasDepartmentHead && deptKey && cachedDeptHeads.has(deptKey)) {
    const head = cachedDeptHeads.get(deptKey)
    if (head) {
      nextApp = { ...nextApp, departmentHead: head }
      hasDepartmentHead = true
    }
  }

  // 2. City Administrator (check memory cache first)
  let hasCityAdministrator = Boolean(
    nextApp.cityAdministrator ||
      nextApp.city_administrator ||
      nextApp.cityAdministratorSignatory ||
      nextApp.city_administrator_signatory ||
      nextApp.cityAdministratorName ||
      nextApp.city_administrator_name,
  )
  if (!hasCityAdministrator && cachedCityAdmin) {
    nextApp = { ...nextApp, cityAdministrator: cachedCityAdmin }
    hasCityAdministrator = true
  }

  // 3. City Mayor (check memory cache first)
  let hasCityMayor = Boolean(
    nextApp.cityMayor ||
      nextApp.city_mayor ||
      nextApp.cityMayorSignatory ||
      nextApp.city_mayor_signatory ||
      nextApp.cityMayorName ||
      nextApp.city_mayor_name,
  )
  if (!hasCityMayor && cachedCityMayor) {
    nextApp = { ...nextApp, cityMayor: cachedCityMayor }
    hasCityMayor = true
  }

  // 4. City Vice Mayor (check memory cache first)
  let hasCityViceMayor = Boolean(
    nextApp.cityViceMayor ||
      nextApp.city_vice_mayor ||
      nextApp.cityViceMayorSignatory ||
      nextApp.city_vice_mayor_signatory ||
      nextApp.cityViceMayorName ||
      nextApp.city_vice_mayor_name,
  )
  if (!hasCityViceMayor && cachedCityViceMayor) {
    nextApp = { ...nextApp, cityViceMayor: cachedCityViceMayor }
    hasCityViceMayor = true
  }

  // 5. CHRMO Leave In-charge (check memory cache first)
  let hasChrmoLeaveInCharge = Boolean(
    nextApp.chrmoLeaveInChargeSignatory ||
      nextApp.chrmo_leave_in_charge_signatory ||
      nextApp.chrmoLeaveInCharge ||
      nextApp.chrmo_leave_in_charge ||
      nextApp.chrmoLeaveInChargeName ||
      nextApp.chrmo_leave_in_charge_name,
  )
  if (!hasChrmoLeaveInCharge && cachedChrmoLeaveInCharge) {
    nextApp = { ...nextApp, chrmoLeaveInChargeSignatory: cachedChrmoLeaveInCharge }
    hasChrmoLeaveInCharge = true
  }

  // Check what still needs to be fetched
  const needsDeptHead = !hasDepartmentHead && Boolean(deptKey)
  const needsCityAdmin = !hasCityAdministrator
  const needsCityMayor = !hasCityMayor
  const needsCityViceMayor = !hasCityViceMayor
  const needsChrmo = !hasChrmoLeaveInCharge

  if (!needsDeptHead && !needsCityAdmin && !needsCityMayor && !needsCityViceMayor && !needsChrmo) {
    return nextApp
  }

  // Fetch missing signatories concurrently in parallel
  const tasks = []

  if (needsDeptHead) {
    const params = {}
    if (departmentId) params.department_id = departmentId
    if (departmentName) params.department_name = departmentName
    const requestConfig = Object.keys(params).length ? { params } : undefined
    tasks.push(
      api
        .get('/admin/department-head', requestConfig)
        .then(({ data }) => {
          const departmentHead = data?.department_head
          if (departmentHead) {
            cachedDeptHeads.set(deptKey, departmentHead)
            return { type: 'deptHead', val: departmentHead }
          }
          return null
        })
        .catch(() => null),
    )
  }

  if (needsCityAdmin) {
    tasks.push(
      api
        .get('/city-administrator')
        .then(({ data }) => {
          const cityAdministrator = data?.city_administrator
          if (cityAdministrator) {
            cachedCityAdmin = cityAdministrator
            return { type: 'cityAdmin', val: cityAdministrator }
          }
          return null
        })
        .catch(() => null),
    )
  }

  if (needsCityMayor) {
    tasks.push(
      api
        .get('/city-mayor')
        .then(({ data }) => {
          const cityMayor = data?.city_mayor
          if (cityMayor) {
            cachedCityMayor = cityMayor
            return { type: 'cityMayor', val: cityMayor }
          }
          return null
        })
        .catch(() => null),
    )
  }

  if (needsCityViceMayor) {
    tasks.push(
      api
        .get('/city-vice-mayor')
        .then(({ data }) => {
          const cityViceMayor = data?.city_vice_mayor
          if (cityViceMayor) {
            cachedCityViceMayor = cityViceMayor
            return { type: 'cityViceMayor', val: cityViceMayor }
          }
          return null
        })
        .catch(() => null),
    )
  }

  if (needsChrmo) {
    tasks.push(
      api
        .get('/settings/signatories')
        .then(({ data }) => {
          const chrmoLeaveInCharge = data?.signatories?.chrmo_leave_in_charge
          if (chrmoLeaveInCharge) {
            cachedChrmoLeaveInCharge = chrmoLeaveInCharge
            return { type: 'chrmo', val: chrmoLeaveInCharge }
          }
          return null
        })
        .catch(() => null),
    )
  }

  const results = await Promise.all(tasks)

  for (const item of results) {
    if (!item || !item.val) continue
    if (item.type === 'deptHead') {
      nextApp = { ...nextApp, departmentHead: item.val }
    } else if (item.type === 'cityAdmin') {
      nextApp = { ...nextApp, cityAdministrator: item.val }
    } else if (item.type === 'cityMayor') {
      nextApp = { ...nextApp, cityMayor: item.val }
    } else if (item.type === 'cityViceMayor') {
      nextApp = { ...nextApp, cityViceMayor: item.val }
    } else if (item.type === 'chrmo') {
      nextApp = { ...nextApp, chrmoLeaveInChargeSignatory: item.val }
    }
  }

  return nextApp
}
