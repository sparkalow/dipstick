<script setup lang="ts">
import { ref } from 'vue';
import { useBackup } from '../composables/useBackup';

const emit = defineEmits<{
  close: [];
}>();

const { exporting, importing, error, exportBackup, importBackup } = useBackup();

const selectedFile = ref<File | null>(null);
const restored = ref(false);

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  selectedFile.value = input.files?.[0] ?? null;
}

async function onExport() {
  try {
    await exportBackup();
  } catch {
    // error ref already holds the message; keep the modal open so the user can retry.
  }
}

async function onRestore() {
  const file = selectedFile.value;
  if (!file) return;

  const confirmed = window.confirm(
    `Restore from "${file.name}"?\n\nThis replaces every vehicle, service record and receipt currently stored. It cannot be undone.`,
  );
  if (!confirmed) return;

  try {
    await importBackup(file);
    // The composable reloads the page on success; this only shows in the gap
    // before the reload takes effect.
    restored.value = true;
  } catch {
    // error ref already holds the message; keep the modal open so the user can retry.
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="backup-title">
      <h2 id="backup-title">Backup &amp; Restore</h2>

      <section class="section">
        <h3>Back up</h3>
        <p class="hint">
          Downloads a single file containing every vehicle, service record and receipt file. Everything lives only in
          this browser, so keep a copy somewhere else.
        </p>
        <button type="button" class="btn--primary" :disabled="exporting || importing" @click="onExport">
          {{ exporting ? 'Preparing…' : 'Download backup' }}
        </button>
      </section>

      <hr />

      <section class="section">
        <h3>Restore</h3>
        <p class="hint hint--warning">
          Restoring <strong>replaces all current data</strong> with the contents of the backup file. This cannot be
          undone.
        </p>
        <label class="field">
          <span>Backup file</span>
          <input type="file" accept="application/json,.json" :disabled="importing" @change="onFileChange" />
        </label>
        <button
          type="button"
          class="btn--danger"
          :disabled="!selectedFile || importing || exporting"
          @click="onRestore"
        >
          {{ importing ? 'Restoring…' : 'Restore from file' }}
        </button>
      </section>

      <p v-if="restored" class="form-note">Restore complete — reloading…</p>
      <p v-if="error" class="form-error">{{ error }}</p>

      <div class="modal-actions">
        <button type="button" class="btn--secondary" @click="emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-scrim);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.modal {
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  width: min(28rem, 100%);
  max-height: 90vh;
  overflow-y: auto;
}

.modal h2 {
  margin-bottom: var(--space-4);
}

.modal h3 {
  font-size: 0.9375rem;
  margin-bottom: var(--space-2);
}

.section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

hr {
  border: 0;
  border-top: 1px solid var(--color-border);
  margin: var(--space-4) 0;
}

.hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-body);
  line-height: 1.5;
}

.hint--warning strong {
  color: var(--color-danger);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  width: 100%;
}

.field span {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-head);
}

.form-error {
  color: var(--color-danger);
  margin: var(--space-3) 0 0;
  font-size: 0.875rem;
}

.form-note {
  color: var(--color-body);
  margin: var(--space-3) 0 0;
  font-size: 0.875rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-4);
}
</style>
