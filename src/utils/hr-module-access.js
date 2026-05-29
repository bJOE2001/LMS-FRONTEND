export const HR_MODULE_KEYS = Object.freeze({
  dashboard: 'dashboard',
  applications: 'applications',
  cocApplications: 'coc_applications',
  employeeManagement: 'employee_management',
  userManagement: 'user_management',
  reportsMonitoring: 'reports_monitoring',
  leaveTypes: 'leave_types',
  officeLibrary: 'office_library',
  illnessLibrary: 'illness_library',
  workSchedules: 'work_schedules',
  signatories: 'signatories',
  accessControl: 'access_control',
})

const HR_MODULE_ROUTE_REQUIREMENTS = [
  { prefix: '/hr/access-control', moduleKey: HR_MODULE_KEYS.accessControl },
  { prefix: '/hr/user-management', moduleKey: HR_MODULE_KEYS.userManagement },
  { prefix: '/hr/coc-applications', moduleKey: HR_MODULE_KEYS.cocApplications },
  { prefix: '/hr/applications', moduleKey: HR_MODULE_KEYS.applications },
  { prefix: '/hr/employees', moduleKey: HR_MODULE_KEYS.employeeManagement },
  { prefix: '/hr/reports', moduleKey: HR_MODULE_KEYS.reportsMonitoring },
  { prefix: '/hr/analytics', moduleKey: HR_MODULE_KEYS.reportsMonitoring },
  { prefix: '/hr/work-schedules', moduleKey: HR_MODULE_KEYS.workSchedules },
  { prefix: '/hr/leave-types', moduleKey: HR_MODULE_KEYS.leaveTypes },
  { prefix: '/hr/departments-library', moduleKey: HR_MODULE_KEYS.officeLibrary },
  { prefix: '/hr/illness-library', moduleKey: HR_MODULE_KEYS.illnessLibrary },
  { prefix: '/hr/signatories', moduleKey: HR_MODULE_KEYS.signatories },
  { prefix: '/hr/dashboard', moduleKey: HR_MODULE_KEYS.dashboard },
]

const HR_MODULE_NAV_PRIORITY = [
  { moduleKey: HR_MODULE_KEYS.dashboard, path: '/hr/dashboard' },
  { moduleKey: HR_MODULE_KEYS.applications, path: '/hr/applications' },
  { moduleKey: HR_MODULE_KEYS.cocApplications, path: '/hr/coc-applications' },
  { moduleKey: HR_MODULE_KEYS.employeeManagement, path: '/hr/employees' },
  { moduleKey: HR_MODULE_KEYS.userManagement, path: '/hr/user-management' },
  { moduleKey: HR_MODULE_KEYS.reportsMonitoring, path: '/hr/reports' },
  { moduleKey: HR_MODULE_KEYS.accessControl, path: '/hr/access-control' },
  { moduleKey: HR_MODULE_KEYS.leaveTypes, path: '/hr/leave-types' },
  { moduleKey: HR_MODULE_KEYS.officeLibrary, path: '/hr/departments-library' },
  { moduleKey: HR_MODULE_KEYS.illnessLibrary, path: '/hr/illness-library' },
  { moduleKey: HR_MODULE_KEYS.workSchedules, path: '/hr/work-schedules' },
  { moduleKey: HR_MODULE_KEYS.signatories, path: '/hr/signatories' },
]

export function resolveRequiredHrModuleForPath(path) {
  const normalizedPath = String(path || '').trim()
  for (const requirement of HR_MODULE_ROUTE_REQUIREMENTS) {
    if (normalizedPath === requirement.prefix || normalizedPath.startsWith(`${requirement.prefix}/`)) {
      return requirement.moduleKey
    }
  }

  return null
}

export function hrUserHasModuleAccess(user, moduleKey) {
  if (!user || user.role !== 'hr' || !moduleKey) return false
  if (user.is_access_control_owner) return true

  const grantedModuleKeys = Array.isArray(user.hr_module_access)
    ? user.hr_module_access
        .map((value) => String(value || '').trim())
        .filter((value) => value !== '')
    : null

  // Backward compatible fallback for sessions created before module access payload existed.
  if (grantedModuleKeys === null) return true

  return grantedModuleKeys.includes(moduleKey)
}

export function resolveFirstAccessibleHrRoute(user) {
  if (!user || user.role !== 'hr') return '/login'

  for (const entry of HR_MODULE_NAV_PRIORITY) {
    if (hrUserHasModuleAccess(user, entry.moduleKey)) {
      return entry.path
    }
  }

  return '/settings'
}
