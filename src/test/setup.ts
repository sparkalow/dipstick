import 'fake-indexeddb/auto';

// ---------------------------------------------------------------------------
// Browser globals that `dexie-export-import` needs and Vitest's `node`
// environment doesn't provide. Both are environment polyfills (same role as
// fake-indexeddb above), not stand-ins for anything this project owns.
// ---------------------------------------------------------------------------

// The addon reads `self` at module load (`'FileReaderSync' in self`) to decide
// whether it can read Blobs synchronously. In a browser `self` *is* the global
// object; aliasing it keeps that check honest — `FileReaderSync` is absent, so
// the addon takes its async FileReader path, exactly as it does on a real main
// thread.
(globalThis as { self?: typeof globalThis }).self ??= globalThis;

/** Latin-1 "binary string", one char per byte — what `readAsBinaryString` returns. */
function toBinaryString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = '';
  // Chunked so a large receipt blob can't blow the argument limit on spread.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return out;
}

type ReaderEvent = { target: MinimalFileReader };
type ReaderHandler = (ev: ReaderEvent) => void;

/**
 * Enough of the FileReader API for the addon's `readAsArrayBuffer` and for
 * typeson's Blob codec (`readAsBinaryString` + addEventListener), implemented
 * over `Blob.arrayBuffer()`.
 */
class MinimalFileReader {
  result: ArrayBuffer | string | null = null;
  error: unknown = null;
  onload: ReaderHandler | null = null;
  onerror: ReaderHandler | null = null;
  onabort: ReaderHandler | null = null;

  private listeners = new Map<string, Set<ReaderHandler>>();

  addEventListener(type: string, handler: ReaderHandler): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(handler);
  }

  removeEventListener(type: string, handler: ReaderHandler): void {
    this.listeners.get(type)?.delete(handler);
  }

  readAsArrayBuffer(blob: Blob): void {
    this.read(blob, (buffer) => buffer);
  }

  readAsBinaryString(blob: Blob): void {
    this.read(blob, toBinaryString);
  }

  readAsText(blob: Blob): void {
    this.read(blob, (buffer) => new TextDecoder().decode(buffer));
  }

  private read(blob: Blob, toResult: (buffer: ArrayBuffer) => ArrayBuffer | string): void {
    blob.arrayBuffer().then(
      (buffer) => {
        this.result = toResult(buffer);
        this.dispatch('load');
      },
      (err) => {
        this.error = err;
        this.dispatch('error');
      },
    );
  }

  private dispatch(type: 'load' | 'error' | 'abort'): void {
    const event: ReaderEvent = { target: this };
    const inline = type === 'load' ? this.onload : type === 'error' ? this.onerror : this.onabort;
    inline?.call(this, event);
    for (const handler of this.listeners.get(type) ?? []) {
      handler.call(this, event);
    }
  }
}

(globalThis as { FileReader?: unknown }).FileReader ??= MinimalFileReader;
