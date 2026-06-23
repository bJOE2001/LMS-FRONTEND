import { resolveCityViceMayorRecommendationSignatory } from './city-vice-mayor-signatory'
import { resolveDepartmentHeadRecommendationSignatory } from './department-head-signatory'
import { resolveNormalEmployeeRecommendationSignatory } from './normal-employee-signatory'
import { resolveSpMemberRecommendationSignatory } from './sp-member-signatory'

export function resolveRecommendationSignatoryByApplicantType({
  app,
  isAbroad,
  isWithinPhilippines,
  mayorSignatory,
  cityViceMayorSignatory,
  baseRecommendationSignatory,
}) {
  const cityViceMayorRecommendation = resolveCityViceMayorRecommendationSignatory({
    app,
    mayorSignatory,
  })
  if (cityViceMayorRecommendation) {
    return cityViceMayorRecommendation
  }

  if (isAbroad || isWithinPhilippines) {
    const departmentHeadRecommendation = resolveDepartmentHeadRecommendationSignatory({
      app,
      isAbroad,
      mayorSignatory,
      baseRecommendationSignatory,
    })

    if (departmentHeadRecommendation) {
      return departmentHeadRecommendation
    }

    return resolveNormalEmployeeRecommendationSignatory({
      baseRecommendationSignatory,
    })
  }

  const spMemberRecommendation = resolveSpMemberRecommendationSignatory({
    app,
    isAbroad,
    isWithinPhilippines,
    mayorSignatory,
    cityViceMayorSignatory,
  })
  if (spMemberRecommendation) {
    return spMemberRecommendation
  }

  const departmentHeadRecommendation = resolveDepartmentHeadRecommendationSignatory({
    app,
    isAbroad,
    mayorSignatory,
    baseRecommendationSignatory,
  })
  if (departmentHeadRecommendation) {
    return departmentHeadRecommendation
  }

  return resolveNormalEmployeeRecommendationSignatory({
    baseRecommendationSignatory,
  })
}
