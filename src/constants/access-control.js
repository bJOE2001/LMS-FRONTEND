export const LEDGER_SUB_PERMISSIONS = Object.freeze([
  'ledger_restore_edit',
  'ledger_restore_delete',
  'ledger_late_deduction_edit',
  'ledger_late_deduction_delete',
  'ledger_accrual_edit',
])

export const SENSITIVE_MODULE_KEYS = Object.freeze([
  'access_control',
  'user_management',
  'ledger_restore_delete',
  'ledger_late_deduction_delete',
])

export const MODULE_CATEGORIES = [
  {
    id: 'overview',
    label: 'Overview & Analytics',
    icon: 'dashboard',
    color: 'teal-7',
    accent: '#0f766e',
    keys: ['dashboard'],
  },
  {
    id: 'leave',
    label: 'Leave Management Workflow',
    icon: 'assignment',
    color: 'primary',
    accent: '#2e7d32',
    keys: ['applications', 'receiving', 'releasing', 'cancelled_applications', 'coc_applications'],
  },
  {
    id: 'employee_ledger',
    label: 'Employee & Leave Ledger Controls',
    icon: 'people_alt',
    color: 'indigo-7',
    accent: '#4338ca',
    mainKey: 'employee_management',
    subKeys: [...LEDGER_SUB_PERMISSIONS],
  },
  {
    id: 'admin',
    label: 'System Administration',
    icon: 'admin_panel_settings',
    color: 'deep-purple-7',
    accent: '#6d28d9',
    keys: ['user_management', 'reports_monitoring', 'access_control'],
  },
  {
    id: 'libraries',
    label: 'Libraries & Scheduling Settings',
    icon: 'tune',
    color: 'amber-9',
    accent: '#b45309',
    keys: ['office_library', 'leave_types', 'illness_library', 'work_schedules', 'signatories'],
  },
]

export const MODULE_ICONS = {
  dashboard: 'space_dashboard',
  applications: 'description',
  receiving: 'move_to_inbox',
  releasing: 'outbox',
  cancelled_applications: 'cancel',
  coc_applications: 'schedule',
  employee_management: 'badge',
  ledger_restore_edit: 'edit_note',
  ledger_restore_delete: 'delete_sweep',
  ledger_late_deduction_edit: 'schedule_send',
  ledger_late_deduction_delete: 'remove_done',
  ledger_accrual_edit: 'trending_up',
  user_management: 'manage_accounts',
  reports_monitoring: 'insights',
  access_control: 'security',
  office_library: 'apartment',
  leave_types: 'category',
  illness_library: 'medical_services',
  work_schedules: 'event_repeat',
  signatories: 'draw',
}

export const MODULE_DESCRIPTIONS = {
  dashboard: 'Access HR analytics dashboard overview, trends, and calendar.',
  applications: 'Review, act on, and manage employee leave applications.',
  receiving: 'Receive and log incoming application routing documents.',
  releasing: 'Approve and release processed leave records.',
  cancelled_applications: 'Review and manage cancelled or revoked filings.',
  coc_applications: 'Manage Certificate of Overtime Credit (COC) requests.',
  employee_management: 'Employee profiles, records directory, attendance logs, and DTR.',
  ledger_restore_edit: 'Edit restored leave credit entries in employee ledger.',
  ledger_restore_delete: 'Delete restored leave credit entries in employee ledger.',
  ledger_late_deduction_edit: 'Adjust late arrival leave credit deductions.',
  ledger_late_deduction_delete: 'Remove late deduction entries from employee ledger.',
  ledger_accrual_edit: 'Manually edit monthly earned leave credit accrual rows.',
  user_management: 'Manage user accounts, roles, and password credentials.',
  reports_monitoring: 'Generate analytical reports, summaries, and data exports.',
  access_control: 'Manage HR administrator module permissions and privileges.',
  office_library: 'Maintain city departments, divisions, and office units.',
  leave_types: 'Configure leave classifications and credit policies.',
  illness_library: 'Manage medical condition and illness classifications.',
  work_schedules: 'Configure official shift hours and schedules.',
  signatories: 'Configure department heads and official approving signatories.',
}

export const ROLE_PRESETS = [
  {
    id: 'full_access',
    label: 'Full Access',
    icon: 'verified_user',
    tooltip: 'Grant every HR module and ledger permission',
    keys: null,
  },
  {
    id: 'leave_specialist',
    label: 'Leave Specialist',
    icon: 'assignment_turned_in',
    tooltip: 'Core leave processing, receiving, releasing, and reports',
    keys: [
      'dashboard',
      'applications',
      'receiving',
      'releasing',
      'cancelled_applications',
      'coc_applications',
      'reports_monitoring',
    ],
  },
  {
    id: 'employee_ledger',
    label: 'Employee & Ledger',
    icon: 'badge',
    tooltip: 'Employee directory, DTR, and all leave ledger controls',
    keys: [
      'dashboard',
      'employee_management',
      'ledger_restore_edit',
      'ledger_restore_delete',
      'ledger_late_deduction_edit',
      'ledger_late_deduction_delete',
      'ledger_accrual_edit',
      'reports_monitoring',
    ],
  },
]

export function getCategoryAllKeys(category) {
  if (!category) return []
  if (Array.isArray(category.keys)) return category.keys
  if (category.mainKey) return [category.mainKey, ...(category.subKeys || [])]
  return []
}

export function buildCategorizedModules(allModuleKeys = []) {
  const known = new Set()
  for (const category of MODULE_CATEGORIES) {
    for (const key of getCategoryAllKeys(category)) {
      known.add(key)
    }
  }

  const uncategorized = allModuleKeys.filter((key) => !known.has(key))
  if (uncategorized.length === 0) {
    return MODULE_CATEGORIES
  }

  return [
    ...MODULE_CATEGORIES,
    {
      id: 'other',
      label: 'Additional Modules',
      icon: 'extension',
      color: 'grey-7',
      accent: '#475569',
      keys: uncategorized,
    },
  ]
}
