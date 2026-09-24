import {
  isSangguniangPanlungsodMemberApplicant,
  isSangguniangPanlungsodMemberIApplicant,
} from './applicant-role-utils'

function isSpMember(app) {
  if (typeof isSangguniangPanlungsodMemberApplicant === 'function') {
    return isSangguniangPanlungsodMemberApplicant(app)
  }
  return isSangguniangPanlungsodMemberIApplicant(app)
}

export function resolveSpMemberRecommendationSignatory({
  app,
  cityViceMayorSignatory,
}) {
  if (!isSpMember(app)) {
    return null
  }

  return cityViceMayorSignatory
}

export function resolveSpMemberApprovedForSignatory({
  app,
  isAbroad,
  mayorSignatory,
  cityViceMayorSignatory,
}) {
  if (!isSpMember(app)) {
    return null
  }

  if (isAbroad) {
    return mayorSignatory
  }

  return cityViceMayorSignatory
}

