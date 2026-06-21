"use client";

import { useEffect, useState } from "react";

type Mode = "date" | "time" | "datetime";

const OPTIONS: Record<Mode, Intl.DateTimeFormatOptions> = {
  date: { dateStyle: "medium" },
  time: { timeStyle: "short" },
  datetime: { dateStyle: "medium", timeStyle: "short" },
};

/**
 * Renders a UTC timestamp in the viewer's local timezone. Formats after mount
 * to avoid server/client hydration mismatches.
 */
export function ClientDate({
  value,
  mode = "datetime",
  fallback = "—",
}: {
  value: string | Date | null | undefined;
  mode?: Mode;
  fallback?: string;
}) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    // Format in the viewer's locale/timezone only after mount to avoid SSR
    // hydration mismatches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(
      value ? new Date(value).toLocaleString(undefined, OPTIONS[mode]) : fallback
    );
  }, [value, mode, fallback]);

  return (
    <span suppressHydrationWarning>{text ?? (value ? "…" : fallback)}</span>
  );
}
