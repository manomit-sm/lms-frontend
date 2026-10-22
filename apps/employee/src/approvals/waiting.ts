const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/** How long a task has waited, in its largest whole unit: "3 days", "1 hour", "under a minute". */
export function waitingFor(sinceIso: string | undefined, now: Date = new Date()): string {
  if (!sinceIso) {
    return '';
  }
  const elapsed = Math.max(0, now.getTime() - new Date(sinceIso).getTime());
  for (const [unit, ms] of UNITS) {
    const amount = Math.floor(elapsed / ms);
    if (amount >= 1) {
      return new Intl.NumberFormat(undefined, { style: 'unit', unit, unitDisplay: 'long' }).format(amount);
    }
  }
  return 'under a minute';
}
