const UNITS: Record<string, number> = {
  s: 1 / 60,
  m: 1,
  h: 60,
  d: 1440,
  w: 10080,
};

export function parseDuration(input: string): number | null {
  const match = input.trim().toLowerCase().match(/^(\d+)([smhdw])$/);
  if (!match) return null;
  return Math.round(parseInt(match[1]!) * UNITS[match[2]!]!);
}

export function formatDuration(minutes: number): string {
  if (minutes >= 10080 && minutes % 10080 === 0) return `${minutes / 10080}w`;
  if (minutes >= 1440 && minutes % 1440 === 0) return `${minutes / 1440}d`;
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}m`;
}
