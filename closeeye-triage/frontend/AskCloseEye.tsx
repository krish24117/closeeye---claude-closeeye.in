// ─────────────────────────────────────────────────────────────────────────
// Ask Close Eye · Frontend renderer (Vite + React + TS)
// Consumes the ask-health function and renders the lane-aware UI:
//   - Lane 3 gets the urgent (clay) treatment
//   - Lanes 1 & 2 show the disclaimer and any quick-reply actions
// Wire the action handlers (book_consult, send_coordinator, etc.) to your flows.
// ─────────────────────────────────────────────────────────────────────────

import { useState } from "react";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-health`;

type Lane = "inform" | "connect" | "escalate";
interface Action { id: string; label: string; kind: string; payload?: Record<string, unknown> }
interface TriageResponse {
  lane: Lane;
  topic: string;
  message: string;
  disclaimer?: string;
  suggestedActions: Action[];
  requiresHuman: boolean;
  capReached?: boolean;
}

const LANE_STYLE: Record<Lane, { bg: string; border: string; text: string }> = {
  inform:   { bg: "#ffffff", border: "#e4e0d6", text: "#1d2e26" },
  connect:  { bg: "#fffaf0", border: "#ecd3a3", text: "#5a4517" },
  escalate: { bg: "#fdece4", border: "#e8bda8", text: "#5d2f18" },
};

export function AskCloseEye({ userId, parentId, accessToken }: {
  userId: string; parentId: string; accessToken: string;
}) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<TriageResponse | null>(null);

  async function ask() {
    if (!question.trim()) return;
    setLoading(true);
    setReply(null);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ userId, parentId, question: question.trim() }),
      });
      setReply(await res.json());
    } catch {
      // Fail safe in the UI too: never leave a worried user with nothing.
      setReply({
        lane: "connect", topic: "general", requiresHuman: true,
        message: "I'm having trouble right now. To be safe, let's get a doctor or coordinator to help — tap below.",
        suggestedActions: [{ id: "book_consult", label: "📹 Talk to a doctor", kind: "book_consult" }],
      });
    } finally {
      setLoading(false);
    }
  }

  function handleAction(a: Action) {
    // TODO: route each action to its flow.
    switch (a.kind) {
      case "book_consult":    /* open consult booking */ break;
      case "send_coordinator":/* create coordinator task */ break;
      case "call_ambulance":  window.location.href = `tel:${(a.payload as any)?.number ?? "108"}`; break;
      case "call_hospital":   window.location.href = `tel:${(a.payload as any)?.phone ?? ""}`; break;
      case "directions":      window.open(String((a.payload as any)?.url ?? ""), "_blank"); break;
      case "create_summary":  /* generate health summary PDF */ break;
      case "upgrade":         /* open upgrade / Razorpay */ break;
      case "note_only":       /* flag coordinator note */ break;
    }
  }

  const s = reply ? LANE_STYLE[reply.lane] : null;

  return (
    <div style={{ maxWidth: 480, fontFamily: "'Open Sauce Sans', system-ui, sans-serif" }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Ask about your parent's health…"
          style={{ flex: 1, padding: "11px 13px", borderRadius: 12, border: "1px solid #dfd9cd" }}
        />
        <button
          onClick={ask}
          disabled={loading}
          style={{ padding: "0 18px", borderRadius: 12, border: 0, background: "#0E2A1F", color: "#FAF7F2", fontWeight: 600 }}
        >
          {loading ? "…" : "Ask"}
        </button>
      </div>

      {reply && s && (
        <div style={{ marginTop: 14, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 14, padding: "14px 16px", color: s.text }}>
          {reply.lane === "escalate" && (
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#C0734F", marginBottom: 6 }}>
              Urgent
            </div>
          )}
          <div style={{ fontSize: 14.5, lineHeight: 1.5 }}>{reply.message}</div>

          {reply.suggestedActions.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {reply.suggestedActions.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleAction(a)}
                  style={{
                    fontSize: 13, fontWeight: 600, padding: "8px 13px", borderRadius: 999, cursor: "pointer",
                    background: "#fff",
                    border: `1px solid ${reply.lane === "escalate" ? "#C0734F" : "#7FBF94"}`,
                    color: reply.lane === "escalate" ? "#9a4a26" : "#2c6b43",
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {reply.disclaimer && (
            <div style={{ marginTop: 10, fontSize: 11.5, fontStyle: "italic", color: "#7e8b83" }}>
              {reply.disclaimer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
