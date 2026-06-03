export function fmt(n: number | null | undefined, decimals = 0): string {
  if (n == null) return "N/A";
  return n.toFixed(decimals);
}

export function fmtMap(name: string): string {
  return name
    .replace(/^de_|^cs_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function toUnixSeconds(date: Date | string): number {
  return Math.floor(new Date(date).getTime() / 1_000);
}
