const BOILERPLATE_PATTERNS = [
  /submitted this leave (?:request|application)/i,
  /reviewed and forwarded to hr/i,
  /reviewed and approved by department admin/i,
  /application was approved by department admin/i,
  /forwarded to hr/i,
  /confirmed receipt of/i,
  /acknowledged this coc application/i,
  /received hard copy leave/i,
  /received leave cancellation/i,
  /waiting for hr/i,
  /hr will confirm receipt/i,
  /hr will acknowledge/i,
  /hr will release/i,
  /this stage starts after/i,
  /application is fully approved/i,
  /fully approved before recall/i,
  /certified and approved by hr/i,
  /waiting for cmo/i,
  /waiting for cvmo/i,
  /cmo\/cvmo review/i,
  /cleared for release/i,
  /reviewed by cmo/i,
  /was released to employee/i,
  /document has been released/i,
  /form has been released/i,
  /documents released by hr/i,
  /physical leave document/i,
  /application workflow is complete/i,
  /workflow is complete/i,
  /application will be closed/i,
  /waiting for department admin/i,
  /department admin review pending/i,
  /waiting for hr evaluation/i,
  /hr evaluation for this late coc/i,
  /latest application status/i,
  /application was approved before the/i,
  /release ended because the request was not certified/i,
  /application was closed after cancellation/i,
  /filed by department admin on behalf of employee/i,
  /monetization filed by department admin/i,
  /approved leave update request/i,
  /hr application override/i,
  /recall request was submitted/i,
  /recall request was reviewed/i,
  /department admin disapproved the recall request/i,
  /approved leave cancellation request and forwarded to hr/i,
]

const EXACT_BOILERPLATE_STRINGS = new Set([
  'application was cancelled by the requester.',
  'application was cancelled by the requester',
  'application was cancelled by the employee while pending review.',
  'application was cancelled by the employee while pending review',
  'cancelled via approved leave cancellation request.',
  'cancelled via approved leave cancellation request',
  'cancellation request submitted by employee.',
  'cancellation request submitted by employee',
  'application was cancelled through the approved cancellation request.',
  'application was cancelled through the approved cancellation request',
  'application was cancelled by department admin.',
  'application was cancelled by department admin',
  'application was not certified.',
  'application was not certified',
  'application was disapproved.',
  'application was disapproved',
  'application rejected by department admin.',
  'application rejected by department admin',
  'application rejected by hr.',
  'application rejected by hr',
  'application was recalled by hr.',
  'application was recalled by hr',
])

export function isBoilerplateTimelineDescription(text) {
  if (!text) return true
  const trimmed = String(text).trim()
  if (!trimmed) return true
  const lower = trimmed.toLowerCase()
  if (EXACT_BOILERPLATE_STRINGS.has(lower)) return true
  return BOILERPLATE_PATTERNS.some((pattern) => pattern.test(trimmed))
}

export function getTimelineEntryRemarks(entry) {
  const remarksCandidate = String(entry?.remarks || '').trim()
  const descriptionCandidate = String(entry?.description || '').trim()
  const actor = String(entry?.actor || entry?.action_by || '').trim().toLowerCase()

  const candidate =
    remarksCandidate && !isBoilerplateTimelineDescription(remarksCandidate)
      ? remarksCandidate
      : descriptionCandidate && !isBoilerplateTimelineDescription(descriptionCandidate)
        ? descriptionCandidate
        : ''

  if (!candidate) return ''
  if (actor && candidate.toLowerCase() === actor) return ''
  return candidate
}

export function formatDisplayRemarks(text) {
  return String(text || '')
    .replace(/^(?:remarks|reason):\s*/i, '')
    .trim()
}
