"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { WEEKDAY_LABELS } from "@/lib/format";

type RecurrenceType = "daily" | "weekdays" | "custom";

export interface ScheduleFormInitial {
  name: string;
  templateId: string;
  recurrenceType: RecurrenceType;
  weekdays: number[];
  localTime: string;
  timezone: string;
  closeAfterMinutes: number;
  sessionTitleFormat: string;
  active: boolean;
}

export function ScheduleForm({
  mode,
  scheduleId,
  templates,
  initial,
}: {
  mode: "create" | "edit";
  scheduleId?: string;
  templates: { id: string; title: string }[];
  initial?: ScheduleFormInitial;
}) {
  const router = useRouter();
  const browserTz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  const [name, setName] = useState(initial?.name ?? "");
  const [templateId, setTemplateId] = useState(
    initial?.templateId ?? templates[0]?.id ?? ""
  );
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(
    initial?.recurrenceType ?? "weekdays"
  );
  const [weekdays, setWeekdays] = useState<number[]>(
    initial?.weekdays ?? [1, 3, 5]
  );
  const [localTime, setLocalTime] = useState(initial?.localTime ?? "09:00");
  const [timezone, setTimezone] = useState(initial?.timezone ?? browserTz);
  const [closeAfterMinutes, setCloseAfterMinutes] = useState(
    String(initial?.closeAfterMinutes ?? 120)
  );
  const [sessionTitleFormat, setSessionTitleFormat] = useState(
    initial?.sessionTitleFormat ?? "{templateTitle} — {date}"
  );
  const [active, setActive] = useState(initial?.active ?? true);
  const [submitting, setSubmitting] = useState(false);

  function toggleWeekday(day: number) {
    setWeekdays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) return toast.error("Name is required");
    if (!templateId) return toast.error("Select a template");
    const close = Number(closeAfterMinutes);
    if (!Number.isInteger(close) || close < 5 || close > 1440) {
      return toast.error("Close after must be between 5 and 1440 minutes");
    }
    if (recurrenceType === "custom" && weekdays.length === 0) {
      return toast.error("Select at least one day");
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        templateId,
        recurrenceType,
        weekdays: recurrenceType === "custom" ? weekdays : null,
        localTime,
        timezone: timezone.trim(),
        closeAfterMinutes: close,
        sessionTitleFormat: sessionTitleFormat.trim(),
        active,
      };
      const res = await fetch(
        mode === "create" ? "/api/schedules" : `/api/schedules/${scheduleId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save schedule");
      }
      toast.success(mode === "create" ? "Schedule created" : "Schedule saved");
      router.push("/dashboard/schedules");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Schedule name</Label>
            <Input
              id="name"
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              placeholder="Engineering daily"
            />
          </div>

          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Recurrence</Label>
              <Select
                value={recurrenceType}
                onValueChange={(v) => setRecurrenceType(v as RecurrenceType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekdays">Weekdays</SelectItem>
                  <SelectItem value="custom">Custom days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="localTime">Open time</Label>
              <Input
                id="localTime"
                type="time"
                value={localTime}
                onChange={(e) => setLocalTime(e.target.value)}
              />
            </div>
          </div>

          {recurrenceType === "custom" ? (
            <div className="space-y-2">
              <Label>Days</Label>
              <div className="flex flex-wrap gap-3">
                {WEEKDAY_LABELS.map((label, day) => (
                  <Label
                    key={day}
                    className="rounded-md border px-3 py-2 font-normal"
                  >
                    <Checkbox
                      checked={weekdays.includes(day)}
                      onCheckedChange={() => toggleWeekday(day)}
                    />
                    {label}
                  </Label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone (IANA)</Label>
              <Input
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="America/New_York"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closeAfter">Close after (minutes)</Label>
              <Input
                id="closeAfter"
                type="number"
                min={5}
                max={1440}
                value={closeAfterMinutes}
                onChange={(e) => setCloseAfterMinutes(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="titleFormat">Session title format</Label>
            <Input
              id="titleFormat"
              value={sessionTitleFormat}
              maxLength={200}
              onChange={(e) => setSessionTitleFormat(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Tokens: {"{templateTitle}"} and {"{date}"}.
            </p>
          </div>

          <Label className="gap-2">
            <Switch checked={active} onCheckedChange={setActive} />
            Active
          </Label>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/schedules")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving…"
                : mode === "create"
                  ? "Create schedule"
                  : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
