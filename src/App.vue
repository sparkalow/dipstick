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
        <img src="/logo.png" alt="" class="brand-logo" />
        <span class="brand-name">DipStick</span>
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
  border: 1.5px solid var(--blue-slate);
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
