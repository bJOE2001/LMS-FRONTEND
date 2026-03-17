<template>
  <q-page class="login-page flex flex-center">
    <!-- Centered Card -->
    <q-card class="login-card" flat>
      <div class="row no-wrap card-row">
        <!-- LEFT SIDE: Logo / Image (hidden on mobile) -->
        <div class="col-md-6 left-panel flex flex-center gt-sm">
          <!-- <div class="left-content text-center">
            <img
              src="~src/assets/images/LEAVE-MONITORING-SYSTEM-LOGO WHITE.png"
              alt="LMS Logo"
              class="brand-image"
            />
            <p class="text-white-7 text-body2 brand-subtitle">
              Streamline your leave requests, approvals, and tracking — all in one place.
            </p>
          </div> -->
        </div>

        <!-- RIGHT SIDE: Login Form -->
        <div class="col-12 col-md-6 right-panel flex flex-center">
          <div class="form-wrapper">
            <div class="login-header q-mb-lg">
              <div class="login-logo">
                <img
                  src="~src/assets/images/LEAVE-MONITORING-SYSTEM-LOGO copy.png"
                  alt="LMS Logo"
                  class="login-logo-img"
                />  
              </div>
              <h5 class="q-mt-md q-mb-xs text-weight-bold text-dark">Welcome back</h5>
              <p class="text-grey-6 q-mb-none text-body2">Sign in to your LMS account</p>
            </div>

            <q-form class="q-gutter-y-md" @submit.prevent="onSubmit">
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
                <a
                  href="#"
                  class="text-primary text-body2 text-weight-medium forgot-link"
                  @click.prevent="forgotPasswordDialog = true"
                >
                  Forgot password?
                </a>
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
                <a
                  href="#"
                  class="text-primary text-weight-medium forgot-link"
                  @click.prevent="contactAdminDialog = true"
                >
                Please go to the HR Office 
                </a>
              </p>
            </div>

            <!-- Forgot password info (UI only) -->
            <q-dialog v-model="forgotPasswordDialog" persistent>
              <q-card style="width: 520px; max-width: 92vw; border-radius: 12px">
                <q-card-section class="row items-center q-pb-none">
                  <div class="text-h6 text-weight-bold">Password reset</div>
                  <q-space />
                  <q-btn icon="close" flat round dense v-close-popup aria-label="Close" />
                </q-card-section>

                <q-card-section class="q-pt-sm">
                  <div class="text-body1 text-grey-9">
                    Online password reset is not available for this system.
                  </div>
                  <div class="text-body2 text-grey-7 q-mt-sm">
                    To reset your password, please go to the <span class="text-weight-medium">HR Office</span>.
                  </div>

                  <q-separator class="q-my-md" />

                  <div class="text-body2 text-grey-8">
                    You may need the following:
                    <ul class="q-mt-sm q-mb-none">
                      <li>Your employee ID / company ID</li>
                      <li>A valid government or company-issued ID (if required)</li>
                      <li>Your department / position details (if requested)</li>
                    </ul>
                  </div>

                  <div class="text-body2 text-grey-8 q-mt-md">
                    HR Office details (edit as needed):
                    <ul class="q-mt-sm q-mb-none">
                      <li><span class="text-weight-medium">Location:</span> HR Office (Building/Room: ________)</li>
                      <li><span class="text-weight-medium">Office hours:</span> ________</li>
                      <li><span class="text-weight-medium">Contact:</span> ________</li>
                    </ul>
                  </div>
                </q-card-section>

                <q-card-actions align="right">
                  <q-btn color="primary" unelevated no-caps label="OK" v-close-popup />
                </q-card-actions>
              </q-card>
            </q-dialog>

            <!-- Contact administrator info (UI only) -->
            <q-dialog v-model="contactAdminDialog" persistent>
              <q-card style="width: 520px; max-width: 92vw; border-radius: 12px">
                <q-card-section class="row items-center q-pb-none">
                  <div class="text-h6 text-weight-bold">Request login credentials</div>
                  <q-space />
                  <q-btn icon="close" flat round dense v-close-popup aria-label="Close" />
                </q-card-section>

                <q-card-section class="q-pt-sm">
                  <div class="text-body1 text-grey-9">
                    Account creation / credential generation is handled by HR.
                  </div>
                  <div class="text-body2 text-grey-7 q-mt-sm">
                    Please go to the <span class="text-weight-medium">HR Office</span> and request your login credentials.
                  </div>

                  <q-separator class="q-my-md" />

                  <div class="text-body2 text-grey-8">
                    You may need the following:
                    <ul class="q-mt-sm q-mb-none">
                      <li>Your full name and employee ID / company ID</li>
                      <li>Your department / position</li>
                      <li>A valid government or company-issued ID (if required)</li>
                    </ul>
                  </div>

                  <div class="text-body2 text-grey-8 q-mt-md">
                    HR Office details (edit as needed):
                    <ul class="q-mt-sm q-mb-none">
                      <li><span class="text-weight-medium">Location:</span> HR Office (Building/Room: ________)</li>
                      <li><span class="text-weight-medium">Office hours:</span> ________</li>
                      <li><span class="text-weight-medium">Contact:</span> ________</li>
                    </ul>
                  </div>
                </q-card-section>

                <q-card-actions align="right">
                  <q-btn color="primary" unelevated no-caps label="OK" v-close-popup />
                </q-card-actions>
              </q-card>
            </q-dialog>
          </div>
        </div>
      </div>
    </q-card>
    <div class="login-footer text-center">
      &copy; 2026 Tagum City Hall. All Rights Reserved. |
      <router-link to="/development-team" class="login-footer-link">Development Team</router-link>
    </div>
  </q-page>

</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth-store'
import { useLeaveStore } from 'stores/leave-store'
import { api } from 'boot/axios'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const router = useRouter()
const leaveStore = useLeaveStore()
const $q = useQuasar()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const remember = ref(false)
const showPassword = ref(false)
const loading = ref(false)
const forgotPasswordDialog = ref(false)
const contactAdminDialog = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    console.log(api.defaults.baseURL)
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
    const route = data.redirect_to || data.dashboard_route || '/admin/dashboard'
    router.push(route)
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to sign in. Please check your credentials and try again.')
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
  padding-bottom: 72px;
  position: relative;
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
  position: relative;
  overflow: hidden;
  padding: 40px;
  background-image: url('../assets/images/City-Hall-of-Tagum.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

// .left-panel::before {
//   content: '';
//   position: absolute;
//   inset: 0;
//   background: linear-gradient(160deg, rgba(56, 142, 60, 0.75) 0%, rgba(27, 94, 32, 0.85) 100%);
//   z-index: 0;
// }

.left-panel::after {
  content: '';
  position: absolute;
  bottom: -60px;
  left: -60px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.04);
  z-index: 0;
}

.left-content {
  position: relative;
  z-index: 1;
}

.brand-image {
  max-width: 100%;
  max-height: 100%;
  width: 400px;
  height: auto;
  object-fit: contain;
  filter: none;
  border-radius: 20px;
  // outline: 1px solid white;
  padding: 20px;
  // background-color: white;
  box-shadow: rgba(255, 255, 255, 0.04);
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

.login-header {
  text-align: left;
}

.login-logo {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.login-logo-img {
  max-width: 240px;
  max-height: 120px;
  height: auto;
  object-fit: contain;
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

.login-footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 14px;
  padding: 0 12px;
  color: #607d8b;
  font-size: 0.85rem;
}

.login-footer-link {
  color: #2e7d32;
  font-weight: 600;
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
    padding: 20px 16px 78px;
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

  .login-footer {
    bottom: 10px;
    font-size: 0.8rem;
  }
}
</style>
