// Ask Close Eye · Claude (Anthropic API) calls
//
// FAIL-SAFE: if anything goes wrong, classify() defaults to "connect" (route to human).
// generateInform() throws; the caller falls back to Lane 2.

import type { CareContext, Classification, Lane, Topic } from "./types.ts";
import { ALL_TOPICS, CLASSIFIER_SYSTEM, INFORM_SYSTEM, informUserPrompt } from "./prompts.ts";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const CLASSIFIER_MODEL = Deno.env.get("CLOSEEYE_CLASSIFIER_MODEL") ?? "claude-haiku-4-5-20251001";
// Opus 4.8 — the highest-quality answer model. The inform call sends `thinking:{type:"disabled"}`
// (accepted on Opus 4.8) so the full token budget is the answer, latency stays low, and behaviour is
// deterministic no-thinking regardless of the model's omit-default. Swappable at runtime WITHOUT a
// redeploy via CLOSEEYE_INFORM_MODEL (e.g. "claude-sonnet-5" for lower cost) — both work with the
// disabled-thinking + 640-token setup below. Watch: with thinking off, Opus 4.8 can occasionally
// narrate reasoning into the reply; the INFORM_SYSTEM prompt keeps it answer-first.
const INFORM_MODEL     = Deno.env.get("CLOSEEYE_INFORM_MODEL")     ?? "claude-opus-4-8";

function apiKey(): string {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  return key;
}

interface AnthropicTextBlock { type: string; text?: string }
interface AnthropicResponse  { content?: AnthropicTextBlock[] }

async function callAnthropic(model: string, system: string, userText: string, maxTokens: number, thinking?: { type: "disabled" }): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey(),
        "anthropic-version": ANTHROPIC_VERSION,
      },
      // `thinking` only sent when the caller asks (inform → disabled on Sonnet 5, so the whole
      // token budget is the answer). The classifier omits it — Haiku 4.5 doesn't think by default.
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: userText }], ...(thinking ? { thinking } : {}) }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as AnthropicResponse;
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text as string)
      .join("\n")
      .trim();
    if (!text) throw new Error("Empty response from Anthropic");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

function isLane(x: unknown): x is Lane  { return x === "inform" || x === "connect" || x === "escalate"; }
function isTopic(x: unknown): x is Topic { return typeof x === "string" && (ALL_TOPICS as string[]).includes(x); }
function isKind(x: unknown): x is "health" | "service" | "other" { return x === "health" || x === "service" || x === "other"; }

function stripFences(text: string): string {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}

export async function classify(question: string, ctx: CareContext): Promise<Classification> {
  const userText =
    `Parent's known conditions: ${ctx.conditions.join(", ") || "none recorded"}.\n` +
    `Message to classify:\n"${question}"`;
  try {
    const raw  = await callAnthropic(CLASSIFIER_MODEL, CLASSIFIER_SYSTEM, userText, 80);
    const data = JSON.parse(stripFences(raw));
    const lane:    Lane  = isLane(data.lane)   ? data.lane   : "connect";
    const topic:   Topic = isTopic(data.topic) ? data.topic  : "general";
    const inScope: boolean = data.inScope !== false;
    const kind:    "health" | "service" | "other" = isKind(data.kind) ? data.kind : "health";
    return { lane, topic, inScope, kind };
  } catch (err) {
    console.error("classify() failed, failing safe to connect:", err);
    return { lane: "connect", topic: "general", inScope: true, kind: "health" };
  }
}

export async function generateInform(question: string, ctx: CareContext): Promise<string> {
  // thinking disabled → all the budget is the answer (see INFORM_MODEL note). 640, not 500: Sonnet 5's
  // tokenizer runs ~30% higher than 4.6's, so this keeps the answer's word-count parity, not just token count.
  return await callAnthropic(INFORM_MODEL, INFORM_SYSTEM, informUserPrompt(question, ctx), 640, { type: "disabled" });
}
