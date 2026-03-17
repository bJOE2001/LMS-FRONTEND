<template>
  <q-page class="dev-team-page">
    <!-- Hero section -->
    <section class="hero">
      <div class="hero-bg" />
      <div class="hero-content">
        <q-btn
          flat
          round
          dense
          icon="arrow_back"
          class="back-btn"
          aria-label="Back to login"
          :to="{ name: 'login' }"
        />
        <div class="hero-text">
          <h1 class="hero-title">Development Team</h1>
          <p class="hero-subtitle">Davao Del Norte State College</p>
          <p class="hero-tagline">Leave Monitoring System — built by our interns</p>
        </div>
      </div>
    </section>

    <!-- Team grid -->
    <section class="team-section">
      <div class="section-inner">
        <h2 class="section-title">Meet the Interns</h2>
        <div class="team-grid">
          <div
            v-for="member in members"
            :key="member.name"
            class="member-card"
          >
            <div class="card-glow" :style="{ '--glow': member.glow }" />
            <div
              class="card-media"
              :class="{ 'card-media-interactive': !!member.hoverPhoto }"
              @mouseenter="setHoveredMember(member)"
              @mouseleave="clearHoveredMember(member)"
              @click="toggleClickedMember(member)"
            >
              <img
                v-if="member.photo"
                :src="getMemberPhoto(member)"
                :alt="`Photo of ${member.name}`"
                class="member-photo"
              >
              <div
                v-else
                class="member-photo member-photo-fallback"
                :style="{ background: member.gradient }"
              >
                <span>{{ member.initials }}</span>
              </div>
            </div>
            <div class="card-footer">
              <div class="member-text">
                <h3 class="member-name">{{ member.name }}</h3>
                <p class="member-role">{{ member.role }}</p>
                <p class="member-program">{{ member.program }}</p>
              </div>
              <div class="member-links">
                <q-btn
                  v-for="link in member.links"
                  :key="`${member.name}-${link.label}`"
                  :href="link.href"
                  :icon="link.icon"
                  target="_blank"
                  rel="noopener noreferrer"
                  round
                  flat
                  dense
                  class="member-link-btn"
                >
                  <q-tooltip>{{ link.label }}</q-tooltip>
                </q-btn>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="dev-footer">
      <p class="footer-copy">&copy; {{ new Date().getFullYear() }} Leave Monitoring System · DNSC Interns</p>
    </footer>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'

const hoveredMemberName = ref(null)
const clickedMemberName = ref(null)

const getMemberPhoto = (member) => {
  if (!member.hoverPhoto) return member.photo

  const isActive =
    hoveredMemberName.value === member.name || clickedMemberName.value === member.name

  return isActive ? member.hoverPhoto : member.photo
}

const setHoveredMember = (member) => {
  if (!member.hoverPhoto) return
  hoveredMemberName.value = member.name
}

const clearHoveredMember = (member) => {
  if (!member.hoverPhoto) return
  if (hoveredMemberName.value === member.name) hoveredMemberName.value = null
}

const toggleClickedMember = (member) => {
  if (!member.hoverPhoto) return
  clickedMemberName.value = clickedMemberName.value === member.name ? null : member.name
}

const members = [
  {
    name: 'Belly Joe B. Basadre',
    initials: 'I1',
    role: 'Backend Developer',
    program: 'BS Information Technology',
    gradient: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
    glow: '#2e7d32',
    photo: null,
    links: [
      { label: 'Portfolio', icon: 'language', href: 'https://github.com/' },
      { label: 'Facebook', icon: 'public', href: 'https://facebook.com/' },
      { label: 'Email', icon: 'mail', href: 'mailto:bellyjoe@example.com' },
    ],
  },
  {
    name: 'Christian Faith Mestola',
    initials: 'I2',
    role: 'Frontend Developer',
    program: 'BS Information Technology',
    gradient: 'linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)',
    glow: '#388e3c',
    photo: '/developers/christian.png',
    hoverPhoto: '/developers/christian%20hover.png',
    links: [
      { label: 'Portfolio', icon: 'language', href: 'https://www.christianfaithmestola.dev/' },
      { label: 'Facebook', icon: 'public', href: 'https://www.facebook.com/christian.mestola.7' },
      { label: 'Email', icon: 'mail', href: 'christianfaithmestola.github@gmail.com' },
    ],
  },
  {
    name: 'Jake Baranada',
    initials: 'I3',
    role: 'Backend Developer',
    program: 'BS Information Technology',
    gradient: 'linear-gradient(135deg, #43a047 0%, #388e3c 100%)',
    glow: '#43a047',
    photo: null,
    links: [
      { label: 'Portfolio', icon: 'language', href: 'https://github.com/' },
      { label: 'Facebook', icon: 'public', href: 'https://facebook.com/' },
      { label: 'Email', icon: 'mail', href: 'mailto:jake@example.com' },
    ],
  },
  {
    name: 'Kenneth Andallaza',
    initials: 'I4',
    role: 'Frontend Developer & Project Manager',
    program: 'BS Information Technology',
    gradient: 'linear-gradient(135deg, #4caf50 0%, #43a047 100%)',
    glow: '#4caf50',
    photo: null,
    links: [
      { label: 'Portfolio', icon: 'language', href: 'https://github.com/' },
      { label: 'Facebook', icon: 'public', href: 'https://facebook.com/' },
      { label: 'Email', icon: 'mail', href: 'mailto:kenneth@example.com' },
    ],
  },
  {
    name: 'Sherly Al-os',
    initials: 'I5',
    role: 'UI designer & Documentation Specialist',
    program: 'BS Information Technology',
    gradient: 'linear-gradient(135deg, #66bb6a 0%, #4caf50 100%)',
    glow: '#66bb6a',
    photo: null,
    links: [
      { label: 'Portfolio', icon: 'language', href: 'https://github.com/' },
      { label: 'Facebook', icon: 'public', href: 'https://facebook.com/' },
      { label: 'Email', icon: 'mail', href: 'mailto:sherly@example.com' },
    ],
  },
  {
    name: 'Janlyn Dos',
    initials: 'I6',
    role: 'System Analyst & Documentation Specialist',
    program: 'BS Information Technology',
    gradient: 'linear-gradient(135deg, #81c784 0%, #66bb6a 100%)',
    glow: '#81c784',
    photo: null,
    links: [
      { label: 'Portfolio', icon: 'language', href: 'https://github.com/' },
      { label: 'Facebook', icon: 'public', href: 'https://facebook.com/' },
      { label: 'Email', icon: 'mail', href: 'mailto:janlyn@example.com' },
    ],
  },
]
</script>

<style lang="scss" scoped>
.dev-team-page {
  min-height: 100vh;
  background: #0a1410;
  padding-bottom: 80px;
}

/* ---- Hero ---- */
.hero {
  position: relative;
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(160deg, rgba(56, 142, 60, 0.4) 0%, rgba(27, 94, 32, 0.45) 50%, rgba(10, 20, 16, 0.98) 100%),
    radial-gradient(ellipse 80% 60% at 50% 0%, rgba(56, 142, 60, 0.3) 0%, transparent 60%);
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 900px;
  padding: 24px;
  text-align: center;
}

.back-btn {
  position: absolute;
  top: 16px;
  left: 16px;
  color: rgba(255, 255, 255, 0.9);
  &:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }
}

.hero-title {
  margin: 0;
  font-size: clamp(1.75rem, 5vw, 2.5rem);
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
}

.hero-subtitle {
  margin: 8px 0 4px;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}

.hero-tagline {
  margin: 0;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.6);
}

/* ---- Team section ---- */
.team-section {
  padding: 48px 24px 24px;
}

.section-inner {
  max-width: 1100px;
  margin: 0 auto;
}

.section-title {
  margin: 0 0 32px;
  font-size: 1.5rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
}

.team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.member-card {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;

  &:hover {
    transform: translateY(-6px);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  }
}

.card-glow {
  position: absolute;
  top: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 80px;
  background: radial-gradient(ellipse at center, var(--glow, #667eea) 0%, transparent 70%);
  opacity: 0.35;
  pointer-events: none;
  border-radius: 20px 20px 0 0;
}

.card-media {
  position: relative;
  height: 220px;
  overflow: hidden;
}

.card-media-interactive {
  cursor: pointer;
}

.member-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.member-photo-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 3rem;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.card-footer {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 16px 18px;
  background: linear-gradient(180deg, rgba(7, 13, 10, 0.8) 0%, rgba(7, 13, 10, 0.96) 100%);
}

.member-text {
  min-width: 0;
}

.member-name {
  margin: 0 0 4px;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  line-height: 1.3;
}

.member-role {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.78);
  font-weight: 500;
}

.member-program {
  margin: 3px 0 0;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.52);
}

.member-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}

.member-link-btn {
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(129, 199, 132, 0.32);
  background: rgba(56, 142, 60, 0.12);

  &:hover {
    background: rgba(56, 142, 60, 0.25);
    color: #d7ffd9;
  }
}

/* ---- Footer ---- */
.dev-footer {
  margin-top: 48px;
  padding: 24px;
  text-align: center;
}

.footer-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 12px;
  background: rgba(56, 142, 60, 0.2);
  color: #81c784;
  text-decoration: none;
  font-weight: 500;
  transition: background 0.2s, color 0.2s;

  &:hover {
    background: rgba(56, 142, 60, 0.35);
    color: #a5d6a7;
  }
}

.footer-copy {
  margin: 16px 0 0;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.45);
}

@media (max-width: 600px) {
  .team-grid {
    grid-template-columns: 1fr;
  }
}
</style>
