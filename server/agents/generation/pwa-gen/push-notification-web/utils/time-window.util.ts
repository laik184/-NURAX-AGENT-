function asHour(isoTime: string): number {
  return new Date(isoTime).getUTCHours();
}

export function isWithinDeliveryWindow(
  isoTime: string,
  windowStartHourUtc = 8,
  windowEndHourUtc = 20,
): boolean {
  const hour = asHour(isoTime);
  return hour >= windowStartHourUtc && hour < windowEndHourUtc;
}

export function nextAllowedWindowIso(
  isoTime: string,
  windowStartHourUtc = 8,
): string {
  const date = new Date(isoTime);
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), windowStartHourUtc, 0, 0, 0));

  if (date.getUTCHours() >= windowStartHourUtc) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next.toISOString();
}
