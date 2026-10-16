import { isDepartmentHeadApplicant } from '../department-head-signature'
import { isLegislativeDepartmentHeadApplicant } from './applicant-role-utils'

export function resolveDepartmentHeadRecommendationSignatory({
  app,
  isAbroad,
  mayorSignatory,
  cityViceMayorSignatory,
  baseRecommendationSignatory,
}) {
  if (!isDepartmentHeadApplicant(app)) {
    return null
  }

  if (isLegislativeDepartmentHeadApplicant(app)) {
    return cityViceMayorSignatory || baseRecommendationSignatory
  }

  return isAbroad ? mayorSignatory : baseRecommendationSignatory
}
