export function loadState<T>(key: string, defaultValue: T): T {
  try {
    const serialized = localStorage.getItem(key);
    if (!serialized) return defaultValue;
    return JSON.parse(serialized) as T;
  } catch {
    return defaultValue;
  }
}

export function loadStates<T>(key: string): T[] {
  try {
    const serialized = localStorage.getItem(key);
    if (!serialized) return [];
    return JSON.parse(serialized) as T[];
  } catch {
    return [];
  }
}

export function setState<T>(key: string, state: T) {
  if (state == null || (Array.isArray(state) && state.length === 0)) {
    localStorage.removeItem(key);
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore storage write errors (e.g. private mode quota exceeded)
  }
}
