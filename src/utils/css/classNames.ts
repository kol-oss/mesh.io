export function buildClassName(
  base: string,
  modifiers: Record<string, boolean | undefined>,
): string {
  const classList = [base];
  for (const [modifier, isActive] of Object.entries(modifiers)) {
    if (isActive) {
      classList.push(`${base}--${modifier}`);
    }
  }
  return classList.join(" ");
}
