export const parseNumberValue = (value: string, fallback: number) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

export const parsePositiveNumberValue = (value: string, fallback: number, minimum = 1) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue >= minimum ? parsedValue : fallback;
};
