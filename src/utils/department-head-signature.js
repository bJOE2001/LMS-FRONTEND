import { api } from 'src/boot/axios'

function normalizeText(value) {
  return String(value || '').trim()
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

export async function enrichAppWithDepartmentHead(app) {
  if (!app) return app
  if (app.departmentHead || app.department_head) return app

  const departmentId = app?.department_id ?? app?.departmentId ?? app?.department?.id ?? null
  const departmentName = normalizeText(app?.office || app?.department_name || app?.department?.name)

  try {
    const params = {}
    if (departmentId) params.department_id = departmentId
    if (departmentName) params.department_name = departmentName
    const requestConfig = Object.keys(params).length ? { params } : undefined
    const { data } = await api.get('/admin/department-head', requestConfig)
    const departmentHead = data?.department_head

    if (!departmentHead) return app

    return {
      ...app,
      departmentHead,
    }
  } catch {
    return app
  }
}
