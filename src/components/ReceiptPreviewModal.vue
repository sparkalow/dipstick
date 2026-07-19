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
      <h2>Receipts</h2>

      <p v-if="loading">Loading…</p>
      <p v-else-if="receipts.length === 0">No receipts.</p>
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
        <button type="button" @click="emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 40%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.modal {
  background: var(--color-bg);
  border-radius: var(--space-2);
  padding: var(--space-4);
  width: min(28rem, 100%);
  max-height: 90vh;
  overflow-y: auto;
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
  border-radius: var(--space-1);
  border: 1px solid var(--color-border);
}

.preview-badge {
  width: 6rem;
  height: 6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--space-1);
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
