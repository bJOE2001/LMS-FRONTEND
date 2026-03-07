import { defineRouter } from '#q-app/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import { LoadingBar } from 'quasar'
import routes from './routes'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

const ROLE_DASHBOARDS = {
  admin: '/admin/dashboard',
  department_admin: '/admin/dashboard',
  hr: '/hr/dashboard',
}

// Routes that require a specific role (path prefix -> allowed roles)
const HR_PREFIX = '/hr'
const ADMIN_PREFIX = '/admin'
const ROLE_ROUTES = [
  { prefix: HR_PREFIX, roles: ['hr'] },
  { prefix: ADMIN_PREFIX, roles: ['admin', 'department_admin'] },
]

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  Router.beforeEach((to, from, next) => {
    LoadingBar.start()

    const token = localStorage.getItem('lms_token')
    const user = JSON.parse(localStorage.getItem('lms_user') || 'null')
    const isAuth = !!token
    const hasSupportedRole = !!(user?.role && ROLE_DASHBOARDS[user.role])

    if (to.path === '/login') {
      if (isAuth && hasSupportedRole) {
        next(ROLE_DASHBOARDS[user.role])
      } else if (isAuth && user?.role && !hasSupportedRole) {
        // Session belongs to a role no longer supported by frontend routes.
        localStorage.removeItem('lms_token')
        localStorage.removeItem('lms_user')
        next()
      } else {
        next()
      }
      return
    }

    if (to.meta.requiresAuth && !isAuth) {
      next('/login')
      return
    }

    // Restrict routes by role: /hr/* only for hr, /admin/* for admin/department_admin
    if (isAuth && user?.role) {
      const path = to.path
      for (const { prefix, roles } of ROLE_ROUTES) {
        if (path.startsWith(prefix) && !roles.includes(user.role)) {
          next(ROLE_DASHBOARDS[user.role] || '/login')
          return
        }
      }
    }

    next()
  })

  Router.afterEach(() => {
    // Small delay so the bar animation is visible even on fast transitions
    setTimeout(() => {
      LoadingBar.stop()
    }, 300)
  })

  return Router
})

