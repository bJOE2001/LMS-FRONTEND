<template>
  <q-page class="development-page">
    <section id="team-directory" class="directory-section">
      <div class="page-shell">
        <div class="section-heading">
          <h2 class="section-title">Project Team Members</h2>
          <p class="section-copy">
            The following individuals contributed to the planning, implementation, and supporting
            documentation of the Leave Monitoring System.
          </p>
        </div>

        <div class="team-grid">
          <article v-for="member in members" :key="member.name" class="member-card">
            <div
              class="member-photo-wrap"
              :class="{ 'has-hover-photo': !!member.hoverPhoto }"
              @mouseenter="setHoveredMember(member)"
              @mouseleave="clearHoveredMember(member)"
            >
              <img
                v-if="member.photo"
                :src="getMemberPhoto(member)"
                :alt="`Photo of ${member.name}`"
                class="member-photo"
              />
              <div v-else class="member-photo member-photo-fallback">
                <span>{{ member.initials }}</span>
              </div>
            </div>

            <div class="member-body">
              <p class="member-role">{{ member.role }}</p>
              <h3 class="member-name">{{ member.name }}</h3>
              <p class="member-program">{{ member.program }}</p>

              <div v-if="member.links.length" class="member-links">
                <a
                  v-for="link in member.links"
                  :key="`${member.name}-${link.label}`"
                  :href="link.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="member-link"
                >
                  <q-icon :name="link.icon" size="16px" />
                  <span>{{ link.label }}</span>
                </a>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <footer class="page-footer">
      <div class="page-shell footer-inner">
        <p class="footer-title">Leave Monitoring System</p>
        <p class="footer-copy">
          &copy; {{ currentYear }} City Government of Tagum. Development team profile page.
        </p>
      </div>
    </footer>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'

const currentYear = new Date().getFullYear()
const hoveredMemberName = ref(null)

function getMemberPhoto(member) {
  if (!member.hoverPhoto) return member.photo

  return hoveredMemberName.value === member.name ? member.hoverPhoto : member.photo
}

function setHoveredMember(member) {
  if (!member.hoverPhoto) return
  hoveredMemberName.value = member.name
}

function clearHoveredMember(member) {
  if (hoveredMemberName.value === member.name) {
    hoveredMemberName.value = null
  }
}

function normalizeLink(link) {
  if (!link?.href) return null

  const trimmedHref = String(link.href).trim()
  if (!trimmedHref) return null

  const isGenericPlaceholder = ['https://github.com/', 'https://facebook.com/'].includes(
    trimmedHref,
  )
  if (isGenericPlaceholder) return null

  const isEmail = link.icon === 'mail' || trimmedHref.includes('@')
  const normalizedHref =
    isEmail && !trimmedHref.startsWith('mailto:') ? `mailto:${trimmedHref}` : trimmedHref

  return {
    ...link,
    href: normalizedHref,
  }
}

const rawMembers = [
  {
    name: 'Belly Joe B. Basadre',
    initials: 'BB',
    role: 'FULL-STACK DEVELOPER',
    program: 'BS Information Technology',
    photo: '/developers/belly.png',
    links: [
      { label: 'Portfolio', icon: 'language', href: 'https://www.bellyjoebasadre.dev/' },
      { label: 'Email', icon: 'mail', href: 'mailto:bellyjoe@example.com' },
      { label: 'Facebook', icon: 'public', href: 'https://www.facebook.com/bellyjoe.official' },
    ],
  },
  {
    name: 'Christian Faith M. Mestola',
    initials: 'CM',
    role: 'FULL-STACK DEVELOPER',
    program: 'BS Information Technology',
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
    initials: 'JB',
    role: 'FRONTEND DEVELOPER',
    program: 'BS Information Technology',
    photo: '/developers/jake.png',
    links: [
      { label: 'Email', icon: 'mail', href: 'mailto:jake@example.com' },
      { label: 'Facebook', icon: 'public', href: 'https://www.facebook.com/Jake.Baranda8' },
      { label: 'Email', icon: 'mail', href: 'baranda.jake@dnsc.edu.ph' },
    ],
  },
  {
    name: 'Kenneth Andallaza',
    initials: 'KA',
    role: 'FRONTEND DEVELOPER',
    program: 'BS Information Technology',
    photo: null,
    links: [{ label: 'Email', icon: 'mail', href: 'mailto:jake@example.com' }],
  },
  {
    name: 'Sherly Ann Al-os',
    initials: 'SA',
    role: 'AFK NPC',
    program: 'BS Information Technology',
    photo: '/developers/alsos.jpg',
    links: [{ label: 'Email', icon: 'mail', href: 'mailto:jake@example.com' }],
  },
  {
    name: 'Janlyn Baulite',
    initials: 'JB',
    role: 'AKF NPC',
    program: 'BS Information Technology',
    photo: '/developers/janlyn.jpg',
    links: [{ label: 'Email', icon: 'mail', href: 'mailto:jake@example.com' }],
  },
]

const members = rawMembers.map((member) => ({
  ...member,
  links: member.links.map(normalizeLink).filter(Boolean),
}))
</script>

<style scoped>
.development-page {
  min-height: 100vh;
  background: #f4f7f4;
  color: #173526;
}

.page-shell {
  width: min(1160px, calc(100% - 48px));
  margin: 0 auto;
}

.hero-section {
  padding: 32px 0 44px;
  background: linear-gradient(180deg, #eef5ef 0%, #f4f7f4 100%);
  border-bottom: 1px solid rgba(23, 53, 38, 0.08);
}

.back-button {
  margin-bottom: 22px;
  padding-inline: 4px;
  color: #28553f;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 28px;
  align-items: stretch;
}

.hero-copy,
.hero-panel,
.overview-card,
.member-card {
  border: 1px solid rgba(23, 53, 38, 0.08);
  background: #ffffff;
  box-shadow: 0 18px 45px rgba(18, 45, 31, 0.06);
}

.hero-copy {
  padding: 38px;
  border-radius: 24px;
}

.hero-kicker,
.overview-label,
.panel-label,
.panel-status {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-kicker,
.overview-label,
.panel-label {
  color: #2e7a55;
}

.hero-title {
  margin: 14px 0 8px;
  font-size: clamp(2.2rem, 5vw, 3.5rem);
  line-height: 1.02;
  font-weight: 800;
  color: #163423;
}

.hero-subtitle {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #244a36;
}

.hero-description,
.section-copy,
.overview-copy,
.hero-note-copy,
.footer-copy,
.member-program,
.member-role,
.meta-label,
.meta-value {
  line-height: 1.7;
}

.hero-description {
  max-width: 640px;
  margin: 18px 0 0;
  color: #4d6859;
  font-size: 1rem;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 28px;
}

.hero-primary,
.hero-secondary {
  min-height: 48px;
  padding-inline: 12px;
  border-radius: 14px;
  font-weight: 700;
}

.hero-panel {
  padding: 28px;
  border-radius: 24px;
}

.hero-panel-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 18px;
}

.panel-status {
  color: #5f7a6b;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  padding: 18px;
  border-radius: 18px;
  background: #f6faf7;
  border: 1px solid rgba(46, 122, 85, 0.1);
}

.stat-value {
  display: block;
  font-size: 2rem;
  line-height: 1;
  font-weight: 800;
  color: #1d5239;
}

.stat-label {
  display: block;
  margin-top: 8px;
  color: #587062;
  font-size: 0.92rem;
  font-weight: 600;
}

.hero-note {
  margin-top: 18px;
  padding: 18px 20px;
  border-radius: 18px;
  background: #173526;
}

.hero-note-title {
  margin: 0 0 6px;
  color: #dff5e6;
  font-size: 0.92rem;
  font-weight: 700;
}

.hero-note-copy {
  margin: 0;
  color: rgba(239, 250, 243, 0.84);
  font-size: 0.93rem;
}

.overview-section {
  padding: 26px 0 12px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.overview-card {
  padding: 24px;
  border-radius: 22px;
}

.overview-title {
  margin: 10px 0 8px;
  font-size: 1.22rem;
  line-height: 1.3;
  color: #173526;
}

.overview-copy {
  margin: 0;
  font-size: 0.96rem;
  color: #567061;
}

.directory-section {
  padding: 28px 0 56px;
}

.section-heading {
  max-width: 720px;
  margin-bottom: 28px;
}

.section-title {
  margin: 10px 0 10px;
  font-size: clamp(1.8rem, 3vw, 5.4rem);
  font-weight: 600;
  line-height: 1.1;
  color: #173526;
}

.section-copy {
  margin: 0;
  font-size: 1rem;
  color: #587062;
}

.team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 22px;
}

.member-card {
  border-radius: 24px;
  overflow: hidden;
}

.member-photo-wrap {
  position: relative;
  height: 240px;
  background: #e8f1eb;
  border-bottom: 1px solid rgba(23, 53, 38, 0.08);
}

.member-photo-wrap.has-hover-photo {
  cursor: pointer;
}

.member-photo {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.member-photo-wrap.has-hover-photo:hover .member-photo {
  transform: scale(1.02);
}

.member-photo-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2e7a55;
  font-size: 2.3rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.member-body {
  padding: 22px;
  background: var(--q-primary);
}

.member-role {
  margin: 0 0 8px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.member-name {
  margin: 0;
  font-size: 1.18rem;
  line-height: 1.35;
  color: #ffffff;
}

.member-program {
  margin: 8px 0 0;
  font-size: 0.94rem;
  color: rgba(255, 255, 255, 0.78);
}

.member-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.16);
}

.meta-label {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
}

.meta-value {
  color: #ffffff;
  font-size: 0.94rem;
  font-weight: 600;
}

.member-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.member-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.member-link:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.28);
  transform: translateY(-1px);
}

.page-footer {
  padding: 0 0 36px;
}

.footer-inner {
  padding-top: 22px;
  border-top: 1px solid rgba(23, 53, 38, 0.08);
}

.footer-title {
  margin: 0;
  color: #173526;
  font-size: 1rem;
  font-weight: 700;
}

.footer-copy {
  margin: 6px 0 0;
  font-size: 0.92rem;
  color: #667f71;
}

@media (max-width: 980px) {
  .hero-grid,
  .overview-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .page-shell {
    width: min(100% - 32px, 1160px);
  }

  .hero-section {
    padding-top: 20px;
  }

  .hero-copy,
  .hero-panel,
  .overview-card,
  .member-body {
    padding: 20px;
  }

  .hero-panel-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions {
    flex-direction: column;
  }

  .hero-primary,
  .hero-secondary {
    width: 100%;
  }

  .team-grid {
    grid-template-columns: 1fr;
  }
}
</style>
