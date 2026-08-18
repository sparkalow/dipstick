<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { useVehicles } from './composables/useVehicles';
import { useTheme } from './composables/useTheme';
import ServiceRecordForm from './components/ServiceRecordForm.vue';

const { vehicles, refresh } = useVehicles();
const { theme, toggleTheme } = useTheme();

onMounted(refresh);

const showLog = ref(false);
const hasVehicles = computed(() => vehicles.value.length > 0);
</script>

<template>
  <div class="app-shell">
    <header class="app-nav">
      <RouterLink to="/" class="brand">
        <svg xmlns="http://www.w3.org/2000/svg" width="183" height="58" fill="none" viewBox="0 0 590 183">
          <path fill="#f0a830" d="M31.402 162.149h-.574c5.216 12.299 3.374 20.554-3.422 20.554s-8.639-8.255-3.423-20.554h-.574l-.756-30.831h9.505zM32.55 115.331l-.252 10.277h-9.785l-.252-10.277z"/>
          <path fill="#f0a830" fill-rule="evenodd" d="M27.406 0C42.54 0 54.81 12.27 54.81 27.406c0 12.843-8.835 23.62-20.758 26.59l-1.364 55.626H22.12l-1.364-55.625C8.834 51.026 0 40.248 0 27.406 0 12.27 12.27 0 27.406 0m0 11.419c-8.83 0-15.987 7.157-15.987 15.987s7.157 15.986 15.987 15.986 15.986-7.157 15.986-15.987S36.235 11.42 27.405 11.42" clip-rule="evenodd"/>
          <path fill="#fff" d="M480.135 64.273q3.933 0 7.751.514a71 71 0 0 1 7.41 1.368 56 56 0 0 1 6.555 1.995q3.078 1.083 5.472 2.337l-1.425 17.441q-4.446-2.793-8.55-4.445-4.103-1.71-7.922-2.451-3.762-.798-7.183-.798-6.954 0-12.369 3.077-5.415 3.02-8.55 8.95-3.078 5.87-3.078 14.364 0 5.414 1.597 10.259 1.595 4.788 4.787 8.494 3.249 3.705 8.094 5.814t11.343 2.108q2.68 0 5.359-.341a40 40 0 0 0 5.471-1.198 32.7 32.7 0 0 0 5.472-2.166 43 43 0 0 0 5.473-3.42l1.025 17.214q-2.451 1.369-5.415 2.395a44.5 44.5 0 0 1-6.27 1.652q-3.249.684-6.726.97a69 69 0 0 1-6.84.342q-9.918 0-17.841-3.022-7.923-3.02-13.566-8.606-5.586-5.643-8.55-13.338-2.964-7.752-2.964-17.157 0-12.198 4.959-21.775 4.959-9.632 14.25-15.104t22.231-5.473M291.53 64.273q3.819 0 7.638.514 3.819.456 7.41 1.254a66 66 0 0 1 6.726 1.824q3.078 1.026 5.358 2.166l-1.425 16.53a45.7 45.7 0 0 0-7.581-3.82q-3.933-1.538-7.695-2.336-3.762-.799-6.84-.799-3.477 0-6.327.912-2.793.913-4.446 2.793-1.653 1.882-1.653 4.732 0 2.794 1.539 4.731 1.596 1.88 4.845 3.362 3.306 1.425 8.493 2.964 9.747 2.907 15.39 6.1 5.643 3.135 7.98 7.581 2.394 4.446 2.394 11.172 0 7.467-3.249 13.052-3.249 5.53-10.146 8.608t-17.784 3.078q-5.073 0-10.431-.855-5.301-.798-9.975-2.11-4.617-1.31-7.524-2.735l1.368-16.474a57.6 57.6 0 0 0 8.208 3.82 62 62 0 0 0 8.607 2.393q4.332.855 8.265.856 3.933 0 6.84-.969t4.503-2.907q1.596-1.995 1.596-5.13 0-3.192-2.109-5.244-2.052-2.11-5.928-3.649-3.876-1.596-9.233-3.135-7.41-2.165-12.655-5.015-5.244-2.907-8.037-7.41-2.736-4.56-2.736-11.685t3.135-12.54q3.135-5.473 9.462-8.55 6.327-3.08 16.017-3.079"/>
          <path fill="#fff" fill-rule="evenodd" d="M105.167 65.926q9.291 0 16.53 2.68 7.239 2.678 12.198 7.865 5.016 5.187 7.638 12.711 2.622 7.467 2.622 17.101 0 8.607-2.337 16.074-2.28 7.41-7.353 12.995-5.016 5.586-13.281 8.722t-20.178 3.135H72.847V65.926zm-13.566 66.291h9.348q8.778 0 13.908-3.42 5.187-3.419 7.467-9.347t2.28-13.396q0-5.642-1.368-10.26-1.311-4.616-4.104-7.922-2.736-3.363-7.011-5.13-4.275-1.824-10.203-1.824H91.601z" clip-rule="evenodd"/>
          <path fill="#fff" d="M175.949 147.209h-19.151V65.926h19.151z"/>
          <path fill="#fff" fill-rule="evenodd" d="M224.849 65.926q9.862 0 16.474 2.452 6.669 2.45 9.975 8.093 3.363 5.586 3.363 15.048 0 8.038-2.85 14.194-2.85 6.099-9.234 9.576-6.384 3.42-16.872 3.42h-14.991v28.5h-18.468V65.926zm-14.135 38.533h10.715q4.903 0 8.038-1.311t4.617-4.048q1.539-2.793 1.539-7.181 0-3.478-1.083-5.7-1.026-2.224-2.793-3.42a11 11 0 0 0-3.933-1.653 18 18 0 0 0-4.275-.514h-12.825z" clip-rule="evenodd"/>
          <path fill="#fff" d="M395.665 82.286h-24.51v64.923h-18.696V82.286h-24.568v-16.36h67.774zM426.103 147.209h-19.151V65.926h19.151zM539.083 97.619h3.534l9.576-12.54q3.42-4.447 6.783-8.835 3.363-4.446 7.809-10.318h21.603a4201 4201 0 0 0-10.374 12.655 4788 4788 0 0 0-10.089 12.54l-9.905 12.226 10.988 15.191q3.306 4.56 7.068 9.803 3.819 5.245 7.41 10.204t6.327 8.664h-22.629q-3.762-5.415-7.125-10.146-3.306-4.788-6.498-9.405l-10.716-15.333h-3.762v34.884h-18.696V65.926h18.696z"/>
        </svg>
      </RouterLink>

      <nav class="nav-tabs">
        <RouterLink to="/" class="nav-tab">Dashboard</RouterLink>
        <RouterLink to="/vehicles" class="nav-tab">Vehicles</RouterLink>
      </nav>

      <div class="nav-spacer"></div>

      <button
        type="button"
        class="theme-toggle"
        :class="{ 'theme-toggle--on': theme === 'dark' }"
        :aria-pressed="theme === 'dark'"
        :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="toggleTheme"
      >
        {{ theme === 'dark' ? '☾ Dark' : '☀ Light' }}
      </button>

      <button
        type="button"
        class="btn--primary log-btn"
        :disabled="!hasVehicles"
        :title="hasVehicles ? undefined : 'Add a vehicle first'"
        @click="showLog = true"
      >
        <span class="log-plus">+</span> Log Service
      </button>
    </header>

    <main class="app-main">
      <RouterView />
    </main>

    <ServiceRecordForm v-if="showLog" @close="showLog = false" />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: var(--space-4);
  height: 72px;
  padding: 0 var(--space-5);
  background: var(--color-nav);
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;
}

.brand-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.brand-name {
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 1.25rem;
  letter-spacing: 0.2px;
  color: var(--color-on-nav);
}

.nav-tabs {
  display: flex;
  gap: var(--space-1);
  margin-left: var(--space-3);
}

.nav-tab {
  font-family: var(--font-head);
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-nav-muted);
  text-decoration: none;
  padding: 0.625rem 1rem;
  border-radius: var(--radius-sm);
}

.nav-tab:hover {
  color: var(--color-on-nav);
}

/* Dashboard ("/") is a prefix of every route, so only light it on an exact match;
   Vehicles stays active across /vehicles and /vehicles/:id. */
.nav-tab.router-link-exact-active,
.nav-tab.router-link-active:not([href='/']) {
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.nav-spacer {
  flex: 1;
}

/* The nav bar is dark in both themes, so this toggle is styled against dark. */
.theme-toggle {
  font-family: var(--font-head);
  font-weight: 600;
  font-size: 0.8125rem;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-pill);
  background: transparent;
  border: 1.5px solid color-mix(in srgb, var(--color-nav-muted) 35%, transparent);
  color: var(--color-nav-muted);
}

.theme-toggle:hover {
  border-color: var(--color-nav-muted);
  filter: none;
}

.theme-toggle--on {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-on-accent);
}

.log-plus {
  font-size: 1.125rem;
  line-height: 1;
}

.app-main {
  flex: 1;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-5) var(--space-6);
}
</style>
