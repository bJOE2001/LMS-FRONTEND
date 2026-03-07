<template>
  <q-page class="q-pa-md">
    <div class="q-mb-lg">
      <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Advanced Analytics</h1>
      <p class="text-grey-7">Leave trends and analytics dashboard</p>
    </div>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-lg-8">
        <q-card flat bordered class="rounded-borders">
          <q-card-section>
            <div class="text-h6 q-mb-md">Monthly Leave Trend</div>
            <div class="flex flex-center bg-grey-2 rounded-borders" style="min-height: 240px">
              <span class="text-grey-7">Chart Visualization</span>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-lg-4">
        <q-card flat bordered class="rounded-borders">
          <q-card-section>
            <div class="text-h6 q-mb-md">Leave Type Distribution</div>
            <div class="q-gutter-y-md">
              <div v-for="item in distribution" :key="item.name">
                <div class="row justify-between q-mb-xs">
                  <span class="text-caption">{{ item.name }}</span>
                  <span class="text-weight-medium">{{ item.pct }}%</span>
                </div>
                <q-linear-progress :value="item.pct / 100" :color="item.color" size="8px" class="rounded-borders" />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
const distribution = [
  { name: 'Vacation Leave', pct: 45, color: 'primary' },
  { name: 'Sick Leave', pct: 30, color: 'green' },
  { name: 'Other', pct: 25, color: 'purple' },
]
</script>
