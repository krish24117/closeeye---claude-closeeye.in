import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Health query → Claude draft answer (general wellness guidance only), stored in
// member_queries for doctor review. The AI draft is NEVER a diagnosis; a Close
// Eye doctor reviews it before it's marked doctor_reviewed.
//
// Secrets: ANTHROPIC_API_KEY (required), plus SUPABASE_* (auto-provided).

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

const SYSTEM_PROMPT = `You are Close Eye's wellbeing assistant for families in India caring for elderly parents and children.
Give warm, brief, practical GENERAL WELLNESS guidance only.
You are NOT a doctor: never diagnose, never name or dose specific medicines, and always recommend consulting a qualified doctor for diagnosis or treatment.
If the question suggests an emergency (chest pain, trouble breathing, severe bleeding, stroke signs, fainting, a seizure, a very high or persistent fever in a child, a fall with injury, etc.), tell them clearly to call 108 (India emergency) or go to the nearest hospital now.
Keep answers under ~120 words, plain language, India-appropriate. Do not invent specifics about the person.
End with one short line: "A Close Eye doctor will review this for you."`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);
  const callerSb = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userErr } = await callerSb.auth.getUser();
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  let body: { question?: string; subject_label?: string; loved_one_id?: string | null };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const question = (body.question || "").trim();
  if (!question) return json({ error: "Question is required" }, 400);

  const sb = createClient(supabaseUrl, supabaseServiceKey);

  // 1) Persist the question first (pending) so nothing is lost if the AI call fails
  const { data: row, error: insErr } = await sb.from("member_queries").insert({
    user_id: user.id,
    question,
    subject_label: body.subject_label || null,
    loved_one_id: body.loved_one_id || null,
    status: "pending",
  }).select("id").single();
  if (insErr || !row) { console.error("member_queries insert error:", insErr); return json({ error: "Could not save your question" }, 500); }

  // 2) Ask Claude for a draft (graceful: if it fails, leave it pending for a doctor)
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.warn("ANTHROPIC_API_KEY not set — leaving query pending for doctor review");
    return json({ query_id: row.id, ai_answer: null, pending: true });
  }

  const userContent = body.subject_label
    ? `About: ${body.subject_label}\n\nQuestion: ${question}`
    : question;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("Anthropic error:", res.status, t);
      return json({ query_id: row.id, ai_answer: null, pending: true });
    }
    const data = await res.json();
    const aiAnswer = (data?.content?.[0]?.text ?? "").trim();
    if (!aiAnswer) return json({ query_id: row.id, ai_answer: null, pending: true });

    await sb.from("member_queries").update({
      ai_answer: aiAnswer, status: "ai_answered", answered_at: new Date().toISOString(),
    }).eq("id", row.id);

    return json({ query_id: row.id, ai_answer: aiAnswer });
  } catch (err) {
    console.error("Anthropic call failed:", err);
    return json({ query_id: row.id, ai_answer: null, pending: true });
  }
});
