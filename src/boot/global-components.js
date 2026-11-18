import { boot } from 'quasar/wrappers'
import AppReloadBar from 'src/components/common/AppReloadBar.vue'
import ChartSkeleton from 'src/components/common/ChartSkeleton.vue'
import DataFilterBar from 'src/components/common/DataFilterBar.vue'
import DataTableCard from 'src/components/common/DataTableCard.vue'
import KpiCardsSkeleton from 'src/components/common/KpiCardsSkeleton.vue'
import ListSkeleton from 'src/components/common/ListSkeleton.vue'
import TableSkeletonCard from 'src/components/common/TableSkeletonCard.vue'

export default boot(({ app }) => {
  app.component('AppReloadBar', AppReloadBar)
  app.component('ChartSkeleton', ChartSkeleton)
  app.component('DataFilterBar', DataFilterBar)
  app.component('DataTableCard', DataTableCard)
  app.component('KpiCardsSkeleton', KpiCardsSkeleton)
  app.component('ListSkeleton', ListSkeleton)
  app.component('TableSkeletonCard', TableSkeletonCard)
})
