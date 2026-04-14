export const average = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((acc, value) => acc + value, 0) / values.length;

export const stdDev = (values: number[]): number => {
  if (values.length < 2) {
    return 0;
  }
  const mean = average(values);
  const variance =
    values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
};

export const round = (value: number, decimals = 4): number => {
  const base = 10 ** decimals;
  return Math.round(value * base) / base;
};
