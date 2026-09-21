import { isCityViceMayorApplicant } from './applicant-role-utils'

export function resolveCityViceMayorRecommendationSignatory({ app, mayorSignatory }) {
  return isCityViceMayorApplicant(app) ? mayorSignatory : null
}
