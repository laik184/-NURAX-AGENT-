function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

export function toMigrationTimestamp(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = pad2(date.getUTCMonth() + 1);
  const day = pad2(date.getUTCDate());
  const hours = pad2(date.getUTCHours());
  const minutes = pad2(date.getUTCMinutes());
  const seconds = pad2(date.getUTCSeconds());
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}
