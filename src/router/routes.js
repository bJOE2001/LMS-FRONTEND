const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/login' },

      // Employee
      { path: 'employee/dashboard', name: 'employee-dashboard', component: () => import('pages/employee/EmployeeDashboard.vue') },
      { path: 'employee/change-password', name: 'employee-change-password', component: () => import('pages/employee/EmployeeChangePassword.vue') },
      { path: 'employee/apply-leave', name: 'employee-apply', component: () => import('pages/employee/ApplyLeave.vue') },
      { path: 'employee/leave-history', name: 'employee-history', component: () => import('pages/employee/LeaveHistory.vue') },

      // Admin
      { path: 'admin/dashboard', name: 'admin-dashboard', component: () => import('pages/admin/AdminDashboard.vue') },
      { path: 'admin/employees', name: 'admin-employees', component: () => import('pages/admin/AdminEmployees.vue') },
      { path: 'admin/apply-leave', name: 'admin-apply', component: () => import('pages/admin/AdminApplySelf.vue') },
      { path: 'admin/apply-on-behalf', name: 'admin-apply-behalf', component: () => import('pages/admin/AdminApplyOnBehalf.vue') },
      { path: 'admin/review/:id', name: 'admin-review', component: () => import('pages/admin/ApplicationReview.vue') },
      { path: 'admin/reports', name: 'admin-reports', component: () => import('pages/admin/AdminReports.vue') },

      // HR
      { path: 'hr/dashboard', name: 'hr-dashboard', component: () => import('pages/hr/HRDashboard.vue') },
      { path: 'hr/employees', name: 'hr-employees', component: () => import('pages/hr/EmployeeManagement.vue') },
      { path: 'hr/calendar', name: 'hr-calendar', component: () => import('pages/hr/LeaveCalendar.vue') },
      { path: 'hr/reports', name: 'hr-reports', component: () => import('pages/hr/ReportsMonitoring.vue') },
      { path: 'hr/forecasting', name: 'hr-forecasting', component: () => import('pages/hr/AttritionForecasting.vue') },

      // Common
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

  // Always leave this as last one
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
