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

      <form @submit.prevent="submit">
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
          <button type="button" @click="emit('close')">Cancel</button>
          <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
        </div>
      </form>
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

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-bottom: var(--space-3);
}

.field input,
.field select {
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--space-1);
  font-family: inherit;
  font-size: 1rem;
}

.form-error {
  color: #b3261e;
  margin-bottom: var(--space-3);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>
