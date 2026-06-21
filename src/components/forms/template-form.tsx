"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface QuestionDraft {
  questionText: string;
  isRequired: boolean;
}

export interface TemplateFormInitial {
  title: string;
  description: string;
  questions: QuestionDraft[];
}

export function TemplateForm({
  mode,
  templateId,
  initial,
}: {
  mode: "create" | "edit";
  templateId?: string;
  initial?: TemplateFormInitial;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    initial?.questions?.length
      ? initial.questions
      : [{ questionText: "", isRequired: true }]
  );
  const [saving, setSaving] = useState(false);

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, { questionText: "", isRequired: true }]);
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    setQuestions((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const cleaned = questions
      .map((q) => ({ ...q, questionText: q.questionText.trim() }))
      .filter((q) => q.questionText.length > 0);

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (cleaned.length === 0) {
      toast.error("Add at least one question");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        questions: cleaned.map((q) => ({
          questionText: q.questionText,
          questionType: "textarea" as const,
          isRequired: q.isRequired,
        })),
      };
      const res = await fetch(
        mode === "create"
          ? "/api/templates"
          : `/api/templates/${templateId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save template");
      }
      toast.success(mode === "create" ? "Template created" : "Template saved");
      router.push("/dashboard/templates");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Template title</Label>
            <Input
              id="title"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Engineering Daily Standup"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              maxLength={1000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this standup is for…"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Questions</h2>
          <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
            <Plus /> Add question
          </Button>
        </div>

        {questions.map((q, i) => (
          <Card key={i}>
            <CardContent className="flex items-start gap-3">
              <GripVertical className="mt-2 size-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 space-y-3">
                <Textarea
                  value={q.questionText}
                  maxLength={500}
                  onChange={(e) =>
                    updateQuestion(i, { questionText: e.target.value })
                  }
                  placeholder={`Question ${i + 1}`}
                />
                <div className="flex items-center justify-between">
                  <Label className="gap-2">
                    <Switch
                      checked={q.isRequired}
                      onCheckedChange={(v) =>
                        updateQuestion(i, { isRequired: v })
                      }
                    />
                    Required
                  </Label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => move(i, 1)}
                      disabled={i === questions.length - 1}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuestion(i)}
                      disabled={questions.length === 1}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/templates")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : mode === "create" ? "Create template" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
