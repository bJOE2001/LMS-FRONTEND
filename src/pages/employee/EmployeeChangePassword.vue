<template>
  <q-page class="q-pa-md">
    <div class="row justify-center">
      <div class="col-12 col-sm-10 col-md-6">
        <q-card flat bordered class="rounded-borders">
          <q-card-section>
            <div class="text-center q-mb-lg">
              <q-icon name="lock_reset" size="48px" color="primary" />
              <div class="text-h6 q-mt-md q-mb-xs">Change your password</div>
              <p class="text-grey-7 text-body2 q-mb-none">
                You must set a new password before you can use the system.
              </p>
            </div>

            <q-banner class="bg-blue-1 text-blue-9 rounded-borders q-mb-lg">
              <template #avatar>
                <q-icon name="info" color="blue" />
              </template>
              Make sure your new password is at least 8 characters long and includes a mix of letters, numbers, and symbols.
            </q-banner>

            <q-form class="q-gutter-md" @submit.prevent="onSubmit">
              <q-input
                v-model="currentPassword"
                :type="showCurrent ? 'text' : 'password'"
                label="Current password"
                outlined
                dense
                :rules="[val => !!val || 'Current password is required']"
              >
                <template #append>
                  <q-icon
                    :name="showCurrent ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showCurrent = !showCurrent"
                  />
                </template>
              </q-input>
              <q-input
                v-model="newPassword"
                :type="showNew ? 'text' : 'password'"
                label="New password"
                outlined
                dense
                :rules="[
                  val => !!val || 'New password is required',
                  val => val.length >= 8 || 'At least 8 characters required',
                ]"
              >
                <template #append>
                  <q-icon
                    :name="showNew ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showNew = !showNew"
                  />
                </template>
              </q-input>

              <!-- Password Strength Indicator -->
              <div v-if="newPassword.length > 0" class="q-mt-xs">
                <div class="row items-center justify-between q-mb-xs">
                  <span class="text-caption text-weight-medium" :style="{ color: strengthColor }">
                    {{ strengthLabel }}
                  </span>
                  <span class="text-caption text-grey-6">{{ strengthScore }}/5</span>
                </div>
                <q-linear-progress
                  :value="strengthScore / 5"
                  :color="strengthBarColor"
                  size="8px"
                  rounded
                  class="q-mb-sm"
                />

                <!-- Password Rules Checklist -->
                <div class="q-mt-sm q-pa-sm bg-grey-1 rounded-borders">
                  <div
                    v-for="rule in passwordRules"
                    :key="rule.key"
                    class="row items-center q-py-xs"
                  >
                    <q-icon
                      :name="rule.passed ? 'check_circle' : 'cancel'"
                      :color="rule.passed ? 'green' : 'grey-5'"
                      size="18px"
                      class="q-mr-sm"
                    />
                    <span
                      class="text-caption"
                      :class="rule.passed ? 'text-green-8' : 'text-grey-6'"
                    >
                      {{ rule.label }}
                    </span>
                  </div>
                </div>
              </div>

              <q-input
                v-model="confirmPassword"
                :type="showConfirm ? 'text' : 'password'"
                label="Confirm new password"
                outlined
                dense
                :rules="[
                  val => !!val || 'Please confirm your password',
                  val => val === newPassword || 'Passwords do not match',
                ]"
              >
                <template #append>
                  <q-icon
                    :name="showConfirm ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showConfirm = !showConfirm"
                  />
                </template>
              </q-input>
              <div class="row q-mt-md">
                <q-btn
                  unelevated
                  no-caps
                  type="submit"
                  color="primary"
                  label="Change password"
                  :loading="loading"
                  :disable="!isPasswordFormValid"
                  class="full-width"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth-store'
import { api } from 'src/boot/axios'

const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)
const loading = ref(false)

// Password rules & strength (same as SettingsPage)
const hasMinLength = computed(() => newPassword.value.length >= 8)
const hasUppercase = computed(() => /[A-Z]/.test(newPassword.value))
const hasLowercase = computed(() => /[a-z]/.test(newPassword.value))
const hasNumber = computed(() => /[0-9]/.test(newPassword.value))
const hasSymbol = computed(() => /[^A-Za-z0-9]/.test(newPassword.value))

const passwordRules = computed(() => [
  { key: 'length', label: 'At least 8 characters', passed: hasMinLength.value },
  { key: 'uppercase', label: 'At least 1 uppercase letter (A-Z)', passed: hasUppercase.value },
  { key: 'lowercase', label: 'At least 1 lowercase letter (a-z)', passed: hasLowercase.value },
  { key: 'number', label: 'At least 1 number (0-9)', passed: hasNumber.value },
  { key: 'symbol', label: 'At least 1 symbol (optional)', passed: hasSymbol.value },
])

const strengthScore = computed(() => {
  let score = 0
  if (hasMinLength.value) score++
  if (hasUppercase.value) score++
  if (hasLowercase.value) score++
  if (hasNumber.value) score++
  if (hasSymbol.value) score++
  return score
})

const strengthLabel = computed(() => {
  const s = strengthScore.value
  if (s <= 1) return 'Weak Password'
  if (s <= 2) return 'Fair Password'
  if (s <= 3) return 'Medium Password'
  if (s <= 4) return 'Strong Password'
  return 'Very Strong Password'
})

const strengthColor = computed(() => {
  const s = strengthScore.value
  if (s <= 1) return '#d32f2f'
  if (s <= 2) return '#f57c00'
  if (s <= 3) return '#ffa000'
  if (s <= 4) return '#388e3c'
  return '#2e7d32'
})

const strengthBarColor = computed(() => {
  const s = strengthScore.value
  if (s <= 1) return 'red'
  if (s <= 2) return 'orange'
  if (s <= 3) return 'amber'
  if (s <= 4) return 'green'
  return 'green-8'
})

const isPasswordFormValid = computed(() => {
  return (
    currentPassword.value.length > 0 &&
    hasMinLength.value &&
    hasUppercase.value &&
    hasLowercase.value &&
    hasNumber.value &&
    confirmPassword.value === newPassword.value
  )
})

async function onSubmit() {
  loading.value = true
  try {
    await api.post('/employee/change-password', {
      current_password: currentPassword.value,
      password: newPassword.value,
      password_confirmation: confirmPassword.value,
    })
    const user = { ...authStore.user, must_change_password: false }
    authStore.setAuth({ token: authStore.getToken(), user })
    $q.notify({ type: 'positive', message: 'Password changed. You can now use the application.' })
    router.push('/employee/dashboard')
  } catch (err) {
    const msg = err.response?.data?.message
      || err.response?.data?.errors?.current_password?.[0]
      || err.response?.data?.errors?.password?.[0]
      || 'Failed to change password'
    $q.notify({ type: 'negative', message: msg })
  } finally {
    loading.value = false
  }
}
</script>
