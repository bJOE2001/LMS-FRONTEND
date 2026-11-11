const OFFICE_ACRONYM_DICTIONARY = {
  'OFFICE OF THE CITY HUMAN RESOURCE MANAGEMENT OFFICER': 'CHRMO',
  'OFFICE OF THE CITY INFORMATION AND COMMUNICATIONS TECHNOLOGY MANAGEMENT OFFICER': 'CICTMO',
  'CITY HUMAN RESOURCE MANAGEMENT OFFICE': 'CHRMO',
  'CITY INFORMATION AND COMMUNICATIONS TECHNOLOGY MANAGEMENT OFFICE': 'CICTMO',
  'OFFICE OF THE CITY MAYOR': 'CMO',
  'OFFICE OF THE CITY VICE MAYOR': 'CVMO',
  'OFFICE OF THE CITY VICE MAYOR / SANGGUNIANG PANLUNGSOD': 'CVMO',
  'OFFICE OF THE SANGGUNIANG PANLUNGSOD': 'SP',
  'OFFICE OF THE SECRETARY TO THE SANGGUNIAN': 'SP SECRETARIAT',
  'OFFICE OF THE CITY ADMINISTRATOR': 'CAO',
  'OFFICE OF THE CITY ACCOUNTANT': 'CACCO',
  'OFFICE OF THE CITY AGRICULTURIST': 'CAGRO',
  'OFFICE OF THE CITY ARCHITECT': 'CARCHO',
  'OFFICE OF THE CITY ASSESSOR': 'CASSO',
  'OFFICE OF THE CITY BUDGET OFFICER': 'CBO',
  'OFFICE OF THE CITY CIVIL REGISTRAR': 'CCRO',
  'OFFICE OF THE CITY DISASTER RISK REDUCTION AND MANAGEMENT OFFICER': 'CDRRMO',
  'OFFICE OF THE CITY ECONOMIC ENTERPRISES MANAGER': 'CEEO',
  'OFFICE OF THE CITY ENGINEER': 'CEO',
  'OFFICE OF THE CITY ENVIRONMENT AND NATURAL RESOURCES OFFICER': 'CENRO',
  'OFFICE OF THE CITY GENERAL SERVICES OFFICER': 'CGSO',
  'OFFICE OF THE CITY HEALTH OFFICER': 'CHO',
  'OFFICE OF THE CITY HOUSING AND LAND MANAGEMENT OFFICER': 'CHLMO',
  'OFFICE OF THE CITY LEGAL OFFICER': 'CLO',
  'OFFICE OF THE CITY PLANNING AND DEVELOPMENT COORDINATOR': 'CPDO',
  'OFFICE OF THE CITY PUBLIC EMPLOYMENT SERVICES AND CAPABILITY DEVELOPMENT OFFICER': 'CPESCDO',
  'OFFICE OF THE CITY SOCIAL WELFARE AND DEVELOPMENT OFFICER': 'CSWDO',
  'OFFICE OF THE CITY TOURISM, ARTS, CULTURE AND HERITAGE MANAGEMENT OFFICER': 'CTACHMO',
  'OFFICE OF THE CITY TREASURER': 'CTO',
  'OFFICE OF THE CITY VETERINARIAN': 'CVO',
  'TAGUM CITY TRADE SCHOOL': 'TCTS',
  'CITY PROSECUTOR OFFICE': 'CPO',
  'CITY TRIAL COURT': 'CTC',
  'CMO - DETAILED AT NATIONAL LINE AGENCIES': 'CMO-NLA',
}

const STOP_WORDS = new Set(['A', 'AN', 'AND', 'FOR', 'IN', 'OF', 'OFFICE', 'ON', 'THE', 'TO'])

export function formatOfficeAbbreviation(value) {
  if (!value) return '—'
  const text = String(value).trim()
  if (!text || text === '—') return '—'

  const normalized = text.replace(/\s+/g, ' ').toUpperCase()
  if (OFFICE_ACRONYM_DICTIONARY[normalized]) {
    return OFFICE_ACRONYM_DICTIONARY[normalized]
  }

  // If already short acronym (e.g. CICTMO, CHRMO, CEO, CMO-NLA)
  if (text.length <= 10 && !/\s/.test(text)) {
    return text.toUpperCase()
  }

  // Derive acronym by filtering stop-words
  const words = text
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim().toUpperCase())
    .filter(Boolean)

  if (!words.length) return text

  const significant = words.filter((w) => !STOP_WORDS.has(w) && !/^\d+$/.test(w))
  const targetWords = significant.length ? significant : words
  const acronym = targetWords.map((w) => w[0]).join('')

  return acronym || text
}

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

  return formatOfficeAbbreviation(source)
}
