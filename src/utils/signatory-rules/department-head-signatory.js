import { isDepartmentHeadApplicant } from '../department-head-signature'

export function resolveDepartmentHeadRecommendationSignatory({
  app,
  isAbroad,
  mayorSignatory,
  baseRecommendationSignatory,
}) {
  if (!isDepartmentHeadApplicant(app)) {
    return null
  }

  return isAbroad ? mayorSignatory : baseRecommendationSignatory
}
