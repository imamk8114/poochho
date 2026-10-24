export const fmt = (v: number) => (Number.isInteger(v) ? v.toLocaleString('en-IN') : v.toFixed(1));
