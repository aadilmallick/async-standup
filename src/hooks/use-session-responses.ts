"use client";

import { useQuery } from "@tanstack/react-query";

export interface SessionQuestion {
  id: string;
  questionText: string;
  sortOrder: number;
}

export interface SessionResponse {
  participantId: string;
  name: string;
  email: string;
  submittedAt: string;
  answers: Record<string, string>;
}

export interface SessionResponsesData {
  session: {
    id: string;
    title: string;
    status: "open" | "closed";
    publicSlug: string;
    openedAt: string;
    scheduledCloseAt: string | null;
    closedAt: string | null;
  };
  questions: SessionQuestion[];
  responses: SessionResponse[];
  responseCount: number;
}

export function useSessionResponses(
  sessionId: string,
  initialData?: SessionResponsesData
) {
  return useQuery<SessionResponsesData>({
    queryKey: ["session", sessionId, "responses"],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/responses`);
      if (!res.ok) throw new Error("Failed to load responses");
      return res.json();
    },
    refetchInterval: 30000,
    initialData,
  });
}
