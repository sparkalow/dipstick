<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue';
import { useReceipts } from '../composables/useReceipts';

const props = defineProps<{
  serviceRecordId: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { receipts, loading, loadByServiceRecord, getObjectUrl } = useReceipts();

const previewUrls = reactive<Record<string, string>>({});

onMounted(() => {
  loadByServiceRecord(props.serviceRecordId);
});

watch(
  receipts,
  async (list) => {
    for (const receipt of list) {
      if (!previewUrls[receipt.id]) {
        previewUrls[receipt.id] = await getObjectUrl(receipt.id);
      }
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h2>Receipts</h2>
        <button type="button" class="btn--ghost close-btn" aria-label="Close" @click="emit('close')">&times;</button>
      </div>

      <p v-if="loading" class="muted">Loading…</p>
      <p v-else-if="receipts.length === 0" class="empty-state">No receipts.</p>
      <ul v-else class="preview-list">
        <li v-for="receipt in receipts" :key="receipt.id" class="preview-item">
          <a
            v-if="previewUrls[receipt.id]"
            :href="previewUrls[receipt.id]"
            target="_blank"
            rel="noopener"
            class="preview-link"
          >
            <img
              v-if="receipt.mimeType.startsWith('image/')"
              :src="previewUrls[receipt.id]"
              class="preview-thumb"
              :alt="receipt.filename"
            />
            <span v-else class="preview-badge">{{ receipt.filename }}</span>
          </a>
        </li>
      </ul>

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
  background: rgb(32 48 69 / 55%);
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

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.close-btn {
  font-size: 1.5rem;
  padding: 0 var(--space-2);
  line-height: 1;
}

.muted {
  color: var(--color-body);
}

.preview-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.preview-link {
  display: block;
}

.preview-thumb {
  width: 6rem;
  height: 6rem;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.preview-badge {
  width: 6rem;
  height: 6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  font-size: 0.75rem;
  text-align: center;
  overflow-wrap: anywhere;
  padding: var(--space-1);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
</style>
