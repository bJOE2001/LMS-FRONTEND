<template>
  <component
    :is="card ? QCard : 'div'"
    v-bind="card ? { flat: true, bordered: true, class: ['rounded-borders bg-white app-skeleton-card', cardClass] } : { class: cardClass }"
  >
    <q-list separator>
      <q-item
        v-for="r in rows"
        :key="`list-skel-${r}`"
        class="q-py-md q-px-md app-list-skeleton__row"
      >
        <q-item-section v-if="avatar" avatar>
          <q-skeleton type="QAvatar" size="40px" animation="wave" class="app-skeleton-element" />
        </q-item-section>
        <q-item-section>
          <q-skeleton
            type="text"
            :width="primaryWidths[(r - 1) % primaryWidths.length]"
            height="16px"
            animation="wave"
            class="app-skeleton-element"
          />
          <q-skeleton
            v-if="lines >= 2"
            type="text"
            :width="secondaryWidths[(r - 1) % secondaryWidths.length]"
            height="12px"
            class="q-mt-xs app-skeleton-element"
            animation="wave"
          />
        </q-item-section>
        <q-item-section v-if="showBadge" side>
          <q-skeleton type="QChip" width="62px" height="20px" animation="wave" class="app-skeleton-element" />
        </q-item-section>
      </q-item>
    </q-list>
  </component>
</template>

<script setup>
import { QCard } from 'quasar'

defineProps({
  rows: {
    type: Number,
    default: 5,
  },
  avatar: {
    type: Boolean,
    default: true,
  },
  lines: {
    type: Number,
    default: 2,
  },
  showBadge: {
    type: Boolean,
    default: true,
  },
  card: {
    type: Boolean,
    default: false,
  },
  cardClass: {
    type: [String, Array, Object],
    default: '',
  },
})

const primaryWidths = ['58%', '72%', '64%', '50%', '68%']
const secondaryWidths = ['38%', '46%', '32%', '42%', '36%']
</script>

