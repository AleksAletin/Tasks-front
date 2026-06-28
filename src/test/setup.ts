import '@testing-library/jest-dom/vitest';

// jsdom does not always provide a functional localStorage in this runner
// (it is launched without a valid --localstorage-file). The zustand persist
// middleware needs a working Storage, so install a minimal in-memory polyfill
// when the environment's localStorage is missing or non-functional.
function installMemoryStorage(): void {
  const store = new Map<string, string>();
  const memory: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => {
      store.delete(k);
    },
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
  };
  Object.defineProperty(window, 'localStorage', {
    value: memory,
    configurable: true,
    writable: true,
  });
}

if (typeof window !== 'undefined') {
  const ls = window.localStorage as Storage | undefined;
  if (!ls || typeof ls.setItem !== 'function') {
    installMemoryStorage();
  }
}
