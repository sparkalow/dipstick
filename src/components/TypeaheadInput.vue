<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue';
import { filterOptions, hasExactMatch } from './typeahead';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    options: readonly string[];
    placeholder?: string;
    /** When true (default), any typed text is accepted, not just a listed option. */
    allowCustom?: boolean;
    inputId?: string;
  }>(),
  { allowCustom: true },
);

const emit = defineEmits<{
  'update:modelValue': [string];
}>();

interface Row {
  value: string;
  /** The "use what I typed" row — an unlisted value the user is adding. */
  custom: boolean;
}

const uid = useId();
const listboxId = `typeahead-list-${uid}`;
const optionId = (index: number) => `typeahead-opt-${uid}-${index}`;

const inputEl = ref<HTMLInputElement | null>(null);
const listEl = ref<HTMLUListElement | null>(null);

const query = ref(props.modelValue);
const open = ref(false);
// Opening via focus/toggle shows the whole list; only typing narrows it.
const filtering = ref(false);
const highlighted = ref(-1);

// Keep in step when the parent resets or swaps the bound value (e.g. edit vs. add).
watch(
  () => props.modelValue,
  (value) => {
    if (value !== query.value) query.value = value;
  },
);

const rows = computed<Row[]>(() => {
  const matches = filtering.value ? filterOptions(props.options, query.value) : [...props.options];
  const result: Row[] = matches.map((value) => ({ value, custom: false }));

  const typed = query.value.trim();
  if (props.allowCustom && typed && !hasExactMatch(props.options, typed)) {
    result.push({ value: typed, custom: true });
  }
  return result;
});

function openList() {
  open.value = true;
  filtering.value = false;
  const current = props.options.findIndex((option) => option === props.modelValue);
  highlighted.value = current;
  scrollHighlightedIntoView();
}

function closeList() {
  open.value = false;
  highlighted.value = -1;
}

function onInput(event: Event) {
  // Explicit over v-model: a v-model listener and an @input listener on the same
  // element fire in registration order, so this handler could otherwise read a
  // stale `query`.
  query.value = (event.target as HTMLInputElement).value;
  filtering.value = true;
  open.value = true;
  // The first row is the strongest match, so pre-highlight it for a bare Enter.
  highlighted.value = rows.value.length > 0 ? 0 : -1;
  if (props.allowCustom) emit('update:modelValue', query.value);
}

function select(row: Row) {
  query.value = row.value;
  emit('update:modelValue', row.value);
  closeList();
  inputEl.value?.focus();
}

function move(delta: number) {
  const wasClosed = !open.value;
  if (wasClosed) openList();

  const count = rows.value.length;
  if (count === 0) return;

  // Opening lands on the current value (or the end the arrow points at) rather than stepping past it.
  if (wasClosed) {
    if (highlighted.value < 0) highlighted.value = delta > 0 ? 0 : count - 1;
  } else {
    highlighted.value = (highlighted.value + delta + count) % count;
  }
  scrollHighlightedIntoView();
}

async function scrollHighlightedIntoView() {
  await nextTick();
  if (highlighted.value < 0) return;
  const el = listEl.value?.children[highlighted.value];
  el?.scrollIntoView({ block: 'nearest' });
}

function onEnter(event: KeyboardEvent) {
  // With the list closed, Enter belongs to the surrounding form.
  if (!open.value) return;
  event.preventDefault();
  const row = rows.value[highlighted.value];
  if (row) select(row);
  else closeList();
}

function onEscape(event: KeyboardEvent) {
  if (!open.value) return;
  // Don't let an enclosing modal treat this as a request to close itself.
  event.stopPropagation();
  closeList();
}

function onBlur() {
  closeList();
  const typed = query.value.trim();
  if (!props.allowCustom && !hasExactMatch(props.options, typed)) {
    // Free text isn't allowed here: snap back to the last committed value.
    query.value = props.modelValue;
    return;
  }
  if (typed !== query.value) {
    query.value = typed;
    emit('update:modelValue', typed);
  }
}

function onToggle() {
  if (open.value) closeList();
  else {
    openList();
    inputEl.value?.focus();
  }
}
</script>

<template>
  <div class="typeahead">
    <input
      ref="inputEl"
      :id="inputId"
      :value="query"
      type="text"
      class="typeahead__input"
      role="combobox"
      autocomplete="off"
      :placeholder="placeholder"
      :aria-expanded="open"
      :aria-controls="listboxId"
      :aria-activedescendant="open && highlighted >= 0 ? optionId(highlighted) : undefined"
      @input="onInput"
      @focus="openList"
      @blur="onBlur"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter="onEnter"
      @keydown.esc="onEscape"
      @keydown.tab="closeList"
    />

    <button
      type="button"
      class="typeahead__toggle btn--ghost"
      tabindex="-1"
      :aria-label="open ? 'Hide suggestions' : 'Show suggestions'"
      @mousedown.prevent
      @click="onToggle"
    >
      <span aria-hidden="true">{{ open ? '▴' : '▾' }}</span>
    </button>

    <ul
      v-show="open && rows.length > 0"
      :id="listboxId"
      ref="listEl"
      class="typeahead__list"
      role="listbox"
    >
      <li
        v-for="(row, index) in rows"
        :key="row.custom ? `custom:${row.value}` : row.value"
        :id="optionId(index)"
        class="typeahead__option"
        :class="{
          'typeahead__option--active': index === highlighted,
          'typeahead__option--custom': row.custom,
        }"
        role="option"
        :aria-selected="index === highlighted"
        @mousedown.prevent="select(row)"
        @mousemove="highlighted = index"
      >
        <template v-if="row.custom">Use “{{ row.value }}”</template>
        <template v-else>{{ row.value }}</template>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.typeahead {
  position: relative;
  display: flex;
  align-items: stretch;
}

.typeahead__input {
  width: 100%;
  /* Room for the toggle button. */
  padding-right: 2.25rem;
}

.typeahead__toggle {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  padding: 0 0.625rem;
  font-size: 0.75rem;
  color: var(--color-body);
}

.typeahead__toggle:hover {
  filter: none;
  color: var(--color-head);
}

.typeahead__list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 10;
  margin: 0;
  padding: var(--space-1);
  list-style: none;
  max-height: 14rem;
  overflow-y: auto;
  background: var(--color-card);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-card);
}

.typeahead__option {
  padding: 0.4375rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  color: var(--color-head);
  cursor: pointer;
}

.typeahead__option--active {
  background: var(--color-surface);
}

.typeahead__option--custom {
  color: var(--color-body);
  font-style: italic;
}

.typeahead__option--custom.typeahead__option--active {
  color: var(--color-head);
}
</style>
