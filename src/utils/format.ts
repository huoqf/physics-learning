export function formatPhysics(value: number, unit: string, precision: number = 2): string {
  const formattedValue = value.toFixed(precision);
  return `${formattedValue} ${unit}`;
}
