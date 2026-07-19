<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <span class="app-title">DipStick</span>
      <nav class="app-nav">
        <RouterLink to="/">Dashboard</RouterLink>
        <RouterLink to="/vehicles">Vehicles</RouterLink>
      </nav>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.app-title {
  font-weight: 600;
}

.app-nav {
  display: flex;
  gap: var(--space-3);
}

.app-nav a {
  color: var(--color-text-muted);
  text-decoration: none;
}

.app-nav a.router-link-active {
  color: var(--color-accent);
  font-weight: 600;
}

.app-main {
  flex: 1;
  padding: var(--space-4);
}
</style>
