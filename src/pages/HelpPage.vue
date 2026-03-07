<template>
  <q-page class="q-pa-md">
    <div class="q-mb-lg">
      <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Help & Documentation</h1>
      <p class="text-grey-7">Find answers to common questions about the Leave Monitoring System</p>
    </div>

    <q-input v-model="searchQuery" placeholder="Search help..." outlined dense class="q-mb-lg" clearable>
      <template #prepend><q-icon name="search" /></template>
    </q-input>

    <q-card flat bordered class="rounded-borders">
      <q-card-section>
        <div class="text-h6 q-mb-md">Frequently Asked Questions</div>
        <q-list>
          <q-expansion-item
            v-for="(faq, index) in filteredFaqs"
            :key="index"
            :label="faq.question"
            header-class="text-weight-medium"
          >
            <q-card flat bordered>
              <q-card-section class="text-caption text-grey-7">{{ faq.category }}</q-card-section>
              <q-card-section class="q-pt-none">{{ faq.answer }}</q-card-section>
            </q-card>
          </q-expansion-item>
        </q-list>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="rounded-borders q-mt-lg">
      <q-card-section>
        <div class="text-h6 q-mb-md">Contact Support</div>
        <p class="text-grey-7">For additional assistance, contact your HR department or system administrator.</p>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'

const searchQuery = ref('')

const faqs = [
  { category: 'Leave Application', question: 'How do I apply for a leave?', answer: 'Navigate to "Apply Leave" from the employee portal. Fill out the Civil Service Form No. 6 with your leave details including dates, type of leave, and reason. Submit for approval.' },
  { category: 'Leave Application', question: 'What documents do I need for sick leave?', answer: 'For sick leave exceeding 5 consecutive days, submit a medical certificate from a licensed physician within 5 days upon your return to work.' },
  { category: 'Leave Credits', question: 'How many leave credits do I have?', answer: 'Your leave credits are displayed on your Employee Dashboard. Government employees typically earn 1.25 days of vacation leave and 1.25 days of sick leave per month (15 days each per year).' },
  { category: 'Leave Credits', question: 'Do unused leave credits carry over?', answer: 'Yes, unused vacation leave can be accumulated and carried over. Sick leave credits are also carried over and can be accumulated without limit.' },
  { category: 'Leave Types', question: 'What types of leave are available?', answer: 'Available leave types include: Vacation Leave, Sick Leave, Maternity Leave (105 days), Paternity Leave (7 days), Special Leave for Women, Study Leave, Rehabilitation Leave, and others as provided by law.' },
  { category: 'Approval Process', question: 'How long does approval take?', answer: 'Leave applications are typically processed within 2-3 business days. You will receive a notification once your application is approved or requires additional information.' },
]

const filteredFaqs = computed(() => {
  if (!searchQuery.value.trim()) return faqs
  const q = searchQuery.value.toLowerCase()
  return faqs.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q) || f.category.toLowerCase().includes(q))
})
</script>
