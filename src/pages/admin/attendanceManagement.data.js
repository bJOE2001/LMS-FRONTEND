import { reactive } from 'vue'

export const DEFAULT_LIST_START = '2026-04-01'
export const DEFAULT_LIST_END = '2026-04-30'
export const DEFAULT_DETAIL_START = '2026-04-22'
export const DEFAULT_DETAIL_END = '2026-04-28'
export const CURRENT_ENROLLMENT_DATE = '2026-04-28'

export const ALL_DEPARTMENTS = 'All Departments'
export const ALL_ATTENDANCE_STATUSES = 'All Statuses'
export const ALL_BIOMETRIC_STATUSES = 'All Biometric States'

export const biometricDevices = [
  {
    id: 'bio-scan-a1',
    name: 'BioScan A1 Fingerprint Terminal',
    location: 'Admin Lobby',
    methods: ['Fingerprint'],
    online: true,
  },
  {
    id: 'faceguard-x2',
    name: 'FaceGuard X2 Camera',
    location: 'Main Entrance Turnstile',
    methods: ['Face Scan'],
    online: true,
  },
  {
    id: 'rfid-hub-03',
    name: 'RFID Hub 03',
    location: 'Operations Gate',
    methods: ['RFID/Card'],
    online: false,
  },
]

function activityLog({ label, time, device, verification, note = '' }) {
  return {
    label,
    time,
    device,
    verification,
    note,
  }
}

function formatHours(value) {
  const hours = Number(value || 0)
  if (!hours) return '0h'
  return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)}h`
}

function presentLog({
  date,
  checkIn = '8:00 AM',
  checkOut = '5:00 PM',
  breakStart = '12:00 PM',
  breakEnd = '1:00 PM',
  totalHours = 8,
  regularHours = 8,
  overtimeHours = 0,
  lateMinutes = 0,
  deviceName = 'BioScan A1 Fingerprint Terminal',
  approvalStatus = 'Approved',
  approver = 'Attendance Admin',
  extraLogs = [],
}) {
  const isLate = lateMinutes > 0

  return {
    date,
    status: isLate ? 'Late' : 'Present',
    schedule: '8:00 AM - 5:00 PM',
    expectedCheckIn: '8:00 AM',
    expectedCheckOut: '5:00 PM',
    checkIn,
    checkOut,
    breakStart,
    breakEnd,
    breakMinutes: 60,
    breakLabel: `${breakStart} - ${breakEnd}`,
    totalHours,
    regularHours,
    overtimeHours,
    overtimeLabel: overtimeHours ? `${formatHours(overtimeHours)} OT` : '',
    lateMinutes,
    absenceHours: 0,
    leaveHours: 0,
    deviceName,
    approvalStatus,
    approver,
    logs: [
      activityLog({
        label: 'Check-in',
        time: checkIn,
        device: deviceName,
        verification: isLate ? 'Verified - Late' : 'Verified',
      }),
      activityLog({
        label: 'Break Out',
        time: breakStart,
        device: deviceName,
        verification: 'Verified',
      }),
      activityLog({
        label: 'Break In',
        time: breakEnd,
        device: deviceName,
        verification: 'Verified',
      }),
      activityLog({
        label: 'Check-out',
        time: checkOut,
        device: deviceName,
        verification: overtimeHours ? 'Verified - Overtime' : 'Verified',
      }),
      ...extraLogs,
    ],
  }
}

function absentLog({
  date,
  reason = 'No biometric capture was recorded for the scheduled shift.',
  approvalStatus = 'Pending Review',
  approver = 'Needs supervisor review',
}) {
  return {
    date,
    status: 'Absent',
    schedule: '8:00 AM - 5:00 PM',
    expectedCheckIn: '8:00 AM',
    expectedCheckOut: '5:00 PM',
    checkIn: '-',
    checkOut: '-',
    breakStart: '-',
    breakEnd: '-',
    breakMinutes: 0,
    breakLabel: 'No break record',
    totalHours: 0,
    regularHours: 0,
    overtimeHours: 0,
    overtimeLabel: '',
    lateMinutes: 0,
    absenceHours: 8,
    leaveHours: 0,
    deviceName: 'Attendance Engine',
    approvalStatus,
    approver,
    logs: [
      activityLog({
        label: 'Missed Shift',
        time: 'No scan',
        device: 'Attendance Engine',
        verification: 'Failed',
        note: reason,
      }),
    ],
  }
}

function leaveLog({ date, leaveLabel = 'Vacation Leave', approver = 'HR Approved' }) {
  return {
    date,
    status: 'On Leave',
    schedule: 'Leave Day',
    expectedCheckIn: '-',
    expectedCheckOut: '-',
    checkIn: '-',
    checkOut: '-',
    breakStart: '-',
    breakEnd: '-',
    breakMinutes: 0,
    breakLabel: 'Approved leave',
    totalHours: 0,
    regularHours: 0,
    overtimeHours: 0,
    overtimeLabel: '',
    lateMinutes: 0,
    absenceHours: 0,
    leaveHours: 8,
    deviceName: 'HR Leave Module',
    approvalStatus: 'Approved',
    approver,
    logs: [
      activityLog({
        label: leaveLabel,
        time: 'Whole day',
        device: 'HR Leave Module',
        verification: 'Approved',
        note: 'Attendance linked to an approved leave application.',
      }),
    ],
  }
}

export const attendanceEmployees = reactive([
  {
    id: 'EMP-1001',
    fullName: 'Maria Santos',
    avatar: 'MS',
    avatarColor: 'green-8',
    department: 'Human Resources',
    position: 'HR Officer III',
    employmentType: 'Regular',
    biometric: {
      status: 'Enrolled',
      method: 'Fingerprint',
      lastEnrollmentDate: '2026-03-18',
      deviceName: 'BioScan A1 Fingerprint Terminal',
    },
    attendanceLogs: [
      presentLog({
        date: '2026-04-22',
        checkIn: '7:56 AM',
        checkOut: '5:08 PM',
        totalHours: 8.2,
        overtimeHours: 0.2,
      }),
      presentLog({ date: '2026-04-23', checkIn: '8:02 AM', checkOut: '5:04 PM', totalHours: 8.0 }),
      presentLog({
        date: '2026-04-24',
        checkIn: '8:14 AM',
        checkOut: '5:17 PM',
        totalHours: 8.1,
        lateMinutes: 14,
        overtimeHours: 0.3,
      }),
      presentLog({ date: '2026-04-27', checkIn: '7:58 AM', checkOut: '5:06 PM', totalHours: 8.1 }),
      presentLog({
        date: '2026-04-28',
        checkIn: '7:54 AM',
        checkOut: '5:22 PM',
        totalHours: 8.4,
        overtimeHours: 0.4,
      }),
    ],
  },
  {
    id: 'EMP-1002',
    fullName: 'Daniel Cruz',
    avatar: 'DC',
    avatarColor: 'secondary',
    department: 'Information Technology',
    position: 'Systems Administrator',
    employmentType: 'Regular',
    biometric: {
      status: 'Enrolled',
      method: 'Face Scan',
      lastEnrollmentDate: '2026-02-10',
      deviceName: 'FaceGuard X2 Camera',
    },
    attendanceLogs: [
      presentLog({
        date: '2026-04-22',
        checkIn: '8:18 AM',
        checkOut: '5:35 PM',
        totalHours: 8.3,
        lateMinutes: 18,
        overtimeHours: 0.5,
        deviceName: 'FaceGuard X2 Camera',
      }),
      presentLog({
        date: '2026-04-23',
        checkIn: '7:59 AM',
        checkOut: '5:11 PM',
        totalHours: 8.2,
        deviceName: 'FaceGuard X2 Camera',
      }),
      presentLog({
        date: '2026-04-24',
        checkIn: '8:01 AM',
        checkOut: '5:41 PM',
        totalHours: 8.6,
        overtimeHours: 0.6,
        deviceName: 'FaceGuard X2 Camera',
      }),
      presentLog({
        date: '2026-04-27',
        checkIn: '8:03 AM',
        checkOut: '5:09 PM',
        totalHours: 8.1,
        deviceName: 'FaceGuard X2 Camera',
      }),
      presentLog({
        date: '2026-04-28',
        checkIn: '8:00 AM',
        checkOut: '5:12 PM',
        totalHours: 8.2,
        deviceName: 'FaceGuard X2 Camera',
      }),
    ],
  },
  {
    id: 'EMP-1003',
    fullName: 'Carla Mendoza',
    avatar: 'CM',
    avatarColor: 'orange-8',
    department: 'Finance',
    position: 'Budget Analyst II',
    employmentType: 'Regular',
    biometric: {
      status: 'Pending',
      method: 'Fingerprint',
      lastEnrollmentDate: '2026-01-27',
      deviceName: 'BioScan A1 Fingerprint Terminal',
    },
    attendanceLogs: [
      absentLog({ date: '2026-04-22' }),
      presentLog({ date: '2026-04-23', checkIn: '7:57 AM', checkOut: '5:03 PM', totalHours: 8.0 }),
      leaveLog({ date: '2026-04-24', leaveLabel: 'Sick Leave' }),
      presentLog({
        date: '2026-04-27',
        checkIn: '8:05 AM',
        checkOut: '5:00 PM',
        totalHours: 7.9,
        lateMinutes: 5,
      }),
      presentLog({
        date: '2026-04-28',
        checkIn: '8:12 AM',
        checkOut: '5:07 PM',
        totalHours: 8.0,
        lateMinutes: 12,
      }),
    ],
  },
  {
    id: 'EMP-1004',
    fullName: 'Joshua Reyes',
    avatar: 'JR',
    avatarColor: 'deep-orange-7',
    department: 'Operations',
    position: 'Operations Supervisor',
    employmentType: 'Contractual',
    biometric: {
      status: 'Not Enrolled',
      method: 'RFID/Card',
      lastEnrollmentDate: '',
      deviceName: '',
    },
    attendanceLogs: [
      presentLog({
        date: '2026-04-22',
        checkIn: '7:50 AM',
        checkOut: '5:24 PM',
        totalHours: 8.6,
        overtimeHours: 0.6,
        extraLogs: [
          activityLog({
            label: 'Manual Override',
            time: '7:52 AM',
            device: 'Admin Console',
            verification: 'Manual Override',
            note: 'Updated after failed card tap during gate maintenance.',
          }),
        ],
      }),
      presentLog({ date: '2026-04-23', checkIn: '7:58 AM', checkOut: '5:09 PM', totalHours: 8.1 }),
      absentLog({
        date: '2026-04-24',
        reason: 'RFID badge not yet enrolled in the biometric system.',
      }),
      presentLog({
        date: '2026-04-27',
        checkIn: '8:04 AM',
        checkOut: '5:18 PM',
        totalHours: 8.2,
        lateMinutes: 4,
      }),
      presentLog({
        date: '2026-04-28',
        checkIn: '7:57 AM',
        checkOut: '5:21 PM',
        totalHours: 8.4,
        overtimeHours: 0.4,
      }),
    ],
  },
  {
    id: 'EMP-1005',
    fullName: 'Elaine Flores',
    avatar: 'EF',
    avatarColor: 'purple-6',
    department: 'Registrar',
    position: 'Records Officer',
    employmentType: 'Regular',
    biometric: {
      status: 'Failed',
      method: 'Face Scan',
      lastEnrollmentDate: '2026-04-12',
      deviceName: 'FaceGuard X2 Camera',
    },
    attendanceLogs: [
      presentLog({
        date: '2026-04-22',
        checkIn: '8:21 AM',
        checkOut: '5:02 PM',
        totalHours: 7.7,
        lateMinutes: 21,
        deviceName: 'FaceGuard X2 Camera',
        extraLogs: [
          activityLog({
            label: 'Face Scan Retry',
            time: '8:18 AM',
            device: 'FaceGuard X2 Camera',
            verification: 'Failed Scan',
            note: 'Low light caused a verification mismatch before the successful scan.',
          }),
        ],
      }),
      presentLog({
        date: '2026-04-23',
        checkIn: '7:59 AM',
        checkOut: '5:00 PM',
        totalHours: 8.0,
        deviceName: 'FaceGuard X2 Camera',
      }),
      presentLog({
        date: '2026-04-24',
        checkIn: '8:04 AM',
        checkOut: '5:01 PM',
        totalHours: 7.9,
        lateMinutes: 4,
        deviceName: 'FaceGuard X2 Camera',
      }),
      leaveLog({ date: '2026-04-27', leaveLabel: 'Personal Leave' }),
      presentLog({
        date: '2026-04-28',
        checkIn: '8:06 AM',
        checkOut: '5:14 PM',
        totalHours: 8.1,
        lateMinutes: 6,
        deviceName: 'FaceGuard X2 Camera',
      }),
    ],
  },
  {
    id: 'EMP-1006',
    fullName: 'Victor Ramos',
    avatar: 'VR',
    avatarColor: 'blue-7',
    department: 'Security',
    position: 'Security Team Lead',
    employmentType: 'Regular',
    biometric: {
      status: 'Enrolled',
      method: 'RFID/Card',
      lastEnrollmentDate: '2026-03-02',
      deviceName: 'RFID Hub 03',
    },
    attendanceLogs: [
      presentLog({
        date: '2026-04-22',
        checkIn: '7:48 AM',
        checkOut: '5:36 PM',
        totalHours: 8.8,
        overtimeHours: 0.8,
        deviceName: 'RFID Hub 03',
      }),
      presentLog({
        date: '2026-04-23',
        checkIn: '7:54 AM',
        checkOut: '5:08 PM',
        totalHours: 8.2,
        deviceName: 'RFID Hub 03',
      }),
      presentLog({
        date: '2026-04-24',
        checkIn: '7:56 AM',
        checkOut: '5:12 PM',
        totalHours: 8.3,
        deviceName: 'RFID Hub 03',
      }),
      presentLog({
        date: '2026-04-27',
        checkIn: '8:17 AM',
        checkOut: '5:34 PM',
        totalHours: 8.3,
        lateMinutes: 17,
        overtimeHours: 0.5,
        deviceName: 'RFID Hub 03',
      }),
      presentLog({
        date: '2026-04-28',
        checkIn: '7:53 AM',
        checkOut: '5:26 PM',
        totalHours: 8.5,
        overtimeHours: 0.5,
        deviceName: 'RFID Hub 03',
      }),
    ],
  },
])

export function normalizeRange(start, end) {
  if (!start && !end) return { start: '', end: '' }
  if (!start) return { start: end, end }
  if (!end) return { start, end: start }
  return start <= end ? { start, end } : { start: end, end: start }
}

export function getLogsWithinRange(logs, range) {
  return logs.filter((log) => {
    if (range.start && log.date < range.start) return false
    if (range.end && log.date > range.end) return false
    return true
  })
}

export function summarizeAttendance(logs) {
  return logs.reduce(
    (summary, log) => {
      if (log.status === 'Present' || log.status === 'Late') {
        summary.presentDays += 1
      }
      if (log.status === 'Present') {
        summary.onTimePresentDays += 1
      }
      if (log.status === 'Absent') {
        summary.absentDays += 1
      }
      if (log.status === 'Late') {
        summary.lateCount += 1
      }
      if (log.status === 'On Leave') {
        summary.leaveDays += 1
      }

      summary.totalHours += Number(log.totalHours || 0)
      summary.regularHours += Number(log.regularHours || 0)
      summary.overtimeHours += Number(log.overtimeHours || 0)
      summary.lateHours += Number(log.lateMinutes || 0) / 60

      return summary
    },
    {
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      lateHours: 0,
      presentDays: 0,
      onTimePresentDays: 0,
      absentDays: 0,
      lateCount: 0,
      leaveDays: 0,
    },
  )
}

export function getLatestLog(logs) {
  return [...logs].sort((left, right) => right.date.localeCompare(left.date))[0] || null
}

export function matchesSearch(employee, query) {
  const normalizedQuery = String(query || '')
    .trim()
    .toLowerCase()
  if (!normalizedQuery) return true

  return [employee.id, employee.fullName, employee.department, employee.position]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery)
}

export function statusMeta(status) {
  const normalized = String(status || '')
    .trim()
    .toLowerCase()

  const mapping = {
    enrolled: { color: 'positive', textColor: 'white' },
    'not enrolled': { color: 'grey-6', textColor: 'white' },
    pending: { color: 'warning', textColor: 'black' },
    failed: { color: 'negative', textColor: 'white' },
    present: { color: 'positive', textColor: 'white' },
    absent: { color: 'negative', textColor: 'white' },
    late: { color: 'warning', textColor: 'black' },
    'on leave': { color: 'info', textColor: 'white' },
    approved: { color: 'positive', textColor: 'white' },
    'pending review': { color: 'warning', textColor: 'black' },
    rejected: { color: 'negative', textColor: 'white' },
    'manual override': { color: 'deep-orange-7', textColor: 'white' },
  }

  return mapping[normalized] || { color: 'grey-7', textColor: 'white' }
}

export function formatDisplayDate(value) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

export function formatWeekday(value) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
  }).format(new Date(`${value}T12:00:00`))
}

export function formatDateRange(start, end) {
  if (!start && !end) return 'all dates'
  if (start === end) return formatDisplayDate(start)
  return `${formatDisplayDate(start)} to ${formatDisplayDate(end)}`
}

export function getAttendanceEmployeeById(employeeId) {
  return attendanceEmployees.find((employee) => employee.id === employeeId) || null
}

export { formatHours }
