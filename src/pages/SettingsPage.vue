<template>
  <q-page class="q-pa-md">
    <div class="q-mb-lg">
      <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Settings</h1>
      <p class="text-grey-7">Manage your account preferences</p>
    </div>

    <!-- Top Tabs -->
    <q-tabs
      v-model="activeTab"
      class="text-primary q-mb-lg"
      active-color="primary"
      indicator-color="primary"
      align="left"
      narrow-indicator
      dense
    >
      <q-tab v-for="tab in tabs" :key="tab.id" :name="tab.id" :icon="tab.icon" :label="tab.label" no-caps />
    </q-tabs>

    <q-separator class="q-mb-lg" />

    <!-- Content Area -->
    <div>
      <!-- ==================== INFORMATION TAB ==================== -->
      <q-card v-if="activeTab === 'information'" flat bordered class="rounded-borders">
          <q-card-section>
            <div class="row items-center q-mb-lg">
              <q-icon name="badge" size="28px" color="primary" class="q-mr-sm" />
              <div class="text-h6 text-weight-bold">Personal Information</div>
            </div>

            <!-- Profile Avatar & Name -->
            <div class="row items-center q-mb-lg q-pa-md bg-grey-1 rounded-borders">
              <q-avatar size="72px" color="primary" text-color="white" class="q-mr-md">
                <span class="text-h5 text-weight-bold">{{ userInitials }}</span>
              </q-avatar>
              <div>
                <div class="text-h6 text-weight-bold">{{ userInfo.fullName }}</div>
                <div class="text-body2 text-grey-7">{{ userInfo.position }}</div>
              </div>
            </div>

            <!-- Info Fields -->
            <div class="q-gutter-y-md">
              <div class="info-row">
                <div class="row items-center">
                  <q-icon name="person" color="primary" size="20px" class="q-mr-sm" />
                  <span class="text-caption text-grey-7 text-uppercase text-weight-medium">Full Name</span>
                </div>
                <div class="text-body1 text-weight-medium q-mt-xs q-ml-lg">{{ userInfo.fullName }}</div>
                <q-separator class="q-mt-sm" />
              </div>

              <div class="info-row">
                <div class="row items-center">
                  <q-icon name="badge" color="primary" size="20px" class="q-mr-sm" />
                  <span class="text-caption text-grey-7 text-uppercase text-weight-medium">Employee ID</span>
                </div>
                <div class="text-body1 text-weight-medium q-mt-xs q-ml-lg">{{ userInfo.employeeId }}</div>
                <q-separator class="q-mt-sm" />
              </div>

              <div class="info-row">
                <div class="row items-center">
                  <q-icon name="business" color="primary" size="20px" class="q-mr-sm" />
                  <span class="text-caption text-grey-7 text-uppercase text-weight-medium">Department</span>
                </div>
                <div class="text-body1 text-weight-medium q-mt-xs q-ml-lg">{{ userInfo.department }}</div>
                <q-separator class="q-mt-sm" />
              </div>

              <div class="info-row">
                <div class="row items-center">
                  <q-icon name="work" color="primary" size="20px" class="q-mr-sm" />
                  <span class="text-caption text-grey-7 text-uppercase text-weight-medium">Position</span>
                </div>
                <div class="text-body1 text-weight-medium q-mt-xs q-ml-lg">{{ userInfo.position }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- ==================== CHANGE PASSWORD TAB ==================== -->
        <q-card v-else-if="activeTab === 'password'" flat bordered class="rounded-borders">
          <q-card-section>
            <div class="row items-center q-mb-lg">
              <q-icon name="lock" size="28px" color="primary" class="q-mr-sm" />
              <div class="text-h6 text-weight-bold">Change Password</div>
            </div>

            <q-banner class="bg-blue-1 text-blue-9 rounded-borders q-mb-lg">
              <template #avatar>
                <q-icon name="info" color="blue" />
              </template>
              Make sure your new password is at least 8 characters long and includes a mix of letters, numbers, and symbols.
            </q-banner>

            <div class="q-gutter-y-md" style="max-width: 480px;">
              <q-input
                v-model="passwordForm.currentPassword"
                label="Current Password"
                :type="showCurrentPassword ? 'text' : 'password'"
                outlined
                dense
              >
                <template #append>
                  <q-icon
                    :name="showCurrentPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showCurrentPassword = !showCurrentPassword"
                  />
                </template>
              </q-input>

              <q-input
                v-model="passwordForm.newPassword"
                label="New Password"
                :type="showNewPassword ? 'text' : 'password'"
                outlined
                dense
              >
                <template #append>
                  <q-icon
                    :name="showNewPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showNewPassword = !showNewPassword"
                  />
                </template>
              </q-input>

              <!-- Password Strength Indicator -->
              <div v-if="passwordForm.newPassword.length > 0" class="q-mt-xs">
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
                v-model="passwordForm.confirmPassword"
                label="Confirm New Password"
                :type="showConfirmPassword ? 'text' : 'password'"
                outlined
                dense
                :rules="[
                  val => !!val || 'Please confirm your password',
                  val => val === passwordForm.newPassword || 'Passwords do not match'
                ]"
              >
                <template #append>
                  <q-icon
                    :name="showConfirmPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showConfirmPassword = !showConfirmPassword"
                  />
                </template>
              </q-input>

              <div class="q-mt-md">
                <q-btn
                  unelevated
                  color="primary"
                  label="Update Password"
                  icon="lock"
                  :disable="!isPasswordFormValid"
                  @click="handleChangePassword"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- ==================== NOTIFICATIONS TAB ==================== -->
        <q-card v-else-if="activeTab === 'notifications'" flat bordered class="rounded-borders">
          <q-card-section>
            <div class="row items-center q-mb-lg">
              <q-icon name="notifications" size="28px" color="primary" class="q-mr-sm" />
              <div class="text-h6 text-weight-bold">Notifications</div>
            </div>

            <q-list class="rounded-borders" bordered>
              <q-item tag="label">
                <q-item-section avatar>
                  <q-icon
                    :name="notificationsEnabled ? 'notifications_active' : 'notifications_off'"
                    :color="notificationsEnabled ? 'primary' : 'grey-5'"
                    size="28px"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-body1 text-weight-medium">
                    {{ notificationsEnabled ? 'Notifications are ON' : 'Notifications are OFF' }}
                  </q-item-label>
                  <q-item-label caption class="text-grey-6">
                    {{ notificationsEnabled ? 'You will receive notifications for updates and alerts.' : 'You will not receive any notifications.' }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-toggle v-model="notificationsEnabled" color="primary" size="lg" />
                </q-item-section>
              </q-item>
            </q-list>

            <div class="q-mt-lg">
              <q-btn
                unelevated
                color="primary"
                label="Save Preferences"
                icon="save"
                @click="handleSaveNotifications"
              />
            </div>
          </q-card-section>
        </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

// ==================== TABS ====================
const activeTab = ref('information')
const tabs = [
  { id: 'information', label: 'Information', icon: 'person', description: 'View your personal details' },
  { id: 'password', label: 'Change Password', icon: 'lock', description: 'Update your password' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications', description: 'Manage notification preferences' },
]

// ==================== INFORMATION TAB DATA ====================
// Placeholder data — will be replaced by backend data
const userInfo = ref({
  fullName: 'Juan Dela Cruz',
  employeeId: 'EMP-2024-001',
  department: 'Human Resources',
  position: 'HR Manager',
})

const userInitials = computed(() => {
  const names = userInfo.value.fullName.split(' ')
  if (names.length >= 2) {
    return (names[0][0] + names[names.length - 1][0]).toUpperCase()
  }
  return names[0][0].toUpperCase()
})

// ==================== CHANGE PASSWORD TAB DATA ====================
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// ==================== PASSWORD RULES & STRENGTH ====================
const hasMinLength = computed(() => passwordForm.newPassword.length >= 8)
const hasUppercase = computed(() => /[A-Z]/.test(passwordForm.newPassword))
const hasLowercase = computed(() => /[a-z]/.test(passwordForm.newPassword))
const hasNumber = computed(() => /[0-9]/.test(passwordForm.newPassword))
const hasSymbol = computed(() => /[^A-Za-z0-9]/.test(passwordForm.newPassword))

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
    passwordForm.currentPassword.length > 0 &&
    hasMinLength.value &&
    hasUppercase.value &&
    hasLowercase.value &&
    hasNumber.value &&
    passwordForm.confirmPassword === passwordForm.newPassword
  )
})

function handleChangePassword() {
  // TODO: Connect to backend API to change password
  $q.notify({ type: 'positive', message: 'Password updated successfully!', position: 'top' })
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
}

// ==================== NOTIFICATIONS TAB DATA ====================
const notificationsEnabled = ref(true)

function handleSaveNotifications() {
  // TODO: Connect to backend API to save notification preferences
  $q.notify({ type: 'positive', message: 'Notification preferences saved!', position: 'top' })
}
</script>

