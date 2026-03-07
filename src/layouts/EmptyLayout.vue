<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()
let wasDark = false

// Force light mode on auth pages, restore on leave
onMounted(() => {
  wasDark = $q.dark.isActive
  if (wasDark) {
    $q.dark.set(false)
  }
})

onBeforeUnmount(() => {
  if (wasDark) {
    $q.dark.set(true)
  }
})
</script>
