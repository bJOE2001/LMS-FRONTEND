import { isSangguniangPanlungsodMemberIApplicant } from './applicant-role-utils'

export function resolveSpMemberRecommendationSignatory({
  app,
  isAbroad,
  isWithinPhilippines,
  mayorSignatory,
  cityViceMayorSignatory,
}) {
  if (!isSangguniangPanlungsodMemberIApplicant(app)) {
    return null
  }

  if (isAbroad) {
    return mayorSignatory
  }

  if (isWithinPhilippines) {
    return cityViceMayorSignatory
  }

  return null
}
