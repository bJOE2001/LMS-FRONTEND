<template>
  <q-layout
    view="hHh lpR fFf"
    class="layout-no-scroll"
    :class="[
      isDark ? 'bg-dark-page' : 'bg-grey-2',
      { 'drawer-open': leftDrawer && $q.screen.gt.sm, 'layout-ready': layoutReady },
    ]"
  >
    <!-- Side panel - full height, left -->
    <q-drawer
      v-model="leftDrawer"
      show-if-above
      :width="260"
      :breakpoint="599"
      side="left"
      behavior="default"
      class="side-panel-fixed text-white bg-primary"
    >
      <div class="side-panel-content">
        <div class="sidebar-header text-center">
          <img
            src="~src/assets/images/INSIDE LMS SYSTEM LOGO.png"
            alt="LMS Logo"
            class="sidebar-logo"
          />
        </div>
        <q-separator class="sidebar-divider" />
        <!-- HR Navigation List -->
        <q-list v-if="leaveStore.userRole === 'hr'" class="flex-grow scroll nav-list">
          <!-- Overview -->
          <q-item
            v-if="canAccessHrModule('dashboard')"
            clickable
            :active="route.path === '/hr/dashboard'"
            active-class="bg-primary-dark text-white text-weight-bold"
            to="/hr/dashboard"
            class="q-mx-sm q-mb-xs rounded-borders"
          >
            <q-item-section avatar>
              <q-icon name="dashboard" />
            </q-item-section>
            <q-item-section>Dashboard</q-item-section>
          </q-item>

          <!-- Leave Management (Collapsible Submenu) -->
          <q-expansion-item
            v-if="visibleHrLeaveNav.length > 0"
            v-model="hrLeaveMenuExpanded"
            icon="assignment"
            label="Leave Management"
            header-class="q-mx-sm q-mb-xs rounded-borders text-white nav-expansion-header"
            expand-icon-class="text-white opacity-80"
            :class="{ 'group-active': isHrLeaveRouteActive }"
            dense-toggle
          >
            <q-list class="q-pl-sm q-mb-xs">
              <q-item
                v-for="item in visibleHrLeaveNav"
                :key="item.path"
                clickable
                :active="route.path === item.path"
                active-class="bg-primary-dark text-white text-weight-bold"
                :to="item.path"
                class="q-mx-sm q-mb-xs rounded-borders nav-sub-item"
                dense
              >
                <q-item-section avatar class="min-avatar">
                  <q-icon :name="item.icon" size="19px" />
                </q-item-section>
                <q-item-section>{{ item.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-expansion-item>

          <!-- BIOMETRICS & TIME -->
          <template v-if="canAccessHrModule('employee_management')">
            <div class="nav-section-divider-wrapper">
              <q-separator class="nav-section-divider" />
              <div class="nav-section-label">BIOMETRICS & TIME</div>
            </div>

            <q-item
              clickable
              :active="route.path === '/hr/biometric-registration'"
              active-class="bg-primary-dark text-white text-weight-bold"
              to="/hr/biometric-registration"
              class="q-mx-sm q-mb-xs rounded-borders"
            >
              <q-item-section avatar>
                <q-icon name="fingerprint" />
              </q-item-section>
              <q-item-section>Biometric Registration</q-item-section>
            </q-item>

            <q-item
              clickable
              :active="route.path === '/hr/biometric-devices'"
              active-class="bg-primary-dark text-white text-weight-bold"
              to="/hr/biometric-devices"
              class="q-mx-sm q-mb-xs rounded-borders"
            >
              <q-item-section avatar>
                <q-icon name="devices" />
              </q-item-section>
              <q-item-section>Biometric Devices</q-item-section>
            </q-item>
          </template>

          <!-- ADMINISTRATION -->
          <template v-if="visibleHrAdminNav.length > 0">
            <div class="nav-section-divider-wrapper">
              <q-separator class="nav-section-divider" />
              <div class="nav-section-label">ADMINISTRATION</div>
            </div>

            <q-item
              v-for="item in visibleHrAdminNav"
              :key="item.path"
              clickable
              :active="route.path === item.path"
              active-class="bg-primary-dark text-white text-weight-bold"
              :to="item.path"
              class="q-mx-sm q-mb-xs rounded-borders"
            >
              <q-item-section avatar>
                <q-icon :name="item.icon" />
              </q-item-section>
              <q-item-section>{{ item.label }}</q-item-section>
            </q-item>
          </template>
        </q-list>

        <!-- Department / Office Admin Navigation List -->
        <q-list
          v-else-if="leaveStore.userRole === 'admin' || leaveStore.userRole === 'department_admin'"
          class="flex-grow scroll nav-list"
        >
          <!-- Overview -->
          <q-item
            clickable
            :active="route.path === '/admin/dashboard'"
            active-class="bg-primary-dark text-white text-weight-bold"
            to="/admin/dashboard"
            class="q-mx-sm q-mb-xs rounded-borders"
          >
            <q-item-section avatar>
              <q-icon name="dashboard" />
            </q-item-section>
            <q-item-section>Dashboard</q-item-section>
          </q-item>

          <!-- LEAVE MANAGEMENT -->
          <div class="nav-section-divider-wrapper">
            <q-separator class="nav-section-divider" />
            <div class="nav-section-label">LEAVE MANAGEMENT</div>
          </div>
          <q-item
            clickable
            :active="route.path === '/admin/applications'"
            active-class="bg-primary-dark text-white text-weight-bold"
            to="/admin/applications"
            class="q-mx-sm q-mb-xs rounded-borders"
          >
            <q-item-section avatar>
              <q-icon name="assignment" />
            </q-item-section>
            <q-item-section>Applications</q-item-section>
          </q-item>

          <!-- TIME & ATTENDANCE -->
          <div class="nav-section-divider-wrapper">
            <q-separator class="nav-section-divider" />
            <div class="nav-section-label">TIME & ATTENDANCE</div>
          </div>
          <q-item
            clickable
            :active="route.path === '/admin/attendance'"
            active-class="bg-primary-dark text-white text-weight-bold"
            to="/admin/attendance"
            class="q-mx-sm q-mb-xs rounded-borders"
          >
            <q-item-section avatar>
              <q-icon name="co_present" />
            </q-item-section>
            <q-item-section>Attendance Management</q-item-section>
          </q-item>

          <!-- ADMINISTRATION -->
          <div class="nav-section-divider-wrapper">
            <q-separator class="nav-section-divider" />
            <div class="nav-section-label">ADMINISTRATION</div>
          </div>
          <q-item
            clickable
            :active="route.path === '/admin/employees'"
            active-class="bg-primary-dark text-white text-weight-bold"
            to="/admin/employees"
            class="q-mx-sm q-mb-xs rounded-borders"
          >
            <q-item-section avatar>
              <q-icon name="groups" />
            </q-item-section>
            <q-item-section>Employee Management</q-item-section>
          </q-item>
        </q-list>
        <div class="q-pa-md side-panel-footer">
          <div class="text-caption opacity-80">© LMS - 2026</div>
        </div>
      </div>
    </q-drawer>

    <!-- Minimal header slot so layout structure is valid (drawer toggle works) -->
    <q-header class="layout-header-invisible">
      <q-toolbar style="min-height: 0; height: 0" />
    </q-header>

    <!-- Content area: header + page (only this area scrolls) -->
    <q-page-container class="layout-main-content" :class="isDark ? 'bg-dark-page' : 'bg-grey-2'">
      <!-- Header - sticky, only in content area to the right of side panel -->
      <div
        ref="navbarRef"
        class="layout-content-header row items-center q-py-sm"
        :class="isDark ? 'bg-dark navbar-dark' : 'bg-white'"
      >
        <q-btn flat dense round icon="menu" @click="leftDrawer = !leftDrawer" aria-label="Menu" />
        <q-space />
        <q-btn flat round dense icon="help" to="/help">
          <q-tooltip>Help</q-tooltip>
        </q-btn>
        <q-btn
          flat
          round
          dense
          icon="notifications"
          :color="isNotificationsPage ? 'primary' : undefined"
          :aria-current="isNotificationsPage ? 'page' : undefined"
        >
          <q-badge v-if="notifStore.hasUnread" color="negative" floating rounded>
            {{ notifStore.unreadCount }}
          </q-badge>
          <q-tooltip v-if="isNotificationsPage">You're already on Notifications</q-tooltip>
          <q-menu
            v-if="!isNotificationsPage"
            ref="notifMenuRef"
            anchor="bottom end"
            self="top end"
            :offset="[0, 8]"
            transition-show="scale"
            transition-hide="scale"
            class="notif-menu-wrapper"
            @before-show="notifStore.fetchNotifications()"
          >
            <NotificationPanel
              :on-view-all="closeNotifMenuAndGoToNotifications"
              :on-notification-navigate="closeNotifMenu"
            />
          </q-menu>
        </q-btn>
        <q-btn flat round dense>
          <q-avatar size="32px" color="primary" text-color="white" icon="person" />
          <q-menu auto-close>
            <q-list style="min-width: 220px">
              <q-item>
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ userDisplayName }}</q-item-label>
                  <q-item-label caption>{{ authStore.user?.username }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator />
              <q-item v-if="leaveStore.userRole === 'hr' && canAccessHrModule('leave_types')" clickable to="/hr/leave-types">
                <q-item-section avatar><q-icon name="playlist_add" /></q-item-section>
                <q-item-section>Leave Types</q-item-section>
              </q-item>
              <q-item v-if="leaveStore.userRole === 'hr' && canAccessHrModule('office_library')" clickable to="/hr/departments-library">
                <q-item-section avatar><q-icon name="apartment" /></q-item-section>
                <q-item-section>Office Library</q-item-section>
              </q-item>
              <q-item v-if="leaveStore.userRole === 'hr' && canAccessHrModule('illness_library')" clickable to="/hr/illness-library">
                <q-item-section avatar><q-icon name="medical_services" /></q-item-section>
                <q-item-section>Illness Library</q-item-section>
              </q-item>
              <q-item v-if="leaveStore.userRole === 'hr' && canAccessHrModule('work_schedules')" clickable to="/hr/work-schedules">
                <q-item-section avatar><q-icon name="schedule" /></q-item-section>
                <q-item-section>Work Schedules</q-item-section>
              </q-item>
              <q-item v-if="leaveStore.userRole === 'hr' && canAccessHrModule('signatories')" clickable to="/hr/signatories">
                <q-item-section avatar><q-icon name="draw" /></q-item-section>
                <q-item-section>Signatories</q-item-section>
              </q-item>
              <q-item v-if="leaveStore.userRole === 'hr' && canAccessHrModule('access_control')" clickable to="/hr/access-control">
                <q-item-section avatar><q-icon name="admin_panel_settings" /></q-item-section>
                <q-item-section>Access Control</q-item-section>
              </q-item>
              <q-item v-if="['admin', 'department_admin', 'guest_admin', 'hr'].includes(leaveStore.userRole)" clickable :to="leaveStore.userRole === 'hr' ? '/hr/print-logs' : '/admin/print-logs'">
                <q-item-section avatar><q-icon name="print" /></q-item-section>
                <q-item-section>Print Logs</q-item-section>
              </q-item>
              <q-item clickable to="/settings">
                <q-item-section avatar><q-icon name="settings" /></q-item-section>
                <q-item-section>Settings</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable class="text-negative" @click="confirmLogout">
                <q-item-section avatar><q-icon name="logout" /></q-item-section>
                <q-item-section>Logout</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
      <router-view />
    </q-page-container>

    <!-- Logout dialog -->
    <q-dialog v-model="logoutDialog" persistent>
      <q-card class="logout-card">
        <q-card-section class="text-center q-pt-xl q-pb-none">
          <q-avatar size="64px" class="logout-avatar">
            <q-icon name="logout" size="32px" />
          </q-avatar>
          <div class="text-h6 q-mt-md">Sign out of LMS?</div>
          <div class="text-subtitle2 text-grey-7 q-mt-xs">
            You’ll be logged out from the Leave Management System. You can sign back in anytime
            using your account.
          </div>
        </q-card-section>
        <q-card-actions align="around" class="q-pt-lg q-pb-md">
          <q-btn flat color="grey-7" label="Stay signed in" class="q-px-md" v-close-popup />
          <q-btn
            unelevated
            color="negative"
            label="Logout"
            icon="logout"
            class="q-px-md"
            @click="doLogout"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useLeaveStore } from 'stores/leave-store'
import { useAuthStore } from 'stores/auth-store'
import { useNotificationStore } from 'stores/notification-store'
import { api } from 'boot/axios'
import NotificationPanel from 'components/NotificationPanel.vue'
import { hrUserHasModuleAccess } from 'src/utils/hr-module-access'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const leaveStore = useLeaveStore()
const authStore = useAuthStore()
const notifStore = useNotificationStore()

const leftDrawer = ref($q.screen.gt.sm)
const logoutDialog = ref(false)
const layoutReady = ref(false)
const navbarRef = ref(null)
const notifMenuRef = ref(null)
let navbarObserver = null

function closeNotifMenuAndGoToNotifications() {
  notifMenuRef.value?.hide()
}

function closeNotifMenu() {
  notifMenuRef.value?.hide()
}

const isDark = computed(() => $q.dark.isActive)
const isNotificationsPage = computed(() => route.name === 'notifications')

// When authenticated, refresh user from API so department_admin gets department_id/department
// only when local auth payload is missing. Avoid refetching on every route mount.
onMounted(async () => {
  const shouldRefreshUser =
    authStore.isAuthenticated &&
    authStore.getToken() &&
    (!authStore.user ||
      (authStore.user?.role === 'hr' && !Array.isArray(authStore.user?.hr_module_access)))

  if (shouldRefreshUser) {
    try {
      const { data } = await api.get('/me')
      if (data.user) {
        authStore.setAuth({ token: authStore.getToken(), user: data.user })
      }
    } catch {
      // 401 will be handled by axios interceptor
    }
  }
  notifStore.fetchUnreadCount()
  nextTick(() => {
    setTimeout(() => {
      layoutReady.value = true
    }, 50)
    // Sync sidebar header height with the navbar
    if (navbarRef.value) {
      const syncHeight = () => {
        const h = navbarRef.value?.offsetHeight
        if (h) document.documentElement.style.setProperty('--navbar-height', h + 'px')
      }
      syncHeight()
      navbarObserver = new ResizeObserver(syncHeight)
      navbarObserver.observe(navbarRef.value)
    }
  })
})

onBeforeUnmount(() => {
  if (navbarObserver) navbarObserver.disconnect()
})

const hrLeaveNav = [
  { path: '/hr/applications', label: 'Applications', icon: 'assignment', moduleKey: 'applications' },
  { path: '/hr/receiving', label: 'Receiving Application', icon: 'move_to_inbox', moduleKey: 'receiving' },
  { path: '/hr/releasing', label: 'Releasing Application', icon: 'outbox', moduleKey: 'releasing' },
  { path: '/hr/application-edit-requests', label: 'Edit Requests', icon: 'edit_note', moduleKey: 'applications', ownerOnly: true },
  { path: '/hr/coc-applications', label: 'COC Applications', icon: 'assignment_turned_in', moduleKey: 'coc_applications' },
]

const hrAdminNav = [
  { path: '/hr/employees', label: 'Employee Management', icon: 'groups', moduleKey: 'employee_management' },
  { path: '/hr/user-management', label: 'User Management', icon: 'manage_accounts', moduleKey: 'user_management' },
  { path: '/hr/reports', label: 'Reports & Monitoring', icon: 'bar_chart', moduleKey: 'reports_monitoring' },
]

function canAccessHrModule(moduleKey) {
  return hrUserHasModuleAccess(authStore.user, moduleKey)
}

const visibleHrLeaveNav = computed(() => {
  return hrLeaveNav.filter((item) => {
    if (item.ownerOnly && !authStore.user?.is_access_control_owner) return false
    return canAccessHrModule(item.moduleKey)
  })
})

const visibleHrAdminNav = computed(() => {
  return hrAdminNav.filter((item) => {
    if (item.ownerOnly && !authStore.user?.is_access_control_owner) return false
    return canAccessHrModule(item.moduleKey)
  })
})

const isHrLeaveRouteActive = computed(() => {
  return hrLeaveNav.some((item) => route.path.startsWith(item.path))
})

const hrLeaveMenuExpanded = ref(false)

// Auto-expand Leave Management whenever navigating to any leave screen
watch(
  () => route.path,
  (newPath) => {
    if (hrLeaveNav.some((item) => newPath.startsWith(item.path))) {
      hrLeaveMenuExpanded.value = true
    }
  },
  { immediate: true }
)

const userDisplayName = computed(() => {
  const user = authStore.user
  const fullName = String(user?.name || '').trim()
  return fullName !== '' ? fullName : 'User'
})

function confirmLogout() {
  logoutDialog.value = true
}

async function doLogout() {
  try {
    await api.post('/logout')
  } catch {
    // ignore if token already invalid
  }
  authStore.clearAuth()
  leaveStore.setUserRole(null)
  notifStore.clearAll()
  $q.notify({
    type: 'positive',
    message: 'Logged out successfully!',
    position: 'top',
    timeout: 3000,
    actions: [{ label: 'OK', color: 'white' }],
  })
  router.push('/login')
}
</script>

<style scoped>
.bg-primary-dark {
  background: rgba(255, 255, 255, 0.15);
}
.layout-header-invisible {
  height: 0;
  min-height: 0;
  overflow: hidden;
  box-shadow: none;
}
.layout-content-header {
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
  padding-left: 16px;
  padding-right: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}
.navbar-dark {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}
.bg-dark-page {
  background-color: #121212;
}
/* Layout: only main content scrolls, sidebar is fixed */
.layout-no-scroll {
  height: 100vh;
  overflow: hidden;
}
.layout-main-content {
  overflow-y: auto;
  overflow-x: hidden;
  height: 100vh;
  min-width: 0;
  transition: none !important;
}

/* Standard sidebar: fixed drawer + synced content offset */
@media (min-width: 600px) {
  .layout-no-scroll :deep(.q-drawer) {
    position: fixed !important;
    top: 0;
    left: 0;
    height: 100vh !important;
    z-index: 200;
    transition: none !important;
  }
  .layout-no-scroll.layout-ready :deep(.q-drawer) {
    transition: transform 0.2s ease !important;
  }
  .layout-ready .layout-main-content {
    transition: padding-left 0.2s ease !important;
  }

  .layout-no-scroll :deep(.q-drawer__backdrop) {
    display: none !important;
  }
}

/* Phone: let Quasar handle the drawer as an overlay natively */
@media (max-width: 599px) {
  .layout-no-scroll :deep(.q-drawer) {
    z-index: 3000;
  }
}
.side-panel-fixed {
  height: 100vh !important;
}
.side-panel-content {
  height: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.side-panel-footer {
  flex-shrink: 0;
  margin-top: auto;
}
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(var(--navbar-height, 52px) - 1px);
  padding: 0 16px;
  box-sizing: border-box;
  flex-shrink: 0;
}
.sidebar-divider {
  background: rgba(255, 255, 255, 0.25);
  margin: 0 0 8px 0;
}
.sidebar-logo {
  width: 150px;
  /* max-width: 200px;
  max-height: 36px; */
  height: auto;
}
.logout-card {
  min-width: 340px;
  max-width: 420px;
  border-radius: 2px;
  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.25);
}
.logout-avatar {
  margin-top: 0;
  background: var(--q-primary);
  color: white;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18);
}

/* Sidebar Navigation Enhancements */
.nav-list {
  padding-top: 2px;
  padding-bottom: 8px;
}

:deep(.nav-expansion-header) {
  min-height: 40px;
  padding: 0 16px;
  transition: background-color 0.2s ease;
}

:deep(.nav-expansion-header:hover) {
  background: rgba(255, 255, 255, 0.1);
}

.group-active :deep(.nav-expansion-header) {
  background: rgba(255, 255, 255, 0.14);
  font-weight: 600;
}

.nav-sub-item {
  min-height: 36px;
  font-size: 0.86rem;
  transition: background-color 0.15s ease;
}

.nav-sub-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.min-avatar {
  min-width: 32px;
  padding-right: 8px;
}

.nav-section-divider-wrapper {
  padding: 10px 16px 4px 16px;
}

.nav-section-divider {
  background: rgba(255, 255, 255, 0.18);
  margin-bottom: 6px;
}

.nav-section-label {
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.65);
  text-transform: uppercase;
}
</style>

<style>
.notif-menu-wrapper {
  border-radius: 12px !important;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12) !important;
  overflow: hidden;
}

@media (max-width: 600px) {
  .notif-menu-wrapper {
    width: calc(100vw - 12px) !important;
    max-width: calc(100vw - 12px) !important;
    border-radius: 16px !important;
  }
}
</style>
