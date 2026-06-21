"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface PublicQuestion {
  id: string;
  questionText: string;
  isRequired: boolean;
}

export function StandupForm({
  publicSlug,
  questions,
}: {
  publicSlug: string;
  questions: PublicQuestion[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name is required");
    if (!email.trim()) return toast.error("Email is required");

    for (const q of questions) {
      if (q.isRequired && !(answers[q.id] ?? "").trim()) {
        return toast.error("Please answer all required questions");
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/standup-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicSlug,
          name: name.trim(),
          email: email.trim(),
          answers,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Submission failed");
      }
      router.push(`/s/${publicSlug}/submitted`);
    } catch (err) {
      toast.error((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            maxLength={200}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>

      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <Label htmlFor={q.id}>
            {q.questionText}
            {q.isRequired ? (
              <span className="text-destructive"> *</span>
            ) : (
              <span className="text-muted-foreground"> (optional)</span>
            )}
          </Label>
          <Textarea
            id={q.id}
            value={answers[q.id] ?? ""}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            required={q.isRequired}
          />
        </div>
      ))}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit standup"}
      </Button>
    </form>
  );
}
