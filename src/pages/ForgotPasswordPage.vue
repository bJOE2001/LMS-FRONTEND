<template>
  <q-page class="forgot-page flex flex-center">
    <q-card class="forgot-card" flat>
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

        <!-- RIGHT SIDE: Forgot Password Form -->
        <div class="col-12 col-md-6 right-panel flex flex-center">
          <div class="form-wrapper">
            <!-- STEP 1: Enter Email -->
            <template v-if="!emailSent">
              <div class="text-center q-mb-lg">
                <div class="page-icon q-mb-md">
                  <q-icon name="lock_reset" size="42px" color="primary" />
                </div>
                <h5 class="q-mt-none q-mb-xs text-weight-bold text-dark">Forgot password?</h5>
                <p class="text-grey-6 q-mb-none text-body2">
                  No worries! Enter your email and we'll send you a reset link.
                </p>
              </div>

              <q-form class="q-gutter-md" @submit.prevent="onSubmitEmail">
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

                <q-btn
                  type="submit"
                  label="Send reset link"
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

            <!-- STEP 2: Success - Email Sent -->
            <template v-else>
              <div class="text-center q-mb-lg">
                <div class="page-icon success-icon q-mb-md">
                  <q-icon name="mark_email_read" size="42px" color="positive" />
                </div>
                <h5 class="q-mt-none q-mb-xs text-weight-bold text-dark">Check your email</h5>
                <p class="text-grey-6 q-mb-none text-body2">
                  We've sent a password reset link to
                </p>
                <p class="text-dark text-weight-medium text-body2 q-mt-xs q-mb-none">
                  {{ email }}
                </p>
              </div>

              <div class="q-pa-md bg-grey-1 rounded-borders q-mb-md">
                <div class="row items-center no-wrap">
                  <q-icon name="info" color="primary" size="sm" class="q-mr-sm" />
                  <p class="text-grey-7 text-caption q-mb-none">
                    Didn't receive the email? Check your spam folder or click below to resend.
                  </p>
                </div>
              </div>

              <q-btn
                :label="resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend email'"
                unelevated
                no-caps
                color="primary"
                outline
                class="full-width form-btn"
                size="lg"
                :loading="resending"
                :disable="resendCooldown > 0"
                @click="onResend"
              />

              <div class="text-center q-mt-lg">
                <router-link to="/login" class="text-primary text-body2 text-weight-medium back-link">
                  <q-icon name="arrow_back" size="xs" class="q-mr-xs" />
                  Back to sign in
                </router-link>
              </div>
            </template>
          </div>
        </div>
      </div>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const $q = useQuasar()

const email = ref('')
const loading = ref(false)
const emailSent = ref(false)
const resending = ref(false)
const resendCooldown = ref(0)

let cooldownTimer = null

function startCooldown() {
  resendCooldown.value = 60
  cooldownTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

onBeforeUnmount(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})

/**
 * BACKEND API: POST /api/forgot-password
 * Expected request body: { email: string }
 * Expected success response: { message: string }
 * Expected error response: { message: string } or { errors: { email: [string] } }
 */
async function onSubmitEmail() {
  loading.value = true
  try {
    await api.post('/forgot-password', {
      email: email.value,
    })
    emailSent.value = true
    startCooldown()
    $q.notify({
      type: 'positive',
      message: 'Password reset link sent to your email.',
      position: 'top',
    })
  } catch (err) {
    const msg = err.response?.data?.message
      || err.response?.data?.errors?.email?.[0]
      || 'Failed to send reset link. Please try again.'
    $q.notify({
      type: 'negative',
      message: msg,
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}

/**
 * BACKEND API: POST /api/forgot-password (same endpoint, resend)
 */
async function onResend() {
  resending.value = true
  try {
    await api.post('/forgot-password', {
      email: email.value,
    })
    startCooldown()
    $q.notify({
      type: 'positive',
      message: 'Reset link resent successfully.',
      position: 'top',
    })
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to resend. Please try again.'
    $q.notify({
      type: 'negative',
      message: msg,
      position: 'top',
    })
  } finally {
    resending.value = false
  }
}
</script>

<style lang="scss" scoped>
/* ---- PAGE BACKGROUND ---- */
.forgot-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24px;
}

/* ---- CENTERED CARD ---- */
.forgot-card {
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
  .forgot-card {
    max-width: 720px;
  }

  .left-panel,
  .right-panel {
    padding: 32px 24px;
  }
}

@media (max-width: 599px) {
  .forgot-page {
    padding: 20px 16px;
  }

  .forgot-card {
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
