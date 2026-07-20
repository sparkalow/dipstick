<script setup lang="ts">
import { ref } from 'vue';
import { useVehicles } from '../composables/useVehicles';
import type { OdometerUnit, Vehicle } from '../domain/vehicle';

const props = defineProps<{
  vehicle?: Vehicle | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { add, update, error } = useVehicles();

const name = ref(props.vehicle?.name ?? '');
const make = ref(props.vehicle?.make ?? '');
const model = ref(props.vehicle?.model ?? '');
const year = ref<number | undefined>(props.vehicle?.year);
const vin = ref(props.vehicle?.vin ?? '');
const odometerUnit = ref<OdometerUnit>(props.vehicle?.odometerUnit ?? 'mi');

const validationError = ref<string | null>(null);
const saving = ref(false);

async function submit() {
  if (!name.value.trim()) {
    validationError.value = 'Name is required.';
    return;
  }
  validationError.value = null;

  const input = {
    name: name.value.trim(),
    make: make.value.trim() || undefined,
    model: model.value.trim() || undefined,
    year: year.value,
    vin: vin.value.trim() || undefined,
    odometerUnit: odometerUnit.value,
  };

  saving.value = true;
  try {
    if (props.vehicle) {
      await update(props.vehicle.id, input);
    } else {
      await add(input);
    }
    emit('close');
  } catch {
    // error ref already holds the message; keep the modal open so the user can retry.
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal" role="dialog" aria-modal="true">
      <h2>{{ vehicle ? 'Edit vehicle' : 'Add vehicle' }}</h2>

      <form class="modal-form" @submit.prevent="submit">
        <label class="field">
          <span>Name *</span>
          <input v-model="name" type="text" required />
        </label>

        <label class="field">
          <span>Make</span>
          <input v-model="make" type="text" />
        </label>

        <label class="field">
          <span>Model</span>
          <input v-model="model" type="text" />
        </label>

        <label class="field">
          <span>Year</span>
          <input v-model.number="year" type="number" />
        </label>

        <label class="field">
          <span>VIN</span>
          <input v-model="vin" type="text" />
        </label>

        <label class="field">
          <span>Odometer unit</span>
          <select v-model="odometerUnit">
            <option value="mi">mi</option>
            <option value="km">km</option>
          </select>
        </label>

        <p v-if="validationError" class="form-error">{{ validationError }}</p>
        <p v-if="error" class="form-error">{{ error }}</p>

        <div class="modal-actions">
          <button type="button" class="btn--secondary" @click="emit('close')">Cancel</button>
          <button type="submit" class="btn--primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
        </div>
      </form>
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

.modal h2 {
  margin-bottom: var(--space-4);
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.field span {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-head);
}

.form-error {
  color: var(--color-danger);
  margin: 0;
  font-size: 0.875rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
</style>
