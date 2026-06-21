"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StartSessionForm({
  templateId,
  defaultTitle,
}: {
  templateId: string;
  defaultTitle: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(defaultTitle);
  const [closeAfter, setCloseAfter] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Session title is required");
      return;
    }

    let closeAfterMinutes: number | null = null;
    if (closeAfter.trim()) {
      const n = Number(closeAfter);
      if (!Number.isInteger(n) || n < 5 || n > 1440) {
        toast.error("Close duration must be between 5 and 1440 minutes");
        return;
      }
      closeAfterMinutes = n;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          title: title.trim(),
          closeAfterMinutes,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to start session");
      }
      const data = await res.json();
      toast.success("Standup session started");
      router.push(`/dashboard/sessions/${data.id}`);
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
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Session title</Label>
            <Input
              id="title"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="closeAfter">Close after (minutes, optional)</Label>
            <Input
              id="closeAfter"
              type="number"
              min={5}
              max={1440}
              value={closeAfter}
              onChange={(e) => setCloseAfter(e.target.value)}
              placeholder="e.g. 120"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to keep it open until you close it manually.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Starting…" : "Start session"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
