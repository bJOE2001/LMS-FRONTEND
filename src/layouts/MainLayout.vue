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
        <div class="sidebar-header">
          <div class="sidebar-logo-wrap">
            <img
              src="~src/assets/images/CityOfTagumLogo.png"
              alt="City of Tagum Seal"
              class="sidebar-logo"
            />
          </div>
          <div class="sidebar-brand-text">
            <span class="sidebar-brand-tag">CITY OF TAGUM</span>
            <span class="sidebar-brand-title">Attendance &amp; Leave</span>
            <span class="sidebar-brand-subtitle">Management System</span>
          </div>
        </div>
        <q-separator class="sidebar-divider" />

        <!-- HR Navigation List -->
        <q-list v-if="leaveStore.userRole === 'hr'" class="flex-grow scroll nav-list">
          <!-- Overview -->
          <q-item
            v-if="canAccessHrModule('dashboard')"
            clickable
            :active="route.path === '/hr/dashboard'"
            active-class="nav-item-active text-white text-weight-bold"
            to="/hr/dashboard"
            class="nav-item q-mx-sm q-mb-xs rounded-borders"
          >
            <q-item-section avatar class="nav-item-avatar">
              <q-icon name="dashboard" size="20px" />
            </q-item-section>
            <q-item-section class="nav-item-label">Dashboard</q-item-section>
          </q-item>

          <!-- LEAVE MANAGEMENT (Collapsible Submenu with Tree Rail) -->
          <template v-if="visibleHrLeaveNav.length > 0">


            <q-expansion-item
              v-model="hrLeaveMenuExpanded"
              icon="event_note"
              label="Leave Management"
              header-class="q-mx-sm q-mb-xs rounded-borders text-white nav-expansion-header"
              expand-icon-class="text-white opacity-80"
              :class="{ 'group-active': isHrLeaveRouteActive }"
              dense-toggle
            >
              <q-list class="nav-sub-tree q-mb-xs">
                <q-item
                  v-for="item in visibleHrLeaveNav"
                  :key="item.path"
                  clickable
                  :active="route.path === item.path"
                  active-class="nav-sub-item-active text-white text-weight-bold"
                  :to="item.path"
                  class="q-mb-xs rounded-borders nav-sub-item"
                  dense
                >
                  <q-item-section avatar class="min-avatar">
                    <q-icon :name="item.icon" size="18px" />
                  </q-item-section>
                  <q-item-section class="nav-sub-label">{{ item.label }}</q-item-section>
                </q-item>
              </q-list>
            </q-expansion-item>
          </template>

          <!-- BIOMETRICS & TIME -->
          <template v-if="canAccessHrModule('employee_management')">


            <q-item
              clickable
              :active="route.path === '/hr/biometric-devices'"
              active-class="nav-item-active text-white text-weight-bold"
              to="/hr/biometric-devices"
              class="nav-item q-mx-sm q-mb-xs rounded-borders"
            >
              <q-item-section avatar class="nav-item-avatar">
                <q-icon name="devices" size="20px" />
              </q-item-section>
              <q-item-section class="nav-item-label">Biometric Devices</q-item-section>
            </q-item>
          </template>

          <!-- ADMINISTRATION -->
          <template v-if="visibleHrAdminNav.length > 0">


            <q-item
              v-for="item in visibleHrAdminNav"
              :key="item.path"
              clickable
              :active="route.path.startsWith(item.path)"
              active-class="nav-item-active text-white text-weight-bold"
              :to="item.path"
              class="nav-item q-mx-sm q-mb-xs rounded-borders"
            >
              <q-item-section avatar class="nav-item-avatar">
                <q-icon :name="item.icon" size="20px" />
              </q-item-section>
              <q-item-section class="nav-item-label">{{ item.label }}</q-item-section>
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
            active-class="nav-item-active text-white text-weight-bold"
            to="/admin/dashboard"
            class="nav-item q-mx-sm q-mb-xs rounded-borders"
          >
            <q-item-section avatar class="nav-item-avatar">
              <q-icon name="dashboard" size="20px" />
            </q-item-section>
            <q-item-section class="nav-item-label">Dashboard</q-item-section>
          </q-item>


          <q-item
            clickable
            :active="route.path === '/admin/applications'"
            active-class="nav-item-active text-white text-weight-bold"
            to="/admin/applications"
            class="nav-item q-mx-sm q-mb-xs rounded-borders"
          >
            <q-item-section avatar class="nav-item-avatar">
              <q-icon name="assignment" size="20px" />
            </q-item-section>
            <q-item-section class="nav-item-label">Applications</q-item-section>
          </q-item>


          <q-item
            clickable
            :active="route.path === '/admin/attendance'"
            active-class="nav-item-active text-white text-weight-bold"
            to="/admin/attendance"
            class="nav-item q-mx-sm q-mb-xs rounded-borders"
          >
            <q-item-section avatar class="nav-item-avatar">
              <q-icon name="co_present" size="20px" />
            </q-item-section>
            <q-item-section class="nav-item-label">Attendance</q-item-section>
          </q-item>


          <q-item
            clickable
            :active="route.path === '/admin/employees'"
            active-class="nav-item-active text-white text-weight-bold"
            to="/admin/employees"
            class="nav-item q-mx-sm q-mb-xs rounded-borders"
          >
            <q-item-section avatar class="nav-item-avatar">
              <q-icon name="groups" size="20px" />
            </q-item-section>
            <q-item-section class="nav-item-label">Employee Management</q-item-section>
          </q-item>
        </q-list>

        <div class="q-px-md q-py-sm side-panel-footer row items-center justify-between">
          <span class="text-caption opacity-80">© ALMS - 2026</span>
          <span class="sidebar-role-pill">
            {{ leaveStore.userRole === 'hr' ? 'HR Portal' : 'Dept. Admin' }}
          </span>
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
              <q-item v-if="leaveStore.userRole === 'hr'" clickable to="/hr/libraries">
                <q-item-section avatar><q-icon name="collections_bookmark" /></q-item-section>
                <q-item-section>Libraries</q-item-section>
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
  { path: '/hr/receiving', label: 'Receiving', icon: 'move_to_inbox', moduleKey: 'receiving' },
  { path: '/hr/releasing', label: 'Releasing', icon: 'outbox', moduleKey: 'releasing' },
  { path: '/hr/application-edit-requests', label: 'Edit Requests', icon: 'edit_note', moduleKey: 'applications', ownerOnly: true },
  { path: '/hr/cancelled-applications', label: 'Cancelled Applications', icon: 'event_busy', moduleKey: 'cancelled_applications' },
  { path: '/hr/coc-applications', label: 'COC Applications', icon: 'assignment_turned_in', moduleKey: 'coc_applications' },
]

const LIBRARY_MODULE_KEYS = [
  'leave_types',
  'office_library',
  'illness_library',
  'work_schedules',
  'signatories',
]

function canAccessAnyLibrary() {
  return LIBRARY_MODULE_KEYS.some((key) => canAccessHrModule(key))
}

const hrAdminNav = [
  { path: '/hr/employees', label: 'Employee Management', icon: 'groups', moduleKey: 'employee_management' },
  { path: '/hr/user-management', label: 'User Management', icon: 'manage_accounts', moduleKey: 'user_management' },
  { path: '/hr/reports', label: 'Reports & Monitoring', icon: 'bar_chart', moduleKey: 'reports_monitoring' },
  { path: '/hr/libraries', label: 'Libraries & Schedules', icon: 'collections_bookmark', customCheck: canAccessAnyLibrary },
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
    if (typeof item.customCheck === 'function') return item.customCheck()
    if (!item.moduleKey) return true
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
  border-top: 1px solid rgba(255, 255, 255, 0.14);
}
.sidebar-role-pill {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.92);
}
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  height: calc(var(--navbar-height, 58px) - 1px);
  min-height: 58px;
  padding: 0 14px;
  box-sizing: border-box;
  flex-shrink: 0;
  overflow: hidden;
}
.sidebar-logo-wrap {
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sidebar-brand-text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  line-height: 1.15;
  color: #ffffff;
}
.sidebar-brand-tag {
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #facc15;
  text-transform: uppercase;
  line-height: 1;
  margin-bottom: 2px;
}
.sidebar-brand-title {
  font-size: 0.84rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  white-space: nowrap;
}
.sidebar-brand-subtitle {
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.88);
  white-space: nowrap;
}
.sidebar-divider {
  background: rgba(255, 255, 255, 0.2);
  margin: 0 0 8px 0;
}
.sidebar-logo {
  height: 100%;
  width: 100%;
  object-fit: contain;
  display: block;
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
  padding-top: 4px;
  padding-bottom: 10px;
}

.nav-item {
  position: relative;
  min-height: 40px;
  padding: 0 14px;
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.18s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.nav-item-avatar,
:deep(.nav-expansion-header .q-item__section--avatar) {
  min-width: 34px !important;
  padding-right: 10px !important;
}

.nav-item-active {
  background: rgba(255, 255, 255, 0.17) !important;
  color: #ffffff !important;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}

.nav-item-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3.5px;
  border-radius: 0 4px 4px 0;
  background: #ffffff;
}

:deep(.nav-expansion-header) {
  min-height: 40px;
  padding: 0 14px;
  font-size: 0.9rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  transition: background-color 0.2s ease;
}

:deep(.nav-expansion-header:hover) {
  background: rgba(255, 255, 255, 0.1);
}

.group-active :deep(.nav-expansion-header) {
  background: rgba(255, 255, 255, 0.13);
  font-weight: 700;
  color: #ffffff;
}

.nav-sub-tree {
  margin-left: 24px;
  margin-right: 8px;
  padding-left: 10px;
  border-left: 1.5px solid rgba(255, 255, 255, 0.22);
}

.nav-sub-item {
  position: relative;
  min-height: 35px;
  padding: 0 10px;
  font-size: 0.84rem;
  color: rgba(255, 255, 255, 0.84);
  transition: all 0.15s ease;
}

.nav-sub-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.nav-sub-item-active {
  background: rgba(255, 255, 255, 0.18) !important;
  color: #ffffff !important;
}

.nav-sub-item-active::before {
  content: '';
  position: absolute;
  left: -11.5px;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 3px;
  background: #ffffff;
}

.min-avatar {
  min-width: 28px !important;
  padding-right: 8px !important;
}

.nav-section-divider-wrapper {
  padding: 10px 16px 4px 16px;
}

.nav-section-divider {
  background: rgba(255, 255, 255, 0.16);
  margin-bottom: 6px;
}

.nav-section-label {
  font-size: 0.67rem;
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
