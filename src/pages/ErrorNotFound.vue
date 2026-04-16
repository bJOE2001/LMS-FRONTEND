<template>
  <section class="not-found-page">
    <div class="not-found-shell">
      <div class="content-side">
        <div class="eyebrow">
          <span class="eyebrow-dot" />
          Connection to this page failed. Try heading back home.
        </div>

        <h1 class="error-code">404</h1>
        <h2 class="error-title">Oops! This page wandered off.</h2>

        <p class="error-copy">
          The page you opened drifted outside our map. Let&apos;s bring you back to a safe part of
          the Leave Management System and keep things moving.
        </p>

        <div class="path-chip" :title="route.fullPath">
          <span class="path-label">Missing route</span>
          <span class="path-value">{{ route.fullPath }}</span>
        </div>

        <div class="action-row">
          <q-btn
            unelevated
            no-caps
            color="dark"
            icon="home"
            label="Go Back Home"
            class="primary-action"
            @click="goHome"
          />

          <q-btn
            outline
            no-caps
            color="white"
            icon="arrow_back"
            label="Previous Page"
            class="secondary-action"
            @click="goBack"
          />
        </div>

        <div class="helper-links">
          <button type="button" class="helper-link" @click="openHelp">
            {{ helpLabel }}
          </button>
          <span class="helper-divider" />
          <button type="button" class="helper-link" @click="goLogin">Return to Login</button>
        </div>
      </div>

      <div class="scene-side" aria-hidden="true">
        <div class="scene-glow" />
        <div class="scene-card card-top">
          <span class="card-line short" />
          <span class="card-line" />
        </div>
        <div class="scene-card card-side">
          <span class="card-pill" />
          <span class="card-line" />
        </div>
        <div class="scene-card card-bottom">
          <span class="card-line" />
          <span class="card-line short" />
        </div>

        <div class="maze-track" />
        <div class="signal signal-left" />
        <div class="signal signal-right" />

        <div class="robot">
          <div class="robot-antenna" />
          <div class="robot-head">
            <span class="robot-eye" />
            <span class="robot-eye" />
          </div>
          <div class="robot-body">
            <span class="robot-core" />
          </div>
          <div class="robot-arm arm-left" />
          <div class="robot-arm arm-right" />
          <div class="robot-leg leg-left" />
          <div class="robot-leg leg-right" />
        </div>

        <div class="signal-node node-left" />
        <div class="signal-node node-right" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth-store'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const DASHBOARD_BY_ROLE = {
  admin: '/admin/dashboard',
  department_admin: '/admin/dashboard',
  hr: '/hr/dashboard',
}

const homeRoute = computed(() => {
  const role = authStore.userRole
  const requiresPasswordChange =
    ['department_admin', 'hr'].includes(role) && Boolean(authStore.user?.must_change_password)

  if (!authStore.isAuthenticated) return '/login'
  if (requiresPasswordChange) return '/settings'

  return DASHBOARD_BY_ROLE[role] || '/login'
})

const helpLabel = computed(() => (authStore.isAuthenticated ? 'Open Help Center' : 'Meet the Team'))

function goHome() {
  router.push(homeRoute.value)
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }

  goHome()
}

function openHelp() {
  router.push(authStore.isAuthenticated ? '/help' : '/development-team')
}

function goLogin() {
  router.push('/login')
}
</script>

<style lang="scss" scoped>
.not-found-page {
  --mint: #c8f2dc;
  --mint-soft: #effaf3;
  --lime: #d9f08f;
  --shadow: 0 24px 80px rgba(2, 18, 11, 0.16);

  position: relative;
  min-height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
  background: #2d7a55;
}

.scene-glow,
.scene-card,
.maze-track,
.signal,
.signal-node,
.robot,
.robot-head,
.robot-body,
.robot-arm,
.robot-leg,
.robot-core,
.robot-antenna,
.robot-eye {
  position: absolute;
}

.not-found-shell {
  position: relative;
  z-index: 1;
  width: min(1180px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 0.92fr);
  gap: 48px;
  align-items: center;
}

.content-side,
.scene-side {
  position: relative;
}

.content-side {
  max-width: 620px;
  color: #f5fff8;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: var(--mint-soft);
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.eyebrow-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--lime);
  box-shadow: 0 0 18px rgba(217, 240, 143, 0.6);
}

.error-code {
  margin: 18px 0 6px;
  font-size: clamp(5.8rem, 12vw, 8.8rem);
  line-height: 0.92;
  font-weight: 800;
  letter-spacing: -0.06em;
  color: #ffffff;
}

.error-title {
  margin: 0 0 14px;
  font-size: clamp(1.8rem, 4vw, 2.7rem);
  line-height: 1.05;
  font-weight: 700;
  color: var(--mint-soft);
}

.error-copy {
  max-width: 560px;
  margin: 0;
  color: rgba(242, 255, 248, 0.88);
  font-size: 1.02rem;
  line-height: 1.75;
}

.path-chip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
  padding: 16px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
}

.path-label {
  color: rgba(234, 255, 245, 0.72);
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.path-value {
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 600;
  word-break: break-word;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 28px;
}

.primary-action,
.secondary-action {
  min-height: 52px;
  padding-inline: 10px;
  border-radius: 16px;
  font-weight: 700;
}

.primary-action {
  background: #f8fffb !important;
  color: #123524 !important;
}

.secondary-action {
  border-color: rgba(255, 255, 255, 0.42) !important;
  color: #ffffff !important;
  background: transparent;
}

.helper-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 22px;
}

.helper-link {
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--mint);
  font-size: 0.96rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.helper-link:hover {
  opacity: 0.88;
  transform: translateY(-1px);
}

.helper-divider {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.36);
}

.scene-side {
  min-height: 620px;
  overflow: hidden;
}

.scene-glow {
  inset: auto auto 78px 50%;
  width: 290px;
  height: 290px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: rgba(223, 246, 232, 0.14);
}

.scene-card {
  width: 126px;
  padding: 18px;
  border-radius: 22px;
  background: rgba(249, 255, 251, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: var(--shadow);
}

.card-top {
  top: 62px;
  left: 42px;
  transform: rotate(-8deg);
}

.card-side {
  top: 106px;
  right: 42px;
  transform: rotate(9deg);
}

.card-bottom {
  right: 86px;
  bottom: 86px;
  transform: rotate(-10deg);
}

.card-line,
.card-pill {
  display: block;
  height: 11px;
  border-radius: 999px;
  background: rgba(235, 249, 240, 0.78);
}

.card-line + .card-line,
.card-pill + .card-line {
  margin-top: 12px;
}

.card-line.short {
  width: 58%;
}

.card-pill {
  width: 40px;
  background: #d9f3e1;
}

.maze-track {
  inset: 138px 72px 138px;
  border-radius: 38px;
  border: 2px solid rgba(236, 255, 245, 0.26);
  opacity: 0.88;
}

.maze-track::before,
.maze-track::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  background: rgba(236, 255, 245, 0.32);
}

.maze-track::before {
  top: 22%;
  left: 18%;
  width: 48%;
  height: 2px;
  box-shadow:
    120px 76px 0 rgba(236, 255, 245, 0.32),
    -20px 160px 0 rgba(236, 255, 245, 0.32);
}

.maze-track::after {
  top: 18%;
  left: 24%;
  width: 2px;
  height: 52%;
  box-shadow:
    160px 42px 0 rgba(236, 255, 245, 0.32),
    84px 180px 0 rgba(236, 255, 245, 0.32);
}

.signal {
  top: 50%;
  width: 118px;
  height: 118px;
  border-radius: 50%;
  border: 2px dashed rgba(241, 255, 247, 0.34);
  transform: translateY(-50%);
}

.signal::before,
.signal::after {
  content: '';
  position: absolute;
  inset: 14px;
  border-radius: 50%;
  border: 2px solid rgba(241, 255, 247, 0.16);
}

.signal::after {
  inset: 30px;
}

.signal-left {
  left: 46px;
}

.signal-right {
  right: 42px;
}

.robot {
  left: 50%;
  bottom: 112px;
  width: 168px;
  height: 246px;
  transform: translateX(-50%);
}

.robot-antenna {
  top: 12px;
  left: 50%;
  width: 4px;
  height: 30px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: #f3fbf6;
}

.robot-antenna::before {
  content: '';
  position: absolute;
  top: -10px;
  left: 50%;
  width: 16px;
  height: 16px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: var(--lime);
  box-shadow: 0 0 20px rgba(217, 240, 143, 0.55);
}

.robot-head {
  top: 38px;
  left: 24px;
  width: 120px;
  height: 92px;
  border-radius: 34px;
  background: #ffffff;
  box-shadow: 0 18px 28px rgba(10, 49, 32, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
}

.robot-eye {
  position: static;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #1f533b;
  box-shadow: 0 0 0 6px rgba(217, 243, 225, 0.24);
}

.robot-body {
  top: 138px;
  left: 38px;
  width: 92px;
  height: 76px;
  border-radius: 28px;
  background: #e4f2cf;
  box-shadow: 0 18px 28px rgba(10, 49, 32, 0.2);
}

.robot-core {
  top: 22px;
  left: 50%;
  width: 42px;
  height: 26px;
  transform: translateX(-50%);
  border-radius: 14px;
  background: #21563d;
}

.robot-arm,
.robot-leg {
  width: 16px;
  border-radius: 999px;
  background: #f4fbf7;
}

.robot-arm {
  top: 146px;
  height: 68px;
}

.arm-left {
  left: 14px;
  transform: rotate(22deg);
}

.arm-right {
  right: 14px;
  transform: rotate(-22deg);
}

.robot-leg {
  top: 206px;
  height: 54px;
}

.leg-left {
  left: 54px;
}

.leg-right {
  right: 54px;
}

.signal-node {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #f8fff9;
  box-shadow: 0 0 0 8px rgba(224, 255, 238, 0.1);
}

.node-left {
  left: 154px;
  top: 50%;
  transform: translateY(-50%);
}

.node-right {
  right: 150px;
  top: 50%;
  transform: translateY(-50%);
}

@media (max-width: 980px) {
  .not-found-shell {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .content-side {
    max-width: none;
  }

  .scene-side {
    min-height: 440px;
  }

  .maze-track {
    inset: 92px 52px 88px;
  }

  .robot {
    bottom: 64px;
    transform: translateX(-50%) scale(0.88);
  }
}

@media (max-width: 640px) {
  .not-found-page {
    padding: 28px 20px;
  }

  .action-row {
    flex-direction: column;
  }

  .primary-action,
  .secondary-action {
    width: 100%;
  }

  .helper-links {
    gap: 10px;
  }

  .scene-side {
    min-height: 360px;
  }

  .scene-card {
    width: 102px;
    padding: 14px;
    border-radius: 18px;
  }

  .card-top {
    top: 34px;
    left: 20px;
  }

  .card-side {
    top: 72px;
    right: 20px;
  }

  .card-bottom {
    right: 30px;
    bottom: 58px;
  }

  .signal {
    width: 84px;
    height: 84px;
  }

  .signal-left {
    left: 18px;
  }

  .signal-right {
    right: 18px;
  }

  .maze-track {
    inset: 88px 28px 76px;
  }

  .robot {
    bottom: 42px;
    transform: translateX(-50%) scale(0.7);
  }

  .node-left {
    left: 78px;
  }

  .node-right {
    right: 74px;
  }
}
</style>
