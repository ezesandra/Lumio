"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Send, User, Bot, Loader2, MessageSquare } from "lucide-react";
import { useParams } from "next/navigation";

export default function DiscussPage({ params: _params }: { params: Promise<{ documentId: string }> }) {
  const params = useParams() as { documentId: string };
  const documentId = params.documentId;

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/study/${documentId}/chat`)
      .then(res => res.json())
      .then(data => {
        if (data.messages) setMessages(data.messages);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [documentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage = { role: "user", content: input, id: Date.now().toString() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`/api/study/${documentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content })
      });
      const data = await res.json();
      
      if (data.success && data.message) {
        setMessages(prev => [...prev.filter(m => m.id !== userMessage.id), userMessage, data.message]);
      } else {
        alert(data.error ? (data.error + (data.details ? " - " + data.details : "")) : "Failed to send message");
        setMessages(prev => prev.filter(m => m.id !== userMessage.id)); // revert
      }
    } catch (err: any) {
      alert("Failed to send message: " + err.message);
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)", gap: "var(--spacing-4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)" }}>
        <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "hsla(0, 0%, 0%, 0.04)", color: "var(--color-text-secondary)" }}>
          <MessageSquare size={20} />
        </div>
        <h1 style={{ fontFamily: "var(--font-family-display)", fontSize: "var(--font-size-xl)", color: "var(--color-text-primary)", margin: 0 }}>Discuss with AI</h1>
      </div>

      <Card style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 }}>
        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--color-brand)" }} />
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-6)", display: "flex", flexDirection: "column", gap: "var(--spacing-4)" }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--color-text-secondary)", marginTop: "auto", marginBottom: "auto" }}>
                  Ask me anything about your document!
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={msg.id || idx} style={{ display: "flex", gap: "var(--spacing-3)", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "var(--radius-full)", background: msg.role === "user" ? "var(--color-brand-subtle)" : "var(--color-surface-hover)", display: "flex", alignItems: "center", justifyContent: "center", color: msg.role === "user" ? "var(--color-brand)" : "var(--color-text-secondary)", flexShrink: 0 }}>
                      {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div style={{ background: msg.role === "user" ? "var(--color-brand)" : "var(--color-surface-elevated)", color: msg.role === "user" ? "white" : "var(--color-text-primary)", padding: "var(--spacing-3) var(--spacing-4)", borderRadius: "var(--radius-lg)", border: msg.role === "user" ? "none" : "1px solid var(--color-border)", maxWidth: "80%", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {sending && (
                <div style={{ display: "flex", gap: "var(--spacing-3)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "var(--radius-full)", background: "var(--color-surface-hover)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)", flexShrink: 0 }}>
                    <Bot size={16} />
                  </div>
                  <div style={{ background: "var(--color-surface-elevated)", color: "var(--color-text-primary)", padding: "var(--spacing-3) var(--spacing-4)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)" }}>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            
            <form onSubmit={handleSend} style={{ display: "flex", gap: "var(--spacing-3)", padding: "var(--spacing-4)", borderTop: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask a question about this document..."
                disabled={sending}
                style={{ flex: 1 }}
              />
              <Button type="submit" disabled={sending || !input.trim()} iconOnly>
                <Send size={18} />
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
