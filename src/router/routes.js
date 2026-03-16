const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/login' },

      // Admin
      { path: 'admin/dashboard', name: 'admin-dashboard', component: () => import('pages/admin/AdminDashboard.vue') },
      { path: 'admin/applications', name: 'admin-applications', component: () => import('pages/admin/AdminApplicationsPage.vue') },
      { path: 'admin/employees', name: 'admin-employees', component: () => import('pages/admin/AdminEmployees.vue') },
      { path: 'admin/review/:id', name: 'admin-review', component: () => import('pages/admin/ApplicationReview.vue') },
      { path: 'admin/reports', name: 'admin-reports', component: () => import('pages/admin/AdminReports.vue') },

      // HR
      { path: 'hr/dashboard', name: 'hr-dashboard', component: () => import('pages/hr/HRDashboard.vue') },
      { path: 'hr/employees', name: 'hr-employees', component: () => import('pages/hr/EmployeeManagement.vue') },
      { path: 'hr/leave-types', name: 'hr-leave-types', component: () => import('pages/hr/LeaveTypesPage.vue') },
      { path: 'hr/applications', name: 'hr-applications', component: () => import('pages/hr/ApplicationsPage.vue') },
      { path: 'hr/calendar', redirect: '/hr/applications' },
      { path: 'hr/reports', name: 'hr-reports', component: () => import('pages/hr/ReportsMonitoring.vue') },
      { path: 'hr/user-management', name: 'hr-user-management', component: () => import('pages/hr/UserManagement.vue') },

      // Common
      { path: 'notifications', name: 'notifications', component: () => import('pages/NotificationsPage.vue') },
      { path: 'settings', name: 'settings', component: () => import('pages/SettingsPage.vue') },
      { path: 'help', name: 'help', component: () => import('pages/HelpPage.vue') },

    ],
  },

  // Login - standalone layout
  {
    path: '/login',
    component: () => import('layouts/EmptyLayout.vue'),
    children: [
      { path: '', name: 'login', component: () => import('pages/LoginPage.vue') },
    ],
  },

  // Forgot Password
  {
    path: '/forgot-password',
    component: () => import('layouts/EmptyLayout.vue'),
    children: [
      { path: '', name: 'forgot-password', component: () => import('pages/ForgotPasswordPage.vue') },
    ],
  },

  // Reset Password (accessed via email link with token)
  {
    path: '/reset-password',
    component: () => import('layouts/EmptyLayout.vue'),
    children: [
      { path: '', name: 'reset-password', component: () => import('pages/ResetPasswordPage.vue') },
    ],
  },

  // // Development Team (public, same layout as login)
  // {
  //   path: '/development-team',
  //   component: () => import('layouts/EmptyLayout.vue'),
  //   meta: { public: true },
  //   children: [
  //     { path: '', name: 'DevelopmentTeam', component: () => import('../../../node_modules/dti/DevelopmentTeam.vue') },
  //   ],
  // },
 

  // Always leave this as last one
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
