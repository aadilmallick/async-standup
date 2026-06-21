export const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

export function recurrenceSummary(input: {
  recurrenceType: string;
  weekdays?: number[] | null;
}): string {
  switch (input.recurrenceType) {
    case "daily":
      return "Every day";
    case "weekdays":
      return "Weekdays (Mon–Fri)";
    case "custom": {
      const days = (input.weekdays ?? [])
        .slice()
        .sort((a, b) => a - b)
        .map((d) => WEEKDAY_LABELS[d])
        .filter(Boolean);
      return days.length ? days.join(", ") : "Custom";
    }
    default:
      return input.recurrenceType;
  }
}
