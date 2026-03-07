<template>
  <q-page class="login-page flex flex-center">
    <!-- Centered Card -->
    <q-card class="login-card" flat>
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

        <!-- RIGHT SIDE: Login Form -->
        <div class="col-12 col-md-6 right-panel flex flex-center">
          <div class="form-wrapper">
            <div class="text-center q-mb-lg">
              <div class="login-logo q-mb-md">
                <q-icon name="badge" size="42px" color="primary" />
              </div>
              <h5 class="q-mt-none q-mb-xs text-weight-bold text-dark">Welcome back</h5>
              <p class="text-grey-6 q-mb-none text-body2">Sign in to your LMS account</p>
            </div>

            <q-form class="q-gutter-md" @submit.prevent="onSubmit">
              <div>
                <label class="input-label">Username</label>
                <q-input
                  v-model="username"
                  type="text"
                  placeholder="Enter your username"
                  outlined
                  dense
                  :rules="[val => !!val || 'Username is required']"
                  class="login-input"
                >
                  <template #prepend>
                    <q-icon name="person_outline" size="sm" color="grey-6" />
                  </template>
                </q-input>
              </div>

              <div>
                <label class="input-label">Password</label>
                <q-input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Enter your password"
                  outlined
                  dense
                  :rules="[val => !!val || 'Password is required']"
                  class="login-input"
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

              <div class="row items-center justify-between q-mt-sm">
                <q-checkbox v-model="remember" label="Remember me" dense color="primary" />
                <router-link to="/forgot-password" class="text-primary text-body2 text-weight-medium forgot-link">Forgot password?</router-link>
              </div>

              <q-btn
                type="submit"
                label="Sign in"
                unelevated
                no-caps
                color="primary"
                class="full-width q-mt-md login-btn"
                size="lg"
                :loading="loading"
              />
            </q-form>

            <div class="text-center q-mt-lg">
              <p class="text-grey-6 text-body2 q-mb-none">
                Don't have an account?
                <a href="#" class="text-primary text-weight-medium forgot-link">Contact your administrator</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth-store'
import { useLeaveStore } from 'stores/leave-store'
import { api } from 'boot/axios'

const router = useRouter()
const leaveStore = useLeaveStore()
const $q = useQuasar()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const remember = ref(false)
const showPassword = ref(false)
const loading = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    const { data } = await api.post('/login', {
      username: username.value,
      password: password.value,
    })
    authStore.setAuth({
      token: data.token,
      user: { ...data.user, must_change_password: data.must_change_password ?? data.user?.must_change_password },
    })
    leaveStore.setUserRole(data.user.role)
    $q.notify({
      type: 'positive',
      message: 'Logged in successfully!',
      position: 'top',
    })
    const route = data.redirect_to || data.dashboard_route || '/employee/dashboard'
    router.push(route)
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.errors?.username?.[0] || 'Login failed'
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
.login-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24px;
}

/* ---- CENTERED CARD ---- */
.login-card {
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

.login-logo {
  width: 64px;
  height: 64px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(46, 125, 50, 0.08);
  border-radius: 14px;
}

.input-label {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: #37474f;
  margin-bottom: 6px;
}

.login-input :deep(.q-field--outlined .q-field__control) {
  border-radius: 10px;
}

.login-btn {
  border-radius: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  height: 46px;
  font-size: 0.95rem;
}

.forgot-link {
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
}

/* ---- RESPONSIVE ---- */
@media (max-width: 1023px) {
  .login-card {
    max-width: 720px;
  }

  .left-panel,
  .right-panel {
    padding: 32px 24px;
  }
}

@media (max-width: 599px) {
  .login-page {
    padding: 20px 16px;
  }

  .login-card {
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
