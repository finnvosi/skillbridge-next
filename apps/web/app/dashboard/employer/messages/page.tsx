"use client";

import { useEffect, useState, useRef } from "react";
import { apiRequest, API_ENDPOINTS, getToken } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { Send, MessageSquare, Paperclip } from "lucide-react";

interface Conversation {
  id: string;
  candidate: { id: string; name: string; email: string; avatar?: string | null };
  job: { id: string; title: string } | null;
  lastMessage: { body: string; at: string; senderRole: string } | null;
  unread: number;
  updatedAt: string;
}

interface ThreadMessage {
  id: string;
  body: string;
  senderRole: "employer" | "student";
  read: boolean;
  createdAt: string;
}

function initials(name?: string) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function EmployerMessagesPage() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const token = getToken();
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadConversations() {
    const d = await apiRequest<{ conversations: Conversation[] }>(
      API_ENDPOINTS.messages.conversations,
      { method: "GET", token }
    );
    setConversations(d.conversations ?? []);
    if (!activeId && (d.conversations ?? []).length > 0) setActiveId(d.conversations[0].id);
  }

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        await loadConversations();
      } catch {
        // empty
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!activeId) return;
    (async () => {
      try {
        const d = await apiRequest<{ conversation: { messages: ThreadMessage[] } }>(
          API_ENDPOINTS.messages.conversation(activeId),
          { method: "GET", token }
        );
        setThread(d.conversation.messages ?? []);
      } catch {
        // empty
      }
    })();
  }, [activeId, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  async function send() {
    if (!draft.trim() || !activeId) return;
    setSending(true);
    try {
      await apiRequest(API_ENDPOINTS.messages.send(activeId), {
        method: "POST",
        token,
        body: { body: draft.trim() },
      });
      setDraft("");
      const d = await apiRequest<{ conversation: { messages: ThreadMessage[] } }>(
        API_ENDPOINTS.messages.conversation(activeId),
        { method: "GET", token }
      );
      setThread(d.conversation.messages ?? []);
      await loadConversations();
    } finally {
      setSending(false);
    }
  }

  const active = conversations.find((c) => c.id === activeId);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full md:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Messages"
        title="Candidate Messages"
        subtitle="Direct conversations with your applicants."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {/* Conversation list */}
        <Card className="flex max-h-[70vh] flex-col overflow-hidden p-0">
          <div className="border-b border-gray-100 p-3 text-sm font-semibold text-gray-700">
            Conversations
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">No conversations yet.</div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`flex w-full items-start gap-3 border-b border-gray-50 p-3 text-left transition hover:bg-gray-50 ${
                    activeId === c.id ? "bg-primary/5" : ""
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-display text-xs font-bold text-primary">
                    {initials(c.candidate.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-medium text-gray-900">{c.candidate.name}</p>
                      {c.unread > 0 && (
                        <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-white">
                          {c.unread}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-gray-500">
                      {c.lastMessage?.body ?? "No messages yet"}
                    </p>
                    {c.job && <p className="truncate text-[11px] text-gray-400">{c.job.title}</p>}
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Thread */}
        <Card className="flex max-h-[70vh] flex-col overflow-hidden p-0 md:col-span-2">
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center text-gray-400">
              <MessageSquare className="h-10 w-10" />
              <p className="mt-2 text-sm">Select a conversation</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-gray-100 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-display text-sm font-bold text-primary">
                  {initials(active.candidate.name)}
                </span>
                <div>
                  <p className="font-display font-bold text-gray-900">{active.candidate.name}</p>
                  <p className="text-xs text-gray-500">
                    {active.job?.title ?? "Candidate"} · {active.candidate.email}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {thread.map((m) => {
                  const mine = m.senderRole === "employer";
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                          mine
                            ? "bg-primary text-white"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {m.body}
                        <div className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-gray-400"}`}>
                          {new Date(m.createdAt).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div className="flex items-center gap-2 border-t border-gray-100 p-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Type a message…"
                  className="flex-1 rounded-xl border border-gray-200 bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary/40"
                />
                <Button
                  onClick={send}
                  disabled={sending || !draft.trim()}
                  className="!px-3"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
