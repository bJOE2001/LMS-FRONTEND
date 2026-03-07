<template>
  <q-layout view="hHh lpR fFf" class="bg-grey-2 layout-no-scroll" :class="{ 'drawer-open': leftDrawer && $q.screen.gt.sm, 'layout-ready': layoutReady }">
    <!-- Side panel - full height, left -->
    <q-drawer
      v-model="leftDrawer"
      show-if-above
      :width="260"
      side="left"
      behavior="default"
      class="side-panel-fixed bg-primary text-white"
    >
      <div class="side-panel-content">
        <div class="sidebar-header text-center">
          <img
            src="~src/assets/images/LMSdashboardlogo.png"
            alt="LMS Logo"
            class="sidebar-logo"
          />
        </div>
        <q-separator class="sidebar-divider" />
        <q-list class="flex-grow">
          <q-item
            v-for="item in navItems"
            :key="item.path"
            clickable
            :active="route.path === item.path"
            active-class="bg-primary-dark text-white"
            :to="item.path"
            class="q-mx-sm q-mb-xs rounded-borders"
          >
            <q-item-section avatar>
              <q-icon :name="item.icon" />
            </q-item-section>
            <q-item-section>{{ item.label }}</q-item-section>
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
    <q-page-container class="bg-grey-2 layout-main-content">
      <!-- Header - sticky, only in content area to the right of side panel -->
      <div ref="navbarRef" class="layout-content-header row items-center q-py-sm bg-white">
        <q-btn
          flat
          dense
          round
          icon="menu"
          @click="leftDrawer = !leftDrawer"
          aria-label="Menu"
        />
        <q-space />
        <q-btn flat round dense icon="help" to="/help">
          <q-tooltip>Help</q-tooltip>
        </q-btn>
        <q-btn flat round dense icon="notifications">
          <q-badge v-if="notifStore.hasUnread" color="negative" floating rounded>
            {{ notifStore.unreadCount }}
          </q-badge>
          <q-menu
            anchor="bottom end"
            self="top end"
            :offset="[0, 8]"
            transition-show="scale"
            transition-hide="scale"
            class="notif-menu-wrapper"
            @before-show="notifStore.fetchNotifications()"
          >
            <NotificationPanel />
          </q-menu>
        </q-btn>
        <q-btn flat round dense>
          <q-avatar size="32px" color="primary" text-color="white" icon="person" />
          <q-menu auto-close>
            <q-list style="min-width: 220px" class="text-dark">
              <q-item>
                <q-item-section>
                  <q-item-label class="text-weight-medium text-dark">{{ authStore.user?.name || 'User' }}</q-item-label>
                  <q-item-label caption class="text-dark">{{ authStore.user?.username }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable to="/settings" class="text-dark">
                <q-item-section avatar><q-icon name="settings" class="text-dark" /></q-item-section>
                <q-item-section class="text-dark">Settings</q-item-section>
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
            You’ll be logged out from the Leave Monitoring System.  
            You can sign back in anytime using your account.
          </div>
        </q-card-section>
        <q-card-actions align="around" class="q-pt-lg q-pb-md">
          <q-btn
            flat
            color="grey-7"
            label="Stay signed in"
            class="q-px-md"
            v-close-popup
          />
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
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useLeaveStore } from 'stores/leave-store'
import { useAuthStore } from 'stores/auth-store'
import { useNotificationStore } from 'stores/notification-store'
import { api } from 'boot/axios'
import NotificationPanel from 'components/NotificationPanel.vue'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const leaveStore = useLeaveStore()
const authStore = useAuthStore()
const notifStore = useNotificationStore()

const leftDrawer = ref(true)
const logoutDialog = ref(false)
const layoutReady = ref(false)
const navbarRef = ref(null)
let navbarObserver = null

// When authenticated, refresh user from API so department_admin gets department_id/department
// (avoids stale localStorage from before we added those fields)
onMounted(async () => {
  if (authStore.isAuthenticated && authStore.getToken()) {
    try {
      const { data } = await api.get('/me')
      if (data.user) {
        authStore.setAuth({ token: authStore.getToken(), user: data.user })
        leaveStore.setUserRole(data.user.role)
      }
    } catch {
      // 401 will be handled by axios interceptor
    }
  }
  notifStore.fetchNotifications()
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

const employeeNav = [
  { path: '/employee/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/employee/apply-leave', label: 'Apply Leave', icon: 'description' },
  { path: '/employee/leave-history', label: 'Leave History', icon: 'history' },
]
const adminNav = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/admin/employees', label: 'Employee Management', icon: 'groups' },
  { path: '/admin/reports', label: 'Reports', icon: 'bar_chart' },
]
const hrNav = [
  { path: '/hr/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/hr/employees', label: 'Employee Management', icon: 'groups' },
  { path: '/hr/calendar', label: 'Calendar', icon: 'calendar_today' },
  { path: '/hr/reports', label: 'Reports & Monitoring', icon: 'bar_chart' },
  { path: '/hr/forecasting', label: 'Attrition Forecast', icon: 'trending_down' },
]

const navItems = computed(() => {
  if (leaveStore.userRole === 'employee') return employeeNav
  // HR dashboard and menu are for role 'hr' only
  if (leaveStore.userRole === 'hr') return hrNav
  // Admin and department_admin see the admin menu (not HR)
  if (leaveStore.userRole === 'admin' || leaveStore.userRole === 'department_admin') return adminNav
  return employeeNav
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
  $q.notify({ type: 'positive',
  message: 'Logged out successfully!',
  position: 'top',
  timeout: 3000,
  actions: [
    { label: 'OK', color: 'white' }
  ]
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

/* Desktop only: fixed sidebar + synced transitions */
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
}

/* Mobile: let Quasar handle drawer as overlay natively */
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
  width: auto;
  max-width: 160px;
  max-height: 36px;
  height: auto;
}
.logout-card {
  min-width: 340px;
  max-width: 420px;
  border-radius: 20px;
  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.25);
}
.logout-avatar {
  margin-top: 0;
  background: var(--q-primary);
  color: white;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18);
}
</style>

<style>
.notif-menu-wrapper {
  border-radius: 12px !important;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12) !important;
  overflow: hidden;
}
</style>
