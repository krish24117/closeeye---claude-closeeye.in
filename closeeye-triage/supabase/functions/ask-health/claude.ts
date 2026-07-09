// ─────────────────────────────────────────────────────────────────────────
// Ask Close Eye · Claude (Anthropic API) calls
//
// Two calls:
//   classify()  — cheap model, returns {lane, topic, inScope} as strict JSON.
//   generateInform() — quality model, writes the warm Lane-1 answer.
//
// FAIL-SAFE PRINCIPLE: if anything goes wrong (network, bad JSON, timeout),
// we never guess an answer. classify() defaults to lane "connect" so the
// family is routed to a human. generateInform() throws, and the caller turns
// that into a Lane-2 "let's get a doctor" response.
// ─────────────────────────────────────────────────────────────────────────

import type { CareContext, Classification, Lane, Topic } from "./types.ts";
import {
  ALL_TOPICS,
  CLASSIFIER_SYSTEM,
  INFORM_SYSTEM,
  informUserPrompt,
} from "./prompts.ts";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const CLASSIFIER_MODEL = Deno.env.get("CLOSEEYE_CLASSIFIER_MODEL") ?? "claude-haiku-4-5-20251001";
const INFORM_MODEL = Deno.env.get("CLOSEEYE_INFORM_MODEL") ?? "claude-sonnet-4-6";

function apiKey(): string {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  return key;
}

interface AnthropicTextBlock { type: string; text?: string }
interface AnthropicResponse { content?: AnthropicTextBlock[] }

async function callAnthropic(
  model: string,
  system: string,
  userText: string,
  maxTokens: number,
): Promise<string> {
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
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: userText }],
      }),
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

function isLane(x: unknown): x is Lane {
  return x === "inform" || x === "connect" || x === "escalate";
}
function isTopic(x: unknown): x is Topic {
  return typeof x === "string" && (ALL_TOPICS as string[]).includes(x);
}

/**
 * Classify a message. Returns lane + topic + inScope.
 * On ANY failure, fails safe to { lane: "connect" } so a human is offered.
 */
export async function classify(question: string, ctx: CareContext): Promise<Classification> {
  const userText =
    `Parent's known conditions: ${ctx.conditions.join(", ") || "none recorded"}.\n` +
    `Message to classify:\n"${question}"`;
  try {
    const raw = await callAnthropic(CLASSIFIER_MODEL, CLASSIFIER_SYSTEM, userText, 80);
    const json = JSON.parse(stripFences(raw));
    const lane: Lane = isLane(json.lane) ? json.lane : "connect";
    const topic: Topic = isTopic(json.topic) ? json.topic : "general";
    const inScope = json.inScope !== false; // default true unless explicitly false
    return { lane, topic, inScope };
  } catch (err) {
    console.error("classify() failed, failing safe to connect:", err);
    return { lane: "connect", topic: "general", inScope: true };
  }
}

/** Generate the warm Lane-1 answer. Throws on failure (caller falls back to Lane 2). */
export async function generateInform(question: string, ctx: CareContext): Promise<string> {
  return await callAnthropic(INFORM_MODEL, INFORM_SYSTEM, informUserPrompt(question, ctx), 500);
}

function stripFences(text: string): string {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}
