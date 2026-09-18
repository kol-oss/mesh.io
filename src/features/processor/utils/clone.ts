export const clone = <T>(object: T): T => {
  return structuredClone(object);
};
