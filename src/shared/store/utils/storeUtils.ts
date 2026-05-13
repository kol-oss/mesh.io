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
