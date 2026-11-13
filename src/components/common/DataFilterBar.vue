<template>
  <q-card flat bordered class="rounded-borders bg-white q-mb-md data-filter-bar">
    <q-card-section :class="sectionClass">
      <div class="row items-center q-col-gutter-sm">
        <slot name="prepend" />

        <div v-if="showSearch" :class="searchClass">
          <q-input
            :model-value="search"
            outlined
            dense
            clearable
            :debounce="debounce"
            :label="searchLabel || undefined"
            :placeholder="searchPlaceholder"
            @update:model-value="$emit('update:search', $event ?? '')"
          >
            <template #prepend>
              <q-icon name="search" color="grey-6" />
            </template>
          </q-input>
        </div>

        <slot />

        <div v-if="showReset || $slots.actions" :class="actionsClass">
          <div class="row items-center justify-end q-gutter-xs no-wrap">
            <q-btn
              v-if="showReset"
              outline
              dense
              no-caps
              color="grey-7"
              icon="filter_alt_off"
              :label="resetLabel"
              class="q-px-sm"
              @click="$emit('reset')"
            />
            <slot name="actions" />
          </div>
        </div>
      </div>

      <div v-if="$slots.secondary" class="row items-center q-col-gutter-sm q-mt-xs">
        <slot name="secondary" />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
defineProps({
  search: {
    type: String,
    default: '',
  },
  showSearch: {
    type: Boolean,
    default: true,
  },
  searchLabel: {
    type: String,
    default: '',
  },
  searchPlaceholder: {
    type: String,
    default: 'Search...',
  },
  searchClass: {
    type: String,
    default: 'col-12 col-md-4',
  },
  debounce: {
    type: [Number, String],
    default: 0,
  },
  showReset: {
    type: Boolean,
    default: false,
  },
  resetLabel: {
    type: String,
    default: 'Reset Filters',
  },
  actionsClass: {
    type: String,
    default: 'col-12 col-md-auto q-ml-auto',
  },
  sectionClass: {
    type: String,
    default: 'q-py-sm',
  },
})

defineEmits(['update:search', 'reset'])
</script>

