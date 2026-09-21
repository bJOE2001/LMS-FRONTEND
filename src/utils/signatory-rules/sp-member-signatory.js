import { isSangguniangPanlungsodMemberIApplicant } from './applicant-role-utils'

export function resolveSpMemberRecommendationSignatory({
  app,
  isAbroad,
  mayorSignatory,
  cityViceMayorSignatory,
}) {
  if (!isSangguniangPanlungsodMemberIApplicant(app)) {
    return null
  }

  if (isAbroad) {
    return mayorSignatory
  }

  return cityViceMayorSignatory
}
