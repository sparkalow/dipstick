import { ref } from 'vue';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'dipstick-theme';

function readInitial(): Theme {
  // The inline bootstrap in index.html sets data-theme before first paint;
  // prefer it so this composable never disagrees with what's on screen.
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'dark'; // default: dark
}

const theme = ref<Theme>(readInitial());

function apply(next: Theme): void {
  document.documentElement.setAttribute('data-theme', next);
}

apply(theme.value);

function setTheme(next: Theme): void {
  theme.value = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Private-mode / storage-disabled — theme still applies for this session.
  }
  apply(next);
}

function toggleTheme(): void {
  setTheme(theme.value === 'dark' ? 'light' : 'dark');
}

export function useTheme() {
  return { theme, setTheme, toggleTheme };
}
