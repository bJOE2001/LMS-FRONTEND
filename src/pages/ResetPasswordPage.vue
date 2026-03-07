<template>
  <q-page class="reset-page flex flex-center">
    <q-card class="reset-card" flat>
      <div class="row no-wrap card-row">
        <!-- LEFT SIDE: Logo / Image (hidden on mobile) -->
        <div class="col-md-6 left-panel flex flex-center gt-sm">
          <div class="left-content text-center">
            <img
              src="~src/assets/images/lms-logo.png"
              alt="LMS Logo"
              class="brand-image"
            />
            <h5 class="text-white q-mt-lg q-mb-xs text-weight-bold">Leave Management System</h5>
            <p class="text-white-7 text-body2 brand-subtitle">
              Streamline your leave requests, approvals, and tracking — all in one place.
            </p>
          </div>
        </div>

        <!-- RIGHT SIDE: Reset Password Form -->
        <div class="col-12 col-md-6 right-panel flex flex-center">
          <div class="form-wrapper">
            <!-- STEP 1: Enter New Password -->
            <template v-if="!resetSuccess">
              <div class="text-center q-mb-lg">
                <div class="page-icon q-mb-md">
                  <q-icon name="lock_open" size="42px" color="primary" />
                </div>
                <h5 class="q-mt-none q-mb-xs text-weight-bold text-dark">Set new password</h5>
                <p class="text-grey-6 q-mb-none text-body2">
                  Your new password must be at least 8 characters long.
                </p>
              </div>

              <q-form class="q-gutter-md" @submit.prevent="onSubmitReset">
                <div>
                  <label class="input-label">Email</label>
                  <q-input
                    v-model="email"
                    type="email"
                    placeholder="you@company.com"
                    outlined
                    dense
                    :rules="[
                      val => !!val || 'Email is required',
                      val => /.+@.+\..+/.test(val) || 'Please enter a valid email'
                    ]"
                    class="form-input"
                  >
                    <template #prepend>
                      <q-icon name="mail_outline" size="sm" color="grey-6" />
                    </template>
                  </q-input>
                </div>

                <div>
                  <label class="input-label">New Password</label>
                  <q-input
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Enter new password"
                    outlined
                    dense
                    :rules="[
                      val => !!val || 'Password is required',
                      val => val.length >= 8 || 'Password must be at least 8 characters'
                    ]"
                    class="form-input"
                  >
                    <template #prepend>
                      <q-icon name="lock_outline" size="sm" color="grey-6" />
                    </template>
                    <template #append>
                      <q-icon
                        :name="showPassword ? 'visibility_off' : 'visibility'"
                        class="cursor-pointer"
                        color="grey-6"
                        @click="showPassword = !showPassword"
                      />
                    </template>
                  </q-input>
                </div>

                <div>
                  <label class="input-label">Confirm Password</label>
                  <q-input
                    v-model="passwordConfirm"
                    :type="showConfirm ? 'text' : 'password'"
                    placeholder="Confirm new password"
                    outlined
                    dense
                    :rules="[
                      val => !!val || 'Please confirm your password',
                      val => val === password || 'Passwords do not match'
                    ]"
                    class="form-input"
                  >
                    <template #prepend>
                      <q-icon name="lock_outline" size="sm" color="grey-6" />
                    </template>
                    <template #append>
                      <q-icon
                        :name="showConfirm ? 'visibility_off' : 'visibility'"
                        class="cursor-pointer"
                        color="grey-6"
                        @click="showConfirm = !showConfirm"
                      />
                    </template>
                  </q-input>
                </div>

                <q-btn
                  type="submit"
                  label="Reset password"
                  unelevated
                  no-caps
                  color="primary"
                  class="full-width q-mt-md form-btn"
                  size="lg"
                  :loading="loading"
                />
              </q-form>

              <div class="text-center q-mt-lg">
                <router-link to="/login" class="text-primary text-body2 text-weight-medium back-link">
                  <q-icon name="arrow_back" size="xs" class="q-mr-xs" />
                  Back to sign in
                </router-link>
              </div>
            </template>

            <!-- STEP 2: Success -->
            <template v-else>
              <div class="text-center q-mb-lg">
                <div class="page-icon success-icon q-mb-md">
                  <q-icon name="check_circle" size="42px" color="positive" />
                </div>
                <h5 class="q-mt-none q-mb-xs text-weight-bold text-dark">Password reset!</h5>
                <p class="text-grey-6 q-mb-none text-body2">
                  Your password has been successfully reset. You can now sign in with your new password.
                </p>
              </div>

              <q-btn
                label="Back to sign in"
                unelevated
                no-caps
                color="primary"
                class="full-width form-btn"
                size="lg"
                to="/login"
              />
            </template>
          </div>
        </div>
      </div>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const route = useRoute()
const $q = useQuasar()

// Token and email from the URL query params (e.g. /reset-password?token=xxx&email=user@mail.com)
const token = ref(route.query.token || '')
const email = ref(route.query.email || '')

const password = ref('')
const passwordConfirm = ref('')
const showPassword = ref(false)
const showConfirm = ref(false)
const loading = ref(false)
const resetSuccess = ref(false)

/**
 * BACKEND API: POST /api/reset-password
 * Expected request body: { token: string, email: string, password: string, password_confirmation: string }
 * Expected success response: { message: string }
 * Expected error response: { message: string } or { errors: { email: [string], password: [string] } }
 */
async function onSubmitReset() {
  loading.value = true
  try {
    await api.post('/reset-password', {
      token: token.value,
      email: email.value,
      password: password.value,
      password_confirmation: passwordConfirm.value,
    })
    resetSuccess.value = true
    $q.notify({
      type: 'positive',
      message: 'Password has been reset successfully!',
      position: 'top',
    })
  } catch (err) {
    const msg = err.response?.data?.message
      || err.response?.data?.errors?.email?.[0]
      || err.response?.data?.errors?.password?.[0]
      || 'Failed to reset password. The link may have expired.'
    $q.notify({
      type: 'negative',
      message: msg,
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
/* ---- PAGE BACKGROUND ---- */
.reset-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24px;
}

/* ---- CENTERED CARD ---- */
.reset-card {
  width: 100%;
  max-width: 960px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.card-row {
  min-height: 560px;
}

/* ---- LEFT PANEL (Logo / Image) ---- */
.left-panel {
  background: linear-gradient(160deg, #388e3c 0%, #1b5e20 100%);
  position: relative;
  overflow: hidden;
  padding: 40px;
}

.left-panel::before {
  content: '';
  position: absolute;
  top: -100px;
  right: -100px;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
}

.left-panel::after {
  content: '';
  position: absolute;
  bottom: -60px;
  left: -60px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.04);
}

.left-content {
  position: relative;
  z-index: 1;
}

.brand-image {
  width: 160px;
  height: auto;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.25));
  border-radius: 16px;
}

.text-white-7 {
  color: rgba(255, 255, 255, 0.7);
}

.brand-subtitle {
  max-width: 280px;
  margin: 0 auto;
  line-height: 1.6;
}

/* ---- RIGHT PANEL (Form) ---- */
.right-panel {
  background: #ffffff;
  padding: 48px 40px;
}

.form-wrapper {
  width: 100%;
  max-width: 360px;
}

.page-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(46, 125, 50, 0.08);
  border-radius: 14px;
}

.success-icon {
  background: rgba(33, 186, 69, 0.08);
}

.input-label {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: #37474f;
  margin-bottom: 6px;
}

.form-input :deep(.q-field--outlined .q-field__control) {
  border-radius: 10px;
}

.form-btn {
  border-radius: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  height: 46px;
  font-size: 0.95rem;
}

.back-link {
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
}

/* ---- RESPONSIVE ---- */
@media (max-width: 1023px) {
  .reset-card {
    max-width: 720px;
  }

  .left-panel,
  .right-panel {
    padding: 32px 24px;
  }
}

@media (max-width: 599px) {
  .reset-page {
    padding: 20px 16px;
  }

  .reset-card {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border-radius: 14px;
  }

  .right-panel {
    padding: 32px 20px;
  }

  .form-wrapper {
    max-width: 100%;
  }
}
</style>
