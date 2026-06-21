"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientDate } from "@/components/client-date";
import { CopyButton } from "@/components/copy-button";
import {
  useSessionResponses,
  type SessionResponsesData,
} from "@/hooks/use-session-responses";

export function SessionDetail({
  sessionId,
  publicUrl,
  initialData,
}: {
  sessionId: string;
  publicUrl: string;
  initialData: SessionResponsesData;
}) {
  const queryClient = useQueryClient();
  const { data } = useSessionResponses(sessionId, initialData);
  const view = data ?? initialData;
  const { session, questions, responses, responseCount } = view;

  const statusMutation = useMutation({
    mutationFn: async (action: "close" | "reopen") => {
      const res = await fetch(`/api/sessions/${sessionId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Failed to update session");
      return res.json();
    },
    onSuccess: (_data, action) => {
      toast.success(action === "close" ? "Session closed" : "Session reopened");
      queryClient.invalidateQueries({
        queryKey: ["session", sessionId, "responses"],
      });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const isOpen = session.status === "open";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {session.title}
            </h1>
            <Badge variant={isOpen ? "success" : "secondary"}>
              {isOpen ? "Open" : "Closed"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <code className="rounded bg-muted px-2 py-1 text-xs">
              {publicUrl}
            </code>
            <CopyButton value={publicUrl} />
          </div>
        </div>
        <Button
          variant={isOpen ? "destructive" : "default"}
          onClick={() => statusMutation.mutate(isOpen ? "close" : "reopen")}
          disabled={statusMutation.isPending}
        >
          {isOpen ? <Lock /> : <Unlock />}
          {isOpen ? "Close session" : "Reopen session"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Responses" value={String(responseCount)} />
        <Stat label="Opened" value={<ClientDate value={session.openedAt} />} />
        <Stat
          label="Scheduled close"
          value={<ClientDate value={session.scheduledCloseAt} />}
        />
        <Stat
          label="Closed"
          value={<ClientDate value={session.closedAt} />}
        />
      </div>

      <Card>
        <CardContent>
          {responses.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No responses yet. Share the public link with your team.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Submitted</TableHead>
                  {questions.map((q) => (
                    <TableHead key={q.id} className="min-w-[12rem]">
                      {q.questionText}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((r) => (
                  <TableRow key={r.participantId} className="align-top">
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <ClientDate value={r.submittedAt} />
                    </TableCell>
                    {questions.map((q) => (
                      <TableCell
                        key={q.id}
                        className="max-w-sm text-sm whitespace-pre-wrap"
                      >
                        {r.answers[q.id]?.trim() || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </CardContent>
    </Card>
  );
}
